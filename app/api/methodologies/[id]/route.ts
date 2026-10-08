import { NextResponse } from 'next/server';
import * as db from '@/lib/db.js';
import { markdownToHtml } from '@/lib/markdown.js';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const m = await db.getMethodology(id, true);
  if (!m) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const url = new URL(req.url);
  if (url.searchParams.get('text')) return new Response(markdownToHtml(m.text, m.name), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  return NextResponse.json(m);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await db.deleteMethodology(id);
  return NextResponse.json({ ok: true });
}
