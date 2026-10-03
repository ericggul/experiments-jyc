import assert from 'node:assert/strict';
import test from 'node:test';
import { dynamics } from './dynamics.ts';
import { CENTRE, OUTER_REACH, demandAt, parameterForReach, positionFor, restReach } from './demand.ts';

for (const plane of ['1d', '2d']) {
  const { base, min, max, rest } = dynamics[plane];

  test(`${plane}: touching a node at rest leaves its parameter unchanged`, () => {
    for (let node = 0; node < 6; node++) {
      const { x, y } = positionFor(plane, node, rest);
      const demand = demandAt(plane, x, y);
      assert.equal(demand.node, node);
      assert.ok(Math.abs(demand.parameter - base) < 1e-9);
    }
  });

  test(`${plane}: pulling outward raises demand up to the bounded maximum`, () => {
    assert.equal(parameterForReach(plane, OUTER_REACH), max);
    assert.equal(parameterForReach(plane, 400), max);
    assert.equal(parameterForReach(plane, 0), min);
    assert.ok(parameterForReach(plane, restReach(plane) + 10) > base);
  });
}

test('2d: every reachable state is drawn inside one disc', () => {
  for (let node = 0; node < 6; node++) {
    for (let x = -4; x <= 4; x += 0.25) {
      for (let y = -4; y <= 4; y += 0.25) {
        const point = positionFor('2d', node, { x, y });
        assert.ok(Math.hypot(point.x - CENTRE, point.y - CENTRE) <= OUTER_REACH + 1e-9);
      }
    }
  }
});

test('the centre is neutral and sectors wrap around the top node', () => {
  assert.equal(demandAt('2d', CENTRE + 5, CENTRE), null);
  assert.equal(demandAt('1d', CENTRE - 1, CENTRE - 150).node, 0);
  assert.equal(demandAt('1d', CENTRE + 1, CENTRE - 150).node, 0);
  assert.equal(demandAt('2d', CENTRE, CENTRE + 150).node, 3);
});
