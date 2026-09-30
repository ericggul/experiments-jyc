export type MapSystemId = "logistic" | "sine" | "ricker" | "gauss";

export type MapSystem = Readonly<{
  id: MapSystemId;
  label: string;
  // The control parameter spread across the horizontal axis. Every particle
  // keeps one fixed value from this interval for its whole life.
  parameterRange: readonly [number, number];
  // The state interval shown on the two delay axes.
  stateRange: readonly [number, number];
  // Fresh particles are dropped uniformly inside this interval.
  seedRange: readonly [number, number];
  next: (state: number, parameter: number) => number;
  mapWgsl: string;
}>;

export const GAUSS_MAP_SHARPNESS = 6.2;

export const MAP_SYSTEMS = [
  {
    id: "logistic",
    label: "logistic",
    parameterRange: [2.6, 4],
    stateRange: [0, 1],
    seedRange: [0.02, 0.98],
    next: (state, parameter) => parameter * state * (1 - state),
    mapWgsl: `
      fn mapNext(x: f32, r: f32) -> f32 {
        return r * x * (1.0 - x);
      }
    `,
  },
  {
    id: "sine",
    label: "sine",
    parameterRange: [0.62, 1],
    stateRange: [0, 1],
    seedRange: [0.02, 0.98],
    next: (state, parameter) => parameter * Math.sin(Math.PI * state),
    mapWgsl: `
      fn mapNext(x: f32, r: f32) -> f32 {
        return r * sin(3.14159265359 * x);
      }
    `,
  },
  {
    id: "ricker",
    label: "ricker",
    parameterRange: [1.8, 3.3],
    stateRange: [0, 3.2],
    seedRange: [0.05, 2.5],
    next: (state, parameter) => state * Math.exp(parameter * (1 - state)),
    mapWgsl: `
      fn mapNext(x: f32, r: f32) -> f32 {
        return x * exp(r * (1.0 - x));
      }
    `,
  },
  {
    id: "gauss",
    label: "gauss",
    parameterRange: [-1, 0.7],
    stateRange: [-1, 1.1],
    seedRange: [-1, 1.1],
    next: (state, parameter) =>
      Math.exp(-GAUSS_MAP_SHARPNESS * state * state) + parameter,
    mapWgsl: `
      fn mapNext(x: f32, r: f32) -> f32 {
        return exp(-${GAUSS_MAP_SHARPNESS.toFixed(1)} * x * x) + r;
      }
    `,
  },
] as const satisfies readonly MapSystem[];

export function isMapSystemId(value: string): value is MapSystemId {
  return MAP_SYSTEMS.some((system) => system.id === value);
}

// The settled period of one fixed-parameter orbit, or null when no period up
// to maximumPeriod repeats within tolerance (a chaotic or very long orbit).
export function settledPeriod(
  system: MapSystem,
  parameter: number,
  seed = 0.3,
  burnIn = 4_000,
  maximumPeriod = 32,
  tolerance = 1e-6,
) {
  let state = seed;
  for (let iteration = 0; iteration < burnIn; iteration += 1) {
    state = system.next(state, parameter);
  }

  const orbit: number[] = [];
  for (let sample = 0; sample < maximumPeriod * 2; sample += 1) {
    state = system.next(state, parameter);
    orbit.push(state);
  }

  for (let period = 1; period <= maximumPeriod; period += 1) {
    let repeats = true;
    for (let index = 0; index + period < orbit.length; index += 1) {
      if (Math.abs(orbit[index]! - orbit[index + period]!) > tolerance) {
        repeats = false;
        break;
      }
    }
    if (repeats) return period;
  }
  return null;
}
