import assert from "node:assert/strict";
import test from "node:test";
import { beginFrame, createBundler, curvePoint, linkPoint, POINTS, prune, relaxBundles, report } from "./bundling.ts";

/** Two parallel links 40 px apart, and a third crossing them at right angles. */
const points = Float64Array.from([0, 0, 400, 0, 0, 40, 400, 40, 200, -200, 200, 240]);

function frame(bundler: ReturnType<typeof createBundler>, pairs: readonly (readonly [number, number])[]) {
  beginFrame(bundler);
  for (const [from, to] of pairs) report(bundler, from, to, 1);
  prune(bundler);
  relaxBundles(bundler, points, 1 / 60);
}

function middleGap(bundler: ReturnType<typeof createBundler>) {
  const a = bundler.links.get(0 * 65_536 + 1)!;
  const b = bundler.links.get(2 * 65_536 + 3)!;
  const p = linkPoint(a, points, POINTS >> 1, { x: 0, y: 0 });
  const q = linkPoint(b, points, POINTS >> 1, { x: 0, y: 0 });
  return Math.hypot(p.x - q.x, p.y - q.y);
}

test("parallel links comb together; a crossing link stays straight", () => {
  const bundler = createBundler();
  const pairs = [[0, 1], [2, 3], [4, 5]] as const;
  for (let step = 0; step < 240; step += 1) frame(bundler, pairs);
  assert.ok(middleGap(bundler) < 40 * 0.4, `gap ${middleGap(bundler).toFixed(1)} px`);
  const crossing = bundler.links.get(4 * 65_536 + 5)!;
  const bend = Math.max(...Array.from(crossing.offsets, Math.abs));
  assert.ok(bend < 1, `crossing link bent ${bend.toFixed(2)} px`);
});

test("ends stay on their pages and the curve passes through its points", () => {
  const bundler = createBundler();
  for (let step = 0; step < 60; step += 1) frame(bundler, [[0, 1], [2, 3]]);
  const link = bundler.links.get(1)!;
  assert.deepEqual(curvePoint(link, points, 0, { x: 0, y: 0 }), { x: 0, y: 0 });
  const end = curvePoint(link, points, 1, { x: 0, y: 0 });
  assert.ok(Math.hypot(end.x - 400, end.y) < 1e-9);
  const middle = linkPoint(link, points, 5, { x: 0, y: 0 });
  const onCurve = curvePoint(link, points, 5 / (POINTS - 1), { x: 0, y: 0 });
  assert.ok(Math.hypot(middle.x - onCurve.x, middle.y - onCurve.y) < 1e-9);
});

test("a dropped link is forgotten and its partner relaxes back toward its chord", () => {
  const bundler = createBundler();
  for (let step = 0; step < 240; step += 1) frame(bundler, [[0, 1], [2, 3]]);
  const combed = middleGap(bundler);
  for (let step = 0; step < 600; step += 1) frame(bundler, [[0, 1]]);
  assert.equal(bundler.links.size, 1);
  assert.equal(bundler.list[0]!.row, 0);
  const alone = bundler.links.get(1)!;
  const bend = Math.max(...Array.from(alone.offsets, Math.abs));
  assert.ok(bend < (40 - combed) / 2, `still bent ${bend.toFixed(1)} px`);
});
