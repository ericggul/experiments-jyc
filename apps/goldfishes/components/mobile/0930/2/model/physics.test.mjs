import test from 'node:test';
import assert from 'node:assert/strict';
import { step, fits, spawnPoint, radius } from './physics.ts';
const bounds = { width: 390, height: 600 };
const bubble = (id, x, y, vx = 0, vy = 0) => ({ id, x, y, vx, vy, age: 0, words: ['Artificial', 'Intelligence'], color: '#fff' });

test('head-on impact transfers momentum without overlapping', () => {
  let items = [bubble(1, 120, 200, 500), bubble(2, 210, 200)];
  for (let i = 0; i < 6; i++) { items = step(items, bounds, 1 / 60); assert.ok(fits(items, bounds)); }
  assert.ok(items[1].vx > 100);
});

test('fast dragging through a crowded field cannot tunnel or overlap', () => {
  let items = [];
  for (let id = 0; id < 12; id++) {
    const p = spawnPoint(items, bounds); assert.ok(p);
    items.push(bubble(id, p.x, p.y));
  }
  for (let i = 0; i < 600; i++) {
    items = step(items, bounds, 1 / 60, { id: 0, x: 195 + Math.sin(i * .17) * 350, y: 300 + Math.cos(i * .13) * 600 });
    assert.ok(fits(items, bounds), `frame ${i}`);
    assert.equal(items.length, 12);
  }
});

test('walls keep a released bubble inside and reflect velocity', () => {
  const items = step([bubble(1, 45, 100, -1000)], bounds, .016);
  assert.ok(fits(items, bounds)); assert.ok(items[0].vx > 0);
});

test('lifetimes shrink independently and expire at thirty seconds', () => {
  let items = [bubble(1, 100, 100), { ...bubble(2, 240, 100), age: 20 }];
  items = step(items, bounds, 10);
  assert.equal(items.length, 1); assert.equal(radius(items[0]), 28.000000000000004);
  assert.equal(step(items, bounds, 20).length, 0);
});
