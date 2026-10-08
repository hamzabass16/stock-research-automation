#!/usr/bin/env node
// The run worker. Executes one research run end to end and reports to Neon +
// Vercel Blob. Runs locally (node worker/run.mjs <runId>) or inside a Vercel
// Sandbox (launched by lib/runner.js).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
try { (await import('dotenv/config')); } catch {}

const db = await import('../lib/db.js');
const { runPipeline, pitchMarkdown } = await import('../lib/pipeline.js');
const { wrapReport } = await import('../lib/template.js');
const { htmlToPdf } = await import('../lib/pdf.js');
const { buildDeck } = await import('../lib/deck.js');
const { putArtifact, storageConfigured } = await import('../lib/storage.js');
const { MODEL, EFFORT } = await import('../lib/claude.js');

const runId = process.argv[2] || process.env.RUN_ID;
if (!runId) { console.error('usage: node worker/run.mjs <runId>'); process.exit(1); }
const PREPARED_BY = process.env.PREPARED_BY || 'Analyst';
const deadline = Number(process.env.RUN_DEADLINE || 0) || null;

const run = await db.getRun(runId);
if (!run) { console.error(`run ${runId} not found`); process.exit(1); }

const step = async (s) => { console.log(`[${runId.slice(0, 8)}] ${s}`); try { await db.addStep(runId, s); } catch (e) { console.error('step failed', e.message); } };
let liveTimer = null, liveBuf = { phase: null, text: '' };
const onLog = (phase, t) => {
  if (liveBuf.phase !== phase) liveBuf = { phase, text: '' };
  liveBuf.text = (liveBuf.text + t).slice(-4000);
  if (!liveTimer) liveTimer = setTimeout(() => { liveTimer = null; db.setLive(runId, liveBuf.phase, liveBuf.text).catch(() => {}); }, 2000);
};
const hb = setInterval(() => db.heartbeat(runId).catch(() => {}), 30000);

const runDir = fs.mkdtempSync(path.join(process.env.WORK_DIR || os.tmpdir(), `sra-${runId.slice(0, 8)}-`));
const date = new Date().toISOString().slice(0, 10);

async function saveArtifact(name, body) {
  if (!storageConfigured()) {
    const local = path.join(runDir, name);
    if (!fs.existsSync(local)) fs.writeFileSync(local, body);
    return `local:${local}`;
  }
  const r = await putArtifact(runId, name, body);
  return r.pathname;
}

try {
  await db.updateRun(runId, { status: 'running', phase: 'research', startedAt: new Date().toISOString(), heartbeatAt: new Date().toISOString(), model: MODEL, effort: EFFORT, runner: process.env.RUN_DEADLINE && process.env.PUPPETEER_EXECUTABLE_PATH ? 'sandbox' : 'local' });
  const methodologyText = run.methodologyId ? (await db.getMethodology(run.methodologyId, true))?.text || null : null;

  const result = await runPipeline({
    ticker: run.ticker, question: run.question, methodologyText, runDir, deadline,
    onStep: async (s) => {
      await step(s);
      const m = s.match(/^Phase (\d)\/4/);
      if (m) await db.updateRun(runId, { phase: ['', 'research', 'stats', 'fill', 'pitch'][Number(m[1])] });
    },
    onLog,
  });
  await db.clearLive(runId).catch(() => {});

  const companyName = String(result.meta.company_name || run.ticker).replace(new RegExp(`\\s*\\(${run.ticker}\\)\\s*$`, 'i'), '').trim();
  const fullHtml = wrapReport(result.bodyHtml, `${companyName} (${run.ticker}) — Stock Research Report`);
  const artifacts = {};

  await step('Saving artifacts...');
  artifacts.research = await saveArtifact('research.md', result.research);
  artifacts.stats = await saveArtifact('stats.md', result.stats);
  artifacts.report = await saveArtifact('report.html', fullHtml);
  artifacts.meta = await saveArtifact('meta.json', JSON.stringify(result.meta, null, 2));
  const pitchMd = pitchMarkdown({ ticker: run.ticker, meta: result.meta });
  artifacts.pitch = await saveArtifact('pitch.md', pitchMd);
  const pyLog = path.join(runDir, 'python_log.md');
  if (fs.existsSync(pyLog)) artifacts.pythonLog = await saveArtifact('python_log.md', fs.readFileSync(pyLog));
  for (const f of fs.readdirSync(runDir)) if (f.endsWith('.png')) artifacts[`chart:${f}`] = await saveArtifact(f, fs.readFileSync(path.join(runDir, f)));

  await db.updateRun(runId, {
    phase: 'outputs', companyName,
    recommendation: result.meta.recommendation, category: result.meta.category, summary: result.meta.summary,
    killSignal: result.meta.kill_signal, timeHorizon: result.meta.time_horizon, conclusion: result.meta.conclusion,
    statistical: result.meta.statistical, usage: result.usage, artifacts,
  });

  // Step 3 — PDF
  await step('Rendering PDF (Step 3)...');
  const pdfPath = path.join(runDir, 'report.pdf');
  const pdf = await htmlToPdf(fullHtml, pdfPath);
  if (pdf.ok) artifacts.pdf = await saveArtifact('report.pdf', fs.readFileSync(pdfPath));
  else await step(`PDF not rendered (${pdf.reason || 'Chromium unavailable'}) — the HTML report is available.`);

  // Step 4 — deck
  await step('Building the investment-committee pitch deck (Step 4)...');
  try {
    const deckPath = path.join(runDir, 'deck.pptx');
    await buildDeck({ ticker: run.ticker, meta: result.meta, date, preparedBy: PREPARED_BY, outFile: deckPath });
    artifacts.deck = await saveArtifact('deck.pptx', fs.readFileSync(deckPath));
  } catch (e) { await step(`Deck error: ${e.message || e}`); }
  await db.updateRun(runId, { artifacts });

  // Publish
  const published = await publish({ ticker: run.ticker, companyName, date, runDir, fullHtml, pitchMd, result });
  await db.updateRun(runId, { status: 'complete', phase: 'done', completedAt: new Date().toISOString(), published });
  await step(`Done. ${result.meta.recommendation} · ${result.meta.category}`);
} catch (e) {
  console.error(e);
  await db.updateRun(runId, { status: 'error', phase: 'error', error: String(e.message || e) }).catch(() => {});
  await step(`Error: ${e.message || e}`);
} finally {
  clearInterval(hb);
  if (liveTimer) clearTimeout(liveTimer);
  await db.clearLive(runId).catch(() => {});
  process.exit(0);
}

