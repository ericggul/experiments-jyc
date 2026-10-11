import { between, type Random } from './random.ts';

// When windows arrive: all at the start. With a gap, one after another with
// gaps that vary around it; with none, all at the same instant (the surface
// opens the first, waits for the instance, then launches the rest together).

/** Arrival times in ms after the run starts, non-decreasing. */
export function burst(count: number, gap: number, random: Random): number[] {
  const times: number[] = [];
  let t = between(random, 200, 500);
  for (let i = 0; i < count; i++) {
    times.push(Math.round(t));
    t += gap ? between(random, 0.4, 1.8) * gap : 0;
  }
  return times;
}
