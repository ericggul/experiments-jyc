// Axelrod culture on a coevolving network. Each agent holds a culture of F
// features, each one of q traits. Similar agents become more similar, and
// agents with nothing in common stop talking to each other. Culture decides
// which ties survive; the surviving ties decide who can still influence whom.
//
// One elementary update picks an agent i and one of its ties to j. With
// overlap o = (features i and j share) / F:
//   o = 1      the tie is inert (nothing left to copy);
//   0 < o < 1  with probability o, i copies one of the features where it
//              differs from j (Axelrod's homophilous influence);
//   o = 0      i drops the tie and links to a random agent it does not
//              already know (homophilous rewiring, threshold 0).
// Cultural drift: with probability `drift` per update, a random agent sets one
// random feature to a random trait.
//
// Sources: Axelrod, J. Conflict Resolut. 41, 203 (1997); Centola, González-
// Avella, Eguíluz & San Miguel, J. Conflict Resolut. 51, 905 (2007); Vazquez,
// González-Avella, Eguíluz & San Miguel, PRE 76, 046120 (2007). Positions are
// not part of this model.

export const FEATURES = 3;

export type CultureTie = { readonly id: number; a: number; b: number };

export type CultureNetwork = {
  readonly size: number;
  /** Agent i's trait for feature f is cultures[i * FEATURES + f]. */
  readonly cultures: Uint8Array;
  readonly ties: CultureTie[];
  readonly incident: number[][];
  readonly pairs: Set<number>;
  /** Number of traits per feature; every stored trait is below it. */
  traits: number;
  randomState: number;
  /** Fractional elementary updates carried between steps. */
  pending: number;
  time: number;
};

export type CultureParameters = {
  /** Probability per elementary update of one random trait mutation. */
  drift: number;
};

export type CultureEvent =
  | { kind: "copy"; agent: number; source: number; feature: number; trait: number }
  | { kind: "rewire"; agent: number; from: number; to: number; tie: number }
  | { kind: "drift"; agent: number; feature: number; trait: number };

export type CultureMeasure = {
  /** Distinct cultures held by at least one agent. */
  cultures: number;
  /** Share of agents holding the most common culture. */
  largestCulture: number;
  components: number;
  /** Share of agents in the largest connected component. */
  largestComponent: number;
  /** Share of ties with partial overlap: the only ties that can still copy. */
  activeTies: number;
  /** Share of ties with no overlap: the only ties that can still rewire. */
  strangerTies: number;
};

