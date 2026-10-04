/**
 * Pure keyframe builder for in-app activity. A clone describes a session as
 * panels (pages of the app) and shots (when the person goes where, how far
 * they scroll, where they tap). This turns that script into Web Animations
 * keyframes on a timeline of simulated minutes, so the browser plays the
 * session at full frame rate, synced to the simulation speed.
 */

/** How a panel arrives; the outgoing panel leaves in the matching direction. */
export type Enter = "cut" | "tab" | "push" | "pop" | "sheet" | "dismiss" | "fade" | "swipe-up" | "swipe-down";

export type Shot = {
  /** Panel id to show. */
  panel: string;
  /** Simulated minutes from the scene start. */
  at: number;
  /** Scroll offset (pt) of the panel's content reached by the end of this shot. */
  scroll?: number;
  /** Number of decelerating flicks used to reach `scroll` (default 1). */
  flicks?: number;
  /** How the panel arrives (default: cut for the first shot, push after). */
  enter?: Enter;
  /** A finger tap (pt, on the 390 × 844 glass) just before this shot begins. */
  tap?: { x: number; y: number };
};

export type Script = { duration: number; shots: readonly Shot[] };

export type Frame = { offset: number; transform: string; opacity: number; zIndex: number; easing?: string };

export const storyboardConfig = {
  /** Length of an in-app transition, in simulated minutes (≈ 120 ms at 10 min/s). */
  transitionMinutes: 1.2,
  /** A tap shows this long before the transition it causes. */
  tapLeadMinutes: 0.9,
  /** Share of each flick's slot spent moving; the rest is reading. */
  flickShare: 0.55,
  /** iOS-like curves. */
  transitionEasing: "cubic-bezier(0.2, 0.9, 0.1, 1)",
  flickEasing: "cubic-bezier(0.1, 0.7, 0.2, 1)",
} as const;

type State = "shown" | "hidden" | "right" | "left" | "below" | "above";

const transforms: Record<State, string> = {
  shown: "translate(0px, 0px)",
  hidden: "translate(0px, 0px)",
  right: "translate(100%, 0px)",
  left: "translate(-30%, 0px)",
  below: "translate(0px, 100%)",
  above: "translate(0px, -100%)",
};

/** [incoming from, outgoing to, outgoing stays on top]. */
const motions: Record<Enter, { from: State; to: State; outgoingOnTop: boolean }> = {
  cut: { from: "shown", to: "hidden", outgoingOnTop: false },
  tab: { from: "shown", to: "hidden", outgoingOnTop: false },
  push: { from: "right", to: "left", outgoingOnTop: false },
  pop: { from: "left", to: "right", outgoingOnTop: true },
  sheet: { from: "below", to: "shown", outgoingOnTop: false },
  dismiss: { from: "shown", to: "below", outgoingOnTop: true },
  fade: { from: "hidden", to: "hidden", outgoingOnTop: false },
  "swipe-up": { from: "below", to: "above", outgoingOnTop: false },
  "swipe-down": { from: "above", to: "below", outgoingOnTop: false },
};

const EPSILON = 1e-4;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const frame = (offset: number, state: State, zIndex: number, easing?: string): Frame => ({
  offset: clamp01(offset),
  transform: transforms[state],
  opacity: state === "hidden" ? 0 : 1,
  zIndex,
  ...(easing ? { easing } : {}),
});

/** Shots sorted by time, clipped to the scene, with no two at the same instant. */
export function normalise(script: Script): Shot[] {
  const shots = [...script.shots].filter((shot) => shot.at < script.duration).sort((a, b) => a.at - b.at);
  const out: Shot[] = [];
  for (const shot of shots) {
    const previous = out[out.length - 1];
    // Shots never start before the previous transition has finished.
    const at = Math.max(0, previous ? Math.max(shot.at, previous.at + storyboardConfig.transitionMinutes + 0.05) : shot.at);
    if (at < script.duration) out.push({ ...shot, at });
  }
  return out;
}

