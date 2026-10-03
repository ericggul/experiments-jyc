// A slider's height is a step on one C major pentatonic scale from C4 (bottom) to C7 (top); C3–C6 sat
// below what phone speakers reproduce, so its low half was nearly silent. A pentatonic scale has
// no semitone or tritone between any two of its notes, so whatever curve the finger skates sounds consonant.
const pentatonic = [0, 2, 4, 7, 9];
const lowest = 60;
const octaves = 3;

export const scale: readonly number[] = [
  ...Array.from({ length: octaves * pentatonic.length }, (_, step) => lowest + 12 * Math.floor(step / pentatonic.length) + pentatonic[step % pentatonic.length]!),
  lowest + 12 * octaves,
];

/** Scale step for a 0–1 slider value (1 = top). */
export function stepOf(value: number) {
  return Math.max(0, Math.min(scale.length - 1, Math.round(value * (scale.length - 1))));
}

export function midiOf(value: number) {
  return scale[stepOf(value)]!;
}

/**
 * Spaces notes a sweep sets off in the same instant into a short run, so a stroke across many sliders
 * plays as an arpeggio instead of a cluster. Returns the start time, or null when the run is already full.
 */
export function createPacer(spacing = 0.028, horizon = 0.3) {
  let next = 0;
  return (now: number): number | null => {
    const at = Math.max(now, next);
    if (at - now > horizon) return null;
    next = at + spacing;
    return at;
  };
}
