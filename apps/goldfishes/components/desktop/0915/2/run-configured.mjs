import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { validateSettings, createPlan } from './settings.ts';
import { preparePreview } from './prepare-preview.mjs';
import { frameFor, eventSpacing } from './motion.ts';

const abort = new AbortController();
let child;
const stop = () => { abort.abort(); child?.kill('SIGTERM'); process.exitCode = 130; };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
const emit = data => console.log(JSON.stringify(data));
function execute(command, args) {
  abort.signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const task = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child = task;
    let output = '', error = '';
    const timer = setTimeout(() => task.kill('SIGTERM'), 22000);
    task.stdout.on('data', chunk => { output += chunk; });
    task.stderr.on('data', chunk => { error += chunk; });
    task.on('error', reject);
    task.on('close', code => {
      clearTimeout(timer);
      if (child === task) child = undefined;
      if (code === 0) resolve(output.trim()); else reject(new Error(error.trim() || '작업 시간 초과 또는 중단'));
    });
  });
}
const apple = script => execute('/usr/bin/osascript', ['-e', `with timeout of 20 seconds\n${script}\nend timeout`]);
const ids = {};
const windows = [];
let settings;
let created = 0;
let origin = 0;
const pages = ['https://en.wikipedia.org/wiki/Artificial_intelligence', 'https://news.ycombinator.com/', 'https://arxiv.org/list/cs.AI/recent', 'https://en.wikipedia.org/wiki/Quantum_computing', 'https://github.com/trending', 'https://en.wikipedia.org/wiki/Attention_economy', 'https://en.wikipedia.org/wiki/Metaverse', 'https://en.wikipedia.org/wiki/Algorithm'];
const id = value => { if (!/^\d+$/.test(value)) throw new Error('창 ID를 얻지 못했습니다.'); return value; };
let atlas;
async function setup(app) {
  if (app === 'chrome') await createWindow();
  if (app === 'terminal') ids.terminal = id(await apple(`tell application "Terminal"
    do script "uname -sm; uptime"
    return id of front window
  end tell`));
  if (app === 'preview') { atlas = await preparePreview(); await execute('/usr/bin/open', ['-a', 'Preview', atlas]); }
  if (app === 'slack') await execute('/usr/bin/open', ['slack://channel?team=T0BP28XG1V3&id=C0BP7M8E6SD']);
}
async function createWindow() {
  if (created >= settings.windowCount) return;
  const slot = created;
  const bounds = frameFor(slot, origin ? (performance.now() - origin) / 1000 : 0, settings);
  const windowId = id(await apple(`tell application "Google Chrome"
    set w to make new window
    set URL of active tab of w to "${pages[slot]}"
    set bounds of w to {${bounds.join(', ')}}
    return id of w
  end tell`));
  windows.push({ id: windowId, slot });
  created++;
}
async function perform(step) {
  if (step.app === 'chrome') {
    if (step.birth) await createWindow();
    if (!windows.length) return;
    const chosen = step.birth ? windows.at(-1) : windows[step.channel % windows.length];
    await apple(`tell application "Google Chrome"
      set w to window id ${chosen.id}
      set index of w to 1
      activate
    end tell`);
  } else if (step.app === 'terminal') {
    if (!ids.terminal) return;
    await apple(`tell application "Terminal"
      set index of window id ${ids.terminal} to 1
      activate
    end tell`);
  } else await apple(`tell application "${step.app === 'preview' ? 'Preview' : 'Slack'}" to activate`);
}
async function drift() {
  const commands = ['set withdrawn to ""'];
  // Two frames per native call reduce process overhead; no overlapping calls.
  for (let frame = 0; frame < 2; frame++) {
    const t = (performance.now() - origin) / 1000 + frame * .125;
    const tracked = [...windows.map(w => ({ ...w, app: 'Google Chrome', kind: 'chrome' })), ...(ids.terminal ? [{ id: ids.terminal, slot: 8, app: 'Terminal', kind: 'terminal' }] : [])];
    for (const w of tracked) {
      commands.push(`tell application "${w.app}"
        if exists window id ${w.id} then
          set bounds of window id ${w.id} to {${frameFor(w.slot, t, settings).join(', ')}}
        else
          set withdrawn to withdrawn & "${w.kind}:${w.id},"
        end if
      end tell`);
    }
    if (frame === 0) commands.push('delay 0.125');
  }
  commands.push('return withdrawn');
  const withdrawn = await apple(commands.join('\n'));
  for (const token of withdrawn.split(',')) {
    const [kind, windowId] = token.split(':');
    if (kind === 'chrome') { const index = windows.findIndex(w => w.id === windowId); if (index >= 0) windows.splice(index, 1); }
    if (kind === 'terminal' && ids.terminal === windowId) ids.terminal = undefined;
  }
}
try {
  if (process.platform !== 'darwin') throw new Error('macOS에서 실행해주세요.');
  settings = validateSettings(JSON.parse(process.argv[2] || '{}'));
  const plan = createPlan(settings);
  emit({ phase: 'countdown', message: `${settings.countdown}초 후 준비 시작` });
  await pause(settings.countdown * 1000, undefined, { signal: abort.signal });
  const unavailable = new Set();
  let failures = 0;
  for (const app of settings.apps) {
    try { emit({ phase: 'preparing', app }); await setup(app); }
    catch (error) { abort.signal.throwIfAborted(); unavailable.add(app); failures++; emit({ phase: 'error', app, error: error.message }); }
  }
  origin = performance.now();
  let motionFailed = false;
  for (const step of plan) {
    abort.signal.throwIfAborted();
    const started = performance.now();
    let outcome = 'ok';
    try { if (unavailable.has(step.app)) throw new Error('준비 실패로 건너뜀'); await perform(step); }
    catch (error) { abort.signal.throwIfAborted(); outcome = 'error'; failures++; emit({ phase: 'error', app: step.app, error: error.message }); }
    const targetMs = eventSpacing(step.intervalMs, (started - origin) / 1000, settings.jitter);
    emit({ phase: 'running', index: step.id + 1, app: step.app, outcome, elapsedMs: Math.round(performance.now() - started), targetMs });
    if (step.id < plan.length - 1) {
      while (performance.now() - started < targetMs && !motionFailed && (windows.length || ids.terminal)) {
        const frameStart = performance.now();
        try { await drift(); } catch (error) { abort.signal.throwIfAborted(); motionFailed = true; failures++; emit({ phase: 'error', app: 'motion', error: error.message }); }
        await pause(Math.max(0, 250 - (performance.now() - frameStart)), undefined, { signal: abort.signal });
      }
      await pause(Math.max(0, targetMs - (performance.now() - started)), undefined, { signal: abort.signal });
    }
  }
  emit({ phase: 'done', failures });
  if (failures) process.exitCode = 1;
} catch (error) {
  if (abort.signal.aborted) emit({ phase: 'stopped' });
  else { emit({ phase: 'error', error: error.message }); process.exitCode = 1; }
}
