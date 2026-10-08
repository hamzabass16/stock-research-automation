import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import * as store from './lib/store.js';
import { wrapReport, templateDocument } from './lib/template.js';
import { runPipeline, pitchMarkdown } from './lib/pipeline.js';
import { htmlToPdf } from './lib/pdf.js';
import { buildDeck } from './lib/deck.js';
import { publishRun, publishStatus, revealFolder } from './lib/publish.js';
import { isLive, MODEL, EFFORT } from './lib/claude.js';
import { pythonStatus } from './lib/python.js';
import { markdownToHtml } from './lib/markdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4317;
const PREPARED_BY = process.env.PREPARED_BY || 'Analyst';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/reports', express.static(store.paths.REPORTS));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

store.seedBundledMethodology();

// Live step log + streamed model text per run (in-memory; status is persisted to history.json).
const liveSteps = new Map();
const liveText = new Map();
const pushStep = (id, s) => {
  const arr = liveSteps.get(id) || [];
  arr.push({ t: new Date().toISOString(), s });
  liveSteps.set(id, arr);
  console.log(`[${id.slice(0, 8)}] ${s}`);
};
const pushText = (id, phase, t) => {
  const cur = liveText.get(id) || { phase, text: '' };
  if (cur.phase !== phase) { cur.phase = phase; cur.text = ''; }
  cur.text = (cur.text + t).slice(-4000);
  liveText.set(id, cur);
};

// ---------- Config / capabilities ----------
app.get('/api/config', (req, res) => {
  const py = pythonStatus();
  res.json({
    demoMode: !isLive(),
    model: MODEL,
    effort: EFFORT,
    preparedBy: PREPARED_BY,
    drive: publishStatus(),
    python: py,
  });
});

app.get('/api/template', (req, res) => {
  res.type('html').send(templateDocument());
});

// ---------- Methodologies ----------
app.get('/api/methodologies', (req, res) => res.json(store.listMethodologies()));

app.post('/api/methodologies', upload.single('file'), async (req, res) => {
  try {
    let text = req.body.text || '';
    let originalFilename = null;
    if (req.file) {
      originalFilename = req.file.originalname;
      const ext = path.extname(originalFilename).toLowerCase();
      if (ext === '.pdf' || req.file.mimetype === 'application/pdf') {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: new Uint8Array(req.file.buffer) });
        try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
      } else {
        text = req.file.buffer.toString('utf8');
      }
    }
    if (!text.trim()) return res.status(400).json({ error: 'Provide methodology text, or upload a .pdf / .md / .txt file.' });
    const entry = store.saveMethodology({ name: req.body.name, text, originalFilename, isDefault: req.body.isDefault === 'true' });
    res.json(entry);
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get('/api/methodologies/:id/text', (req, res) => {
  const text = store.readMethodologyText(req.params.id);
  if (text === null) return res.status(404).json({ error: 'not found' });
  res.type('text/plain').send(text);
});

app.post('/api/methodologies/:id/default', (req, res) => {
  const m = store.setDefaultMethodology(req.params.id);
  if (!m) return res.status(404).json({ error: 'not found' });
  res.json(m);
});

app.delete('/api/methodologies/:id', (req, res) => {
  store.deleteMethodology(req.params.id);
  res.json({ ok: true });
});

// ---------- History ----------
app.get('/api/history', (req, res) => res.json(store.listHistory()));

app.get('/api/run/:id', (req, res) => {
  const run = store.getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'not found' });
  res.json({ ...run, steps: liveSteps.get(run.id) || [], live: liveText.get(run.id) || null });
});

app.delete('/api/run/:id', (req, res) => {
  store.deleteRun(req.params.id);
  liveSteps.delete(req.params.id); liveText.delete(req.params.id);
  res.json({ ok: true });
});

// Markdown artefacts rendered as simple HTML pages.
app.get('/api/run/:id/md/:name', (req, res) => {
  const run = store.getRun(req.params.id);
  const allowed = { research: 'research.md', stats: 'stats.md', pitch: 'pitch.md', python: 'python_log.md' };
  const file = allowed[req.params.name];
  if (!run || !file) return res.status(404).send('Not found.');
  const md = store.readRunFile(run, file);
  if (md === null) return res.status(404).send('Not generated for this run.');
  if (req.query.raw) return res.type('text/markdown').send(md);
  res.type('html').send(markdownToHtml(md, `${run.ticker} — ${req.params.name}`));
});

