/**
 * The live stretch factor: a sum of sines whose frequencies and weights wander by themselves (Ornstein–Uhlenbeck), so the
 * curve is smooth from frame to frame yet never repeats and turns where it is not expected. Pure; `random` is injectable.
 * The sum is read on a log scale between `min` and `max`, so shrinking to ×0.3 and growing to ×12 get equal time.
 */

type Voice = { phase: number; frequency: number; centre: number; weight: number; weightSpeed: number; weightCentre: number };

/** Hz: the slowest voice drifts over tens of seconds, the fastest wobbles about once a second. */
const CENTRES = [0.035, 0.11, 0.27, 0.6];
const WEIGHTS = [1, 0.7, 0.45, 0.25];
/** How fast frequencies return to their centres (1/s), and how hard noise pushes them. Phase integrates frequency, so a sine never jumps. */
const PULL = 0.25;
const FREQUENCY_NOISE = 0.45;
/** Weights move as a damped spring kicked by noise: the noise acts on their speed, so the mix changes smoothly too. */
const WEIGHT_SPRING = 0.6;
const WEIGHT_DAMPING = 1.2;
const WEIGHT_NOISE = 0.6;

/** A standard normal sample from two uniform ones (Box–Muller). */
function normal(random: () => number) {
  const u = Math.max(random(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

export function createMotion({ min = 0.3, max = 12, random = Math.random }: { min?: number; max?: number; random?: () => number } = {}) {
  const voices: Voice[] = CENTRES.map((centre, index) => ({
    phase: random() * Math.PI * 2,
    frequency: centre * (0.7 + random() * 0.6),
    centre,
    weight: WEIGHTS[index],
    weightSpeed: 0,
    weightCentre: WEIGHTS[index],
  }));
  const middle = (Math.log(min) + Math.log(max)) / 2;
  const half = (Math.log(max) - Math.log(min)) / 2;

  /** Advances by `dt` seconds (capped, so a hidden tab does not jump) and returns the factor. */
  const step = (dt: number) => {
    const t = Math.min(Math.max(dt, 0), 0.1);
    let sum = 0;
    let total = 0;
    for (const voice of voices) {
      const root = Math.sqrt(t);
      voice.frequency += PULL * (voice.centre - voice.frequency) * t + FREQUENCY_NOISE * voice.centre * root * normal(random);
      voice.frequency = Math.max(voice.centre * 0.2, voice.frequency);
      voice.weightSpeed += (WEIGHT_SPRING * (voice.weightCentre - voice.weight) - WEIGHT_DAMPING * voice.weightSpeed) * t +
        WEIGHT_NOISE * voice.weightCentre * root * normal(random);
      voice.weight = Math.max(0, voice.weight + voice.weightSpeed * t);
      voice.phase += 2 * Math.PI * voice.frequency * t;
      sum += voice.weight * Math.sin(voice.phase);
      total += voice.weight;
    }
    // Normalised to −1…1 by the weights, then softened so the extremes are reached but not dwelt on.
    const value = total > 0 ? Math.tanh((1.6 * sum) / total) / Math.tanh(1.6) : 0;
    return Math.exp(middle + half * value);
  };

  return { step };
}
