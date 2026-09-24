import assert from "node:assert/strict";
import test from "node:test";
import { easePoint } from "./motion.ts";

test("dots approach the latest gaze target without overshooting", () => {
  const point = easePoint({ x: 0.2, y: 0.8 }, { x: 0.8, y: 0.2 }, 16);
  assert.ok(point.x > 0.2 && point.x < 0.8);
  assert.ok(point.y < 0.8 && point.y > 0.2);
});

test("motion is nearly identical across frame rates", () => {
  const start = { x: 0.1, y: 0.1 };
  const target = { x: 0.9, y: 0.7 };
  const twoFrames = easePoint(easePoint(start, target, 20), target, 20);
  const fourFrames = Array.from({ length: 4 }).reduce(
    (point) => easePoint(point, target, 10),
    start,
  );
  assert.ok(Math.abs(twoFrames.x - fourFrames.x) < 0.00001);
  assert.ok(Math.abs(twoFrames.y - fourFrames.y) < 0.00001);
});
