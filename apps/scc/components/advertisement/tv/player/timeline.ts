// Scene index for a cloned TV spot. Times are seconds on the original cut.

export type SceneMark = {
  id: string;
  /** Short on-screen copy of the scene, used by the scene navigator. */
  label: string;
  start: number;
  end: number;
};

export function sceneIndexAt(scenes: readonly SceneMark[], time: number) {
  for (let i = scenes.length - 1; i >= 0; i -= 1) {
    if (time >= scenes[i].start) return i;
  }
  return 0;
}

/** Wraps time into the spot's duration. */
export function loopTime(time: number, duration: number) {
  return ((time % duration) + duration) % duration;
}

/** Last entry whose `at` is not after `time`, for step-changing layers. */
export function stepAt<T extends { at: number }>(steps: readonly T[], time: number): T | undefined {
  let current: T | undefined;
  for (const step of steps) {
    if (step.at <= time) current = step;
  }
  return current;
}

export const formatTime = (seconds: number) => {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
