import assert from "node:assert/strict";
import test from "node:test";
import { djThreeModel } from "./index.mjs";

test("positionAt waits for the synchronized future start", () => {
  const state = {
    status: "playing",
    position: 12,
    startedAt: 2_000,
    revision: 1,
  };

  assert.equal(djThreeModel.positionAt(state, 1_500), 12);
  assert.equal(djThreeModel.positionAt(state, 2_750), 12.75);
});

test("relay time remains independent of the installed media duration", () => {
  const state = {
    status: "playing",
    position: 258.5,
    startedAt: 1_000,
    revision: 1,
  };

  assert.equal(djThreeModel.positionAt(state, 2_000), 259.5);
});
