import assert from "node:assert/strict";
import test from "node:test";
import { centerOf, curveControls, easeOut, lerpPose, poseAlong, routeLayers, routeWidth, splitCubic } from "./pose.ts";

test("a piece's centre stays on the segment between its two centres at every t", () => {
  const home = { x: 10, y: 400, scale: 1 };
  const place = { x: 200, y: 20, scale: 0.4 };
  const start = centerOf(home, 100, 50);
  const end = centerOf(place, 100, 50);
  for (const t of [0, 0.25, 0.5, 0.9, 1]) {
    const center = centerOf(lerpPose(home, place, t), 100, 50);
    assert.ok(Math.abs(center.x - (start.x + (end.x - start.x) * t)) < 1e-9);
    assert.ok(Math.abs(center.y - (start.y + (end.y - start.y) * t)) < 1e-9);
  }
});

test("t = 0 is the original pose and t = 1 the sorted pose", () => {
  const home = { x: 1, y: 2, scale: 1 };
  const place = { x: 3, y: 4, scale: 0.5 };
  assert.deepEqual(lerpPose(home, place, 0), home);
  assert.deepEqual(lerpPose(home, place, 1), place);
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
});

test("route thickness grows with the travelling piece, within 0.5 to 5 px", () => {
  assert.equal(routeWidth(10, 10), 0.5);
  assert.ok(routeWidth(64, 64) > routeWidth(24, 24));
  assert.ok(routeWidth(360, 130) > routeWidth(64, 64));
  assert.equal(routeWidth(390, 390), 5);
});

test("each line splits where its piece is now", () => {
  const layers = routeLayers([{ home: { x: 0, y: 0, scale: 1 }, place: { x: 200, y: 0, scale: 1 }, width: 20, height: 10, t: 0.3 }]);
  // Centres: (10, 5) → (210, 5); 0.3 of the way is (70, 5).
  assert.deepEqual(layers.get(routeWidth(20, 10)), { travelled: "M10.0 5.0L70.0 5.0", remaining: "M70.0 5.0L210.0 5.0" });
});

test("at the ends a line is wholly light or wholly dark", () => {
  const route = { home: { x: 0, y: 0, scale: 1 }, place: { x: 100, y: 0, scale: 1 }, width: 20, height: 10 };
  assert.equal(routeLayers([{ ...route, t: 0 }]).get(routeWidth(20, 10)).travelled, "");
  assert.equal(routeLayers([{ ...route, t: 1 }]).get(routeWidth(20, 10)).remaining, "");
});

test("routes of different sizes land in different thickness groups", () => {
  const layers = routeLayers([
    { home: { x: 0, y: 0, scale: 1 }, place: { x: 100, y: 0, scale: 1 }, width: 16, height: 16, t: 0 },
    { home: { x: 0, y: 0, scale: 1 }, place: { x: 100, y: 300, scale: 0.3 }, width: 390, height: 390, t: 0 },
  ]);
  assert.deepEqual([...layers.keys()].sort((a, b) => a - b), [routeWidth(16, 16), 5]);
});

test("on the line shape poseAlong is the linear pose", () => {
  const home = { x: 10, y: 400, scale: 1 };
  const place = { x: 200, y: 20, scale: 0.4 };
  assert.deepEqual(poseAlong(home, place, 100, 50, 0.3, "line"), lerpPose(home, place, 0.3));
});

test("on the curve a piece's centre is the Bézier point at t, from end to end", () => {
  const home = { x: 0, y: 400, scale: 1 };
  const place = { x: 200, y: 0, scale: 0.5 };
  const start = centerOf(home, 40, 20);
  const end = centerOf(place, 40, 20);
  for (const t of [0, 0.3, 0.5, 1]) {
    const center = centerOf(poseAlong(home, place, 40, 20, t, "curve"), 40, 20);
    const { at } = splitCubic(start, ...curveControls(start, end), end, t);
    assert.ok(Math.abs(center.x - at.x) < 1e-9 && Math.abs(center.y - at.y) < 1e-9);
  }
});

test("the curve is a parabola bending once, upward, by 15 % of the distance at its middle", () => {
  const start = { x: 0, y: 0 };
  const end = { x: 200, y: 0 };
  const [c1, c2] = curveControls(start, end);
  const side = (t) => splitCubic(start, c1, c2, end, t).at.y;
  // Every interior point lies on one side of the chord (above it): one bend, no S.
  for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) assert.ok(side(t) < 0);
  // A quadratic's midpoint is halfway to its apex: 0.5 × 30 % × 200.
  assert.ok(Math.abs(side(0.5) + 30) < 1e-9);
  // Symmetric, as a parabola is.
  assert.ok(Math.abs(side(0.2) - side(0.8)) < 1e-9);
});

test("a downward move still arcs upward", () => {
  const start = { x: 0, y: 0 };
  const end = { x: 100, y: 300 };
  const [c1, c2] = curveControls(start, end);
  const middle = splitCubic(start, c1, c2, end, 0.5).at;
  // Above the chord means smaller y than the chord at the same x.
  assert.ok(middle.y < (middle.x / 100) * 300);
});

test("the drawn curve splits exactly at the piece's centre", () => {
  const route = { home: { x: 0, y: 400, scale: 1 }, place: { x: 200, y: 0, scale: 1 }, width: 20, height: 10, t: 0.3 };
  const layer = routeLayers([route], "curve").get(routeWidth(20, 10));
  const center = centerOf(poseAlong(route.home, route.place, 20, 10, 0.3, "curve"), 20, 10);
  const end = `${center.x.toFixed(1)} ${center.y.toFixed(1)}`;
  assert.ok(layer.travelled.startsWith("M10.0 405.0C") && layer.travelled.endsWith(end));
  assert.ok(layer.remaining.startsWith(`M${end}C`) && layer.remaining.endsWith("210.0 5.0"));
});
