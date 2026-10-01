import assert from "node:assert/strict";
import test from "node:test";
import { layoutIds, layouts, morph, nodeRadius, slides, CENTRE } from "./layout.ts";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} differs from ${b}`);

test("every panel places all 22 institutions inside the field without overlap", () => {
  assert.equal(layoutIds.length, 12);
  for (const id of layoutIds) {
    const points = layouts[id];
    assert.equal(points.filter(Boolean).length, 22, id);
    points.forEach((point, i) => {
      assert.ok(point.x - nodeRadius[i] >= 0 && point.x + nodeRadius[i] <= 400, `${id} x`);
      assert.ok(point.y - nodeRadius[i] >= 0 && point.y + nodeRadius[i] <= 400, `${id} y`);
      points.forEach((other, j) => {
        if (j > i) assert.ok(Math.hypot(point.x - other.x, point.y - other.y) >= nodeRadius[i] + nodeRadius[j], `${id}: ${i} overlaps ${j}`);
      });
    });
  }
});

test("circle panels are permutations of the same slots", () => {
  const key = ({ x, y }) => `${x.toFixed(6)},${y.toFixed(6)}`;
  const slots = new Set(layouts.a.map(key));
  for (const id of ["c", "d", "e", "f", "i"]) {
    assert.deepEqual(new Set(layouts[id].map(key)), slots, id);
  }
});

test("ring panels slide along their rings; spring and grid move in straight lines", () => {
  const radius = Math.hypot(layouts.a[0].x - CENTRE.x, layouts.a[0].y - CENTRE.y);
  for (const t of [0.25, 0.5, 0.75]) {
    for (const point of morph(layouts.a, layouts.c, t)) {
      assert.ok(Math.abs(Math.hypot(point.x - CENTRE.x, point.y - CENTRE.y) - radius) < 1e-9);
    }
  }
  assert.equal(slides("a", "c"), true);
  assert.equal(slides("j", "k"), false);
  const halfway = morph(layouts.j, layouts.k, 0.5, false);
  halfway.forEach((point, id) => {
    near((layouts.j[id].x + layouts.k[id].x) / 2, point.x);
    near((layouts.j[id].y + layouts.k[id].y) / 2, point.y);
  });
  morph(layouts.j, layouts.k, 1, false).forEach((point, id) => {
    assert.ok(Math.abs(point.x - layouts.k[id].x) < 1e-9 && Math.abs(point.y - layouts.k[id].y) < 1e-9);
  });
});
