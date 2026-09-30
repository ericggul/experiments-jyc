// Circular restricted three-body problem in the frame that rotates with the
// planet. Units: star + planet mass = 1, planet distance = 1, planet angular
// speed = 1, so one planet orbit takes 2π. The star sits at (-μ, 0, 0) and the
// planet at (1 - μ, 0, 0). Test particles feel both bodies plus the Coriolis
// and centrifugal terms of the rotating frame:
//
//   ẍ - 2ẏ = x - (1 - μ)(x + μ)/r₁³ - μ(x - 1 + μ)/r₂³
//   ÿ + 2ẋ = y - (1 - μ) y/r₁³      - μ y/r₂³
//   z̈      =   - (1 - μ) z/r₁³      - μ z/r₂³
//
// Because the planet is fixed in this frame, an orbit whose period matches
// the planet's by a whole-number ratio traces a closed figure that stands
// still; every other orbit smears into a turning band.
export const MASS_RATIO = 0.001;
export const PLANET_SOFTENING = 0.01;
export const PARTICLE_COUNT = 30_000;
export const GROUP_SIZE = 1_000;
export const GROUP_COUNT = PARTICLE_COUNT / GROUP_SIZE;

export type ResonancePresetId = "two-one" | "three-two" | "one-one" | "two-three";

export type ResonancePreset = Readonly<{
  id: ResonancePresetId;
  label: string;
  // Particle period ÷ planet period at the centre of the population.
  periodRatio: number;
  // Relative spread of that ratio across groups: 0.02 = ±2 %.
  periodSpread: number;
  eccentricity: readonly [number, number];
  inclination: number;
  // Each group's members are staggered over this many planet orbits: the
  // time one matched orbit needs to close in the rotating frame.
  closureOrbits: number;
}>;

export const RESONANCE_PRESETS = [
  {
    id: "two-one",
    label: "2:1",
    periodRatio: 1 / 2,
    periodSpread: 0.025,
    eccentricity: [0.05, 0.3],
    inclination: 0.05,
    closureOrbits: 1,
  },
  {
    id: "three-two",
    label: "3:2",
    periodRatio: 2 / 3,
    periodSpread: 0.025,
    eccentricity: [0.08, 0.28],
    inclination: 0.05,
    closureOrbits: 2,
  },
  {
    id: "one-one",
    label: "1:1",
    periodRatio: 1,
    periodSpread: 0.012,
    eccentricity: [0, 0.04],
    inclination: 0.04,
    closureOrbits: 1,
  },
  {
    id: "two-three",
    label: "2:3",
    periodRatio: 3 / 2,
    periodSpread: 0.025,
    eccentricity: [0.1, 0.3],
    inclination: 0.05,
    closureOrbits: 3,
  },
] as const satisfies readonly ResonancePreset[];

// Period ratios coloured as matched: the whole-number ratios the presets are
// built around.
export const MATCHED_PERIOD_RATIOS = [1 / 2, 2 / 3, 1, 3 / 2] as const;

export function isResonancePresetId(value: string): value is ResonancePresetId {
  return RESONANCE_PRESETS.some((preset) => preset.id === value);
}

export type Vector3 = [number, number, number];

export type RotatingState = Readonly<{
  position: Vector3;
  velocity: Vector3;
}>;

export function semiMajorAxisForPeriodRatio(periodRatio: number, mu = MASS_RATIO) {
  // Kepler's third law about the star: T = 2π √(a³ / (1 - μ)).
  return Math.cbrt(periodRatio ** 2 * (1 - mu));
}

function rotateZ([x, y, z]: Vector3, angle: number): Vector3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [x * cosine - y * sine, x * sine + y * cosine, z];
}

function solveKepler(meanAnomaly: number, eccentricity: number) {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    eccentricAnomaly -= (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) -
      meanAnomaly) / (1 - eccentricity * Math.cos(eccentricAnomaly));
  }
  return eccentricAnomaly;
}

