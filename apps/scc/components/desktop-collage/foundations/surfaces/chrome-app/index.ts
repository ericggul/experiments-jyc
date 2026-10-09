import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { colorPage } from '../../pages/index.ts';
import type { Handlers, Plan, PlanItem } from '../index.ts';
import { CHROME_APP, chromeAppArgs, chromeAppProfile, type ChromeAppWindow } from './args.ts';
import { connectDevtools, type Devtools, type TargetInfo } from './devtools.ts';
// Chrome app windows (`--app=URL`): no tabs, address bar or toolbar, only the
// native title bar. They run in a dedicated Chrome instance with its own
// throwaway profile, so the user's Chrome is never touched and quitting that
// instance closes every window it opened.
//
// Observed on this Mac (2026-10-05):
// - a fresh profile shows a modal "Welcome to Google Chrome" dialog that blocks
//   new windows, even with --no-first-run; a `First Run` marker file prevents it;
// - windows handed to a running instance ignore --window-position/--window-size
//   and all open at the first window's place;
// - macOS ignores activation requested by a background process.
// So windows are launched through LaunchServices (`open -n`, which may come to
// the front), and each is placed exactly through the instance's local DevTools
// endpoint once it appears. Stacking follows launch order (newest in front).
// The same endpoint reads, scrolls, clicks in and closes a window's page
// through that page's own DevTools session.

/** PID of the dedicated instance's browser process, if it is running. */
function instancePid() {
  // The pattern must not start with `-`, or pgrep reads it as an option.
  const found = spawnSync('/usr/bin/pgrep', ['-o', '-f', `MacOS/Google Chrome --user-data-dir=${chromeAppProfile()}`]).stdout?.toString().trim();
  return found ? Number(found) : undefined;
}

const ready = () => instancePid() !== undefined && existsSync(`${chromeAppProfile()}/SingletonSocket`) && existsSync(`${chromeAppProfile()}/DevToolsActivePort`);

function prepareProfile() {
  mkdirSync(chromeAppProfile(), { recursive: true });
  const marker = `${chromeAppProfile()}/First Run`;
  if (!existsSync(marker)) writeFileSync(marker, '');
  // A killed instance can leave its port file behind; never connect to a stale port.
  if (instancePid() === undefined) rmSync(`${chromeAppProfile()}/DevToolsActivePort`, { force: true });
}

function launch(window: ChromeAppWindow, sound: boolean) {
  const child = spawn('/usr/bin/open', ['-n', '-a', CHROME_APP, '--args', ...chromeAppArgs(window, sound)], { stdio: 'ignore', detached: true });
  child.unref();
}

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Launches one app window per item on a schedule (each item's `at`, or
 * index × interval) and places each one exactly when it appears. A cold start
 * opens the first window, waits until the instance accepts hand-offs, then
 * runs the rest of the schedule. Afterwards the windows can be moved, read,
 * scrolled, clicked in and closed, and more can be opened.
 */
