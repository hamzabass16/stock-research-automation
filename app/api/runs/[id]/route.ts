import { NextResponse } from 'next/server';
import * as db from '@/lib/db.js';
import { deleteRunArtifacts, storageConfigured } from '@/lib/storage.js';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const run = await db.getRun(id);
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const [steps, live] = await Promise.all([db.listSteps(id), run.status === 'running' ? db.getLive(id) : null]);
  return NextResponse.json({ ...run, steps, live });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (storageConfigured()) await deleteRunArtifacts(id).catch(() => 0);
  await db.deleteRun(id);
  return NextResponse.json({ ok: true });
}
