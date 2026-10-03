import assert from "node:assert/strict";
import test from "node:test";
import { cellCentre, createLoads, gridFor, resizeLoads, restartAlong, stepLoads } from "./loads.ts";

test("the grid is centred on both axes and fits the viewport", () => {
  for (const size of [32, 48, 64, 100]) {
    const grid = gridFor(390, 844, size);
    const right = grid.left + (grid.columns - 1) * grid.pitch + grid.pitch / 2;
    const bottom = grid.top + (grid.rows - 1) * grid.pitch + grid.pitch / 2;
    assert.ok(Math.abs(grid.left - grid.pitch / 2 - (390 - right)) < 1e-9);
    assert.ok(Math.abs(grid.top - grid.pitch / 2 - (844 - bottom)) < 1e-9);
    assert.ok(right <= 390 && bottom <= 844);
  }
  assert.equal(gridFor(390, 844, 48).columns, 6);
});

test("every load runs from 0 to 100% and holds there", () => {
  const loads = createLoads(390, 844, 48, 3);
  assert.ok(loads.progress.every((value) => value === 0));
  let previous = Float32Array.from(loads.progress);
  for (let frame = 0; frame < 60 * 40; frame += 1) {
    stepLoads(loads, 1 / 60);
    for (let cell = 0; cell < previous.length; cell += 1) assert.ok(loads.progress[cell] >= previous[cell]);
    previous = Float32Array.from(loads.progress);
  }
  assert.equal(stepLoads(loads, 1), false);
  assert.ok(loads.progress.every((value) => value === 1));
});

test("loads progress at different paces", () => {
  const loads = createLoads(390, 844, 48, 5);
  stepLoads(loads, 4);
  const values = [...loads.progress];
  assert.ok(Math.max(...values) - Math.min(...values) > 0.2);
});

test("a skated segment restarts only the cells it passes through", () => {
  const loads = createLoads(390, 844, 48, 7);
  stepLoads(loads, 60);
  const { grid } = loads;
  const row = 4;
  const from = cellCentre(grid, row * grid.columns);
  const to = cellCentre(grid, row * grid.columns + grid.columns - 1);
  assert.equal(restartAlong(loads, from, to), grid.columns);
  for (let cell = 0; cell < loads.progress.length; cell += 1) {
    assert.equal(loads.progress[cell], Math.floor(cell / grid.columns) === row ? 0 : 1);
  }
  assert.equal(stepLoads(loads, 0.01), true);
});

test("resizing keeps loads at the same row and column", () => {
  const loads = createLoads(390, 844, 48, 9);
  stepLoads(loads, 3);
  const resized = resizeLoads(loads, 390, 760);
  assert.equal(resized.grid.columns, loads.grid.columns);
  for (let cell = 0; cell < resized.progress.length; cell += 1) assert.equal(resized.progress[cell], loads.progress[cell]);
});
