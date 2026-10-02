import assert from "node:assert/strict";
import test from "node:test";
import { reachLimb } from "./limb.ts";

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test("a reachable target is met exactly with rigid segment lengths", () => {
  const root = { x: 10, y: 20 };
  const target = { x: 70, y: 110 };
  const { joint, end } = reachLimb(root, target, 60, 55, { x: 80, y: 40 });
  assert.ok(distance(end, target) < 1e-2);
  assert.ok(Math.abs(distance(root, joint) - 60) < 1e-6);
  assert.ok(Math.abs(distance(joint, end) - 55) < 1e-6);
});

test("the joint bends toward the hint side", () => {
  const root = { x: 0, y: 0 };
  const target = { x: 0, y: 80 };
  assert.ok(reachLimb(root, target, 50, 50, { x: 30, y: 40 }).joint.x > 0);
  assert.ok(reachLimb(root, target, 50, 50, { x: -30, y: 40 }).joint.x < 0);
});

test("an out-of-reach target leaves the limb straight, pointing at it", () => {
  const { joint, end } = reachLimb({ x: 0, y: 0 }, { x: 300, y: 0 }, 50, 40, { x: 10, y: 10 });
  assert.ok(Math.abs(end.x - 90) < 1e-2 && Math.abs(end.y) < 1e-6);
  assert.ok(Math.abs(joint.y) < 1);
  assert.ok(Number.isFinite(joint.x));
});

test("a target on the root stays finite", () => {
  const { joint, end } = reachLimb({ x: 5, y: 5 }, { x: 5, y: 5 }, 50, 40, { x: 0, y: 0 });
  for (const value of [joint.x, joint.y, end.x, end.y]) assert.ok(Number.isFinite(value));
});
