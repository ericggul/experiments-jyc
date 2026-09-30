import assert from "node:assert/strict";
import test from "node:test";
import { allLinks, nodes } from "./configurations.ts";
import { linkCurve } from "../view/geometry.ts";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} differs from ${b}`);
const mirrorX = ({ x, y }) => ({ x: 400 - x, y });
const mirrorY = ({ x, y }) => ({ x, y: 400 - y });
const key = ({ from, to }) => `${from}>${to}`;

// Node ids under the layout's mirrors.
const horizontal = { 1: 2, 2: 1, 3: 4, 4: 3, 5: 6, 6: 5, 7: 8, 8: 7 };
const vertical = { 1: 3, 3: 1, 2: 4, 4: 2, 5: 7, 7: 5, 6: 8, 8: 6 };

test("reciprocal lanes mirror each other across their chord", () => {
  for (const [a, b] of [[1, 3], [3, 4]]) {
    const out = linkCurve(`${a}>${b}`, a, b).curve;
    const back = linkCurve(`${b}>${a}`, b, a).curve;
    const [p, q] = [nodes.find(({ id }) => id === a), nodes.find(({ id }) => id === b)];
    const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const length = Math.hypot(q.x - p.x, q.y - p.y);
    const [ux, uy] = [(q.x - p.x) / length, (q.y - p.y) / length];
    for (let index = 0; index < 4; index++) {
      const [r, s] = [out[index], back[3 - index]];
      near((r.x - mid.x) * ux + (r.y - mid.y) * uy, (s.x - mid.x) * ux + (s.y - mid.y) * uy);
      near((r.x - mid.x) * -uy + (r.y - mid.y) * ux, -((s.x - mid.x) * -uy + (s.y - mid.y) * ux));
    }
  }
});

const same = (a, b) => a.every((point, index) => Math.abs(point.x - b[index].x) < 1e-9 && Math.abs(point.y - b[index].y) < 1e-9);
const curves = allLinks.map((link) => linkCurve(link.id, link.from, link.to).curve);

// The figure's graph is not itself symmetric, so only links whose mirror image
// is also drawn, as the same kind (single or reciprocal), are compared. A
// reciprocal lens maps onto a lens with its lanes swapped.
const paired = (from, to) => allLinks.some((other) => other.from === to && other.to === from);
test("mirrored links are drawn as exact mirror images", () => {
  let checked = 0;
  for (const [map, mirror] of [[horizontal, mirrorX], [vertical, mirrorY]]) {
    allLinks.forEach((link, index) => {
      const image = [`${map[link.from]}>${map[link.to]}`, `${map[link.to]}>${map[link.from]}`];
      const match = allLinks.find((other) => image.includes(key(other)));
      if (!match || paired(match.from, match.to) !== paired(link.from, link.to)) return;
      const reflected = curves[index].map(mirror);
      assert.ok(curves.some((curve) => same(reflected, curve) || same([...reflected].reverse(), curve)), link.id);
      checked++;
    });
  }
  assert.ok(checked >= 8);
});
