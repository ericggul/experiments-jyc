import assert from "node:assert/strict";
import test from "node:test";
import { anchorPoint, assignRoles, buildPose, continueBinding, endpointsFor, solveFigure, toWorld } from "./rig.ts";

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

const close = (a, b) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-6, `${JSON.stringify(a)} != ${JSON.stringify(b)}`);

test("two fingers carry a rigid body: head and feet land exactly on the fingers at any angle and size", () => {
  const contacts = new Map([[1, { x: 200, y: 100 }], [2, { x: 60, y: 300 }]]);
  const binding = continueBinding(null, contacts);
  assert.deepEqual([...binding], [[1, "head"], [2, "feet"]]);
  const first = solveFigure(binding, contacts, null);
  close(toWorld(first.frame, anchorPoint(first.endpoints, "head")), contacts.get(1));
  close(toWorld(first.frame, anchorPoint(first.endpoints, "feet")), contacts.get(2));

  contacts.set(2, { x: 420, y: 160 });
  const turned = solveFigure(binding, contacts, null);
  assert.deepEqual(turned.endpoints, first.endpoints);
  assert.notEqual(turned.frame.angle, first.frame.angle);
  close(toWorld(turned.frame, anchorPoint(turned.endpoints, "feet")), contacts.get(2));
});

test("three and four fingers articulate held limbs while free limbs follow the body", () => {
  const three = new Map([[1, { x: 200, y: 100 }], [2, { x: 90, y: 560 }], [3, { x: 310, y: 560 }]]);
  const binding = continueBinding(null, three);
  assert.deepEqual([...binding.values()], ["head", "leftFoot", "rightFoot"]);
  const figure = solveFigure(binding, three, 1);
  close(toWorld(figure.frame, figure.endpoints.leftFoot), three.get(2));
  assert.ok(figure.endpoints.leftHand.y < 250, "wide stance lifts the free arms");

  const four = new Map([[1, { x: 80, y: 200 }], [2, { x: 320, y: 210 }], [3, { x: 130, y: 600 }], [4, { x: 270, y: 610 }]]);
  const fourBinding = continueBinding(null, four);
  assert.deepEqual([...fourBinding.values()], ["leftHand", "rightHand", "leftFoot", "rightFoot"]);
  const fourFigure = solveFigure(fourBinding, four, 1);
  close(toWorld(fourFigure.frame, fourFigure.endpoints.rightHand), four.get(2));
  assert.ok(fourFigure.endpoints.head.y < fourFigure.endpoints.leftHand.y);
});

test("lifting fingers keeps held parts; adding a finger rereads the hand", () => {
  const contacts = new Map([
    [11, { x: 180, y: 90 }],
    [22, { x: 55, y: 295 }],
    [33, { x: 320, y: 280 }],
    [44, { x: 120, y: 710 }],
    [55, { x: 270, y: 700 }],
  ]);
  const five = continueBinding(null, contacts);
  contacts.delete(11);
  const four = continueBinding(five, contacts);
  assert.deepEqual([...four.values()], ["leftHand", "rightHand", "leftFoot", "rightFoot"]);
  contacts.delete(44);
  assert.deepEqual([...continueBinding(four, contacts).values()], ["leftHand", "rightHand", "rightFoot"]);
  contacts.set(66, { x: 180, y: 90 });
  contacts.set(77, { x: 120, y: 710 });
  assert.equal(continueBinding(four, contacts).get(66), "head");
  contacts.clear();
  contacts.set(1, { x: 0, y: 0 });
  assert.equal(continueBinding(five, contacts), null);
});

test("five fingers share the fitted body frame and still land every part on its finger", () => {
  const contacts = new Map([
    [11, { x: 180, y: 90 }],
    [22, { x: 55, y: 295 }],
    [33, { x: 320, y: 280 }],
    [44, { x: 120, y: 710 }],
    [55, { x: 270, y: 700 }],
  ]);
  const binding = continueBinding(null, contacts);
  const figure = solveFigure(binding, contacts, 0.3);
  assert.ok(Math.abs(figure.frame.angle) < 0.2, "an upright hand keeps the body upright");
  assert.ok(figure.frame.scale > 1, "five fingers set their own size instead of the held one");
  for (const [id, anchor] of binding) close(toWorld(figure.frame, figure.endpoints[anchor]), contacts.get(id));
});

test("a frozen pose keeps released parts in place while the remaining fingers hold on", () => {
  const four = new Map([[1, { x: 80, y: 200 }], [2, { x: 320, y: 210 }], [3, { x: 130, y: 600 }], [4, { x: 270, y: 610 }]]);
  const binding = continueBinding(null, four);
  const before = solveFigure(binding, four, 1);
  four.delete(1);
  four.delete(2);
  const lifted = continueBinding(binding, four);
  const after = solveFigure(lifted, four, before.frame.scale, before.endpoints);
  for (const role of ["head", "leftHand", "rightHand", "leftFoot", "rightFoot"]) {
    close(toWorld(after.frame, after.endpoints[role]), toWorld(before.frame, before.endpoints[role]));
  }
});
