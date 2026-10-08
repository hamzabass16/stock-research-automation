// Neon Postgres persistence (runs, steps, live model output, methodologies).
// Used by the Next.js API routes and by the worker (locally or in a Vercel Sandbox).
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let _sql = null;
export function sql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

const RUN_COLUMNS = {
  status: 'status', phase: 'phase', startedAt: 'started_at', completedAt: 'completed_at', heartbeatAt: 'heartbeat_at',
  recommendation: 'recommendation', category: 'category', summary: 'summary', killSignal: 'kill_signal', timeHorizon: 'time_horizon',
  companyName: 'company_name', conclusion: 'conclusion', statistical: 'statistical', usage: 'usage', model: 'model', effort: 'effort',
  error: 'error', artifacts: 'artifacts', published: 'published', runner: 'runner', sandboxId: 'sandbox_id',
};
const JSON_COLUMNS = new Set(['conclusion', 'statistical', 'usage', 'artifacts', 'published']);

function rowToRun(r) {
  if (!r) return null;
  return {
    id: r.id, ticker: r.ticker, question: r.question, methodologyId: r.methodology_id, methodologyName: r.methodology_name,
    status: r.status, phase: r.phase, createdAt: r.created_at, startedAt: r.started_at, completedAt: r.completed_at, heartbeatAt: r.heartbeat_at,
    recommendation: r.recommendation, category: r.category, summary: r.summary, killSignal: r.kill_signal, timeHorizon: r.time_horizon,
    companyName: r.company_name, conclusion: r.conclusion, statistical: r.statistical, usage: r.usage, model: r.model, effort: r.effort,
    error: r.error, artifacts: r.artifacts || {}, published: r.published, runner: r.runner, sandboxId: r.sandbox_id,
  };
}

// ---------- Runs ----------
export async function listRuns(limit = 100) {
  const rows = await sql()`SELECT * FROM runs ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map(rowToRun);
}
export async function getRun(id) {
  const rows = await sql()`SELECT * FROM runs WHERE id = ${id}`;
  return rowToRun(rows[0]);
}
export async function findExistingByTicker(ticker) {
  const rows = await sql()`SELECT * FROM runs WHERE ticker = ${String(ticker).toUpperCase()} AND status = 'complete' ORDER BY created_at DESC LIMIT 1`;
  return rowToRun(rows[0]);
}
export async function createRun({ ticker, question, methodologyId, methodologyName, runner }) {
  const id = crypto.randomUUID();
  const rows = await sql()`INSERT INTO runs (id, ticker, question, methodology_id, methodology_name, status, phase, runner)
    VALUES (${id}, ${String(ticker).trim().toUpperCase()}, ${String(question).trim()}, ${methodologyId || null}, ${methodologyName || null}, 'queued', 'queued', ${runner || null})
    RETURNING *`;
  return rowToRun(rows[0]);
}
export async function updateRun(id, patch) {
  const sets = [];
  const values = [];
  for (const [k, v] of Object.entries(patch)) {
    const col = RUN_COLUMNS[k];
    if (!col) continue;
    values.push(JSON_COLUMNS.has(k) ? JSON.stringify(v) : v);
    sets.push(`${col} = $${values.length}${JSON_COLUMNS.has(k) ? '::jsonb' : ''}`);
  }
  if (!sets.length) return getRun(id);
  values.push(id);
  const rows = await sql().query(`UPDATE runs SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
  return rowToRun(rows[0]);
}
export async function deleteRun(id) {
  await sql()`DELETE FROM runs WHERE id = ${id}`;
}
export async function heartbeat(id) {
  await sql()`UPDATE runs SET heartbeat_at = now() WHERE id = ${id}`;
}
// Runs whose worker stopped reporting are marked as errors (sandbox timeout, crash).
export async function markStaleRuns(maxSilenceMinutes = 6) {
  const rows = await sql()`UPDATE runs SET status = 'error', phase = 'error',
      error = 'The worker stopped reporting (sandbox timed out or crashed). Partial artifacts may be available.'
    WHERE status IN ('running', 'queued')
      AND COALESCE(heartbeat_at, started_at, created_at) < now() - (${maxSilenceMinutes} || ' minutes')::interval
    RETURNING id`;
  return rows.length;
}

