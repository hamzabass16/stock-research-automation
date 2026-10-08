// Realistic mock output so the entire UI is clickable before any API keys exist.
// Mirrors the shape returned by the real pipeline (lib/pipeline.js).
import { TEMPLATE_BODY } from './template.js';

export function demoResult({ ticker, question, preparedBy }) {
  const T = String(ticker || 'DEMO').toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const body = TEMPLATE_BODY
    .replace('Company Name', `${T} (DEMO — no API key configured)`)
    .replace('&#x1F4C5; Date', `&#x1F4C5; ${today}`)
    .replace('&#x1F464; Person', `&#x1F464; ${preparedBy || 'Analyst'} + Claude (demo)`)
    .replace('<h2 style="border:none;">What is the investment thesis?</h2>\n        <p></p>',
      `<h2 style="border:none;">What is the investment thesis?</h2>\n        <p>${escapeHtml(question || 'Demo thesis question.')}</p>`)
    .replace('[Insert the specific research question driving this analysis. Ex: "Does a 10% increase in Capex historically lead to an expansion in valuation multiples within 12 months?"]',
      escapeHtml(question || 'Demo research question.'));

  const research = `# ${T} — Deep Research Notes (DEMO)\n\nThis is a demo run. Add ANTHROPIC_API_KEY to .env and set DEMO_MODE=false to run live research with web search, SEC filings, Reddit/Glassdoor sentiment, a 3-case DCF and a real hypothesis test.\n\nResearch question: ${question}`;
  const stats = `# Statistical Validation (DEMO)\n\nThe live pipeline runs a real hypothesis test in Python (t-test / OLS on abnormal returns) and reports the t-statistic, p-value, R², n and timeframe with every derivation step shown.`;
  const meta = {
    recommendation: 'Hold',
    category: 'Compounding Machine',
    summary: `DEMO result for ${T}. Add your Anthropic API key and set DEMO_MODE=false to run a live, sourced analysis with statistical validation and a real DCF.`,
    conclusion: { business: 'Okay', operations: 'Okay', valuation: 'Okay' },
    classification_test: { thresholds_measurable: 7, thresholds_passed: 4, disruption_engine: false, note: 'Demo values.' },
    kill_signal: 'Demo: the one red flag that would force an immediate exit.',
    time_horizon: '12 months',
    statistical: { test: 'OLS regression (demo)', test_statistic: 'n/a', p_value: 'n/a', significant: false, n_and_timeframe: 'n/a' },
    price: '$—', intrinsic_value: { conservative: '$—', base: '$—', optimistic: '$—' },
    pitch_outline: [
      { title: `${T} — Investment Committee Pitch`, subtitle: 'Demo deck. Live runs follow the 6-part pitch format from the guide.', bullets: [], stats: [], notes: 'Demo speaker notes.' },
      { title: '1. Executive Summary & The Hook', subtitle: 'What they do best, the archetype, the thesis and why now.', bullets: ['What they do best', 'Archetype + proof metrics', 'The thesis / why now', 'Time horizon'], stats: [{ label: 'Revenue growth (YoY)', value: '—%' }, { label: 'ROIC', value: '—%' }], notes: 'Demo speaker notes.' },
      { title: '2. Business Quality & Moat Defense', subtitle: 'The primary moat and whether the data agrees.', bullets: ['Primary moat pillar', 'Proof of quality metrics'], stats: [], notes: 'Demo speaker notes.' },
      { title: '3. Statistical Validation of the Thesis', subtitle: 'Does history say the thesis moves this stock?', bullets: ['Test, t-stat, p-value, n'], stats: [{ label: 'p-value', value: 'n/a' }], notes: 'Demo speaker notes.' },
      { title: '4. Valuation', subtitle: 'Is this a good deal right now?', bullets: ['Appropriate metric for maturity stage', 'Historical range', 'DCF bear / base / bull'], stats: [], notes: 'Demo speaker notes.' },
      { title: '5. Risk & SWOT', subtitle: 'The kill signal and the catalysts.', bullets: ['The kill signal', 'Downside risks', 'Catalysts'], stats: [], notes: 'Demo speaker notes.' },
      { title: '6. Conclusion', subtitle: 'The bottom line and the asymmetric risk profile.', bullets: ['Bottom line + asymmetric risk profile'], stats: [], notes: 'Demo speaker notes.' },
    ],
    pitch_script: `# ${T} — 5–7 minute pitch script (DEMO)\n\nThe live run writes a full talk track here following the six-part structure in Step 4 of the guide.`,
    committee_qa: [
      { question: 'What is the one red flag that would make you exit?', answer: 'Demo answer.' },
      { question: 'What does employee sentiment on Glassdoor say?', answer: 'Demo answer.' },
    ],
  };
  return { bodyHtml: body, research, stats, meta, usage: { input_tokens: 0, output_tokens: 0 } };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