export const DEFAULT_AGENTS = 120;
export const DEFAULT_MEAN_DEGREE = 6;
export const TRAITS_RANGE = [2, 40] as const;
export const DEFAULT_TRAITS = 20;
export const DRIFT_RANGE = [0, 0.02] as const;
export const DEFAULT_PARAMETERS: CultureParameters = { drift: 0.0005 };
/** Elementary updates per agent per model time unit. */
export const UPDATES_PER_AGENT = 1;
const PAIR_STRIDE = 1 << 16;

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(network: CultureNetwork) {
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

function addTie(network: CultureNetwork, a: number, b: number) {
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

function removeIncident(network: CultureNetwork, agent: number, tie: number) {
  const list = network.incident[agent]!;
  const index = list.indexOf(tie);
  if (index < 0) return;
  list[index] = list[list.length - 1]!;
  list.pop();
}

export function otherEnd(tie: CultureTie, agent: number) {
  return tie.a === agent ? tie.b : tie.a;
}

/** Number of features two agents share, 0…FEATURES. */
export function sharedFeatures(network: CultureNetwork, first: number, second: number) {
  const { cultures } = network;
  let shared = 0;
  for (let feature = 0; feature < FEATURES; feature += 1) {
    if (cultures[first * FEATURES + feature] === cultures[second * FEATURES + feature]) shared += 1;
  }
  return shared;
}

/** Gives every agent an independent uniform culture over `traits` traits; ties are kept. */
export function redrawCultures(network: CultureNetwork, traits: number) {
  const random = randomFor(network);
  network.traits = Math.max(TRAITS_RANGE[0], Math.min(TRAITS_RANGE[1], Math.round(traits)));
  for (let index = 0; index < network.cultures.length; index += 1) {
    network.cultures[index] = randomIndex(random(), network.traits);
  }
}

/** A random graph with every agent tied at least once, and random cultures. */
export function createCultureNetwork(
  size = DEFAULT_AGENTS,
  traits = DEFAULT_TRAITS,
  seed = 0x3c6ef372,
  meanDegree = DEFAULT_MEAN_DEGREE,
): CultureNetwork {
  const network: CultureNetwork = {
    size,
    cultures: new Uint8Array(size * FEATURES),
    ties: [],
    incident: Array.from({ length: size }, () => []),
    pairs: new Set(),
    traits,
    randomState: seed >>> 0 || 1,
    pending: 0,
    time: 0,
  };
  const random = randomFor(network);
  for (let agent = 0; agent < size; agent += 1) {
    while (!addTie(network, agent, randomIndex(random(), size)));
  }
  const tieCount = Math.round((size * meanDegree) / 2);
  while (network.ties.length < tieCount) {
    addTie(network, randomIndex(random(), size), randomIndex(random(), size));
  }
  redrawCultures(network, traits);
  return network;
}

function update(network: CultureNetwork, parameters: CultureParameters, random: () => number, events: CultureEvent[]) {
  const { size, cultures } = network;
  if (random() < parameters.drift) {
    const agent = randomIndex(random(), size);
    const feature = randomIndex(random(), FEATURES);
    const trait = randomIndex(random(), network.traits);
    if (cultures[agent * FEATURES + feature] !== trait) {
      cultures[agent * FEATURES + feature] = trait;
      events.push({ kind: "drift", agent, feature, trait });
    }
  }

  const agent = randomIndex(random(), size);
  const incident = network.incident[agent]!;
  if (incident.length === 0) return;
  const tie = network.ties[incident[randomIndex(random(), incident.length)]!]!;
  const neighbour = otherEnd(tie, agent);
  const shared = sharedFeatures(network, agent, neighbour);
  if (shared === FEATURES) return;

  if (shared === 0) {
    // Nothing in common: the tie leaves the neighbour for a random stranger.
    let stranger = -1;
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const candidate = randomIndex(random(), size);
      if (candidate !== agent && !network.pairs.has(pairKey(agent, candidate))) {
        stranger = candidate;
        break;
      }
    }
    if (stranger < 0) return;
    network.pairs.delete(pairKey(agent, neighbour));
    removeIncident(network, neighbour, tie.id);
    tie.a = agent;
    tie.b = stranger;
    network.pairs.add(pairKey(agent, stranger));
    network.incident[stranger]!.push(tie.id);
    events.push({ kind: "rewire", agent, from: neighbour, to: stranger, tie: tie.id });
    return;
  }

  if (random() >= shared / FEATURES) return;
  // Copy one feature, chosen uniformly among those that differ.
  let pick = randomIndex(random(), FEATURES - shared);
  for (let feature = 0; feature < FEATURES; feature += 1) {
    if (cultures[agent * FEATURES + feature] === cultures[neighbour * FEATURES + feature]) continue;
    if (pick > 0) {
      pick -= 1;
      continue;
    }
    const trait = cultures[neighbour * FEATURES + feature]!;
    cultures[agent * FEATURES + feature] = trait;
    events.push({ kind: "copy", agent, source: neighbour, feature, trait });
    return;
  }
}

/** Advances by `duration` model time units (UPDATES_PER_AGENT × size updates each). */
export function stepCultureNetwork(
  network: CultureNetwork,
  duration: number,
  parameters: CultureParameters,
): CultureEvent[] {
  const random = randomFor(network);
  const events: CultureEvent[] = [];
  network.pending += Math.max(0, duration) * network.size * UPDATES_PER_AGENT;
  network.time += Math.max(0, duration);
  while (network.pending >= 1) {
    network.pending -= 1;
    update(network, parameters, random, events);
  }
  return events;
}

/** Replaces one agent's culture with a random one: a stranger arrives. */
export function randomizeCulture(network: CultureNetwork, agent: number) {
  if (agent < 0 || agent >= network.size) return false;
  const random = randomFor(network);
  for (let feature = 0; feature < FEATURES; feature += 1) {
    network.cultures[agent * FEATURES + feature] = randomIndex(random(), network.traits);
  }
  return true;
}

/** Gives `agent` the whole culture of `source`; returns false if nothing changed. */
export function impose(network: CultureNetwork, source: number, agent: number) {
  if (source === agent || agent < 0 || agent >= network.size || source < 0 || source >= network.size) {
    return false;
  }
  if (sharedFeatures(network, source, agent) === FEATURES) return false;
  for (let feature = 0; feature < FEATURES; feature += 1) {
    network.cultures[agent * FEATURES + feature] = network.cultures[source * FEATURES + feature]!;
  }
  return true;
}

/** A single number per distinct culture, for grouping. */
export function cultureKey(network: CultureNetwork, agent: number) {
  let key = 0;
  for (let feature = 0; feature < FEATURES; feature += 1) {
    key = key * 256 + network.cultures[agent * FEATURES + feature]!;
  }
  return key;
}

/** Connected component index for each agent, largest component first. */
export function components(network: CultureNetwork) {
  const label = new Int32Array(network.size).fill(-1);
  const sizes: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < network.size; start += 1) {
    if (label[start] !== -1) continue;
    const id = sizes.length;
    let count = 0;
    label[start] = id;
    stack.push(start);
    while (stack.length > 0) {
      const agent = stack.pop()!;
      count += 1;
      for (const tieId of network.incident[agent]!) {
        const other = otherEnd(network.ties[tieId]!, agent);
        if (label[other] === -1) {
          label[other] = id;
          stack.push(other);
        }
      }
    }
    sizes.push(count);
  }
  return { label, sizes };
}

export function measureCulture(network: CultureNetwork): CultureMeasure {
  const counts = new Map<number, number>();
  for (let agent = 0; agent < network.size; agent += 1) {
    const key = cultureKey(network, agent);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let active = 0;
  let strangers = 0;
  for (const tie of network.ties) {
    const shared = sharedFeatures(network, tie.a, tie.b);
    if (shared === 0) strangers += 1;
    else if (shared < FEATURES) active += 1;
  }
  const { sizes } = components(network);
  const ties = Math.max(1, network.ties.length);
  return {
    cultures: counts.size,
    largestCulture: Math.max(...counts.values()) / Math.max(1, network.size),
    components: sizes.length,
    largestComponent: Math.max(...sizes) / Math.max(1, network.size),
    activeTies: active / ties,
    strangerTies: strangers / ties,
  };
}
