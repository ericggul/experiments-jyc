import assert from "node:assert/strict";
import test from "node:test";
import {
  MOBILE_CLOCK_CELL,
  aimMinutes,
  angleDelta,
  applyStroke,
  clockCenter,
  createClockGrid,
  exitAngle,
  handAngles,
  resizeClockGrid,
  stepClockGrid,
  timeForHands,
} from "./index.ts";

const at = (hours: number, minutes: number) => hours * 3600 + minutes * 60;

test("a phone viewport fills edge to edge with roughly 50 px clocks", () => {
  const grid = createClockGrid(390, 844);
  assert.equal(grid.columns * grid.cellWidth, 390);
  assert.equal(grid.rows * grid.cellHeight, 844);
  assert.ok(Math.abs(grid.cellWidth - MOBILE_CLOCK_CELL) < 6);
  assert.ok(Math.abs(grid.cellHeight - MOBILE_CLOCK_CELL) < 6);
});

test("the exit point is where the stroke leaves the rim", () => {
  const center = { x: 0, y: 0 };
  const right = exitAngle(center, 10, { x: 0, y: 0 }, { x: 20, y: 0 });
  assert.ok(right !== null && Math.abs(angleDelta(right, 0)) < 1e-9);
  const passing = exitAngle(center, 10, { x: -20, y: 5 }, { x: 20, y: 5 });
  assert.ok(passing !== null && passing > 0 && passing < Math.PI / 2);
  assert.equal(exitAngle(center, 10, { x: 0, y: 0 }, { x: 5, y: 0 }), null);
  assert.equal(exitAngle(center, 10, { x: 20, y: 0 }, { x: 5, y: 0 }), null);
  assert.equal(exitAngle(center, 10, { x: -20, y: 30 }, { x: 20, y: 30 }), null);
});

test("hands round-trip through a single geared time", () => {
  const time = at(5, 31);
  const { hour, minute } = handAngles(time);
  assert.ok(Math.abs(timeForHands(hour, minute) - time) < 1e-6);
  const nearFive = handAngles(at(5, 20)).hour;
  assert.ok(Math.abs(timeForHands(nearFive, minute) - time) < 1e-6);
});

test("leaving toward five from 2:30 sweeps the minute hand over 1,000°", () => {
  const grid = createClockGrid(500, 500);
  const real = at(2, 30);
  const center = clockCenter(grid, 0);
  const exit = handAngles(at(5, 0)).hour;
  const reach = grid.radius * 1.05;
  const finger = { x: center.x + Math.cos(exit) * reach, y: center.y + Math.sin(exit) * reach };
  applyStroke(grid, center, finger, real);
  const shown = real + grid.offsetTarget[0]!;
  const sweep = (grid.offsetTarget[0]! / 3600) * 360;
  assert.ok(shown > at(4, 30) && shown < at(5, 30));
  assert.ok(sweep > 1000 && sweep < 1100);
  assert.equal(grid.offsetTarget[1], 0);
});

test("minute hands turn toward the nearest finger, carrying the hour", () => {
  const grid = createClockGrid(500, 500);
  const last = grid.columns * grid.rows - 1;
  const real = at(2, 0);
  aimMinutes(grid, [{ x: 0, y: 0 }, { x: 500, y: 500 }], real);
  const first = handAngles(real + grid.offsetTarget[0]!);
  const final = handAngles(real + grid.offsetTarget[last]!);
  assert.ok(Math.abs(angleDelta(first.minute, (-3 * Math.PI) / 4)) < 1e-9);
  assert.ok(Math.abs(angleDelta(final.minute, Math.PI / 4)) < 1e-9);
  assert.ok(Math.abs(grid.offsetTarget[0]!) <= 1800);
  assert.ok(Math.abs(angleDelta(first.hour, handAngles(real).hour)) <= Math.PI / 12);
});

test("clocks settle on their times and resize keeps them", () => {
  const grid = createClockGrid(400, 400);
  aimMinutes(grid, [{ x: 400, y: 0 }], at(2, 0));
  let frames = 0;
  while (stepClockGrid(grid, 1 / 60) && frames < 600) frames += 1;
  assert.ok(frames < 600);
  assert.equal(grid.offset[0], grid.offsetTarget[0]);
  const resized = resizeClockGrid(grid, 1000, 700);
  assert.equal(resized.offsetTarget[0], grid.offsetTarget[0]);
});
