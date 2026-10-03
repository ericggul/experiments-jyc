import assert from "node:assert/strict";
import test from "node:test";
import { lookSpecs } from "./looks.ts";
import { createSliders, densities, layoutFor, relayoutSliders, setAlong, sliderLeft, sliderTop, stepSliders, thumbY, valueAt } from "./sliders.ts";

const insets = { top: 16, right: 16, bottom: 16, left: 16 };
const centre = (layout, index, value) => ({ x: sliderLeft(layout, index) + layout.width / 2, y: thumbY(layout, sliderTop(layout, index), value) });

test("columns are centred inside the gutters and stacks fill the height", () => {
  for (const width of [16, 20, 28]) {
    for (const rows of [1, 2, 4]) {
      const layout = layoutFor(390, 844, width, 1, rows, insets);
      const right = layout.left + layout.columns * layout.pitch - layout.gap;
      assert.ok(layout.left >= 16 && right <= 390 - 16);
      assert.ok(Math.abs(layout.left - (390 - right)) <= 1);
      const bottom = layout.top + rows * layout.rowPitch - layout.rowGap;
      assert.ok(layout.top >= 16 && bottom <= 844 - 16 && layout.top - 16 <= 2 && 844 - 16 - bottom <= 2);
    }
  }
  assert.equal(layoutFor(390, 844, 20, 1, 1, insets).columns, 13);
});

test("value and thumb position are inverse within the travel", () => {
  const layout = layoutFor(390, 844, 20, 1, 2, insets);
  const top = sliderTop(layout, layout.columns);
  for (const value of [0, 0.25, 0.5, 1]) assert.ok(Math.abs(valueAt(layout, top, thumbY(layout, top, value)) - value) < 1e-9);
  assert.equal(valueAt(layout, top, -100), 1);
  assert.equal(valueAt(layout, top, 10000), 0);
});

test("a tap sets only the slider under it", () => {
  const sliders = createSliders(layoutFor(390, 844, 20, 1, 1, insets));
  const point = centre(sliders.layout, 4, 0.8);
  assert.equal(setAlong(sliders, point, point), 1);
  sliders.target.forEach((value, index) => assert.ok(Math.abs(value - (index === 4 ? 0.8 : 0.5)) < 1e-6));
});

test("a sweep sets every crossed slider to the height of the path at its centre", () => {
  const sliders = createSliders(layoutFor(390, 844, 20, 1, 1, insets));
  const { layout } = sliders;
  const last = layout.columns - 1;
  const from = centre(layout, 0, 0.15);
  const to = centre(layout, last, 0.95);
  const changed = [];
  assert.equal(setAlong(sliders, from, to, (index) => changed.push(index)), layout.columns);
  assert.equal(changed.length, layout.columns);
  for (let column = 0; column < layout.columns; column += 1) {
    const expected = 0.15 + (0.8 * column) / last;
    assert.ok(Math.abs(sliders.target[column] - expected) < 0.02, `${column}: ${sliders.target[column]} vs ${expected}`);
  }
});

test("a sweep through one row of a stack leaves the other rows", () => {
  const sliders = createSliders(layoutFor(390, 844, 20, 1, 4, insets));
  const { layout } = sliders;
  const row = 2;
  const from = centre(layout, row * layout.columns, 0.3);
  const to = centre(layout, row * layout.columns + layout.columns - 1, 0.3);
  assert.equal(setAlong(sliders, from, to), layout.columns);
  sliders.target.forEach((value, index) => {
    const expected = Math.floor(index / layout.columns) === row ? 0.3 : 0.5;
    assert.ok(Math.abs(value - expected) < 1e-4);
  });
});

