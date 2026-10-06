/**
 * Model constants. World units: the zone is [-halfWidth, halfWidth] × [-1, 1]
 * (the screen's shape when the colony is created); time is ticks.
 * Each cell has an inherited body size k: a newborn has mass k², and intake,
 * cost and the division and cyst thresholds scale with k², so size changes
 * how big and how fast a body is, not whether it can live.
 */
export type AmoebaParameters = Readonly<{
  /** Fraction of the food under a body eaten per tick, per unit of k². */
  eat: number;
  /** Mass lost per tick by an active cell, per unit of k². */
  cost: number;
  /** Distance moved per tick by a k = 1 cell; larger bodies are slower. */
  speed: number;
  /** Exponent of speed on size: speed · k^-sizeDrag. */
  sizeDrag: number;
  /** Heading change per tick toward the richer of two forward samples. */
  turn: number;
  /** Fraction of an overlap resolved per tick. */
  push: number;
  /** Mass at which a cell divides, in units of k². */
  divideMass: number;
  /** Fraction of the missing food restored per tick. */
  regrow: number;
  /** Recovered food, relative to capacity, at which a touched cyst wakes. */
  wakeThreshold: number;
  /** Food a full grid square holds. */
  foodCapacity: number;
  /** Per-tick chance that a cyst on recovered food wakes without being touched. */
  wakeChance: number;
  /** Ticks a cyst can stay dormant before it dissolves. */
  cystLifetime: number;
  /** Pareto tail of founder sizes: P(k > x) = (sizeMin / x)^sizeTail. */
  sizeTail: number;
  sizeMin: number;
  sizeMax: number;
  /** Standard deviation of each daughter's log target-size change at division. */
  sizeDrift: number;
  /** Spread of the mass fraction kept by the first half (0.5 ± this). */
  splitSpread: number;
}>;

export const defaultParameters: AmoebaParameters = {
  eat: 0.1,
  cost: 0.008,
  speed: 0.0011,
  sizeDrag: 0.35,
  turn: 0.25,
  push: 0.5,
  divideMass: 2,
  regrow: 0.0002,
  wakeThreshold: 0.6,
  foodCapacity: 0.6,
  wakeChance: 2e-5,
  cystLifetime: 6000,
  sizeTail: 1.3,
  sizeMin: 0.5,
  sizeMax: 6,
  sizeDrift: 0.15,
  splitSpread: 0.18,
};

/** Fixed structure, not tuned per run. */
/** Newborn radius of a k = 1 cell; a body's radius is this · √mass. */
export const NEWBORN_RADIUS = 0.022;
export const FOOD_ROWS = 88;
export const CYST_MASS = 0.4;
export const DIVISION_TICKS = 24;
/** Shortest cell cycle: a newborn cannot begin dividing sooner. */
export const MIN_CYCLE_TICKS = 15;
/** Bounds of a half's mass fraction. */
export const SPLIT_MIN = 0.25;
/** Centre distance of the two halves at the end of division, in sums of their radii. */
export const SPLIT_SEPARATION = 0.9;
export const HEADING_NOISE = 0.3;
export const SENSOR_ANGLE = 0.6;
export const CAPACITY = 4096;
export const TICKS_PER_SECOND = 30;
