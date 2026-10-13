/**
 * Spectrum → columns, as an mp3 player's visualiser draws it: bass on the left, treble on the right, on a
 * logarithmic frequency axis so every column spans the same musical interval.
 */
export const lowestHz = 40;
export const highestHz = 16_000;
/** Decibels (after the tilt) that read as silent and as full. */
export const floorDb = -78;
export const ceilingDb = -22;
/** Music falls off about 3 dB per octave; tilting by the same amount keeps the treble columns alive. */
export const tiltPerOctave = 3;
/** 즉각: a column jumps up at once and falls back at this many levels per second, like a meter's release. */
export const fallPerSecond = 1.6;
/** 부드럽게: a column glides toward its band's level with a critically damped spring of this smoothing time. */
export const smoothTime = 0.15;

/** How a column follows its band: 부드럽게 (default) or 즉각. */
export type Response = "smooth" | "instant";

/** For each column, the FFT bin range [from, to) it averages. Every column gets at least one bin. */
export function bandBins(count: number, binCount: number, sampleRate: number): Int32Array {
  const edges = new Int32Array(count * 2);
  const binHz = sampleRate / 2 / binCount;
  for (let column = 0; column < count; column += 1) {
    const fromHz = lowestHz * (highestHz / lowestHz) ** (column / count);
    const toHz = lowestHz * (highestHz / lowestHz) ** ((column + 1) / count);
    const from = Math.min(binCount - 1, Math.floor(fromHz / binHz));
    edges[column * 2] = from;
    edges[column * 2 + 1] = Math.min(binCount, Math.max(from + 1, Math.ceil(toHz / binHz)));
  }
  return edges;
}

/** One column's level, 0–1, from the spectrum in dB (getFloatFrequencyData). */
export function bandLevel(spectrum: Float32Array, from: number, to: number, column: number, count: number) {
  let power = 0;
  for (let bin = from; bin < to; bin += 1) power += 10 ** (spectrum[bin]! / 10);
  const db = 10 * Math.log10(power / (to - from) + 1e-12);
  const centreHz = lowestHz * (highestHz / lowestHz) ** ((column + 0.5) / count);
  const tilted = db + tiltPerOctave * Math.log2(centreHz / 1_000);
  return Math.max(0, Math.min(1, (tilted - floorDb) / (ceilingDb - floorDb)));
}

/** Instant attack, linear release: returns whether any level is still above zero. */
export function meter(levels: Float32Array, raw: Float32Array | null, seconds: number): boolean {
  let alive = false;
  const fall = fallPerSecond * seconds;
  for (let column = 0; column < levels.length; column += 1) {
    const target = raw ? raw[column]! : 0;
    levels[column] = Math.max(target, levels[column]! - fall);
    if (levels[column]! > 0) alive = true;
  }
  return alive;
}

/**
 * 부드럽게: each level glides toward its band with a critically damped spring (Game Programming Gems 4's SmoothDamp),
 * so rises are eased as well as falls, independent of frame rate. Returns whether any level is still moving.
 */
export function glide(levels: Float32Array, velocity: Float32Array, raw: Float32Array | null, seconds: number): boolean {
  const omega = 2 / smoothTime;
  const x = omega * seconds;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let moving = false;
  for (let column = 0; column < levels.length; column += 1) {
    const target = raw ? raw[column]! : 0;
    const change = levels[column]! - target;
    const speed = velocity[column]!;
    if (Math.abs(change) < 1e-4 && Math.abs(speed) < 1e-3) {
      levels[column] = target;
      velocity[column] = 0;
      continue;
    }
    const pull = (speed + omega * change) * seconds;
    velocity[column] = (speed - omega * pull) * decay;
    levels[column] = Math.max(0, Math.min(1, target + (change + pull) * decay));
    moving = true;
  }
  return moving;
}
