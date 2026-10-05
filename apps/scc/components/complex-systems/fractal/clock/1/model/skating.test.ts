import assert from "node:assert/strict";
import test from "node:test";
import { CLOCK_HANDS, CLOCK_RECURSION_DEPTH, createClockTree } from "./index.ts";
import {
  aimMinutes,
  angleDelta,
  applyStroke,
  baseClockSeconds,
  createClockField,
  createClockStructure,
  handAngle,
  layoutClockField,
  resizeClockFieldDepth,
  stepClockField,
} from "./skating.ts";

const layout = (field: ReturnType<typeof createClockField>, elapsedSeconds: number) =>
  layoutClockField(field, {
    center: { x: 400, y: 300 },
    rootRadius: 160,
    childRadiusRatio: 0.5,
    elapsedSeconds,
  });

test("the default tree keeps clock/1's complete three-hand recursion", () => {
  const structure = createClockStructure(CLOCK_RECURSION_DEPTH);
  assert.equal(structure.count, 121);
  assert.equal(structure.keys[0], "root");
  assert.equal(structure.keys[1], "root/hour");
  assert.equal(createClockStructure(6).count, 1093);
});

test("with no skating, the flat layout reproduces clock/1's tree exactly", () => {
  const field = createClockField(createClockStructure(CLOCK_RECURSION_DEPTH));
  layout(field, 4321.5);
  const tree = createClockTree({
    center: { x: 400, y: 300 },
    rootRadius: 160,
    childRadiusRatio: 0.5,
    elapsedSeconds: 4321.5,
  });
  assert.equal(tree.clocks.length, field.structure.count);
  tree.clocks.forEach((clock, index) => {
    assert.equal(clock.id, field.structure.keys[index]);
    assert.ok(Math.abs(clock.center.x - field.x[index]!) < 1e-9);
    assert.ok(Math.abs(clock.center.y - field.y[index]!) < 1e-9);
    assert.ok(Math.abs(clock.radius - field.radius[index]!) < 1e-9);
    clock.hands.forEach((hand, handIndex) => {
      assert.ok(Math.abs(angleDelta(hand.angle, field.angle[index * 3 + handIndex]!)) < 1e-9);
    });
  });
});

test("every descendant is centered at its holding hand tip", () => {
  const field = createClockField(createClockStructure(3));
  field.offset[4] = 5000;
  layout(field, 243);
  const { parent, hand } = field.structure;
  for (let index = 1; index < field.structure.count; index += 1) {
    const p = parent[index]!;
    const h = hand[index]!;
    const length = field.radius[p]! * CLOCK_HANDS[h as 0 | 1 | 2].length;
    const angle = field.angle[p * 3 + h]!;
    assert.ok(Math.abs(field.x[index]! - (field.x[p]! + Math.cos(angle) * length)) < 1e-9);
    assert.ok(Math.abs(field.y[index]! - (field.y[p]! + Math.sin(angle) * length)) < 1e-9);
    assert.equal(field.radius[index], field.radius[p]! * 0.5);
  }
});

test("leaving the root sets geared hour and minute but not the second hand", () => {
  const field = createClockField(createClockStructure(0));
  const elapsed = 2.5 * 3600;
  layout(field, elapsed);
  const exit = handAngle(0, 5 * 3600 + 20 * 60);
  const finger = { x: 400 + Math.cos(exit) * 170, y: 300 + Math.sin(exit) * 170 };
  applyStroke(field, { x: 400, y: 300 }, finger, elapsed);
  assert.ok((field.offsetTarget[0]! / 3600) * 360 > 1000);
  field.offset[0] = field.offsetTarget[0]!;
  layout(field, elapsed);
  assert.ok(Math.abs(angleDelta(field.angle[1]!, exit)) < 1e-9);
  assert.ok(Math.abs(angleDelta(field.angle[0]!, exit)) <= Math.PI / 12);
  assert.equal(field.angle[2], handAngle(2, baseClockSeconds(field, 0, elapsed)));
});

test("minute hands aim at the nearest finger and springs settle", () => {
  const field = createClockField(createClockStructure(2));
  layout(field, 100);
  const finger = { x: 900, y: 300 };
  aimMinutes(field, [finger], 100);
  let frames = 0;
  while (stepClockField(field, 1 / 60) && frames < 900) frames += 1;
  assert.ok(frames < 900);
  layout(field, 100);
  const toFinger = Math.atan2(finger.y - field.y[0]!, finger.x - field.x[0]!);
  assert.ok(Math.abs(angleDelta(field.angle[1]!, toFinger)) < 1e-9);
});

test("changing depth keeps each surviving lineage's skated time", () => {
  const field = createClockField(createClockStructure(2));
  field.offsetTarget[1] = 1234;
  const deeper = resizeClockFieldDepth(field, 4);
  assert.equal(deeper.structure.count, 121);
  assert.equal(deeper.offsetTarget[1], 1234);
  const shallower = resizeClockFieldDepth(deeper, 1);
  assert.equal(shallower.offsetTarget[1], 1234);
});
