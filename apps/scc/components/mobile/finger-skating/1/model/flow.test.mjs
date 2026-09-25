import assert from "node:assert/strict";
import test from "node:test";
import { createFlowField, injectFlow, resizeFlowField, stepFlow } from "./flow.ts";

function vectorAt(field, x, y) {
  const column = Math.round((x - field.grid.left) / field.grid.spacing);
  const row = Math.round((y - field.grid.top) / field.grid.spacing);
  const index = (row * field.grid.columns + column) * 2;
  return [field.target[index], field.target[index + 1]];
}

test("a stroke creates a local forward current with curved returning flow beside it", () => {
  const field = createFlowField(390, 844);
  injectFlow(field, { x: 195, y: 320 }, { x: 195, y: 520 });
  const center = vectorAt(field, 195, 420);
  const flank = vectorAt(field, 260, 420);
  const frontFlank = vectorAt(field, 235, 370);
  const distant = vectorAt(field, 15, 20);
  assert.ok(center[1] > 2);
  assert.ok(flank[1] < -0.8);
  assert.ok(Math.abs(frontFlank[0] - 0.42) > 0.05);
  assert.ok(Math.abs(frontFlank[1]) > 0.05);
  assert.ok(Math.abs(distant[0] - 0.42) < 0.000001 && distant[1] === 0);
  assert.ok(field.active.size < 350);
});

test("motion settles at the new field, persists through resize, and accepts another gesture", () => {
  const field = createFlowField(390, 844);
  injectFlow(field, { x: 195, y: 320 }, { x: 195, y: 520 });
  const dirty = new Set();
  for (let frame = 0; frame < 100; frame += 1) stepFlow(field, 1 / 60, dirty);
  assert.equal(field.active.size, 0);
  const center = vectorAt(field, 195, 420);
  const index = (Math.round((420 - field.grid.top) / field.grid.spacing) * field.grid.columns
    + Math.round((195 - field.grid.left) / field.grid.spacing)) * 2;
  assert.ok(Math.abs(field.vectors[index + 1] - center[1]) < 0.001);
  const resized = resizeFlowField(field, 430, 932);
  assert.ok(vectorAt(resized, 195 / 390 * 430, 420 / 844 * 932)[1] > 2);
  injectFlow(field, { x: 195, y: 520 }, { x: 195, y: 320 });
  assert.ok(vectorAt(field, 195, 420)[1] < center[1]);
});
