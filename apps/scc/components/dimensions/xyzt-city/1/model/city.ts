// Data contract shared by the offline source pipeline (`source/`) and the
// browser. One record is one building's life as a prism in (x, y, t):
// its footprint extruded from `t0` to `t1`. Height is not geometry here; it is
// the attribute the threshold sweeps.

/** Where a prism's record came from. */
export type PrismOrigin =
  /** NYC Building Footprints: standing today. */
  | "current"
  /** NYC Building Historic: demolished since 1991. */
  | "historic"
  /** Perris atlas footprints, Manhattan 1854 (no height or dates). */
  | "atlas1854"
  /** Hand-entered tall building demolished before 1991, with a cited source. */
  | "manual";

/**
 * How trustworthy a lifespan end is.
 * - `record`: a recorded year.
 * - `fuzzy`: a recorded but heaped year (1900, 1910, 1920, 1925, 1930) without
 *   researched correction.
 * - `bound`: only an upper bound is known (censored); the true year is at or
 *   before it (atlas buildings: built by 1854, gone by their successor's start).
 * - `open`: still standing (`t1` only); `t1` equals `CityData.years.present`.
 */
export type LifespanEnd = "record" | "fuzzy" | "bound" | "open";

export type PrismRecord = {
  /** Stable id: `c:<doitt_id>`, `h:<doitt_id>`, `p:<atlas id>`, `m:<slug>`. */
  id: string;
  origin: PrismOrigin;
  /** Outer ring as flat local metres `[x0, y0, x1, y1, …]`, x east, y north, CCW, not closed. */
  ring: number[];
  /** Roof height above ground, metres. */
  heightM: number;
  /** True when height is estimated (e.g. from atlas material), not measured. */
  heightEstimated: boolean;
  /** First year standing. */
  t0: number;
  /** First year no longer standing (exclusive); `years.present` when standing. */
  t1: number;
  t0Kind: Exclude<LifespanEnd, "open">;
  t1Kind: LifespanEnd;
};

export type CitySource = { id: string; label: string; url: string; fetched: string };

export type CityData = {
  /** Projection origin for the local equirectangular metres. */
  origin: { lat: number; lon: number };
  /** Footprint extent in local metres. */
  extent: { minX: number; maxX: number; minY: number; maxY: number };
  /** `min` is the earliest t0; `present` is the open end of standing buildings. */
  years: { min: number; present: number };
  /** Tallest `heightM` among records. */
  maxHeightM: number;
  sources: CitySource[];
  prisms: PrismRecord[];
};

/** Public path of the baked Lower Manhattan dataset. */
export const LOWER_MANHATTAN_URL = "/data/xyzt-city/lower-manhattan.json";
