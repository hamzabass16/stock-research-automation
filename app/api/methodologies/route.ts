import { NextResponse } from 'next/server';
import * as db from '@/lib/db.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await db.listMethodologies());
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    let text = String(form.get('text') || '');
    let originalFilename: string | null = null;
    const file = form.get('file');
    if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as File).size > 0) {
      const f = file as File;
      originalFilename = f.name;
      const buf = Buffer.from(await f.arrayBuffer());
      if (f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf') {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: new Uint8Array(buf) });
        try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
      } else {
        text = buf.toString('utf8');
      }
    }
    if (!text.trim()) return NextResponse.json({ error: 'Provide methodology text, or upload a .pdf / .md / .txt file.' }, { status: 400 });
    const entry = await db.saveMethodology({ id: undefined, name: String(form.get('name') || ''), text, originalFilename, isDefault: form.get('isDefault') === 'true' });
    return NextResponse.json(entry);
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