/** Visibility and position keyframes for every panel. */
export function panelFrames(script: Script, panelIds: readonly string[]): Map<string, Frame[]> {
  const shots = normalise(script);
  const duration = Math.max(script.duration, EPSILON);
  const t = storyboardConfig.transitionMinutes / duration;
  const frames = new Map<string, Frame[]>();
  const current = new Map<string, { state: State; z: number }>();
  const first = shots[0]?.panel ?? panelIds[0];
  for (const id of panelIds) {
    const state: State = id === first ? "shown" : "hidden";
    frames.set(id, [frame(0, state, id === first ? 1 : 0)]);
    current.set(id, { state, z: id === first ? 1 : 0 });
  }
  const move = (id: string, at: number, from: State, to: State, z: number, instant: boolean) => {
    const list = frames.get(id);
    const now = current.get(id);
    if (!list || !now) return;
    // Hold the previous state right up to the event, then jump to its start.
    list.push(frame(at - EPSILON, now.state, now.z));
    list.push(frame(at, from, z, instant ? undefined : storyboardConfig.transitionEasing));
    list.push(frame(instant ? at + EPSILON : at + t, to, z));
    current.set(id, { state: to, z });
  };
  let visible = first;
  // The page left showing beneath an open sheet.
  let under: string | null = null;
  for (const shot of shots.slice(1)) {
    if (shot.panel === visible || !frames.has(shot.panel)) continue;
    const at = shot.at / duration;
    const enter = shot.enter ?? "push";
    const motion = motions[enter];
    const instant = enter === "cut" || enter === "tab";
    if (under !== null && under !== shot.panel) {
      // Leaving a sheet for anywhere but its page: drop the page beneath first.
      const list = frames.get(under);
      const now = current.get(under);
      if (list && now) {
        list.push(frame(at - EPSILON, now.state, now.z));
        list.push(frame(at, now.state, 0));
        list.push(frame(at + t + EPSILON, "hidden", 0));
        current.set(under, { state: "hidden", z: 0 });
      }
      under = null;
    }
    move(shot.panel, at, motion.from, "shown", motion.outgoingOnTop ? 1 : 2, instant);
    move(visible, at, "shown", motion.to, motion.outgoingOnTop ? 2 : 1, instant);
    if (enter === "sheet") {
      // The page stays visible beneath the sheet until the sheet is dismissed.
      under = visible;
    } else if (motion.to === "left") {
      // A pushed-away page is hidden once covered.
      const list = frames.get(visible);
      if (list) list.push(frame(at + t + EPSILON, "hidden", 0));
      current.set(visible, { state: "hidden", z: 0 });
    }
    if (shot.panel === under) under = null;
    visible = shot.panel;
  }
  for (const list of frames.values()) {
    const last = list[list.length - 1];
    if (last.offset < 1) list.push({ ...last, offset: 1, easing: undefined });
  }
  return frames;
}

export type ScrollFrame = { offset: number; transform: string; easing?: string };

/** Scroll keyframes for every panel's content. */
export function scrollFrames(script: Script, panelIds: readonly string[]): Map<string, ScrollFrame[]> {
  const shots = normalise(script);
  const duration = Math.max(script.duration, EPSILON);
  const position = new Map(panelIds.map((id) => [id, 0]));
  const frames = new Map<string, ScrollFrame[]>(panelIds.map((id) => [id, [{ offset: 0, transform: "translate(0px, 0px)" }]]));
  const at = (value: number) => `translate(0px, ${-value}px)`;
  shots.forEach((shot, index) => {
    const list = frames.get(shot.panel);
    if (!list || shot.scroll === undefined) return;
    const from = position.get(shot.panel) ?? 0;
    // Wait out a transition only when the panel actually changes.
    const moved = index > 0 && shots[index - 1].panel !== shot.panel;
    const start = shot.at + (moved ? storyboardConfig.transitionMinutes : 0);
    const end = shots[index + 1]?.at ?? duration;
    if (end <= start || shot.scroll === from) return;
    const flicks = Math.max(1, Math.round(shot.flicks ?? 1));
    const slot = (end - start) / flicks;
    for (let flick = 0; flick < flicks; flick++) {
      const t0 = start + flick * slot;
      const t1 = t0 + slot * storyboardConfig.flickShare;
      const v0 = from + ((shot.scroll - from) * flick) / flicks;
      const v1 = from + ((shot.scroll - from) * (flick + 1)) / flicks;
      list.push({ offset: clamp01(t0 / duration), transform: at(v0), easing: storyboardConfig.flickEasing });
      list.push({ offset: clamp01(t1 / duration), transform: at(v1) });
    }
    position.set(shot.panel, shot.scroll);
  });
  for (const list of frames.values()) {
    const last = list[list.length - 1];
    if (last.offset < 1) list.push({ offset: 1, transform: last.transform });
  }
  return frames;
}

