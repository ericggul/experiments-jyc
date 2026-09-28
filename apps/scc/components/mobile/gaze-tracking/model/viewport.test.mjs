import assert from "node:assert/strict";
import test from "node:test";
import { placeInViewport } from "./viewport.ts";

test("a large circle does not pin the gaze target to the middle of a short viewport", () => {
  const height = 240;
  assert.equal(placeInViewport({ x: 0.5, y: 0.05 }, 390, height).y, 12);
  assert.equal(placeInViewport({ x: 0.5, y: 0.95 }, 390, height).y, 228);
});

test("small gaze markers can travel to the lower mobile screen", () => {
  assert.equal(placeInViewport({ x: 0.5, y: 0.88 }, 390, 844).y, 742.72);
});
