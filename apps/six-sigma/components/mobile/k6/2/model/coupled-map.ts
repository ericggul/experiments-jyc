// Six maps coupled through the complete graph K6 (a globally coupled map).
// Each node only ever receives a demand on its own parameter; the coupling
// term is how that local demand reaches everyone else. States are points in
// the plane; one-dimensional dynamics keep y at zero.

export const NODE_COUNT = 6;
export const TRAIL_LENGTH = 48;

export type Point = { x: number; y: number };
export type NodeMap = (parameter: number, point: Point) => Point;

export type CoupledMap = {
  parameter: number[];
  state: Point[];
  trail: Point[][];
};

function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCoupledMap(seed: number, rest: Point, base: number, planar: boolean): CoupledMap {
  const next = random(seed);
  const state = Array.from({ length: NODE_COUNT }, () => ({
    x: rest.x + (next() - 0.5) * 0.02,
    y: planar ? rest.y + (next() - 0.5) * 0.02 : 0,
  }));
  return {
    parameter: Array.from({ length: NODE_COUNT }, () => base),
    state,
    trail: state.map((point) => [point]),
  };
}

// z_i' = (1 - ε) F_i(z_i) + ε · mean_{j≠i} F_j(z_j)
export function stepCoupledMap(map: CoupledMap, coupling: number, nodeMap: NodeMap) {
  const output = map.state.map((point, index) => nodeMap(map.parameter[index], point));
  const total = output.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  const others = NODE_COUNT - 1;
  map.state = output.map((own) => ({
    x: (1 - coupling) * own.x + (coupling * (total.x - own.x)) / others,
    y: (1 - coupling) * own.y + (coupling * (total.y - own.y)) / others,
  }));
  map.state.forEach((point, index) => {
    const trail = map.trail[index];
    trail.push(point);
    if (trail.length > TRAIL_LENGTH) trail.shift();
  });
}

// Root-mean-square distance from the centroid.
export function spread(points: readonly Point[]) {
  const mean = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  mean.x /= points.length;
  mean.y /= points.length;
  return Math.sqrt(points.reduce((sum, point) => sum + (point.x - mean.x) ** 2 + (point.y - mean.y) ** 2, 0) / points.length);
}
