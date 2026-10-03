import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceSweep,
  controlAtHeight,
  heightAtControl,
  isAdmitted,
  isFrontier,
} from "./threshold.ts";

test("control mapping is monotonic and invertible", () => {
  let previous = -1;
  for (let i = 0; i <= 20; i += 1) {
    const h = heightAtControl(i / 20, 541);
    assert.ok(h > previous);
    previous = h;
    assert.ok(Math.abs(controlAtHeight(h, 541) - i / 20) < 1e-9);
  }
  assert.equal(heightAtControl(0, 541), 0);
  assert.equal(heightAtControl(1, 541), 541);
  assert.equal(heightAtControl(2, 541), 541);
});

test("modes admit complementary sides of the threshold, inclusive at Z", () => {
  assert.equal(isAdmitted(20, 30, "below"), true);
  assert.equal(isAdmitted(40, 30, "below"), false);
  assert.equal(isAdmitted(40, 30, "above"), true);
  assert.equal(isAdmitted(20, 30, "above"), false);
  assert.equal(isAdmitted(30, 30, "below"), true);
  assert.equal(isAdmitted(30, 30, "above"), true);
});

test("frontier is the admitted band nearest the threshold", () => {
  assert.equal(isFrontier(99, 100, "below"), true);
  assert.equal(isFrontier(101, 100, "below"), false);
  assert.equal(isFrontier(50, 100, "below"), false);
  assert.equal(isFrontier(101, 100, "above"), true);
});

test("sweep ends at the far side of the slider", () => {
  assert.equal(advanceSweep(0.999, 1, "below"), null);
  assert.equal(advanceSweep(0.001, 1, "above"), null);
  assert.ok((advanceSweep(0.5, 1, "below") ?? 0) > 0.5);
});
