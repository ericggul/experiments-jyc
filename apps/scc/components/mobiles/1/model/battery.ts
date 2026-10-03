import { isAsleep } from "./sample.ts";
import { MINUTES_PER_DAY } from "./time.ts";
import type { DayPlan, Owner } from "./types.ts";

export type BatteryCurve = { level: Float32Array; charging: Uint8Array };

const cache = new WeakMap<DayPlan, BatteryCurve>();

/**
 * Battery level for every minute of a day plan. The phone charges while its
 * owner sleeps and drains faster while the screen is on; heavy users run low
 * by evening. Cached per plan.
 */
export function batteryCurve(plan: DayPlan, owner: Owner): BatteryCurve {
  const cached = cache.get(plan);
  if (cached) return cached;
  const level = new Float32Array(MINUTES_PER_DAY);
  const charging = new Uint8Array(MINUTES_PER_DAY);
  const health = 0.85 + ((owner.seed >>> 8) % 15) / 100;
  const activeDrain = 0.0013 / health;
  const idleDrain = 0.00025 / health;
  let value = 0.3 + ((owner.seed >>> 4) % 30) / 100;
  let sceneIndex = 0;
  for (let minute = 0; minute < MINUTES_PER_DAY; minute++) {
    while (plan.scenes[sceneIndex].end <= minute && sceneIndex < plan.scenes.length - 1) sceneIndex++;
    const scene = plan.scenes[sceneIndex];
    const plugged = isAsleep(plan, minute) && scene.app === "off";
    if (plugged) value = Math.min(1, value + 0.012);
    else value = Math.max(0.01, value - (scene.app === "off" ? idleDrain : activeDrain));
    level[minute] = value;
    charging[minute] = plugged && value < 1 ? 1 : 0;
  }
  const curve = { level, charging };
  cache.set(plan, curve);
  return curve;
}