// ---------- Steps + live text ----------
export async function addStep(runId, s) {
  await sql()`INSERT INTO run_steps (run_id, s) VALUES (${runId}, ${String(s).slice(0, 2000)})`;
}
export async function listSteps(runId) {
  const rows = await sql()`SELECT t, s FROM run_steps WHERE run_id = ${runId} ORDER BY id ASC`;
  return rows.map(r => ({ t: r.t, s: r.s }));
}
export async function setLive(runId, phase, text) {
  await sql()`INSERT INTO run_live (run_id, phase, text, updated_at) VALUES (${runId}, ${phase}, ${text}, now())
    ON CONFLICT (run_id) DO UPDATE SET phase = EXCLUDED.phase, text = EXCLUDED.text, updated_at = now()`;
}
export async function getLive(runId) {
  const rows = await sql()`SELECT phase, text, updated_at FROM run_live WHERE run_id = ${runId}`;
  return rows[0] ? { phase: rows[0].phase, text: rows[0].text, updatedAt: rows[0].updated_at } : null;
}
export async function clearLive(runId) {
  await sql()`DELETE FROM run_live WHERE run_id = ${runId}`;
}

// ---------- Methodologies ----------
function rowToMethodology(r, withText = false) {
  if (!r) return null;
  const m = { id: r.id, name: r.name, originalFilename: r.original_filename, chars: r.chars, isDefault: r.is_default, createdAt: r.created_at };
  if (withText) m.text = r.text;
  return m;
}
export async function listMethodologies() {
  await seedBundledMethodologies();
  const rows = await sql()`SELECT id, name, original_filename, chars, is_default, created_at FROM methodologies ORDER BY is_default DESC, created_at DESC`;
  return rows.map(r => rowToMethodology(r));
}
export async function getMethodology(id, withText = false) {
  const rows = await sql()`SELECT * FROM methodologies WHERE id = ${id}`;
  return rowToMethodology(rows[0], withText);
}
export async function defaultMethodology() {
  const list = await listMethodologies();
  return list.find(m => m.isDefault) || list[0] || null;
}
export async function saveMethodology({ id, name, text, originalFilename, isDefault = false }) {
  const newId = id || crypto.randomUUID();
  if (isDefault) await sql()`UPDATE methodologies SET is_default = false`;
  const rows = await sql()`INSERT INTO methodologies (id, name, original_filename, chars, is_default, text)
    VALUES (${newId}, ${name || originalFilename || 'Untitled methodology'}, ${originalFilename || null}, ${text.length}, ${isDefault}, ${text})
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, original_filename = EXCLUDED.original_filename, chars = EXCLUDED.chars, is_default = EXCLUDED.is_default, text = EXCLUDED.text
    RETURNING id, name, original_filename, chars, is_default, created_at`;
  return rowToMethodology(rows[0]);
}
export async function setDefaultMethodology(id) {
  await sql()`UPDATE methodologies SET is_default = (id = ${id})`;
  return getMethodology(id);
}
export async function deleteMethodology(id) {
  await sql()`DELETE FROM methodologies WHERE id = ${id}`;
}

// Seeds the bundled methodology files on an empty table: the private Investment
// Methodology v3 when present, otherwise the generic sample.
let seeded = false;
export async function seedBundledMethodologies() {
  if (seeded) return;
  seeded = true;
  const rows = await sql()`SELECT count(*)::int AS n FROM methodologies`;
  if (rows[0].n > 0) return;
  const candidates = [
    { file: 'investment-methodology-v3.md', id: 'investment-methodology-v3', name: 'Investment Methodology v3 — Hamza Bassatne', originalFilename: 'Investment Methodology v3 - Hamza Bassatne.gdoc' },
    { file: 'sample-methodology.md', id: 'sample-methodology', name: 'Sample methodology — quality compounders', originalFilename: 'sample-methodology.md' },
  ];
  for (const c of candidates) {
    const p = path.join(ROOT, 'data', 'methodologies', c.file);
    if (!fs.existsSync(p)) continue;
    await saveMethodology({ id: c.id, name: c.name, originalFilename: c.originalFilename, text: fs.readFileSync(p, 'utf8'), isDefault: true });
    return;
  }
}
