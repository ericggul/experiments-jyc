import assert from "node:assert/strict";
import test from "node:test";
import { hasView, isAppId } from "./catalogue.ts";
import { defaultPlanOptions, planDay, type PlanOptions } from "./plan-day.ts";
import { personas } from "./personas.ts";
import { createPopulation } from "./population.ts";
import type { DayPlan } from "./types.ts";

const owners = createPopulation(90, 1);
const options = (overrides: Partial<PlanOptions> = {}): PlanOptions => ({ ...defaultPlanOptions, ...overrides });
const sequence = (plan: DayPlan) => plan.scenes.map((scene) => `${scene.start}-${scene.end}:${scene.app}/${scene.view}`).join("|");

test("every day is contiguous over [0, 1440) with catalogue views", () => {
  for (const sameness of [0, 0.6, 1]) {
    for (const day of [0, 1, 4, 5]) {
      for (const owner of owners) {
        const { scenes } = planDay(owner, day, options({ sameness }));
        assert.equal(scenes[0].start, 0);
        assert.equal(scenes[scenes.length - 1].end, 1440);
        const ids = new Set<string>();
        scenes.forEach((scene, index) => {
          assert.ok(scene.end > scene.start, `empty scene ${scene.id}`);
          if (index > 0) assert.equal(scene.start, scenes[index - 1].end, `gap before ${scene.id}`);
          assert.ok(Number.isInteger(scene.start) && Number.isInteger(scene.end));
          if (scene.app === "off") assert.equal(scene.view, "off");
          else assert.ok(isAppId(scene.app) && hasView(scene.app, scene.view), `${scene.app}/${scene.view}`);
          ids.add(scene.id);
        });
        assert.equal(ids.size, scenes.length);
      }
    }
  }
});

test("alarm scenes ring briefly and snooze for the iOS interval", () => {
  for (const owner of owners) {
    for (const scene of planDay(owner, 2).scenes) {
      if (scene.app === "alarm" && scene.view === "ringing") assert.ok(scene.end - scene.start <= 3);
      if (scene.app === "alarm" && scene.view === "snoozed") assert.equal(scene.end - scene.start, 9);
    }
  }
});

test("plans are deterministic and change with the seed", () => {
  for (const owner of owners.slice(0, 20)) {
    assert.deepEqual(planDay(owner, 3), planDay(owner, 3));
    assert.notEqual(sequence(planDay(owner, 3, options({ seed: 1 }))), sequence(planDay(owner, 3, options({ seed: 2 }))));
  }
});

test("pushes are sorted, inside the day and unique", () => {
  for (const owner of owners) {
    const { pushes } = planDay(owner, 1);
    const ids = new Set(pushes.map((push) => push.id));
    assert.equal(ids.size, pushes.length);
    pushes.forEach((push, index) => {
      assert.ok(push.at >= 0 && push.at < 1440);
      if (index > 0) assert.ok(push.at >= pushes[index - 1].at);
      assert.ok(isAppId(push.app));
      assert.ok(push.title.length > 0 && push.body.length > 0);
    });
  }
});

test("the night scroll continues across midnight into the next day", () => {
  let continued = 0;
  for (const owner of owners) {
    const today = planDay(owner, 1);
    const tomorrow = planDay(owner, 2);
    const last = today.scenes[today.scenes.length - 1];
    const first = tomorrow.scenes[0];
    if (today.sleep === 0) continue; // dark exactly at midnight
    // A lit screen at 23:59 is still lit at 00:00 (bedtime exactly at midnight may light it).
    if (last.app !== "off") assert.notEqual(first.app, "off", `${owner.id} goes dark at midnight`);
    if (today.sleep < today.wake) {
      // Tomorrow's small hours replay tonight's scroll until the screen goes dark.
      const dark = tomorrow.scenes.findIndex((scene) => scene.start === today.sleep);
      assert.ok(dark > 0, `${owner.id} has no scene boundary at ${today.sleep}`);
      assert.equal(tomorrow.scenes[dark].app, "off");
      assert.notEqual(tomorrow.scenes[dark - 1].app, "off");
      continued++;
    } else assert.equal(first.app, "off");
  }
  assert.ok(continued > 5, `only ${continued} late scrollers`);
});

test("days vary across weekdays below sameness 1", () => {
  for (const owner of owners) {
    const days = [0, 1, 2, 3, 4].map((day) => sequence(planDay(owner, day)));
    assert.equal(new Set(days).size, 5, `${owner.id} repeats a day`);
  }
});

