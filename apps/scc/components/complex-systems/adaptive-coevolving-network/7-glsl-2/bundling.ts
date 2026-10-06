// Force-directed edge bundling (Holten & van Wijk, Computer Graphics Forum
// 28(3), 2009), run incrementally: every link keeps SUBDIVISIONS inner points
// as displacements from its straight chord, so they follow its pages as the
// layout moves. Each frame relaxes them once: a spring keeps each link
// smooth, a weak restoring force pulls it back toward its chord, and each
// point is attracted to the matching point of the links it is compatible with
// (similar direction, length and position). Compatible links therefore comb
// together into bundles, as in BarabásiLab's "150 years of Nature"; a newly
// discovered link starts straight and combs in over a few seconds; a dropped
// one is forgotten. Partners are recomputed periodically from a grid of link
// midpoints, a share of links per frame, so the cost stays near linear in
// the number of links.

export const SUBDIVISIONS = 14;
/** Points per link including both ends. */
export const POINTS = SUBDIVISIONS + 2;
/** Partners each link is attracted to, and the least compatibility that counts. */
const MAX_PARTNERS = 10;
const MIN_COMPATIBILITY = 0.55;
/** Smoothing spring along a link, per second (overdamped). */
const SPRING = 18;
/** Pull back toward the chord, per second. */
const RESTORE = 0.35;
/** Peak attraction speed toward a partner, px/s, reached at distance SIGMA px. */
const ATTRACT = 150;
const SIGMA = 36;
/** A point never strays further than this share of its link's chord. */
const MAX_BEND = 0.32;

export type BundledLink = {
  readonly key: number;
  readonly from: number;
  readonly to: number;
  /** x, y displacement of each inner point. */
  readonly offsets: Float64Array;
  /** Strongest compatible links; a partner that has since been dropped is skipped. */
  readonly partners: BundledLink[];
  readonly strength: Float64Array;
  /** 1 where a partner runs the other way, so point i matches its point POINTS − 1 − i. */
  readonly flipped: Uint8Array;
  partnerCount: number;
  /** How strongly this link attracts its partners (its presence, 0–1). */
  presence: number;
  /** Frame on which this link was last reported. */
  seen: number;
  /** Index in `Bundler.list`, which is its row in the GPU point texture. */
  row: number;
};

export type Bundler = {
  readonly links: Map<number, BundledLink>;
  /** Live links in a stable order (index = row in the GPU point texture). */
  list: BundledLink[];
  frame: number;
  /** Next link whose partners are recomputed. */
  cursor: number;
};

const KEY_STRIDE = 1 << 16;

export function linkKey(from: number, to: number) {
  return from * KEY_STRIDE + to;
}

export function createBundler(): Bundler {
  return { links: new Map(), list: [], frame: 0, cursor: -1 };
}

/** Starts a frame: links not reported with `report` before `prune` are dropped. */
export function beginFrame(bundler: Bundler) {
  bundler.frame += 1;
}

/** Reports a live link and its presence; returns its state. */
export function report(bundler: Bundler, from: number, to: number, presence: number) {
  const key = linkKey(from, to);
  let link = bundler.links.get(key);
  if (!link) {
    link = {
      key,
      from,
      to,
      offsets: new Float64Array(SUBDIVISIONS * 2),
      partners: [],
      strength: new Float64Array(MAX_PARTNERS),
      flipped: new Uint8Array(MAX_PARTNERS),
      partnerCount: 0,
      presence,
      seen: bundler.frame,
      row: -1,
    };
    // A new link has no partners until the next periodic partner pass.
    bundler.links.set(key, link);
  }
  link.presence = presence;
  link.seen = bundler.frame;
  return link;
}

/** Drops links not reported this frame and refreshes the stable list. */
export function prune(bundler: Bundler) {
  let changed = false;
  for (const [key, link] of bundler.links) {
    if (link.seen !== bundler.frame) {
      bundler.links.delete(key);
      changed = true;
    }
  }
  if (changed || bundler.list.length !== bundler.links.size) {
    bundler.list = Array.from(bundler.links.values());
    bundler.list.forEach((link, index) => {
      link.row = index;
    });
  }
}

const c0 = { x: 0, y: 0 };
const c1 = { x: 0, y: 0 };
const c2 = { x: 0, y: 0 };
const c3 = { x: 0, y: 0 };

/**
 * The point at u ∈ [0, 1] on the uniform Catmull–Rom curve through a link's
 * bundled points, as the fibre shader draws it.
 */
