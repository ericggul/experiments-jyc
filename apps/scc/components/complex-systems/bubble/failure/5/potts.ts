// The foam's physics, in plain TypeScript: the parameters the shaders use,
// id allocation, the first foam, and a CPU replica of one GPU frame, so the
// shader logic can be checked and measured in Node (potts.test.ts,
// measure.ts). Nothing here draws.
//
// The foam is an extended Potts model (Graner & Glazier, PRL 69, 2013 (1992);
// Glazier & Graner, PRE 47, 2128 (1993)). Every lattice site carries the id
// of the bubble it belongs to, and the foam lowers
//
//   H = J Σ_pairs [σᵢ ≠ σⱼ] + Σ_b (λ / T_b) (A_b − T_b)²
//
// by Metropolis copy attempts at temperature `temperature`: wall length
// (pairs within distance √5, 20 neighbours, which keeps walls round rather
// than lattice-aligned; Holm et al., PRA 43, 2662 (1991)) against each
// bubble's area A and target T. A bubble's pressure is p = 2λ (1 − A/T).
// The target is the bubble's gas, and gas crosses every shared wall site
// from the higher pressure to the lower: small bubbles, whose walls curve
// most, empty into large ones (Ostwald ripening; in a dry 2D foam this is
// von Neumann's law, dA/dt ∝ n − 6). Bubbles that grow too large divide
// through their centroid along their short axis, and taps (and a slow
// nucleation) blow new ones, so the foam keeps its number.
//
// The GPU updates sites of one of nine 3 × 3 sublattice classes at a time:
// two sites of a class are at least 3 apart, beyond each other's reach (the
// energy reads distance ≤ 2), so a pass is exactly a sequence of
// independent attempts. Areas are counted once per frame, so all sweeps of
// a frame see the areas of its start; the replica does the same.

/** Lattice sites per CSS pixel along each axis. */
export const SCALE = 0.5;
/** Bubble slots; id 0 means none. Per-bubble textures are ROW wide. */
export const MAX_IDS = 2_048;
export const ROW = 128;
export const SLOTS = MAX_IDS - 1;

/** Pairs within distance √5 (Chebyshev 2 without the corners): 20 neighbours. */
export const WALL_OFFSETS: readonly (readonly [number, number])[] = (() => {
  const offsets: [number, number][] = [];
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      if ((dx === 0 && dy === 0) || (Math.abs(dx) === 2 && Math.abs(dy) === 2)) continue;
      offsets.push([dx, dy]);
    }
  }
  return offsets;
})();

/** A site tries to copy one of its eight nearest neighbours. */
export const COPY_OFFSETS: readonly (readonly [number, number])[] = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];

/** Gas crosses a wall between 4-neighbours. */
export const FLUX_OFFSETS: readonly (readonly [number, number])[] = [
  [1, 0], [0, 1], [-1, 0], [0, -1],
];

/** Base split size (CSS px²); each bubble divides at its own 0.5–15.5 times this (splitFactor), most near the low end. */
export const SPLIT_CSS_AREA = 2_400;
/** The first foam has one bubble per this many of its sites. */
export const SITES_PER_SEED = 480;
/** Id 0 is the medium: open air, drawn black, against which outer bubbles show free faces. */
export const MEDIUM = 0;
/** Line tension of a free face (bubble against air) relative to a wall between bubbles (1). */
export const MEDIUM_TENSION = 1;
/** Share of the screen the raft's gas fills; the rest is air. */
export const COVERAGE = 0.24;
/** Energy per bubble site of a gentle bowl that holds the raft in the middle: g·ρ², ρ = 1 at the screen's edge. */
export const CONFINEMENT = 2;

export type FoamParameters = {
  /** Metropolis temperature, in units of J (one unlike pair). */
  temperature: number;
  /** λ: area stiffness; pressure p = 2λ(1 − A/T). */
  stiffness: number;
  /** Gas moved per second per wall-site pair per unit pressure difference (sites). */
  diffusion: number;
  /** A bubble whose target exceeds this many sites divides. */
  splitArea: number;
  /** Copy-attempt sweeps (Monte Carlo steps) per frame. */
  sweeps: number;
};

export const DEFAULT_FOAM: FoamParameters = {
  temperature: 2.2,
  stiffness: 12,
  diffusion: 0.5,
  splitArea: SPLIT_CSS_AREA * SCALE * SCALE,
  sweeps: 1,
};