export type OrbitElements = Readonly<{
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  node: number;
  periapsis: number;
  meanAnomaly: number;
}>;

// Heliocentric Kepler orbit → inertial position and velocity relative to the
// star (gravitational parameter 1 - μ).
export function keplerToCartesian(elements: OrbitElements, mu = MASS_RATIO) {
  const { semiMajorAxis: a, eccentricity: e } = elements;
  const eccentricAnomaly = solveKepler(elements.meanAnomaly, e);
  const cosE = Math.cos(eccentricAnomaly);
  const sinE = Math.sin(eccentricAnomaly);
  const root = Math.sqrt(1 - e * e);
  const meanMotion = Math.sqrt((1 - mu) / a ** 3);
  const radiusFactor = 1 - e * cosE;
  const planePosition = [a * (cosE - e), a * root * sinE] as const;
  const planeVelocity = [
    -a * meanMotion * sinE / radiusFactor,
    a * meanMotion * root * cosE / radiusFactor,
  ] as const;

  const orient = ([px, py]: readonly [number, number]): Vector3 => {
    const [x1, y1] = [
      px * Math.cos(elements.periapsis) - py * Math.sin(elements.periapsis),
      px * Math.sin(elements.periapsis) + py * Math.cos(elements.periapsis),
    ];
    const tilted: Vector3 = [
      x1,
      y1 * Math.cos(elements.inclination),
      y1 * Math.sin(elements.inclination),
    ];
    return rotateZ(tilted, elements.node);
  };

  return { position: orient(planePosition), velocity: orient(planeVelocity) };
}

// Inertial star-relative state at t = 0 → rotating-frame state.
export function heliocentricToRotating(
  position: Vector3,
  velocity: Vector3,
  mu = MASS_RATIO,
): RotatingState {
  // The star circles the barycentre: at t = 0 it is at (-μ, 0, 0) moving
  // with (0, -μ, 0). The frame velocity ẑ × r is removed afterwards.
  const inertialPosition: Vector3 = [position[0] - mu, position[1], position[2]];
  const inertialVelocity: Vector3 = [velocity[0], velocity[1] - mu, velocity[2]];
  return {
    position: inertialPosition,
    velocity: [
      inertialVelocity[0] + inertialPosition[1],
      inertialVelocity[1] - inertialPosition[0],
      inertialVelocity[2],
    ],
  };
}

// Osculating period ÷ planet period for a rotating-frame state.
export function osculatingPeriodRatio(state: RotatingState, mu = MASS_RATIO) {
  const [x, y, z] = state.position;
  const [vx, vy, vz] = state.velocity;
  const relative: Vector3 = [x + mu, y, z];
  const relativeVelocity: Vector3 = [vx - y, vy + x + mu, vz];
  const radius = Math.hypot(...relative);
  const speedSquared = relativeVelocity[0] ** 2 + relativeVelocity[1] ** 2 +
    relativeVelocity[2] ** 2;
  const semiMajorAxis = 1 / (2 / radius - speedSquared / (1 - mu));
  return Math.sqrt(semiMajorAxis ** 3 / (1 - mu));
}

function fraction(value: number) {
  return value - Math.floor(value);
}

export function resonanceHash(index: number) {
  return fraction(Math.sin(index * 12.9898 + 78.233) * 43_758.5453);
}

function groupPeriodRatio(preset: ResonancePreset, group: number) {
  return preset.periodRatio *
    (1 + (resonanceHash(group * 7 + 1) * 2 - 1) * preset.periodSpread);
}

