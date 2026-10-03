import assert from "node:assert/strict";
import test from "node:test";
import { hasView } from "./catalogue.ts";
import { planDay } from "./plan-day.ts";
import { createPopulation } from "./population.ts";
import { restingScene } from "./rest.ts";
import { sceneAt } from "./sample.ts";

const owners = createPopulation(90, 1);
const plans = owners.map((owner) => planDay(owner, 2));

test("no phone is ever fully dark", () => {
  for (let i = 0; i < owners.length; i++) {
    for (let minute = 0; minute < 1440; minute += 7) {
      const scene = restingScene(owners[i], plans[i], sceneAt(plans[i].scenes, minute), minute);
      assert.notEqual(scene.app, "off");
      if (scene.app !== "off") assert.ok(hasView(scene.app, scene.view), `${scene.app}/${scene.view}`);
    }
  }
});

test("night surfaces differ between people at 03:00", () => {
  const views = new Set(owners.map((owner, i) => {
    const scene = restingScene(owner, plans[i], sceneAt(plans[i].scenes, 180), 180);
    return `${scene.app}/${scene.view}`;
  }));
  assert.ok(views.size >= 3, [...views].join(", "));
});
