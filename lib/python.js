// Local Python execution for the statistical-validation step (Step 2 of the
// guide: "use statistical techniques such as hypothesis testing in a very
// transparent manner"). Prefers the project's own virtualenv (.venv) which has
// numpy / pandas / scipy / statsmodels / yfinance installed via `npm run setup:python`.
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_CAP = 14000;

export function pythonBinary() {
  const candidates = process.platform === 'win32'
    ? [path.join(ROOT, '.venv', 'Scripts', 'python.exe'), 'py', 'python']
    : [path.join(ROOT, '.venv', 'bin', 'python'), 'python3', 'python'];
  for (const bin of candidates) {
    if (bin.includes(path.sep) && !fs.existsSync(bin)) continue;
    const r = spawnSync(bin, ['--version'], { encoding: 'utf8' });
    if (!r.error) return bin;
  }
  return null;
}

let statusCache = { at: 0, value: null };
export function pythonStatus() {
  if (statusCache.value && Date.now() - statusCache.at < 60000) return statusCache.value;
  const value = probePython();
  statusCache = { at: Date.now(), value };
  return value;
}

function probePython() {
  const bin = pythonBinary();
  if (!bin) return { ok: false, bin: null, libs: [] };
  const probe = 'import importlib\n'
    + 'mods=["numpy","pandas","scipy","statsmodels","yfinance","matplotlib"]\n'
    + 'ok=[]\n'
    + 'for m in mods:\n'
    + '  try:\n    importlib.import_module(m); ok.append(m)\n  except Exception:\n    pass\n'
    + 'print(",".join(ok))';
  const r = spawnSync(bin, ['-c', probe], { encoding: 'utf8', timeout: 30000 });
  const libs = (r.stdout || '').trim().split(',').filter(Boolean);
  return { ok: true, bin, libs, venv: bin.includes('.venv') };
}

// Runs a script in a scratch working directory (so any files the model writes,
// e.g. charts, land next to the run's artifacts). Returns combined stdout/stderr.
export function runPython(code, { cwd, timeoutMs = 240000 } = {}) {
  const bin = pythonBinary();
  if (!bin) return 'ERROR: no Python interpreter found. Run `npm run setup:python`.';
  const workDir = cwd || fs.mkdtempSync(path.join(os.tmpdir(), 'sra-'));
  fs.mkdirSync(workDir, { recursive: true });
  const script = path.join(workDir, `script_${Date.now()}.py`);
  fs.writeFileSync(script, code, 'utf8');
  const r = spawnSync(bin, ['-I', script], {
    cwd: workDir,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, PYTHONUTF8: '1', MPLBACKEND: 'Agg' },
  });
  try { fs.unlinkSync(script); } catch {}
  let out = r.stdout || '';
  if (r.stderr) out += `\n[stderr]\n${r.stderr}`;
  if (r.error) out += `\n[error] ${r.error.code === 'ETIMEDOUT' ? `timed out after ${timeoutMs / 1000}s` : r.error.message}`;
  if (typeof r.status === 'number' && r.status !== 0) out += `\n[exit code ${r.status}]`;
  if (out.length > OUTPUT_CAP) out = out.slice(0, OUTPUT_CAP / 2) + '\n...[output truncated]...\n' + out.slice(-OUTPUT_CAP / 2);
  return out.trim() || '(no output)';
}
