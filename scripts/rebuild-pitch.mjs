#!/usr/bin/env node
// Re-runs Phase 4 (verdict + pitch) for an existing completed run from its
// report.html, rebuilds the deck and (re)publishes to the Drive folder.
// Useful after prompt/schema changes, or when a run finished on an older build.
//
//   node scripts/rebuild-pitch.mjs <runId-or-prefix> [--no-publish] [--keep-meta]
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import * as store from '../lib/store.js';
import { callClaude, textOf, addUsage, emptyUsage, isLive } from '../lib/claude.js';
import { htmlToText, pitchMarkdown } from '../lib/pipeline.js';
import { buildDeck } from '../lib/deck.js';
import { publishRun, publishStatus } from '../lib/publish.js';
import * as P from '../lib/prompts.js';

const [, , idArg, ...flags] = process.argv;
if (!idArg) { console.error('usage: node scripts/rebuild-pitch.mjs <runId-or-prefix> [--no-publish] [--keep-meta]'); process.exit(1); }
const run = store.listHistory().find(r => r.id === idArg || r.id.startsWith(idArg) || (r.dir || '').endsWith(idArg));
if (!run) { console.error('run not found'); process.exit(1); }
if (!run.htmlFile) { console.error('run has no report.html'); process.exit(1); }

const PREPARED_BY = process.env.PREPARED_BY || 'Analyst';
const dir = store.runDir(run);
const date = new Date().toISOString().slice(0, 10);
const methodologyText = run.methodologyId ? store.readMethodologyText(run.methodologyId) : null;

let meta;
if (flags.includes('--keep-meta') && fs.existsSync(path.join(dir, 'meta.json'))) {
  meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  console.log('Using existing meta.json');
} else {
  if (!isLive()) { console.error('ANTHROPIC_API_KEY missing (or DEMO_MODE=true) — cannot re-run Phase 4'); process.exit(1); }
  console.log(`Phase 4 for ${run.ticker} (${run.id.slice(0, 8)})...`);
  const html = fs.readFileSync(store.reportPath(run.htmlFile), 'utf8');
  const usage = emptyUsage();
  const msg = await callClaude({
    system: P.pitchSystem({ methodologyText, today: date, preparedBy: PREPARED_BY }),
    messages: [{ role: 'user', content: P.pitchUser({ ticker: run.ticker, question: run.question, reportText: htmlToText(html) }) }],
    maxTokens: 24000,
    format: { type: 'json_schema', schema: P.PITCH_SCHEMA },
    onText: (t) => process.stdout.write('.'),
  });
  addUsage(usage, msg.usage);
  meta = JSON.parse(textOf(msg));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(dir, 'pitch.md'), pitchMarkdown({ ticker: run.ticker, meta }));
  console.log(`\nVerdict: ${meta.recommendation} · ${meta.category} · usage ${JSON.stringify(usage)}`);
}

await buildDeck({ ticker: run.ticker, meta, date, preparedBy: PREPARED_BY, outFile: path.join(dir, 'deck.pptx') });
console.log('Deck built: deck.pptx');

store.updateRun(run.id, {
  recommendation: meta.recommendation, category: meta.category, summary: meta.summary,
  killSignal: meta.kill_signal, timeHorizon: meta.time_horizon, conclusion: meta.conclusion, statistical: meta.statistical,
  deckFile: `${run.dir}/deck.pptx`,
  artifacts: { ...(run.artifacts || {}), pitch: `${run.dir}/pitch.md`, meta: `${run.dir}/meta.json`, pythonLog: fs.existsSync(path.join(dir, 'python_log.md')) ? `${run.dir}/python_log.md` : null },
});

if (!flags.includes('--no-publish')) {
  const st = publishStatus();
  if (!st.configured) console.log(`Drive folder not found (${st.dir}) — skipping publish`);
  else {
    const r = publishRun({
      ticker: run.ticker, companyName: meta.company_name || run.ticker, date,
      files: [
        { src: path.join(dir, 'report.pdf'), kind: 'Stock_Research_Report' },
        { src: path.join(dir, 'report.html'), kind: 'Stock_Research_Report' },
        { src: path.join(dir, 'deck.pptx'), kind: 'Investment_Committee_Pitch' },
        { src: path.join(dir, 'pitch.md'), kind: 'Pitch_Script_and_QA' },
        { src: path.join(dir, 'research.md'), kind: 'Research_Dossier' },
        { src: path.join(dir, 'stats.md'), kind: 'Statistical_Validation' },
      ],
    });
    store.updateRun(run.id, { publishedDir: r.dir, publishedFiles: r.files, publishedAt: new Date().toISOString() });
    console.log(`Published ${r.files.length} files to ${r.dir}`);
  }
}
