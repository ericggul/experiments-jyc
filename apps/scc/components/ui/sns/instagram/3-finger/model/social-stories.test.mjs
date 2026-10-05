import assert from "node:assert/strict";
import test from "node:test";
import { activateStory, createStorySystem, stepStorySystem } from "./social-stories.ts";

test("stories appear only after direct finger activation and expire independently", () => {
  const empty = createStorySystem(3, 2);
  assert.equal(empty.states.length, 6);
  assert.ok(empty.states.every((state) => state.status === "empty"));
  assert.equal(stepStorySystem(empty, 100_000), empty);

  const activated = activateStory(empty, 2, 100_000);
  assert.equal(activated.states[2].status, "new");
  assert.ok(activated.states.every((state, index) => index === 2 || state.status === "empty"));
  assert.equal(activateStory(activated, 2, 100_100), activated);

  const viewing = stepStorySystem(activated, 101_200);
  assert.equal(viewing.states[2].status, "viewing");
  const leaving = stepStorySystem(viewing, 101_960);
  assert.equal(leaving.states[2].status, "leaving");
  const gone = stepStorySystem(leaving, 102_260);
  assert.ok(gone.states.every((state) => state.status === "empty"));
  assert.equal(activateStory(gone, 2, 102_300).states[2].status, "new");
});
