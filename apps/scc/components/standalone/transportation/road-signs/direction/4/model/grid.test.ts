import assert from "node:assert/strict";
import test from "node:test";
import {
  aimAtFingers,
  angleDelta,
  applyStroke,
  createSignGrid,
  exitHeading,
  resizeSignGrid,
  signCenter,
  holdExitsOnScreen,
  resetSignGrid,
  stepSignGrid,
  uprightSigns,
  wrapHeading,
} from "./grid.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(angleDelta(expected, actual)) < 1e-9, `${actual} ≉ ${expected}`);

test("a phone viewport keeps signs at the mobile cell size", () => {
  const grid = createSignGrid(390, 844);
  assert.equal(grid.columns, 11);
  assert.equal(grid.rows, 23);
});

test("leaving a rim points the arrow at the exit point", () => {
  const center = { x: 0, y: 0 };
  close(exitHeading(center, 10, { x: 0, y: 0 }, { x: 20, y: 0 })!, Math.PI / 2);
  close(exitHeading(center, 10, { x: 0, y: 0 }, { x: 0, y: -20 })!, 0);
  assert.equal(exitHeading(center, 10, { x: 20, y: 0 }, { x: 0, y: 0 }), null);
});

test("a stroke turns only the signs it leaves", () => {
  const grid = createSignGrid(390, 844);
  const index = grid.columns + 1;
  const center = signCenter(grid, index);
  applyStroke(grid, center, { x: center.x - grid.cellWidth * 0.48, y: center.y });
  assert.ok(Math.abs(grid.headingTarget[index]! + Math.PI / 2) < 1e-9);
  assert.equal(grid.headingTarget[0], 0);
});

test("left U-turn to right U-turn sweeps through straight, never past a U-turn", () => {
  const grid = createSignGrid(390, 844);
  const index = grid.columns + 1;
  const center = signCenter(grid, index);
  grid.heading[index] = grid.headingTarget[index] = -Math.PI + 0.05;
  applyStroke(grid, center, { x: center.x + 0.2, y: center.y + grid.cellHeight * 0.48 });
  assert.ok(grid.headingTarget[index]! > Math.PI - 0.05);
  let previous = grid.heading[index]!;
  let crossedStraight = false;
  for (let step = 0; step < 600; step += 1) {
    stepSignGrid(grid, 1 / 60);
    const heading = grid.heading[index]!;
    assert.ok(heading >= -Math.PI && heading <= Math.PI);
    assert.ok(Math.abs(heading - previous) < 1, "no jump between frames");
    if (previous < 0 && heading >= 0) crossedStraight = true;
    previous = heading;
  }
  assert.ok(crossedStraight);
  assert.ok(Math.abs(grid.heading[index]! - grid.headingTarget[index]!) < 1e-2);
});

test("straight back keeps the side the arrow already bends toward", () => {
  const grid = createSignGrid(390, 844);
  const index = grid.columns + 1;
  const center = signCenter(grid, index);
  grid.headingTarget[index] = -2;
  applyStroke(grid, center, { x: center.x, y: center.y + grid.cellHeight * 0.48 });
  assert.equal(grid.headingTarget[index], -Math.PI);
});

test("follow aims every arrow at its nearest finger and the spring settles there", () => {
  const grid = createSignGrid(390, 844);
  aimAtFingers(grid, [{ x: 195, y: -1000 }]);
  for (let step = 0; step < 600; step += 1) stepSignGrid(grid, 1 / 60);
  for (let index = 0; index < grid.heading.length; index += 1) {
    assert.ok(Math.abs(wrapHeading(grid.heading[index]!)) < 0.2);
  }
  assert.equal(stepSignGrid(grid, 1 / 60), false);
});

test("resizing carries headings from the nearest old sign", () => {
  const grid = createSignGrid(390, 844);
  grid.headingTarget.fill(1.25);
  const next = resizeSignGrid(grid, 1440, 900);
  assert.ok(next.headingTarget.every((heading) => heading === 1.25));
});

test("the sign channel rotates the whole sign the shorter way and leaves the bend", () => {
  const grid = createSignGrid(390, 844);
  const index = grid.columns + 1;
  const center = signCenter(grid, index);
  grid.rotationTarget[index] = Math.PI * 4;
  applyStroke(grid, center, { x: center.x - grid.cellWidth * 0.48, y: center.y }, "sign");
  assert.ok(Math.abs(grid.rotationTarget[index]! - (Math.PI * 4 - Math.PI / 2)) < 1e-9);
  assert.equal(grid.headingTarget[index], 0);
  aimAtFingers(grid, [{ x: center.x, y: center.y + 100 }], "sign");
  close(grid.rotationTarget[index]!, Math.PI);
  uprightSigns(grid);
  assert.equal(grid.rotationTarget[index], Math.PI * 4);
  for (let step = 0; step < 600; step += 1) stepSignGrid(grid, 1 / 60);
  assert.equal(stepSignGrid(grid, 1 / 60), false);
});

