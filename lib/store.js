// Local persistence: methodologies, research history, per-run report folders,
// and the FAST dedup check (the only thing consulted before a run begins).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');
const REPORTS = path.join(DATA, 'reports');
const METHODS = path.join(DATA, 'methodologies');
const HISTORY = path.join(DATA, 'history.json');
const METHOD_INDEX = path.join(DATA, 'methodologies.json');

for (const dir of [DATA, REPORTS, METHODS]) fs.mkdirSync(dir, { recursive: true });

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export const paths = { DATA, REPORTS, METHODS };

// ---------- Methodologies (the pluggable judgment lens) ----------
export function listMethodologies() {
  return readJSON(METHOD_INDEX, []);
}
export function getMethodology(id) {
  return listMethodologies().find(m => m.id === id) || null;
}
export function saveMethodology({ name, text, originalFilename, isDefault = false, id }) {
  const list = listMethodologies();
  const newId = id || crypto.randomUUID();
  const fileName = `${newId}.md`;
  fs.writeFileSync(path.join(METHODS, fileName), text, 'utf8');
  const entry = {
    id: newId,
    name: name || originalFilename || 'Untitled methodology',
    originalFilename: originalFilename || null,
    chars: text.length,
    createdAt: new Date().toISOString(),
    file: fileName,
    isDefault,
  };
  if (isDefault) list.forEach(m => { m.isDefault = false; });
  list.unshift(entry);
  writeJSON(METHOD_INDEX, list);
  return entry;
}
export function setDefaultMethodology(id) {
  const list = listMethodologies();
  list.forEach(m => { m.isDefault = m.id === id; });
  writeJSON(METHOD_INDEX, list);
  return list.find(m => m.id === id) || null;
}
export function defaultMethodology() {
  const list = listMethodologies();
  return list.find(m => m.isDefault) || list[0] || null;
}
export function readMethodologyText(id) {
  const m = getMethodology(id);
  if (!m) return null;
  try { return fs.readFileSync(path.join(METHODS, m.file), 'utf8'); }
  catch { return null; }
}
export function deleteMethodology(id) {
  const list = listMethodologies();
  const m = list.find(x => x.id === id);
  if (m) { try { fs.unlinkSync(path.join(METHODS, m.file)); } catch {} }
  writeJSON(METHOD_INDEX, list.filter(x => x.id !== id));
}

// Seeds a bundled methodology on first start so the app ships with a judgment
// lens already selected: the private Investment Methodology v3 when present,
// otherwise the generic sample methodology that ships with the public repo.
const BUNDLED = [
  { file: 'investment-methodology-v3.md', id: 'investment-methodology-v3', name: 'Investment Methodology v3 — Hamza Bassatne', originalFilename: 'Investment Methodology v3 - Hamza Bassatne.gdoc' },
  { file: 'sample-methodology.md', id: 'sample-methodology', name: 'Sample methodology — quality compounders', originalFilename: 'sample-methodology.md' },
];
export function seedBundledMethodology() {
  const list = listMethodologies();
  for (const b of BUNDLED) {
    const file = path.join(METHODS, b.file);
    if (!fs.existsSync(file)) continue;
    if (list.some(m => m.file === b.file)) return null;
    const text = fs.readFileSync(file, 'utf8');
    const entry = { id: b.id, name: b.name, originalFilename: b.originalFilename, chars: text.length, createdAt: new Date().toISOString(), file: b.file, isDefault: true };
    list.forEach(m => { m.isDefault = false; });
    list.unshift(entry);
    writeJSON(METHOD_INDEX, list);
    return entry;
  }
  return null;
}

// ---------- Research history (the "memory") ----------
export function listHistory() {
  return readJSON(HISTORY, []);
}

// FAST dedup: consulted BEFORE the pipeline starts. Local folder only.
export function findExistingByTicker(ticker) {
  const t = String(ticker || '').trim().toUpperCase();
  return listHistory().find(r => r.ticker === t && r.status === 'complete') || null;
}

export function createRun({ ticker, question, methodologyId, methodologyName }) {
  const list = listHistory();
  const id = crypto.randomUUID();
  const T = String(ticker).trim().toUpperCase();
  const dir = `${T}_${id.slice(0, 8)}`;
  fs.mkdirSync(path.join(REPORTS, dir), { recursive: true });
  const entry = {
    id,
    ticker: T,
    question: String(question || '').trim(),
    methodologyId: methodologyId || null,
    methodologyName: methodologyName || 'Default',
    status: 'running',          // running | complete | error
    phase: 'queued',
    createdAt: new Date().toISOString(),
    completedAt: null,
    recommendation: null,
    category: null,
    summary: null,
    dir,                        // folder under data/reports holding every artefact
    htmlFile: null,             // relative to /reports
    pdfFile: null,
    artifacts: {},              // { research, stats, pitch, meta, pythonLog } relative to /reports
    gammaUrl: null,
    notionUrl: null,
    usage: null,
    model: null,
    error: null,
  };
  list.unshift(entry);
  writeJSON(HISTORY, list);
  return entry;
}

export function updateRun(id, patch) {
  const list = listHistory();
  const i = list.findIndex(r => r.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...patch };
  writeJSON(HISTORY, list);
  return list[i];
}

export function getRun(id) {
  return listHistory().find(r => r.id === id) || null;
}

export function deleteRun(id) {
  const list = listHistory();
  const run = list.find(r => r.id === id);
  if (run?.dir) { try { fs.rmSync(path.join(REPORTS, run.dir), { recursive: true, force: true }); } catch {} }
  writeJSON(HISTORY, list.filter(r => r.id !== id));
}

// ---------- Report files ----------
export function runDir(run) {
  return path.join(REPORTS, run.dir);
}
export function saveRunFile(run, name, content) {
  fs.writeFileSync(path.join(REPORTS, run.dir, name), content, 'utf8');
  return `${run.dir}/${name}`;
}
export function reportPath(relative) {
  return path.join(REPORTS, relative);
}
export function readRunFile(run, name) {
  try { return fs.readFileSync(path.join(REPORTS, run.dir, name), 'utf8'); }
  catch { return null; }
}