export const TEMPERATURE_RANGE = [1.2, 4] as const;
export const DIFFUSION_RANGE = [0, 3] as const;
/** Nucleations per second per million CSS px². */
export const NUCLEATION_RANGE = [0, 4] as const;
export const DEFAULT_NUCLEATION = 2.5;
/** Below this target a bubble has given up its gas and is let go entirely (T2). */
export const VANISH_TARGET = 3;
/** λ / T is taken with T at least this, so a vanishing bubble's stiffness stays finite. */
export const LEAST_TARGET = 8;
/** Radius (sites) of a blown bubble and of a nucleus. */
export const BLOW_RADIUS = 9;
export const NUCLEUS_RADIUS = 4;

// ---------------------------------------------------------------- random

/** PCG hash (O'Neill), as `pcg` in the shaders. */
export function pcg(value: number) {
  const state = (Math.imul(value >>> 0, 747_796_405) + 2_891_336_453) >>> 0;
  const word = Math.imul(((state >>> (((state >>> 28) + 4) >>> 0)) ^ state) >>> 0, 277_803_737) >>> 0;
  return ((word >>> 22) ^ word) >>> 0;
}

/** A value in [0, 1) per (x, y, z), as `random3` in the shaders (24 bits, exact in float32). */
export function random3(x: number, y: number, z: number) {
  return (pcg((x >>> 0) ^ pcg((y >>> 0) ^ pcg(z >>> 0))) >>> 8) / 16_777_216;
}

/** The order in which a sweep visits the nine sublattice classes. */
export function classOrder(sweep: number) {
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let index = 8; index > 0; index -= 1) {
    const pick = Math.floor(random3(sweep, index, 0x5eed) * (index + 1));
    [order[index], order[pick]] = [order[pick]!, order[index]!];
  }
  return order;
}

// ---------------------------------------------------------------- ids

/**
 * Ids are claimed without any search: each frame every slot is paired with
 * one other by a rotation of the slot ring. A bubble that wants to divide
 * (or bud) may take its partner's slot only if that slot is free; the free
 * slot sees the same pair from its side, so both decide alike from the same
 * textures, on the GPU, with no list and no read-back.
 */
export function partnerOf(id: number, offset: number) {
  return 1 + ((id - 1 + offset) % SLOTS);
}

export function parentOf(id: number, offset: number) {
  return 1 + ((((id - 1 - offset) % SLOTS) + SLOTS) % SLOTS);
}

/** This frame's rotation, never 0 (a slot is never its own partner). */
export function rotationFor(frame: number) {
  return 1 + Math.floor(random3(frame, 0xa11c, 7) * (SLOTS - 1));
}

// ---------------------------------------------------------------- first foam

export type Lattice = { width: number; height: number; ids: Int32Array };

export function latticeSize(cssWidth: number, cssHeight: number) {
  return { width: Math.max(8, Math.round(cssWidth * SCALE)), height: Math.max(8, Math.round(cssHeight * SCALE)) };
}

/**
 * A power diagram of random seeds with random weights: a foam of broadly
 * varied cells to start from (the Potts dynamics then curve its walls).
 * Returns ids 1..count; a seed that owns nothing is simply never used.
 */
export function seedFoam(width: number, height: number, count: number, random: () => number): Lattice {
  const ids = new Int32Array(width * height);
  // The raft starts as an ellipse covering COVERAGE of the screen; the rest is air.
  const scale = Math.sqrt(COVERAGE);
  const spacing = Math.sqrt((width * height) / count);
  const cell = Math.max(2, spacing);
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const buckets: number[][] = Array.from({ length: columns * rows }, () => []);
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  const weights = new Float64Array(count);
  for (let seed = 0; seed < count; seed += 1) {
    xs[seed] = random() * width;
    ys[seed] = random() * height;
    // Weight in units of spacing²: cells from about a third to twice the
    // mean, and one in twelve a hub many times larger.
    weights[seed] = ((random() ** 2) * 0.9 + (random() < 1 / 12 ? 9 : 0)) * spacing * spacing;
    const column = Math.min(columns - 1, Math.floor(xs[seed]! / cell));
    const row = Math.min(rows - 1, Math.floor(ys[seed]! / cell));
    buckets[row * columns + column]!.push(seed);
  }
  const reach = 5;
  for (let y = 0; y < height; y += 1) {
    const row = Math.min(rows - 1, Math.floor((y + 0.5) / cell));
    for (let x = 0; x < width; x += 1) {
      const column = Math.min(columns - 1, Math.floor((x + 0.5) / cell));
      let best = -1;
      let bestPower = Infinity;
      for (let r = Math.max(0, row - reach); r <= Math.min(rows - 1, row + reach); r += 1) {
        for (let c = Math.max(0, column - reach); c <= Math.min(columns - 1, column + reach); c += 1) {
          for (const seed of buckets[r * columns + c]!) {
            const dx = x + 0.5 - xs[seed]!;
            const dy = y + 0.5 - ys[seed]!;
            const power = dx * dx + dy * dy - weights[seed]!;
            if (power < bestPower) {
              bestPower = power;
              best = seed;
            }
          }
        }
      }
      ids[y * width + x] = confinementAt(x, y, width, height) < scale * scale * 1.1 ? best + 1 : MEDIUM;
    }
  }
  return { width, height, ids };
}

