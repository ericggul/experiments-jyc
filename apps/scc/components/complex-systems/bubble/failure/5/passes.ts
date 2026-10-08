// The GPU frame of foam.ts, pass by pass, in TypeScript: the same texel
// layouts (per-bubble RGBA texels indexed by id), the same lags (sweeps read
// the areas counted at the frame's start; gas is renormalised by last
// frame's total) and the same pairing of slots. The shaders are written to
// match these functions line for line; tests run them to check the frame's
// logic (claiming ids, blowing, dividing) that a browser alone could show.

import {
  birthKey,
  confinementAt,
  CONFINEMENT,
  COVERAGE,
  MEDIUM,
  ownerNear,
  tension,
  chordOffset,
  childShare,
  classOrder,
  COPY_OFFSETS,
  FLUX_OFFSETS,
  LEAST_TARGET,
  MAX_IDS,
  parentOf,
  partnerOf,
  random3,
  rotationFor,
  splitFactor,
  VANISH_TARGET,
  WALL_OFFSETS,
  type FoamParameters,
  type Lattice,
} from "./potts.ts";

export type Texels = Float32Array;

export type GpuWorld = {
  width: number;
  height: number;
  lattice: Float32Array;
  /** state0: gas, area, cx, cy · state1: serial, birth, child, kind · state2: axis x, y, cut, wall pairs. */
  state: [Texels, Texels, Texels];
  sums: [Texels, Texels];
  totals: Float32Array;
  frame: number;
  sweep: number;
  time: number;
};

/** A blow request in sites: x, y, radius, serial (0: none), as the `request` uniform. */
export type SiteRequest = readonly [number, number, number, number];

const texels = () => new Float32Array(MAX_IDS * 4);

export function createGpuWorld(foam: Lattice): GpuWorld {
  const { width, height } = foam;
  const world: GpuWorld = {
    width,
    height,
    lattice: Float32Array.from(foam.ids),
    state: [texels(), texels(), texels()],
    sums: [texels(), texels()],
    totals: new Float32Array([width * height, 0, 0, 0]),
    frame: 0,
    sweep: 0,
    time: 0,
  };
  const area = new Float64Array(MAX_IDS);
  const sx = new Float64Array(MAX_IDS);
  const sy = new Float64Array(MAX_IDS);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const id = foam.ids[y * width + x]!;
      area[id] = area[id]! + 1;
      sx[id] = sx[id]! + x + 0.5;
      sy[id] = sy[id]! + y + 0.5;
    }
  }
  // The totals texel starts with the first foam's gas (its bubbles' area).
  world.totals[0] = width * height - area[MEDIUM]!;
  for (let id = 1; id < MAX_IDS; id += 1) {
    if (area[id] === 0) continue;
    world.state[0].set([area[id]!, area[id]!, sx[id]! / area[id]!, sy[id]! / area[id]!], id * 4);
    world.state[1].set([0, -100, 0, 0], id * 4);
    world.state[2].set([1, 0, 0, 4.5 * Math.sqrt(area[id]!)], id * 4);
  }
  return world;
}

function idAt(world: GpuWorld, x: number, y: number) {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return MEDIUM;
  return world.lattice[y * world.width + x]!;
}

const asLattice = (world: GpuWorld) => ({ width: world.width, height: world.height, ids: world.lattice as unknown as Int32Array });

const get = (data: Texels, id: number, channel: number) => data[id * 4 + channel]!;

function pressureOf(gas: number, area: number, stiffness: number) {
  return ((2 * stiffness) / Math.max(gas, LEAST_TARGET)) * (gas - area);
}

function slopeOf(gas: number, area: number, stiffness: number) {
  const t = Math.max(gas, LEAST_TARGET);
  return (2 * stiffness * area) / (t * t);
}

