import { clearBare, openBare } from '../surfaces/bare/index.ts';
import { clearChromeApp, openChromeApp } from '../surfaces/chrome-app/index.ts';
import type { Display, Handlers, Plan } from '../surfaces/index.ts';
import { closeTerminal, openTerminal } from '../surfaces/terminal/index.ts';
import type { Acting } from './definition.ts';

// One entry point for every surface: open a plan, and clear everything a page
// has opened. Usable from a route handler or plain Node.

/** Windows opened through this module that need their IDs to be closed. */
export type Opened = { terminal: number[] };

export type Rect = { x: number; y: number; width: number; height: number };
/** A run in progress. `move` and the acting members exist where the surface supports them. */
export type Session = Acting & { stop: () => void; move?: (index: number, rect: Rect) => void };

export function openPlan(plan: Plan, display: Display, handlers: Handlers, opened: Opened): Session {
  if (plan.surface === 'bare') return openBare(plan, display, handlers);
  if (plan.surface === 'terminal') return openTerminal(plan, handlers, ids => { opened.terminal.push(...ids); });
  const launch = openChromeApp(plan, handlers);
  return { stop: launch.cancel, move: launch.move, opened: launch.opened, evaluate: launch.evaluate, scroll: launch.scroll, click: launch.click, close: launch.close, front: launch.front, dark: launch.dark, open: launch.open };
}

/** Closes every window on every surface; returns how many tracked Terminal windows closed. */
export async function clearAll(opened: Opened) {
  const ids = opened.terminal.splice(0);
  let closed = 0;
  try { closed = await closeTerminal(ids); } catch { /* Already closed or Terminal quit. */ }
  clearBare();
  clearChromeApp();
  return closed;
}
