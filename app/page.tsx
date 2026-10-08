'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, recTone, fmtDate } from './lib/ui';

type Methodology = { id: string; name: string; isDefault: boolean };
type Run = { id: string; ticker: string; companyName?: string; question: string; status: string; phase: string; recommendation?: string; category?: string; createdAt: string; methodologyName?: string; artifacts: Record<string, string>; published?: any };

export default function Home() {
  const router = useRouter();
  const [methods, setMethods] = useState<Methodology[]>([]);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [ticker, setTicker] = useState('');
  const [question, setQuestion] = useState('');
  const [methodologyId, setMethodologyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState<Run | null>(null);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState('');

  const loadRuns = () => api('/api/runs').then(setRuns).catch(() => setRuns([]));
  useEffect(() => {
    api('/api/methodologies').then((list: Methodology[]) => { setMethods(list); const d = list.find(m => m.isDefault) || list[0]; if (d) setMethodologyId(d.id); }).catch(() => {});
    loadRuns();
    const t = setInterval(loadRuns, 8000);
    return () => clearInterval(t);
  }, []);

  async function start(force = false) {
    const T = ticker.trim().toUpperCase();
    if (!T || !question.trim()) { setErr('Enter a ticker and a thesis question.'); return; }
    setErr(''); setDup(null); setBusy(true);
    try {
      const res = await api('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker: T, question: question.trim(), methodologyId: methodologyId === '__none__' ? null : methodologyId, force }) });
      if (res.duplicate) { setDup(res.run); setBusy(false); return; }
      router.push(`/runs/${res.runId}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const visible = (runs || []).filter(r => !filter || r.ticker.includes(filter.toUpperCase()) || (r.companyName || '').toUpperCase().includes(filter.toUpperCase()));

  return (
    <main className="page">
      <div className="hero fade-in">
        <h1>Research a stock.</h1>
        <p>A ticker and a thesis question in. A sourced report, a statistical test of the thesis, a PDF and an investment-committee deck out.</p>
      </div>

      <div className="card fade-in">
        <div className="field">
          <label htmlFor="ticker">Ticker</label>
          <input id="ticker" className="input" placeholder="META" autoComplete="off" value={ticker} onChange={e => setTicker(e.target.value)} style={{ maxWidth: 220, textTransform: 'uppercase' }} />
        </div>
        <div className="field">
          <label htmlFor="q">Thesis question</label>
          <textarea id="q" className="textarea" placeholder="Will Meta's AI capex return a higher-than-expected ROI, lifting ad revenue and margins long-term?" value={question} onChange={e => setQuestion(e.target.value)} />
          <span className="help">Where do you have an information asymmetry over the market? Frame it so it can be tested against the stock's history.</span>
        </div>
        <div className="field">
          <label htmlFor="m">Methodology</label>
          <select id="m" className="select" value={methodologyId} onChange={e => setMethodologyId(e.target.value)} style={{ maxWidth: 420 }}>
            {methods.map(m => <option key={m.id} value={m.id}>{m.name}{m.isDefault ? ' · default' : ''}</option>)}
            <option value="__none__">Built-in lens (no methodology)</option>
          </select>
          <span className="help">The only judgment lens the model is allowed to use. The report template never changes. <Link href="/methodologies">Manage</Link> · <a href="/api/template" target="_blank" rel="noreferrer">View template</a></span>
        </div>
        {err && <div className="error-box" style={{ marginBottom: 14 }}>{err}</div>}
        {dup && (
          <div className="notice warn" style={{ marginBottom: 14 }}>
            <span><b>{dup.ticker}</b> was researched on {fmtDate(dup.createdAt)} ({dup.recommendation}).</span>
            <Link className="btn sm secondary" href={`/runs/${dup.id}`}>Open it</Link>
            <button className="btn sm" onClick={() => start(true)}>Run again anyway</button>
          </div>
        )}
        <div className="row between wrap">
          <button className="btn lg" disabled={busy} onClick={() => start(false)}>{busy ? <span className="spinner" /> : null}{busy ? 'Starting…' : 'Run research'}</button>
          <span className="hint">About 25–40 minutes. Four phases, then PDF, deck and Drive.</span>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Memory</h2>
          <input className="input" placeholder="Filter" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 180, padding: '8px 12px' }} />
        </div>
        <div className="card">
          {runs === null ? <div className="empty">Loading…</div> : visible.length === 0 ? <div className="empty">No research yet.</div> : (
            <div className="list">
              {visible.map(r => <RunRow key={r.id} r={r} onDelete={loadRuns} />)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function RunRow({ r, onDelete }: { r: Run; onDelete: () => void }) {
  const running = r.status === 'running' || r.status === 'queued';
  const tone = r.status === 'error' ? 'bad' : running ? 'accent' : recTone(r.recommendation);
  const label = r.status === 'error' ? 'Error' : running ? `Running · ${r.phase}` : r.recommendation || '—';
  const a = r.artifacts || {};
  return (
    <div className="list-item">
      <div>
        <div className="title">
          <Link href={`/runs/${r.id}`} className="ticker" style={{ color: 'inherit' }}>{r.ticker}</Link>
          {r.companyName && <span className="company">{r.companyName}</span>}
          <span className={`badge ${tone}`}>{running && <span className="spinner" style={{ width: 10, height: 10 }} />}{label}</span>
          {r.category && <span className="badge">{r.category}</span>}
        </div>
        <div className="q" style={{ marginTop: 6 }}>{r.question}</div>
        <div className="meta" style={{ marginTop: 6 }}>{fmtDate(r.createdAt, true)}{r.methodologyName ? ` · ${r.methodologyName}` : ''}{r.published?.folderName ? ` · Drive: ${r.published.folderName}` : ''}</div>
      </div>
      <div className="actions">
        {r.status === 'complete' && a.pdf && <a className="btn sm secondary" href={`/api/runs/${r.id}/file/report.pdf?download=1`}>PDF</a>}
        {r.status === 'complete' && a.deck && <a className="btn sm secondary" href={`/api/runs/${r.id}/file/deck.pptx?download=1`}>Deck</a>}
        <Link className="btn sm ghost" href={`/runs/${r.id}`}>Open</Link>
        <button className="btn sm danger" onClick={async () => { if (confirm(`Delete the ${r.ticker} run and its files?`)) { await api(`/api/runs/${r.id}`, { method: 'DELETE' }); onDelete(); } }}>Delete</button>
      </div>
    </div>
  );
}
