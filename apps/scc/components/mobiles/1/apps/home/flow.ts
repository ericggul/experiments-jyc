import type { Enter, Shot } from "../../ios";

/** Shortest stay on a panel: one transition plus a beat, in simulated minutes. */
export const MIN_DWELL = 1.35;
/** Longest stay on a panel, so interactive views keep at least one shot per 2.5 simulated minutes. */
export const MAX_DWELL = 2.45;

/** A session script under construction, on a clock of simulated minutes. */
export type Flow = {
  readonly shots: Shot[];
  /** Current time in the session. */
  readonly t: number;
  /** Still room for more shots. */
  readonly open: boolean;
  /** Go to a panel now, stay `dwell` simulated minutes, optionally scrolling or tapping first. */
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
      shots.push(shots.length === 0 ? { panel, at: t, enter: "cut", scroll: options.scroll, flicks: options.flicks } : { panel, at: t, ...options });
      t += Math.min(MAX_DWELL, Math.max(MIN_DWELL, dwell));
    },
  };
}
