import assert from 'node:assert/strict';
import test from 'node:test';
import { TRAIL_LENGTH, createCoupledMap, spread, stepCoupledMap } from './coupled-map.ts';
import { dynamics } from './dynamics.ts';

function settle(plane, parameters, coupling = 0.25, seed = 7, steps = 2400, keep = 400) {
  const { map: nodeMap, rest, base } = dynamics[plane];
  const map = createCoupledMap(seed, rest, base, plane === '2d');
  map.parameter = [...parameters];
  const history = map.state.map(() => []);
  let farthest = 0;
  for (let step = 0; step < steps; step++) {
    stepCoupledMap(map, coupling, nodeMap);
    for (const point of map.state) farthest = Math.max(farthest, Math.hypot(point.x - rest.x, point.y - rest.y));
    if (step >= steps - keep) map.state.forEach((point, node) => history[node].push(point));
  }
  const mean = history.map((points) => points.reduce((sum, point) => sum + point.x, 0) / points.length);
  return { map, sd: history.map(spread), mean, farthest };
}

for (const plane of ['1d', '2d']) {
  const { base, max, rest } = dynamics[plane];
  const still = Array(6).fill(base);
  const oneMax = [max, ...still.slice(1)];

  test(`${plane}: the untouched system settles on the shared rest point`, () => {
    const { map, sd } = settle(plane, still);
    for (const value of sd) assert.ok(value < 1e-6);
    for (const point of map.state) assert.ok(Math.hypot(point.x - rest.x, point.y - rest.y) < 1e-6);
  });

  test(`${plane}: one maximal local demand makes all five untouched nodes move`, () => {
    const { sd } = settle(plane, oneMax);
    assert.ok(sd[0] > 0.2);
    for (const value of sd.slice(1)) assert.ok(value > 0.04, `untouched sd ${value}`);
  });

  test(`${plane}: without coupling the disturbance stays local`, () => {
    const { sd } = settle(plane, oneMax, 0);
    for (const value of sd.slice(1)) assert.ok(value < 1e-6);
  });

  test(`${plane}: trails stay bounded`, () => {
    const { map } = settle(plane, Array(6).fill(max), 0.5, 3, 600, 10);
    for (const trail of map.trail) assert.equal(trail.length, TRAIL_LENGTH);
  });
}

test('1d: states stay inside the unit interval with y fixed at zero', () => {
  const { map: nodeMap, rest, base } = dynamics['1d'];
  const map = createCoupledMap(3, rest, base, false);
  map.parameter = [4, 4, 4, 3.3, 2, 1.8];
  for (let step = 0; step < 5000; step++) {
    stepCoupledMap(map, 0.5, nodeMap);
    for (const point of map.state) assert.ok(point.x >= 0 && point.x <= 1 && point.y === 0);
  }
});

test('1d: the demanded node gains almost nothing on average at full demand', () => {
  const { base, max, rest } = dynamics['1d'];
  const { mean } = settle('1d', [max, ...Array(5).fill(base)], 0.2);
  assert.ok(Math.abs(mean[0] - rest.x) < 0.02);
  for (const value of mean.slice(1)) assert.ok(value < rest.x);
});

test('2d: every node stays on the attractor grown from rest, across seeds', () => {
  const { max } = dynamics['2d'];
  for (let seed = 1; seed <= 40; seed++) {
    const { farthest } = settle('2d', Array(6).fill(max), 0.25, seed, 1200, 10);
    assert.ok(farthest < 3, `seed ${seed} reached ${farthest}`);
  }
});

test('2d: planar motion uses both axes', () => {
  const { base, max } = dynamics['2d'];
  const { map } = settle('2d', [max, ...Array(5).fill(base)]);
  const ys = map.trail[1].map((point) => point.y);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0.05);
});
