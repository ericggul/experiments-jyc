// World mapping for the xyt cube. Ground is world XZ (x east → +X,
// y north → −Z); the present stands on the ground and the past stacks up
// world +Y. One year spans YEAR_METRES of world
// height so the time axis is legible against a ~2 km footprint extent.

import type { CityData } from "./city";

export const YEAR_METRES = 4;

/** Ticks on the time axis; 1991 marks where demolition records begin. */
export const YEAR_TICKS: readonly number[] = [1660, 1750, 1854, 1900, 1950, 1991, 2026];

export function yearToWorld(year: number, data: Pick<CityData, "years">) {
  return (data.years.present - year) * YEAR_METRES;
}

/** Centre of the footprint extent, used to place the cube at the origin. */
export function extentCentre(data: Pick<CityData, "extent">) {
  const { minX, maxX, minY, maxY } = data.extent;
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/** Local metres → world XZ, centred. */
export function groundToWorld(x: number, y: number, centre: { x: number; y: number }) {
  return [x - centre.x, -(y - centre.y)] as const;
}
