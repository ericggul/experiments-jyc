// Davidsen–Ebel–Bornholdt network: a fixed population that rewires itself.
// Nothing is added from outside. Each elementary update picks a person i:
// - with two or more acquaintances, i introduces two of them to each other
//   (a new tie closes the triangle unless they already know each other);
// - with fewer than two, i reaches out to one random stranger.
// Then, with probability `turnover`, one random person retires: every tie they
// held disappears and a newcomer with no ties takes their place.
//
// Source: Davidsen, Ebel & Bornholdt, "Emergence of a small world from local
// interactions", PRL 88, 128701 (2002). Positions are not part of this model.

export type SelfEvolvingNetwork = {
  /** People are indexed 0…size−1; arrivals are appended. */
  size: number;
  /** Acquaintances of each person, by person index. */
  readonly neighbours: Set<number>[];
  /** Update count at which each person (or their replacement) arrived. */
  readonly bornAt: number[];
  randomState: number;
  updates: number;
};

export type SelfEvolvingParameters = {
  /** Chance per elementary update that a random person is replaced. */
  turnover: number;
};

export type SelfEvolvingEvent =
  | { kind: "introduce"; broker: number; a: number; b: number }
  | { kind: "reach"; person: number; stranger: number }
  | { kind: "retire"; person: number; former: number[] };

export type SelfEvolvingMeasure = {
  ties: number;
  meanDegree: number;
  maxDegree: number;
  /** Mean local clustering over people with at least two acquaintances. */
  clustering: number;
  /** Clustering expected of a random graph with the same density. */
  randomClustering: number;
  largestComponent: number;
  isolated: number;
};

export const DEFAULT_PEOPLE = 500;
export const MAX_PEOPLE = 800;
export const MIN_TURNOVER = 0.02;
export const MAX_TURNOVER = 0.3;
export const DEFAULT_PARAMETERS: SelfEvolvingParameters = { turnover: 0.06 };

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(network: SelfEvolvingNetwork) {
  return () => {
    const [value, next] = nextRandom(network.randomState);
    network.randomState = next;
    return value;
  };
}

function randomIndex(value: number, length: number) {
  return Math.min(length - 1, Math.floor(value * length));
}

/** Starts with nobody acquainted: the structure is entirely self-made. */
export function createSelfEvolvingNetwork(
  size = DEFAULT_PEOPLE,
  seed = 0x3d0b5e17,
): SelfEvolvingNetwork {
  return {
    size,
    neighbours: Array.from({ length: size }, () => new Set<number>()),
    bornAt: new Array<number>(size).fill(0),
    randomState: seed >>> 0 || 1,
    updates: 0,
  };
}

function connect(network: SelfEvolvingNetwork, a: number, b: number) {
  if (a === b || network.neighbours[a]!.has(b)) return false;
  network.neighbours[a]!.add(b);
  network.neighbours[b]!.add(a);
  return true;
}

/** Removes every tie of `person` and puts a newcomer in their place. */
export function retirePerson(network: SelfEvolvingNetwork, person: number) {
  if (person < 0 || person >= network.size) return null;
  const former = [...network.neighbours[person]!];
  for (const neighbour of former) network.neighbours[neighbour]!.delete(person);
  network.neighbours[person]!.clear();
  network.bornAt[person] = network.updates;
  return { kind: "retire", person, former } as const;
}

/**
 * Appends a newcomer who already knows `acquaintance` (if given), so they enter
 * through someone rather than at random. Returns their index, or null at MAX_PEOPLE.
 */
export function addPerson(network: SelfEvolvingNetwork, acquaintance: number | null) {
  if (network.size >= MAX_PEOPLE) return null;
  const person = network.size;
  network.size += 1;
  network.neighbours.push(new Set());
  network.bornAt.push(network.updates);
  if (acquaintance !== null && acquaintance >= 0 && acquaintance < person) {
    connect(network, person, acquaintance);
  }
  return person;
}

export function stepSelfEvolvingNetwork(
  network: SelfEvolvingNetwork,
  count: number,
  parameters: SelfEvolvingParameters,
): SelfEvolvingEvent[] {
  const random = randomFor(network);
  const turnover = Math.min(1, Math.max(0, parameters.turnover));
  const events: SelfEvolvingEvent[] = [];

  for (let update = 0; update < count; update += 1) {
    network.updates += 1;
    const person = randomIndex(random(), network.size);
    const known = network.neighbours[person]!;

    if (known.size >= 2) {
      const list = [...known];
      const first = randomIndex(random(), list.length);
      const second = (first + 1 + randomIndex(random(), list.length - 1)) % list.length;
      const a = list[first]!;
      const b = list[second]!;
      if (connect(network, a, b)) events.push({ kind: "introduce", broker: person, a, b });
    } else {
      const stranger = randomIndex(random(), network.size);
      if (connect(network, person, stranger)) events.push({ kind: "reach", person, stranger });
    }

    if (random() < turnover) {
      events.push(retirePerson(network, randomIndex(random(), network.size))!);
    }
  }
  return events;
}

export function forEachTie(
  network: SelfEvolvingNetwork,
  visit: (a: number, b: number) => void,
) {
  network.neighbours.forEach((known, a) => {
    for (const b of known) if (a < b) visit(a, b);
  });
}

export function measureSelfEvolvingNetwork(network: SelfEvolvingNetwork): SelfEvolvingMeasure {
  let degreeSum = 0;
  let maxDegree = 0;
  let isolated = 0;
  let clusteringSum = 0;
  let clusteringCount = 0;
  for (const known of network.neighbours) {
    degreeSum += known.size;
    maxDegree = Math.max(maxDegree, known.size);
    if (known.size === 0) isolated += 1;
    if (known.size < 2) continue;
    const list = [...known];
    let closed = 0;
    for (let first = 0; first < list.length; first += 1) {
      for (let second = first + 1; second < list.length; second += 1) {
        if (network.neighbours[list[first]!]!.has(list[second]!)) closed += 1;
      }
    }
    clusteringSum += closed / ((list.length * (list.length - 1)) / 2);
    clusteringCount += 1;
  }

  const seen = new Uint8Array(network.size);
  let largest = 0;
  for (let start = 0; start < network.size; start += 1) {
    if (seen[start]) continue;
    let members = 0;
    const pending = [start];
    seen[start] = 1;
    while (pending.length > 0) {
      const current = pending.pop()!;
      members += 1;
      for (const neighbour of network.neighbours[current]!) {
        if (seen[neighbour]) continue;
        seen[neighbour] = 1;
        pending.push(neighbour);
      }
    }
    largest = Math.max(largest, members);
  }

  const meanDegree = degreeSum / Math.max(1, network.size);
  return {
    ties: degreeSum / 2,
    meanDegree,
    maxDegree,
    clustering: clusteringSum / Math.max(1, clusteringCount),
    randomClustering: meanDegree / Math.max(1, network.size - 1),
    largestComponent: largest / Math.max(1, network.size),
    isolated,
  };
}
