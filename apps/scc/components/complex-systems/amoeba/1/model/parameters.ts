/** Model constants. World units: the dish is the unit disc; time is ticks. */
export type AmoebaParameters = Readonly<{
  /** Fraction of the food under a cell eaten per tick. */
  eat: number;
  /** Mass lost per tick by an active cell. */
  cost: number;
  /** Distance moved per tick. */
  speed: number;
  /** Heading change per tick toward the richer of two forward samples. */
  turn: number;
  /** Fraction of an overlap resolved per tick. */
  push: number;
  /** Mass at which a cell divides (a newborn has mass 1). */
  divideMass: number;
  /** Fraction of the missing food restored per tick. */
  regrow: number;
  /** Recovered food, relative to capacity, at which a touched cyst wakes. */
  wakeThreshold: number;
  /** Food a full grid square holds; a newborn needs 1 more mass to divide. */
  foodCapacity: number;
  /** Per-tick chance that a cyst on recovered food wakes without being touched. */
  wakeChance: number;
  /** Ticks a cyst can stay dormant before it dissolves. */
  cystLifetime: number;
}>;

export const defaultParameters: AmoebaParameters = {
  eat: 0.1,
  cost: 0.008,
  speed: 0.0011,
  turn: 0.25,
  push: 0.5,
  divideMass: 2,
  regrow: 0.0002,
  wakeThreshold: 0.6,
  foodCapacity: 0.6,
  wakeChance: 2e-6,
  cystLifetime: 8000,
};

/** Fixed structure, not tuned per run. */
/** Cells are large enough to read as bodies; food grid and speed scale with them. */
export const NEWBORN_RADIUS = 0.029;
export const FOOD_RESOLUTION = 88;
export const CYST_MASS = 0.4;
export const DIVISION_TICKS = 24;
export const HEADING_NOISE = 0.3;
export const SENSOR_ANGLE = 0.6;
export const CAPACITY = 4096;
export const TICKS_PER_SECOND = 30;
