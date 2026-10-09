// Pure scene timeline for a looping TV spot. A scene's `enter` transition
// overlaps the first seconds of that scene with the tail of the previous one.

export type TransitionKind = "cut" | "dissolve" | "wipe" | "iris" | "flash" | "scan" | "push";

export type Transition = { kind: TransitionKind; duration: number };

export type SceneSpec<Id extends string = string> = {
  id: Id;
  duration: number;
  enter: Transition;
};

export type SceneFrame<Id extends string = string> = {
  id: Id;
  index: number;
  /** Seconds since the scene started; may exceed `duration` while it exits. */
  local: number;
  duration: number;
};

export type TimelineFrame<Id extends string = string> = {
  time: number;
  current: SceneFrame<Id>;
  /** Present only during the current scene's enter transition. */
  previous?: SceneFrame<Id>;
  transition: Transition;
  /** 0 → 1 across the enter transition; 1 once it has finished. */
  mix: number;
};

export const CUT: Transition = { kind: "cut", duration: 0 };

export function totalDuration(scenes: readonly SceneSpec[]) {
  return scenes.reduce((sum, scene) => sum + scene.duration, 0);
}

export function sceneStarts(scenes: readonly SceneSpec[]) {
  const starts: number[] = [];
  let at = 0;
  for (const scene of scenes) {
    starts.push(at);
    at += scene.duration;
  }
  return starts;
}

export function frameAt<Id extends string>(
  scenes: readonly SceneSpec<Id>[],
  time: number,
): TimelineFrame<Id> {
  const total = totalDuration(scenes);
  const looped = ((time % total) + total) % total;
  const starts = sceneStarts(scenes);
  let index = scenes.length - 1;
  for (let i = 0; i < scenes.length; i += 1) {
    if (looped < starts[i] + scenes[i].duration) {
      index = i;
      break;
    }
  }
  const scene = scenes[index];
  const local = looped - starts[index];
  const current = { id: scene.id, index, local, duration: scene.duration };
  const transition = scene.enter;
  if (transition.kind === "cut" || transition.duration <= 0 || local >= transition.duration) {
    return { time: looped, current, transition, mix: 1 };
  }
  const prevIndex = (index - 1 + scenes.length) % scenes.length;
  const prev = scenes[prevIndex];
  return {
    time: looped,
    current,
    previous: { id: prev.id, index: prevIndex, local: prev.duration + local, duration: prev.duration },
    transition,
    mix: local / transition.duration,
  };
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 0 before `from`, 1 after `to`, linear between. */
export const ramp = (t: number, from: number, to: number) =>
  to <= from ? (t >= to ? 1 : 0) : clamp01((t - from) / (to - from));

export const easeOutCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const easeInOutCubic = (x: number) => {
  const v = clamp01(x);
  return v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2;
};
export const easeOutBack = (x: number) => {
  const v = clamp01(x);
  const c = 1.70158;
  return 1 + (c + 1) * (v - 1) ** 3 + c * (v - 1) ** 2;
};

/** Eased presence of an element shown from `start` to `end`, fading over `fade` s. */
export const presence = (t: number, start: number, end: number, fade = 0.25) =>
  Math.min(easeOutCubic(ramp(t, start, start + fade)), 1 - ramp(t, end - fade, end));
