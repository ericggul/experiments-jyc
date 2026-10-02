// Jain–Krishna ecosystem: species catalyse one another's production, and the
// least-populated species is repeatedly replaced by a newcomer with random
// links. Populations follow the links (fast), and the links follow the
// populations (slow): who survives the next removal depends on the current
// catalytic graph, and the removal rewrites that graph.
//
// Fast dynamics. c_ij = 1 means species j catalyses species i (a link j → i).
// Relative populations x_i (Σx = 1) obey
//   ẋ_i = Σ_j c_ij x_j − x_i Σ_k Σ_j c_kj x_j
// and are set to the attractor of that equation before every graph update.
// With y = e^{Ct} y₀ and x = y / Σy, the attractor lives on the species that
// grow fastest: those downstream of the strongly connected components with the
// largest Perron eigenvalue λ₁ (if such components are chained, only the most
// downstream chain counts). With no cycle at all (λ₁ = 0), only the ends of the
// longest paths survive. Within that support x is the Perron vector.
//
// Slow dynamics, one graph update: the species with the least x (ties broken
// at random) is removed, and a new species takes its place with each possible
// link to and from every other species present with probability p = m / (s − 1).
//
// Sources: Jain & Krishna, PRL 81, 5684 (1998); PNAS 98, 543 (2001);
// PRE 65, 026103 (2002). Positions are not part of this model.

export type Role = "core" | "periphery" | "absent";

export type Ecosystem = {
  readonly size: number;
  /** links[i * size + j] = 1 when j catalyses i. */
  readonly links: Uint8Array;
  /** Species each one catalyses (j → i), and species catalysing it. */
  readonly out: number[][];
  readonly into: number[][];
  readonly population: Float64Array;
  readonly role: Role[];
  /** Stable identity of whoever occupies each slot; a newcomer gets a new id. */
  readonly identity: number[];
  nextIdentity: number;
  /** Perron eigenvalue of the whole graph. */
  lambda: number;
  randomState: number;
  updates: number;
};

export type Replacement = {
  kind: "replace";
  species: number;
  cause: "least" | "removed";
  /** The departing species's links, by the other end. */
  lostOut: number[];
  lostInto: number[];
  /** The newcomer's links, by the other end. */
  out: number[];
  into: number[];
  /** Species whose population became zero or nonzero with this update. */
  died: number[];
  revived: number[];
};

export type EcosystemMeasure = {
  /** s₁: species with nonzero population. */
  living: number;
  core: number;
  lambda: number;
  links: number;
};

export const DEFAULT_SPECIES = 60;
/** m = p(s − 1): mean number of links a newcomer makes in each direction. */
export const DEFAULT_LINKAGE = 0.5;
export const LINKAGE_RANGE = [0.15, 1.2] as const;
const RELATIVE_TIE = 1e-6;
const EIGEN_TOLERANCE = 1e-9;
const MAX_ITERATIONS = 6000;
/** Pure cache: a component's eigenvalue depends only on its links. */
const eigenvalueMemory = new Map<string, number>();

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(ecosystem: Ecosystem) {
  return () => {
    const [value, next] = nextRandom(ecosystem.randomState);
    ecosystem.randomState = next;
    return value;
  };
}

function randomIndex(value: number, length: number) {
  return Math.min(length - 1, Math.floor(value * length));
}

export function linkProbability(size: number, linkage: number) {
  return Math.min(1, Math.max(0, linkage) / Math.max(1, size - 1));
}

function setLink(ecosystem: Ecosystem, from: number, to: number) {
  const { size, links } = ecosystem;
  if (from === to || links[to * size + from]) return;
  links[to * size + from] = 1;
  ecosystem.out[from]!.push(to);
  ecosystem.into[to]!.push(from);
}

function dropFrom(list: number[], value: number) {
  const index = list.indexOf(value);
  if (index < 0) return;
  list[index] = list[list.length - 1]!;
  list.pop();
}

/** A random catalytic graph with link probability m / (s − 1), then its attractor. */
export function createEcosystem(
  size = DEFAULT_SPECIES,
  linkage = DEFAULT_LINKAGE,
  seed = 0x3c6ef372,
): Ecosystem {
  const ecosystem: Ecosystem = {
    size,
    links: new Uint8Array(size * size),
    out: Array.from({ length: size }, () => []),
    into: Array.from({ length: size }, () => []),
    population: new Float64Array(size).fill(1 / size),
    role: Array.from({ length: size }, () => "absent" as Role),
    identity: Array.from({ length: size }, (_, species) => species),
    nextIdentity: size,
    lambda: 0,
    // Scrambled so that small seeds do not start with small draws.
    randomState: (Math.imul(seed ^ 0x5bd1e995, 0x9e3779b1) ^ 0x27d4eb2f) >>> 0 || 1,
    updates: 0,
  };
  const random = randomFor(ecosystem);
  const p = linkProbability(size, linkage);
  for (let to = 0; to < size; to += 1) {
    for (let from = 0; from < size; from += 1) {
      if (from !== to && random() < p) setLink(ecosystem, from, to);
    }
  }
  settlePopulations(ecosystem);
  return ecosystem;
}

