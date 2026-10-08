// Small shared helpers for the client components.
export async function api(url: string, opts?: RequestInit) {
  const r = await fetch(url, opts);
  const isJson = r.headers.get('content-type')?.includes('json');
  if (!r.ok) throw new Error(isJson ? (await r.json()).error || r.statusText : r.statusText);
  return isJson ? r.json() : r;
}

export function recTone(rec?: string | null): 'good' | 'warn' | 'bad' | '' {
  if (!rec) return '';
  if (/strong buy|^buy$/i.test(rec)) return 'good';
  if (/avoid|sell/i.test(rec)) return 'bad';
  return 'warn';
}

export function verdictTone(v?: string): 'good' | 'warn' | 'bad' {
  return v === 'Good' ? 'good' : v === 'Bad' ? 'bad' : 'warn';
}

export function fmtDate(iso?: string | null, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  return withTime ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtUsage(u: any) {
  if (!u) return '';
  const k = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n || 0));
  return `${u.requests || 0} requests · ${k(u.input_tokens)} in / ${k(u.output_tokens)} out tokens · ${k(u.cache_read_input_tokens)} cached · ${u.web_searches || 0} searches · ${u.web_fetches || 0} fetches`;
}

export const PHASES = [
  { key: 'research', label: 'Deep research' },
  { key: 'stats', label: 'Statistical validation' },
  { key: 'fill', label: 'Template fill' },
  { key: 'pitch', label: 'Verdict & pitch' },
  { key: 'outputs', label: 'PDF · Deck · Drive' },
];
export const PHASE_ORDER = ['queued', 'research', 'stats', 'fill', 'pitch', 'outputs', 'done'];

export const ARTIFACT_META: Record<string, { name: string; desc: string; primary?: boolean; view?: boolean }> = {
  pdf: { name: 'Report (PDF)', desc: 'The filled research template', primary: true },
  deck: { name: 'Pitch deck (PPTX)', desc: 'Six-part committee deck with notes' },
  pitch: { name: 'Pitch script & Q&A', desc: 'Talk track and the hardest questions', view: true },
  report: { name: 'Report (HTML)', desc: 'Browser version of the report', view: true },
  research: { name: 'Research dossier', desc: 'Everything the agent found', view: true },
  stats: { name: 'Statistical validation', desc: 'Hypothesis tests and derivations', view: true },
  pythonLog: { name: 'Python log', desc: 'Every script and its output', view: true },
};
