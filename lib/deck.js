// Builds the investment-committee pitch deck (.pptx) from the structured pitch
// Claude produced in Phase 4 (lib/prompts.js PITCH_SCHEMA). Follows the six-part
// format of Step 4 of the guide; speaker notes carry the talk track.
import pptxgen from 'pptxgenjs';

const NAVY = '1D325C';
const CREAM = 'FAF9F6';
const GREY = 'E6E8EB';
const WHITE = 'FFFFFF';
const GOOD = '4CAF50';
const OKAY = 'FFC107';
const BAD = 'F44336';
const FONT = 'Calibri';

function recColor(rec) {
  if (/strong buy|^buy$/i.test(rec || '')) return GOOD;
  if (/avoid|sell/i.test(rec || '')) return BAD;
  return OKAY;
}

/**
 * @param {object} o
 * @param {string} o.ticker
 * @param {object} o.meta      Phase-4 JSON (company_name, recommendation, pitch_outline, ...)
 * @param {string} o.date      YYYY-MM-DD publish date
 * @param {string} o.preparedBy
 * @param {string} o.outFile   absolute .pptx path
 */
export async function buildDeck({ ticker, meta, date, preparedBy, outFile }) {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pptx.author = `${preparedBy} + Claude`;
  pptx.company = 'HCMP';
  pptx.title = `${meta.company_name || ticker} (${ticker}) — Investment Committee Pitch`;

  pptx.defineSlideMaster({
    title: 'BODY',
    background: { color: CREAM },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.12, fill: { color: NAVY } } },
      { text: { text: `${ticker} · Investment Committee Pitch · ${date}`, options: { x: 0.5, y: 7.0, w: 9, h: 0.35, fontSize: 10, color: '8A93A6', fontFace: FONT } } },
    ],
    slideNumber: { x: 12.3, y: 7.0, w: 0.6, h: 0.35, fontSize: 10, color: '8A93A6', fontFace: FONT },
  });

  const outline = Array.isArray(meta.pitch_outline) ? meta.pitch_outline : [];
  const [cover, ...sections] = outline.length ? outline : [{ title: `${ticker} — Investment Committee Pitch`, bullets: [] }];

  // ---- Cover ----
  {
    const s = pptx.addSlide();
    s.background = { color: NAVY };
    s.addText(`${meta.company_name || ticker}`, { x: 0.7, y: 1.4, w: 12, h: 1.1, fontSize: 40, bold: true, color: WHITE, fontFace: FONT });
    s.addText(`${ticker}  ·  Investment Committee Pitch`, { x: 0.7, y: 2.5, w: 12, h: 0.6, fontSize: 22, color: 'C9D1E3', fontFace: FONT });
    const hook = (cover.subtitle || (cover.bullets || [])[0] || meta.summary || '').toString();
    if (hook) s.addText(hook, { x: 0.7, y: 3.4, w: 11.8, h: 1.4, fontSize: 16, color: WHITE, fontFace: FONT, valign: 'top', fit: 'shrink' });
    s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 5.1, w: 3.2, h: 0.6, fill: { color: recColor(meta.recommendation) }, line: { color: recColor(meta.recommendation) }, rectRadius: 0.1 });
    s.addText(meta.recommendation || '—', { x: 0.7, y: 5.1, w: 3.2, h: 0.6, fontSize: 16, bold: true, color: WHITE, align: 'center', fontFace: FONT });
    s.addText(`${meta.category || ''}${meta.time_horizon ? '   ·   Horizon: ' + meta.time_horizon : ''}`, { x: 4.1, y: 5.1, w: 8.5, h: 0.6, fontSize: 14, color: 'C9D1E3', fontFace: FONT, valign: 'middle' });
    s.addText(`Prepared by ${preparedBy} + Claude  ·  ${date}`, { x: 0.7, y: 6.6, w: 12, h: 0.4, fontSize: 11, color: '8A93A6', fontFace: FONT });
    if (cover.notes) s.addNotes(cover.notes);
  }

  // ---- Six sections ----
  for (const sec of sections) {
    const s = pptx.addSlide({ masterName: 'BODY' });
    s.addText(sec.title || '', { x: 0.5, y: 0.35, w: 12.3, h: 0.8, fontSize: 28, bold: true, color: NAVY, fontFace: FONT, fit: 'shrink' });
    let y = 1.2;
    if (sec.subtitle) {
      s.addText(sec.subtitle, { x: 0.5, y, w: 12.3, h: 0.6, fontSize: 15, italic: true, color: '4A5468', fontFace: FONT, fit: 'shrink' });
      y += 0.65;
    }
    const stats = Array.isArray(sec.stats) ? sec.stats.filter(t => t && t.value).slice(0, 4) : [];
    const bulletsW = stats.length ? 7.6 : 12.3;
    const bullets = (sec.bullets || []).map(b => ({ text: String(b), options: { bullet: { indent: 18 }, breakLine: true } }));
    if (bullets.length) {
      s.addText(bullets, { x: 0.5, y, w: bulletsW, h: 6.6 - y, fontSize: 15, color: NAVY, fontFace: FONT, valign: 'top', paraSpaceAfter: 8, fit: 'shrink' });
    }
    if (stats.length) {
      const tileW = 2.1, tileH = 1.35, gap = 0.2, x0 = 8.4;
      stats.forEach((t, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = x0 + col * (tileW + gap), ty = y + row * (tileH + gap);
        s.addShape(pptx.ShapeType.roundRect, { x, y: ty, w: tileW, h: tileH, fill: { color: WHITE }, line: { color: GREY, width: 1 }, rectRadius: 0.08 });
        s.addText(String(t.value), { x, y: ty + 0.1, w: tileW, h: 0.7, fontSize: 22, bold: true, color: NAVY, align: 'center', fontFace: FONT, fit: 'shrink' });
        s.addText(String(t.label || ''), { x, y: ty + 0.8, w: tileW, h: 0.5, fontSize: 10, color: '5A6478', align: 'center', fontFace: FONT, fit: 'shrink' });
      });
    }
    if (sec.notes) s.addNotes(sec.notes);
  }

  // ---- Closing: recommendation, bottom line, kill signal ----
  {
    const s = pptx.addSlide({ masterName: 'BODY' });
    s.addText('The Bottom Line', { x: 0.5, y: 0.35, w: 12.3, h: 0.8, fontSize: 28, bold: true, color: NAVY, fontFace: FONT });
    s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.3, w: 3.4, h: 0.7, fill: { color: recColor(meta.recommendation) }, line: { color: recColor(meta.recommendation) }, rectRadius: 0.1 });
    s.addText(meta.recommendation || '—', { x: 0.5, y: 1.3, w: 3.4, h: 0.7, fontSize: 20, bold: true, color: WHITE, align: 'center', fontFace: FONT });
    s.addText(`${meta.category || ''}${meta.time_horizon ? '  ·  ' + meta.time_horizon : ''}`, { x: 4.1, y: 1.3, w: 8.7, h: 0.7, fontSize: 15, color: '4A5468', fontFace: FONT, valign: 'middle' });
    s.addText(meta.summary || '', { x: 0.5, y: 2.3, w: 12.3, h: 1.6, fontSize: 17, color: NAVY, fontFace: FONT, valign: 'top', fit: 'shrink' });
    const iv = meta.intrinsic_value || {};
    const rows = [
      [{ text: 'Price', options: { bold: true, fill: { color: GREY } } }, { text: 'Conservative', options: { bold: true, fill: { color: GREY } } }, { text: 'Base', options: { bold: true, fill: { color: GREY } } }, { text: 'Optimistic', options: { bold: true, fill: { color: GREY } } }],
      [meta.price || '—', iv.conservative || '—', iv.base || '—', iv.optimistic || '—'],
    ];
    s.addTable(rows, { x: 0.5, y: 4.0, w: 7.5, colW: [1.6, 2, 1.9, 2], fontSize: 13, fontFace: FONT, color: NAVY, border: { type: 'solid', color: 'DCDCDC', pt: 1 }, align: 'center' });
    const st = meta.statistical || {};
    if (st.test) {
      s.addText(`${st.test}: ${st.test_statistic || ''}  ·  p = ${st.p_value || 'n/a'}  ·  ${st.significant ? 'significant' : 'not significant'} at α = 0.05  ·  ${st.n_and_timeframe || ''}`,
        { x: 0.5, y: 5.1, w: 12.3, h: 0.5, fontSize: 12, color: '4A5468', fontFace: FONT, fit: 'shrink' });
    }
    s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 5.7, w: 12.3, h: 1.0, fill: { color: 'FFF7E6' }, line: { color: 'F0D89A', width: 1 }, rectRadius: 0.08 });
    s.addText([{ text: 'Kill signal: ', options: { bold: true } }, { text: meta.kill_signal || '' }],
      { x: 0.7, y: 5.75, w: 11.9, h: 0.9, fontSize: 13, color: NAVY, fontFace: FONT, valign: 'middle', fit: 'shrink' });
    s.addNotes(meta.pitch_script ? meta.pitch_script.slice(-1500) : '');
  }

  // ---- Appendix: committee Q&A ----
  const qa = Array.isArray(meta.committee_qa) ? meta.committee_qa : [];
  for (let i = 0; i < qa.length; i += 4) {
    const s = pptx.addSlide({ masterName: 'BODY' });
    s.addText(`Appendix — Committee Q&A (${i / 4 + 1})`, { x: 0.5, y: 0.35, w: 12.3, h: 0.8, fontSize: 24, bold: true, color: NAVY, fontFace: FONT });
    const items = qa.slice(i, i + 4).flatMap((q, j) => [
      { text: `Q${i + j + 1}. ${q.question}`, options: { bold: true, breakLine: true, color: NAVY } },
      { text: q.answer, options: { breakLine: true, color: '4A5468', paraSpaceAfter: 10 } },
    ]);
    s.addText(items, { x: 0.5, y: 1.2, w: 12.3, h: 5.6, fontSize: 12, fontFace: FONT, valign: 'top', fit: 'shrink' });
  }

  await pptx.writeFile({ fileName: outFile });
  return outFile;
}