test("shown values ease to the target within 100 ms and then sleep", () => {
  const sliders = createSliders(layoutFor(390, 844, 20, 1, 1, insets));
  const point = centre(sliders.layout, 2, 1);
  setAlong(sliders, point, point);
  const dirty = new Uint8Array(sliders.target.length);
  let moving = true;
  let frames = 0;
  while (moving && frames < 100) {
    moving = stepSliders(sliders, 1 / 60, dirty);
    frames += 1;
  }
  assert.ok(frames <= 7, `${frames} frames`);
  assert.equal(sliders.shown[2], sliders.target[2]);
  assert.deepEqual([...dirty.keys()].filter((index) => dirty[index]), [2]);
  assert.equal(stepSliders(sliders, 1 / 60, new Uint8Array(sliders.target.length)), false);
});

test("relayout keeps values by column and row", () => {
  const sliders = createSliders(layoutFor(390, 844, 20, 1, 2, insets));
  sliders.target[3] = 0.9;
  sliders.target[sliders.layout.columns + 5] = 0.2;
  const taller = relayoutSliders(sliders, layoutFor(390, 844, 20, 1, 4, insets));
  const { columns } = taller.layout;
  assert.ok(Math.abs(taller.target[3] - 0.9) < 1e-6);
  assert.ok(Math.abs(taller.target[columns + 5] - 0.2) < 1e-6);
  assert.ok(Math.abs(taller.target[3 * columns + 5] - 0.2) < 1e-6);
});

test("denser settings fit about 1.5× and 2× the columns", () => {
  for (const width of [16, 20, 28]) {
    const normal = layoutFor(390, 844, width, 1, 1, insets);
    const ratio = (density) => normal.pitch / layoutFor(390, 844, width, density, 1, insets).pitch;
    assert.ok(ratio(1.5) >= 1.4 && ratio(1.5) <= 1.65, `${width}: ${ratio(1.5)}`);
    assert.ok(ratio(2) >= 1.9 && ratio(2) <= 2.05, `${width}: ${ratio(2)}`);
  }
});

test("every slider in a row shares whole-pixel ends, and no look's thumb crosses them", () => {
  for (const view of [[390, 844], [375, 667], [1024, 1366], [431.3, 932.7]]) {
    for (const width of [16, 20, 28]) {
      for (const density of densities) {
        for (const rows of [1, 2, 4]) {
          const layout = layoutFor(view[0], view[1], width, density, rows, { top: 47.5, right: 16, bottom: 50, left: 16 });
          for (const key of ["left", "top", "height", "rowGap", "width", "gap", "inset"]) assert.ok(Number.isInteger(layout[key]), key);
          assert.equal(layout.width % 2, 0);
          const bottom = layout.top + layout.rows * layout.rowPitch - layout.rowGap;
          assert.ok(layout.top >= 47 && bottom <= view[1] - 50 + 1);
          for (let index = 0; index < layout.columns * layout.rows; index += 1) {
            const top = sliderTop(layout, index);
            assert.equal(top, layout.top + Math.floor(index / layout.columns) * layout.rowPitch);
            for (const { id, reach } of lookSpecs) {
              const extent = reach * layout.width;
              // Half a pixel of size rounding plus half a pixel of device snapping.
              assert.ok(thumbY(layout, top, 1) - extent - 1 >= top - 1e-9, id);
              assert.ok(thumbY(layout, top, 0) + extent + 1 <= top + layout.height + 1e-9, id);
            }
          }
        }
      }
    }
  }
});

test("a density change keeps the curve at its place on screen", () => {
  const sliders = createSliders(layoutFor(390, 844, 20, 1, 1, insets));
  sliders.target[0] = 0.9;
  sliders.target[sliders.layout.columns - 1] = 0.1;
  const dense = relayoutSliders(sliders, layoutFor(390, 844, 20, 2, 1, insets));
  assert.ok(Math.abs(dense.target[0] - 0.9) < 1e-6);
  assert.ok(Math.abs(dense.target[dense.layout.columns - 1] - 0.1) < 1e-6);
  assert.ok(Math.abs(dense.target[Math.floor(dense.layout.columns / 2)] - 0.5) < 1e-6);
});
