import assert from "node:assert/strict";
import test from "node:test";
import { createBodies } from "./layout.ts";
import { PHYSICAL, pointIndex, VIEWS, viewTargets, VIRTUAL } from "./views.ts";

const COUNT = 240;

for (const frame of [{ width: 1440, height: 760 }, { width: 390, height: 700 }]) {
  test(`every view keeps both copies inside the frame (${frame.width}×${frame.height})`, () => {
    const bodies = createBodies(COUNT, frame);
    const out = new Float64Array(COUNT * 4);
    for (const view of VIEWS) {
      viewTargets(view.id, bodies, COUNT, frame, out);
      for (let index = 0; index < COUNT * 2; index += 1) {
        assert.ok(out[index * 2]! >= 0 && out[index * 2]! <= frame.width, view.id);
        assert.ok(out[index * 2 + 1]! >= 0 && out[index * 2 + 1]! <= frame.height, view.id);
      }
    }
  });

  test(`layers separate the copies but keep matching positions (${frame.width}×${frame.height})`, () => {
    const bodies = createBodies(COUNT, frame);
    const out = new Float64Array(COUNT * 4);
    viewTargets("overlay", bodies, COUNT, frame, out);
    for (let person = 0; person < COUNT; person += 1) {
      assert.equal(out[pointIndex(VIRTUAL, person, COUNT)], out[pointIndex(PHYSICAL, person, COUNT)]);
    }
    viewTargets("layers", bodies, COUNT, frame, out);
    const axis = frame.width >= frame.height ? 0 : 1;
    let virtualFar = -Infinity;
    let physicalNear = Infinity;
    const shifts = new Set<string>();
    for (let person = 0; person < COUNT; person += 1) {
      const virtual = pointIndex(VIRTUAL, person, COUNT);
      const physical = pointIndex(PHYSICAL, person, COUNT);
      virtualFar = Math.max(virtualFar, out[virtual + axis]!);
      physicalNear = Math.min(physicalNear, out[physical + axis]!);
      shifts.add(`${(out[physical]! - out[virtual]!).toFixed(6)},${(out[physical + 1]! - out[virtual + 1]!).toFixed(6)}`);
    }
    assert.ok(virtualFar < physicalNear);
    // One constant offset: the two copies of a person are the same point translated.
    assert.equal(shifts.size, 1);
  });
}
