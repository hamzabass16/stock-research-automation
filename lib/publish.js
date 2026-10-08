// Publishes a run's outputs into the HCMP Google Drive folder that Google Drive
// for desktop keeps in sync (so no OAuth is needed): one subfolder per company
// under "Stock Theses & Research", every filename carrying the publish date.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

// Default: the "Stock Theses & Research" folder of the HCMP workspace in whichever
// Google Drive for desktop account is mounted under ~/Library/CloudStorage.
const DRIVE_SUBPATH = ['My Drive', 'HCMP', 'Stock Theses & Research'];

function detectDriveDir() {
  const base = path.join(os.homedir(), 'Library', 'CloudStorage');
  try {
    for (const entry of fs.readdirSync(base)) {
      if (!entry.startsWith('GoogleDrive-')) continue;
      const candidate = path.join(base, entry, ...DRIVE_SUBPATH);
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {}
  return path.join(base, 'GoogleDrive-<account>', ...DRIVE_SUBPATH);
}

let detected = null;
export function publishDir() {
  if (process.env.DRIVE_PUBLISH_DIR) return process.env.DRIVE_PUBLISH_DIR;
  if (!detected) detected = detectDriveDir();
  return detected;
}

export function publishStatus() {
  const dir = publishDir();
  return { configured: fs.existsSync(dir), dir };
}

function safeName(s) {
  return String(s || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
}

// Finds an existing company folder (by ticker in the name, or by company name),
// otherwise creates "<Company Name> (<TICKER>)".
export function companyFolder({ ticker, companyName }) {
  const base = publishDir();
  if (!fs.existsSync(base)) throw new Error(`Drive folder not found: ${base}`);
  const T = String(ticker).toUpperCase();
  // The model often returns "Meta Platforms, Inc. (META)"; keep the name only.
  companyName = safeName(companyName).replace(new RegExp(`\\s*\\(${T}\\)\\s*$`, 'i'), '').trim();
  const dirs = fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('.')).map(d => d.name);
  const byTicker = dirs.find(n => new RegExp(`\\(${T}\\)`, 'i').test(n) || n.toUpperCase() === T || new RegExp(`^${T}[\\s_-]`, 'i').test(n));
  if (byTicker) return path.join(base, byTicker);
  const cn = safeName(companyName).toLowerCase();
  const byName = cn && dirs.find(n => n.toLowerCase() === cn || n.toLowerCase().startsWith(cn + ' ('));
  if (byName) return path.join(base, byName);
  const name = companyName ? `${safeName(companyName)} (${T})` : T;
  const dir = path.join(base, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Copies files into the company folder with dated names.
 * @param {object} o
 * @param {string} o.ticker
 * @param {string} o.companyName
 * @param {string} o.date   YYYY-MM-DD
 * @param {Array<{src:string, kind:string}>} o.files  kind becomes part of the filename, e.g. "Stock_Research_Report"
 */
export function publishRun({ ticker, companyName, date, files }) {
  const dir = companyFolder({ ticker, companyName });
  const T = String(ticker).toUpperCase();
  const published = [];
  for (const f of files) {
    if (!f.src || !fs.existsSync(f.src)) continue;
    const ext = path.extname(f.src);
    const name = `${T}_${f.kind}_${date}${ext}`;
    fs.copyFileSync(f.src, path.join(dir, name));
    published.push(name);
  }
  return { ok: true, dir, files: published };
}

// Opens the folder in Finder / Explorer (best effort).
export function revealFolder(dir) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  try { spawn(cmd, [dir], { detached: true, stdio: 'ignore' }).unref(); return true; }
  catch { return false; }
}
