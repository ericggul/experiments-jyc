import type { Definition, Rect } from '../control/definition.ts';
import type { Display, PlanItem } from '../surfaces/index.ts';

// Browser windows, for pages opened where no Mac helper answers: the same
// definition and plan, opened as pop-up windows by this page. Pop-ups keep a
// slim address bar, newest is always in front, and a browser lets one pop-up
// through per click unless pop-ups are allowed for the site.

export type BrowserStatus = {
  enabled: true;
  running: boolean;
  moving: boolean;
  message: string;
  display: Display;
  open: number;
  progress: number;
  total: number;
  settings?: unknown;
  result?: { opened: number; failed: number; spreadMs: number; resized: number };
};

type Screenish = Screen & { availLeft?: number; availTop?: number };

/** This screen in window coordinates; browsers report it without a permission prompt. */
export function measureBrowserDisplay(): Display {
  const screen = window.screen as Screenish;
  return {
    width: screen.width,
    height: screen.height,
    visible: { x: screen.availLeft ?? 0, y: screen.availTop ?? 0, width: screen.availWidth, height: screen.availHeight },
    scale: window.devicePixelRatio || 1,
    measuredAt: Date.now(),
  };
}

const opened: Window[] = [];
const timers = new Set<ReturnType<typeof setTimeout>>();
let animation: (() => void) | null = null;
let status: Omit<BrowserStatus, 'display' | 'open'> & { display?: Display } = { enabled: true, running: false, moving: false, message: 'Browser windows', progress: 0, total: 0 };
const listeners = new Set<() => void>();
const changed = () => listeners.forEach(listener => listener());

export function browserStatus(): BrowserStatus {
  for (let i = opened.length - 1; i >= 0; i--) if (opened[i].closed) opened.splice(i, 1);
  return { ...status, display: status.display ?? measureBrowserDisplay(), open: opened.length };
}

export function subscribeBrowser(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function paint(target: Window, color: string) {
  // A data URL cannot be opened as a top-level page, so a blank pop-up is painted instead.
  const doc = target.document;
  doc.title = '​';
  doc.body.style.cssText = `margin:0;height:100vh;background:${color}`;
  doc.documentElement.style.background = color;
}

function place(target: Window, rect: Rect) {
  try {
    target.moveTo(Math.round(rect.x), Math.round(rect.y));
    target.resizeTo(Math.round(rect.width), Math.round(rect.height));
  } catch { /* Closed, or the browser refuses to move it. */ }
}

function openOne(item: PlanItem, run: string) {
  const features = `popup,left=${Math.round(item.x)},top=${Math.round(item.y)},width=${Math.round(item.width)},height=${Math.round(item.height)}`;
  const target = window.open(item.url ?? 'about:blank', `scc-desktop-collage-${run}-${opened.length}`, features);
  if (!target) return null;
  if (!item.url) paint(target, item.color);
  place(target, item);
  opened.push(target);
  return target;
}

function stopAll() {
  animation?.();
  animation = null;
  timers.forEach(clearTimeout);
  timers.clear();
  status = { ...status, running: false, moving: false };
}

export function clearBrowser() {
  stopAll();
  const count = opened.filter(target => !target.closed).length;
  opened.splice(0).forEach(target => { try { target.close(); } catch { /* Already gone. */ } });
  status = { ...status, message: `Cleared ${count} windows` };
  changed();
}

export function stopBrowser() {
  stopAll();
  status = { ...status, message: 'Stopped' };
  changed();
}

export function measureBrowser() {
  status = { ...status, display: measureBrowserDisplay() };
  changed();
}

/**
 * Starts a run. Must be called synchronously from the click that asked for it:
 * the first window opens before anything else, while the click still counts.
 */
export function startBrowser<S extends { clearFirst: boolean }>(definition: Definition<S>, input: unknown) {
  const settings = definition.validate(input);
  if (settings.clearFirst) { opened.splice(0).forEach(target => { try { target.close(); } catch { /* Already gone. */ } }); }
  stopAll();
  const display = measureBrowserDisplay();
  const plan = definition.plan(settings, display, window.location.origin);
  const started = performance.now();
  const run = Date.now().toString(36);
  let failed = 0;
  const mine: (Window | null)[] = [];
  status = { ...status, running: true, display, settings, progress: 0, total: plan.items.length, result: undefined, message: `Opening ${plan.items.length} windows` };
  const finish = () => {
    const blocked = failed ? ' · allow pop-ups for this site to open them all' : '';
    status = { ...status, running: false, progress: plan.items.length, result: { opened: plan.items.length - failed, failed, spreadMs: Math.round(performance.now() - started), resized: 0 }, message: (failed ? 'Some windows did not open' : 'Done') + blocked };
    if (definition.animate) {
      animation = definition.animate(settings, plan, display, (index, rect) => { const target = mine[index]; if (target && !target.closed) place(target, rect); });
      status = { ...status, moving: !!animation };
    }
    changed();
  };
  const at = (index: number) => {
    const target = openOne(plan.items[index], run);
    mine[index] = target;
    if (!target) failed++;
    status = { ...status, progress: index + 1 };
    changed();
    if (index + 1 >= plan.items.length) { finish(); return; }
    if (plan.intervalMs <= 0) { at(index + 1); return; }
    const timer = setTimeout(() => { timers.delete(timer); at(index + 1); }, plan.intervalMs);
    timers.add(timer);
  };
  if (plan.items.length) at(0); else finish();
}
