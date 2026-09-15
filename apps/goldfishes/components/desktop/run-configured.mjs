import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { validateSettings, createPlan } from './settings.ts';
import { preparePreview } from './prepare-preview.mjs';

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
const id = value => { if (!/^\d+$/.test(value)) throw new Error('창 ID를 얻지 못했습니다.'); return value; };
let atlas;
async function setup(app) {
  if (app === 'chrome') ids.chrome = id(await apple(`tell application "Google Chrome"
    set w to make new window
    set URL of active tab of w to "https://en.wikipedia.org/wiki/Artificial_intelligence"
    tell w
      make new tab with properties {URL:"https://en.wikipedia.org/wiki/Quantum_computing"}
      make new tab with properties {URL:"https://en.wikipedia.org/wiki/Attention_economy"}
    end tell
    return id of w
  end tell`));
  if (app === 'terminal') ids.terminal = id(await apple(`tell application "Terminal"
    do script "uname -sm; uptime"
    return id of front window
  end tell`));
  if (app === 'preview') { atlas = await preparePreview(); await execute('/usr/bin/open', ['-a', 'Preview', atlas]); }
  if (app === 'slack') await execute('/usr/bin/open', ['slack://channel?team=T0BP28XG1V3&id=C0BP7M8E6SD']);
}
async function perform(step) {
  if (step.app === 'chrome' || step.app === 'terminal') {
    const name = step.app === 'chrome' ? 'Google Chrome' : 'Terminal';
    await apple(`tell application "${name}"
      set w to window id ${ids[step.app]}
      ${step.app === 'chrome' ? `set active tab index of w to ${step.tab}` : ''}
      set bounds of w to {${step.bounds.join(', ')}}
      set index of w to 1
      activate
    end tell`);
  } else await apple(`tell application "${step.app === 'preview' ? 'Preview' : 'Slack'}" to activate`);
}
try {
  if (process.platform !== 'darwin') throw new Error('macOS에서 실행해주세요.');
  const settings = validateSettings(JSON.parse(process.argv[2] || '{}'));
  const plan = createPlan(settings);
  emit({ phase: 'countdown', message: `${settings.countdown}초 후 준비 시작` });
  await pause(settings.countdown * 1000, undefined, { signal: abort.signal });
  const unavailable = new Set();
  let failures = 0;
  for (const app of settings.apps) {
    try { emit({ phase: 'preparing', app }); await setup(app); }
    catch (error) { abort.signal.throwIfAborted(); unavailable.add(app); failures++; emit({ phase: 'error', app, error: error.message }); }
  }
  for (const step of plan) {
    abort.signal.throwIfAborted();
    const started = performance.now();
    let outcome = 'ok';
    try { if (unavailable.has(step.app)) throw new Error('준비 실패로 건너뜀'); await perform(step); }
    catch (error) { abort.signal.throwIfAborted(); outcome = 'error'; failures++; emit({ phase: 'error', app: step.app, error: error.message }); }
    emit({ phase: 'running', index: step.id + 1, app: step.app, outcome, elapsedMs: Math.round(performance.now() - started), targetMs: step.intervalMs });
    if (step.id < plan.length - 1) await pause(Math.max(0, step.intervalMs - (performance.now() - started)), undefined, { signal: abort.signal });
  }
  emit({ phase: 'done', failures });
  if (failures) process.exitCode = 1;
} catch (error) {
  if (abort.signal.aborted) emit({ phase: 'stopped' });
  else { emit({ phase: 'error', error: error.message }); process.exitCode = 1; }
}
