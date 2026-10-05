import { readEvents, runJxa, spawnJxa } from '../../jxa/index.ts';
import type { Handlers, Plan } from '../index.ts';
import { closeTerminalScript, openTerminalScript } from './scripts.ts';

// Terminal windows painted a flat colour: the thinnest native chrome among the
// applications, with exact placement and any stacking order.

const unit = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);

/** Opens a plan's windows; `onOpened` receives the window IDs to close later. */
export function openTerminal(plan: Plan, handlers: Handlers, onOpened: (ids: number[]) => void) {
  const items = plan.items.map(item => ({ x: item.x, y: item.y, width: item.width, height: item.height, rank: item.rank, color: unit(item.color) }));
  const child = spawnJxa(openTerminalScript, { intervalMs: plan.intervalMs, items }, 'pipe');
  let stdout = '';
  child.stdout?.on('data', chunk => { stdout += chunk; });
  readEvents(child, (name, data) => { if (name === 'progress') handlers.progress(data.index); });
  child.on('close', code => {
    try {
      const { windows, spreadMs } = JSON.parse(stdout.trim()) as { windows: { index: number; id?: number; bounds?: number[] }[]; spreadMs: number };
      const opened = windows.filter(window => window.id !== undefined);
      onOpened(opened.map(window => window.id!));
      const resized = opened.filter(window => window.bounds && (Math.abs(window.bounds[2] - plan.items[window.index].width) > 1 || Math.abs(window.bounds[3] - plan.items[window.index].height) > 1)).length;
      handlers.done({ opened: opened.length, failed: windows.length - opened.length, spreadMs, resized });
    } catch {
      handlers.failed(code === 0 ? 'Could not read the result' : 'Stopped · opened windows remain');
    }
  });
  return { stop: () => child.kill('SIGTERM') };
}

export async function closeTerminal(ids: number[]) {
  if (!ids.length) return 0;
  return (await runJxa<{ closed: number }>(closeTerminalScript, { ids }, 30000)).closed;
}
