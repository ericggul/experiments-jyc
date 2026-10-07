import assert from "node:assert/strict";
import test from "node:test";
import {
  beginStroke, continueStroke, createVortexField, remesh, resizeVortexField, stepVortexField, velocityAt,
} from "./vortex.ts";

function skate(field, from, to, milliseconds) {
  const stroke = beginStroke(from, 0);
  const steps = 20;
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    continueStroke(field, stroke, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, milliseconds * t);
  }
}

const circulation = (blobs) => blobs.reduce((sum, blob) => sum + blob.gamma, 0);

test("the layer starts at rest and a skate induces a jet along its path with return flow beside it", () => {
  const field = createVortexField(390, 844);
  assert.equal(field.maximumSpeed, 0);
  skate(field, { x: 195, y: 300 }, { x: 195, y: 540 }, 400);
  const [cx, cy] = velocityAt(field.blobs, 195, 420);
  const [, side] = velocityAt(field.blobs, 195 + 70, 420);
  assert.ok(cy > 100, `jet ${cy}`);
  assert.ok(Math.abs(cx) < cy * 0.05);
  assert.ok(side < 0, `return flow ${side}`);
  assert.ok(Math.abs(circulation(field.blobs)) < 1e-6);
});

test("the change is global: a distant point moves although no arrow was touched", () => {
  const field = createVortexField(390, 844);
  skate(field, { x: 120, y: 200 }, { x: 260, y: 200 }, 250);
  const [vx, vy] = velocityAt(field.blobs, 195, 700);
  assert.ok(Math.hypot(vx, vy) > 0.5);
});

test("faster skating deposits a stronger field for the same path", () => {
  const slow = createVortexField(390, 844);
  const fast = createVortexField(390, 844);
  skate(slow, { x: 195, y: 300 }, { x: 195, y: 540 }, 1200);
  skate(fast, { x: 195, y: 300 }, { x: 195, y: 540 }, 300);
  assert.equal(slow.blobs.length, fast.blobs.length);
  assert.ok(velocityAt(fast.blobs, 195, 420)[1] > 2.5 * velocityAt(slow.blobs, 195, 420)[1]);
});

test("the deposited dipole carries itself forward after release, then returns to rest", () => {
  const field = createVortexField(390, 844);
  skate(field, { x: 195, y: 500 }, { x: 195, y: 560 }, 120);
  const centroid = () => {
    const positive = field.blobs.filter((blob) => blob.gamma > 0);
    return positive.reduce((sum, blob) => sum + blob.y, 0) / positive.length;
  };
  const before = centroid();
  for (let frame = 0; frame < 24; frame += 1) stepVortexField(field, 1 / 24);
  assert.ok(centroid() > before + 5, `${before} -> ${centroid()}`);
  let moving = true;
  for (let frame = 0; frame < 24 * 240 && moving; frame += 1) moving = stepVortexField(field, 1 / 24);
  assert.equal(moving, false);
  assert.equal(field.blobs.length, 0);
});

test("a dipole meeting the screen edge stays inside and slides apart along it", () => {
  const field = createVortexField(390, 844);
  skate(field, { x: 195, y: 640 }, { x: 195, y: 720 }, 100);
  const spread = () => {
    const positive = field.blobs.filter((blob) => blob.gamma > 0);
    const negative = field.blobs.filter((blob) => blob.gamma < 0);
    const mean = (blobs) => blobs.reduce((sum, blob) => sum + blob.x, 0) / blobs.length;
    return Math.abs(mean(positive) - mean(negative));
  };
  const before = spread();
  for (let frame = 0; frame < 24 * 8; frame += 1) stepVortexField(field, 1 / 24);
  assert.ok(field.blobs.every((blob) => blob.x >= 0 && blob.x <= 390 && blob.y >= 0 && blob.y <= 844));
  assert.ok(spread() > before * 1.5, `${before} -> ${spread()}`);
});

test("remeshing bounds the blob count while conserving circulation", () => {
  const field = createVortexField(390, 844);
  for (let pass = 0; pass < 6; pass += 1) skate(field, { x: 40, y: 100 + pass * 9 }, { x: 350, y: 700 - pass * 9 }, 300);
  const total = circulation(field.blobs);
  remesh(field);
  assert.ok(field.blobs.length <= 360);
  assert.ok(Math.abs(circulation(field.blobs) - total) < 1e-2);
});

test("resize keeps the field relative to the viewport", () => {
  const field = createVortexField(390, 844);
  skate(field, { x: 195, y: 300 }, { x: 195, y: 540 }, 400);
  const resized = resizeVortexField(field, 844, 390);
  assert.ok(velocityAt(resized.blobs, 422, 195)[1] > 50);
});
