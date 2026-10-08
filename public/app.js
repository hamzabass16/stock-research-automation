const $ = (id) => document.getElementById(id);
let pollTimer = null;
let config = {};

async function api(url, opts) {
  const r = await fetch(url, opts);
  const isJson = r.headers.get('content-type')?.includes('json');
  if (!r.ok) throw new Error(isJson ? (await r.json()).error || r.statusText : r.statusText);
  return isJson ? r.json() : r;
}

// ---------- Config pills ----------
async function loadConfig() {
  config = await api('/api/config');
  const py = config.python || {};
  const pyOk = py.ok && (py.libs || []).length >= 5;
  const pills = [
    `<span class="pill ${config.demoMode ? 'warn' : 'on'}" title="${config.demoMode ? 'Add ANTHROPIC_API_KEY to .env' : 'Model ' + config.model + ' · effort ' + config.effort}">${config.demoMode ? 'DEMO MODE' : 'LIVE · ' + config.model}</span>`,
    `<span class="pill ${pyOk ? 'on' : 'warn'}" title="${pyOk ? py.bin : 'Run: npm run setup:python'}">Python ${pyOk ? 'ready' : 'missing'}</span>`,
    `<span class="pill ${config.drive?.configured ? 'on' : 'warn'}" title="${escapeHtml(config.drive?.dir || '')}">Drive ${config.drive?.configured ? 'synced' : 'folder missing'}</span>`,
  ];
  $('statusPills').innerHTML = pills.join('');
}

// ---------- Methodologies ----------
async function loadMethodologies() {
  const list = await api('/api/methodologies');
  const sel = $('methodology');
  const def = list.find(m => m.isDefault);
  sel.innerHTML = list.map(m => `<option value="${m.id}" ${m.isDefault ? 'selected' : ''}>${escapeHtml(m.name)}${m.isDefault ? ' ★' : ''}</option>`).join('')
    + '<option value="__none__">Built-in default lens (no methodology)</option>';
  if (!def && list.length) sel.value = list[0].id;
  const ml = $('methodList');
  ml.innerHTML = list.length ? list.map(m => `
    <div class="method-item">
      <div><div class="mi-name">${m.isDefault ? '★ ' : ''}${escapeHtml(m.name)}</div>
      <div class="mi-meta">${m.chars.toLocaleString()} chars · ${new Date(m.createdAt).toLocaleDateString()}${m.originalFilename ? ' · ' + escapeHtml(m.originalFilename) : ''}</div></div>
      <div class="mi-actions">
        <a href="/api/methodologies/${m.id}/text" target="_blank">View</a>
        ${m.isDefault ? '' : `<button class="ghost tiny" data-def="${m.id}">Set default</button>`}
        <button data-del="${m.id}">Delete</button>
      </div>
    </div>`).join('') : '<p class="muted">No methodologies yet. Add one above.</p>';
  ml.querySelectorAll('[data-del]').forEach(b =>
    b.onclick = async () => { if (confirm('Delete this methodology?')) { await api('/api/methodologies/' + b.dataset.del, { method: 'DELETE' }); loadMethodologies(); } });
  ml.querySelectorAll('[data-def]').forEach(b =>
    b.onclick = async () => { await api('/api/methodologies/' + b.dataset.def + '/default', { method: 'POST' }); loadMethodologies(); });
}

$('saveMethod').onclick = async () => {
  const fd = new FormData();
  fd.append('name', $('methodName').value);
  fd.append('text', $('methodText').value);
  fd.append('isDefault', $('methodDefault').checked ? 'true' : 'false');
  if ($('methodFile').files[0]) fd.append('file', $('methodFile').files[0]);
  $('saveMethod').disabled = true;
  try {
    await api('/api/methodologies', { method: 'POST', body: fd });
    $('methodName').value = ''; $('methodText').value = ''; $('methodFile').value = ''; $('methodDefault').checked = false;
    loadMethodologies();
  } catch (e) { alert(e.message); }
  finally { $('saveMethod').disabled = false; }
};
$('manageMethods').onclick = () => $('methodModal').classList.remove('hidden');
$('closeModal').onclick = () => $('methodModal').classList.add('hidden');

// ---------- Trigger ----------
$('runBtn').onclick = () => startRun(false);

