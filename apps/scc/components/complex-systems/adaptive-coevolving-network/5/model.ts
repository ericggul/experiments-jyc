// Structural balance on a complete signed network. Every pair of people is
// either friends (+1) or enemies (−1). A triangle is balanced when the product
// of its three signs is positive ("the friend of my friend is my friend, the
// enemy of my enemy is my friend") and unbalanced otherwise. Unbalanced
// triangles are the only places where a relationship changes, and each change
// rebalances one triangle while unbalancing or rebalancing every other
// triangle that shares the pair. Relations therefore rewrite the conditions
// for the next relation change until no unbalanced triangle is left.
//
// Each unbalanced triangle resolves at rate `pressure` (total capped at
// `maxRate`, which only slows the busiest moments down):
//   (+,+,−)  with probability `reconcile` the two enemies make up (Antal LTD);
//            otherwise the person in the middle takes a side: of their two
//            friendships, the one whose loss leaves fewer unbalanced
//            triangles in the whole network becomes enmity (CTD constraint);
//   (−,−,−)  the pair whose alliance leaves fewer unbalanced triangles
//            becomes friends.
// Independently, a random relationship flips at total rate `unrest`, which
// keeps testing a balanced state.
//
// Balance on a complete graph means at most two mutually hostile camps
// (Harary). With reconcile < ½ the network splits into two camps; above ½ it
// ends in universal friendship.
//
// Sources: Heider (1946); Antal, Krapivsky & Redner, "Dynamics of social
// balance on networks", PRE 72, 036121 (2005). Positions are not part of this
// model.

export type SignedNetwork = {
  size: number;
  /** Row length of `signs`; always MAX_PEOPLE. */
  readonly stride: number;
  /** Signs by `first * stride + second`, symmetric, 0 on the diagonal. */
  readonly signs: Int8Array;
  /** Number of unbalanced triangles, kept in step with `signs`. */
  unbalanced: number;
  randomState: number;
  time: number;
};

export type BalanceParameters = {
  /** Probability that a (+,+,−) triangle is fixed by the two enemies making up. */
  reconcile: number;
  /** Spontaneous relationship flips per unit time, over the whole network. */
  unrest: number;
  /** Resolution rate of each unbalanced triangle. */
  pressure: number;
  /** Ceiling on the total resolution rate. */
  maxRate: number;
};

export type BalanceEvent =
  | {
      kind: "resolve";
      triangle: readonly [number, number, number];
      a: number;
      b: number;
      sign: 1 | -1;
    }
  | { kind: "drift"; a: number; b: number; sign: 1 | -1 };

export type BalanceMeasure = {
  friendly: number;
  unbalanced: number;
  /** Share of all triangles that are unbalanced. */
  unbalancedShare: number;
  /** Size of the smaller camp; 0 means everyone is in one camp. */
  minority: number;
  balanced: boolean;
};

export const DEFAULT_PEOPLE = 30;
export const MAX_PEOPLE = 48;
export const RECONCILE_RANGE = [0, 1] as const;
export const UNREST_RANGE = [0, 1] as const;
export const DEFAULT_PARAMETERS: BalanceParameters = {
  reconcile: 0.3,
  unrest: 0.2,
  pressure: 0.1,
  maxRate: 40,
};
/** Guards a frame against a runaway burst; never reached at the tempo used. */
const MAX_EVENTS_PER_CALL = 600;

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(network: SignedNetwork) {
  return () => {
    const [value, next] = nextRandom(network.randomState);
    network.randomState = next;
    return value;
  };
}

function randomIndex(value: number, length: number) {
  return Math.min(length - 1, Math.floor(value * length));
}

export function relation(network: SignedNetwork, first: number, second: number) {
  return network.signs[first * MAX_PEOPLE + second]!;
}

function setRelation(network: SignedNetwork, first: number, second: number, sign: 1 | -1) {
  network.signs[first * MAX_PEOPLE + second] = sign;
  network.signs[second * MAX_PEOPLE + first] = sign;
}

/** Change in unbalanced triangles if the pair's sign were flipped. */
function flipCost(network: SignedNetwork, first: number, second: number) {
  const { signs, size } = network;
  const pair = signs[first * MAX_PEOPLE + second]!;
  let change = 0;
  for (let third = 0; third < size; third += 1) {
    if (third === first || third === second) continue;
    const product = pair * signs[first * MAX_PEOPLE + third]! * signs[second * MAX_PEOPLE + third]!;
    change += product > 0 ? 1 : -1;
  }
  return change;
}

function flip(network: SignedNetwork, first: number, second: number) {
  network.unbalanced += flipCost(network, first, second);
  const sign = -relation(network, first, second) as 1 | -1;
  setRelation(network, first, second, sign);
  return sign;
}