test("held exits keep rotation + bend on the exit while the sign keeps turning", () => {
  const grid = createSignGrid(390, 844);
  const index = grid.columns + 1;
  const center = signCenter(grid, index);
  applyStroke(grid, center, { x: center.x - grid.cellWidth * 0.48, y: center.y });
  close(grid.exit[index]!, -Math.PI / 2);
  // Reachable without passing the left U-turn (bend −π) of an exit to the left.
  for (const rotation of [0.4, 1.2, -1.5, -2.8, 1.5]) {
    grid.rotationTarget[index] = rotation;
    for (let step = 0; step < 240; step += 1) {
      holdExitsOnScreen(grid);
      stepSignGrid(grid, 1 / 60);
    }
    const drawn = grid.rotation[index]! + grid.heading[index]!;
    assert.ok(Math.abs(angleDelta(-Math.PI / 2, drawn)) < 5e-3, `${rotation}: ${drawn}`);
  }
  assert.ok(Number.isNaN(grid.exit[0]!));
});

test("a held bend waits at the U-turn, then sweeps to the other side", () => {
  const grid = createSignGrid(390, 844);
  grid.exit[0] = 0;
  grid.heading[0] = grid.headingTarget[0] = Math.PI - 0.1;
  grid.rotation[0] = -Math.PI - 0.2;
  holdExitsOnScreen(grid);
  assert.equal(grid.headingTarget[0], Math.PI);
  grid.rotation[0] = -Math.PI - 1;
  holdExitsOnScreen(grid);
  close(grid.headingTarget[0]!, Math.PI + 1 - Math.PI * 2);
});

test("a locked bend follows a fast-turning sign without lag", () => {
  const grid = createSignGrid(390, 844);
  const index = grid.columns + 1;
  const center = signCenter(grid, index);
  applyStroke(grid, center, { x: center.x, y: center.y - grid.cellHeight * 0.48 }, "arrow", true);
  assert.equal(grid.headingTarget[index], 0);
  for (let step = 0; step < 120; step += 1) {
    holdExitsOnScreen(grid);
    stepSignGrid(grid, 1 / 60);
  }
  grid.rotationTarget[index] = 1.4;
  for (let step = 0; step < 30; step += 1) {
    stepSignGrid(grid, 1 / 60);
    holdExitsOnScreen(grid);
    const drawn = grid.rotation[index]! + grid.heading[index]!;
    assert.ok(Math.abs(drawn) < 1e-9, `frame ${step}: ${drawn}`);
  }
});

test("opt 4 records the finger's travel, not the exit point, and holds it on screen", () => {
  const grid = createSignGrid(390, 844);
  const index = grid.columns + 1;
  const center = signCenter(grid, index);
  // A grazing pass leaves to the upper right while travelling right.
  const from = { x: center.x - grid.radius, y: center.y - grid.radius * 0.6 };
  const to = { x: center.x + grid.radius, y: center.y - grid.radius * 0.6 };
  applyStroke(grid, from, to, "arrow", true, Math.PI / 2);
  close(grid.exit[index]!, Math.PI / 2);
  // The sign faces the finger, beyond the exit point.
  grid.rotation[index] = grid.rotationTarget[index] = Math.atan2(to.x - center.x, -(to.y - center.y));
  for (let step = 0; step < 120; step += 1) {
    holdExitsOnScreen(grid);
    stepSignGrid(grid, 1 / 60);
  }
  close(grid.rotation[index]! + grid.heading[index]!, Math.PI / 2);
  assert.ok(Math.abs(grid.heading[index]!) > 0.5, "the bend carries the pass, not straight ahead");
});

test("reset returns every sign to upright, straight and unrecorded", () => {
  const grid = createSignGrid(390, 844);
  grid.heading.fill(1);
  grid.rotationTarget.fill(2);
  grid.exit.fill(0.5);
  resetSignGrid(grid);
  assert.ok(grid.heading.every((value) => value === 0));
  assert.ok(grid.rotationTarget.every((value) => value === 0));
  assert.ok(grid.exit.every((value) => Number.isNaN(value)));
  assert.equal(stepSignGrid(grid, 1 / 60), false);
});
