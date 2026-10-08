import { templateDocument } from '@/lib/template.js';
export const dynamic = 'force-dynamic';
export async function GET() {
  return new Response(templateDocument(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
