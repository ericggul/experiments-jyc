import assert from "node:assert/strict";
import test from "node:test";
import {
  CHILDREN_PER_CLOCK,
  CLOCK_RADIUS_IN_CELL,
  HOUR_HAND_LENGTH,
  SECOND_HAND_LENGTH,
  MOBILE_CLOCK_CELL,
  PARENT_TO_CHILD_SCALE,
  aimMinutes,
  angleDelta,
  applyStroke,
  clockCenter,
  createClockGrid,
  handAngles,
  resizeClockGrid,
  secondAngle,
  secondHandTicking,
  stepClockGrid,
  updateChildCenters,
} from "./index.ts";

const at = (hours: number, minutes: number) => hours * 3600 + minutes * 60;

test("a phone fills edge to edge with parents 2× their children", () => {
  const grid = createClockGrid(390, 844);
  assert.ok(Math.abs(grid.columns * grid.cellWidth - 390) < 1e-9);
  assert.ok(Math.abs(grid.rows * grid.cellHeight - 844) < 1e-9);
  assert.ok(grid.columns * grid.rows >= 15);
  assert.ok(Math.abs(grid.radius / grid.childRadius - PARENT_TO_CHILD_SCALE) < 1e-9);
  assert.ok(grid.childRadius > MOBILE_CLOCK_CELL * CLOCK_RADIUS_IN_CELL);
});

test("children ride the parent hand tips", () => {
  const grid = createClockGrid(390, 844);
  const real = at(3, 0);
  updateChildCenters(grid, real);
  const center = clockCenter(grid, 0);
  const { hour } = handAngles(real);
  const hourTip = { x: center.x + Math.cos(hour) * grid.radius * HOUR_HAND_LENGTH, y: center.y + Math.sin(hour) * grid.radius * HOUR_HAND_LENGTH };
  assert.ok(Math.abs(grid.childX[0]! - hourTip.x) < 1e-9 && Math.abs(grid.childY[0]! - hourTip.y) < 1e-9);
});

test("leaving only a child sets that child, not its parent", () => {
  const grid = createClockGrid(500, 500);
  const real = at(2, 30);
  updateChildCenters(grid, real);
  const child = { x: grid.childX[0]!, y: grid.childY[0]! };
  const parent = clockCenter(grid, 0);
  const away = Math.atan2(child.y - parent.y, child.x - parent.x) + Math.PI / 2;
  const reach = grid.childRadius * 1.05;
  applyStroke(grid, child, { x: child.x + Math.cos(away) * reach, y: child.y + Math.sin(away) * reach }, real);
  assert.notEqual(grid.children.offsetTarget[0], 0);
  assert.equal(grid.children.offsetTarget[1], 0);
  assert.equal(grid.parents.offsetTarget[0], 0);
});

test("leaving a parent toward five from 2:30 sweeps its minute hand over 1,000°", () => {
  const grid = createClockGrid(500, 500);
  const real = at(2, 30);
  updateChildCenters(grid, real);
  const center = clockCenter(grid, 0);
  const exit = handAngles(at(5, 0)).hour;
  const reach = grid.radius * 1.05;
  applyStroke(grid, center, { x: center.x + Math.cos(exit) * reach, y: center.y + Math.sin(exit) * reach }, real);
  const sweep = (grid.parents.offsetTarget[0]! / 3600) * 360;
  assert.ok(sweep > 1000 && sweep < 1100);
});

test("parent and child minute hands each aim at the nearest finger", () => {
  const grid = createClockGrid(500, 500);
  const real = at(2, 0);
  updateChildCenters(grid, real);
  const finger = { x: 500, y: 500 };
  aimMinutes(grid, [finger], real);
  const parent = clockCenter(grid, 0);
  const parentMinute = handAngles(real + grid.parents.offsetTarget[0]!).minute;
  assert.ok(Math.abs(angleDelta(parentMinute, Math.atan2(finger.y - parent.y, finger.x - parent.x))) < 1e-9);
  const childMinute = handAngles(real + grid.children.offsetTarget[1]!).minute;
  const toFinger = Math.atan2(finger.y - grid.childY[1]!, finger.x - grid.childX[1]!);
  assert.ok(Math.abs(angleDelta(childMinute, toFinger)) < 1e-9);
});

test("clocks settle and resize keeps parent and child times", () => {
  const grid = createClockGrid(400, 400);
  const real = at(2, 0);
  updateChildCenters(grid, real);
  aimMinutes(grid, [{ x: 400, y: 0 }], real);
  let frames = 0;
  while (stepClockGrid(grid, 1 / 60) && frames < 600) frames += 1;
  assert.ok(frames < 600);
  const resized = resizeClockGrid(grid, 1000, 700, real);
  assert.equal(resized.parents.offsetTarget[0], grid.parents.offsetTarget[0]);
  assert.equal(resized.children.offsetTarget[1], grid.children.offsetTarget[1]);
});

test("the second hand eases between real-time marks, ignoring offsets", () => {
  assert.ok(Math.abs(secondAngle(at(2, 0) + 15.7)) < 1e-9);
  assert.ok(Math.abs(angleDelta(secondAngle(at(7, 41) + 45.5), Math.PI)) < 1e-9);
  const start = secondAngle(at(1, 0) + 15);
  const middle = secondAngle(at(1, 0) + 15.175);
  assert.ok(Math.abs(angleDelta(start, secondAngle(at(1, 0) + 14.9))) < 1e-9);
  assert.ok(Math.abs(angleDelta(start, middle) - Math.PI / 60) < 1e-9);
  assert.ok(secondHandTicking(15.1) && !secondHandTicking(15.5));
});

test("every parent carries a third child on its second-hand tip", () => {
  const grid = createClockGrid(390, 844);
  const real = at(4, 10) + 30.5;
  updateChildCenters(grid, real);
  assert.equal(CHILDREN_PER_CLOCK, 3);
  assert.equal(grid.childX.length, grid.columns * grid.rows * 3);
  const center = clockCenter(grid, 1);
  const angle = secondAngle(real);
  const reach = grid.radius * SECOND_HAND_LENGTH;
  assert.ok(Math.abs(grid.childX[5]! - (center.x + Math.cos(angle) * reach)) < 1e-9);
  assert.ok(Math.abs(grid.childY[5]! - (center.y + Math.sin(angle) * reach)) < 1e-9);
});
