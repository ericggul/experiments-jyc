import { between, exponential, type Random } from './random.ts';

// When windows arrive: a self-exciting (Hawkes) point process. Gaps are
// exponential; with `burst` each arrival raises the rate for a few seconds,
// so one hit tends to pull a few pages behind it, then the rate relaxes. The
// base rate is lowered to keep the overall mean gap at `interval`, so burst
// trades even spacing for clusters and lulls, not for more windows.

/** Seconds over which an arrival's excitation fades, as a share of the interval. */
const MEMORY = 0.4;
/** How much one arrival raises the rate at full burst; with MEMORY, 0.8 expected followers per arrival. */
const EXCITATION = 2;
/** Shortest gap, seconds: two windows never need the same instant. */
const MIN_GAP = 0.35;

/** Arrival times in ms after the run starts, strictly increasing. */
export function schedule(count: number, interval: number, burst: number, random: Random): number[] {
  const times: number[] = [];
  const tau = interval * MEMORY;
  const alpha = (burst / 100) * EXCITATION;
  // Unexcited rate chosen so the stationary mean gap is the interval:
  // rate = λ0 / (1 − λ0·alpha·tau) = 1 / interval, so 1/λ0 = interval + alpha·tau.
  const rate0 = 1 / (interval + alpha * tau);
  const intensity = (t: number) => rate0 * (1 + alpha * times.reduce((sum, tk) => sum + Math.exp(-((t - tk) / 1000) / tau), 0));
  let t = between(random, 400, 1400);
  for (let i = 0; i < count; i++) {
    times.push(Math.round(t));
    // Ogata thinning: the intensity only decays between arrivals, so its
    // value now bounds it until the next one.
    for (;;) {
      const bound = intensity(t);
      t += exponential(random, 1 / bound) * 1000;
      if (random() * bound <= intensity(t)) break;
    }
    t = Math.max(t, times[times.length - 1] + MIN_GAP * 1000);
  }
  return times;
}
