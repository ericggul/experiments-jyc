import type { NodeMap, Point } from "./coupled-map.ts";

export type Plane = "1d" | "2d";

export type Dynamics = {
  map: NodeMap;
  base: number;
  min: number;
  max: number;
  rest: Point;
};

// 1D: the logistic map x' = a x (1 − x). Stable until a = 3, then period
// doubling into chaos by a ≈ 3.57.
export const logistic: NodeMap = (growth, { x }) => ({ x: growth * x * (1 - x), y: 0 });

// 2D: the Ikeda map. The gain u is the fraction of the previous state fed back
// into the next. Stable until u ≈ 0.47, period 2 by 0.5, period 4 by 0.6,
// planar chaos from about 0.65, the spiral attractor at 0.9.
export const ikeda: NodeMap = (gain, { x, y }) => {
  const turn = 0.4 - 6 / (1 + x * x + y * y);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return { x: 1 + gain * (x * cos - y * sin), y: gain * (x * sin + y * cos) };
};

// Below the first period doubling, iteration converges to the rest point; the
// Ikeda rest point is a slowly contracting spiral, hence the long run.
export function restPoint(map: NodeMap, parameter: number, start: Point): Point {
  let point = start;
  for (let step = 0; step < 5000; step++) point = map(parameter, point);
  return point;
}

export const dynamics: Record<Plane, Dynamics> = {
  "1d": { map: logistic, base: 2.9, min: 1.8, max: 4, rest: { x: 1 - 1 / 2.9, y: 0 } },
  // Above about 0.91 a distant second attractor appears; the cap keeps every
  // node on the attractor that grows continuously out of the rest point.
  "2d": { map: ikeda, base: 0.4, min: 0.2, max: 0.9, rest: restPoint(ikeda, 0.4, { x: 0.7, y: 0.1 }) },
};

export function clampParameter(plane: Plane, parameter: number) {
  const { min, max } = dynamics[plane];
  return Math.min(max, Math.max(min, parameter));
}
