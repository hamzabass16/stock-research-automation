import { NextResponse } from 'next/server';
import { isLive, MODEL, EFFORT } from '@/lib/claude.js';
import { runnerMode } from '@/lib/runner.js';
import { storageConfigured } from '@/lib/storage.js';
import { driveConfigured } from '@/lib/drive.js';
import { publishStatus } from '@/lib/publish.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const drive = driveConfigured() ? 'drive-api' : publishStatus().configured ? 'local-sync' : null;
  return NextResponse.json({
    demoMode: !isLive(), model: MODEL, effort: EFFORT, preparedBy: process.env.PREPARED_BY || 'Analyst',
    runner: runnerMode(), storage: storageConfigured(), drive, budgetMinutes: Number(process.env.RUN_BUDGET_MINUTES || 0) || null,
  });
}
