// The experiment's one parameter: a height threshold Z swept over the xyt cube.
// `below` admits buildings no taller than Z (the city accumulates as Z rises);
// `above` keeps only buildings that reach Z (a horizontal section through time).

export type ThresholdMode = "below" | "above";

export const THRESHOLD_MODES: readonly ThresholdMode[] = ["below", "above"];

/** Slider exponent: most of the fabric is under 40 m, the towers reach 541 m. */
const CONTROL_EXPONENT = 3;

/** Slider position in [0, 1] → threshold metres. */
export function heightAtControl(control: number, maxHeightM: number) {
  const s = Math.min(1, Math.max(0, control));
  return maxHeightM * s ** CONTROL_EXPONENT;
}

/** Threshold metres → slider position in [0, 1]. */
export function controlAtHeight(heightM: number, maxHeightM: number) {
  if (maxHeightM <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, heightM / maxHeightM));
  return ratio ** (1 / CONTROL_EXPONENT);
}

export function isAdmitted(heightM: number, thresholdM: number, mode: ThresholdMode) {
  return mode === "below" ? heightM <= thresholdM : heightM >= thresholdM;
}

/** Height band just admitted at the threshold, shown as the frontier. */
export function frontierWidth(thresholdM: number) {
  return Math.max(1.5, thresholdM * 0.06);
}

export function isFrontier(heightM: number, thresholdM: number, mode: ThresholdMode) {
  return (
    isAdmitted(heightM, thresholdM, mode) &&
    Math.abs(heightM - thresholdM) <= frontierWidth(thresholdM)
  );
}

/** Autonomous sweep: one pass of the slider, start to end, in this many seconds. */
export const SWEEP_SECONDS = 36;
/** Autonomous update rate cap (GPU safety budget). */
export const SWEEP_HZ = 24;

/** Sweep start for each mode: below rises from 0, above descends from the top. */
export function sweepStart(mode: ThresholdMode) {
  return mode === "below" ? 0 : 1;
}

/** Advance the slider position by `seconds`; returns null once the pass ends. */
export function advanceSweep(control: number, seconds: number, mode: ThresholdMode) {
  const step = seconds / SWEEP_SECONDS;
  const next = mode === "below" ? control + step : control - step;
  if (next > 1 || next < 0) return null;
  return next;
}