// Every group is one orbit. Member k is the same orbit shifted in time by
// τₖ and rotated with the planet by the same τₖ, so in the rotating frame all
// members lie on the group's own figure, spaced along one closure time.
export function createResonanceSeeds(preset: ResonancePreset, mu = MASS_RATIO) {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  const closureTime = preset.closureOrbits * Math.PI * 2;

  for (let group = 0; group < GROUP_COUNT; group += 1) {
    const periodRatio = groupPeriodRatio(preset, group);
    const semiMajorAxis = semiMajorAxisForPeriodRatio(periodRatio, mu);
    const meanMotion = Math.sqrt((1 - mu) / semiMajorAxis ** 3);
    const [minimumE, maximumE] = preset.eccentricity;
    const baseElements = {
      semiMajorAxis,
      eccentricity: minimumE + (maximumE - minimumE) * resonanceHash(group * 7 + 2),
      inclination: preset.inclination * resonanceHash(group * 7 + 3),
      node: resonanceHash(group * 7 + 4) * Math.PI * 2,
      periapsis: resonanceHash(group * 7 + 5) * Math.PI * 2,
      meanAnomaly: resonanceHash(group * 7 + 6) * Math.PI * 2,
    };

    for (let member = 0; member < GROUP_SIZE; member += 1) {
      const lag = member / GROUP_SIZE * closureTime;
      const heliocentric = keplerToCartesian(
        { ...baseElements, meanAnomaly: baseElements.meanAnomaly - meanMotion * lag },
        mu,
      );
      const state = heliocentricToRotating(
        rotateZ(heliocentric.position, lag),
        rotateZ(heliocentric.velocity, lag),
        mu,
      );
      const offset = (group * GROUP_SIZE + member) * 3;
      positions.set(state.position, offset);
      velocities.set(state.velocity, offset);
    }
  }

  return { positions, velocities };
}

function rotatingAcceleration(
  [x, y, z]: Vector3,
  [vx, vy]: Vector3,
  mu: number,
): Vector3 {
  const starX = x + mu;
  const planetX = x - 1 + mu;
  const starCube = Math.pow(starX * starX + y * y + z * z, 1.5);
  const planetCube = Math.pow(
    planetX * planetX + y * y + z * z + PLANET_SOFTENING ** 2,
    1.5,
  );
  return [
    2 * vy + x - (1 - mu) * starX / starCube - mu * planetX / planetCube,
    -2 * vx + y - (1 - mu) * y / starCube - mu * y / planetCube,
    -(1 - mu) * z / starCube - mu * z / planetCube,
  ];
}

// Classical RK4 on the rotating-frame equations; the GPU runs the same step.
export function stepRotatingFrame(state: RotatingState, step: number, mu = MASS_RATIO) {
  const add = (vector: Vector3, delta: Vector3, scale: number): Vector3 => [
    vector[0] + delta[0] * scale,
    vector[1] + delta[1] * scale,
    vector[2] + delta[2] * scale,
  ];
  const p1 = state.position;
  const v1 = state.velocity;
  const a1 = rotatingAcceleration(p1, v1, mu);
  const p2 = add(p1, v1, step / 2);
  const v2 = add(v1, a1, step / 2);
  const a2 = rotatingAcceleration(p2, v2, mu);
  const p3 = add(p1, v2, step / 2);
  const v3 = add(v1, a2, step / 2);
  const a3 = rotatingAcceleration(p3, v3, mu);
  const p4 = add(p1, v3, step);
  const v4 = add(v1, a3, step);
  const a4 = rotatingAcceleration(p4, v4, mu);
  const combine = (a: Vector3, b: Vector3, c: Vector3, d: Vector3, base: Vector3): Vector3 => [
    base[0] + step * (a[0] + 2 * b[0] + 2 * c[0] + d[0]) / 6,
    base[1] + step * (a[1] + 2 * b[1] + 2 * c[1] + d[1]) / 6,
    base[2] + step * (a[2] + 2 * b[2] + 2 * c[2] + d[2]) / 6,
  ];
  return {
    position: combine(v1, v2, v3, v4, p1),
    velocity: combine(a1, a2, a3, a4, v1),
  };
}
