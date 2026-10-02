// Bounded confidence on an adaptive network: each person holds an opinion
// x ∈ [0, 1] and listens only to neighbours whose opinion lies within a
// tolerance ε of their own. Ties that fall outside that tolerance are where the
// network changes: they may be cut and moved to someone else. Opinions decide
// which ties survive, and the surviving ties decide who can still pull whom.
//
// Each tie is activated at rate `activation`; one of its two ends, i, is chosen
// at random and j is the other end. With d = x_j − x_i:
//   |d| < ε  → compromise (Deffuant):  x_i ← x_i + μd,  x_j ← x_j − μd;
//   |d| ≥ ε  → with probability w, i cuts the tie and ties to a random
//              person it does not already know (Kozma–Barrat); else nothing.
// Each person also resets to a uniformly random opinion at rate `noise`, so the
// system never freezes (noisy bounded confidence, Pineda, Toral &
// Hernández-García 2009). Stubborn people (extremists, or someone the
// participant holds) keep their opinion but still pull and still cut ties.
//
// Sources: Deffuant, Neau, Amblard & Weisbuch, Adv. Complex Syst. 3, 87 (2000);
// Kozma & Barrat, PRE 77, 016102 (2008). Positions are not part of this model.

export type OpinionTie = { readonly id: number; a: number; b: number };

export type OpinionNetwork = {
  size: number;
  readonly opinions: number[];
  readonly stubborn: boolean[];
  readonly ties: OpinionTie[];
  readonly incident: number[][];
  readonly pairs: Set<number>;
  randomState: number;
  /** Fractional tie activations carried to the next step. */
  pending: number;
  time: number;
};

export type OpinionParameters = {
  /** ε: largest opinion distance at which two people still compromise. */
  tolerance: number;
  /** w: chance that an intolerable tie is cut and moved when activated. */
  rewiring: number;
  /** μ: share of the distance each side moves in a compromise. */
  convergence: number;
  /** Activations per tie per model time unit. */
  activation: number;
  /** Rate per person of resetting to a uniformly random opinion. */
  noise: number;
};

export type OpinionEvent =
  | { kind: "cut"; person: number; from: number; to: number; tie: number }
  | { kind: "jump"; person: number; from: number; to: number };

export type OpinionMeasure = {
  /** Opinion clusters holding at least `MAJOR_SHARE` of people. */
  clusters: number;
  /** Share of people in the most popular cluster. */
  largestCluster: number;
  components: number;
  /** Share of people in the largest connected piece of the network. */
  largestComponent: number;
  /** Share of ties whose two ends are beyond tolerance of each other. */
  intolerantTies: number;
};

export const DEFAULT_PEOPLE = 240;
export const MAX_PEOPLE = 480;
export const DEFAULT_MEAN_DEGREE = 6;
export const TOLERANCE_RANGE = [0.05, 0.5] as const;
export const REWIRING_RANGE = [0, 1] as const;
export const DEFAULT_PARAMETERS: OpinionParameters = {
  tolerance: 0.15,
  rewiring: 0.3,
  convergence: 0.3,
  activation: 1,
  noise: 0.0005,
};
/** Gap in opinion that separates two clusters. */
const CLUSTER_GAP = 0.04;
/** Clusters smaller than this share of people are not counted. */
const MAJOR_SHARE = 0.04;
const PAIR_STRIDE = 1 << 16;
const MAX_STEP = 0.05;
const STRANGER_TRIES = 12;

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(network: OpinionNetwork) {
  return () => {
    const [value, next] = nextRandom(network.randomState);
    network.randomState = next;
    return value;
  };
}

function randomIndex(value: number, length: number) {
  return Math.min(length - 1, Math.floor(value * length));
}

function pairKey(first: number, second: number) {
  return first < second ? first * PAIR_STRIDE + second : second * PAIR_STRIDE + first;
}

function chance(rate: number, delta: number) {
  return 1 - Math.exp(-Math.max(0, rate) * delta);
}

function clampOpinion(value: number) {
  return Math.min(1, Math.max(0, value));
}

function addTie(network: OpinionNetwork, a: number, b: number) {
  if (a === b) return false;
  const key = pairKey(a, b);
  if (network.pairs.has(key)) return false;
  const id = network.ties.length;
  network.pairs.add(key);
  network.ties.push({ id, a, b });
  network.incident[a]!.push(id);
  network.incident[b]!.push(id);
  return true;
}

function removeIncident(network: OpinionNetwork, person: number, tie: number) {
  const list = network.incident[person]!;
  const index = list.indexOf(tie);
  if (index < 0) return;
  list[index] = list[list.length - 1]!;
  list.pop();
}

/** A random graph with every person tied at least once and uniform opinions. */
export function createOpinionNetwork(
  size = DEFAULT_PEOPLE,
  meanDegree = DEFAULT_MEAN_DEGREE,
  seed = 0x5bd1e995,
): OpinionNetwork {
  const network: OpinionNetwork = {
    size,
    opinions: [],
    stubborn: Array.from({ length: size }, () => false),
    ties: [],
    incident: Array.from({ length: size }, () => []),
    pairs: new Set(),
    randomState: seed >>> 0 || 1,
    pending: 0,
    time: 0,
  };
  const random = randomFor(network);
  for (let person = 0; person < size; person += 1) network.opinions.push(random());
  for (let person = 0; person < size; person += 1) {
    while (!addTie(network, person, randomIndex(random(), size)));
  }
  const tieCount = Math.round((size * meanDegree) / 2);
  while (network.ties.length < tieCount) {
    addTie(network, randomIndex(random(), size), randomIndex(random(), size));
  }
  return network;
}

