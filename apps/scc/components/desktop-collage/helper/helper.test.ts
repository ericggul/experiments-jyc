import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createHelper } from './index.ts';

const handle = createHelper(['https://scc-jyc.vercel.app']);

async function call(method: string, url: string, headers: Record<string, string>, body = '') {
  const request = Object.assign(Readable.from(body ? [Buffer.from(body)] : []), { method, url, headers }) as unknown as IncomingMessage;
  const reply = { status: 0, headers: {} as Record<string, string>, body: '' };
  const response = {
    headersSent: false,
    writeHead(status: number, headers: Record<string, string>) { reply.status = status; reply.headers = headers; return this; },
    end(text = '') { reply.body = text; },
  } as unknown as ServerResponse;
  await handle(request, response);
  return reply;
}

const path = '/desktop-collage/primitives/2/control';
const vercel = { origin: 'https://scc-jyc.vercel.app' };

test('answers approved origins only, and never shares a response with others', async () => {
  const denied = await call('GET', path, { origin: 'https://example.com' });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers['Access-Control-Allow-Origin'], undefined);
  assert.equal((await call('GET', path, {})).status, 403);
  const allowed = await call('GET', path, vercel);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers['Access-Control-Allow-Origin'], 'https://scc-jyc.vercel.app');
  assert.equal(JSON.parse(allowed.body).enabled, process.platform === 'darwin');
});

test('preflight allows a public page to reach loopback (Private Network Access)', async () => {
  const preflight = await call('OPTIONS', path, { ...vercel, 'access-control-request-private-network': 'true' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers['Access-Control-Allow-Private-Network'], 'true');
});

test('rejects unknown experiments, non-JSON and malformed bodies before acting', async () => {
  assert.equal((await call('GET', '/desktop-collage/primitives/9/control', vercel)).status, 404);
  if (process.platform !== 'darwin') return;
  assert.equal((await call('POST', path, { ...vercel, 'content-type': 'text/plain' }, '{}')).status, 415);
  assert.equal((await call('POST', path, { ...vercel, 'content-type': 'application/json' }, '{')).status, 400);
  assert.equal((await call('POST', path, { ...vercel, 'content-type': 'application/json' }, JSON.stringify({ action: 'nope' }))).status, 400);
});