// ---------------------------------------------------------------- energy

export type Bubbles = {
  /** Per id (index = id): gas, area (from the last count), target, centroid. */
  gas: Float64Array;
  area: Float64Array;
  target: Float64Array;
  cx: Float64Array;
  cy: Float64Array;
};

export function createBubbles() : Bubbles {
  return {
    gas: new Float64Array(MAX_IDS),
    area: new Float64Array(MAX_IDS),
    target: new Float64Array(MAX_IDS),
    cx: new Float64Array(MAX_IDS),
    cy: new Float64Array(MAX_IDS),
  };
}

export function stiffnessOf(target: number, stiffness: number) {
  return stiffness / Math.max(target, LEAST_TARGET);
}

export function pressureOf(area: number, target: number, stiffness: number) {
  return 2 * stiffnessOf(target, stiffness) * (target - area);
}

/** Beyond the screen is air. */
function idAt(lattice: Lattice, x: number, y: number) {
  if (x < 0 || y < 0 || x >= lattice.width || y >= lattice.height) return MEDIUM;
  return lattice.ids[y * lattice.width + x]!;
}

/** Line tension between two ids: 0 within a bubble or within air, MEDIUM_TENSION for a free face, 1 for a wall. */
export function tension(a: number, b: number) {
  if (a === b) return 0;
  return a === MEDIUM || b === MEDIUM ? MEDIUM_TENSION : 1;
}

/**
 * ρ² of site (x, y) at `time` (s): 0 at the screen's middle, 1 at 0.6 of
 * the screen's height from it in every direction (a round bowl, wider
 * screens only add air at the sides), with two slow lobes drifting round so
 * the raft's outline is never a drawn shape (the shaders' `bowl`).
 */
export function confinementAt(x: number, y: number, width: number, height: number, time = 0) {
  const u = (x + 0.5 - width / 2) / (0.6 * height);
  const v = (y + 0.5 - height / 2) / (0.6 * height);
  const angle = Math.atan2(v, u);
  const lobes = 1 + 0.22 * Math.sin(2 * angle + 0.031 * time + 1.3) + 0.14 * Math.sin(3 * angle - 0.047 * time + 0.4);
  return (u * u + v * v) / lobes;
}

/**
 * Energy change if site (x, y) takes id `next` (the shaders' `deltaH`):
 * line tension with the 20 neighbours (air beyond the screen), the area
 * terms of the bubbles involved (air has none), and the bowl.
 */
export function deltaH(lattice: Lattice, bubbles: Bubbles, x: number, y: number, next: number, stiffness: number, time = 0) {
  const current = idAt(lattice, x, y);
  let wall = 0;
  for (const [dx, dy] of WALL_OFFSETS) {
    const other = idAt(lattice, x + dx, y + dy);
    wall += tension(next, other) - tension(current, other);
  }
  const lose = current === MEDIUM ? 0 : stiffnessOf(bubbles.target[current]!, stiffness) * (1 - 2 * (bubbles.area[current]! - bubbles.target[current]!));
  const gain = next === MEDIUM ? 0 : stiffnessOf(bubbles.target[next]!, stiffness) * (1 + 2 * (bubbles.area[next]! - bubbles.target[next]!));
  const bowl = CONFINEMENT * confinementAt(x, y, lattice.width, lattice.height, time) * (Number(next !== MEDIUM) - Number(current !== MEDIUM));
  return wall + lose + gain + bowl;
}