test("sameness 1 makes an archetype identical, and its weekdays identical", () => {
  const same = options({ sameness: 1, synchrony: false });
  const byArchetype = new Map<string, string>();
  for (const owner of owners) {
    const plan = planDay(owner, 2, same);
    const key = `${sequence(plan)}#${plan.pushes.map((push) => push.at).join(",")}`;
    const seen = byArchetype.get(owner.archetype);
    if (seen === undefined) byArchetype.set(owner.archetype, key);
    else assert.equal(key, seen, `${owner.id} differs from its archetype`);
    // Tuesday to Thursday carry no weekday rule.
    assert.equal(sequence(planDay(owner, 1, same)), sequence(plan));
    assert.equal(sequence(planDay(owner, 3, same)), sequence(plan));
  }
  assert.ok(byArchetype.size >= 8);
});

test("no two phones share a whole-day scene sequence at sameness 0.6", () => {
  const sequences = owners.map((owner) => sequence(planDay(owner, 2)));
  assert.equal(new Set(sequences).size, owners.length);
});

test("wake times cluster within each archetype's range", () => {
  const population = createPopulation(150, 4);
  for (const owner of population) {
    const persona = personas[owner.archetype];
    const { wake, sleep } = planDay(owner, 2, options({ sameness: 0 }));
    const usual = persona.alarm ?? persona.rise?.at ?? 0;
    const sd = persona.alarm === null ? persona.rise?.sd ?? 0 : persona.alarmSd;
    const snoozeTail = persona.snooze.max * 11 + 3;
    assert.ok(wake >= usual - sd * 4 - 5 && wake <= usual + sd * 4 + snoozeTail + 5, `${owner.archetype} woke at ${wake}`);
    assert.ok(sleep >= 0 && sleep < 1440);
  }
});

test("new parents wake at night; others only glance at the time before their alarm", () => {
  const same = options({ sameness: 0.3 });
  for (const owner of owners) {
    const plan = planDay(owner, 2, same);
    const previous = planDay(owner, 1, same);
    const tailEnd = previous.sleep < previous.wake ? previous.sleep : 0;
    const night = plan.scenes.filter((scene) => scene.start >= tailEnd && scene.end <= plan.wake && scene.app !== "off" && scene.app !== "alarm");
    if (owner.archetype === "new-parent") assert.ok(night.some((scene) => scene.app === "baby"));
    else assert.ok(night.every((scene) => scene.app === "lock" && scene.view === "sleep" && scene.end - scene.start <= 2), owner.id);
  }
});

test("Monday opens with the Screen Time report", () => {
  for (const owner of owners) {
    const plan = planDay(owner, 0);
    assert.ok(plan.scenes.some((scene) => scene.app === "screen-time" && scene.view === "weekly-report" && scene.start >= plan.wake));
    assert.ok(!planDay(owner, 2).scenes.some((scene) => scene.app === "screen-time"));
  }
});

test("population bands: alarm wave, commute band, lunch and night glow", () => {
  const plans = owners.map((owner) => planDay(owner, 2));
  const activeAt = (minute: number, apps: readonly string[]) =>
    plans.filter((plan) => plan.scenes.some((scene) => scene.start <= minute && minute < scene.end && apps.includes(scene.app))).length;
  const alarms = plans.flatMap((plan) => plan.scenes.filter((scene) => scene.app === "alarm" && scene.view === "ringing").map((scene) => scene.start));
  assert.ok(alarms.filter((minute) => minute >= 390 && minute <= 480).length > alarms.length * 0.4);
  const commuting = (minute: number) => activeAt(minute, ["transit", "navigation", "ride-hail"]);
  assert.ok(commuting(8 * 60 + 30) > commuting(3 * 60) + 5);
  const lit = (minute: number) => plans.filter((plan) => plan.scenes.some((scene) => scene.start <= minute && minute < scene.end && scene.app !== "off")).length;
  assert.ok(lit(23 * 60 + 40) > lit(3 * 60 + 30) + 15);
});

test("planning 150 people for one day is fast", () => {
  const population = createPopulation(150, 9);
  population.forEach((owner) => planDay(owner, 0));
  const start = performance.now();
  population.forEach((owner) => planDay(owner, 1));
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 60, `took ${elapsed.toFixed(1)} ms`);
});