async function startRun(force) {
  const ticker = $('ticker').value.trim().toUpperCase();
  const question = $('question').value.trim();
  if (!ticker || !question) { alert('Enter a ticker and a thesis question.'); return; }
  $('dupNote').classList.add('hidden');
  $('runBtn').disabled = true;
  const sel = $('methodology').value;

  try {
    const res = await api('/api/research', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, question, methodologyId: sel === '__none__' ? null : sel, force }),
    });
    if (res.duplicate) {
      $('runBtn').disabled = false;
      $('dupNote').innerHTML = `<strong>${ticker}</strong> was already researched
        (${new Date(res.run.createdAt).toLocaleDateString()} — ${escapeHtml(res.run.recommendation || '')}).
        <button id="forceBtn">Run again anyway</button>`;
      $('dupNote').classList.remove('hidden');
      $('forceBtn').onclick = () => startRun(true);
      return;
    }
    openRunPanel(ticker);
    poll(res.runId);
  } catch (e) { alert(e.message); $('runBtn').disabled = false; }
}

function openRunPanel(ticker) {
  $('runPanel').classList.remove('hidden');
  $('runTitle').textContent = ticker;
  $('stepLog').innerHTML = '';
  $('runResult').classList.add('hidden');
  $('liveBox').classList.add('hidden');
  $('progressBar').style.width = '3%';
  document.querySelectorAll('#phases li').forEach(li => li.className = '');
}

const PHASE_ORDER = ['research', 'stats', 'fill', 'pitch', 'outputs', 'done'];
function paintPhases(run) {
  const idx = PHASE_ORDER.indexOf(run.phase);
  document.querySelectorAll('#phases li').forEach(li => {
    const i = PHASE_ORDER.indexOf(li.dataset.phase);
    li.className = run.status === 'error' && i === idx ? 'err' : i < idx || run.status === 'complete' ? 'done' : i === idx ? 'active' : '';
  });
  const pct = run.status === 'complete' || run.status === 'error' ? 100 : Math.max(3, Math.min(95, idx * 20 + Math.min(18, (run.steps?.length || 0))));
  $('progressBar').style.width = pct + '%';
}

function poll(runId) {
  clearInterval(pollTimer);
  const tick = async () => {
    let run;
    try { run = await api('/api/run/' + runId); } catch { return; }
    $('stepLog').innerHTML = (run.steps || []).map(s => `<li><span class="t">${new Date(s.t).toLocaleTimeString()}</span>${escapeHtml(s.s)}</li>`).join('');
    $('stepLog').scrollTop = $('stepLog').scrollHeight;
    if (run.live && run.live.text) {
      $('liveBox').classList.remove('hidden');
      $('liveText').textContent = run.live.text;
      $('liveText').scrollTop = $('liveText').scrollHeight;
    }
    paintPhases(run);
    if (run.status === 'complete' || run.status === 'error') {
      clearInterval(pollTimer);
      $('runBtn').disabled = false;
      $('liveBox').classList.add('hidden');
      showResult(run);
      loadHistory();
    }
  };
  tick();
  pollTimer = setInterval(tick, 2000);
}

function artifactLinks(run, compact) {
  const a = run.artifacts || {};
  const L = (href, cls, label) => `<a class="${compact ? '' : 'btn-link '}${cls}" href="${href}" target="_blank">${label}</a>`;
  return [
    L(`/api/run/${run.id}/pdf`, 'btn-pdf', '⬇ PDF report'),
    a.meta ? L(`/api/run/${run.id}/deck`, 'btn-deck', '⬇ Pitch deck (.pptx)') : '',
    a.pitch ? L(`/api/run/${run.id}/md/pitch`, 'btn-pitch', '🎤 Pitch script & Q&A') : '',
    run.htmlFile ? L(`/reports/${run.htmlFile}`, 'btn-html', 'HTML') : '',
    a.research ? L(`/api/run/${run.id}/md/research`, 'btn-html', 'Research dossier') : '',
    a.stats ? L(`/api/run/${run.id}/md/stats`, 'btn-html', 'Statistics') : '',
    a.pythonLog ? L(`/api/run/${run.id}/md/python`, 'btn-html', 'Python log') : '',
  ].filter(Boolean).join('');
}

function publishedBlock(run) {
  if (!run.publishedDir) return '';
  const folder = run.publishedDir.split('/').slice(-2).join(' / ');
  return `<div class="published">📁 Published to Drive: <b>${escapeHtml(folder)}</b> (${(run.publishedFiles || []).length} files, ${escapeHtml((run.publishedAt || '').slice(0, 10))})
    <button class="ghost tiny" data-reveal="${run.id}">Reveal in Finder</button></div>`;
}
function wireReveal(root) {
  root.querySelectorAll('[data-reveal]').forEach(b => b.onclick = () => api('/api/run/' + b.dataset.reveal + '/reveal', { method: 'POST' }).catch(e => alert(e.message)));
}