/** The whole Hamiltonian with exact areas (for checking deltaH). */
export function energy(lattice: Lattice, bubbles: Bubbles, stiffness: number) {
  let wall = 0;
  let bowl = 0;
  const area = new Float64Array(MAX_IDS);
  for (let y = 0; y < lattice.height; y += 1) {
    for (let x = 0; x < lattice.width; x += 1) {
      const id = idAt(lattice, x, y);
      area[id] = area[id]! + 1;
      if (id !== MEDIUM) bowl += CONFINEMENT * confinementAt(x, y, lattice.width, lattice.height);
      for (const [dx, dy] of WALL_OFFSETS) {
        const inside = x + dx >= 0 && y + dy >= 0 && x + dx < lattice.width && y + dy < lattice.height;
        // Pairs inside the lattice once each; pairs with the air beyond, from inside.
        if (inside && (dy < 0 || (dy === 0 && dx < 0))) continue;
        wall += tension(id, idAt(lattice, x + dx, y + dy));
      }
    }
  }
  let elastic = 0;
  for (let id = 1; id < MAX_IDS; id += 1) {
    if (area[id] === 0 && bubbles.target[id] === 0) continue;
    const difference = area[id]! - bubbles.target[id]!;
    elastic += stiffnessOf(bubbles.target[id]!, stiffness) * difference * difference;
  }
  return wall + elastic + bowl;
}

/** Recounts areas exactly (what the GPU's scatter pass does). */
export function countAreas(lattice: Lattice, bubbles: Bubbles) {
  bubbles.area.fill(0);
  for (const id of lattice.ids) bubbles.area[id] = bubbles.area[id]! + 1;
}

/** Sites of class `k` (0–8) have (x mod 3, y mod 3) = (k mod 3, ⌊k/3⌋). */
export function inClass(x: number, y: number, k: number) {
  return x % 3 === k % 3 && y % 3 === Math.floor(k / 3);
}

/**
 * One sweep (one copy attempt per site) exactly as the GPU passes do it:
 * nine sublattice passes in `classOrder(sweep)`, the attempt's random values
 * from (x, y, pass), areas held at the frame's start.
 */
export function sweepReplica(lattice: Lattice, bubbles: Bubbles, parameters: Pick<FoamParameters, "temperature" | "stiffness">, sweep: number, time = 0) {
  const { width, height, ids } = lattice;
  let flips = 0;
  const order = classOrder(sweep);
  for (let step = 0; step < 9; step += 1) {
    const k = order[step]!;
    const pass = sweep * 9 + step;
    for (let y = Math.floor(k / 3); y < height; y += 3) {
      for (let x = k % 3; x < width; x += 3) {
        const choice = Math.floor(random3(x, y, pass * 2) * 8);
        const [dx, dy] = COPY_OFFSETS[choice]!;
        const next = idAt(lattice, x + dx, y + dy);
        const current = ids[y * width + x]!;
        if (next === current) continue;
        const change = deltaH(lattice, bubbles, x, y, next, parameters.stiffness, time);
        if (change <= 0 || random3(x, y, pass * 2 + 1) < Math.exp(-change / parameters.temperature)) {
          ids[y * width + x] = next;
          flips += 1;
        }
      }
    }
  }
  return flips;
}

// ---------------------------------------------------------------- per-frame bubble state

export type Request = { x: number; y: number; radius: number; serial: number } | null;

export type FrameReplica = {
  lattice: Lattice;
  bubbles: Bubbles;
  serial: Int32Array;
  /** Birth time (s) per id, as state1.y; the first foam was born at −100. */
  birth: Float64Array;
  frame: number;
  sweep: number;
  /** Total gas after last frame (the totals pass); gas is renormalised by it. */
  totalGas: number;
};

/** ∂p/∂T for a bubble of area A and target T: how fast its pressure answers its gas. */
export function pressureSlope(area: number, target: number, stiffness: number) {
  const t = Math.max(target, LEAST_TARGET);
  return (2 * stiffness * area) / (t * t);
}

/**
 * Wall-site pairs per bubble (4-neighbours of another living bubble): the
 * length of its walls in the exchange. The scatter pass counts them too.
 */
