import { createRng, hash } from "./rng.ts";
import { isAsleep } from "./sample.ts";
import type { DayPlan, Owner, Scene } from "./types.ts";

/**
 * What a phone shows while nobody holds it. The day plan marks those spans
 * `off`; this resolves them into resting surfaces. By day the screen is the
 * always-on lock screen. At night each person keeps one habit, tunable here.
 */
export type NightHabit = "sleep-focus" | "standby" | "sounds" | "wind-down" | "baby-monitor";

export const nightHabits: readonly (readonly [NightHabit, number])[] = [
  ["sleep-focus", 40],
  ["standby", 30],
  ["sounds", 18],
  ["wind-down", 12],
];

/** Minutes a sleep-sounds or wind-down session plays before the phone locks. */
export const nightSession = { sounds: [25, 60], "wind-down": [8, 15] } as const;

export function nightHabit(owner: Owner): NightHabit {
  if (owner.archetype === "new-parent") return "baby-monitor";
  return createRng(hash("night-habit", owner.seed)).weighted(nightHabits);
}

/** Minutes since the person put the phone down for the night. */
function minutesIntoNight(plan: DayPlan, minute: number) {
  return (minute - plan.sleep + 1440) % 1440;
}

export function restingScene(owner: Owner, plan: DayPlan, scene: Scene, minute: number): Scene {
  if (scene.app !== "off") return scene;
  if (!isAsleep(plan, minute)) return { ...scene, app: "lock", view: "always-on" };
  const habit = nightHabit(owner);
  const into = minutesIntoNight(plan, minute);
  const rest = (app: Scene["app"], view: string, part: string): Scene => ({ ...scene, id: `${scene.id}:${part}`, app, view });
  if (habit === "baby-monitor") return rest("baby", "monitor", "monitor");
  if (habit === "standby") return rest("lock", "standby", "standby");
  if (habit === "sounds" || habit === "wind-down") {
    const [low, high] = nightSession[habit];
    const length = createRng(hash("night-session", owner.seed, plan.day)).int(low, high);
    // Sessions start at bedtime; the start keeps the clone's elapsed time honest.
    if (into < length) return { ...rest("drift", habit, habit), start: (plan.sleep + 1440) % 1440 };
    return habit === "wind-down" ? rest("lock", "standby", "standby") : rest("lock", "sleep", "sleep");
  }
  return rest("lock", "sleep", "sleep");
}
