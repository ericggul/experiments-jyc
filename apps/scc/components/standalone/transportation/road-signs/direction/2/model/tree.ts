/**
 * Recursive sign tree. Every sign points straight, left and right; beyond
 * each arrow sits a smaller sign turned to that arrow's heading. Laid out
 * breadth-first in root radii, then fitted to the viewport and cut at
 * sub-pixel signs or the sprite budget.
 */

export const TURNS = ["straight", "left", "right"] as const;
export type Turn = (typeof TURNS)[number];

/** Child radius relative to its parent. */
export const RATIO = 0.45;
/** Clear gap between a sign's rim and its child's, in parent radii. */
export const GAP = 0.06;
/** The tree's bounding box spans this share of the viewport. */
export const FILL = 0.94;
export const MIN_RADIUS_PX = 1.5;
export const BUDGET = 6000;
/** Signs are generated this deep at most before the pixel cut. */
const MAX_DEPTH = 9;

export type SignTree = {
  count: number;
  x: Float64Array;
  y: Float64Array;
  radius: Float64Array;
  heading: Float64Array;
  turn: Uint8Array;
  depth: Uint8Array;
};

export function createSignTree(capacity = BUDGET): SignTree {
  return {
    count: 0,
    x: new Float64Array(capacity),
    y: new Float64Array(capacity),
    radius: new Float64Array(capacity),
    heading: new Float64Array(capacity),
    turn: new Uint8Array(capacity),
    depth: new Uint8Array(capacity),
  };
}

/**
 * `spread` is the left/right turn angle in radians. Headings are clockwise
 * from screen-up; the root faces up and counts as a straight arrival.
 */
export function layoutSignTree(tree: SignTree, width: number, height: number, spread: number) {
  const capacity = tree.x.length;
  // Unit layout: root radius 1 at the origin.
  const ux: number[] = [0];
  const uy: number[] = [0];
  const ur: number[] = [1];
  const uh: number[] = [0];
  const ut: number[] = [0];
  const ud: number[] = [0];
  let start = 0;
  for (let depth = 1; depth <= MAX_DEPTH; depth += 1) {
    const end = ux.length;
    if (end + (end - start) * 3 > capacity) break;
    for (let parent = start; parent < end; parent += 1) {
      const r = ur[parent] * RATIO;
      const distance = ur[parent] * (1 + GAP) + r;
      for (let turn = 0; turn < TURNS.length; turn += 1) {
        const heading = uh[parent] + (turn === 0 ? 0 : turn === 1 ? -spread : spread);
        ux.push(ux[parent] + Math.sin(heading) * distance);
        uy.push(uy[parent] - Math.cos(heading) * distance);
        ur.push(r);
        uh.push(heading);
        ut.push(turn);
        ud.push(depth);
      }
    }
    start = end;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < ux.length; i += 1) {
    minX = Math.min(minX, ux[i] - ur[i]);
    maxX = Math.max(maxX, ux[i] + ur[i]);
    minY = Math.min(minY, uy[i] - ur[i]);
    maxY = Math.max(maxY, uy[i] + ur[i]);
  }
  const scale = FILL * Math.min(width / (maxX - minX), height / (maxY - minY));
  const offsetX = width / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = height / 2 - ((minY + maxY) / 2) * scale;

  tree.count = 0;
  for (let i = 0; i < ux.length && tree.count < capacity; i += 1) {
    const radius = ur[i] * scale;
    if (radius < MIN_RADIUS_PX) continue;
    const slot = tree.count;
    tree.x[slot] = offsetX + ux[i] * scale;
    tree.y[slot] = offsetY + uy[i] * scale;
    tree.radius[slot] = radius;
    tree.heading[slot] = uh[i];
    tree.turn[slot] = ut[i];
    tree.depth[slot] = ud[i];
    tree.count += 1;
  }
  return tree;
}