// PDF download (generates on demand if missing but HTML exists).
app.get('/api/run/:id/pdf', async (req, res) => {
  const run = store.getRun(req.params.id);
  if (!run || !run.htmlFile) return res.status(404).send('No report.');
  let pdfFile = run.pdfFile;
  if (!pdfFile || !fs.existsSync(store.reportPath(pdfFile))) {
    const html = fs.readFileSync(store.reportPath(run.htmlFile), 'utf8');
    const out = store.reportPath(run.htmlFile.replace(/\.html$/, '.pdf'));
    const r = await htmlToPdf(html, out);
    if (r.ok) { pdfFile = run.htmlFile.replace(/\.html$/, '.pdf'); store.updateRun(run.id, { pdfFile }); }
  }
  if (pdfFile) return res.download(store.reportPath(pdfFile), `${run.ticker}_Stock_Research_Report.pdf`);
  // Fallback: serve the HTML for browser "Save as PDF".
  res.redirect(`/reports/${run.htmlFile}`);
});

// Pitch deck download (built on demand if missing).
app.get('/api/run/:id/deck', async (req, res) => {
  const run = store.getRun(req.params.id);
  if (!run || run.status !== 'complete') return res.status(404).send('No completed run.');
  const out = path.join(store.runDir(run), 'deck.pptx');
  if (!fs.existsSync(out)) {
    const metaRaw = store.readRunFile(run, 'meta.json');
    if (!metaRaw) return res.status(400).send('No pitch metadata for this run.');
    await buildDeck({ ticker: run.ticker, meta: JSON.parse(metaRaw), date: (run.completedAt || run.createdAt).slice(0, 10), preparedBy: PREPARED_BY, outFile: out });
    store.updateRun(run.id, { deckFile: `${run.dir}/deck.pptx` });
  }
  res.download(out, `${run.ticker}_Investment_Committee_Pitch_${(run.publishedAt || run.completedAt || run.createdAt).slice(0, 10)}.pptx`);
});