export function wallPairs(lattice: Lattice, bubbles: Bubbles) {
  const pairs = new Float64Array(MAX_IDS);
  for (let y = 0; y < lattice.height; y += 1) {
    for (let x = 0; x < lattice.width; x += 1) {
      const id = lattice.ids[y * lattice.width + x]!;
      if (bubbles.gas[id]! <= 0) continue;
      for (const [dx, dy] of FLUX_OFFSETS) {
        const other = idAt(lattice, x + dx, y + dy);
        if (other === 0 || other === id || bubbles.gas[other]! <= 0) continue;
        pairs[id] = pairs[id]! + 1;
      }
    }
  }
  return pairs;
}

/**
 * Gas each bubble loses this frame. Across every wall-site pair, gas moves
 * by D·dt·(p_b − p_c) / (1 + D·dt·(L_b k_b + L_c k_c)) (L: wall pairs, k:
 * pressure slope): the same amount leaves one bubble as enters the other,
 * and the denominator (each bubble's pressure taken implicitly) keeps the
 * step stable however large D is. The scatter pass sums exactly this.
 */
export function gasLoss(lattice: Lattice, bubbles: Bubbles, pairs: Float64Array, stiffness: number, rate: number) {
  const loss = new Float64Array(MAX_IDS);
  const pressure = new Float64Array(MAX_IDS);
  const stiff = new Float64Array(MAX_IDS);
  for (let id = 1; id < MAX_IDS; id += 1) {
    if (bubbles.area[id]! <= 0) continue;
    pressure[id] = pressureOf(bubbles.area[id]!, bubbles.target[id]!, stiffness);
    stiff[id] = pairs[id]! * pressureSlope(bubbles.area[id]!, bubbles.target[id]!, stiffness);
  }
  for (let y = 0; y < lattice.height; y += 1) {
    for (let x = 0; x < lattice.width; x += 1) {
      const id = lattice.ids[y * lattice.width + x]!;
      // A dissolving bubble (no gas left) is out of the exchange.
      if (bubbles.gas[id]! <= 0) continue;
      for (const [dx, dy] of FLUX_OFFSETS) {
        const other = idAt(lattice, x + dx, y + dy);
        if (other === 0 || other === id || bubbles.gas[other]! <= 0) continue;
        loss[id] = loss[id]! + (rate * (pressure[id]! - pressure[other]!)) / (1 + rate * (stiff[id]! + stiff[other]!));
      }
    }
  }
  return loss;
}

/**
 * Each bubble's own split size, as a multiple of the base, fixed at its
 * birth (the shaders' `splitFactor`): 0.5–15.5, mostly near 1, so a few
 * bubbles grow into hubs.
 */
export function splitFactor(id: number, birthKey: number) {
  return 0.5 + 15 * random3(id, birthKey, 0x5b1) ** 4;
}

/**
 * The bubble a request at (x, y) (sites) belongs to: the one there, or, on
 * open air, the nearest within 12 sites along 16 rays (the shaders'
 * `ownerNear`), so a tap beside the raft blows a bubble onto it.
 */
export function ownerNear(lattice: Lattice, x: number, y: number) {
  const here = idAt(lattice, Math.floor(x), Math.floor(y));
  if (here !== MEDIUM) return here;
  for (let radius = 2; radius <= 12; radius += 2) {
    for (let ray = 0; ray < 16; ray += 1) {
      const angle = (ray / 16) * Math.PI * 2;
      const id = idAt(lattice, Math.floor(x + Math.cos(angle) * radius), Math.floor(y + Math.sin(angle) * radius));
      if (id !== MEDIUM) return id;
    }
  }
  return MEDIUM;
}

/** The birth key the shaders derive from a birth time in seconds. */
export function birthKey(birth: number) {
  return Math.floor(Math.abs(birth) * 60 + 7);
}

/** A bubble divides when its gas and its actual area both exceed its split size (a passing surge of gas does not split it). */
export function wantsSplit(target: number, area: number, splitArea: number) {
  return target > splitArea && area > 0.85 * splitArea;
}

/** The share of a dividing bubble that its child takes: 15–50 %, its own per division (the shaders' `childShare`). */
export function childShare(id: number, frame: number) {
  return 0.15 + 0.35 * random3(id, frame, 0xd1e);
}

