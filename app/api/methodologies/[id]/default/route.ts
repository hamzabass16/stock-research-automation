import { NextResponse } from 'next/server';
import * as db from '@/lib/db.js';
export const dynamic = 'force-dynamic';
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await db.setDefaultMethodology(id);
  if (!m) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(m);
}