export function curvePoint(link: BundledLink, points: ArrayLike<number>, u: number, out: { x: number; y: number }) {
  const s = Math.min(Math.max(u, 0), 1) * (POINTS - 1);
  const i = Math.min(Math.floor(s), POINTS - 2);
  const t = s - i;
  linkPoint(link, points, i, c1);
  linkPoint(link, points, i + 1, c2);
  if (i > 0) linkPoint(link, points, i - 1, c0);
  else {
    c0.x = 2 * c1.x - c2.x;
    c0.y = 2 * c1.y - c2.y;
  }
  if (i + 2 < POINTS) linkPoint(link, points, i + 2, c3);
  else {
    c3.x = 2 * c2.x - c1.x;
    c3.y = 2 * c2.y - c1.y;
  }
  const t2 = t * t;
  const t3 = t2 * t;
  out.x = 0.5 * (2 * c1.x + (c2.x - c0.x) * t + (2 * c0.x - 5 * c1.x + 4 * c2.x - c3.x) * t2 + (3 * (c1.x - c2.x) + c3.x - c0.x) * t3);
  out.y = 0.5 * (2 * c1.y + (c2.y - c0.y) * t + (2 * c0.y - 5 * c1.y + 4 * c2.y - c3.y) * t2 + (3 * (c1.y - c2.y) + c3.y - c0.y) * t3);
  return out;
}

/** Writes the absolute position of point `index` (0 … POINTS − 1) of `link` into `out`. */
export function linkPoint(link: BundledLink, points: ArrayLike<number>, index: number, out: { x: number; y: number }) {
  const ax = points[link.from * 2]!;
  const ay = points[link.from * 2 + 1]!;
  const bx = points[link.to * 2]!;
  const by = points[link.to * 2 + 1]!;
  const t = index / (POINTS - 1);
  out.x = ax + (bx - ax) * t;
  out.y = ay + (by - ay) * t;
  if (index > 0 && index < POINTS - 1) {
    out.x += link.offsets[(index - 1) * 2]!;
    out.y += link.offsets[(index - 1) * 2 + 1]!;
  }
  return out;
}

/** Holten & van Wijk's angle, scale and position compatibility of two segments. */
function compatibility(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
) {
  const px = bx - ax;
  const py = by - ay;
  const qx = dx - cx;
  const qy = dy - cy;
  const lp = Math.hypot(px, py);
  const lq = Math.hypot(qx, qy);
  if (lp < 1e-6 || lq < 1e-6) return { value: 0, flipped: false };
  const cosine = (px * qx + py * qy) / (lp * lq);
  const angle = Math.abs(cosine);
  const average = (lp + lq) / 2;
  const scale = 2 / (average / Math.min(lp, lq) + Math.max(lp, lq) / average);
  const midpoint = Math.hypot((ax + bx - cx - dx) / 2, (ay + by - cy - dy) / 2);
  const position = average / (average + midpoint);
  return { value: angle * scale * position, flipped: cosine < 0 };
}

/** Links whose partners are recomputed per frame: a share of all, at least a few. */
const PARTNER_SHARE = 1 / 15;
/** Candidates examined per link at most, so a crowded grid cell stays cheap. */
const MAX_CANDIDATES = 160;

/**
 * Recomputes the strongest partners of the next share of links (round
 * robin), from a grid of link midpoints built once per pass.
 */
export function updatePartners(bundler: Bundler, points: ArrayLike<number>, share = PARTNER_SHARE) {
  const list = bundler.list;
  if (list.length === 0) return;
  let total = 0;
  const mids = new Float64Array(list.length * 2);
  list.forEach((link, index) => {
    const ax = points[link.from * 2]!;
    const ay = points[link.from * 2 + 1]!;
    const bx = points[link.to * 2]!;
    const by = points[link.to * 2 + 1]!;
    mids[index * 2] = (ax + bx) / 2;
    mids[index * 2 + 1] = (ay + by) / 2;
    total += Math.hypot(bx - ax, by - ay);
  });
  const cell = Math.max(16, (total / list.length) * 0.6);
  const grid = new Map<number, number[]>();
  const cellKey = (x: number, y: number) => (x + 4_096) * 8_192 + (y + 4_096);
  list.forEach((_, index) => {
    const key = cellKey(Math.floor(mids[index * 2]! / cell), Math.floor(mids[index * 2 + 1]! / cell));
    const bucket = grid.get(key);
    if (bucket) bucket.push(index);
    else grid.set(key, [index]);
  });
  const best: { index: number; value: number; flipped: boolean }[] = [];
  const count = Math.min(list.length, Math.max(8, Math.ceil(list.length * share)));
  const start = Math.max(0, bundler.cursor) % list.length;
  for (let done = 0; done < count; done += 1) {
    const index = (start + done) % list.length;
    const link = list[index]!;
    best.length = 0;
    const gx = Math.floor(mids[index * 2]! / cell);
    const gy = Math.floor(mids[index * 2 + 1]! / cell);
    const ax = points[link.from * 2]!;
    const ay = points[link.from * 2 + 1]!;
    const bx = points[link.to * 2]!;
    const by = points[link.to * 2 + 1]!;
    let examined = 0;
    for (let ox = -1; ox <= 1 && examined < MAX_CANDIDATES; ox += 1) {
      for (let oy = -1; oy <= 1 && examined < MAX_CANDIDATES; oy += 1) {
        const bucket = grid.get(cellKey(gx + ox, gy + oy));
        if (!bucket) continue;
        // A crowded cell is sampled with a stride that starts at this link.
        const stride = Math.max(1, Math.floor(bucket.length / (MAX_CANDIDATES / 9)));
        for (let slot = index % stride; slot < bucket.length && examined < MAX_CANDIDATES; slot += stride) {
          const other = bucket[slot]!;
          if (other === index) continue;
          examined += 1;
          const partner = list[other]!;
          const result = compatibility(
            ax, ay, bx, by,
            points[partner.from * 2]!, points[partner.from * 2 + 1]!, points[partner.to * 2]!, points[partner.to * 2 + 1]!,
          );
          if (result.value < MIN_COMPATIBILITY) continue;
          best.push({ index: other, value: result.value, flipped: result.flipped });
        }
      }
    }
    best.sort((first, second) => second.value - first.value);
    link.partnerCount = Math.min(MAX_PARTNERS, best.length);
    for (let slot = 0; slot < link.partnerCount; slot += 1) {
      link.partners[slot] = list[best[slot]!.index]!;
      link.strength[slot] = best[slot]!.value;
      link.flipped[slot] = best[slot]!.flipped ? 1 : 0;
    }
  }
  bundler.cursor = (start + count) % list.length;
}