export function otherEnd(tie: OpinionTie, person: number) {
  return tie.a === person ? tie.b : tie.a;
}

function stranger(network: OpinionNetwork, person: number, random: () => number) {
  for (let attempt = 0; attempt < STRANGER_TRIES; attempt += 1) {
    const other = randomIndex(random(), network.size);
    if (other !== person && !network.pairs.has(pairKey(person, other))) return other;
  }
  return null;
}

/** Advances by `duration` in steps of at most MAX_STEP; returns cuts and jumps. */
export function stepOpinionNetwork(
  network: OpinionNetwork,
  duration: number,
  parameters: OpinionParameters,
): OpinionEvent[] {
  const random = randomFor(network);
  const events: OpinionEvent[] = [];
  const { opinions, stubborn, ties } = network;
  let remaining = Math.max(0, duration);
  while (remaining > 1e-9) {
    const delta = Math.min(MAX_STEP, remaining);
    remaining -= delta;
    network.time += delta;
    network.pending += ties.length * Math.max(0, parameters.activation) * delta;

    while (network.pending >= 1) {
      network.pending -= 1;
      const tie = ties[randomIndex(random(), ties.length)]!;
      const person = random() < 0.5 ? tie.a : tie.b;
      const other = otherEnd(tie, person);
      const difference = opinions[other]! - opinions[person]!;
      if (Math.abs(difference) < parameters.tolerance) {
        if (!stubborn[person]) opinions[person] = opinions[person]! + parameters.convergence * difference;
        if (!stubborn[other]) opinions[other] = opinions[other]! - parameters.convergence * difference;
        continue;
      }
      if (random() >= parameters.rewiring) continue;
      const to = stranger(network, person, random);
      if (to === null) continue;
      network.pairs.delete(pairKey(person, other));
      removeIncident(network, other, tie.id);
      tie.a = person;
      tie.b = to;
      network.pairs.add(pairKey(person, to));
      network.incident[to]!.push(tie.id);
      events.push({ kind: "cut", person, from: other, to, tie: tie.id });
    }

    const jumpChance = chance(parameters.noise, delta);
    for (let person = 0; person < network.size; person += 1) {
      if (stubborn[person] || random() >= jumpChance) continue;
      const from = opinions[person]!;
      opinions[person] = random();
      events.push({ kind: "jump", person, from, to: opinions[person]! });
    }
  }
  return events;
}

/** Imposes an opinion; returns false for an unknown person. */
export function setOpinion(network: OpinionNetwork, person: number, opinion: number) {
  if (person < 0 || person >= network.size) return false;
  network.opinions[person] = clampOpinion(opinion);
  return true;
}

/** Stubborn people keep their opinion but still influence and still rewire. */
export function setStubborn(network: OpinionNetwork, person: number, value: boolean) {
  if (person < 0 || person >= network.size) return false;
  network.stubborn[person] = value;
  return true;
}

/** Appends a stubborn person at `opinion`, tied to the given acquaintances. */
export function addExtremist(
  network: OpinionNetwork,
  opinion: number,
  acquaintances: Iterable<number>,
) {
  if (network.size >= MAX_PEOPLE) return null;
  const person = network.size;
  network.size += 1;
  network.opinions.push(clampOpinion(opinion));
  network.stubborn.push(true);
  network.incident.push([]);
  for (const other of acquaintances) {
    if (other >= 0 && other < person) addTie(network, person, other);
  }
  return person;
}

/** Connected pieces of the network as a label per person. */
export function componentLabels(network: OpinionNetwork) {
  const labels = new Int32Array(network.size).fill(-1);
  const stack: number[] = [];
  let count = 0;
  for (let start = 0; start < network.size; start += 1) {
    if (labels[start] !== -1) continue;
    labels[start] = count;
    stack.push(start);
    while (stack.length > 0) {
      const person = stack.pop()!;
      for (const tieId of network.incident[person]!) {
        const other = otherEnd(network.ties[tieId]!, person);
        if (labels[other] !== -1) continue;
        labels[other] = count;
        stack.push(other);
      }
    }
    count += 1;
  }
  return { labels, count };
}

/** Sizes of opinion clusters, split wherever sorted opinions leave a gap. */
export function opinionClusters(opinions: readonly number[]) {
  const sorted = [...opinions].sort((a, b) => a - b);
  const sizes: number[] = [];
  let run = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    if (index > 0 && sorted[index]! - sorted[index - 1]! > CLUSTER_GAP) {
      sizes.push(run);
      run = 0;
    }
    run += 1;
  }
  if (run > 0) sizes.push(run);
  return sizes;
}

export function measureOpinions(
  network: OpinionNetwork,
  tolerance = DEFAULT_PARAMETERS.tolerance,
): OpinionMeasure {
  const count = Math.max(1, network.size);
  const major = opinionClusters(network.opinions.slice(0, network.size))
    .filter((size) => size >= MAJOR_SHARE * count);
  const { labels, count: components } = componentLabels(network);
  const componentSizes = new Array<number>(components).fill(0);
  for (const label of labels) componentSizes[label]! += 1;
  let intolerant = 0;
  for (const tie of network.ties) {
    if (Math.abs(network.opinions[tie.a]! - network.opinions[tie.b]!) >= tolerance) intolerant += 1;
  }
  return {
    clusters: major.length,
    largestCluster: Math.max(0, ...major) / count,
    components,
    largestComponent: Math.max(0, ...componentSizes) / count,
    intolerantTies: intolerant / Math.max(1, network.ties.length),
  };
}