/** 1. SCATTER_VERTEX + SUM_FRAGMENT, additively. */
export function scatterPass(world: GpuWorld, stiffness: number, rate: number) {
  const [sums0, sums1] = world.sums;
  sums0.fill(0);
  sums1.fill(0);
  const [state0, , state2] = world.state;
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const id = world.lattice[y * world.width + x]!;
      if (id < 0.5) continue;
      const gas = get(state0, id, 0);
      const area = get(state0, id, 1);
      const dx = x + 0.5 - get(state0, id, 2);
      const dy = y + 0.5 - get(state0, id, 3);
      let loss = 0;
      let pairs = 0;
      if (gas > 0) {
        const pressure = pressureOf(gas, area, stiffness);
        const stiff = get(state2, id, 3) * slopeOf(gas, area, stiffness);
        for (const [ox, oy] of FLUX_OFFSETS) {
          const other = idAt(world, x + ox, y + oy);
          if (other < 0.5 || other === id) continue;
          const otherGas = get(state0, other, 0);
          if (otherGas <= 0) continue;
          const otherArea = get(state0, other, 1);
          const otherStiff = get(state2, other, 3) * slopeOf(otherGas, otherArea, stiffness);
          loss += (rate * (pressure - pressureOf(otherGas, otherArea, stiffness))) / (1 + rate * (stiff + otherStiff));
          pairs += 1;
        }
      }
      const at = id * 4;
      sums0[at] = sums0[at]! + 1;
      sums0[at + 1] = sums0[at + 1]! + dx;
      sums0[at + 2] = sums0[at + 2]! + dy;
      sums0[at + 3] = sums0[at + 3]! + loss;
      sums1[at] = sums1[at]! + dx * dx;
      sums1[at + 1] = sums1[at + 1]! + dx * dy;
      sums1[at + 2] = sums1[at + 2]! + dy * dy;
      sums1[at + 3] = sums1[at + 3]! + pairs;
    }
  }
}

type Evolved = {
  alive: boolean;
  gas: number;
  area: number;
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  cut: number;
  share: number;
  pairs: number;
  divides: boolean;
};

/** STATE_FRAGMENT's `evolve`. */
function evolve(world: GpuWorld, id: number, splitArea: number): Evolved {
  const [sums0, sums1] = world.sums;
  const before = world.state[0];
  const count = get(sums0, id, 0);
  const alive = count > 0.5;
  const n = Math.max(count, 1);
  const mx = get(sums0, id, 1) / n;
  const my = get(sums0, id, 2) / n;
  const xx = get(sums1, id, 0) / n - mx * mx;
  const xy = get(sums1, id, 1) / n - mx * my;
  const yy = get(sums1, id, 2) / n - my * my;
  const angle = Math.abs(2 * xy) + Math.abs(xx - yy) > 1e-6 ? 0.5 * Math.atan2(2 * xy, xx - yy) : 0;
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);
  const along = ax * ax * xx + 2 * ax * ay * xy + ay * ay * yy;
  const share = childShare(id, world.frame);
  const total = world.totals[0]!;
  const renormalise = total > 0 ? (COVERAGE * world.width * world.height) / total : 1;
  let gas = Math.max(0, get(before, id, 0) - get(sums0, id, 3)) * renormalise;
  if (!(gas >= VANISH_TARGET) || !alive) gas = 0;
  const own = splitArea * splitFactor(id, birthKey(get(world.state[1], id, 1)));
  return {
    alive,
    gas,
    area: count,
    cx: get(before, id, 2) + mx,
    cy: get(before, id, 3) + my,
    ax,
    ay,
    cut: 2 * Math.sqrt(Math.max(along, 0)) * chordOffset(share),
    share,
    pairs: get(sums1, id, 3),
    divides: alive && gas > own && count > 0.85 * own,
  };
}