/**
 * Distance from the centre of a unit disc of the chord that cuts off
 * `share` of its area: solves (acos h − h√(1 − h²)) / π = share by Newton's
 * method (the shaders' `chordOffset`). A bubble is cut at this times its
 * half-length along the long axis, 2√(variance), as for a uniform ellipse.
 */
export function chordOffset(share: number) {
  let h = 1 - 2 * share;
  for (let step = 0; step < 4; step += 1) {
    const root = Math.sqrt(Math.max(1 - h * h, 1e-6));
    const value = (Math.acos(h) - h * root) / Math.PI - share;
    h = Math.min(0.999, Math.max(-0.999, h + (value * Math.PI) / (2 * root)));
  }
  return h;
}

/** Principal (long) axis of a bubble from its second moments: the unit normal of its division line. */
export function longAxis(xx: number, xy: number, yy: number) {
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  return [Math.cos(angle), Math.sin(angle)] as const;
}

/**
 * One CPU frame: count, exchange gas, divide, sweep. Mirrors the GPU frame
 * except that the replica divides and buds with the same pairing rule but
 * keeps ids in plain arrays.
 */
export function stepReplica(world: FrameReplica, parameters: FoamParameters, seconds: number, request: Request = null) {
  const { lattice, bubbles } = world;
  const { width, height, ids } = lattice;
  countAreas(lattice, bubbles);
  const rate = parameters.diffusion * seconds;
  const loss = gasLoss(lattice, bubbles, wallPairs(lattice, bubbles), parameters.stiffness, rate);
  // Moments about the centroid.
  const sx = new Float64Array(MAX_IDS);
  const sy = new Float64Array(MAX_IDS);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const id = ids[y * width + x]!;
      sx[id] = sx[id]! + x + 0.5;
      sy[id] = sy[id]! + y + 0.5;
    }
  }
  const xx = new Float64Array(MAX_IDS);
  const xy = new Float64Array(MAX_IDS);
  const yy = new Float64Array(MAX_IDS);
  for (let id = 1; id < MAX_IDS; id += 1) {
    const area = bubbles.area[id]!;
    if (area === 0) {
      bubbles.gas[id] = 0;
      bubbles.target[id] = 0;
      continue;
    }
    bubbles.cx[id] = sx[id]! / area;
    bubbles.cy[id] = sy[id]! / area;
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const id = ids[y * width + x]!;
      const dx = x + 0.5 - bubbles.cx[id]!;
      const dy = y + 0.5 - bubbles.cy[id]!;
      xx[id] = xx[id]! + dx * dx;
      xy[id] = xy[id]! + dx * dy;
      yy[id] = yy[id]! + dy * dy;
    }
  }
  // Gas is renormalised by last frame's total (as the GPU reads it), so the
  // targets keep summing to COVERAGE of the lattice: the raft keeps its size.
  const renormalise = world.totalGas > 0 ? (COVERAGE * width * height) / world.totalGas : 1;
  for (let id = 1; id < MAX_IDS; id += 1) {
    if (bubbles.area[id] === 0) continue;
    bubbles.gas[id] = Math.max(0, bubbles.gas[id]! - loss[id]!) * renormalise;
  }
  const offset = rotationFor(world.frame);
  const owner = request ? ownerNear(lattice, request.x, request.y) : 0;
  const free = (id: number) => bubbles.area[id] === 0;
  const splits: { parent: number; child: number; nx: number; ny: number; cut: number; share: number }[] = [];
  let bud: { parent: number; child: number } | null = null;
  for (let id = 1; id < MAX_IDS; id += 1) {
    if (bubbles.area[id] === 0) continue;
    const child = partnerOf(id, offset);
    if (!free(child)) continue;
    if (request && id === owner && world.serial[id] !== request.serial) {
      bud = { parent: id, child };
      continue;
    }
    if (wantsSplit(bubbles.gas[id]!, bubbles.area[id]!, parameters.splitArea * splitFactor(id, birthKey(world.birth[id]!)))) {
      const [nx, ny] = longAxis(xx[id]!, xy[id]!, yy[id]!);
      const along = (nx * nx * xx[id]! + 2 * nx * ny * xy[id]! + ny * ny * yy[id]!) / bubbles.area[id]!;
      const share = childShare(id, world.frame);
      splits.push({ parent: id, child, nx, ny, cut: 2 * Math.sqrt(along) * chordOffset(share), share });
    }
  }
  const now = (world.frame + 1) / 60;
  for (const { parent, child, share } of splits) {
    bubbles.gas[child] = bubbles.gas[parent]! * share;
    bubbles.gas[parent] = bubbles.gas[parent]! * (1 - share);
    world.serial[child] = 0;
    world.birth[child] = now;
  }
  if (bud && request) {
    bubbles.gas[bud.child] = Math.PI * request.radius * request.radius;
    world.serial[bud.child] = request.serial;
    world.birth[bud.child] = now;
  }
  if (splits.length > 0 || bud) {
    const split = new Int32Array(MAX_IDS);
    const nxs = new Float64Array(MAX_IDS);
    const nys = new Float64Array(MAX_IDS);
    const cuts = new Float64Array(MAX_IDS);
    for (const entry of splits) {
      split[entry.parent] = entry.child;
      nxs[entry.parent] = entry.nx;
      nys[entry.parent] = entry.ny;
      cuts[entry.parent] = entry.cut;
    }
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const at = y * width + x;
        const id = ids[at]!;
        if (bud && request && Math.hypot(x + 0.5 - request.x, y + 0.5 - request.y) < request.radius) {
          ids[at] = bud.child;
          continue;
        }
        const child = split[id]!;
        if (child && (x + 0.5 - bubbles.cx[id]!) * nxs[id]! + (y + 0.5 - bubbles.cy[id]!) * nys[id]! > cuts[id]!) ids[at] = child;
      }
    }
    countAreas(lattice, bubbles);
  }
  for (let id = 1; id < MAX_IDS; id += 1) {
    const target = bubbles.gas[id]!;
    // Below VANISH_TARGET the bubble gives up its gas and dissolves (T2).
    if (target < VANISH_TARGET) bubbles.gas[id] = 0;
    bubbles.target[id] = target < VANISH_TARGET ? 0 : target;
  }
  let totalGas = 0;
  for (let id = 1; id < MAX_IDS; id += 1) totalGas += bubbles.gas[id]!;
  world.totalGas = totalGas;
  let flips = 0;
  for (let index = 0; index < parameters.sweeps; index += 1) {
    flips += sweepReplica(lattice, bubbles, parameters, world.sweep, now);
    world.sweep += 1;
  }
  world.frame += 1;
  return flips;
}

