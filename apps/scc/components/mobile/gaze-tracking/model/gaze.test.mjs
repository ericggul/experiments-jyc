import assert from "node:assert/strict";
import test from "node:test";
import { readEyeRatios } from "./gaze.ts";
import { projectGaze } from "./project.ts";

function landmarks(pupilY = 0.5, lidsY = 0.5, pupilX = 0.45) {
  const points = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const index of [33, 362]) points[index] = { x: 0.4, y: 0.5, z: 0 };
  for (const index of [133, 263]) points[index] = { x: 0.5, y: 0.5, z: 0 };
  for (const index of [159, 386]) points[index] = { x: 0.45, y: lidsY - 0.015, z: 0 };
  for (const index of [145, 374]) points[index] = { x: 0.45, y: lidsY + 0.015, z: 0 };
  points[468] = { x: pupilX, y: pupilY, z: 0 };
  points[473] = { x: pupilX, y: pupilY, z: 0 };
  return points;
}

function lookScores(down = 0, up = 0) {
  return ["Left", "Right"].flatMap((eye) => [
    { categoryName: `eyeLookDown${eye}`, score: down },
    { categoryName: `eyeLookUp${eye}`, score: up },
  ]);
}

test("both irises are located relative to their eye corners", () => {
  const eyes = readEyeRatios(landmarks());
  assert.ok(eyes);
  assert.ok(Math.abs(eyes.left.x - 0.5) < 0.001);
  assert.ok(Math.abs(eyes.right.x - 0.5) < 0.001);
});

test("neutral gaze stays near the middle even when the iris sits above the eye corners", () => {
  const center = readEyeRatios(landmarks(0.485, 0.485), 1, lookScores());
  assert.ok(center);
  assert.equal(projectGaze(center).left.y, 0.5);
  const fallback = readEyeRatios(landmarks(0.485, 0.485));
  assert.ok(fallback);
  assert.ok(Math.abs(projectGaze(fallback).left.y - 0.5) < 1e-12);
});

test("downward gaze remains visible when the lids follow the iris", () => {
  const center = readEyeRatios(landmarks(), 1, lookScores());
  const down = readEyeRatios(landmarks(0.52, 0.52), 1, lookScores(0.75));
  assert.ok(center && down);
  assert.ok(projectGaze(down).left.y > 0.85);
  assert.ok(down.left.y > center.left.y + 0.3);
  // The former iris-between-lids ratio stays 0.5 in both frames.
  assert.ok(Math.abs((0.52 - (0.52 - 0.015)) / 0.03 - 0.5) < 1e-12);
});

test("closed eyes do not leave a false gaze reading", () => {
  const points = landmarks();
  points[145] = { x: 0.45, y: 0.486, z: 0 };
  assert.equal(readEyeRatios(points), null);
});

const eyes = (x, y) => ({ left: { x, y }, right: { x, y } });

test("a small downward eye motion reaches the lower mobile viewport without setup", () => {
  const ratios = readEyeRatios(landmarks(0.52, 0.52, 0.4485), 1, lookScores(0.75));
  assert.ok(ratios);
  const result = projectGaze(ratios);
  assert.ok(result.left.y * 844 > 740);
  assert.ok(result.left.x > 0.5);
  assert.ok(result.right.y < 1);
});

test("projection remains smooth and bounded across both gaze directions", () => {
  const top = projectGaze(eyes(0.5, 0.2)).left.y;
  const center = projectGaze(eyes(0.5, 0.5)).left.y;
  const bottom = projectGaze(eyes(0.5, 0.9)).left.y;
  assert.ok(top < center && center < bottom);
  assert.ok(top >= 0 && bottom <= 1);
});
