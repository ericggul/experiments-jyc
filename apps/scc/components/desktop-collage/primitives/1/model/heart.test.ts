import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutHeart, outline, sequence } from './heart.ts';
import { defaults } from './settings.ts';

const displays = [{ x: 0, y: 38, width: 1470, height: 843 }, { x: 0, y: 25, width: 2560, height: 1390 }, { x: 0, y: 0, width: 800, height: 1280 }];

test('every window stays inside the visible desktop for all sizes and counts', () => {
  for (const frame of displays) for (const count of [3, 20, 30, 60]) for (const size of [40, 100]) {
    for (const tile of layoutHeart(frame, { ...defaults, count, size, tileWidth: 40, tileHeight: 40 })) {
      assert.ok(tile.x >= frame.x - 1 && tile.y >= frame.y - 1, JSON.stringify({ frame, tile }));
      assert.ok(tile.x + tile.width <= frame.x + frame.width + 1 && tile.y + tile.height <= frame.y + frame.height + 1, JSON.stringify({ frame, tile }));
    }
  }
});

test('the outline is centred and mirror-symmetric about the vertical axis', () => {
  const frame = displays[0];
  const tiles = layoutHeart(frame, defaults);
  const left = Math.min(...tiles.map(t => t.x));
  const right = Math.max(...tiles.map(t => t.x + t.width));
  const top = Math.min(...tiles.map(t => t.y));
  const bottom = Math.max(...tiles.map(t => t.y + t.height));
  assert.ok(Math.abs((left + right) / 2 - (frame.x + frame.width / 2)) <= 2);
  assert.ok(Math.abs((top + bottom) / 2 - (frame.y + frame.height / 2)) <= 2);
  const points = outline(30);
  for (let k = 1; k < 30; k++) {
    assert.ok(Math.abs(points[k][0] + points[30 - k][0]) < 1e-6);
    assert.ok(Math.abs(points[k][1] - points[30 - k][1]) < 1e-6);
  }
});

test('outline points are evenly spaced and start at the top cusp', () => {
  const points = outline(40);
  assert.ok(Math.abs(points[0][0]) < 1e-9);
  const gaps = points.map((p, i) => Math.hypot(p[0] - points[(i + 1) % 40][0], p[1] - points[(i + 1) % 40][1]));
  assert.ok(Math.max(...gaps) / Math.min(...gaps) < 1.6);
});

test('every order visits each outline step exactly once', () => {
  for (const n of [3, 4, 29, 30]) for (const order of ['trace', 'mirror', 'shuffle'] as const) {
    const steps = sequence(n, order, 7);
    assert.deepEqual([...steps].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i));
  }
  assert.deepEqual(sequence(6, 'mirror', 1), [0, 1, 5, 2, 4, 3]);
  assert.deepEqual(sequence(30, 'shuffle', 3), sequence(30, 'shuffle', 3));
});