function showResult(run) {
  const box = $('runResult');
  box.classList.remove('hidden');
  if (run.status === 'error') {
    box.className = 'run-result error';
    box.innerHTML = `<div class="rec">Error</div><div class="summary">${escapeHtml(run.error || '')}</div>
      ${run.artifacts?.research ? `<div class="actions">${artifactLinks(run)}</div>` : ''}`;
    return;
  }
  box.className = 'run-result';
  const st = run.statistical || {};
  const c = run.conclusion || {};
  box.innerHTML = `
    <div class="rec">${escapeHtml(run.recommendation || '—')} <span class="muted" style="font-size:14px">· ${escapeHtml(run.category || '')}</span></div>
    <div class="summary">${escapeHtml(run.summary || '')}</div>
    <div class="facts">
      ${c.business ? `<span>Business <b class="${cls(c.business)}">${c.business}</b></span><span>Operations <b class="${cls(c.operations)}">${c.operations}</b></span><span>Valuation <b class="${cls(c.valuation)}">${c.valuation}</b></span>` : ''}
      ${st.test ? `<span>${escapeHtml(st.test)}: p = ${escapeHtml(st.p_value)} <b class="${st.significant ? 'good' : 'bad'}">${st.significant ? 'significant' : 'not significant'}</b></span>` : ''}
      ${run.timeHorizon ? `<span>Horizon <b>${escapeHtml(run.timeHorizon)}</b></span>` : ''}
    </div>
    ${run.killSignal ? `<div class="kill"><strong>Kill signal:</strong> ${escapeHtml(run.killSignal)}</div>` : ''}
    <div class="actions">${artifactLinks(run)}</div>
    ${publishedBlock(run)}
    ${run.usage ? `<div class="usage">${fmtUsage(run.usage)}</div>` : ''}`;
  wireReveal(box);
}

function cls(v) { return v === 'Good' ? 'good' : v === 'Bad' ? 'bad' : 'okay'; }
function fmtUsage(u) {
  const k = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n || 0));
  return `${u.requests || 0} requests · ${k(u.input_tokens)} in / ${k(u.output_tokens)} out tokens · ${k(u.cache_read_input_tokens)} cached · ${u.web_searches || 0} searches · ${u.web_fetches || 0} fetches`;
}

// ---------- History (memory) ----------
let allHistory = [];
async function loadHistory() {
  allHistory = await api('/api/history');
  renderHistory();
}
function renderHistory() {
  const q = $('histSearch').value.trim().toUpperCase();
  const items = allHistory.filter(r => !q || r.ticker.includes(q));
  $('histCount').textContent = `(${allHistory.length})`;
  $('history').innerHTML = items.length ? items.map(r => {
    const recClass = 'b-' + (r.status === 'running' ? 'running' : r.status === 'error' ? 'error'
      : (r.recommendation || 'hold').toLowerCase().replace(/\s+/g, '-'));
    const recLabel = r.status === 'running' ? `Running · ${r.phase || ''}` : r.status === 'error' ? 'Error' : (r.recommendation || '—');
    return `<div class="hist-card">
      <div class="hist-top">
        <span class="hist-ticker">${escapeHtml(r.ticker)} <span class="muted small">${escapeHtml(r.category || '')}</span></span>
        <span class="badge ${recClass}">${escapeHtml(recLabel)}</span>
      </div>
      <div class="hist-q">${escapeHtml(r.question)}</div>
      <div class="hist-meta">${escapeHtml(r.methodologyName || 'Default')} · ${new Date(r.createdAt).toLocaleString()}${r.model ? ' · ' + escapeHtml(r.model) : ''}</div>
      ${r.status === 'complete' ? `<div class="hist-links">${artifactLinks(r, true)}</div>${publishedBlock(r)}` : ''}
      ${r.status === 'running' ? `<div class="hist-links"><a href="#" data-watch="${r.id}">Watch progress</a></div>` : ''}
      ${r.status === 'error' ? `<div class="hist-err">${escapeHtml(r.error || '')}</div>` : ''}
      <div class="hist-links"><a href="#" class="danger" data-delrun="${r.id}">Delete</a></div>
    </div>`;
  }).join('') : '<p class="muted">No research yet. Run your first above.</p>';
  wireReveal($('history'));
  $('history').querySelectorAll('[data-watch]').forEach(a => a.onclick = (e) => { e.preventDefault(); const r = allHistory.find(x => x.id === a.dataset.watch); openRunPanel(r.ticker); poll(r.id); });
  $('history').querySelectorAll('[data-delrun]').forEach(a => a.onclick = async (e) => {
    e.preventDefault();
    if (confirm('Delete this run and all its files?')) { await api('/api/run/' + a.dataset.delrun, { method: 'DELETE' }); loadHistory(); }
  });
}
$('histSearch').oninput = renderHistory;

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// init
loadConfig(); loadMethodologies(); loadHistory().then(() => {
  const running = allHistory.find(r => r.status === 'running');
  if (running) { openRunPanel(running.ticker); poll(running.id); }
});
