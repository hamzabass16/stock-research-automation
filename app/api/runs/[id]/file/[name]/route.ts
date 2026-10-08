import { NextResponse } from 'next/server';
import fs from 'fs';
import * as db from '@/lib/db.js';
import { getArtifact, contentTypeFor } from '@/lib/storage.js';
import { markdownToHtml } from '@/lib/markdown.js';

export const dynamic = 'force-dynamic';
const ALLOWED = /^[\w.-]+\.(pdf|html|md|json|pptx|png|csv|py)$/;

export async function GET(req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await params;
  if (!ALLOWED.test(name)) return NextResponse.json({ error: 'bad name' }, { status: 400 });
  const run = await db.getRun(id);
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const url = new URL(req.url);
  const view = url.searchParams.get('view');
  const download = url.searchParams.get('download');
  const date = (run.completedAt || run.createdAt || '').toString().slice(0, 10);
  const prettyName = `${run.ticker}_${name.replace(/\.(\w+)$/, '')}_${date}.${name.split('.').pop()}`;

  // Artifacts may be on Vercel Blob (pathname) or on local disk ("local:/path") when run without a Blob token.
  const ref = Object.values(run.artifacts || {}).find((v: any) => typeof v === 'string' && (v.endsWith('/' + name) || v.endsWith('local:' + name) || v.split('/').pop() === name)) as string | undefined;
  let body: Buffer | ReadableStream | null = null;
  let type = contentTypeFor(name);
  if (ref && ref.startsWith('local:')) {
    const p = ref.slice(6);
    if (!fs.existsSync(p)) return NextResponse.json({ error: 'file missing' }, { status: 404 });
    body = fs.readFileSync(p);
  } else {
    const a = await getArtifact(id, name).catch(() => null);
    if (!a) return NextResponse.json({ error: 'file not found' }, { status: 404 });
    body = a.stream; type = a.contentType || type;
  }

  if (view && name.endsWith('.md')) {
    const text = Buffer.isBuffer(body) ? body.toString('utf8') : await new Response(body).text();
    return new Response(markdownToHtml(text, `${run.ticker} — ${name}`), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const headers: Record<string, string> = { 'Content-Type': type, 'Cache-Control': 'private, max-age=60' };
  if (download) headers['Content-Disposition'] = `attachment; filename="${prettyName}"`;
  else if (!name.endsWith('.html') && !name.endsWith('.pdf') && !name.endsWith('.png')) headers['Content-Disposition'] = `inline; filename="${prettyName}"`;
  return new Response(body as any, { headers });
}
