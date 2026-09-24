import assert from "node:assert/strict";
import test from "node:test";
import { projectGaze, readEyeRatios } from "./gaze.ts";

function landmarks(rightPupil = 0.45, leftPupil = 0.45) {
  const points = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const index of [33, 362]) points[index] = { x: 0.4, y: 0.5, z: 0 };
  for (const index of [133, 263]) points[index] = { x: 0.5, y: 0.5, z: 0 };
  for (const index of [159, 386]) points[index] = { x: 0.45, y: 0.485, z: 0 };
  for (const index of [145, 374]) points[index] = { x: 0.45, y: 0.515, z: 0 };
  points[468] = { x: rightPupil, y: 0.5, z: 0 };
  points[473] = { x: leftPupil, y: 0.5, z: 0 };
  return points;
}

test("both irises are located relative to their eye corners", () => {
  const eyes = readEyeRatios(landmarks());
  assert.ok(eyes);
  assert.ok(Math.abs(eyes.left.x - 0.5) < 0.001);
  assert.ok(Math.abs(eyes.right.x - 0.5) < 0.001);
});

test("front camera horizontal motion is reversed into the person's direction", () => {
  const eyes = readEyeRatios(landmarks(0.43, 0.43));
  assert.ok(eyes);
  assert.ok(projectGaze(eyes.left).x > 0.5);
  assert.ok(projectGaze(eyes.right).x > 0.5);
});

test("closed eyes do not leave a false gaze reading", () => {
  const points = landmarks();
  points[145] = { x: 0.45, y: 0.486, z: 0 };
  assert.equal(readEyeRatios(points), null);
});
