import assert from "node:assert/strict";
import test from "node:test";
import { formatTime, loopTime, sceneIndexAt, stepAt } from "./timeline.ts";

const scenes = [
  { id: "a", label: "A", start: 0, end: 4 },
  { id: "b", label: "B", start: 4, end: 9 },
  { id: "c", label: "C", start: 9, end: 12 },
];

test("scene index follows start times", () => {
  assert.equal(sceneIndexAt(scenes, 0), 0);
  assert.equal(sceneIndexAt(scenes, 3.99), 0);
  assert.equal(sceneIndexAt(scenes, 4), 1);
  assert.equal(sceneIndexAt(scenes, 11.9), 2);
});

test("loop time wraps both directions", () => {
  assert.equal(loopTime(13, 12), 1);
  assert.equal(loopTime(-1, 12), 11);
});

test("step lookup returns the latest started step", () => {
  const steps = [{ at: 0, v: "x" }, { at: 2, v: "y" }];
  assert.equal(stepAt(steps, 1.9)?.v, "x");
  assert.equal(stepAt(steps, 2)?.v, "y");
  assert.equal(stepAt(steps, -1), undefined);
});

test("time format is m:ss", () => {
  assert.equal(formatTime(77.3), "1:17");
});
