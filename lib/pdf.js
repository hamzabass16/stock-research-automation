// HTML -> PDF. Uses Puppeteer if installed (best fidelity). If not, the HTML is
// still always saved and downloadable; this just reports that PDF is unavailable.
import path from 'path';

export async function htmlToPdf(html, outPath) {
  let puppeteer;
  try { puppeteer = (await import('puppeteer')).default; }
  catch { return { ok: false, reason: 'puppeteer-not-installed' }; }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '12mm', right: '12mm' },
    });
    return { ok: true, file: path.basename(outPath) };
  } finally {
    await browser.close();
  }
}
