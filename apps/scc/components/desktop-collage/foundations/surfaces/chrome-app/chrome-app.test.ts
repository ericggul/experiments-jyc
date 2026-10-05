import assert from 'node:assert/strict';
import test from 'node:test';
import { chromeAppArgs, chromeAppProfile } from './args.ts';

test('chrome app windows always use the dedicated profile, local DevTools and exact geometry', () => {
  const args = chromeAppArgs({ x: 10.4, y: 20.6, width: 300, height: 200, url: 'data:,x' });
  assert.ok(args.includes(`--user-data-dir=${chromeAppProfile()}`));
  assert.ok(args.includes('--window-position=10,21') && args.includes('--window-size=300,200'));
  assert.ok(args.includes('--app=data:,x'));
  assert.ok(args.includes('--remote-debugging-port=0'));
});
