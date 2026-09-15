import * as first from '@/components/desktop/0915/1/control-server';
import * as second from '@/components/desktop/0915/2/control-server';
import * as third from '@/components/desktop/0915/3/control-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ date: string; version: string }> };
async function handler(request: Request, context: Context, method: 'GET' | 'POST') {
  const { date, version } = await context.params;
  const selected = date === '0915' ? version === '1' ? first : version === '2' ? second : version === '3' ? third : null : null;
  return selected ? selected[method](request) : new Response(null, { status: 404 });
}
export const GET = (request: Request, context: Context) => handler(request, context, 'GET');
export const POST = (request: Request, context: Context) => handler(request, context, 'POST');
