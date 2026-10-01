import { institutions, impacts } from "./network.ts";
import { debtRanks } from "./debtrank.ts";

/**
 * One network, twelve placements. Institutions, links and weights never
 * change; panels mostly trade places on shared slots (one circle, two or
 * three rings, a grid), each ordering by a different quantity. Between ring
 * placements nodes slide past each other along the rings.
 */
export type Layout = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l";
export type Point = { x: number; y: number };

export const layoutIds: Layout[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
export const layoutNames: Record<Layout, string> = {
  a: "circle by number (DebtRank Fig. 3a)",
  b: "DebtRank radial (Fig. 3b)",
  c: "circle by DebtRank",
  d: "circle by size",
  e: "circle by impact on others",
  f: "circle by exposure to others",
  g: "core ring inside the periphery",
  h: "each core among its dependants",
  i: "circle by neighbourhood",
  j: "spring",
  k: "grid by DebtRank",
  l: "three rings by DebtRank",
};

export const CENTRE = { x: 200, y: 200 };
const OUTER = 166;
const INNER = 20;
/** DebtRank at panel b's innermost radius. */
export const RANK_SCALE = 0.55;

const ids = institutions.map(({ id }) => id);
export const ranks = debtRanks(institutions, impacts);
export const values = institutions.map(({ value }) => value);
const largest = Math.max(...values);
export const nodeRadius = institutions.map(({ value }) => 3.5 + 5.5 * Math.sqrt(value / largest));
export const reciprocal = new Set(impacts.filter(({ from, to }) => impacts.some((other) => other.from === to && other.to === from)).map(({ id }) => id));
const outgoing = ids.map((id) => impacts.filter((impact) => impact.from === id).reduce((sum, impact) => sum + impact.weight, 0));
const incoming = ids.map((id) => impacts.filter((impact) => impact.to === id).reduce((sum, impact) => sum + impact.weight, 0));
const core = ids.filter((id) => institutions[id].core);
const periphery = ids.filter((id) => !institutions[id].core);

export const radiusFor = (rank: number) => INNER + (OUTER - INNER) * (1 - Math.min(1, rank / RANK_SCALE));
export const guideRanks = [0, 0.1, 0.2, 0.3, 0.4, 0.5];

const polar = (angle: number, radius: number): Point => ({ x: CENTRE.x + radius * Math.cos(angle), y: CENTRE.y + radius * Math.sin(angle) });
const slotAngle = (slot: number, count: number, offset = 0) => -Math.PI / 2 + ((slot + offset) * 2 * Math.PI) / count;
const descending = (metric: readonly number[]) => [...ids].sort((a, b) => metric[b] - metric[a] || a - b);

/** Nodes in `order` take the ring's evenly spaced slots clockwise from the top. */
function ring(points: Point[], order: readonly number[], radius: number, offset = 0) {
  order.forEach((id, slot) => { points[id] = polar(slotAngle(slot, order.length, offset), radius); });
  return points;
}

/** Deterministic Fruchterman–Reingold on the undirected impact weights, fitted to the field. */
function spring(): Point[] {
  const count = ids.length;
  const strength = Array.from({ length: count }, () => Array<number>(count).fill(0));
  for (const { from, to, weight } of impacts) {
    strength[from][to] += weight;
    strength[to][from] += weight;
  }
  let points = ids.map((id) => polar(slotAngle(id, count), OUTER));
  const k = 90;
  for (let step = 0; step < 600; step++) {
    const temperature = 12 * (1 - step / 600) + 0.2;
    points = points.map((point, i) => {
      let dx = (CENTRE.x - point.x) * 0.08;
      let dy = (CENTRE.y - point.y) * 0.08;
      points.forEach((other, j) => {
        if (i === j) return;
        const ox = point.x - other.x;
        const oy = point.y - other.y;
        const distance = Math.max(1, Math.hypot(ox, oy));
        const force = (k * k) / distance - (strength[i][j] * distance * distance) / k;
        dx += (ox / distance) * force;
        dy += (oy / distance) * force;
      });
      const length = Math.max(1e-9, Math.hypot(dx, dy));
      const move = Math.min(length, temperature);
      return { x: point.x + (dx / length) * move, y: point.y + (dy / length) * move };
    });
  }
  return separate(fit(points, 44), 44);
}

function fit(points: Point[], margin: number): Point[] {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = (400 - 2 * margin) / Math.max(maxX - minX, maxY - minY);
  const offsetX = (400 - (maxX - minX) * scale) / 2;
  const offsetY = (400 - (maxY - minY) * scale) / 2;
  return points.map(({ x, y }) => ({ x: offsetX + (x - minX) * scale, y: offsetY + (y - minY) * scale }));
}

/** Push apart nodes whose rings would touch; the spring pulls the core tight. */
function separate(points: Point[], margin: number, gap = 8): Point[] {
  const result = points.map((point) => ({ ...point }));
  for (let pass = 0; pass < 80; pass++) {
    let moved = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx = result[j].x - result[i].x;
        const dy = result[j].y - result[i].y;
        const distance = Math.max(1e-6, Math.hypot(dx, dy));
        const needed = nodeRadius[i] + nodeRadius[j] + gap;
        if (distance >= needed) continue;
        const push = (needed - distance) / 2;
        result[i].x -= (dx / distance) * push;
        result[i].y -= (dy / distance) * push;
        result[j].x += (dx / distance) * push;
        result[j].y += (dy / distance) * push;
        moved = true;
      }
    }
    for (const point of result) {
      point.x = Math.min(400 - margin, Math.max(margin, point.x));
      point.y = Math.min(400 - margin, Math.max(margin, point.y));
    }
    if (!moved) break;
  }
  return result;
}

