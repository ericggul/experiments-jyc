import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { colorPage } from '../../pages/index.ts';
import type { Handlers, Plan } from '../index.ts';
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

function launch(window: ChromeAppWindow) {
  const child = spawn('/usr/bin/open', ['-n', '-a', CHROME_APP, '--args', ...chromeAppArgs(window)], { stdio: 'ignore', detached: true });
  child.unref();
}

/**
 * Launches one app window per item on an absolute schedule and places each
 * one exactly when it appears. A cold start opens the first window, waits
 * until the instance accepts hand-offs, then runs the rest of the schedule.
 */
export function launchChromeApp(windows: ChromeAppWindow[], intervalMs: number, onLaunch: (index: number, at: number) => void) {
  const run = Date.now().toString(36);
  // A unique fragment identifies each window's page target.
  const tagged = windows.map((window, index) => ({ ...window, url: `${window.url}#scc-dc-${run}-${index}` }));
  const timers: ReturnType<typeof setTimeout>[] = [];
  const placed = new Set<number>();
  /** Chrome window ID for each placed item. */
  const windowIds = new Map<number, number>();
  let cancelled = false;
  let devtools: Devtools | undefined;

  async function place(target: TargetInfo) {
    const match = /#scc-dc-([a-z0-9]+)-(\d+)$/.exec(target.url);
    if (!devtools || target.type !== 'page' || !match || match[1] !== run) return;
    const index = Number(match[2]);
    if (placed.has(index)) return;
    placed.add(index);
    const window = tagged[index];
    try {
      const { windowId } = await devtools.send<{ windowId: number }>('Browser.getWindowForTarget', { targetId: target.targetId });
      windowIds.set(index, windowId);
      await devtools.send('Browser.setWindowBounds', { windowId, bounds: { left: Math.round(window.x), top: Math.round(window.y), width: Math.round(window.width), height: Math.round(window.height), windowState: 'normal' } });
    } catch (error) {
      console.error('[desktop-collage] chrome app placement', (error as Error).message);
    }
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

  const schedule = (from: number) => {
    const first = Date.now();
    for (let index = from; index < tagged.length; index++) {
      timers.push(setTimeout(() => {
        if (cancelled) return;
        launch(tagged[index]);
        onLaunch(index, Date.now() - first);
      }, (index - from) * intervalMs));
    }
  };

  prepareProfile();
  if (!tagged.length) return { cancel: () => {}, move: () => {} };
  if (ready()) void attach().then(() => !cancelled && schedule(0));
  else {
    launch(tagged[0]);
    onLaunch(0, 0);
    const started = Date.now();
    const wait = setInterval(() => {
      if (cancelled) { clearInterval(wait); return; }
      if (ready() || Date.now() - started > 10000) {
        clearInterval(wait);
        void attach().then(() => !cancelled && schedule(1));
      }
    }, 100);
  }
  /** Moves a placed window; windows not yet placed are skipped. */
  function move(index: number, rect: { x: number; y: number; width: number; height: number }) {
    const windowId = windowIds.get(index);
    if (!devtools || windowId === undefined) return;
    void devtools.send('Browser.setWindowBounds', { windowId, bounds: { left: Math.round(rect.x), top: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) } }).catch(() => windowIds.delete(index));
  }

  // The protocol connection stays open while the windows can still be moved;
  // quitting the instance (clear) ends it.
  return { cancel: () => { cancelled = true; timers.forEach(clearTimeout); devtools?.close(); }, move };
}

/** Opens a plan's windows in the dedicated instance. */
export function openChromeApp(plan: Plan, handlers: Handlers) {
  let last = 0;
  return launchChromeApp(plan.items.map(item => ({ ...item, url: item.url ?? colorPage(item.color) })), plan.intervalMs, (index, at) => {
    last = at;
    handlers.progress(index);
    if (index === plan.items.length - 1) handlers.done({ opened: plan.items.length, failed: 0, spreadMs: last, resized: 0 });
  });
}

/** Quits the dedicated instance, closing every window it opened. */
export function clearChromeApp() {
  spawnSync('/usr/bin/pkill', ['-f', chromeAppProfile()]);
}

export { chromeAppArgs, chromeAppProfile };
