import assert from "node:assert/strict";
import test from "node:test";
import { assignRoles, buildPose, endpointsFor } from "./rig.ts";

test("five touch IDs acquire anatomical roles once, then follow those IDs across crossings", () => {
  const contacts = new Map([
    [11, { x: 180, y: 90 }],
    [22, { x: 55, y: 295 }],
    [33, { x: 320, y: 280 }],
    [44, { x: 120, y: 710 }],
    [55, { x: 270, y: 700 }],
  ]);
  assert.equal(assignRoles(new Map([...contacts].slice(0, 4))), null);
  const ids = assignRoles(contacts);
  assert.deepEqual(ids, { head: 11, leftHand: 22, rightHand: 33, leftFoot: 44, rightFoot: 55 });

  contacts.set(22, { x: 340, y: 250 });
  contacts.set(33, { x: 35, y: 260 });
  const endpoints = endpointsFor(contacts, ids);
  assert.deepEqual(endpoints.leftHand, { x: 340, y: 250 });
  assert.deepEqual(endpoints.rightHand, { x: 35, y: 260 });
  const pose = buildPose(endpoints);
  assert.ok(Number.isFinite(pose.chest.x));
  assert.ok(pose.leftHip.y > pose.leftShoulder.y);
});
