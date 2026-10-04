import assert from "node:assert/strict";
import test from "node:test";
import { buildNavigation, hotspots, nextStep } from "./storyboard-graph.ts";
import { reverseEnter, transitionKeyframes, type Script } from "./storyboard-model.ts";

const script: Script = {
  duration: 30,
  shots: [
    { panel: "feed", at: 0, scroll: 800 },
    { panel: "post-1", at: 4, enter: "push", tap: { x: 195, y: 360 } },
    { panel: "feed", at: 7, enter: "pop", tap: { x: 20, y: 76 } },
    { panel: "feed", at: 9, scroll: 1600 },
    { panel: "profile-1", at: 12, enter: "push", tap: { x: 40, y: 125 } },
    { panel: "feed", at: 15, enter: "pop" },
    { panel: "post-2", at: 19, enter: "push", tap: { x: 195, y: 360 } },
  ],
};
const ids = ["feed", "post-1", "profile-1", "post-2"];
const nav = buildNavigation(script, ids);

test("each change of panel becomes an edge from the panel it left", () => {
  assert.equal(nav.start, "feed");
  assert.deepEqual(nav.edges.get("feed")?.map((edge) => edge.to), ["post-1", "profile-1", "post-2"]);
  assert.deepEqual(nav.edges.get("post-1")?.map((edge) => edge.to), ["feed"]);
});

test("hotspots at the same point walk through the session", () => {
  assert.deepEqual(hotspots(nav, "feed", 0).map((edge) => edge.to).sort(), ["post-1", "profile-1"]);
  assert.deepEqual(hotspots(nav, "feed", 4).map((edge) => edge.to).sort(), ["post-2", "profile-1"]);
});

test("the scripted path continues after the cursor", () => {
  assert.equal(nextStep(nav, "feed", 2)?.to, "profile-1");
  assert.equal(nextStep(nav, "post-2", 6), null);
});

test("transitions reverse cleanly and a page beneath a sheet stays put", () => {
  assert.equal(reverseEnter("push"), "pop");
  assert.equal(reverseEnter("sheet"), "dismiss");
  assert.equal(transitionKeyframes("sheet", "out"), null);
  assert.deepEqual(transitionKeyframes("push", "in")?.map((frame) => frame.transform), ["translate(100%, 0px)", "translate(0px, 0px)"]);
});
