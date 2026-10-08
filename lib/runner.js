// Launches the worker for a run: inside a Vercel Sandbox when deployed on
// Vercel, as a detached local process otherwise (RUNNER=local forces local).
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import * as db from './db.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Env forwarded to the worker (both local and sandbox).
const FORWARD = [
  'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_MODEL', 'RESEARCH_EFFORT', 'MAX_WEB_SEARCHES', 'MAX_WEB_FETCHES', 'MAX_TURNS',
  'FALLBACKS', 'PREPARED_BY', 'DEMO_MODE', 'DATABASE_URL', 'BLOB_READ_WRITE_TOKEN', 'GOOGLE_SERVICE_ACCOUNT_JSON', 'DRIVE_PARENT_FOLDER_ID',
  'DRIVE_PUBLISH_DIR', 'RUN_BUDGET_MINUTES',
];

export function runnerMode() {
  if (process.env.RUNNER) return process.env.RUNNER;
  return process.env.VERCEL ? 'sandbox' : 'local';
}

function forwardedEnv() {
  const env = {};
  for (const k of FORWARD) if (process.env[k]) env[k] = process.env[k];
  return env;
}

export async function launchRun(runId) {
  const mode = runnerMode();
  if (mode === 'local') return launchLocal(runId);
  return launchSandbox(runId);
}

function launchLocal(runId) {
  const budgetMin = Number(process.env.RUN_BUDGET_MINUTES || 0);
  const env = { ...process.env, ...forwardedEnv(), RUN_ID: runId };
  if (budgetMin > 0) env.RUN_DEADLINE = String(Date.now() + budgetMin * 60000);
  const child = spawn(process.execPath, [path.join(ROOT, 'worker', 'run.mjs'), runId], { cwd: ROOT, env, detached: true, stdio: 'ignore' });
  child.unref();
  return { runner: 'local', pid: child.pid };
}

// Files the sandbox needs (the worker, the pipeline libraries and the worker's package.json).
function workerFiles() {
  const files = [];
  const add = (abs, rel) => files.push({ path: rel, content: fs.readFileSync(abs) });
  for (const f of fs.readdirSync(path.join(ROOT, 'lib'))) if (f.endsWith('.js')) add(path.join(ROOT, 'lib', f), `lib/${f}`);
  add(path.join(ROOT, 'worker', 'run.mjs'), 'worker/run.mjs');
  add(path.join(ROOT, 'worker', 'bootstrap.sh'), 'worker/bootstrap.sh');
  add(path.join(ROOT, 'worker', 'package.json'), 'package.json');
  return files;
}

async function launchSandbox(runId) {
  const { Sandbox } = await import('@vercel/sandbox');
  const budgetMin = Math.min(Number(process.env.RUN_BUDGET_MINUTES || 36), 40);
  const timeoutMs = Math.min((budgetMin + 5) * 60000, 44 * 60000); // Hobby plan caps a session at 45 minutes
  const expiresAt = Date.now() + timeoutMs;
  const env = {
    ...forwardedEnv(),
    RUN_ID: runId,
    RUN_DEADLINE: String(expiresAt - 2 * 60000),
    PUPPETEER_SKIP_DOWNLOAD: '1',
    PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium',
    NODE_OPTIONS: '--max-old-space-size=3072',
  };
  const sandbox = await Sandbox.create({
    name: `run-${runId.slice(0, 8)}-${Date.now().toString(36)}`,
    timeout: timeoutMs,
    resources: { vcpus: 2 },
    env,
    persistent: false,
    tags: { app: 'stock-research', run: runId.slice(0, 8) },
  });
  await db.updateRun(runId, { sandboxId: sandbox.sandboxId, runner: 'sandbox' });
  await db.addStep(runId, `Sandbox ${sandbox.sandboxId} created (${budgetMin} min budget). Installing Node, Python and Chromium dependencies...`);
  await sandbox.writeFiles(workerFiles());
  await sandbox.runCommand({ cmd: 'bash', args: ['worker/bootstrap.sh', runId], detached: true, env });
  return { runner: 'sandbox', sandboxId: sandbox.sandboxId, expiresAt };
}

export async function stopSandbox(sandboxId) {
  const { Sandbox } = await import('@vercel/sandbox');
  const sandbox = await Sandbox.get({ sandboxId });
  await sandbox.stop();
}
