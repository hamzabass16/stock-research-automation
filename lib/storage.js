// Artifact storage on Vercel Blob (private store). The worker uploads every
// run artifact here; the Next.js app streams them back to the browser.
import { put, get, del, list } from '@vercel/blob';

export function storageConfigured() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.csv': 'text/csv',
  '.py': 'text/x-python',
};
export function contentTypeFor(name) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

export function artifactPath(runId, name) {
  return `runs/${runId}/${name}`;
}

export async function putArtifact(runId, name, body) {
  const pathname = artifactPath(runId, name);
  const blob = await put(pathname, body, { access: 'private', contentType: contentTypeFor(name), allowOverwrite: true, addRandomSuffix: false });
  return { pathname: blob.pathname, url: blob.url, size: Buffer.isBuffer(body) ? body.length : String(body).length };
}

// Returns { stream, contentType, size } or null.
export async function getArtifact(runId, name) {
  const res = await get(artifactPath(runId, name), { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  return { stream: res.stream, contentType: res.blob.contentType || contentTypeFor(name), size: res.blob.size };
}

export async function getArtifactText(runId, name) {
  const a = await getArtifact(runId, name);
  if (!a) return null;
  return await new Response(a.stream).text();
}

export async function deleteRunArtifacts(runId) {
  const { blobs } = await list({ prefix: `runs/${runId}/`, limit: 1000 });
  if (blobs.length) await del(blobs.map(b => b.url));
  return blobs.length;
}