/** Tarjan's strongly connected components, emitted sinks first. */
function components(ecosystem: Ecosystem) {
  const { size, out } = ecosystem;
  const index = new Int32Array(size).fill(-1);
  const low = new Int32Array(size);
  const onStack = new Uint8Array(size);
  const stack: number[] = [];
  const member = new Int32Array(size);
  const groups: number[][] = [];
  let counter = 0;
  const visit = (node: number) => {
    index[node] = low[node] = counter;
    counter += 1;
    stack.push(node);
    onStack[node] = 1;
    for (const next of out[node]!) {
      if (index[next]! < 0) {
        visit(next);
        low[node] = Math.min(low[node]!, low[next]!);
      } else if (onStack[next]) {
        low[node] = Math.min(low[node]!, index[next]!);
      }
    }
    if (low[node] !== index[node]) return;
    const group: number[] = [];
    let popped: number;
    do {
      popped = stack.pop()!;
      onStack[popped] = 0;
      member[popped] = groups.length;
      group.push(popped);
    } while (popped !== node);
    groups.push(group);
  };
  for (let node = 0; node < size; node += 1) if (index[node]! < 0) visit(node);
  return { groups, member };
}

/**
 * Power iteration of (C + I) over `nodes`, using only links among them and
 * starting from `vector`, which it overwrites with the normalized Perron
 * vector. Returns λ from the Collatz–Wielandt bounds once they meet.
 */
function perron(ecosystem: Ecosystem, nodes: readonly number[], inside: Uint8Array, vector: Float64Array) {
  const sources = nodes.map((node) => ecosystem.into[node]!.filter((source) => inside[source]));
  const next = new Float64Array(nodes.length);
  const current = new Float64Array(nodes.length);
  let total = 0;
  nodes.forEach((node, index) => {
    current[index] = vector[node]!;
    total += vector[node]!;
  });
  for (let index = 0; index < nodes.length; index += 1) current[index] = current[index]! / total;
  const position = new Int32Array(ecosystem.size);
  nodes.forEach((node, index) => (position[node] = index));
  let estimate = 0;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let lower = Infinity;
    let upper = 0;
    total = 0;
    for (let index = 0; index < nodes.length; index += 1) {
      let value = current[index]!;
      for (const source of sources[index]!) value += current[position[source]!]!;
      next[index] = value;
      total += value;
      if (sources[index]!.length > 0) {
        const ratio = value / current[index]!;
        lower = Math.min(lower, ratio);
        upper = Math.max(upper, ratio);
      }
    }
    for (let index = 0; index < nodes.length; index += 1) current[index] = next[index]! / total;
    estimate = (upper + lower) / 2 - 1;
    if (upper - lower < EIGEN_TOLERANCE) break;
  }
  nodes.forEach((node, index) => (vector[node] = current[index]!));
  return estimate;
}

/**
 * Perron eigenvalue of one strongly connected component. Components rarely
 * change between updates, so eigenvalues are remembered by their exact links.
 */
function componentEigenvalue(ecosystem: Ecosystem, group: readonly number[], member: Int32Array, id: number) {
  if (group.length < 2) return 0;
  const internal: number[] = [];
  for (const node of group) {
    for (const next of ecosystem.out[node]!) if (member[next] === id) internal.push(node * ecosystem.size + next);
  }
  // Every node of a component has an internal in-link, so this is a simple cycle.
  if (internal.length === group.length) return 1;
  const key = internal.sort((a, b) => a - b).join(",");
  const known = eigenvalueMemory.get(key);
  if (known !== undefined) return known;
  const inside = new Uint8Array(ecosystem.size);
  for (const node of group) inside[node] = 1;
  const value = perron(ecosystem, group, inside, new Float64Array(ecosystem.size).fill(1));
  if (eigenvalueMemory.size > 256) eigenvalueMemory.clear();
  eigenvalueMemory.set(key, value);
  return value;
}

/**
 * Sets x to the attractor of the population equation, starting from the
 * current x, and labels each species core, periphery or absent.
 */
