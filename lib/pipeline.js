// The autonomous research pipeline — the guide's Steps 2 and 4 run end to end:
//   Phase 1  Deep research          (web_search + web_fetch + run_python)      -> research.md
//   Phase 2  Statistical validation (run_python on real price data, web_search) -> stats.md
//   Phase 3  Template fill          (the constant HTML template)               -> report.html
//   Phase 4  Verdict + pitch        (structured JSON: recommendation, deck, script, Q&A)
// Returns { bodyHtml, research, stats, meta, usage }.
import fs from 'fs';
import path from 'path';
import { callClaude, textOf, isLive, emptyUsage, addUsage, MODEL } from './claude.js';
import { runPython } from './python.js';
import { templateDocument, extractBody } from './template.js';
import { demoResult } from './demo.js';
import * as P from './prompts.js';

const MAX_TURNS = Number(process.env.MAX_TURNS || 40);
const PREPARED_BY = process.env.PREPARED_BY || 'Analyst';

const WEB_SEARCH = { type: 'web_search_20260209', name: 'web_search', max_uses: Number(process.env.MAX_WEB_SEARCHES || 40) };
const WEB_FETCH = { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: Number(process.env.MAX_WEB_FETCHES || 25), max_content_tokens: 60000 };
const RUN_PYTHON = {
  name: 'run_python',
  description: 'Run a Python 3 script locally and return its stdout/stderr. numpy, pandas, scipy, statsmodels, yfinance and matplotlib are installed. '
    + 'Each call is a fresh interpreter process: nothing persists between calls, so re-import modules and re-create any variables or data you need '
    + '(save intermediate data to CSV in the working directory if you want to reuse it). The working directory is the run folder; files you save '
    + 'there (e.g. charts as PNG) are kept with the report. Print everything you need to read.',
  input_schema: {
    type: 'object',
    properties: { code: { type: 'string', description: 'The complete Python source to execute.' } },
    required: ['code'],
    additionalProperties: false,
  },
  // Large scripts stream as they are generated; the input is validated client-side before running.
  eager_input_streaming: true,
};

function today() { return new Date().toISOString().slice(0, 10); }

/**
 * Agentic loop for one phase: handles client tools (run_python), server-tool
 * pause_turn resumption, and max_tokens continuation. Returns the final text.
 */
function minutesLeft(deadline) { return deadline ? (deadline - Date.now()) / 60000 : Infinity; }

async function agentLoop({ system, userText, tools, maxTokens, runDir, step, usage, label, onText, deadline, wrapUpMinutes = 7 }) {
  const messages = [{ role: 'user', content: userText }];
  let pyRuns = 0;
  let wrappedUp = false;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const left = minutesLeft(deadline);
    if (left < 1.5) throw new Error(`${label}: run time budget exhausted before the deliverable was finished.`);
    if (!wrappedUp && left < wrapUpMinutes) {
      wrappedUp = true;
      step(`${label}: ${Math.floor(left)} min of budget left — asking the model to finalise now.`);
      messages.push({ role: 'user', content: `TIME BUDGET: fewer than ${Math.ceil(left)} minutes remain. Stop researching and write the COMPLETE final deliverable now with the information you already have, marking anything not obtained as "n/a (not obtained)".` });
    }
    const msg = await callClaude({
      system, messages, tools, maxTokens, onText,
      onTool: (name) => {
        if (name === 'web_search') step(`${label}: searching the web...`);
        else if (name === 'web_fetch') step(`${label}: reading a source...`);
        else if (name === 'run_python') step(`${label}: running Python...`);
      },
    });
    addUsage(usage, msg.usage);
    messages.push({ role: 'assistant', content: msg.content });

    if (msg.stop_reason === 'pause_turn') { step(`${label}: continuing server-side research...`); continue; }

    if (msg.stop_reason === 'tool_use') {
      const uses = msg.content.filter(b => b.type === 'tool_use');
      if (!uses.length) continue;
      const results = uses.map(tu => {
        if (tu.name !== 'run_python') return { type: 'tool_result', tool_use_id: tu.id, is_error: true, content: `Unknown tool ${tu.name}` };
        const code = tu.input && typeof tu.input.code === 'string' ? tu.input.code : null;
        if (code === null) return { type: 'tool_result', tool_use_id: tu.id, is_error: true, content: JSON.stringify({ INVALID_JSON: JSON.stringify(tu.input) }) };
        pyRuns++;
        const out = runPython(code, { cwd: runDir });
        try { fs.appendFileSync(path.join(runDir, `python_log.md`), `\n\n## ${label} — run ${pyRuns}\n\n\`\`\`python\n${code}\n\`\`\`\n\nOutput:\n\n\`\`\`\n${out}\n\`\`\`\n`); } catch {}
        return { type: 'tool_result', tool_use_id: tu.id, content: out };
      });
      messages.push({ role: 'user', content: results });
      continue;
    }

    if (msg.stop_reason === 'max_tokens') {
      step(`${label}: output hit the token limit, asking the model to continue...`);
      messages.push({ role: 'user', content: 'Your previous message was cut off by the token limit. Continue exactly where you stopped, without repeating anything.' });
      continue;
    }

    // end_turn (or any other terminal reason): collect all text from the trailing assistant turns.
    return collectTrailingText(messages);
  }
  throw new Error(`${label} exceeded ${MAX_TURNS} turns without finishing.`);
}

