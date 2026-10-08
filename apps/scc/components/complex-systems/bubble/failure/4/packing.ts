// Circle packing of the network (Koebe–Andreev–Thurston): every vertex is a
// circle and two circles touch exactly when their vertices are linked.
//
// Radii by the Collins–Stephenson iteration (Comput. Geom. 25, 2003): a
// vertex with k faces whose angle sum is θ, aiming at Θ, takes the radius
// its k neighbours would need if they were all equal:
//   β = sin(θ / 2k),  δ = sin(Θ / 2k),  r ← (β r / (1 − β)) · (1 − δ) / δ.
// Interior vertices aim at 2π. The frame (the vertices adjacent to OMEGA)
// turns through 2π in all, shared out by `shapeFrame`: a little everywhere
// and most of it at four soft corners, so the raft is a rounded, slightly
// wobbling shape of the screen's aspect with free faces all round. Radii
// are warm-started every frame, so a change of topology re-converges in a
// few sweeps. Centres are then laid out face by face from a root and the
// raft is fitted inside the screen (`fitRaft`, `toScreen`).

import { CAPACITY, degree, frameCycle, type Network, OMEGA } from "./network.ts";

export type Packing = {
  radius: Float64Array;
  x: Float64Array;
  y: Float64Array;
  placed: Uint8Array;
  /** Largest |θ − Θ| at the last sweep (radians). */
  error: number;
  /** Packing-space width and height of the rectangle of corner centres. */
  width: number;
  height: number;
  /** Target angle sum per frame vertex (0: not yet shaped, π is used). */
  target: Float64Array;
  /** Share of the frame's length on the bottom side (sets the raft's aspect). */
  share: number;
};

export function createPacking(): Packing {
  const radius = new Float64Array(CAPACITY).fill(1);
  return {
    radius,
    x: new Float64Array(CAPACITY),
    y: new Float64Array(CAPACITY),
    placed: new Uint8Array(CAPACITY),
    error: Math.PI,
    width: 1,
    height: 1,
    target: new Float64Array(CAPACITY),
    share: 0.33,
  };
}

/** Angle at a circle of radius r between tangent neighbours of radii a and b. */
export function cornerAngle(r: number, a: number, b: number) {
  const cos = 1 - (2 * a * b) / ((r + a) * (r + b));
  return Math.acos(Math.min(1, Math.max(-1, cos)));
}

export function targetAngle(net: Network, v: number, packing?: Packing) {
  if (!net.rot[v]!.includes(OMEGA)) return 2 * Math.PI;
  const shaped = packing?.target[v] ?? 0;
  if (shaped > 0) return shaped;
  return net.corner[v] ? Math.PI / 2 : Math.PI;
}

/** Angle sum and face count at v. */
function angleSum(net: Network, radius: Float64Array, v: number) {
  const list = net.rot[v]!;
  const r = radius[v]!;
  let sum = 0;
  let faces = 0;
  for (let i = 0; i < list.length; i += 1) {
    const w = list[i]!;
    const x = list[(i + 1) % list.length]!;
    if (w === OMEGA || x === OMEGA) continue;
    sum += cornerAngle(r, radius[w]!, radius[x]!);
    faces += 1;
  }
  return { sum, faces };
}

/** Collins–Stephenson sweeps until every angle is within `tolerance` or `sweeps` run out. Returns sweeps used. */
export function solveRadii(net: Network, packing: Packing, sweeps: number, tolerance = 1e-5) {
  const radius = packing.radius;
  let used = 0;
  for (; used < sweeps; used += 1) {
    let worst = 0;
    let logSum = 0;
    for (let v = 1; v < CAPACITY; v += 1) {
      if (!net.alive[v]) continue;
      const { sum, faces } = angleSum(net, radius, v);
      const target = targetAngle(net, v, packing);
      worst = Math.max(worst, Math.abs(sum - target));
      const beta = Math.sin(sum / (2 * faces));
      const delta = Math.sin(target / (2 * faces));
      const r = radius[v]!;
      const uniform = (beta * r) / (1 - beta);
      radius[v] = Math.min(1e6, Math.max(1e-6, (uniform * (1 - delta)) / delta));
      logSum += Math.log(radius[v]!);
    }
    // The angle conditions fix radii only up to scale: keep their geometric mean at 1.
    const scale = Math.exp(-logSum / net.size);
    for (let v = 1; v < CAPACITY; v += 1) if (net.alive[v]) radius[v] = radius[v]! * scale;
    packing.error = worst;
    if (worst < tolerance) break;
  }
  return used;
}

/** Inner Soddy circle of three mutually tangent circles: a newborn's first radius. */
export function soddyRadius(a: number, b: number, c: number) {
  const ka = 1 / a;
  const kb = 1 / b;
  const kc = 1 / c;
  return 1 / (ka + kb + kc + 2 * Math.sqrt(ka * kb + kb * kc + kc * ka));
}

