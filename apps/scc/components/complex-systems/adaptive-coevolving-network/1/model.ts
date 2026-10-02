// Coevolving voter network: a fixed population whose opinions and ties change
// each other. Each elementary update picks a voter i and one of its ties to j.
// If i and j disagree, i either severs that tie and reattaches it to a random
// like-minded voter (probability φ, "rewire"), or adopts j's opinion
// (probability 1 − φ, "adopt"). Concordant ties are inert. A small drift rate
// keeps the system from freezing once every component agrees internally.
//
// Basis: Holme & Newman (2006), Vazquez, Eguíluz & San Miguel (2008),
// Durrett et al. (2012, rewire-to-same). Positions are not part of this model.

export const OPINION_COUNT = 6;

export type CoevolvingTie = {
  readonly id: number;
  a: number;
  b: number;
};

export type CoevolvingNetwork = {
  readonly size: number;
  readonly opinions: number[];
  readonly ties: CoevolvingTie[];
  /** Tie ids incident to each voter. */
  readonly incident: number[][];
  readonly pairs: Set<number>;
  randomState: number;
  updates: number;
};

export type CoevolutionParameters = {
  /** φ: chance that a disagreement is resolved by rewiring rather than adopting. */
  rewiring: number;
  /** Chance per elementary update that the chosen voter takes a random opinion. */
  drift: number;
};

export type CoevolutionEvent =
  | { kind: "rewire"; voter: number; from: number; to: number; tie: number }
  | { kind: "adopt"; voter: number; source: number; opinion: number }
  | { kind: "drift"; voter: number; opinion: number };

export type CoevolutionMeasure = {
  /** Share of ties joining voters who disagree (active links). */
  discordant: number;
  components: number;
  /** Share of voters in the largest connected component. */
  largestComponent: number;
  /** Opinions still held by at least one voter. */
  livingOpinions: number;
};

export const DEFAULT_VOTERS = 240;
export const DEFAULT_MEAN_DEGREE = 4;
export const DEFAULT_PARAMETERS: CoevolutionParameters = {
  rewiring: 0.5,
  drift: 0.0015,
};

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(network: CoevolvingNetwork) {
  return () => {
    const [value, next] = nextRandom(network.randomState);
    network.randomState = next;
    return value;
  };
}

function randomIndex(value: number, length: number) {
  return Math.min(length - 1, Math.floor(value * length));
}

function pairKey(network: CoevolvingNetwork, first: number, second: number) {
  return first < second
    ? first * network.size + second
    : second * network.size + first;
}

function removeIncident(network: CoevolvingNetwork, voter: number, tie: number) {
  const list = network.incident[voter]!;
  const index = list.indexOf(tie);
  if (index < 0) return;
  list[index] = list[list.length - 1]!;
  list.pop();
}

export function createCoevolvingNetwork(
  size = DEFAULT_VOTERS,
  meanDegree = DEFAULT_MEAN_DEGREE,
  seed = 0x51c0e7a3,
): CoevolvingNetwork {
  const network: CoevolvingNetwork = {
    size,
    opinions: [],
    ties: [],
    incident: Array.from({ length: size }, () => []),
    pairs: new Set(),
    randomState: seed >>> 0 || 1,
    updates: 0,
  };
  const random = randomFor(network);
  for (let voter = 0; voter < size; voter += 1) {
    network.opinions.push(randomIndex(random(), OPINION_COUNT));
  }
  const addTie = (a: number, b: number) => {
    if (a === b) return false;
    const key = pairKey(network, a, b);
    if (network.pairs.has(key)) return false;
    const id = network.ties.length;
    network.pairs.add(key);
    network.ties.push({ id, a, b });
    network.incident[a]!.push(id);
    network.incident[b]!.push(id);
    return true;
  };
  // Every voter starts with at least one tie; the rest are uniform random pairs.
  for (let voter = 0; voter < size; voter += 1) {
    while (!addTie(voter, randomIndex(random(), size)));
  }
  const tieCount = Math.round((size * meanDegree) / 2);
  while (network.ties.length < tieCount) {
    addTie(randomIndex(random(), size), randomIndex(random(), size));
  }
  return network;
}

export function otherEnd(tie: CoevolvingTie, voter: number) {
  return tie.a === voter ? tie.b : tie.a;
}

