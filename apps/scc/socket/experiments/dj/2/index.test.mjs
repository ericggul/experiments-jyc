import assert from "node:assert/strict";
import test from "node:test";
import { djTwoModel } from "./index.mjs";

test("positionAt advances only after the scheduled start", () => {
  const state = {
    status: "playing",
    position: 12,
    startedAt: 2_000,
    revision: 1,
  };

  assert.equal(djTwoModel.positionAt(state, 1_500), 12);
  assert.equal(djTwoModel.positionAt(state, 2_750), 12.75);
});

test("positionAt remains independent of any track duration", () => {
  const state = {
    status: "playing",
    position: 153.5,
    startedAt: 1_000,
    revision: 1,
  };

  assert.equal(djTwoModel.positionAt(state, 2_000), 154.5);
});
