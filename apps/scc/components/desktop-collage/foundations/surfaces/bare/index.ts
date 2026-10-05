import { spawnSync } from 'node:child_process';
import { readEvents, spawnJxa } from '../../jxa/index.ts';
import type { Display, Handlers, Plan } from '../index.ts';
import { BARE_MARKER, bareColor, bareHostScript, type BareJob } from './host.ts';

/** Borderless windows held by a host process; they stay until the host is killed. */
export function openBare(plan: Plan, display: Display, handlers: Handlers) {
  const job: BareJob = {
    marker: BARE_MARKER,
    items: plan.items.map(item => ({ x: item.x, y: item.y, width: item.width, height: item.height, rank: item.rank, color: bareColor(item.color), url: item.url })),
    intervalMs: plan.intervalMs,
    shadow: false,
    screenHeight: display.height,
    lifetimeMs: 2 * 60 * 60 * 1000,
  };
  const host = spawnJxa(bareHostScript, job);
  let finished = false;
  readEvents(host, (name, data) => {
    if (name === 'progress') handlers.progress(data.index);
    if (name === 'ready') { finished = true; handlers.done({ opened: data.windows, failed: plan.items.length - data.windows, spreadMs: data.spreadMs, resized: 0 }); }
  });
  host.on('close', () => { if (!finished) handlers.failed('Stopped · the windows were removed'); });
  host.on('error', error => handlers.failed(error.message));
  return { stop: () => host.kill('SIGTERM') };
}

/** Removes every bare host, including ones left by an earlier server process. */
export function clearBare() {
  spawnSync('/usr/bin/pkill', ['-f', BARE_MARKER]);
}
