'use client';
import { useEffect, useState } from 'react';
import { api, fmtDate } from '../lib/ui';

type Methodology = { id: string; name: string; originalFilename?: string; chars: number; isDefault: boolean; createdAt: string };

export default function MethodologiesPage() {
  const [list, setList] = useState<Methodology[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => api('/api/methodologies').then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('name', name); fd.append('text', text); fd.append('isDefault', String(isDefault));
      if (file) fd.append('file', file);
      await api('/api/methodologies', { method: 'POST', body: fd });
      setName(''); setText(''); setFile(null); setIsDefault(false);
      (document.getElementById('file') as HTMLInputElement).value = '';
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <main className="page fade-in">
      <div className="hero">
        <h1>Methodologies.</h1>
        <p>The judgment lens for every subjective call. Upload one once and reuse it for any ticker; the report template never changes.</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 18 }}>Add</h2>
          <div className="field"><label>Name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Investment Methodology v4" /></div>
          <div className="field"><label>Text</label><textarea className="textarea" value={text} onChange={e => setText(e.target.value)} placeholder="Paste the methodology, or choose a file below…" /></div>
          <div className="field"><label>File (PDF, Markdown or text)</label><input id="file" className="input" type="file" accept=".pdf,.md,.txt,.text,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
          <label className="row small" style={{ marginBottom: 18, gap: 8 }}><input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} /> Make this the default</label>
          {err && <div className="error-box" style={{ marginBottom: 14 }}>{err}</div>}
          <button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save methodology'}</button>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 18 }}>Library</h2>
          {list.length === 0 ? <div className="empty">Nothing yet.</div> : (
            <div className="list">
              {list.map(m => (
                <div className="list-item" key={m.id}>
                  <div>
                    <div className="title"><span className="ticker" style={{ fontSize: 15 }}>{m.name}</span>{m.isDefault && <span className="badge accent">Default</span>}</div>
                    <div className="meta" style={{ marginTop: 4 }}>{m.chars.toLocaleString()} characters · {fmtDate(m.createdAt)}{m.originalFilename ? ` · ${m.originalFilename}` : ''}</div>
                  </div>
                  <div className="actions">
                    <a className="btn sm ghost" href={`/api/methodologies/${m.id}?text=1`} target="_blank" rel="noreferrer">View</a>
                    {!m.isDefault && <button className="btn sm secondary" onClick={async () => { await api(`/api/methodologies/${m.id}/default`, { method: 'POST' }); load(); }}>Set default</button>}
                    <button className="btn sm danger" onClick={async () => { if (confirm('Delete this methodology?')) { await api(`/api/methodologies/${m.id}`, { method: 'DELETE' }); load(); } }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