/** Lays centres out face by face from the interior vertex of highest degree (y up). */
export function layoutCentres(net: Network, packing: Packing) {
  const { radius, x, y, placed } = packing;
  placed.fill(0);
  let root = -1;
  for (let v = 1; v < CAPACITY; v += 1) {
    if (!net.alive[v] || net.rot[v]!.includes(OMEGA)) continue;
    if (root < 0 || degree(net, v) > degree(net, root)) root = v;
  }
  if (root < 0) return;
  const queue = [root];
  x[root] = 0;
  y[root] = 0;
  placed[root] = 1;
  const first = net.rot[root]![0]!;
  x[first] = radius[root]! + radius[first]!;
  y[first] = 0;
  placed[first] = 1;
  queue.push(first);
  for (let head = 0; head < queue.length; head += 1) {
    const v = queue[head]!;
    const list = net.rot[v]!;
    const n = list.length;
    // Around v, place each unplaced neighbour from a placed one beside it, both ways.
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < n; i += 1) {
        const w = list[i]!;
        if (w === OMEGA || !placed[w]) continue;
        for (const direction of [1, -1]) {
          const u = list[(i + direction + n) % n]!;
          if (u === OMEGA || placed[u]) continue;
          const angle = cornerAngle(radius[v]!, radius[w]!, radius[u]!) * direction;
          const heading = Math.atan2(y[w]! - y[v]!, x[w]! - x[v]!) + angle;
          const distance = radius[v]! + radius[u]!;
          x[u] = x[v]! + Math.cos(heading) * distance;
          y[u] = y[v]! + Math.sin(heading) * distance;
          placed[u] = 1;
          queue.push(u);
          changed = true;
        }
      }
    }
  }
}

/** Where the frame's soft corners fall, as fractions of its length from corner 1. */
function cornerFractions(share: number) {
  return [0, share, 0.5, 0.5 + share];
}

/**
 * A free, rounded frame. The frame turns through 2π in all; each frame
 * vertex takes a share of that turn (its angle sum is π minus its share):
 * a little everywhere, so the sides bow out, and most of it in four soft
 * corners placed by `packing.share`, which sets the raft's aspect
 * continuously. A slow wobble keeps the outline from being a rectangle.
 */
export function shapeFrame(net: Network, packing: Packing, time: number) {
  // Positions by count along the frame, not by length: a vertex given more
  // turn grows and would take more length, dragging the corners with it.
  const cycle = frameCycle(net);
  const at = cycle.map((_, i) => i / cycle.length);
  const corners = cornerFractions(packing.share);
  const weights = new Float64Array(cycle.length);
  let total = 0;
  for (let i = 0; i < cycle.length; i += 1) {
    let weight = 0.16 + 0.1 * Math.sin(2 * Math.PI * (3 * at[i]! + 0.021 * time)) * Math.sin(2 * Math.PI * (2 * at[i]! - 0.013 * time));
    for (const corner of corners) {
      let gap = Math.abs(at[i]! - corner);
      gap = Math.min(gap, 1 - gap);
      weight += 2.2 * Math.exp(-((gap / 0.05) ** 2));
    }
    // Per vertex, not per length: weighting by a vertex's span would let a large frame bubble take more turn and grow without end.
    weights[i] = weight;
    total += weight;
  }
  for (let i = 0; i < cycle.length; i += 1) {
    const turn = Math.min(Math.PI / 4, (2 * Math.PI * weights[i]!) / total);
    packing.target[cycle[i]!] = Math.PI - turn;
  }
}

export type RaftFit = {
  cx: number;
  cy: number;
  angle: number;
  /** Packing-space size of the raft, free faces included. */
  width: number;
  height: number;
};

/**
 * Orientation by the principal axis of the frame centres (weighted by the
 * frame length each holds), turned by at most a half turn from `previous`
 * so the raft never flips; then the bounding box of every frame bubble's
 * free face (radius `faceScale` × r) in that orientation.
 */
export function fitRaft(net: Network, packing: Packing, faceScale: number, previous = 0): RaftFit {
  const cycle = frameCycle(net);
  const { x, y, radius } = packing;
  let total = 0;
  let mx = 0;
  let my = 0;
  for (const v of cycle) {
    total += radius[v]!;
    mx += x[v]! * radius[v]!;
    my += y[v]! * radius[v]!;
  }
  mx /= total;
  my /= total;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const v of cycle) {
    const dx = x[v]! - mx;
    const dy = y[v]! - my;
    sxx += radius[v]! * dx * dx;
    syy += radius[v]! * dy * dy;
    sxy += radius[v]! * dx * dy;
  }
  let angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  while (angle - previous > Math.PI / 2) angle -= Math.PI;
  while (angle - previous < -Math.PI / 2) angle += Math.PI;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const v of cycle) {
    const qx = x[v]! * cos - y[v]! * sin;
    const qy = x[v]! * sin + y[v]! * cos;
    const reach = radius[v]! * faceScale;
    minX = Math.min(minX, qx - reach);
    maxX = Math.max(maxX, qx + reach);
    minY = Math.min(minY, qy - reach);
    maxY = Math.max(maxY, qy + reach);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { cx: cx * Math.cos(angle) - cy * Math.sin(angle), cy: cx * Math.sin(angle) + cy * Math.cos(angle), angle, width: maxX - minX, height: maxY - minY };
}

/** Packing point → screen (CSS px, y down), the raft fitted inside `width` × `height` with `margin` (share) all round. */
export function toScreen(fit: RaftFit, width: number, height: number, margin: number, px: number, py: number) {
  const scale = Math.min((width * (1 - 2 * margin)) / fit.width, (height * (1 - 2 * margin)) / fit.height);
  const cos = Math.cos(-fit.angle);
  const sin = Math.sin(-fit.angle);
  const dx = px - fit.cx;
  const dy = py - fit.cy;
  return { x: width / 2 + (dx * cos - dy * sin) * scale, y: height / 2 - (dx * sin + dy * cos) * scale, scale };
}