let positions = new Float64Array(0);
let moves = new Float64Array(0);

/** One relaxation step of `seconds`; a share of links refreshes its partners every frame. */
export function relaxBundles(bundler: Bundler, points: ArrayLike<number>, seconds: number) {
  const list = bundler.list;
  if (list.length === 0) return;
  // On the first frame every link finds its partners at once.
  updatePartners(bundler, points, bundler.frame <= 1 || bundler.cursor < 0 ? 1 : PARTNER_SHARE);
  if (seconds <= 0) return;
  const step = Math.min(seconds, 1 / 30);
  // Absolute positions of every point, so the force loop only reads arrays.
  const size = list.length * POINTS * 2;
  if (positions.length < size) {
    positions = new Float64Array(size * 2);
    moves = new Float64Array(size * 2);
  }
  const point = { x: 0, y: 0 };
  list.forEach((link, index) => {
    for (let at = 0; at < POINTS; at += 1) {
      linkPoint(link, points, at, point);
      positions[(index * POINTS + at) * 2] = point.x;
      positions[(index * POINTS + at) * 2 + 1] = point.y;
    }
  });
  list.forEach((link, index) => {
    const base = index * POINTS;
    for (let inner = 1; inner < POINTS - 1; inner += 1) {
      const here = (base + inner) * 2;
      const x = positions[here]!;
      const y = positions[here + 1]!;
      let fx = SPRING * (positions[here - 2]! + positions[here + 2]! - 2 * x);
      let fy = SPRING * (positions[here - 1]! + positions[here + 3]! - 2 * y);
      fx -= RESTORE * link.offsets[(inner - 1) * 2]!;
      fy -= RESTORE * link.offsets[(inner - 1) * 2 + 1]!;
      for (let slot = 0; slot < link.partnerCount; slot += 1) {
        const partner = link.partners[slot]!;
        if (partner.seen !== bundler.frame) continue;
        const there = (partner.row * POINTS + (link.flipped[slot] ? POINTS - 1 - inner : inner)) * 2;
        const vx = positions[there]! - x;
        const vy = positions[there + 1]! - y;
        const scale = (ATTRACT * link.strength[slot]! * partner.presence) / ((vx * vx + vy * vy) / SIGMA + SIGMA);
        fx += vx * scale;
        fy += vy * scale;
      }
      moves[here] = fx * step;
      moves[here + 1] = fy * step;
    }
  });
  list.forEach((link, index) => {
    const ax = points[link.from * 2]!;
    const ay = points[link.from * 2 + 1]!;
    const bx = points[link.to * 2]!;
    const by = points[link.to * 2 + 1]!;
    const limit = Math.hypot(bx - ax, by - ay) * MAX_BEND;
    for (let inner = 1; inner < POINTS - 1; inner += 1) {
      const here = (index * POINTS + inner) * 2;
      let x = link.offsets[(inner - 1) * 2]! + moves[here]!;
      let y = link.offsets[(inner - 1) * 2 + 1]! + moves[here + 1]!;
      const length = Math.hypot(x, y);
      if (length > limit) {
        x *= limit / length;
        y *= limit / length;
      }
      link.offsets[(inner - 1) * 2] = x;
      link.offsets[(inner - 1) * 2 + 1] = y;
    }
  });
}