const springPoints = spring();

/** Each peripheral institution belongs to the core member it is most exposed to. */
function dependants() {
  const anchor = (id: number) => core.reduce((best, candidate) => {
    const weight = (from: number) => impacts.find((impact) => impact.from === from && impact.to === id)?.weight ?? 0;
    return weight(candidate) > weight(best) ? candidate : best;
  }, core[0]);
  const outer = [...periphery].sort((a, b) => core.indexOf(anchor(a)) - core.indexOf(anchor(b)) || a - b);
  const points = ring([], outer, OUTER);
  // Each core member sits on the inner ring at the mean angle of its dependants.
  for (const member of core) {
    const group = outer.filter((id) => anchor(id) === member);
    const angles = group.map((id) => Math.atan2(points[id].y - CENTRE.y, points[id].x - CENTRE.x));
    const angle = angles.length
      ? Math.atan2(angles.reduce((sum, value) => sum + Math.sin(value), 0), angles.reduce((sum, value) => sum + Math.cos(value), 0))
      : slotAngle(core.indexOf(member), core.length);
    points[member] = polar(angle, 62);
  }
  return separate(points, 20, 6);
}

function grid() {
  const columns = 5;
  const spacing = 66;
  const order = descending(ranks);
  const rows = Math.ceil(order.length / columns);
  return order.reduce<Point[]>((points, id, index) => {
    const row = Math.floor(index / columns);
    const inRow = Math.min(columns, order.length - row * columns);
    const column = index % columns;
    points[id] = {
      x: CENTRE.x + (column - (inRow - 1) / 2) * spacing,
      y: CENTRE.y + (row - (rows - 1) / 2) * spacing,
    };
    return points;
  }, []);
}

const byRank = descending(ranks);
const springAngle = springPoints.map(({ x, y }) => Math.atan2(y - CENTRE.y, x - CENTRE.x));

export const layouts: Record<Layout, Point[]> = {
  a: ring([], ids, OUTER),
  b: ids.map((id) => polar(slotAngle(id, ids.length), radiusFor(ranks[id]))),
  c: ring([], byRank, OUTER),
  d: ring([], descending(values), OUTER),
  e: ring([], descending(outgoing), OUTER),
  f: ring([], descending(incoming), OUTER),
  g: ring(ring([], periphery, OUTER), core, 62),
  h: dependants(),
  i: ring([], [...ids].sort((a, b) => springAngle[a] - springAngle[b]), OUTER),
  j: springPoints,
  k: grid(),
  l: ring(ring(ring([], byRank.slice(13), OUTER), byRank.slice(5, 13), 108, 0.5), byRank.slice(0, 5), 48),
};

const toPolar = ({ x, y }: Point) => ({ radius: Math.hypot(x - CENTRE.x, y - CENTRE.y), angle: Math.atan2(y - CENTRE.y, x - CENTRE.x) });

/** Placements built on rings around the centre; between two of these, nodes slide along the rings. */
const ringLayouts = new Set<Layout>(["a", "b", "c", "d", "e", "f", "g", "h", "i", "l"]);
export const slides = (from: Layout, to: Layout) => ringLayouts.has(from) && ringLayouts.has(to);

/**
 * Between ring placements: polar interpolation, radius linearly and angle the
 * short way round. Otherwise (spring, grid): straight lines.
 */
export function morph(from: readonly Point[], to: readonly Point[], t: number, polarPath = true): Point[] {
  if (!polarPath) return to.map((target, id) => ({ x: from[id].x + (target.x - from[id].x) * t, y: from[id].y + (target.y - from[id].y) * t }));
  return to.map((target, id) => {
    const a = toPolar(from[id]);
    const b = toPolar(target);
    // A node at the centre has no angle of its own; borrow the other end's.
    if (a.radius < 1e-6) a.angle = b.angle;
    if (b.radius < 1e-6) b.angle = a.angle;
    let turn = b.angle - a.angle;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    return polar(a.angle + turn * t, a.radius + (b.radius - a.radius) * t);
  });
}
