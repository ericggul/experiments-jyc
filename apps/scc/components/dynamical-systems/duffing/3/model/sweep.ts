// Forced double-well Duffing oscillator with the drive phase as a state
// coordinate (as in duffing/2):
//
//   x' = v
//   v' = -δ v + x - x³ + γ cos θ
//   θ' = ω
//
// Here the drive strength γ is not chosen from presets; it drifts slowly and
// continuously, so the same ensemble lives through the whole route:
// two separate wells → period 2 → 4 → 5 → chaos → a large period-2 swing.
export const DUFFING_DAMPING = 0.3;
export const DUFFING_DRIVE_FREQUENCY = 1.2;
export const DRIVE_PERIOD = Math.PI * 2 / DUFFING_DRIVE_FREQUENCY;

export const SWEEP_FROM = 0.18;
export const SWEEP_TO = 0.7;
// One full sweep cycle in model time (about 124 drive cycles).
export const SWEEP_CYCLE_MODEL_TIME = 650;

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

// rest 8 %, drift up 42 %, rest 8 %, drift down 42 %.
export function sweepProfile(cycleFraction: number) {
  const fraction = cycleFraction - Math.floor(cycleFraction);
  if (fraction < 0.08) return 0;
  if (fraction < 0.5) return smoothstep((fraction - 0.08) / 0.42);
  if (fraction < 0.58) return 1;
  return 1 - smoothstep((fraction - 0.58) / 0.42);
}

export function driveAmplitudeAt(modelTime: number) {
  return SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * sweepProfile(modelTime / SWEEP_CYCLE_MODEL_TIME);
}

export function tiltedPotential(displacement: number, phase: number, driveAmplitude: number) {
  return -(displacement ** 2) / 2 + displacement ** 4 / 4 -
    driveAmplitude * Math.cos(phase) * displacement;
}

export type DuffingPhaseState = Readonly<{
  displacement: number;
  velocity: number;
  phase: number;
}>;

function acceleration(x: number, v: number, theta: number, gamma: number) {
  return -DUFFING_DAMPING * v + x - x ** 3 + gamma * Math.cos(theta);
}

export function stepDuffing(state: DuffingPhaseState, gamma: number, step: number): DuffingPhaseState {
  const { displacement: x, velocity: v, phase: theta } = state;
  const half = step / 2;
  const w = DUFFING_DRIVE_FREQUENCY;
  const a1 = acceleration(x, v, theta, gamma);
  const x2 = x + v * half;
  const v2 = v + a1 * half;
  const a2 = acceleration(x2, v2, theta + w * half, gamma);
  const x3 = x + v2 * half;
  const v3 = v + a2 * half;
  const a3 = acceleration(x3, v3, theta + w * half, gamma);
  const x4 = x + v3 * step;
  const v4 = v + a3 * step;
  const a4 = acceleration(x4, v4, theta + w * step, gamma);
  return {
    displacement: x + step * (v + 2 * v2 + 2 * v3 + v4) / 6,
    velocity: v + step * (a1 + 2 * a2 + 2 * a3 + a4) / 6,
    phase: (theta + w * step) % (Math.PI * 2),
  };
}
