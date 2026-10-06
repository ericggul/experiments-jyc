import { measureDisplay } from '../display/index.ts';
import type { Display, Outcome, Plan } from '../surfaces/index.ts';
import type { Definition, Rect } from './definition.ts';
import { clearAll, openPlan, type Opened, type Session } from './run.ts';

// Control of desktop-collage windows on this Mac, whoever calls it: the Next
// route on the local development server or the Mac helper serving any origin.
// One run at a time; everything a run opens can be cleared with one action.

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

export const onMac = () => process.platform === 'darwin';

export type Reply = { status: number; body: Record<string, unknown> };

export function statusOf(enabled: boolean, status = 200): Reply {
  return {
    status,
    body: {
      enabled,
      running: !!state.running,
      moving: !!state.animation,
      message: state.message,
      display: state.display,
      open: state.opened.terminal.length + state.held,
      progress: state.progress,
      total: state.total,
      result: state.result,
      settings: state.settings,
    },
  };
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

/** Performs one control action; `origin` is the controlling page's origin. */
export async function act<S extends { clearFirst: boolean }>(definition: Definition<S>, body: { action?: unknown; settings?: unknown }, origin: string): Promise<Reply> {
  try {
    if (body.action === 'measure') { state.display = await measureDisplay(); return statusOf(true); }
    if (body.action === 'stop') { stopAll(); state.message = 'Stopped'; return statusOf(true); }
    if (body.action === 'clear') {
      stopAll();
      state.message = `Cleared ${await clear()} windows`;
      return statusOf(true);
    }
    if (state.running) return statusOf(true, 409);
    if (body.action !== 'start') return { status: 400, body: { message: 'Unknown action.' } };
    const settings = definition.validate(body.settings);
    state.animation?.(); state.animation = null;
    if (settings.clearFirst) await clear();
    // The display is measured again for every run; the layout always fits now.
    const display = await measureDisplay();
    state.display = display;
    state.settings = settings;
    const planned = definition.plan(settings, display, origin);
    const { animate } = definition;
    start(planned, display, animate && (move => animate(settings, planned, display, move) ?? (() => {})));
    return statusOf(true, 202);
  } catch (error) {
    state.message = (error as Error).message.slice(0, 300);
    return { status: 400, body: { message: state.message } };
  }
}