function countUnbalanced(network: SignedNetwork) {
  const { signs, size } = network;
  let count = 0;
  for (let first = 0; first < size; first += 1) {
    for (let second = first + 1; second < size; second += 1) {
      const pair = signs[first * MAX_PEOPLE + second]!;
      for (let third = second + 1; third < size; third += 1) {
        if (pair * signs[first * MAX_PEOPLE + third]! * signs[second * MAX_PEOPLE + third]! < 0) count += 1;
      }
    }
  }
  return count;
}

/** Every pair signed at random, friends with probability `friendly`. */
export function createSignedNetwork(
  size = DEFAULT_PEOPLE,
  seed = 0x5bd1e995,
  friendly = 0.5,
): SignedNetwork {
  const network: SignedNetwork = {
    size: Math.min(MAX_PEOPLE, Math.max(3, size)),
    stride: MAX_PEOPLE,
    signs: new Int8Array(MAX_PEOPLE * MAX_PEOPLE),
    unbalanced: 0,
    randomState: seed >>> 0 || 1,
    time: 0,
  };
  const random = randomFor(network);
  for (let first = 0; first < network.size; first += 1) {
    for (let second = first + 1; second < network.size; second += 1) {
      setRelation(network, first, second, random() < friendly ? 1 : -1);
    }
  }
  network.unbalanced = countUnbalanced(network);
  return network;
}

/** The `index`-th unbalanced triangle in lexicographic order. */
function unbalancedTriangle(network: SignedNetwork, index: number): [number, number, number] | null {
  const { signs, size } = network;
  let remaining = index;
  for (let first = 0; first < size; first += 1) {
    for (let second = first + 1; second < size; second += 1) {
      const pair = signs[first * MAX_PEOPLE + second]!;
      for (let third = second + 1; third < size; third += 1) {
        if (pair * signs[first * MAX_PEOPLE + third]! * signs[second * MAX_PEOPLE + third]! > 0) continue;
        if (remaining === 0) return [first, second, third];
        remaining -= 1;
      }
    }
  }
  return null;
}

/** Of the candidate pairs, one whose flip leaves the fewest unbalanced triangles. */
function leastCostly(
  network: SignedNetwork,
  candidates: readonly (readonly [number, number])[],
  random: () => number,
) {
  let best = Infinity;
  const ties: (readonly [number, number])[] = [];
  for (const candidate of candidates) {
    const cost = flipCost(network, candidate[0], candidate[1]);
    if (cost < best) {
      best = cost;
      ties.length = 0;
    }
    if (cost === best) ties.push(candidate);
  }
  return ties[randomIndex(random(), ties.length)]!;
}

function resolve(
  network: SignedNetwork,
  triangle: readonly [number, number, number],
  reconcile: number,
  random: () => number,
) {
  const [first, second, third] = triangle;
  const pairs = [
    [first, second],
    [first, third],
    [second, third],
  ] as const;
  const enemies = pairs.filter(([a, b]) => relation(network, a, b) < 0);
  const friends = pairs.filter(([a, b]) => relation(network, a, b) > 0);
  if (enemies.length === 3) return leastCostly(network, enemies, random);
  if (random() < reconcile) return enemies[0]!;
  return leastCostly(network, friends, random);
}

/** Advances by `duration` in continuous time; returns every change. */
export function stepSignedNetwork(
  network: SignedNetwork,
  duration: number,
  parameters: BalanceParameters,
): BalanceEvent[] {
  const random = randomFor(network);
  const events: BalanceEvent[] = [];
  const end = network.time + Math.max(0, duration);
  const unrest = Math.max(0, parameters.unrest);
  while (events.length < MAX_EVENTS_PER_CALL) {
    const balancing = Math.min(Math.max(0, parameters.pressure) * network.unbalanced, parameters.maxRate);
    const total = balancing + unrest;
    if (total <= 0) break;
    // Waiting times are memoryless, so a wait past the end is simply dropped.
    const wait = -Math.log(1 - random()) / total;
    if (network.time + wait > end) break;
    network.time += wait;

    if (random() * total < unrest || network.unbalanced === 0) {
      const a = randomIndex(random(), network.size);
      let b = randomIndex(random(), network.size - 1);
      if (b >= a) b += 1;
      events.push({ kind: "drift", a, b, sign: flip(network, a, b) });
      continue;
    }
    const triangle = unbalancedTriangle(network, randomIndex(random(), network.unbalanced));
    if (!triangle) break;
    const [a, b] = resolve(network, triangle, parameters.reconcile, random);
    events.push({ kind: "resolve", triangle, a, b, sign: flip(network, a, b) });
  }
  network.time = Math.max(network.time, end);
  return events;
}

