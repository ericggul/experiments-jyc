// Three-dimensional flows whose single control parameter drifts slowly while
// the particles are carried by the flow. Nothing is plotted against the
// parameter: the same ensemble simply lives through each bifurcation as the
// parameter passes it, so the cloud collapses, splits, starts to circle,
// doubles its loops and breaks into chaos.
export type BifurcatingFlowId = "thomas" | "lorenz" | "rossler";

export type Vector3 = readonly [number, number, number];

export type BifurcatingFlow = Readonly<{
  id: BifurcatingFlowId;
  label: string;
  // Symbol of the drifting parameter, shown with its current value.
  symbol: string;
  // The sweep rests at `from`, drifts to `to`, rests, then drifts back.
  from: number;
  to: number;
  // Length of one full sweep cycle, measured in model time.
  cycleModelTime: number;
  step: number;
  stepsPerFrame: number;
  // Small per-step perturbation (amplitude × √dt). Without it, a particle
  // resting exactly on an equilibrium stays there after the equilibrium
  // becomes unstable, and the bifurcation would never be felt.
  noise: number;
  seedCenter: Vector3;
  seedRadius: number;
  viewCenter: Vector3;
  viewScale: number;
  // Flow speed mapped to the coolest colour.
  speedScale: number;
  derivative: (parameter: number, state: Vector3) => Vector3;
  derivativeWgsl: string;
}>;

export const BIFURCATING_FLOWS = [
  {
    // b > 1: one equilibrium. b = 1: pitchfork into two. b ≈ 0.329: Hopf,
    // each becomes a loop. Period doubling until chaos near b ≈ 0.208.
    id: "thomas",
    label: "thomas",
    symbol: "b",
    from: 1.05,
    to: 0.18,
    cycleModelTime: 360,
    step: 0.02,
    stepsPerFrame: 4,
    noise: 0.06,
    seedCenter: [0, 0, 0],
    seedRadius: 2,
    viewCenter: [0, 0, 0],
    viewScale: 1.05,
    speedScale: 1.2,
    derivative: (b, [x, y, z]) => [
      -b * x + Math.sin(y),
      -b * y + Math.sin(z),
      -b * z + Math.sin(x),
    ],
    derivativeWgsl: `
      fn flow(pos: vec3f, b: f32) -> vec3f {
        return vec3f(
          -b * pos.x + sin(pos.y),
          -b * pos.y + sin(pos.z),
          -b * pos.z + sin(pos.x)
        );
      }
    `,
  },
  {
    // ρ < 1: the origin. ρ = 1: pitchfork into two equilibria. Past
    // ρ ≈ 24.74 both lose stability and the butterfly appears; on the way
    // back chaos lingers well below that value before collapsing.
    id: "lorenz",
    label: "lorenz",
    symbol: "ρ",
    from: 0.5,
    to: 32,
    cycleModelTime: 150,
    step: 0.006,
    stepsPerFrame: 5,
    noise: 0.3,
    seedCenter: [0, 0, 14],
    seedRadius: 8,
    viewCenter: [0, 0, 23],
    viewScale: 9,
    speedScale: 90,
    derivative: (rho, [x, y, z]) => [
      10 * (y - x),
      x * (rho - z) - y,
      x * y - 8 / 3 * z,
    ],
    derivativeWgsl: `
      fn flow(pos: vec3f, rho: f32) -> vec3f {
        return vec3f(
          10.0 * (pos.y - pos.x),
          pos.x * (rho - pos.z) - pos.y,
          pos.x * pos.y - 2.66666666667 * pos.z
        );
      }
    `,
  },
  {
    // With b = 2 and c = 4: a stable focus, a Hopf loop, then period two,
    // four and chaos as a rises to 0.39.
    id: "rossler",
    label: "rössler",
    symbol: "a",
    from: 0.05,
    to: 0.39,
    cycleModelTime: 420,
    step: 0.02,
    stepsPerFrame: 5,
    noise: 0.05,
    seedCenter: [0, 0, 1],
    seedRadius: 3,
    viewCenter: [0.8, -1.4, 1.6],
    viewScale: 1.35,
    speedScale: 5,
    derivative: (a, [x, y, z]) => [-y - z, x + a * y, 2 + z * (x - 4)],
    derivativeWgsl: `
      fn flow(pos: vec3f, a: f32) -> vec3f {
        return vec3f(
          -pos.y - pos.z,
          pos.x + a * pos.y,
          2.0 + pos.z * (pos.x - 4.0)
        );
      }
    `,
  },
] as const satisfies readonly BifurcatingFlow[];

export function isBifurcatingFlowId(value: string): value is BifurcatingFlowId {
  return BIFURCATING_FLOWS.some((flow) => flow.id === value);
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

// Fraction of the way from `from` to `to` at a point in the cycle:
// rest 12 %, drift 32 %, rest 24 %, drift back 32 %.
export function sweepProfile(cycleFraction: number) {
  const fraction = cycleFraction - Math.floor(cycleFraction);
  if (fraction < 0.12) return 0;
  if (fraction < 0.44) return smoothstep((fraction - 0.12) / 0.32);
  if (fraction < 0.68) return 1;
  return 1 - smoothstep((fraction - 0.68) / 0.32);
}

export function parameterAt(flow: BifurcatingFlow, modelTime: number) {
  return flow.from + (flow.to - flow.from) * sweepProfile(modelTime / flow.cycleModelTime);
}

export function stepFlow(
  flow: BifurcatingFlow,
  parameter: number,
  state: Vector3,
  step = flow.step,
): Vector3 {
  const shifted = (base: Vector3, delta: Vector3, scale: number): Vector3 => [
    base[0] + delta[0] * scale,
    base[1] + delta[1] * scale,
    base[2] + delta[2] * scale,
  ];
  const k1 = flow.derivative(parameter, state);
  const k2 = flow.derivative(parameter, shifted(state, k1, step / 2));
  const k3 = flow.derivative(parameter, shifted(state, k2, step / 2));
  const k4 = flow.derivative(parameter, shifted(state, k3, step));
  return [
    state[0] + step * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) / 6,
    state[1] + step * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) / 6,
    state[2] + step * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) / 6,
  ];
}
