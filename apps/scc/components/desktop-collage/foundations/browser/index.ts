import type { Acting, Definition, Rect } from '../control/definition.ts';
import type { Display, PlanItem } from '../surfaces/index.ts';

// Browser windows, for pages opened where no Mac helper answers: the same
// definition and plan, opened as pop-up windows by this page. Pop-ups keep a
// slim address bar, newest is always in front, and a browser lets one pop-up
// through per click unless pop-ups are allowed for the site. A pop-up can be
// read and scrolled only when it shows this page's own origin.

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

function sameOrigin(target: Window) {
  try { return target.location.origin === window.location.origin; } catch { return false; }
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
  const openedAt: number[] = [];
  const plannedAt = (index: number) => plan.items[index].at ?? index * plan.intervalMs;
  status = { ...status, running: true, display, settings, progress: 0, total: plan.items.length, result: undefined, message: `Opening ${plan.items.length} windows` };
  const live = (index: number) => { const target = mine[index]; return target && !target.closed ? target : null; };
  const acting: Acting = {
    opened: index => (live(index) ? openedAt[index] : undefined),
    evaluate: async (index, expression) => {
      const target = live(index);
      if (!target || !sameOrigin(target)) return undefined;
      return (target as Window & { eval: (code: string) => unknown }).eval(expression);
    },
    scroll: (index, dy) => { try { live(index)?.scrollBy({ top: dy, behavior: 'smooth' }); } catch { /* Another origin. */ } },
    close: index => { try { live(index)?.close(); } catch { /* Already gone. */ } },
    front: index => { try { live(index)?.focus(); } catch { /* Not allowed. */ } },
    open: item => {
      const target = openOne(item, run);
      mine.push(target);
      openedAt[mine.length - 1] = Date.now();
      return mine.length - 1;
    },
  };
  const finish = () => {
    const count = plan.items.length;
    // A browser lets one pop-up through per click; the rest need pop-ups allowed for this site.
    const message = failed
      ? `Opened ${count - failed} of ${count} · the browser blocked the rest. Allow pop-ups for ${window.location.host} (the blocked pop-up icon in the address bar → always allow), then open again.`
      : 'Done';
    status = { ...status, running: false, progress: count, result: { opened: count - failed, failed, spreadMs: Math.round(performance.now() - started), resized: 0 }, message };
    if (definition.animate) {
      animation = definition.animate(settings, plan, display, (index, rect) => { const target = mine[index]; if (target && !target.closed) place(target, rect); }, acting);
      status = { ...status, moving: !!animation };
    }
    changed();
  };
  const at = (index: number) => {
    const target = openOne(plan.items[index], run);
    mine[index] = target;
    if (target) openedAt[index] = Date.now();
    else failed++;
    status = { ...status, progress: index + 1 };
    changed();
    if (index + 1 >= plan.items.length) { finish(); return; }
    const delay = plannedAt(index + 1) - plannedAt(index);
    if (delay <= 0) { at(index + 1); return; }
    const timer = setTimeout(() => { timers.delete(timer); at(index + 1); }, delay);
    timers.add(timer);
  };
  if (plan.items.length) at(0); else finish();
}
