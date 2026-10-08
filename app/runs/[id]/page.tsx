'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, recTone, verdictTone, fmtDate, fmtTime, fmtUsage, PHASES, PHASE_ORDER, ARTIFACT_META } from '../../lib/ui';

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let timer: any;
    const tick = async () => {
      try {
        const r = await api(`/api/runs/${id}`);
        setRun(r);
        if (r.status === 'running' || r.status === 'queued') timer = setTimeout(tick, 2500);
      } catch (e: any) { setErr(e.message); }
    };
    tick();
    return () => clearTimeout(timer);
  }, [id]);

  if (err) return <main className="page"><div className="error-box">{err}</div></main>;
  if (!run) return <main className="page"><div className="empty">Loading…</div></main>;

  const running = run.status === 'running' || run.status === 'queued';
  const idx = PHASE_ORDER.indexOf(run.phase);
  const pct = run.status === 'complete' || run.status === 'error' ? 100 : Math.max(3, Math.min(96, (idx - 1) * 20 + Math.min(18, (run.steps?.length || 0))));

  return (
    <main className="page fade-in">
      <div className="row between wrap" style={{ marginBottom: 6 }}>
        <Link href="/" className="small">← Research</Link>
        <span className="small muted">{fmtDate(run.createdAt, true)}{run.model ? ` · ${run.model}` : ''}{run.effort ? ` · effort ${run.effort}` : ''}{run.runner ? ` · ${run.runner}` : ''}</span>
      </div>
      <h1 style={{ fontSize: 40 }}>{run.ticker}{run.companyName && <span className="muted" style={{ fontWeight: 400, fontSize: 24, marginLeft: 12 }}>{run.companyName}</span>}</h1>
      <p className="summary" style={{ marginTop: 6 }}>{run.question}</p>

      {run.status === 'error' && <div className="error-box" style={{ marginTop: 22 }}>{run.error}</div>}

      {run.status === 'complete' && (
        <div className="card" style={{ marginTop: 28 }}>
          <div className="verdict">
            <span className={`rec ${recTone(run.recommendation)}`}>{run.recommendation}</span>
            {run.category && <span className="badge purple">{run.category}</span>}
            {run.timeHorizon && <span className="badge" title={run.timeHorizon}>Horizon · {run.timeHorizon.length > 60 ? run.timeHorizon.slice(0, 60) + '…' : run.timeHorizon}</span>}
          </div>
          <p className="summary">{run.summary}</p>
          <div className="facts">
            {run.conclusion && (<>
              <span className="chip">Business <b className={verdictTone(run.conclusion.business)}>{run.conclusion.business}</b></span>
              <span className="chip">Operations <b className={verdictTone(run.conclusion.operations)}>{run.conclusion.operations}</b></span>
              <span className="chip">Valuation <b className={verdictTone(run.conclusion.valuation)}>{run.conclusion.valuation}</b></span>
            </>)}
            {run.statistical?.test && <span className="chip">{run.statistical.test.length > 48 ? run.statistical.test.slice(0, 48) + '…' : run.statistical.test} · p = {run.statistical.p_value} <b className={run.statistical.significant ? 'good' : 'bad'}>{run.statistical.significant ? 'significant' : 'not significant'}</b></span>}
          </div>
          {run.killSignal && <div className="kill"><b>Kill signal.</b> {run.killSignal}</div>}
          <Artifacts run={run} />
          {run.published && !run.published.error && (
            <div className="published">
              <span>Published to Drive{run.published.folderName ? <> · <b>{run.published.folderName}</b></> : null} · {run.published.files?.length || 0} files · {fmtDate(run.published.at)}</span>
              {run.published.folderUrl && <a className="btn sm secondary" href={run.published.folderUrl} target="_blank" rel="noreferrer">Open folder</a>}
            </div>
          )}
          {run.published?.error && <div className="published" style={{ color: 'var(--bad)' }}>Drive publish failed: {run.published.error}</div>}
          {run.usage && <div className="usage">{fmtUsage(run.usage)}</div>}
        </div>
      )}

      <div className="card" style={{ marginTop: 22 }}>
        <div className="phases">
          {PHASES.map((p, i) => {
            const pi = PHASE_ORDER.indexOf(p.key);
            const state = run.status === 'error' && pi === idx ? 'err' : run.status === 'complete' || pi < idx ? 'done' : pi === idx ? 'active' : '';
            return (
              <span key={p.key} style={{ display: 'contents' }}>
                {i > 0 && <span className={`phase-line ${pi <= idx || run.status === 'complete' ? 'done' : ''}`} />}
                <span className={`phase ${state}`}><span className="n">{state === 'done' ? '✓' : i + 1}</span><span className="label">{p.label}</span></span>
              </span>
            );
          })}
        </div>
        <div className="progress"><div style={{ width: pct + '%' }} /></div>
        {run.steps?.length ? (
          <ul className="log" style={{ marginTop: 16 }}>
            {run.steps.slice(-80).map((s: any, i: number) => <li key={i}><span className="t">{fmtTime(s.t)}</span><span>{s.s}</span></li>)}
          </ul>
        ) : <div className="empty">{running ? 'Starting…' : 'No log.'}</div>}
        {running && run.live?.text && (
          <details className="live" open>
            <summary>Live model output · {run.live.phase}</summary>
            <pre>{run.live.text}</pre>
          </details>
        )}
        {run.status === 'error' && Object.keys(run.artifacts || {}).length > 0 && <Artifacts run={run} />}
      </div>
    </main>
  );
}

function Artifacts({ run }: { run: any }) {
  const a = run.artifacts || {};
  const files: Record<string, string> = { pdf: 'report.pdf', deck: 'deck.pptx', pitch: 'pitch.md', report: 'report.html', research: 'research.md', stats: 'stats.md', pythonLog: 'python_log.md' };
  const keys = Object.keys(ARTIFACT_META).filter(k => a[k]);
  if (!keys.length) return null;
  return (
    <div className="artifacts">
      {keys.map(k => {
        const m = ARTIFACT_META[k];
        const href = `/api/runs/${run.id}/file/${files[k]}${m.view ? '?view=1' : '?download=1'}`;
        return (
          <a key={k} className={`artifact ${m.primary ? 'primary' : ''}`} href={href} target={m.view ? '_blank' : undefined} rel="noreferrer">
            <span className="name">{m.name}</span>
            <span className="desc">{m.desc}</span>
          </a>
        );
      })}
    </div>
  );
}
