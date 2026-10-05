import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';

// JXA (`osascript -l JavaScript`) processes. Parameters arrive as one JSON argv
// value and are never interpolated into script text.

const run = promisify(execFile);

/** Runs a script to completion and parses the JSON it returns. */
export async function runJxa<T>(script: string, argument?: unknown, timeout = 15000): Promise<T> {
  const { stdout } = await run('/usr/bin/osascript', ['-l', 'JavaScript', '-e', script, ...(argument === undefined ? [] : [JSON.stringify(argument)])], { timeout });
  return JSON.parse(stdout.trim()) as T;
}

/** Starts a script that keeps running; its stderr carries events. */
export function spawnJxa(script: string, argument: unknown, stdout: 'pipe' | 'ignore' = 'ignore') {
  return spawn('/usr/bin/osascript', ['-l', 'JavaScript', '-e', script, JSON.stringify(argument)], { stdio: ['ignore', stdout, 'pipe'] });
}

/** Lines `name {json}` from a JXA process's stderr (`console.log` in JXA). */
export function readEvents(child: ChildProcess, onEvent: (name: string, data: Record<string, number>) => void) {
  let buffer = '';
  child.stderr?.on('data', chunk => {
    buffer += chunk;
    const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
    for (const line of lines) {
      const space = line.indexOf(' ');
      try { onEvent(line.slice(0, space), JSON.parse(line.slice(space + 1))); }
      catch { if (line.trim()) console.error('[desktop-collage]', line.slice(0, 500)); }
    }
  });
}
