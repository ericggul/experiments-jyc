import assert from 'node:assert/strict';
import test from 'node:test';
import { clampSetting, defaults, validateSettings } from './settings.ts';

test('defaults are valid and the snapshot keeps only known keys', () => {
  assert.deepEqual(validateSettings({ ...defaults, extra: 'ignored' }), defaults);
});

test('out-of-range, fractional and unknown choices are rejected', () => {
  for (const change of [{ count: 61 }, { count: 2 }, { count: 2.5 }, { interval: 0 }, { fill: NaN }, { surface: 'firefox' }, { surface: 'safari' }, { surface: 'terminal', fill: 'wikipedia' }, { surface: 'chrome-app', stack: 'oldest' }, { clearFirst: 'yes' }, { timing: 'later' }, { order: 'x' }, { fill: 'file:///etc/passwd' }, { stack: 'middle' }, { seed: '1; quit' }]) {
    assert.throws(() => validateSettings({ ...defaults, ...change }), JSON.stringify(change));
  }
});

test('typed values clamp into range', () => {
  assert.equal(clampSetting('count', '200'), 60);
  assert.equal(clampSetting('interval', '0.123'), .12);
  assert.equal(clampSetting('size', 'x'), undefined);
});

test('every surface accepts the defaults it supports', () => {
  for (const surface of ['chrome-app', 'terminal', 'bare'] as const) {
    assert.equal(validateSettings({ ...defaults, surface }).surface, surface);
  }
  assert.equal(validateSettings({ ...defaults, surface: 'bare', fill: 'wikipedia', stack: 'upper' }).stack, 'upper');
});