/** 2. STATE_FRAGMENT over every slot; returns the next state (the previous is kept for nothing else). */
export function statePass(world: GpuWorld, splitArea: number, request: SiteRequest) {
  const next: [Texels, Texels, Texels] = [texels(), texels(), texels()];
  const asked = request[3] > 0;
  const owner = asked ? ownerNear(asLattice(world), request[0], request[1]) : 0;
  const rotation = rotationFor(world.frame);
  const previous1 = world.state[1];
  for (let id = 1; id < MAX_IDS; id += 1) {
    const at = id * 4;
    const self = evolve(world, id, splitArea);
    if (self.alive) {
      const child = partnerOf(id, rotation);
      const free = get(world.sums[0], child, 0) < 0.5;
      const serial = get(previous1, id, 0);
      const buds = asked && id === owner && serial !== request[3];
      let kind = 0;
      let gas = self.gas;
      let area = self.area;
      if (free && buds) kind = 2;
      else if (free && self.divides) {
        kind = 1;
        gas *= 1 - self.share;
        area *= 1 - self.share;
      }
      next[0].set([gas, area, self.cx, self.cy], at);
      next[1].set([serial, get(previous1, id, 1), kind > 0 ? child : 0, kind], at);
      next[2].set([self.ax, self.ay, self.cut, self.pairs], at);
      continue;
    }
    const parent = parentOf(id, rotation);
    if (get(world.sums[0], parent, 0) < 0.5) continue;
    if (asked && parent === owner && get(previous1, parent, 0) !== request[3]) {
      const area = Math.PI * request[2] * request[2];
      next[0].set([area, area, request[0], request[1]], at);
      next[1].set([request[3], world.time, 0, 0], at);
      next[2].set([1, 0, 0, 4.5 * Math.sqrt(area)], at);
      continue;
    }
    const p = evolve(world, parent, splitArea);
    if (!p.divides) continue;
    const area = p.area * p.share;
    next[0].set([p.gas * p.share, area, p.cx + p.ax * (p.cut + Math.sqrt(area)), p.cy + p.ay * (p.cut + Math.sqrt(area))], at);
    next[1].set([0, world.time, 0, 0], at);
    next[2].set([p.ax, p.ay, 0, 4.5 * Math.sqrt(area)], at);
  }
  world.state = next;
}

/** 3. TOTALS_VERTEX: gas, count, Σ area², Σ area. */
export function totalsPass(world: GpuWorld) {
  const totals = new Float32Array(4);
  for (let id = 0; id < MAX_IDS; id += 1) {
    const gas = get(world.state[0], id, 0);
    const area = get(world.state[0], id, 1);
    if (area <= 0) continue;
    totals[0] = totals[0]! + gas;
    totals[1] = totals[1]! + 1;
    totals[2] = totals[2]! + area * area;
    totals[3] = totals[3]! + area;
  }
  world.totals = totals;
}

/** 4. DIVISION_FRAGMENT. */
export function divisionPass(world: GpuWorld, request: SiteRequest) {
  const next = new Float32Array(world.lattice.length);
  const [state0, state1, state2] = world.state;
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const at = y * world.width + x;
      const id = world.lattice[at]!;
      next[at] = id;
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (request[3] > 0 && Math.hypot(cx - request[0], cy - request[1]) < request[2]) {
        const owner = ownerNear(asLattice(world), request[0], request[1]);
        if (owner > 0.5 && get(state1, owner, 3) === 2) {
          next[at] = get(state1, owner, 2);
          continue;
        }
      }
      if (id < 0.5 || get(state1, id, 3) !== 1) continue;
      if ((cx - get(state0, id, 2)) * get(state2, id, 0) + (cy - get(state0, id, 3)) * get(state2, id, 1) > get(state2, id, 2)) {
        next[at] = get(state1, id, 2);
      }
    }
  }
  world.lattice = next;
}

/** 5. SWEEP_FRAGMENT for one sublattice class (in place: a class's sites never read each other). */
export function sweepPass(world: GpuWorld, phase: number, passIndex: number, temperature: number, stiffness: number, time = world.time) {
  const state0 = world.state[0];
  const seed = passIndex * 2;
  for (let y = Math.floor(phase / 3); y < world.height; y += 3) {
    for (let x = phase % 3; x < world.width; x += 3) {
      const current = world.lattice[y * world.width + x]!;
      const choice = Math.min(Math.floor(random3(x, y, seed) * 8), 7);
      const [ox, oy] = COPY_OFFSETS[choice]!;
      const next = idAt(world, x + ox, y + oy);
      if (next === current) continue;
      let wall = 0;
      for (const [wx, wy] of WALL_OFFSETS) {
        const other = idAt(world, x + wx, y + wy);
        wall += tension(next, other) - tension(current, other);
      }
      const ag = get(state0, current, 0);
      const aa = get(state0, current, 1);
      const bg = get(state0, next, 0);
      const ba = get(state0, next, 1);
      const lose = current === MEDIUM ? 0 : (stiffness / Math.max(ag, LEAST_TARGET)) * (1 - 2 * (aa - ag));
      const gain = next === MEDIUM ? 0 : (stiffness / Math.max(bg, LEAST_TARGET)) * (1 + 2 * (ba - bg));
      const bowl = CONFINEMENT * confinementAt(x, y, world.width, world.height, time) * (Number(next !== MEDIUM) - Number(current !== MEDIUM));
      const change = wall + lose + gain + bowl;
      if (change <= 0 || random3(x, y, seed + 1) < Math.exp(-change / temperature)) world.lattice[y * world.width + x] = next;
    }
  }
}

