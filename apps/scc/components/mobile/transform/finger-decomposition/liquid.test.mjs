import assert from "node:assert/strict";
import test from "node:test";
import { createLiquid, drag, moveVertices, restPointAt, stepLiquid, verticesIn } from "./liquid.ts";

const area = (liquid) => {
  const { position, indices } = liquid;
  let total = 0;
  for (let index = 0; index < indices.length; index += 3) {
    const [a, b, c] = [indices[index] * 2, indices[index + 1] * 2, indices[index + 2] * 2];
    total += ((position[b] - position[a]) * (position[c + 1] - position[a + 1]) - (position[c] - position[a]) * (position[b + 1] - position[a + 1])) / 2;
  }
  return Math.abs(total);
};

const stroke = (liquid) => {
  for (let step = 0; step < 20; step++) {
    drag(liquid, { x: 100 + step * 8, y: 200 }, { x: 480, y: 0 }, 50);
    stepLiquid(liquid, 1 / 60);
  }
};

test("at rest the mesh draws the page unchanged", () => {
  const liquid = createLiquid(390, 844);
  stepLiquid(liquid, 1 / 60);
  assert.deepEqual(liquid.position, liquid.rest);
});

test("a stroke carries the sheet along it and leaves distant parts nearly still", () => {
  const liquid = createLiquid(390, 844);
  const near = verticesIn(liquid, 150, 196, 154, 204)[0];
  const far = verticesIn(liquid, 150, 796, 154, 804)[0];
  stroke(liquid);
  assert.ok(liquid.position[near * 2] - liquid.rest[near * 2] > 15);
  assert.ok(Math.abs(liquid.position[far * 2] - liquid.rest[far * 2]) < 3);
});

test("the liquid keeps flowing after release and comes to rest", () => {
  const liquid = createLiquid(390, 844);
  stroke(liquid);
  assert.ok(stepLiquid(liquid, 1 / 60) > 20);
  let speed = Infinity;
  for (let step = 0; step < 60 * 12; step++) speed = stepLiquid(liquid, 1 / 60);
  assert.ok(speed < 2);
});

test("the projected flow roughly keeps the sheet's area", () => {
  const liquid = createLiquid(390, 844);
  const before = area(liquid);
  stroke(liquid);
  for (let step = 0; step < 60; step++) stepLiquid(liquid, 1 / 60);
  assert.ok(Math.abs(area(liquid) / before - 1) < 0.05);
});

test("held vertices travel rigidly and are not carried", () => {
  const liquid = createLiquid(390, 844);
  const held = verticesIn(liquid, 40, 40, 80, 60);
  const pinned = new Uint8Array(liquid.position.length / 2);
  for (const vertex of held) pinned[vertex] = 1;
  moveVertices(liquid, held, 30, 10);
  drag(liquid, { x: 60, y: 50 }, { x: 900, y: 300 }, 50);
  stepLiquid(liquid, 1 / 60, pinned);
  for (const vertex of held) {
    assert.equal(liquid.position[vertex * 2] - liquid.rest[vertex * 2], 30);
    assert.equal(liquid.position[vertex * 2 + 1] - liquid.rest[vertex * 2 + 1], 10);
  }
});

test("a screen point maps back to the page point drawn there", () => {
  const liquid = createLiquid(390, 844);
  const held = verticesIn(liquid, 0, 0, 390, 844);
  moveVertices(liquid, held, 20, -10);
  const rest = restPointAt(liquid, 120, 300);
  assert.ok(Math.abs(rest.x - 100) < 1e-3 && Math.abs(rest.y - 310) < 1e-3);
});
