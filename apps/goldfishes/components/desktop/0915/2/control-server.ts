import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { validateSettings, type Settings } from './settings.ts';

type State = { child: ChildProcess | null; message: string; timeout?: ReturnType<typeof setTimeout>; settings?: Settings; progress?: number; errors?: { id: number; text: string }[]; lastAction?: string; elapsedMs?: number; targetMs?: number };
const shared = globalThis as typeof globalThis & { goldfishesDesktop?: State };
const state = shared.goldfishesDesktop ??= { child: null, message: '준비' };
const enabled = () => process.platform === 'darwin' && process.env.NODE_ENV === 'development';
function local(request: Request) {
  try {
    const host = request.headers.get('host');
    const url = new URL(`https://${host}`);
    return ['localhost', '127.0.0.1', '[::1]', 'macbook-air-5.local'].includes(url.hostname);
  } catch { return false; }
}
function reply(status = 200) {
  return Response.json({ enabled: enabled(), running: !!state.child, message: state.message, settings: state.settings, progress: state.progress ?? 0, errors: state.errors ?? [], lastAction: state.lastAction, elapsedMs: state.elapsedMs, targetMs: state.targetMs }, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function GET(request: Request) {
  if (!local(request)) return Response.json({ message: 'macbook-air-5.local 또는 localhost에서 열어주세요.' }, { status: 403 });
  return reply();
}
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!enabled() || !local(request) || origin !== `https://${request.headers.get('host')}` || request.headers.get('sec-fetch-site') !== 'same-origin' || request.headers.get('content-type') !== 'application/json') {
    return Response.json({ message: '로컬 HTTPS 실행 권한이 필요합니다.' }, { status: 403 });
  }
  let action: unknown;
  let input: unknown;
  try { const body = await request.json(); action = body.action; input = body.settings; } catch { return new Response(null, { status: 400 }); }
  if (action === 'stop') {
    if (state.child) {
      state.message = '중단 중…';
      state.child.kill('SIGTERM');
    }
    return reply();
  }
  if (action !== 'start') return new Response(null, { status: 400 });
  if (state.child) return reply(409);
  let settings: Settings;
  try { settings = validateSettings(input); } catch (error) { return Response.json({ message: (error as Error).message }, { status: 400 }); }
  const relative = 'components/desktop/0915/2/run-configured.mjs';
  const script = [path.resolve(process.cwd(), relative), path.resolve(process.cwd(), 'apps/goldfishes', relative)].find(existsSync);
  if (!script) return Response.json({ message: '로컬 실행 파일을 찾지 못했습니다.' }, { status: 503 });
  const child = spawn(process.execPath, ['--experimental-strip-types', script, JSON.stringify(settings)], { stdio: ['ignore', 'pipe', 'pipe'] });
  state.child = child;
  state.settings = settings;
  state.progress = 0;
  state.errors = [];
  state.lastAction = undefined;
  state.elapsedMs = undefined;
  state.targetMs = undefined;
  state.message = `${settings.countdown}초 후 준비 시작`;
  let failed = false;
  let stopped = false;
  let buffer = '';
  let errorId = 0;
  child.stdout?.on('data', chunk => {
    buffer += chunk.toString();
    const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.phase === 'error') { failed = true; state.errors = [...(state.errors ?? []), { id: errorId++, text: `${event.app ?? '실행'}: ${String(event.error).slice(0, 500)}` }].slice(-12); }
        if (state.message === '중단 중…') continue;
        if (event.phase === 'preparing') state.message = `${event.app} 준비 중`;
        if (event.phase === 'running') { state.message = '실행 중'; state.progress = event.index; state.lastAction = event.app; state.elapsedMs = event.elapsedMs; state.targetMs = event.targetMs; }
      } catch { /* Ignore non-protocol output. */ }
    }
  });
  child.stderr?.on('data', chunk => { console.error('[goldfishes desktop]', chunk.toString().slice(0, 1000)); });
  child.on('error', error => { failed = true; state.errors?.push({ id: errorId++, text: error.message }); });
  state.timeout = setTimeout(() => { stopped = true; child.kill('SIGTERM'); }, Math.min(900000, 90000 + settings.steps * settings.interval * 2000));
  child.on('close', code => {
    if (state.child !== child) return;
    clearTimeout(state.timeout);
    const requestedStop = state.message === '중단 중…';
    state.child = null;
    state.message = requestedStop || stopped ? '중단됨 · 창은 남아 있습니다.' : failed || code !== 0 ? '오류와 함께 종료됨' : '완료 · 창은 남아 있습니다.';
  });
  return reply(202);
}