// Joins the text of consecutive final assistant messages (handles max_tokens continuations).
function collectTrailingText(messages) {
  const parts = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'assistant') { parts.unshift(textOf(m)); continue; }
    if (typeof m.content === 'string' && m.content.startsWith('Your previous message was cut off')) continue;
    break;
  }
  return parts.join('').trim();
}

// Phase 3 can be long; stream the HTML and continue if it hits max_tokens.
async function fillTemplate({ system, userText, step, usage, onText }) {
  const messages = [{ role: 'user', content: userText }];
  let html = '';
  for (let i = 0; i < 4; i++) {
    const msg = await callClaude({ system, messages, maxTokens: 64000, onText });
    addUsage(usage, msg.usage);
    html += textOf(msg);
    if (msg.stop_reason !== 'max_tokens') break;
    step('Filling template: output hit the token limit, continuing...');
    messages.push({ role: 'assistant', content: msg.content });
    messages.push({ role: 'user', content: P.CONTINUE_HTML });
  }
  return html.replace(/^\s*```(?:html)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

export async function runPipeline({ ticker, question, methodologyText, runDir, onStep, onLog, deadline = null }) {
  const step = (s) => { try { onStep && onStep(s); } catch {} };
  const log = (phase) => (t) => { try { onLog && onLog(phase, t); } catch {} };
  fs.mkdirSync(runDir, { recursive: true });

  if (!isLive()) {
    step('Demo mode — generating sample result (no API key / DEMO_MODE=true)');
    const r = demoResult({ ticker, question, preparedBy: PREPARED_BY });
    fs.writeFileSync(path.join(runDir, 'research.md'), r.research);
    fs.writeFileSync(path.join(runDir, 'stats.md'), r.stats);
    return r;
  }

  const usage = emptyUsage();
  const ctx = { methodologyText, today: today(), preparedBy: PREPARED_BY };

  // ---- Phase 1: deep research ----
  step(`Phase 1/4 — Deep research with ${MODEL} (web search, filings, sentiment, DCF inputs)...`);
  // Reserve time for the later phases (stats ~6 min, fill ~7, pitch ~2).
  const researchDeadline = deadline ? deadline - 17 * 60000 : null;
  const research = await agentLoop({
    label: 'Research', system: P.researchSystem(ctx), userText: P.researchUser({ ticker, question }),
    tools: [WEB_SEARCH, WEB_FETCH, RUN_PYTHON], maxTokens: 48000, runDir, step, usage, onText: log('research'),
    deadline: researchDeadline, wrapUpMinutes: 6,
  });
  if (research.length < 2000) throw new Error('Research phase returned too little content.');
  fs.writeFileSync(path.join(runDir, 'research.md'), research);
  step(`Research dossier saved (${research.length.toLocaleString()} chars).`);

  // ---- Phase 2: statistical validation ----
  step('Phase 2/4 — Statistical validation: designing and running the hypothesis test on real price data...');
  let stats;
  if (minutesLeft(deadline) < 12) {
    stats = '# Key Research Question & Statistical Validation\n\nStatistical validation was skipped: the run time budget did not leave enough time to run the hypothesis test. Re-run with a larger budget (RUN_BUDGET_MINUTES) or a Pro sandbox to include it.';
    step('Statistics: skipped — not enough run budget left.');
  } else {
    stats = await agentLoop({
      label: 'Statistics', system: P.statsSystem(ctx), userText: P.statsUser({ ticker, question, researchMarkdown: research }),
      tools: [WEB_SEARCH, RUN_PYTHON], maxTokens: 24000, runDir, step, usage, onText: log('stats'),
      deadline: deadline ? deadline - 10 * 60000 : null, wrapUpMinutes: 4,
    });
  }
  fs.writeFileSync(path.join(runDir, 'stats.md'), stats);
  step('Statistical validation saved.');

  // ---- Phase 3: fill the constant template ----
  step('Phase 3/4 — Filling the standardized Stock Analysis Template...');
  const html = await fillTemplate({
    system: P.fillSystem({ templateHtml: templateDocument(), today: ctx.today, preparedBy: PREPARED_BY }),
    userText: P.fillUser({ ticker, question, researchMarkdown: research, statsMarkdown: stats }),
    step, usage, onText: log('fill'),
  });
  const bodyHtml = extractBody(html);
  if (!/Final Recommendation/i.test(bodyHtml) || !/Bibliography/i.test(bodyHtml)) {
    throw new Error('The filled template is incomplete (missing Final Recommendation or Bibliography).');
  }
  step('Report HTML assembled.');

  // ---- Phase 4: verdict + pitch (structured output) ----
  step('Phase 4/4 — Extracting the verdict and building the investment-committee pitch...');
  const reportText = htmlToText(bodyHtml);
  const pitchMsg = await callClaude({
    system: P.pitchSystem(ctx),
    messages: [{ role: 'user', content: P.pitchUser({ ticker, question, reportText }) }],
    maxTokens: 24000,
    format: { type: 'json_schema', schema: P.PITCH_SCHEMA },
    onText: log('pitch'),
  });
  addUsage(usage, pitchMsg.usage);
  let meta;
  try { meta = JSON.parse(textOf(pitchMsg)); }
  catch (e) { throw new Error(`Could not parse the pitch JSON: ${e.message}`); }

  return { bodyHtml, research, stats, meta, usage };
}

// Crude but adequate HTML -> text for feeding the report back to the model.
export function htmlToText(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section|ul)>/gi, '\n')
    .replace(/<\/t[hd]>/gi, ' | ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Markdown document of the pitch artefacts (deck outline, script, Q&A).
export function pitchMarkdown({ ticker, meta }) {
  const outline = (meta.pitch_outline || []).map(s => `## ${s.title}\n\n${s.subtitle ? `*${s.subtitle}*\n\n` : ''}${(s.bullets || []).map(b => `- ${b}`).join('\n')}${(s.stats || []).length ? '\n\n' + s.stats.map(t => `**${t.value}** ${t.label}`).join(' · ') : ''}${s.notes ? `\n\n> Speaker notes: ${s.notes}` : ''}`).join('\n\n---\n\n');
  const qa = (meta.committee_qa || []).map((q, i) => `**Q${i + 1}. ${q.question}**\n\n${q.answer}`).join('\n\n');
  return `# ${ticker} — Investment Committee Pitch\n\n`
    + `**Recommendation:** ${meta.recommendation}  \n**Archetype:** ${meta.category}  \n**Time horizon:** ${meta.time_horizon}  \n**Kill signal:** ${meta.kill_signal}\n\n`
    + `**Bottom line:** ${meta.summary}\n\n`
    + `# Deck outline\n\n${outline}\n\n`
    + `# 5–7 minute pitch script\n\n${meta.pitch_script || ''}\n\n`
    + `# Committee Q&A prep\n\n${qa}\n`;
}
