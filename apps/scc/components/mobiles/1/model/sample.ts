import { timeConfig } from "./time.ts";
import type { DayPlan, Minute, Push, Scene } from "./types.ts";

/** Whether the owner is in their night's sleep (Sleep Focus on) at `minute`. */
export function isAsleep(plan: DayPlan, minute: Minute): boolean {
  return plan.sleep < plan.wake ? minute >= plan.sleep && minute < plan.wake : minute >= plan.sleep || minute < plan.wake;
}

/** The scene covering `minute` (binary search over contiguous scenes). */
export function sceneAt(scenes: readonly Scene[], minute: Minute): Scene {
  let low = 0;
  let high = scenes.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (scenes[mid].start <= minute) low = mid;
    else high = mid - 1;
  }
  return scenes[low];
}

/** Pushes delivered since the person last had the phone in hand, newest first. */
export function unseenPushes(plan: DayPlan, minute: Minute, limit = 6): Push[] {
  let lastActive = -Infinity;
  for (const scene of plan.scenes) {
    if (scene.start > minute) break;
    if (scene.app !== "off" && scene.app !== "lock" && scene.app !== "alarm") lastActive = Math.min(scene.end, minute);
  }
  const result: Push[] = [];
  for (let i = plan.pushes.length - 1; i >= 0 && result.length < limit; i--) {
    const push = plan.pushes[i];
    if (push.at <= minute && push.at > lastActive) result.push(push);
  }
  return result;
}

/** The push to show as a banner over an active screen, if one just arrived. */
export function bannerPush(plan: DayPlan, minute: Minute, window = timeConfig.bannerMinutes): Push | null {
  for (let i = plan.pushes.length - 1; i >= 0; i--) {
    const push = plan.pushes[i];
    if (push.at > minute) continue;
    return minute - push.at < window ? push : null;
  }
  return null;
}
