import assert from "node:assert/strict";
import test from "node:test";
import { frameAt, monotonic, normalise, panelFrames, scrollFrames, tapFrames, type Script } from "./storyboard-model.ts";

const script: Script = {
  duration: 20,
  shots: [
    { panel: "feed", at: 0, scroll: 1200, flicks: 3 },
    { panel: "post", at: 6, enter: "push", tap: { x: 200, y: 400 } },
    { panel: "comments", at: 6.5, enter: "sheet", scroll: 300 },
    { panel: "feed", at: 12, enter: "pop", scroll: 2400, flicks: 2 },
    { panel: "reel", at: 17, enter: "swipe-up" },
  ],
};
const ids = ["feed", "post", "comments", "reel"];

test("shots never overlap a running transition", () => {
  const shots = normalise(script);
  for (let i = 1; i < shots.length; i++) assert.ok(shots[i].at - shots[i - 1].at >= 1.2);
});

test("all keyframe offsets are within [0, 1] and non-decreasing after clamping", () => {
  const lists = [...panelFrames(script, ids).values(), ...scrollFrames(script, ids).values(), tapFrames(script)];
  for (const list of lists) {
    const fixed = monotonic(list);
    assert.equal(fixed[0].offset, 0);
    assert.equal(fixed[fixed.length - 1].offset, 1);
    for (let i = 1; i < fixed.length; i++) assert.ok(fixed[i].offset >= fixed[i - 1].offset);
  }
});

test("exactly one panel is fully shown between transitions", () => {
  const frames = panelFrames(script, ids);
  for (const minute of [2, 5, 10, 15, 19]) {
    const shown = ids.filter((id) => {
      const f = frameAt(monotonic(frames.get(id) ?? []), minute / script.duration);
      return f.opacity === 1 && f.transform === "translate(0px, 0px)";
    });
    assert.equal(shown.length >= 1, true, `minute ${minute}`);
  }
  const at5 = ids.filter((id) => frameAt(monotonic(frames.get(id) ?? []), 5 / 20).opacity === 1);
  assert.deepEqual(at5, ["feed"]);
});

test("the feed keeps its scroll position across a visit to another panel", () => {
  const feed = monotonic(scrollFrames(script, ids).get("feed") ?? []);
  assert.equal(frameAt(feed, 11 / 20).transform, "translate(0px, -1200px)");
  assert.equal(feed[feed.length - 1].transform, "translate(0px, -2400px)");
});

test("a page stays visible beneath its sheet and is dropped once the sheet leaves elsewhere", () => {
  const frames = panelFrames(script, ids);
  const post = monotonic(frames.get("post") ?? []);
  // Comments sheet is open from 6.5 to 12; the post shows beneath it.
  assert.equal(frameAt(post, 9 / 20).opacity, 1);
  // After popping to the feed, the post is gone.
  assert.equal(frameAt(post, 15 / 20).opacity, 0);
});

test("a same-panel shot scrolls immediately, with no transition pause", () => {
  const still: Script = { duration: 10, shots: [{ panel: "feed", at: 0, scroll: 500 }, { panel: "feed", at: 4, scroll: 900 }] };
  const feed = monotonic(scrollFrames(still, ["feed"]).get("feed") ?? []);
  const second = feed.find((item) => item.transform === "translate(0px, -500px)" && item.offset >= 0.4);
  assert.ok(second && Math.abs(second.offset - 0.4) < 1e-9, String(second?.offset));
});
