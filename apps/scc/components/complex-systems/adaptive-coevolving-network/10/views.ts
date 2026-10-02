// Browser-side views of the same model state. Each view maps every agent to a
// target point; the screen eases displayed points toward those targets, so
// switching views and state changes inside a view both read as motion.

import type { Body, Frame } from "./layout";
import type { CultureNetwork } from "./model";

export const VIEWS = [
  { id: "network", label: "네트워크" },
  { id: "culture", label: "문화" },
  { id: "similarity", label: "닮음" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export type ViewLabel = { text: string; x: number; y: number; align: CanvasTextAlign };

/** How visible standing ties are in each view. */
export const TIE_VISIBILITY: Record<ViewId, number> = {
  network: 1,
  culture: 0.8,
  similarity: 0.45,
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const EMBEDDING_ITERATIONS = 24;

/** A fixed, evenly spread spot in the unit disc for the `rank`-th of `count`. */
function home(rank: number, count: number) {
  if (count <= 1) return { x: 0, y: 0 };
  const radius = Math.sqrt((rank + 0.5) / count);
  const angle = rank * GOLDEN_ANGLE;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function fieldDisc(frame: Frame) {
  return {
    x: frame.width / 2,
    y: frame.height / 2,
    radius: Math.min(frame.width, frame.height) * 0.42,
  };
}

/** Features per agent, read from the state so this file needs only model types. */
function featureCount(network: CultureNetwork) {
  return network.cultures.length / Math.max(1, network.size);
}

/** Agents of each distinct culture, largest culture first; members by id. */
export function cultureGroups(network: CultureNetwork) {
  const features = featureCount(network);
  const byKey = new Map<number, number[]>();
  for (let agent = 0; agent < network.size; agent += 1) {
    let key = 0;
    for (let feature = 0; feature < features; feature += 1) key = key * 256 + network.cultures[agent * features + feature]!;
    const members = byKey.get(key);
    if (members) members.push(agent);
    else byKey.set(key, [agent]);
  }
  return [...byKey.entries()]
    .map(([key, members]) => ({ key, members }))
    .sort((first, second) => second.members.length - first.members.length || first.key - second.key);
}

export type Embedding = {
  /** Unit-scale x, y per agent; agents with one culture share one point. */
  readonly points: Float64Array;
  /** Previous principal axes, reused as the starting guess for continuity. */
  axes: Float64Array[];
};

export function createEmbedding(size: number): Embedding {
  const axes = [0, 1].map((axis) =>
    Float64Array.from({ length: size }, (_, index) => Math.sin((index + 1) * (axis === 0 ? 1.3 : 2.9))),
  );
  return { points: new Float64Array(size * 2), axes };
}

/**
 * Classical multidimensional scaling of the cultural distance 1 − overlap,
 * by power iteration warm-started from the last axes so the map does not flip.
 */
export function updateEmbedding(network: CultureNetwork, embedding: Embedding) {
  const count = network.size;
  const { cultures } = network;
  const features = featureCount(network);
  const matrix = new Float64Array(count * count);
  for (let first = 0; first < count; first += 1) {
    for (let second = first + 1; second < count; second += 1) {
      let shared = 0;
      for (let feature = 0; feature < features; feature += 1) {
        if (cultures[first * features + feature] === cultures[second * features + feature]) shared += 1;
      }
      const distance = 1 - shared / features;
      matrix[first * count + second] = distance * distance;
      matrix[second * count + first] = distance * distance;
    }
  }
  // Double centring: B = −½ J D² J.
  const rowMean = new Float64Array(count);
  let total = 0;
  for (let row = 0; row < count; row += 1) {
    let sum = 0;
    for (let column = 0; column < count; column += 1) sum += matrix[row * count + column]!;
    rowMean[row] = sum / count;
    total += sum;
  }
  const mean = total / (count * count);
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      const index = row * count + column;
      matrix[index] = -0.5 * (matrix[index]! - rowMean[row]! - rowMean[column]! + mean);
    }
  }

  const found: { vector: Float64Array; value: number }[] = [];
  for (const start of embedding.axes) {
    let vector = Float64Array.from(start);
    let value = 0;
    for (let iteration = 0; iteration < EMBEDDING_ITERATIONS; iteration += 1) {
      // Keep the second axis orthogonal to the first.
      for (const previous of found) {
        let dot = 0;
        for (let index = 0; index < count; index += 1) dot += vector[index]! * previous.vector[index]!;
        for (let index = 0; index < count; index += 1) vector[index]! -= dot * previous.vector[index]!;
      }
      const next = new Float64Array(count);
      for (let row = 0; row < count; row += 1) {
        let sum = 0;
        for (let column = 0; column < count; column += 1) sum += matrix[row * count + column]! * vector[column]!;
        next[row] = sum;
      }
      let norm = 0;
      for (let index = 0; index < count; index += 1) norm += next[index]! ** 2;
      norm = Math.sqrt(norm);
      if (norm < 1e-12) break;
      value = norm;
      for (let index = 0; index < count; index += 1) next[index]! /= norm;
      vector = next;
    }
    found.push({ vector, value });
  }

  embedding.axes = found.map((axis) => axis.vector);
  let extent = 1e-9;
  for (let agent = 0; agent < count; agent += 1) {
    for (let axis = 0; axis < 2; axis += 1) {
      const { vector, value } = found[axis]!;
      const coordinate = vector[agent]! * Math.sqrt(Math.max(0, value));
      embedding.points[agent * 2 + axis] = coordinate;
      extent = Math.max(extent, Math.abs(coordinate));
    }
  }
  for (let index = 0; index < count * 2; index += 1) embedding.points[index]! /= extent;
}

/** Writes each agent's target point for `view` into `out` as x, y pairs. */
export function viewTargets(
  view: ViewId,
  network: CultureNetwork,
  bodies: readonly Body[],
  frame: Frame,
  embedding: Embedding,
  out: Float64Array,
) {
  const count = network.size;
  if (view === "network") {
    for (let agent = 0; agent < count; agent += 1) {
      out[agent * 2] = bodies[agent]!.x;
      out[agent * 2 + 1] = bodies[agent]!.y;
    }
    return;
  }

  const disc = fieldDisc(frame);
  const groups = cultureGroups(network);

  if (view === "culture") {
    // Every distinct culture is a disc whose area follows its members; discs
    // spiral outward by cumulative size, so the largest culture sits centred.
    const placed: { x: number; y: number; spread: number }[] = [];
    let before = 0;
    let extent = 0;
    groups.forEach((group, rank) => {
      const size = group.members.length;
      const reach = rank === 0 ? 0 : Math.sqrt(before + size / 2) * 1.05;
      const spread = Math.sqrt(size) * 0.5;
      placed.push({ x: Math.cos(rank * GOLDEN_ANGLE) * reach, y: Math.sin(rank * GOLDEN_ANGLE) * reach, spread });
      extent = Math.max(extent, reach + spread);
      before += size;
    });
    // One unit is one agent's share of the disc, shrunk only if the spiral overflows.
    const scale = Math.min(disc.radius / Math.sqrt(count), disc.radius / Math.max(1e-9, extent));
    groups.forEach((group, rank) => {
      const { x, y, spread } = placed[rank]!;
      const size = group.members.length;
      group.members.forEach((agent, index) => {
        const spot = home(index, size);
        out[agent * 2] = disc.x + (x + spot.x * spread) * scale;
        out[agent * 2 + 1] = disc.y + (y + spot.y * spread) * scale;
      });
    });
    return;
  }

  // Similarity: the cultural map; members of one culture share a small disc.
  const scale = disc.radius / Math.sqrt(count);
  const largest = scale * Math.sqrt(groups[0]?.members.length ?? 1) * 0.45;
  const reach = Math.max(disc.radius * 0.5, disc.radius - largest);
  for (const group of groups) {
    const size = group.members.length;
    const spread = scale * Math.sqrt(size) * 0.45;
    group.members.forEach((agent, index) => {
      const offset = home(index, size);
      out[agent * 2] = disc.x + embedding.points[agent * 2]! * reach + offset.x * spread;
      out[agent * 2 + 1] = disc.y + embedding.points[agent * 2 + 1]! * reach + offset.y * spread;
    });
  }
}

export function viewLabels(view: ViewId, frame: Frame): ViewLabel[] {
  if (view === "similarity") {
    const disc = fieldDisc(frame);
    return [{ text: "가까울수록 문화가 닮음", x: disc.x, y: disc.y + disc.radius + 18, align: "center" }];
  }
  return [];
}
