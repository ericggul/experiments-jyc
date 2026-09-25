import assert from "node:assert/strict";
import test from "node:test";
import {
  alignSegment,
  createSampledField,
  gridForViewport,
  influenceRadiusForViewport,
  resizeField,
} from "./field.ts";

test("mobile field keeps more than 1000 evenly spaced arrows and the prior pixel radius", () => {
  for (const [width, height] of [[320, 568], [375, 812], [390, 844], [430, 932]]) {
    const grid = gridForViewport(width, height);
    assert.ok(grid.columns * grid.rows >= 1000 && grid.columns * grid.rows <= 1400);
    assert.ok(grid.spacing > 0);
    assert.ok(grid.left > 0 && grid.top > 0);
  }
  assert.ok(Math.abs(influenceRadiusForViewport(390, 844) - 2.4 * Math.sqrt(390 * 844 / 360)) < 1e-10);
  assert.equal(influenceRadiusForViewport(1440, 900), 96);
});

test("travel direction fades continuously with distance from the path", () => {
  const field = createSampledField(390, 844);
  const gesture = new Map();
  const dirty = new Set();
  alignSegment(field, { x: 195, y: 350 }, { x: 195, y: 490 }, gesture, dirty);
  const row = Math.round((420 - field.grid.top) / field.grid.spacing);
  const columns = [195, 195 + field.radius * 0.4, 195 + field.radius * 0.7, 195 + field.radius * 1.2]
    .map((x) => Math.round((x - field.grid.left) / field.grid.spacing));
  const angles = columns.map((column) => {
    const index = (row * field.grid.columns + column) * 2;
    return Math.atan2(field.vectors[index + 1], field.vectors[index]);
  });
  assert.ok(angles[0] > 1.4);
  assert.ok(angles[0] > angles[1] && angles[1] > angles[2] && angles[2] > angles[3]);
  assert.equal(angles[3], 0);
  assert.ok(dirty.size > 40 && dirty.size < 220);

  const once = field.vectors.slice();
  alignSegment(field, { x: 195, y: 350 }, { x: 195, y: 490 }, gesture, dirty);
  assert.deepEqual(field.vectors, once);
});

test("later gesture reverses the persistent path while distant arrows stay unchanged", () => {
  const field = createSampledField(390, 844);
  alignSegment(field, { x: 250, y: 400 }, { x: 175, y: 400 }, new Map());
  const row = Math.round((400 - field.grid.top) / field.grid.spacing);
  const column = Math.round((205 - field.grid.left) / field.grid.spacing);
  const index = (row * field.grid.columns + column) * 2;
  assert.ok(field.vectors[index] < -0.9);
  assert.equal(field.vectors[0], 1);
  assert.equal(field.vectors[1], 0);

  const resized = resizeField(field, 430, 932);
  const resizedRow = Math.round((400 / 844 * 932 - resized.grid.top) / resized.grid.spacing);
  const resizedColumn = Math.round((205 / 390 * 430 - resized.grid.left) / resized.grid.spacing);
  assert.ok(resized.vectors[(resizedRow * resized.grid.columns + resizedColumn) * 2] < -0.9);

  alignSegment(field, { x: 175, y: 400 }, { x: 250, y: 400 }, new Map());
  assert.ok(field.vectors[index] > 0.9);
});