async function publish({ ticker, companyName, date, runDir, fullHtml, pitchMd, result }) {
  const T = ticker.toUpperCase();
  const entries = [
    ['report.pdf', `${T}_Stock_Research_Report_${date}.pdf`, 'application/pdf'],
    ['report.html', `${T}_Stock_Research_Report_${date}.html`, 'text/html'],
    ['deck.pptx', `${T}_Investment_Committee_Pitch_${date}.pptx`, 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['pitch.md', `${T}_Pitch_Script_and_QA_${date}.md`, 'text/markdown'],
    ['research.md', `${T}_Research_Dossier_${date}.md`, 'text/markdown'],
    ['stats.md', `${T}_Statistical_Validation_${date}.md`, 'text/markdown'],
  ];
  // Make sure every file exists on disk in the run folder.
  const ensure = (name, content) => { const p = path.join(runDir, name); if (!fs.existsSync(p)) fs.writeFileSync(p, content); };
  ensure('report.html', fullHtml); ensure('pitch.md', pitchMd); ensure('research.md', result.research); ensure('stats.md', result.stats);

  const { driveConfigured, publishToDrive } = await import('../lib/drive.js');
  if (driveConfigured()) {
    await step('Publishing to Google Drive (Stock Theses & Research)...');
    try {
      const files = entries.filter(([src]) => fs.existsSync(path.join(runDir, src)))
        .map(([src, name, mimeType]) => ({ name, mimeType, buffer: fs.readFileSync(path.join(runDir, src)) }));
      const r = await publishToDrive({ ticker: T, companyName, files });
      await step(`Published ${r.files.length} files to Drive folder "${r.folderName}".`);
      return r;
    } catch (e) { await step(`Drive publish error: ${e.message || e}`); return { mode: 'drive-api', error: String(e.message || e) }; }
  }
  // Local fallback: the synced Google Drive folder on this machine.
  const { publishStatus, publishRun } = await import('../lib/publish.js');
  const st = publishStatus();
  if (!st.configured) { await step('No Drive configured — outputs kept in storage only.'); return null; }
  await step('Publishing to the synced Drive folder...');
  const r = publishRun({ ticker: T, companyName, date, files: entries.map(([src, , , kind]) => ({ src: path.join(runDir, src), kind: kindFor(src) })) });
  await step(`Published ${r.files.length} files to ${path.basename(r.dir)}/`);
  return { mode: 'local-sync', dir: r.dir, folderName: path.basename(r.dir), files: r.files.map(name => ({ name })), at: new Date().toISOString() };
}
function kindFor(src) {
  return { 'report.pdf': 'Stock_Research_Report', 'report.html': 'Stock_Research_Report', 'deck.pptx': 'Investment_Committee_Pitch', 'pitch.md': 'Pitch_Script_and_QA', 'research.md': 'Research_Dossier', 'stats.md': 'Statistical_Validation' }[src];
}
