import assert from "node:assert/strict";
import test from "node:test";
import {
  CLOCK_RECURSION_DEPTH,
  ROOT_DIAMETER_RATIO,
  clockHandAngle,
  createClockTree,
  localClockSeconds,
  normalizeChildRadiusRatio,
  rootClockRadiusForViewport,
} from "./index.ts";

test("four recursive generations create a complete three-hand clock tree", () => {
  const tree = createClockTree({
    center: { x: 400, y: 300 },
    rootRadius: 120,
    elapsedSeconds: 18,
  });
  const expectedClockCount = (3 ** (CLOCK_RECURSION_DEPTH + 1) - 1) / 2;

  assert.equal(tree.clocks.length, expectedClockCount);
  assert.equal(tree.clocks[0]?.id, "root");
  assert.equal(tree.clocks[0]?.depth, 0);
  assert.ok(tree.clocks.every((clock) => clock.hands.length === 3));
});

test("the tree can extend beyond its default recursion depth", () => {
  const recursionDepth = 5;
  const tree = createClockTree({
    center: { x: 0, y: 0 },
    rootRadius: 120,
    recursionDepth,
    elapsedSeconds: 18,
  });

  assert.equal(tree.clocks.length, (3 ** (recursionDepth + 1) - 1) / 2);
  assert.equal(tree.clocks.at(-1)?.depth, recursionDepth);
});

test("every descendant is centered exactly at its holding hand tip", () => {
  const tree = createClockTree({
    center: { x: 0, y: 0 },
    rootRadius: 160,
    childRadiusRatio: 0.5,
    elapsedSeconds: 243,
  });
  const clockById = new Map(tree.clocks.map((clock) => [clock.id, clock]));

  for (const clock of tree.clocks) {
    if (!clock.parentId || !clock.attachedTo) continue;
    const parent = clockById.get(clock.parentId);
    const holdingHand = parent?.hands.find((hand) => hand.id === clock.attachedTo);
    assert.ok(parent && holdingHand);
    assert.equal(clock.center.x, holdingHand.tip.x);
    assert.equal(clock.center.y, holdingHand.tip.y);
    assert.equal(clock.radius, parent.radius * tree.childRadiusRatio);
  }
});

test("clock hands use the conventional twelve-o'clock origin and clockwise turn", () => {
  assert.equal(clockHandAngle("second", 0), -Math.PI / 2);
  assert.ok(Math.abs(clockHandAngle("second", 15)) < 1e-12);
});

test("the root starts from the browser's local twelve-hour clock time", () => {
  const localTime = new Date(2026, 0, 1, 13, 2, 3, 450);
  assert.equal(localClockSeconds(localTime), 3723.45);
});

test("the root clock diameter matches the shorter viewport side", () => {
  const width = 1200;
  const height = 800;
  const radius = rootClockRadiusForViewport(width, height);

  assert.equal(radius * 2, Math.min(width, height) * ROOT_DIAMETER_RATIO);
  assert.equal(normalizeChildRadiusRatio(-1), 0.42);
  assert.equal(normalizeChildRadiusRatio(10), 0.62);
});