export type TapFrame = { offset: number; transform: string; opacity: number };

/** One finger-tap marker that hops to each tap point just before its shot. */
export function tapFrames(script: Script): TapFrame[] {
  const shots = normalise(script);
  const duration = Math.max(script.duration, EPSILON);
  const lead = storyboardConfig.tapLeadMinutes;
  const frames: TapFrame[] = [{ offset: 0, transform: "translate(-100px, -100px) scale(0.6)", opacity: 0 }];
  for (const shot of shots) {
    if (!shot.tap) continue;
    const place = `translate(${shot.tap.x - 22}px, ${shot.tap.y - 22}px)`;
    const start = Math.max(0, shot.at - lead) / duration;
    const press = Math.max(0, shot.at - lead / 2) / duration;
    const release = shot.at / duration;
    const last = frames[frames.length - 1];
    if (start <= last.offset) continue;
    frames.push({ offset: start - EPSILON, transform: last.transform, opacity: 0 });
    frames.push({ offset: start, transform: `${place} scale(0.6)`, opacity: 0 });
    frames.push({ offset: press, transform: `${place} scale(1)`, opacity: 0.32 });
    frames.push({ offset: release, transform: `${place} scale(1.25)`, opacity: 0 });
  }
  if (frames[frames.length - 1].offset < 1) frames.push({ ...frames[frames.length - 1], offset: 1 });
  return frames.map((item) => ({ ...item, offset: clamp01(item.offset) }));
}

/** Web Animations needs non-decreasing offsets; clamp any epsilon overlap. */
export function monotonic<T extends { offset: number }>(frames: readonly T[]): T[] {
  let floor = 0;
  return frames.map((item) => {
    floor = Math.max(floor, item.offset);
    return { ...item, offset: floor };
  });
}

/** The last keyframe at or before `offset`: a static fallback for first paint. */
export function frameAt<T extends { offset: number }>(frames: readonly T[], offset: number): T {
  let result = frames[0];
  for (const item of frames) {
    if (item.offset <= offset) result = item;
    else break;
  }
  return result;
}

/** The way back out of a transition: push ↔ pop, sheet ↔ dismiss, swipe-up ↔ swipe-down. */
export function reverseEnter(enter: Enter): Enter {
  const pairs: Partial<Record<Enter, Enter>> = { push: "pop", pop: "push", sheet: "dismiss", dismiss: "sheet", "swipe-up": "swipe-down", "swipe-down": "swipe-up" };
  return pairs[enter] ?? enter;
}

/**
 * Two-frame keyframes for one panel in a single transition, from the same
 * motion table the timeline uses. `in` is the arriving panel, `out` the
 * leaving one. Null when that side does not move (a page staying beneath a sheet).
 */
export function transitionKeyframes(enter: Enter, role: "in" | "out"): { transform: string; opacity: number }[] | null {
  const motion = motions[enter];
  const pair: [State, State] = role === "in" ? [motion.from, "shown"] : ["shown", motion.to];
  if (pair[0] === pair[1]) return null;
  return pair.map((state) => ({ transform: transforms[state], opacity: state === "hidden" ? 0 : 1 }));
}

/** Whether the page left behind stays visible (beneath a sheet). */
export const keepsUnderneath = (enter: Enter) => enter === "sheet";
