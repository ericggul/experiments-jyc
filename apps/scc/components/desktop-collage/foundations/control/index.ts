import { act, onMac, statusOf } from './core.ts';
import type { Definition } from './definition.ts';

// Route-handler control on the local development server. Admission matches the
// Goldfishes desktop control: development on macOS, an approved local host,
// same-origin HTTPS and JSON. Pages served elsewhere use the Mac helper
// (../../helper) or, without it, browser windows.

const hosts = ['localhost', '127.0.0.1', '[::1]', 'macbook-air-5.local'];
const enabled = () => onMac() && process.env.NODE_ENV === 'development';

function local(request: Request) {
  try { return hosts.includes(new URL(`https://${request.headers.get('host')}`).hostname); } catch { return false; }
}

function admitted(request: Request) {
  return enabled()
    && local(request)
    && request.headers.get('origin') === `https://${request.headers.get('host')}`
    && request.headers.get('sec-fetch-site') === 'same-origin'
    && request.headers.get('content-type') === 'application/json';
}

const respond = ({ status, body }: { status: number; body: unknown }) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function routeControl<S extends { clearFirst: boolean }>(definition: Definition<S>) {
  function GET(request: Request) {
    // Elsewhere the route answers that it cannot run, so the page looks for the helper.
    return respond(statusOf(enabled() && local(request)));
  }

  async function POST(request: Request) {
    if (!admitted(request)) return respond({ status: 403, body: { message: 'Runs only from the local HTTPS development server on macOS.' } });
    let body: { action?: unknown; settings?: unknown };
    try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }
    return respond(await act(definition, body, `https://${request.headers.get('host')}`));
  }

  return { GET, POST };
}
