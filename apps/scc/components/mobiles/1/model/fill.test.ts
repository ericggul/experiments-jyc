import assert from "node:assert/strict";
import test from "node:test";
import { planDay } from "./plan-day.ts";
import { createPopulation } from "./population.ts";
import { isAsleep, sceneAt } from "./sample.ts";

const owners = createPopulation(90, 1);

function awakeOnShare(screenTime: number) {
  let on = 0;
  let awake = 0;
  for (const owner of owners) {
    if (owner.archetype === "early-shift") continue;
    const plan = planDay(owner, 2, { sameness: 0.6, notificationRate: 1, synchrony: true, seed: 1, screenTime });
    for (let minute = 0; minute < 1440; minute += 5) {
      if (isAsleep(plan, minute)) continue;
      awake++;
      if (sceneAt(plan.scenes, minute).app !== "off") on++;
    }
  }
  return on / awake;
}

test("awake phones are on most of the time at the default screen time", () => {
  assert.ok(awakeOnShare(0.85) >= 0.75, String(awakeOnShare(0.85)));
});

test("screen time scales how often awake phones are on", () => {
  assert.ok(awakeOnShare(0.85) > awakeOnShare(0) + 0.15);
});