export function launchChromeApp(windows: ChromeAppWindow[], intervalMs: number, onLaunch: (index: number, at: number) => void, sound = false) {
  const run = Date.now().toString(36);
  // A unique fragment identifies each window's page target.
  const tagged: ChromeAppWindow[] = [];
  const tag = (window: ChromeAppWindow) => {
    const index = tagged.length;
    tagged.push({ ...window, url: `${window.url}#scc-dc-${run}-${index}` });
    return index;
  };
  windows.forEach(tag);
  const timers: ReturnType<typeof setTimeout>[] = [];
  const placed = new Set<number>();
  /** Chrome window ID, page target ID and placement time for each placed item. */
  const windowIds = new Map<number, number>();
  const targetIds = new Map<number, string>();
  const placedAt = new Map<number, number>();
  const sessions = new Map<number, Promise<string>>();
  const closed = new Set<number>();
  /** Windows asked for before the instance accepted hand-offs. */
  const queued: number[] = [];
  let started = false;
  let cancelled = false;
  let devtools: Devtools | undefined;

  async function place(target: TargetInfo) {
    const match = /#scc-dc-([a-z0-9]+)-(\d+)$/.exec(target.url);
    if (!devtools || target.type !== 'page' || !match || match[1] !== run) return;
    const index = Number(match[2]);
    if (placed.has(index)) return;
    placed.add(index);
    const window = tagged[index];
    targetIds.set(index, target.targetId);
    try {
      const { windowId } = await devtools.send<{ windowId: number }>('Browser.getWindowForTarget', { targetId: target.targetId });
      windowIds.set(index, windowId);
      await devtools.send('Browser.setWindowBounds', { windowId, bounds: { left: Math.round(window.x), top: Math.round(window.y), width: Math.round(window.width), height: Math.round(window.height), windowState: 'normal' } });
    } catch (error) {
      console.error('[desktop-collage] chrome app placement', (error as Error).message);
    }
    placedAt.set(index, Date.now());
  }

  async function attach() {
    try {
      devtools = await connectDevtools();
      devtools.on(message => {
        if ((message.method === 'Target.targetCreated' || message.method === 'Target.targetInfoChanged') && message.params?.targetInfo) void place(message.params.targetInfo);
      });
      await devtools.send('Target.setDiscoverTargets', { discover: true });
      const { targetInfos } = await devtools.send<{ targetInfos: TargetInfo[] }>('Target.getTargets');
      targetInfos.forEach(target => void place(target));
    } catch (error) {
      console.error('[desktop-collage] chrome app devtools', (error as Error).message);
    }
  }

  const plannedAt = (index: number) => tagged[index].at ?? index * intervalMs;
  const schedule = (from: number) => {
    const first = Date.now();
    const base = plannedAt(from);
    for (let index = from; index < tagged.length; index++) {
      timers.push(setTimeout(() => {
        if (cancelled) return;
        launch(tagged[index], sound);
        onLaunch(index, Date.now() - first);
      }, Math.max(0, plannedAt(index) - base)));
    }
    started = true;
    queued.splice(0).forEach(index => launch(tagged[index], sound));
  };

  prepareProfile();
  if (tagged.length) {
    if (ready()) void attach().then(() => !cancelled && schedule(0));
    else {
      launch(tagged[0], sound);
      onLaunch(0, 0);
      const begun = Date.now();
      const wait = setInterval(() => {
        if (cancelled) { clearInterval(wait); return; }
        if (ready() || Date.now() - begun > 10000) {
          clearInterval(wait);
          void attach().then(() => !cancelled && schedule(1));
        }
      }, 100);
    }
  }

  /** The page's own DevTools session, attached on first use. */
  function session(index: number) {
    const targetId = targetIds.get(index);
    if (!devtools || targetId === undefined || closed.has(index)) return undefined;
    let pending = sessions.get(index);
    if (!pending) {
      pending = devtools.send<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true }).then(result => result.sessionId);
      sessions.set(index, pending);
      pending.catch(() => sessions.delete(index));
    }
    return pending;
  }

  /** Moves a placed window; windows not yet placed are skipped. */
  function move(index: number, rect: Rect) {
    const windowId = windowIds.get(index);
    if (!devtools || windowId === undefined || closed.has(index)) return;
    void devtools.send('Browser.setWindowBounds', { windowId, bounds: { left: Math.round(rect.x), top: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) } }).catch(() => windowIds.delete(index));
  }
  function opened(index: number) {
    return closed.has(index) ? undefined : placedAt.get(index);
  }
  async function evaluate(index: number, expression: string, retry = true): Promise<unknown> {
    const pending = session(index);
    if (!pending || !devtools) return undefined;
    const sessionId = await pending;
    try {
      const { result } = await devtools.send<{ result?: { value?: unknown } }>('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
      return result?.value;
    } catch (error) {
      // A cross-site navigation moves the page to another process and ends its session; attach again once.
      sessions.delete(index);
      if (!retry) throw error;
      return evaluate(index, expression, false);
    }
  }
  function scroll(index: number, dy: number) {
    void evaluate(index, `window.scrollBy({ top: ${Math.round(dy)}, behavior: 'smooth' })`).catch(() => {});
  }
  async function click(index: number, x: number, y: number) {
    const pending = session(index);
    if (!pending || !devtools) return;
    const sessionId = await pending;
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'] as const) {
      await devtools.send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: type === 'mouseMoved' ? 'none' : 'left', clickCount: 1 }, sessionId);
    }
  }
  function close(index: number) {
    const targetId = targetIds.get(index);
    if (!devtools || targetId === undefined || closed.has(index)) return;
    closed.add(index);
    void devtools.send('Target.closeTarget', { targetId }).catch(() => {});
  }
  /** Opens one more window now (or as soon as the instance accepts hand-offs); returns its index. */
  function open(window: ChromeAppWindow) {
    const index = tag(window);
    if (cancelled) return index;
    if (started) launch(tagged[index], sound);
    else queued.push(index);
    return index;
  }

  // The protocol connection stays open while the windows can still be used;
  // quitting the instance (clear) ends it.
  return {
    cancel: () => { cancelled = true; timers.forEach(clearTimeout); devtools?.close(); },
    move, opened, evaluate, scroll, click, close, open,
  };
}

/** Opens a plan's windows in the dedicated instance. */
export function openChromeApp(plan: Plan, handlers: Handlers) {
  let last = 0;
  const page = (item: PlanItem): ChromeAppWindow => ({ ...item, url: item.url ?? colorPage(item.color) });
  const launched = launchChromeApp(plan.items.map(page), plan.intervalMs, (index, at) => {
    last = at;
    handlers.progress(index);
    if (index === plan.items.length - 1) handlers.done({ opened: plan.items.length, failed: 0, spreadMs: last, resized: 0 });
  }, plan.sound ?? false);
  return { ...launched, open: (item: PlanItem) => launched.open(page(item)) };
}

/** Quits the dedicated instance, closing every window it opened. */
export function clearChromeApp() {
  spawnSync('/usr/bin/pkill', ['-f', chromeAppProfile()]);
}

export { chromeAppArgs, chromeAppProfile };