/** One frame as foam.ts's `step` runs it (request in sites). */
export function gpuFrame(world: GpuWorld, parameters: FoamParameters, seconds: number, request: SiteRequest = [0, 0, 0, 0]) {
  world.time += seconds;
  scatterPass(world, parameters.stiffness, parameters.diffusion * seconds);
  statePass(world, parameters.splitArea, request);
  totalsPass(world);
  divisionPass(world, request);
  for (let index = 0; index < parameters.sweeps; index += 1) {
    const order = classOrder(world.sweep);
    for (let pass = 0; pass < 9; pass += 1) sweepPass(world, order[pass]!, world.sweep * 9 + pass, parameters.temperature, parameters.stiffness);
    world.sweep += 1;
  }
  world.frame += 1;
}

/**
 * 6. LABEL_FRAGMENT: per site the two strongest ids in a Gaussian window
 * (radius² ≤ reach² + 1), eased toward the window's weights by `blend`.
 * `labels` holds label, weight, label, weight per site (label = id + 1, so
 * 0 is empty and 1 is air) and is updated in place from a copy of itself.
 */
export function labelPass(world: Pick<GpuWorld, "width" | "height" | "lattice">, labels: Float32Array, blend: number, sigma: number, reach = 2) {
  const before = labels.slice();
  const spread = 0.5 / (sigma * sigma);
  const ids: number[] = [];
  const weights: number[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      ids.length = 0;
      weights.length = 0;
      let total = 0;
      for (let dy = -reach; dy <= reach; dy += 1) {
        for (let dx = -reach; dx <= reach; dx += 1) {
          const r2 = dx * dx + dy * dy;
          if (r2 > reach * reach + 1) continue;
          const w = Math.exp(-r2 * spread);
          const qx = Math.min(world.width - 1, Math.max(0, x + dx));
          const qy = Math.min(world.height - 1, Math.max(0, y + dy));
          const id = world.lattice[qy * world.width + qx]! + 1;
          total += w;
          let k = ids.indexOf(id);
          if (k < 0) {
            if (ids.length === 8) continue;
            k = ids.length;
            ids.push(id);
            weights.push(0);
          }
          weights[k] = weights[k]! + w;
        }
      }
      const at = (y * world.width + x) * 4;
      const [pa, pwa, pb, pwb] = [before[at]!, before[at + 1]!, before[at + 2]!, before[at + 3]!];
      let weightOfA = 0;
      let weightOfB = 0;
      let topId = 0;
      let topWeight = -1;
      let secondId = 0;
      let secondWeight = -1;
      for (let k = 0; k < ids.length; k += 1) {
        const w = weights[k]! / total;
        if (ids[k] === pa) weightOfA = w;
        if (ids[k] === pb) weightOfB = w;
        if (w > topWeight) {
          secondId = topId;
          secondWeight = topWeight;
          topId = ids[k]!;
          topWeight = w;
        } else if (w > secondWeight) {
          secondId = ids[k]!;
          secondWeight = w;
        }
      }
      const candidates: [number, number][] = [
        [pa, pa > 0.5 ? pwa + (weightOfA - pwa) * blend : -1],
        [pb, pb > 0.5 && pb !== pa ? pwb + (weightOfB - pwb) * blend : -1],
        [topId, topId !== pa && topId !== pb ? topWeight * blend : -1],
        [secondId, secondWeight > 0 && secondId !== pa && secondId !== pb ? secondWeight * blend : -1],
      ];
      let aId = 0;
      let aWeight = -1;
      let bId = 0;
      let bWeight = -1;
      for (const [id, w] of candidates) {
        if (w <= 0) continue;
        if (w > aWeight) {
          bId = aId;
          bWeight = aWeight;
          aId = id;
          aWeight = w;
        } else if (w > bWeight) {
          bId = id;
          bWeight = w;
        }
      }
      labels[at] = aId;
      labels[at + 1] = Math.max(aWeight, 0);
      labels[at + 2] = bId;
      labels[at + 3] = Math.max(bWeight, 0);
    }
  }
}
