import assert from 'node:assert/strict';
import test from 'node:test';
import { arrange } from './arrangement.ts';
import { driftAt } from './drift.ts';
import { intersection, linkStrength, particleBudget } from './field.ts';
import { defaults, validateSettings } from './settings.ts';

const frame = { x: 0, y: 38, width: 1470, height: 843 };
const inside = (r: { x: number; y: number; width: number; height: number }) => r.x >= frame.x && r.y >= frame.y && r.x + r.width <= frame.x + frame.width && r.y + r.height <= frame.y + frame.height;

test('every arrangement and every drift moment keeps windows on the visible desktop', () => {
  for (const arrangement of ['row', 'ring', 'scatter'] as const) for (const count of [2, 5, 8]) {
    const rects = arrange(frame, { ...defaults, arrangement, count, tileWidth: 48, tileHeight: 70 });
    assert.equal(rects.length, count);
    rects.forEach((rect, i) => {
      assert.ok(inside(rect), JSON.stringify(rect));
      for (let t = 0; t < 60; t += 0.7) assert.ok(inside(driftAt(rect, frame, i, t, { ...defaults, amplitude: 40 })));
    });
  }
});

test('drift is continuous and still when the amplitude is zero', () => {
  const base = arrange(frame, defaults)[0];
  const a = driftAt(base, frame, 0, 3, defaults);
  const b = driftAt(base, frame, 0, 3 + 1 / 24, defaults);
  assert.ok(Math.abs(a.x - b.x) < 8 && Math.abs(a.y - b.y) < 8);
  assert.deepEqual(driftAt(base, frame, 0, 7, { ...defaults, amplitude: 0 }), base);
});

test('links strengthen as spheres approach and vanish beyond the range', () => {
  assert.equal(linkStrength(1000, 800), 0);
  assert.equal(linkStrength(100, 800), 1);
  assert.ok(linkStrength(500, 800) > 0 && linkStrength(500, 800) < 1);
  assert.ok(linkStrength(400, 800) > linkStrength(600, 800));
});

test('overlap is found exactly and the particle budget stays within 8,192 per window', () => {
  assert.deepEqual(intersection({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 60, width: 100, height: 100 }), { x: 50, y: 60, width: 50, height: 40 });
  assert.equal(intersection({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 0, width: 10, height: 10 }), null);
  for (let n = 2; n <= 8; n++) {
    const { shell, core, dust, bridge } = particleBudget(n);
    assert.ok(n * (shell + core + dust) + (n * (n - 1) / 2) * bridge <= 8192, String(n));
  }
});

test('settings reject fractional, out-of-range and unknown values', () => {
  assert.deepEqual(validateSettings(defaults), defaults);
  for (const change of [{ count: 9 }, { count: 1 }, { range: 2.5 }, { motion: 'spin' }, { fill: 'blue' }, { clearFirst: 1 }]) assert.throws(() => validateSettings({ ...defaults, ...change }));
});
