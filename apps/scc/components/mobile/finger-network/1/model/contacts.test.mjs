import assert from "node:assert/strict";
import test from "node:test";
import { applyContactChanges } from "./contacts.ts";

test("a second hand keeps all first-hand contacts while ten fingers move independently", () => {
  const contacts = new Map();
  const firstHand = Array.from({ length: 5 }, (_, identifier) => ({ identifier, x: identifier * 10, y: 20 }));
  const secondHand = Array.from({ length: 5 }, (_, index) => ({ identifier: index + 5, x: index * 10, y: 100 }));

  applyContactChanges(contacts, "touchstart", firstHand);
  applyContactChanges(contacts, "touchstart", secondHand);
  assert.equal(contacts.size, 10);
  assert.deepEqual(contacts.get(0), { x: 0, y: 20 });

  applyContactChanges(contacts, "touchmove", [{ identifier: 7, x: 64, y: 110 }]);
  assert.equal(contacts.size, 10);
  assert.deepEqual(contacts.get(7), { x: 64, y: 110 });
  assert.deepEqual(contacts.get(0), { x: 0, y: 20 });

  applyContactChanges(contacts, "touchcancel", [{ identifier: 7, x: 64, y: 110 }]);
  assert.equal(contacts.size, 9);
  assert.ok(contacts.has(0));
  assert.ok(contacts.has(9));
});

test("the state model itself does not cap the contact count at ten", () => {
  const contacts = new Map();
  applyContactChanges(contacts, "touchstart", Array.from({ length: 12 }, (_, identifier) => ({ identifier, x: identifier, y: identifier })));
  assert.equal(contacts.size, 12);
});
