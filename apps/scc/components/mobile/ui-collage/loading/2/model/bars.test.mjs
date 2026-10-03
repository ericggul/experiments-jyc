import assert from "node:assert/strict";
import test from "node:test";
import { createLoads, resizeLoads, seekAlong, rowTop, rowsFor, segmentHitsRect, stepLoads } from "./bars.ts";

const phone = { left: 16, top: 16, right: 374, bottom: 828 };

test("rows are centred vertically, fit the bounds, and fill a phone", () => {
  for (const thickness of [8, 16, 24, 40]) {
    const rows = rowsFor(phone, thickness);
    const bottom = rowTop(rows, rows.count - 1) + thickness;
    assert.ok(rows.top >= phone.top && bottom <= phone.bottom);
    assert.ok(Math.abs(rows.top - phone.top - (phone.bottom - bottom)) <= 1);
    assert.ok(rows.count >= 10);
    assert.ok(Number.isInteger(rows.pitch));
  }
  const standard = rowsFor(phone, 24).count;
  assert.ok(standard >= 15 && standard <= 30);
});

test("every bar runs from 0 to 100% and holds there", () => {
  const loads = createLoads(phone, 24, 3);
  assert.ok(loads.progress.every((value) => value === 0));
  let previous = Float32Array.from(loads.progress);
  for (let frame = 0; frame < 60 * 40; frame += 1) {
    stepLoads(loads, 1 / 60);
    for (let row = 0; row < previous.length; row += 1) assert.ok(loads.progress[row] >= previous[row]);
    previous = Float32Array.from(loads.progress);
  }
  assert.equal(stepLoads(loads, 1), false);
  assert.ok(loads.progress.every((value) => value === 1));
});

test("bars progress at different paces", () => {
  const loads = createLoads(phone, 24, 5);
  stepLoads(loads, 4);
  const values = [...loads.progress];
  assert.ok(Math.max(...values) - Math.min(...values) > 0.2);
});

test("segment test against rectangles", () => {
  assert.equal(segmentHitsRect({ x: 0, y: 5 }, { x: 100, y: 5 }, 10, 0, 20, 10), true);
  assert.equal(segmentHitsRect({ x: 0, y: 15 }, { x: 100, y: 15 }, 10, 0, 20, 10), false);
  assert.equal(segmentHitsRect({ x: 15, y: -50 }, { x: 15, y: 50 }, 10, 0, 20, 10), true);
  assert.equal(segmentHitsRect({ x: 12, y: 3 }, { x: 12, y: 3 }, 10, 0, 20, 10), true);
  assert.equal(segmentHitsRect({ x: 0, y: 30 }, { x: 30, y: 12 }, 10, 0, 20, 10), false);
});

test("a skated segment sets each crossed bar to where the finger crosses it", () => {
  const loads = createLoads(phone, 24, 7);
  stepLoads(loads, 60);
  const { rows } = loads;
  const middle = (row) => rowTop(rows, row) + rows.thickness / 2;
  const at = (fraction) => rows.left + fraction * (rows.right - rows.left);
  // A vertical stroke through the middle of the screen leaves rows 3–6 at 50%.
  assert.equal(seekAlong(loads, { x: at(0.5), y: middle(3) - 2 }, { x: at(0.5), y: middle(6) + 2 }), 4);
  for (let row = 0; row < rows.count; row += 1) assert.ok(Math.abs(loads.progress[row] - (row >= 3 && row <= 6 ? 0.5 : 1)) < 1e-6);
  // A diagonal stroke crosses each row's centre line at a different x.
  assert.equal(seekAlong(loads, { x: at(0.2), y: middle(10) }, { x: at(0.8), y: middle(12) }), 3);
  assert.ok(Math.abs(loads.progress[10] - 0.2) < 1e-6);
  assert.ok(Math.abs(loads.progress[11] - 0.5) < 1e-6);
  assert.ok(Math.abs(loads.progress[12] - 0.8) < 1e-6);
  // Dragging along one bar scrubs it; a tap sets it.
  seekAlong(loads, { x: at(0.1), y: middle(14) }, { x: at(0.9), y: middle(14) + 1 });
  assert.ok(Math.abs(loads.progress[14] - 0.9) < 1e-6);
  assert.equal(seekAlong(loads, { x: at(0.25), y: middle(9) }, { x: at(0.25), y: middle(9) }), 1);
  assert.ok(Math.abs(loads.progress[9] - 0.25) < 1e-6);
  // Outside the horizontal extent nothing moves; a seeked bar carries on loading.
  assert.equal(seekAlong(loads, { x: 4, y: middle(2) }, { x: 4, y: middle(8) }), 0);
  assert.equal(stepLoads(loads, 0.01), true);
  stepLoads(loads, 60);
  assert.equal(loads.progress[3], 1);
});

test("resizing keeps rows by index", () => {
  const loads = createLoads(phone, 24, 9);
  stepLoads(loads, 3);
  const resized = resizeLoads(loads, { ...phone, bottom: 700 });
  assert.ok(resized.rows.count < loads.rows.count);
  for (let row = 0; row < resized.rows.count; row += 1) assert.equal(resized.progress[row], loads.progress[row]);
});
