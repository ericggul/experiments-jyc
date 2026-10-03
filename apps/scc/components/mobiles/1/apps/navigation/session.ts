import type { Enter, Shot } from "../../ios";

/** A session script under construction: the lead's clock in simulated minutes. */
export type Flow = {
  readonly shots: Shot[];
  /** Current time in the session. */
  readonly t: number;
  /** Still room for more shots. */
  readonly open: boolean;
  /** Go to a panel now, stay `dwell` simulated minutes, optionally scrolling or tapping. */
  go: (panel: string, dwell: number, options?: { enter?: Enter; scroll?: number; flicks?: number; tap?: { x: number; y: number } }) => void;
};

/** Collects shots one after another; shots past the scene end are dropped by the storyboard. */
export function createFlow(total: number): Flow {
  const shots: Shot[] = [];
  let t = 0;
  return {
    shots,
    get t() {
      return t;
    },
    get open() {
      return t < total;
    },
    go(panel, dwell, options = {}) {
      shots.push({ panel, at: t, ...options, ...(shots.length === 0 ? { enter: "cut" as const, tap: undefined } : {}) });
      t += Math.max(1.4, dwell);
    },
  };
}

/** The panel on screen at `elapsed`, from the same shots the storyboard plays. */
export function panelAt(shots: readonly Shot[], elapsed: number): string {
  let current = shots[0]?.panel ?? "";
  for (const shot of shots) {
    if (shot.at <= elapsed) current = shot.panel;
    else break;
  }
  return current;
}

/** Index of the shot on screen at `elapsed` (steps through an ordered sequence). */
export function shotIndexAt(shots: readonly Shot[], elapsed: number): number {
  let index = 0;
  shots.forEach((shot, i) => {
    if (shot.at <= elapsed) index = i;
  });
  return index;
}
