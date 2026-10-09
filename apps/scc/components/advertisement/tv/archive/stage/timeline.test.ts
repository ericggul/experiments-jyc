import assert from "node:assert/strict";
import test from "node:test";
import { frameAt, presence, ramp, totalDuration, type SceneSpec } from "./timeline.ts";

const scenes: SceneSpec[] = [
  { id: "a", duration: 4, enter: { kind: "dissolve", duration: 1 } },
  { id: "b", duration: 3, enter: { kind: "cut", duration: 0 } },
  { id: "c", duration: 5, enter: { kind: "wipe", duration: 2 } },
];

test("total duration sums scenes", () => {
  assert.equal(totalDuration(scenes), 12);
});

test("cuts never carry a previous scene", () => {
  const frame = frameAt(scenes, 4.2);
  assert.equal(frame.current.id, "b");
  assert.equal(frame.previous, undefined);
  assert.equal(frame.mix, 1);
});

test("an enter transition overlaps the previous scene's tail", () => {
  const frame = frameAt(scenes, 8);
  assert.equal(frame.current.id, "c");
  assert.equal(frame.previous?.id, "b");
  assert.equal(frame.previous?.local, 4);
  assert.equal(frame.mix, 0.5);
});

test("the loop's first scene dissolves from the last", () => {
  const frame = frameAt(scenes, 12.5);
  assert.equal(frame.current.id, "a");
  assert.equal(frame.previous?.id, "c");
  assert.equal(frame.time, 0.5);
});

test("ramp and presence stay inside 0..1", () => {
  assert.equal(ramp(0, 1, 2), 0);
  assert.equal(ramp(3, 1, 2), 1);
  assert.equal(presence(5, 1, 4), 0);
  assert.equal(presence(2.5, 1, 4), 1);
});