/** A replica world seeded like the route: gas = initial area. */
export function createReplica(width: number, height: number, count: number, random: () => number): FrameReplica {
  const lattice = seedFoam(width, height, count, random);
  const bubbles = createBubbles();
  countAreas(lattice, bubbles);
  for (let id = 1; id < MAX_IDS; id += 1) {
    bubbles.gas[id] = bubbles.area[id]!;
    bubbles.target[id] = bubbles.area[id]!;
  }
  let totalGas = 0;
  for (let id = 1; id < MAX_IDS; id += 1) totalGas += bubbles.gas[id]!;
  return { lattice, bubbles, serial: new Int32Array(MAX_IDS), birth: new Float64Array(MAX_IDS).fill(-100), frame: 0, sweep: 0, totalGas };
}

// ---------------------------------------------------------------- foam statistics

/** Live bubbles and, per bubble, its number of distinct neighbours (4-connected contacts). */
export function contactGraph(lattice: Lattice) {
  const neighbours = new Map<number, Set<number>>();
  const { width, height, ids } = lattice;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const id = ids[y * width + x]!;
      if (id === MEDIUM) continue;
      if (!neighbours.has(id)) neighbours.set(id, new Set());
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const other = idAt(lattice, x + dx, y + dy);
        if (other === MEDIUM || other === id) continue;
        neighbours.get(id)!.add(other);
        if (!neighbours.has(other)) neighbours.set(other, new Set());
        neighbours.get(other)!.add(id);
      }
    }
  }
  return neighbours;
}

/** Bubbles with a free face (touching air or the lattice edge): their side counts are not a dry foam's. */
export function edgeBubbles(lattice: Lattice) {
  const edge = new Set<number>();
  const { width, height, ids } = lattice;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const id = ids[y * width + x]!;
      if (id === MEDIUM) continue;
      if (idAt(lattice, x + 1, y) === MEDIUM || idAt(lattice, x - 1, y) === MEDIUM || idAt(lattice, x, y + 1) === MEDIUM || idAt(lattice, x, y - 1) === MEDIUM) edge.add(id);
    }
  }
  return edge;
}
