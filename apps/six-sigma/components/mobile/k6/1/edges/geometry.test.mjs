import assert from 'node:assert/strict';
import test from 'node:test';
import { edgeCurve, edgePath, laneCurves, travelingEdge } from './geometry.ts';
import { createFlux } from '../flow/flux.ts';

const edge = { id: 'a-b', from: { id: 'a', x: 0, y: 0 }, to: { id: 'b', x: 100, y: 0 } };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} differs from ${b}`);

test('straight baseline and cubic arcs share exact endpoints', () => {
  const straight = travelingEdge(edge, 'straight', false);
  const curved = travelingEdge(edge, 'cubic', false);
  near(straight.length, 100);
  near(curved.pointAt(0).x, 0);
  near(curved.pointAt(0).y, 0);
  near(curved.pointAt(curved.length).x, 100);
  near(curved.pointAt(curved.length).y, 0);
  assert.ok(curved.length > straight.length);
  assert.ok(curved.pointAt(curved.length / 2).y > 0);
});

test('a signal segment remains on the same cubic in either traversal direction', () => {
  for (const reverse of [false, true]) {
    const geometry = travelingEdge(edge, 'cubic', reverse);
    const start = geometry.length * 0.3;
    const end = geometry.length * 0.6;
    const segment = geometry.segment(start, end);
    const numbers = [...segment.matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)].map(([number]) => Number(number));
    const tail = geometry.pointAt(start);
    const head = geometry.pointAt(end);
    near(numbers[0], tail.x);
    near(numbers[1], tail.y);
    near(numbers[6], head.x);
    near(numbers[7], head.y);
  }
});

test('directional cubic traffic uses two mirrored lanes, one per direction', () => {
  const flux = createFlux([edge], 1234, false, 'cubic-directional');
  const seen = new Set();
  for (let frame = 0; frame < 24 * 60; frame++) {
    for (const packet of flux.advance(frame / 24, 8)) {
      const middle = packet.geometry.pointAt(packet.length / 2);
      // Keep right: a→b bends below the chord, b→a above it.
      assert.ok(packet.from.id === 'a' ? middle.y > 0 : middle.y < 0);
      seen.add(`${packet.from.id}${packet.to.id}`);
    }
  }
  assert.deepEqual([...seen].sort(), ['ab', 'ba']);
  const [outgoing, returning] = laneCurves(edge);
  assert.deepEqual(edgeCurve(edge, 'cubic'), outgoing);
  for (const key of ['control1', 'control2']) {
    near(outgoing[key].y, -returning[key === 'control1' ? 'control2' : 'control1'].y);
    near(outgoing[key].x, returning[key === 'control1' ? 'control2' : 'control1'].x);
  }
  assert.equal((edgePath(edge, 'cubic').match(/ M /g) ?? []).length, 0);
  assert.equal((edgePath(edge, 'cubic-directional').match(/M /g) ?? []).length, 4);
});