function settlePopulations(ecosystem: Ecosystem) {
  const { size, into, population, role } = ecosystem;
  const { groups, member } = components(ecosystem);
  const eigenvalues = groups.map((group, id) => componentEigenvalue(ecosystem, group, member, id));
  const lambda = Math.max(...eigenvalues);
  ecosystem.lambda = lambda;
  const dominant = eigenvalues.map((value) => value >= lambda - 1e-6);

  // Depth = most dominant components on any path ending here. Tarjan emits
  // sinks first, so walking the groups backwards visits sources first.
  const depth = new Int32Array(groups.length);
  for (let id = groups.length - 1; id >= 0; id -= 1) {
    let upstream = 0;
    for (const node of groups[id]!) {
      for (const source of into[node]!) {
        const from = member[source]!;
        if (from !== id) upstream = Math.max(upstream, depth[from]!);
      }
    }
    depth[id] = upstream + (dominant[id] ? 1 : 0);
  }
  let deepest = 0;
  for (const value of depth) deepest = Math.max(deepest, value);
  const supported = new Uint8Array(size);
  for (let node = 0; node < size; node += 1) if (depth[member[node]!] === deepest) supported[node] = 1;

  let values = new Float64Array(size);
  if (lambda > 0) {
    // Power iteration on C + I restricted to the support, warm-started.
    const nodes: number[] = [];
    for (let node = 0; node < size; node += 1) {
      if (!supported[node]) continue;
      nodes.push(node);
      values[node] = population[node]! + 1e-3;
    }
    perron(ecosystem, nodes, supported, values);
  } else {
    // No cycle: y(t) ∝ t^L C^L 1, so weight the ends of the longest paths by
    // how many longest paths reach them.
    values.fill(1);
    for (let step = 1; step < deepest; step += 1) {
      const next = new Float64Array(size);
      for (let node = 0; node < size; node += 1) {
        for (const source of into[node]!) next[node] = next[node]! + values[source]!;
      }
      values = next;
    }
    let total = 0;
    for (let node = 0; node < size; node += 1) {
      if (!supported[node]) values[node] = 0;
      total += values[node]!;
    }
    for (let node = 0; node < size; node += 1) values[node] = values[node]! / total;
  }

  for (let node = 0; node < size; node += 1) {
    population[node] = supported[node] ? values[node]! : 0;
    role[node] = !supported[node]
      ? "absent"
      : lambda > 0 && dominant[member[node]!]
        ? "core"
        : "periphery";
  }
}

function replace(ecosystem: Ecosystem, species: number, linkage: number, cause: Replacement["cause"]): Replacement {
  const random = randomFor(ecosystem);
  const { size, links } = ecosystem;
  const before = ecosystem.population.slice();
  const lostOut = [...ecosystem.out[species]!];
  const lostInto = [...ecosystem.into[species]!];
  for (const to of lostOut) {
    links[to * size + species] = 0;
    dropFrom(ecosystem.into[to]!, species);
  }
  for (const from of lostInto) {
    links[species * size + from] = 0;
    dropFrom(ecosystem.out[from]!, species);
  }
  ecosystem.out[species] = [];
  ecosystem.into[species] = [];
  ecosystem.identity[species] = ecosystem.nextIdentity;
  ecosystem.nextIdentity += 1;
  ecosystem.population[species] = 0;

  const p = linkProbability(size, linkage);
  for (let other = 0; other < size; other += 1) {
    if (other === species) continue;
    if (random() < p) setLink(ecosystem, species, other);
    if (random() < p) setLink(ecosystem, other, species);
  }
  settlePopulations(ecosystem);
  ecosystem.updates += 1;

  const died: number[] = [];
  const revived: number[] = [];
  for (let node = 0; node < size; node += 1) {
    if (node === species) continue;
    const was = before[node]! > 0;
    const is = ecosystem.population[node]! > 0;
    if (was && !is) died.push(node);
    else if (!was && is) revived.push(node);
  }
  return {
    kind: "replace",
    species,
    cause,
    lostOut,
    lostInto,
    out: [...ecosystem.out[species]!],
    into: [...ecosystem.into[species]!],
    died,
    revived,
  };
}

/** The least-populated species; ties are broken at random. */
export function leastFit(ecosystem: Ecosystem) {
  const random = randomFor(ecosystem);
  let least = Infinity;
  for (const value of ecosystem.population) least = Math.min(least, value);
  const threshold = least * (1 + RELATIVE_TIE);
  const candidates: number[] = [];
  ecosystem.population.forEach((value, species) => {
    if (value <= threshold) candidates.push(species);
  });
  return candidates[randomIndex(random(), candidates.length)]!;
}

/** One slow step: the least-fit species is replaced by a random newcomer. */
export function updateEcosystem(ecosystem: Ecosystem, linkage = DEFAULT_LINKAGE) {
  return replace(ecosystem, leastFit(ecosystem), linkage, "least");
}

/** The participant's extinction: this species is replaced instead of the least fit. */
export function removeSpecies(ecosystem: Ecosystem, species: number, linkage = DEFAULT_LINKAGE) {
  if (species < 0 || species >= ecosystem.size) return null;
  return replace(ecosystem, species, linkage, "removed");
}

export function hasLink(ecosystem: Ecosystem, from: number, to: number) {
  return ecosystem.links[to * ecosystem.size + from] === 1;
}

export function measureEcosystem(ecosystem: Ecosystem): EcosystemMeasure {
  let living = 0;
  let core = 0;
  let links = 0;
  for (let species = 0; species < ecosystem.size; species += 1) {
    if (ecosystem.population[species]! > 0) living += 1;
    if (ecosystem.role[species] === "core") core += 1;
    links += ecosystem.out[species]!.length;
  }
  return { living, core, lambda: ecosystem.lambda, links };
}

/** An independent copy, for trying an intervention without touching the original. */
export function cloneEcosystem(ecosystem: Ecosystem): Ecosystem {
  return {
    ...ecosystem,
    links: ecosystem.links.slice(),
    out: ecosystem.out.map((list) => [...list]),
    into: ecosystem.into.map((list) => [...list]),
    population: ecosystem.population.slice(),
    role: [...ecosystem.role],
    identity: [...ecosystem.identity],
  };
}
