import assert from "node:assert/strict";
import test from "node:test";
import { globalEvents } from "./notifications.ts";
import { defaultPlanOptions, planDay, type PlanOptions } from "./plan-day.ts";
import { createPopulation } from "./population.ts";

const owners = createPopulation(90, 1);
const options = (overrides: Partial<PlanOptions> = {}): PlanOptions => ({ ...defaultPlanOptions, ...overrides });

test("three to five global events per day, deterministic from seed and day", () => {
  for (let day = 0; day < 10; day++) {
    const events = globalEvents(1, day, false);
    assert.ok(events.length >= 3 && events.length <= 5);
    assert.deepEqual(events, globalEvents(1, day, false));
    assert.equal(new Set(events.map((event) => event.id)).size, events.length);
  }
});

test("with synchrony on, global events land at the same minute on every phone", () => {
  const plans = owners.map((owner) => planDay(owner, 2));
  const expected = globalEvents(1, 2, false).map((event) => event.id);
  for (const id of expected) {
    const hits = plans.map((plan) => plan.pushes.filter((push) => push.globalId === id));
    assert.ok(hits.every((list) => list.length === 1), `${id} missing on a phone`);
    assert.equal(new Set(hits.map((list) => list[0].at)).size, 1, `${id} not simultaneous`);
  }
});

test("with synchrony off there are no global events", () => {
  for (const owner of owners) {
    const plan = planDay(owner, 2, options({ synchrony: false }));
    assert.ok(plan.pushes.every((push) => push.globalId === undefined));
    assert.ok(!plan.scenes.some((scene) => scene.view === "update" || scene.view === "reconnecting"));
  }
});

test("notification rate 0 leaves only global pushes; rate scales density", () => {
  let low = 0;
  let high = 0;
  for (const owner of owners) {
    assert.ok(planDay(owner, 1, options({ notificationRate: 0 })).pushes.every((push) => push.globalId !== undefined));
    low += planDay(owner, 1, options({ notificationRate: 1, synchrony: false })).pushes.length;
    high += planDay(owner, 1, options({ notificationRate: 3, synchrony: false })).pushes.length;
  }
  assert.ok(high > low * 2, `${high} vs ${low}`);
});

test("asleep phones get no pushes except the baby app and global events", () => {
  for (const owner of owners) {
    const plan = planDay(owner, 2);
    for (const push of plan.pushes) {
      if (push.globalId || push.app === "baby") continue;
      const asleep = plan.sleep < plan.wake ? push.at >= plan.sleep && push.at < plan.wake : push.at >= plan.sleep || push.at < plan.wake;
      const lateTail = push.at < plan.wake && planDay(owner, 1).sleep < planDay(owner, 1).wake && push.at < planDay(owner, 1).sleep;
      assert.ok(!asleep || lateTail, `${owner.id} push at ${push.at} while asleep (${plan.sleep}–${plan.wake})`);
    }
  }
});

test("copy uses no real brand names", () => {
  const banned = /\b(slack|zoom|uber|lyft|instagram|tiktok|doordash|grubhub|seamless|venmo|chase|amazon|apple|iphone|ios|google|gmail|outlook|spotify|resy|opentable|whatsapp|citymapper|mta|strava|nike)\b/i;
  for (const owner of owners) {
    for (const push of planDay(owner, 0).pushes) {
      for (const text of [push.title, push.body, push.subtitle ?? ""]) assert.ok(!banned.test(text), text);
    }
  }
});
