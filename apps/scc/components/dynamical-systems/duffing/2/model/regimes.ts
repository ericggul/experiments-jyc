// Forced double-well Duffing oscillator, written with the drive phase as the
// third state coordinate so the system is autonomous:
//
//   x' = v
//   v' = -δ v + x - x³ + γ cos θ
//   θ' = ω
//
// Potential V(x) = -x²/2 + x⁴/4 has two wells at x = ±1 separated by a hump.
// δ and ω are fixed at the classic values used for the period-doubling
// sequence; only the drive strength γ changes between regimes.
export const DUFFING_DAMPING = 0.3;
export const DUFFING_DRIVE_FREQUENCY = 1.2;

export type DuffingRegimeId =
  | "gamma-020"
  | "gamma-028"
  | "gamma-029"
  | "gamma-037"
  | "gamma-050"
  | "gamma-065";

export type DuffingRegime = Readonly<{
  id: DuffingRegimeId;
  label: string;
  driveAmplitude: number;
  // Settled response period in drive cycles; null for chaos.
  expectedPeriod: number | null;
}>;

export const DUFFING_REGIMES = [
  { id: "gamma-020", label: "γ 0.20", driveAmplitude: 0.2, expectedPeriod: 1 },
  { id: "gamma-028", label: "γ 0.28", driveAmplitude: 0.28, expectedPeriod: 2 },
  { id: "gamma-029", label: "γ 0.29", driveAmplitude: 0.29, expectedPeriod: 4 },
  { id: "gamma-037", label: "γ 0.37", driveAmplitude: 0.37, expectedPeriod: 5 },
  { id: "gamma-050", label: "γ 0.50", driveAmplitude: 0.5, expectedPeriod: null },
  { id: "gamma-065", label: "γ 0.65", driveAmplitude: 0.65, expectedPeriod: 2 },
] as const satisfies readonly DuffingRegime[];

export function isDuffingRegimeId(value: string): value is DuffingRegimeId {
  return DUFFING_REGIMES.some((regime) => regime.id === value);
}

export type DuffingPhaseState = Readonly<{
  displacement: number;
  velocity: number;
  phase: number;
}>;

export function potential(displacement: number) {
  return -(displacement ** 2) / 2 + displacement ** 4 / 4;
}

// The landscape a particle actually feels at drive phase θ: the double well
// tilted by the instantaneous drive force.
export function tiltedPotential(
  displacement: number,
  phase: number,
  driveAmplitude: number,
) {
  return potential(displacement) - driveAmplitude * Math.cos(phase) * displacement;
}

function acceleration(
  displacement: number,
  velocity: number,
  phase: number,
  driveAmplitude: number,
) {
  return -DUFFING_DAMPING * velocity + displacement - displacement ** 3 +
    driveAmplitude * Math.cos(phase);
}

// Classical RK4 on (x, v, θ); the same scheme runs per particle on the GPU.
export function stepDuffing(
  state: DuffingPhaseState,
  driveAmplitude: number,
  step: number,
): DuffingPhaseState {
  const { displacement: x, velocity: v, phase: theta } = state;
  const halfStep = step / 2;
  const w = DUFFING_DRIVE_FREQUENCY;
  const a1 = acceleration(x, v, theta, driveAmplitude);
  const x2 = x + v * halfStep;
  const v2 = v + a1 * halfStep;
  const a2 = acceleration(x2, v2, theta + w * halfStep, driveAmplitude);
  const x3 = x + v2 * halfStep;
  const v3 = v + a2 * halfStep;
  const a3 = acceleration(x3, v3, theta + w * halfStep, driveAmplitude);
  const x4 = x + v3 * step;
  const v4 = v + a3 * step;
  const a4 = acceleration(x4, v4, theta + w * step, driveAmplitude);

  return {
    displacement: x + step * (v + 2 * v2 + 2 * v3 + v4) / 6,
    velocity: v + step * (a1 + 2 * a2 + 2 * a3 + a4) / 6,
    phase: (theta + w * step) % (Math.PI * 2),
  };
}

// Samples the orbit once per drive cycle after a transient: the stroboscopic
// (Poincaré) section of the settled response.
export function stroboscopicSamples(
  driveAmplitude: number,
  initial: DuffingPhaseState,
  transientCycles = 300,
  sampleCycles = 64,
  stepsPerCycle = 200,
) {
  const step = (Math.PI * 2 / DUFFING_DRIVE_FREQUENCY) / stepsPerCycle;
  let state = initial;
  const samples: DuffingPhaseState[] = [];

  for (let cycle = 0; cycle < transientCycles + sampleCycles; cycle += 1) {
    for (let index = 0; index < stepsPerCycle; index += 1) {
      state = stepDuffing(state, driveAmplitude, step);
    }
    if (cycle >= transientCycles) samples.push(state);
  }
  return samples;
}

// The number of distinct stroboscopic points, or null when none repeat.
export function stroboscopicPeriod(
  driveAmplitude: number,
  initial: DuffingPhaseState,
) {
  const samples = stroboscopicSamples(driveAmplitude, initial);
  for (let period = 1; period <= 16; period += 1) {
    const repeats = samples.every((sample, index) => {
      const later = samples[index + period];
      return !later || Math.hypot(
        sample.displacement - later.displacement,
        sample.velocity - later.velocity,
      ) < 1e-3;
    });
    if (repeats) return period;
  }
  return null;
}