function likeMindedTarget(
  network: CoevolvingNetwork,
  voter: number,
  random: () => number,
) {
  const opinion = network.opinions[voter];
  const candidates: number[] = [];
  for (let candidate = 0; candidate < network.size; candidate += 1) {
    if (candidate === voter || network.opinions[candidate] !== opinion) continue;
    if (network.pairs.has(pairKey(network, voter, candidate))) continue;
    candidates.push(candidate);
  }
  if (candidates.length === 0) return null;
  return candidates[randomIndex(random(), candidates.length)]!;
}

/** Runs `count` elementary asynchronous updates in place and reports each change. */
export function stepCoevolvingNetwork(
  network: CoevolvingNetwork,
  count: number,
  parameters: CoevolutionParameters,
): CoevolutionEvent[] {
  const random = randomFor(network);
  const rewiring = Math.min(1, Math.max(0, parameters.rewiring));
  const drift = Math.min(1, Math.max(0, parameters.drift));
  const events: CoevolutionEvent[] = [];

  for (let update = 0; update < count; update += 1) {
    network.updates += 1;
    const voter = randomIndex(random(), network.size);

    if (random() < drift) {
      const shift = 1 + randomIndex(random(), OPINION_COUNT - 1);
      const opinion = (network.opinions[voter]! + shift) % OPINION_COUNT;
      network.opinions[voter] = opinion;
      events.push({ kind: "drift", voter, opinion });
      continue;
    }

    const incident = network.incident[voter]!;
    if (incident.length === 0) continue;
    const tie = network.ties[incident[randomIndex(random(), incident.length)]!]!;
    const neighbour = otherEnd(tie, voter);
    if (network.opinions[neighbour] === network.opinions[voter]) continue;

    if (random() < rewiring) {
      const target = likeMindedTarget(network, voter, random);
      if (target === null) continue;
      network.pairs.delete(pairKey(network, voter, neighbour));
      removeIncident(network, neighbour, tie.id);
      tie.a = voter;
      tie.b = target;
      network.pairs.add(pairKey(network, voter, target));
      network.incident[target]!.push(tie.id);
      events.push({ kind: "rewire", voter, from: neighbour, to: target, tie: tie.id });
    } else {
      const opinion = network.opinions[neighbour]!;
      network.opinions[voter] = opinion;
      events.push({ kind: "adopt", voter, source: neighbour, opinion });
    }
  }
  return events;
}

/** The opinion held by the fewest voters; extinct opinions come first. */
export function rarestOpinion(network: CoevolvingNetwork) {
  const counts = new Array<number>(OPINION_COUNT).fill(0);
  for (const opinion of network.opinions) counts[opinion]! += 1;
  let rarest = 0;
  for (let opinion = 1; opinion < OPINION_COUNT; opinion += 1) {
    if (counts[opinion]! < counts[rarest]!) rarest = opinion;
  }
  return rarest;
}

/** Imposes an opinion on the given voters; returns the voters that changed. */
export function plantOpinion(
  network: CoevolvingNetwork,
  voters: Iterable<number>,
  opinion: number,
) {
  const changed: number[] = [];
  const value = ((Math.round(opinion) % OPINION_COUNT) + OPINION_COUNT) % OPINION_COUNT;
  for (const voter of voters) {
    if (voter < 0 || voter >= network.size) continue;
    if (network.opinions[voter] === value) continue;
    network.opinions[voter] = value;
    changed.push(voter);
  }
  return changed;
}

export function measureCoevolution(network: CoevolvingNetwork): CoevolutionMeasure {
  let discordant = 0;
  for (const tie of network.ties) {
    if (network.opinions[tie.a] !== network.opinions[tie.b]) discordant += 1;
  }
  const seen = new Uint8Array(network.size);
  let components = 0;
  let largest = 0;
  for (let start = 0; start < network.size; start += 1) {
    if (seen[start]) continue;
    components += 1;
    let members = 0;
    const pending = [start];
    seen[start] = 1;
    while (pending.length > 0) {
      const voter = pending.pop()!;
      members += 1;
      for (const tieId of network.incident[voter]!) {
        const neighbour = otherEnd(network.ties[tieId]!, voter);
        if (seen[neighbour]) continue;
        seen[neighbour] = 1;
        pending.push(neighbour);
      }
    }
    largest = Math.max(largest, members);
  }
  return {
    discordant: discordant / Math.max(1, network.ties.length),
    components,
    largestComponent: largest / Math.max(1, network.size),
    livingOpinions: new Set(network.opinions).size,
  };
}
