import assert from "node:assert/strict";
import test from "node:test";
import { assignFingers, inferWrist } from "./hand.ts";

const up = { x: 0, y: -1 };

test("two touches are the full gesture: wrist below, middle fingertip above, at any angle", () => {
  assert.deepEqual(assignFingers([{ x: 200, y: 150 }, { x: 190, y: 650 }], up), { wrist: { x: 190, y: 650 }, tips: { middle: { x: 200, y: 150 } } });
  const tilted = assignFingers([{ x: 300, y: 600 }, { x: 80, y: 200 }], { x: -0.5, y: -0.866 });
  assert.deepEqual(tilted.wrist, { x: 300, y: 600 });
  assert.deepEqual(Object.keys(tilted.tips), ["middle"]);
});

test("each further touch opens one more finger on its side", () => {
  const three = assignFingers([{ x: 200, y: 650 }, { x: 205, y: 150 }, { x: 60, y: 260 }], up);
  assert.deepEqual(three.tips, { middle: { x: 205, y: 150 }, index: { x: 60, y: 260 } });
  const four = assignFingers([{ x: 200, y: 650 }, { x: 205, y: 150 }, { x: 60, y: 260 }, { x: 340, y: 240 }], up);
  assert.deepEqual(Object.keys(four.tips).sort(), ["index", "middle", "ring"]);
  const twoLeft = assignFingers([{ x: 200, y: 650 }, { x: 205, y: 150 }, { x: 120, y: 200 }, { x: 40, y: 330 }], up);
  assert.deepEqual(twoLeft.tips.index, { x: 120, y: 200 });
  assert.deepEqual(twoLeft.tips.thumb, { x: 40, y: 330 });
});

test("five touches are five fingertips, thumb to pinky from the left, with the wrist below", () => {
  const points = [{ x: 330, y: 220 }, { x: 40, y: 380 }, { x: 200, y: 140 }, { x: 120, y: 190 }, { x: 280, y: 180 }];
  const hand = assignFingers(points, up);
  assert.deepEqual(hand.tips, { thumb: points[1], index: points[3], middle: points[2], ring: points[4], pinky: points[0] });
  assert.equal(hand.wrist, null);
  assert.ok(inferWrist(points, up).y > 500);
});

test("fewer than two touches place nothing", () => {
  assert.equal(assignFingers([{ x: 0, y: 0 }], up), null);
});
