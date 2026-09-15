import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { validateSettings, createPlan } from './settings.ts';
import { frameFor, eventSpacing } from './motion.ts';
import { closeScript, creationScript, scrollScript, reconcile, cadence, chooseRevisit, focusScript } from './browser.mjs';

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
    const timer = setTimeout(() => task.kill('SIGTERM'), 10000);
    task.stdout.on('data', chunk => { output += chunk; });
    task.stderr.on('data', chunk => { error += chunk; });
    task.on('error', reason => { clearTimeout(timer); reject(reason); });
    task.on('close', code => {
      clearTimeout(timer);
      if (child === task) child = undefined;
      if (code === 0) resolve(output.trim()); else reject(new Error(error.trim() || '명령 시간 초과 또는 중단'));
    });
  });
}
const apple = script => execute('/usr/bin/osascript', ['-e', `with timeout of 8 seconds\n${script}\nend timeout`]);
let pages = [], browserIdentity = '', failures = 0;
const ownership = () => emit({ phase: 'ownership', ownership: { browserIdentity, pages } });
async function inventory() {
  const result = await apple(`tell application "Google Chrome"
    set gfTabInventoryText to ""
    repeat with w in windows
      repeat with t in tabs of w
        set gfTabInventoryText to gfTabInventoryText & (id of w as text) & ":" & (id of t as text) & ","
      end repeat
    end repeat
    return gfTabInventoryText
  end tell`);
  return result.split(',').filter(Boolean).map(pair => { const [windowId, tabId] = pair.split(':').map(Number); return { windowId, tabId }; });
}
async function retire() {
  const oldest = pages[0];
  if (!oldest) return;
  await apple(closeScript(oldest));
  const live = await inventory();
  if (live.some(p => p.tabId === oldest.tabId && p.windowId === oldest.windowId)) throw new Error('오래된 탭을 닫지 못해 생성을 중단합니다.');
  pages = reconcile(pages, live);
  ownership();
}
try {
  if (process.platform !== 'darwin') throw new Error('macOS에서 실행해주세요.');
  const settings = validateSettings(JSON.parse(process.argv[2] || '{}'));
  const previous = JSON.parse(process.argv[3] || '{}');
  emit({ phase: 'countdown', message: `${settings.countdown}초 후 준비 시작` });
  await pause(settings.countdown * 1000, undefined, { signal: abort.signal });
  await apple('tell application "Google Chrome" to launch');
  const processes = await execute('/bin/ps', ['-axo', 'pid=,lstart=,comm=']);
  browserIdentity = processes.split('\n').find(line => line.trim().endsWith('/Google Chrome.app/Contents/MacOS/Google Chrome'))?.trim() || '';
  if (!browserIdentity) throw new Error('Chrome 실행 식별자를 확인하지 못했습니다. 안전한 탭 관리를 위해 중단합니다.');
  if (previous.browserIdentity === browserIdentity && Array.isArray(previous.pages)) pages = reconcile(previous.pages, await inventory());
  ownership();
  while (pages.length > settings.pageLimit) await retire();
  const plan = createPlan(settings);
  const origin = performance.now();
  let average = 0, slow = 0, scrolling = true, moving = true, previousTabId;
  for (const step of plan) {
    abort.signal.throwIfAborted();
    const started = performance.now();
    pages = reconcile(pages, await inventory());
    let fresh = step.revisit ? chooseRevisit(pages, previousTabId, step.pick) : undefined;
    let kind = 'revisit';
    if (fresh && await apple(focusScript(fresh)) !== 'focused') fresh = undefined;
    if (!fresh) {
    while (pages.length >= settings.pageLimit) await retire();
    let windows = [...new Set(pages.map(p => p.windowId))];
    if (step.birth) {
      while (windows.length >= Math.min(settings.windowCount, settings.pageLimit) && pages.length) {
        await retire();
        windows = [...new Set(pages.map(p => p.windowId))];
      }
    }
    const targetWindow = !step.birth && windows.length ? windows.at(-1) : null;
    const result = await apple(creationScript(step.page.url, targetWindow));
    const [windowId, tabId] = result.split(':').map(Number);
    if (![windowId, tabId].every(n => Number.isSafeInteger(n) && n > 0)) throw new Error('새 탭 ID 확인 실패. 추가 생성을 중단합니다.');
    fresh = { windowId, tabId, slot: step.id, title: step.page.title };
    pages.push(fresh);
    ownership();
    await apple(`tell application "Google Chrome" to set bounds of window id ${windowId} to {${frameFor(step.id, (performance.now() - origin) / 1000, settings).join(', ')}}`);
    kind = targetWindow ? 'tab' : 'window';
    }
    previousTabId = fresh.tabId;
    if (step.scroll && scrolling) {
      try { await apple(scrollScript(fresh, step.upward)); }
      catch (error) { abort.signal.throwIfAborted(); scrolling = false; failures++; emit({ phase: 'error', app: 'scroll', error: `스크롤 중지: ${error.message}` }); }
    }
    if (step.slack) {
      try { await execute('/usr/bin/open', ['slack://channel?team=T0BP28XG1V3&id=C0BP7M8E6SD']); }
      catch (error) { abort.signal.throwIfAborted(); failures++; emit({ phase: 'error', app: 'slack', error: error.message }); }
    }
    if (step.terminal) {
      try { await execute('/usr/bin/open', ['-a', 'Terminal']); }
      catch (error) { abort.signal.throwIfAborted(); failures++; emit({ phase: 'error', app: 'terminal', error: error.message }); }
    }
    const elapsed = performance.now() - started;
    average = average ? average * .7 + elapsed * .3 : elapsed;
    slow = elapsed > 4000 ? slow + 1 : 0;
    const baseMs = eventSpacing(step.intervalMs, (started - origin) / 1000, settings.jitter);
    const targetMs = cadence(baseMs, average, pages.length);
    emit({ phase: 'running', index: step.id + 1, app: 'chrome', elapsedMs: Math.round(elapsed), targetMs, pageCount: pages.length, windowCount: new Set(pages.map(p => p.windowId)).size, title: fresh.title ?? '이전에 열린 탭', kind });
    if (slow >= 3) throw new Error('3회 연속 명령 처리가 4초를 넘어 생성을 중단했습니다. 페이지 상한을 낮춰주세요.');
    if (step.id === plan.length - 1) break;
    if (moving && settings.movingWindows && average < 1000 && targetMs - elapsed > 250) {
      const recent = [...new Map(pages.map(p => [p.windowId, p])).values()].slice(-settings.movingWindows);
      try {
        await apple(`tell application "Google Chrome"\n${recent.map(p => `if exists window id ${p.windowId} then set bounds of window id ${p.windowId} to {${frameFor(p.slot, (performance.now() - origin) / 1000, settings).join(', ')}}`).join('\n')}\nend tell`);
      } catch (error) { abort.signal.throwIfAborted(); moving = false; failures++; emit({ phase: 'error', app: 'motion', error: error.message }); }
    }
    await pause(Math.max(0, targetMs - (performance.now() - started)), undefined, { signal: abort.signal });
  }
  emit({ phase: 'done', failures });
  if (failures) process.exitCode = 1;
} catch (error) {
  if (abort.signal.aborted) emit({ phase: 'stopped' });
  else { emit({ phase: 'error', error: error.message }); process.exitCode = 1; }
}
