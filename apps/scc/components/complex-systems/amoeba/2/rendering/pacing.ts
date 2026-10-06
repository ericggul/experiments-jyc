/**
 * Frame pacing for display-rate rendering. Rendering every vsync avoids the
 * judder of a rate that does not divide the display's (24 fps on 60 Hz shows
 * frames for 2, 3, 2… vsyncs). Resolution is never reduced: when frames arrive
 * late, rendering moves to every second vsync, which keeps pacing even, and
 * returns to every vsync once frames are on time again.
 */
export const QUALITY_LEVELS = [{ everyOther: false }, { everyOther: true }] as const;

const LATE = 1.45;
const ON_TIME = 1.15;
const LATE_FRAMES_TO_DROP = 18;
const ON_TIME_FRAMES_TO_RAISE = 240;

export type Pacer = {
  /** Display refresh interval estimate, ms. */
  refresh: number;
  level: number;
  late: number;
  onTime: number;
  vsync: number;
  previousVsync: number;
  previousRender: number;
};

export function createPacer(): Pacer {
  return { refresh: 1000 / 60, level: 0, late: 0, onTime: 0, vsync: 0, previousVsync: 0, previousRender: 0 };
}

/**
 * Feeds one vsync timestamp (ms); returns whether to render this vsync, the
 * time since the last rendered frame, and whether the quality level changed.
 */
export function pace(pacer: Pacer, now: number) {
  const vsyncGap = pacer.previousVsync ? now - pacer.previousVsync : 0;
  pacer.previousVsync = now;
  pacer.vsync += 1;
  if (vsyncGap > 4) {
    // The refresh interval is the shortest recent gap; it drifts up slowly so
    // a change of display rate is followed.
    pacer.refresh = Math.min(pacer.refresh * 1.0002, vsyncGap);
  }
  const level = QUALITY_LEVELS[pacer.level];
  const render = !level.everyOther || pacer.vsync % 2 === 0;
  if (!render) return { render, elapsed: 0, changed: false };

  const elapsed = pacer.previousRender ? now - pacer.previousRender : 0;
  pacer.previousRender = now;
  const expected = pacer.refresh * (level.everyOther ? 2 : 1);
  let changed = false;
  if (elapsed > 0) {
    if (elapsed > expected * LATE) {
      pacer.late += 1;
      pacer.onTime = 0;
    } else if (elapsed < expected * ON_TIME) {
      pacer.onTime += 1;
      pacer.late = Math.max(0, pacer.late - 1);
    }
    if (pacer.late >= LATE_FRAMES_TO_DROP && pacer.level < QUALITY_LEVELS.length - 1) {
      pacer.level += 1;
      pacer.late = 0;
      pacer.onTime = 0;
      changed = true;
    } else if (pacer.onTime >= ON_TIME_FRAMES_TO_RAISE && pacer.level > 0) {
      pacer.level -= 1;
      pacer.late = 0;
      pacer.onTime = 0;
      changed = true;
    }
  }
  return { render, elapsed, changed };
}
