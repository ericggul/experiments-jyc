import { measureDisplay } from '../display/index.ts';
import type { Display, Outcome, Plan } from '../surfaces/index.ts';
import { clearAll, openPlan, type Opened, type Rect, type Session } from './run.ts';

// Route-handler control of desktop-collage windows on this Mac. Admission
// matches the Goldfishes desktop control: development on macOS, an approved
// local host, same-origin HTTPS and JSON. One run at a time; everything a run
// opens can be cleared with one action.

const hosts = ['localhost', '127.0.0.1', '[::1]', 'macbook-air-5.local'];
const enabled = () => process.platform === 'darwin' && process.env.NODE_ENV === 'development';

type State = {
  running: Session | null;
  /** Ongoing window motion after a run has opened its windows. */
  animation: (() => void) | null;
  message: string;
  display?: Display;
  opened: Opened;
  /** Windows held by bare hosts and the Chrome app instance. */
  held: number;
  progress: number;
  total: number;
  result?: Outcome;
  settings?: unknown;
};

// Survives dev-server module reloads so open windows stay clearable.
const shared = globalThis as typeof globalThis & { sccDesktopCollageV4?: State };
const state = shared.sccDesktopCollageV4 ??= { running: null, animation: null, message: 'Ready', opened: { terminal: [] }, held: 0, progress: 0, total: 0 };

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

function reply(status = 200) {
  return Response.json({
    enabled: enabled(),
    running: !!state.running,
    moving: !!state.animation,
    message: state.message,
    display: state.display,
    open: state.opened.terminal.length + state.held,
    progress: state.progress,
    total: state.total,
    result: state.result,
    settings: state.settings,
  }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function stopAll() {
  state.animation?.();
  state.animation = null;
  state.running?.stop();
  state.running = null;
}

async function clear() {
  const closed = (await clearAll(state.opened)) + state.held;
  state.held = 0;
  return closed;
}

function start(plan: Plan, display: Display, animate?: (move: (index: number, rect: Rect) => void) => () => void) {
  Object.assign(state, { progress: 0, total: plan.items.length, result: undefined, message: `Opening ${plan.items.length} windows` });
  if (plan.surface !== 'terminal') state.held += plan.items.length;
  const session = openPlan(plan, display, {
    progress: index => { state.progress = Math.max(state.progress, index + 1); },
    done: outcome => {
      state.running = null;
      state.result = outcome;
      state.progress = plan.items.length;
      state.message = outcome.failed ? 'Some windows did not open' : 'Done';
    },
    failed: message => { state.running = null; state.message = message; },
  }, state.opened);
  state.running = session;
  if (animate && session.move) state.animation = animate(session.move);
}

type Options<S> = {
  validate: (input: unknown) => S;
  /** `origin` is this server's address, for windows that load its pages. */
  plan: (settings: S, display: Display, origin: string) => Plan;
  /** Keeps moving the opened windows; returns a function that stops it. */
  animate?: (settings: S, plan: Plan, display: Display, move: (index: number, rect: Rect) => void) => (() => void) | null;
};

export function createDesktopCollageControl<S extends { clearFirst: boolean }>({ validate, plan, animate }: Options<S>) {
  function GET(request: Request) {
    if (!local(request)) return Response.json({ message: 'Open this page from macbook-air-5.local or localhost.' }, { status: 403 });
    return reply();
  }

  async function POST(request: Request) {
    if (!admitted(request)) return Response.json({ message: 'Runs only from the local HTTPS development server on macOS.' }, { status: 403 });
    let body: { action?: unknown; settings?: unknown };
    try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }
    try {
      if (body.action === 'measure') { state.display = await measureDisplay(); return reply(); }
      if (body.action === 'stop') { stopAll(); state.message = 'Stopped'; return reply(); }
      if (body.action === 'clear') {
        stopAll();
        state.message = `Cleared ${await clear()} windows`;
        return reply();
      }
      if (state.running) return reply(409);
      if (body.action !== 'start') return new Response(null, { status: 400 });
      const settings = validate(body.settings);
      state.animation?.(); state.animation = null;
      if (settings.clearFirst) await clear();
      // The display is measured again for every run; the layout always fits now.
      const display = await measureDisplay();
      state.display = display;
      state.settings = settings;
      const planned = plan(settings, display, `https://${request.headers.get('host')}`);
      start(planned, display, animate && (move => animate(settings, planned, display, move) ?? (() => {})));
      return reply(202);
    } catch (error) {
      state.message = (error as Error).message.slice(0, 300);
      return Response.json({ message: state.message }, { status: 400 });
    }
  }

  return { GET, POST };
}
