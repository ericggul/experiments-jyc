import assert from "node:assert/strict";
import test from "node:test";
import { columnLeft, createColumns, followColumns, followTime, layoutFor, springDamping, relayoutColumns, setAlong, valueAt, valueY } from "./columns.ts";

const phone = { left: 0, top: 0, right: 390, bottom: 844 };

test("columns fill the bounds edge to edge with small gaps", () => {
  for (const width of [12, 16, 20, 28]) {
    const layout = layoutFor(phone, width);
    const minimum = Math.max(2, Math.round(width / 8));
    assert.equal(layout.left, phone.left);
    assert.ok(Math.abs(columnLeft(layout, layout.count - 1) + width - phone.right) < 1e-9);
    assert.ok(layout.gap >= minimum && layout.gap < 2 * minimum + width);
    assert.ok(layout.count >= 10);
  }
});

test("values map to heights: bottom is 0, top is 1, beyond clamps", () => {
  const layout = layoutFor(phone, 16);
  assert.equal(valueAt(layout, 844), 0);
  assert.equal(valueAt(layout, 0), 1);
  assert.equal(valueAt(layout, 422), 0.5);
  assert.equal(valueAt(layout, 900), 0);
  assert.equal(valueAt(layout, -20), 1);
  assert.equal(valueY(layout, 0.25), 633);
});

test("a tap sets one column; a sweep draws the finger's heights; a vertical drag sets one column", () => {
  const columns = createColumns(phone, 16);
  const { layout } = columns;
  assert.ok(columns.target.every((value) => value === 0.5));
  const centre = (column) => columnLeft(layout, column) + layout.width / 2;
  assert.equal(setAlong(columns, { x: centre(3), y: 211 }, { x: centre(3), y: 211 }), 1);
  assert.equal(columns.target[3], 0.75);
  assert.equal(columns.target[2], 0.5);
  // A diagonal sweep from column 5 at the bottom to column 9 at the top leaves a ramp.
  const moved = [];
  setAlong(columns, { x: centre(5), y: 844 }, { x: centre(9), y: 0 }, (column, previous) => moved.push([column, previous]));
  assert.deepEqual(moved.map(([column]) => column), [5, 6, 7, 8, 9]);
  for (let column = 5; column < 9; column += 1) assert.ok(columns.target[column] < columns.target[column + 1]);
  assert.ok(Math.abs(columns.target[7] - 0.5) < 1e-6);
  assert.equal(columns.target[9], 1);
  // A vertical drag inside one column scrubs it.
  setAlong(columns, { x: centre(12), y: 700 }, { x: centre(12) + 2, y: 100 });
  assert.ok(Math.abs(columns.target[12] - valueAt(layout, 100)) < 1e-6);
  assert.equal(columns.target[11], 0.5);
  assert.equal(columns.target[13], 0.5);
});

test("the drawn column glides to its target and settles without overshoot", () => {
  const columns = createColumns(phone, 16);
  columns.target[4] = 1;
  let previous = columns.shown[4];
  for (let frame = 0; frame < 60 * followTime * 6; frame += 1) {
    followColumns(columns, 1 / 60);
    assert.ok(columns.shown[4] >= previous - 1e-6 && columns.shown[4] <= 1);
    previous = columns.shown[4];
  }
  assert.ok(Math.abs(columns.shown[4] - 1) < 0.01);
  for (let frame = 0; frame < 120; frame += 1) followColumns(columns, 1 / 60);
  assert.equal(followColumns(columns, 1 / 60), false);
});

test("relayout keeps values in place on screen", () => {
  const columns = createColumns(phone, 16);
  columns.target.forEach((_, column) => (columns.target[column] = column / columns.target.length));
  const wider = relayoutColumns(columns, phone, 28);
  for (let column = 0; column < wider.layout.count; column += 1) {
    const centre = columnLeft(wider.layout, column) + 14;
    const old = columns.layout;
    const nearest = Math.round((centre - old.left - old.width / 2) / old.pitch);
    assert.equal(wider.target[column], columns.target[nearest]);
  }
});

test("용수철 overshoots the finger's height, bounces back, and settles there", () => {
  const columns = createColumns(phone, 16);
  columns.target[2] = 0.9;
  let peak = 0;
  let crossings = 0;
  let above = false;
  for (let frame = 0; frame < 60 * 3; frame += 1) {
    followColumns(columns, 1 / 60, "spring");
    peak = Math.max(peak, columns.shown[2]);
    const nowAbove = columns.shown[2] > 0.9;
    if (nowAbove !== above) crossings += 1;
    above = nowAbove;
  }
  // Jumping 0.4 with ζ = 0.25 overshoots by about 44%: a peak near 1.08.
  const expected = 0.9 + 0.4 * Math.exp((-Math.PI * springDamping) / Math.sqrt(1 - springDamping ** 2));
  assert.ok(Math.abs(peak - expected) < 0.01);
  assert.ok(crossings >= 3);
  for (let frame = 0; frame < 60 * 3; frame += 1) followColumns(columns, 1 / 60, "spring");
  assert.equal(followColumns(columns, 1 / 60, "spring"), false);
  assert.equal(columns.shown[2], columns.target[2]);
  // The same motion at 30 fps.
  const slower = createColumns(phone, 16);
  slower.target[2] = 0.9;
  const faster = createColumns(phone, 16);
  faster.target[2] = 0.9;
  for (let frame = 0; frame < 9; frame += 1) followColumns(slower, 1 / 30, "spring");
  for (let frame = 0; frame < 18; frame += 1) followColumns(faster, 1 / 60, "spring");
  assert.ok(Math.abs(slower.shown[2] - faster.shown[2]) < 1e-6);
});
