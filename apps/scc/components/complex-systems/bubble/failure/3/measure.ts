// Network observables of the foam's own contact graph (bubble/3): degree
// (side) distribution, Lewis's law (area against sides), the Aboav–Weaire law
// (sides of a bubble's neighbours against its own) and how close the
// vertices come to Plateau's 120°.

import { FREE, MAX_SIDES, meanArea, type Foam } from "./model.ts";

/** Walls a drawn arc may turn through (radians), so a wall never folds back. */
export const MAX_TURN = (2 * Math.PI) / 3;

/** Curvature (1/px) of edge `k` of cell `i`, positive where it bulges out of i: the pressure difference, limited so the arc turns at most MAX_TURN. */
export function wallCurvature(foam: Foam, i: number, k: number) {
  const at = i * MAX_SIDES + k;
  const j = foam.neighbour[at]!;
  if (j === FREE) return 1 / Math.max(foam.radius[i]!, 1e-3);
  if (j < 0) return 0;
  const length = foam.length[at]!;
  const curvature = foam.pressure[i]! - foam.pressure[j]!;
  // An arc through a chord of length l with curvature k turns by 2 asin(k l / 2).
  const limit = length > 1e-6 ? (2 * Math.sin(MAX_TURN / 2)) / length : Infinity;
  return Math.max(-limit, Math.min(limit, curvature));
}

/** Walls shared with another bubble: the node's degree. */
export function sidesOf(foam: Foam, i: number) {
  let count = 0;
  const base = i * MAX_SIDES;
  for (let k = 0; k < foam.sides[i]!; k += 1) if (foam.neighbour[base + k]! >= 0) count += 1;
  return count;
}

/** Links that are still films at the current liquid fraction (not swallowed by Plateau borders). */
export function filmContactsOf(foam: Foam, i: number) {
  let count = 0;
  const base = i * MAX_SIDES;
  for (let k = 0; k < foam.sides[i]!; k += 1) if (foam.neighbour[base + k]! >= 0 && foam.film[base + k]! > 0) count += 1;
  return count;
}

export type FoamStatistics = {
  count: number;
  meanSides: number;
  /** Second moment of the side distribution, ⟨(n − 6)²⟩. */
  mu2: number;
  /** Share of bubbles with n sides, by n. */
  sides: number[];
  /** Mean area over the mean area, by n (Lewis). */
  lewis: number[];
  /** Mean sides of the neighbours of n-sided bubbles, m(n) (Aboav–Weaire). */
  aboav: number[];
  /** Fit n·m(n) = (6 − a) n + 6a + μ₂, weighted by counts: a, and the intercept found. */
  aboavA: number;
  aboavIntercept: number;
  /** Lewis fit A(n)/Ā = slope · (n − n₀). */
  lewisSlope: number;
  lewisZero: number;
  /** Mean film contacts per bubble (links that survive the liquid). */
  filmContacts: number;
  /** Mean |angle − 120°| (degrees) at vertices: straight power-diagram walls, and the drawn arcs. */
  angleStraight: number;
  angleCurved: number;
};

function fit(xs: number[], ys: number[], weights: number[]) {
  let sw = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let at = 0; at < xs.length; at += 1) {
    const w = weights[at]!;
    sw += w;
    sx += w * xs[at]!;
    sy += w * ys[at]!;
    sxx += w * xs[at]! * xs[at]!;
    sxy += w * xs[at]! * ys[at]!;
  }
  const slope = (sw * sxy - sx * sy) / Math.max(1e-12, sw * sxx - sx * sx);
  return { slope, intercept: (sy - slope * sx) / Math.max(sw, 1e-12) };
}

export function foamStatistics(foam: Foam): FoamStatistics {
  const count = foam.count;
  const degree = new Int32Array(count);
  for (let i = 0; i < count; i += 1) degree[i] = sidesOf(foam, i);
  const mean = meanArea(foam);
  const tally: number[] = [];
  const areas: number[] = [];
  const neighbourSides: number[] = [];
  let total = 0;
  let squares = 0;
  let films = 0;
  let straight = 0;
  let curved = 0;
  let corners = 0;
  for (let i = 0; i < count; i += 1) {
    const n = degree[i]!;
    tally[n] = (tally[n] ?? 0) + 1;
    areas[n] = (areas[n] ?? 0) + foam.area[i]! / mean;
    total += n;
    squares += (n - 6) ** 2;
    films += filmContactsOf(foam, i);
    const base = i * MAX_SIDES;
    let around = 0;
    for (let k = 0; k < foam.sides[i]!; k += 1) {
      const j = foam.neighbour[base + k]!;
      if (j >= 0) around += degree[j]!;
    }
    neighbourSides[n] = (neighbourSides[n] ?? 0) + (n > 0 ? around / n : 0);
    // Interior angle at each vertex, straight and with the arcs' half-turns.
    const sides = foam.sides[i]!;
    if (sides < 3 || n !== sides) continue;
    for (let k = 0; k < sides; k += 1) {
      const before = (k + sides - 1) % sides;
      const next = (k + 1) % sides;
      const ux = foam.vx[base + before]! - foam.vx[base + k]!;
      const uy = foam.vy[base + before]! - foam.vy[base + k]!;
      const wx = foam.vx[base + next]! - foam.vx[base + k]!;
      const wy = foam.vy[base + next]! - foam.vy[base + k]!;
      const lu = Math.hypot(ux, uy);
      const lw = Math.hypot(wx, wy);
      // Skip vertices of walls in the middle of a T1 (no angle to speak of).
      if (lu < 2 || lw < 2) continue;
      const angle = Math.acos(Math.max(-1, Math.min(1, (ux * wx + uy * wy) / (lu * lw))));
      const bent = angle + Math.asin((wallCurvature(foam, i, before) * lu) / 2) + Math.asin((wallCurvature(foam, i, k) * lw) / 2);
      straight += Math.abs(angle - (2 * Math.PI) / 3);
      curved += Math.abs(bent - (2 * Math.PI) / 3);
      corners += 1;
    }
  }
  const sides: number[] = [];
  const lewis: number[] = [];
  const aboav: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const lewisY: number[] = [];
  const ws: number[] = [];
  for (let n = 0; n < tally.length; n += 1) {
    const c = tally[n] ?? 0;
    sides[n] = c / Math.max(1, count);
    if (c === 0) continue;
    lewis[n] = areas[n]! / c;
    aboav[n] = neighbourSides[n]! / c;
    if (n >= 3) {
      xs.push(n);
      ys.push(n * aboav[n]!);
      lewisY.push(lewis[n]!);
      ws.push(c);
    }
  }
  const aboavFit = fit(xs, ys, ws);
  const lewisFit = fit(xs, lewisY, ws);
  const toDegrees = 180 / Math.PI;
  return {
    count,
    meanSides: total / Math.max(1, count),
    mu2: squares / Math.max(1, count),
    sides,
    lewis,
    aboav,
    aboavA: 6 - aboavFit.slope,
    aboavIntercept: aboavFit.intercept,
    lewisSlope: lewisFit.slope,
    lewisZero: -lewisFit.intercept / lewisFit.slope,
    filmContacts: films / Math.max(1, count),
    angleStraight: (straight / Math.max(1, corners)) * toDegrees,
    angleCurved: (curved / Math.max(1, corners)) * toDegrees,
  };
}
