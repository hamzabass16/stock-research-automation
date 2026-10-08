import { NextResponse } from 'next/server';
import * as db from '@/lib/db.js';
import { launchRun, runnerMode } from '@/lib/runner.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  await db.markStaleRuns(Number(process.env.STALE_RUN_MINUTES || 6)).catch(() => 0);
  return NextResponse.json(await db.listRuns(200));
}

export async function POST(req: Request) {
  const { ticker, question, methodologyId, force } = await req.json().catch(() => ({} as any));
  if (!ticker || !question) return NextResponse.json({ error: 'ticker and question are required.' }, { status: 400 });

  if (!force) {
    const existing = await db.findExistingByTicker(ticker);
    if (existing) return NextResponse.json({ duplicate: true, run: existing });
  }
  const methodology = methodologyId ? await db.getMethodology(methodologyId) : await db.defaultMethodology();
  const run = await db.createRun({ ticker, question, methodologyId: methodology?.id || null, methodologyName: methodology?.name || 'Built-in default lens', runner: runnerMode() });
  try {
    await db.addStep(run.id, `Run queued (${runnerMode()}).`);
    const launched = await launchRun(run.id);
    return NextResponse.json({ duplicate: false, runId: run.id, launched });
  } catch (e: any) {
    await db.updateRun(run.id, { status: 'error', phase: 'error', error: `Could not start the worker: ${e.message || e}` });
    return NextResponse.json({ error: `Could not start the worker: ${e.message || e}`, runId: run.id }, { status: 500 });
  }
}
