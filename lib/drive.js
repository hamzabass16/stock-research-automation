// Google Drive publishing through the Drive API with a service account.
// Setup: create a service account, share the "Stock Theses & Research" folder
// with its email (Editor), then set GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON or
// base64) and DRIVE_PARENT_FOLDER_ID (the ID in the folder's URL).
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER = 'application/vnd.google-apps.folder';

export function driveConfigured() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.DRIVE_PARENT_FOLDER_ID);
}

function credentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  return JSON.parse(json);
}

function client() {
  const c = credentials();
  return new JWT({ email: c.client_email, key: c.private_key, scopes: SCOPES });
}

function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function safeName(s) { return String(s || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim(); }

async function listChildren(jwt, parentId, extraQ = '') {
  const q = `'${parentId}' in parents and trashed = false${extraQ}`;
  const res = await jwt.request({
    url: `${API}/files`, method: 'GET',
    params: { q, fields: 'files(id,name,mimeType,webViewLink)', pageSize: 200, supportsAllDrives: true, includeItemsFromAllDrives: true },
  });
  return res.data.files || [];
}

export async function companyFolder(jwt, { ticker, companyName }) {
  const parentId = process.env.DRIVE_PARENT_FOLDER_ID;
  const T = String(ticker).toUpperCase();
  const name = safeName(companyName).replace(new RegExp(`\\s*\\(${T}\\)\\s*$`, 'i'), '').trim();
  const folders = await listChildren(jwt, parentId, ` and mimeType = '${FOLDER}'`);
  const byTicker = folders.find(f => new RegExp(`\\(${T}\\)`, 'i').test(f.name) || f.name.toUpperCase() === T || new RegExp(`^${T}[\\s_-]`, 'i').test(f.name));
  if (byTicker) return byTicker;
  const byName = name && folders.find(f => f.name.toLowerCase() === name.toLowerCase() || f.name.toLowerCase().startsWith(name.toLowerCase() + ' ('));
  if (byName) return byName;
  const res = await jwt.request({
    url: `${API}/files`, method: 'POST', params: { fields: 'id,name,webViewLink', supportsAllDrives: true },
    data: { name: name && name.toUpperCase() !== T ? `${name} (${T})` : T, mimeType: FOLDER, parents: [parentId] },
  });
  return res.data;
}

async function uploadFile(jwt, folderId, name, buffer, mimeType) {
  const existing = await listChildren(jwt, folderId, ` and name = '${esc(name)}'`);
  const boundary = `sra${Date.now()}`;
  const meta = existing.length ? {} : { name, parents: [folderId] };
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const url = existing.length ? `${UPLOAD}/files/${existing[0].id}` : `${UPLOAD}/files`;
  const res = await jwt.request({
    url, method: existing.length ? 'PATCH' : 'POST',
    params: { uploadType: 'multipart', fields: 'id,name,webViewLink', supportsAllDrives: true },
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return res.data;
}

/**
 * @param {object} o
 * @param {string} o.ticker
 * @param {string} o.companyName
 * @param {Array<{name:string, buffer:Buffer, mimeType:string}>} o.files
 */
export async function publishToDrive({ ticker, companyName, files }) {
  if (!driveConfigured()) throw new Error('Google Drive is not configured (GOOGLE_SERVICE_ACCOUNT_JSON / DRIVE_PARENT_FOLDER_ID).');
  const jwt = client();
  const folder = await companyFolder(jwt, { ticker, companyName });
  const uploaded = [];
  for (const f of files) {
    const r = await uploadFile(jwt, folder.id, f.name, f.buffer, f.mimeType);
    uploaded.push({ name: r.name, id: r.id, url: r.webViewLink });
  }
  return { mode: 'drive-api', folderId: folder.id, folderName: folder.name, folderUrl: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`, files: uploaded, at: new Date().toISOString() };
}
