import assert from "node:assert/strict";
import test from "node:test";
import {
  crossfadeGains,
  originalLoopForSource,
  positionAt,
  resolvePlayPosition,
  sourceOffsetForPosition,
  wrapPosition,
} from "./transport.ts";

const loop = { enabled: true, start: 2, end: 4 };

test("position progresses at rate without an unnecessary transport clock", () => {
  assert.equal(positionAt({ anchor: 1, elapsed: 1.5, duration: 8, rate: 1.25, reverse: false, loop: { ...loop, enabled: false } }), 2.875);
  const reanchor = positionAt({ anchor: 1, elapsed: 1, duration: 8, rate: 1.25, reverse: false, loop: { ...loop, enabled: false } });
  assert.equal(positionAt({ anchor: reanchor, elapsed: 0, duration: 8, rate: 0.5, reverse: false, loop: { ...loop, enabled: false } }), reanchor);
  assert.equal(positionAt({ anchor: reanchor, elapsed: 1, duration: 8, rate: 0.5, reverse: false, loop: { ...loop, enabled: false } }), 2.75);
});

test("reverse looping wraps at the original timeline boundary", () => {
  assert.equal(positionAt({ anchor: 2.25, elapsed: 0.5, duration: 8, rate: 1, reverse: true, loop }), 3.75);
  assert.equal(wrapPosition(4.5, loop, 8), 2.5);
  assert.deepEqual(originalLoopForSource(loop, 8, true), { start: 4, end: 6 });
  assert.equal(sourceOffsetForPosition(2.25, 8, true), 5.75);
  assert.equal(resolvePlayPosition(2, 8, true, loop), 3.9995);
  assert.equal(resolvePlayPosition(0, 8, true, { ...loop, enabled: false }), 7.9995);
  assert.equal(resolvePlayPosition(8, 8, false, { ...loop, enabled: false }), 0);
});

test("equal-power crossfade reaches each deck cleanly", () => {
  const left = crossfadeGains(-1);
  const centre = crossfadeGains(0);
  const right = crossfadeGains(1);
  assert.ok(Math.abs(left.a - 1) < 1e-12 && Math.abs(left.b) < 1e-12);
  assert.ok(Math.abs(centre.a - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(centre.b - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(right.a) < 1e-12 && Math.abs(right.b - 1) < 1e-12);
});
