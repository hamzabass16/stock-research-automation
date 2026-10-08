// Minimal Markdown -> HTML (headings, lists, tables, code, bold/italic, links)
// for viewing the research dossier, statistics and pitch artefacts in the browser.
export function markdownToHtml(md, title = 'Document') {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let list = null; // 'ul' | 'ol'
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  while (i < lines.length) {
    let line = lines[i];

    if (/^```/.test(line)) {
      closeList();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      closeList();
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(splitRow(lines[i++]));
      out.push('<table><tr>' + header.map(h => `<th>${inline(h)}</th>`).join('') + '</tr>'
        + rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</table>');
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { closeList(); out.push('<hr>'); i++; continue; }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
      i++; continue;
    }
    if (!line.trim()) { closeList(); i++; continue; }
    closeList();
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*[-*+]\s|\s*\d+[.)]\s|\s*\|)/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  closeList();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
<style>
body{font-family:'Space Grotesk',sans-serif;margin:40px auto;max-width:1000px;background:#faf9f6;color:#1d325c;line-height:1.6;padding:0 20px}
h1{font-size:36px;border-bottom:4px solid #1d325c;padding-bottom:8px}h2{font-size:26px;margin-top:40px}h3{font-size:19px}
table{width:100%;border-collapse:collapse;margin:16px 0;background:#fff}th,td{border:1px solid #dcdcdc;padding:8px 12px;text-align:left;vertical-align:top;font-size:14px}th{background:#e6e8eb}
pre{background:#1d325c;color:#f3f4f8;padding:14px;border-radius:8px;overflow:auto;font-size:13px}code{font-family:ui-monospace,Menlo,monospace}
p code,li code{background:#e6e8eb;color:#1d325c;padding:1px 5px;border-radius:4px}a{color:#0066cc}hr{border:none;border-top:2px solid #dcdcdc;margin:30px 0}
</style></head><body>${out.join('\n')}</body></html>`;
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function inline(s) {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  return t;
}