// (Re-)publish a completed run's outputs to the Drive folder.
app.post('/api/run/:id/publish', async (req, res) => {
  const run = store.getRun(req.params.id);
  if (!run || run.status !== 'complete') return res.status(404).json({ error: 'No completed run.' });
  try {
    const r = await publishOutputs(run, new Date().toISOString().slice(0, 10));
    res.json(r);
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// Open the published folder in Finder.
app.post('/api/run/:id/reveal', (req, res) => {
  const run = store.getRun(req.params.id);
  if (!run?.publishedDir || !fs.existsSync(run.publishedDir)) return res.status(404).json({ error: 'Not published.' });
  res.json({ ok: revealFolder(run.publishedDir) });
});

async function publishOutputs(run, date) {
  const dir = store.runDir(run);
  const metaRaw = store.readRunFile(run, 'meta.json');
  const meta = metaRaw ? JSON.parse(metaRaw) : {};
  const result = publishRun({
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
  store.updateRun(run.id, { publishedDir: result.dir, publishedFiles: result.files, publishedAt: new Date().toISOString() });
  return result;
}

// ---------- The Trigger ----------
app.post('/api/research', async (req, res) => {
  const { ticker, question, methodologyId, force } = req.body || {};
  if (!ticker || !question) return res.status(400).json({ error: 'ticker and question are required.' });

  // FAST local dedup BEFORE any work begins.
  if (!force) {
    const existing = store.findExistingByTicker(ticker);
    if (existing) return res.json({ duplicate: true, run: existing });
  }

  const methodology = methodologyId ? store.getMethodology(methodologyId) : store.defaultMethodology();
  const run = store.createRun({
    ticker, question, methodologyId: methodology ? methodology.id : null,
    methodologyName: methodology ? methodology.name : 'Built-in default lens',
  });
  res.json({ duplicate: false, runId: run.id });   // respond immediately; work continues async
  runInBackground(run, methodology);
});

async function runInBackground(run, methodology) {
  const { id, ticker, question } = run;
  try {
    store.updateRun(id, { phase: 'research', model: MODEL });
    const methodologyText = methodology ? store.readMethodologyText(methodology.id) : null;
    const result = await runPipeline({
      ticker, question, methodologyText,
      runDir: store.runDir(run),
      onStep: (s) => {
        pushStep(id, s);
        const m = s.match(/^Phase (\d)\/4/);
        if (m) store.updateRun(id, { phase: ['', 'research', 'stats', 'fill', 'pitch'][Number(m[1])] });
      },
      onLog: (phase, t) => pushText(id, phase, t),
    });

    const companyName = String(result.meta.company_name || ticker).replace(new RegExp(`\\s*\\(${ticker}\\)\\s*$`, 'i'), '').trim();
    const title = `${companyName} (${ticker}) — Stock Research Report`;
    const fullHtml = wrapReport(result.bodyHtml, title);
    const htmlFile = store.saveRunFile(run, 'report.html', fullHtml);
    const artifacts = {
      research: `${run.dir}/research.md`,
      stats: `${run.dir}/stats.md`,
      pitch: store.saveRunFile(run, 'pitch.md', pitchMarkdown({ ticker, meta: result.meta })),
      meta: store.saveRunFile(run, 'meta.json', JSON.stringify(result.meta, null, 2)),
      pythonLog: fs.existsSync(path.join(store.runDir(run), 'python_log.md')) ? `${run.dir}/python_log.md` : null,
    };
    store.updateRun(id, {
      htmlFile, artifacts,
      recommendation: result.meta.recommendation,
      category: result.meta.category,
      summary: result.meta.summary,
      killSignal: result.meta.kill_signal,
      timeHorizon: result.meta.time_horizon,
      conclusion: result.meta.conclusion,
      statistical: result.meta.statistical,
      usage: result.usage,
      phase: 'outputs',
    });

    // Step 3 — PDF
    pushStep(id, 'Rendering PDF (Step 3)...');
    const pdfOut = store.reportPath(htmlFile.replace(/\.html$/, '.pdf'));
    const pdf = await htmlToPdf(fullHtml, pdfOut);
    if (pdf.ok) store.updateRun(id, { pdfFile: htmlFile.replace(/\.html$/, '.pdf') });
    else pushStep(id, 'PDF engine not installed — HTML is downloadable; use browser Print-to-PDF.');

    // Step 4 — pitch deck
    pushStep(id, 'Building the investment-committee pitch deck (Step 4)...');
    const date = new Date().toISOString().slice(0, 10);
    try {
      await buildDeck({ ticker, meta: result.meta, date, preparedBy: PREPARED_BY, outFile: path.join(store.runDir(run), 'deck.pptx') });
      store.updateRun(id, { deckFile: `${run.dir}/deck.pptx` });
    } catch (e) { pushStep(id, `Deck error: ${e.message || e}`); }

    store.updateRun(id, { status: 'complete', phase: 'done', completedAt: new Date().toISOString() });

    // Publish to the HCMP Drive folder
    const drive = publishStatus();
    if (!drive.configured) pushStep(id, `Drive folder not found (${drive.dir}) — outputs kept locally only.`);
    else {
      pushStep(id, 'Publishing outputs to HCMP / Stock Theses & Research...');
      try {
        const r = await publishOutputs(store.getRun(id), date);
        pushStep(id, `Published ${r.files.length} files to ${path.basename(r.dir)}/`);
      } catch (e) { pushStep(id, `Publish error: ${e.message || e}`); }
    }
    pushStep(id, `Done. ${result.meta.recommendation} · ${result.meta.category}`);
  } catch (e) {
    console.error(e);
    store.updateRun(id, { status: 'error', phase: 'error', error: String(e.message || e) });
    pushStep(id, `Error: ${e.message || e}`);
  } finally {
    liveText.delete(id);
  }
}

app.listen(PORT, () => {
  console.log(`\n  Stock Research Automation running:  http://localhost:${PORT}\n`);
  if (!isLive()) console.log('  (DEMO MODE — add ANTHROPIC_API_KEY and set DEMO_MODE=false in .env for live research)\n');
  else console.log(`  LIVE — model ${MODEL}, effort ${EFFORT}\n`);
  const py = pythonStatus();
  if (!py.ok) console.log('  Python not found — run `npm run setup:python` to enable the statistical validation step.\n');
  else if (py.libs.length < 5) console.log(`  Python found (${py.bin}) but libraries missing — run \`npm run setup:python\`.\n`);
});