/** Flips one relationship; returns the new sign, or null for an invalid pair. */
export function flipRelation(network: SignedNetwork, first: number, second: number) {
  if (first === second || first < 0 || second < 0) return null;
  if (first >= network.size || second >= network.size) return null;
  return flip(network, first, second);
}

/** Makes a person everyone's enemy; returns false if they already were. */
export function isolatePerson(network: SignedNetwork, person: number) {
  if (person < 0 || person >= network.size) return false;
  let changed = false;
  for (let other = 0; other < network.size; other += 1) {
    if (other === person || relation(network, person, other) < 0) continue;
    flip(network, person, other);
    changed = true;
  }
  return changed;
}

/** Appends a person who is everyone's friend. */
export function addPerson(network: SignedNetwork) {
  if (network.size >= MAX_PEOPLE) return null;
  const person = network.size;
  for (let other = 0; other < person; other += 1) setRelation(network, person, other, 1);
  network.size += 1;
  network.unbalanced = countUnbalanced(network);
  return person;
}

/**
 * Unbalanced triangles through each pair, divided by the triangles the pair
 * belongs to; written to `out` at `first * MAX_PEOPLE + second` for first < second.
 */
export function pairTension(network: SignedNetwork, out: Float32Array) {
  const { signs, size } = network;
  out.fill(0);
  if (network.unbalanced === 0) return;
  for (let first = 0; first < size; first += 1) {
    for (let second = first + 1; second < size; second += 1) {
      const pair = signs[first * MAX_PEOPLE + second]!;
      for (let third = second + 1; third < size; third += 1) {
        if (pair * signs[first * MAX_PEOPLE + third]! * signs[second * MAX_PEOPLE + third]! > 0) continue;
        out[first * MAX_PEOPLE + second]! += 1;
        out[first * MAX_PEOPLE + third]! += 1;
        out[second * MAX_PEOPLE + third]! += 1;
      }
    }
  }
  const scale = 1 / Math.max(1, size - 2);
  for (let index = 0; index < out.length; index += 1) out[index]! *= scale;
}

/**
 * Two camps from the leading eigenvector of the sign matrix (exact when the
 * network is balanced). With `previous`, the labels are chosen to agree with
 * it as much as possible, so a camp keeps its label while people move.
 */
export function factions(network: SignedNetwork, previous?: Int8Array): Int8Array {
  const { signs, size } = network;
  let vector = new Float64Array(size);
  for (let person = 0; person < size; person += 1) {
    vector[person] = (previous?.[person] || 1) + Math.sin(person * 1.618 + 0.5) * 0.1;
  }
  let next = new Float64Array(size);
  // Shifting by `size` keeps the matrix positive definite, so power iteration
  // finds the most positive eigenvalue.
  for (let iteration = 0; iteration < 40; iteration += 1) {
    let norm = 0;
    for (let first = 0; first < size; first += 1) {
      let sum = size * vector[first]!;
      for (let second = 0; second < size; second += 1) {
        sum += signs[first * MAX_PEOPLE + second]! * vector[second]!;
      }
      next[first] = sum;
      norm += sum * sum;
    }
    norm = Math.sqrt(norm) || 1;
    for (let person = 0; person < size; person += 1) next[person]! /= norm;
    [vector, next] = [next, vector];
  }
  // Snap to ±1 by sign, then put the larger camp on +1 unless `previous` says otherwise.
  const camps = new Int8Array(size);
  let positive = 0;
  for (let person = 0; person < size; person += 1) {
    camps[person] = vector[person]! >= 0 ? 1 : -1;
    if (camps[person] > 0) positive += 1;
  }
  let agreement = 0;
  if (previous) {
    for (let person = 0; person < size; person += 1) {
      if (person < previous.length && previous[person] !== 0) agreement += camps[person] === previous[person] ? 1 : -1;
    }
  }
  const swap = previous && agreement !== 0 ? agreement < 0 : positive < size - positive;
  if (swap) for (let person = 0; person < size; person += 1) camps[person] = -camps[person]! as 1 | -1;
  return camps;
}

export function measureBalance(network: SignedNetwork): BalanceMeasure {
  const { size } = network;
  let friends = 0;
  let pairs = 0;
  for (let first = 0; first < size; first += 1) {
    for (let second = first + 1; second < size; second += 1) {
      pairs += 1;
      if (relation(network, first, second) > 0) friends += 1;
    }
  }
  const camps = factions(network);
  let positive = 0;
  for (const camp of camps) if (camp > 0) positive += 1;
  const triangles = (size * (size - 1) * (size - 2)) / 6;
  return {
    friendly: friends / Math.max(1, pairs),
    unbalanced: network.unbalanced,
    unbalancedShare: network.unbalanced / Math.max(1, triangles),
    minority: Math.min(positive, size - positive),
    balanced: network.unbalanced === 0,
  };
}
