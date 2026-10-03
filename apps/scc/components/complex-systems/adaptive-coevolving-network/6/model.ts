// Awareness and infection on two layers of the same people. On the virtual
// layer (who talks to whom) news of the disease spreads and is forgotten; on
// the physical layer (who meets whom) the disease spreads and is recovered
// from. Being infected makes a person aware, and aware people are both harder
// to infect and — this route's adaptive extension — cut physical ties to
// infected contacts. So awareness reshapes the physical layer, the reshaped
// layer decides how the disease travels, and the disease produces awareness.
//
// In continuous time, with Δ the step:
//   per virtual tie A–U   at rate λ        U becomes aware;
//   per aware person      at rate δ        forgets (not while infected);
//   per physical tie S–I  at rate β        S is infected, if S is unaware;
//                         at rate γβ       S is infected, if S is aware;
//                         at rate w        an aware S drops the tie and links
//                                          to a random susceptible stranger;
//   per infected person   at rate μ        recovers, still aware.
// Newly infected people become aware at once, so there are three states:
// unaware susceptible, aware susceptible, aware infected.
//
// Source: Granell, Gómez & Arenas, "Dynamical interplay between awareness and
// epidemic spreading in multiplex networks", PRL 111, 128701 (2013) (UAU–SIS).
// Rewiring rule after Gross, D'Lima & Blasius, PRL 96, 208701 (2006), here
// triggered by awareness. The virtual layer itself is fixed. Positions are not
// part of this model.

export type Layer = "physical" | "virtual";

export type Tie = { readonly id: number; a: number; b: number };

export type Multiplex = {
  readonly size: number;
  readonly aware: boolean[];
  readonly infected: boolean[];
  /** Ties along which people meet; avoidance rewires these. */
  readonly physical: Tie[];
  readonly physicalIncident: number[][];
  readonly physicalPairs: Set<number>;
  /** Ties along which news travels; fixed. */
  readonly virtual: Tie[];
  readonly virtualIncident: number[][];
  randomState: number;
  time: number;
};

export type MultiplexParameters = {
  /** λ: information spreading per aware–unaware virtual tie. */
  information: number;
  /** δ: forgetting per aware, healthy person. */
  forgetting: number;
  /** β: infection per susceptible–infected physical tie. */
  infection: number;
  /** γ: factor on β for an aware susceptible person. */
  protection: number;
  /** μ: recovery per infected person. */
  recovery: number;
  /** w: avoidance per aware-susceptible–infected physical tie. */
  avoidance: number;
  /** Infection from outside per healthy person. */
  importation: number;
};

export type MultiplexEvent =
  | { kind: "infect"; person: number; source: number | null }
  | { kind: "recover"; person: number }
  | { kind: "inform"; person: number; source: number }
  | { kind: "forget"; person: number }
  | { kind: "avoid"; person: number; from: number; to: number; tie: number };

export type MultiplexMeasure = {
  infected: number;
  aware: number;
  /** Share of physical ties joining a susceptible and an infected person. */
  exposedTies: number;
  /** Share of current physical ties that are also virtual ties. */
  overlap: number;
};

export const DEFAULT_PEOPLE = 240;
export const DEFAULT_PHYSICAL_DEGREE = 6;
export const DEFAULT_VIRTUAL_DEGREE = 4;
/** Share of the virtual layer copied from initial physical ties (Granell et al. build it as a superset). */
export const DEFAULT_SHARED = 0.5;
export const INFORMATION_RANGE = [0, 0.6] as const;
export const AVOIDANCE_RANGE = [0, 1] as const;
export const DEFAULT_PARAMETERS: MultiplexParameters = {
  information: 0.2,
  forgetting: 0.3,
  infection: 0.1,
  protection: 0.5,
  recovery: 0.25,
  avoidance: 0.5,
  importation: 0.0004,
};
const PAIR_STRIDE = 1 << 16;
const MAX_STEP = 0.05;

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(network: Multiplex) {
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

function addTie(ties: Tie[], incident: number[][], pairs: Set<number>, a: number, b: number) {
  if (a === b) return false;
  const key = pairKey(a, b);
  if (pairs.has(key)) return false;
  const id = ties.length;
  pairs.add(key);
  ties.push({ id, a, b });
  incident[a]!.push(id);
  incident[b]!.push(id);
  return true;
}

function removeIncident(incident: number[][], person: number, tie: number) {
  const list = incident[person]!;
  const index = list.indexOf(tie);
  if (index < 0) return;
  list[index] = list[list.length - 1]!;
  list.pop();
}

/**
 * Two random graphs on the same people, each tying everyone at least once.
 * The virtual layer starts with a share of the physical ties plus random
 * long-range ones, so news can jump where the disease cannot.
 */
export function createMultiplex(
  size = DEFAULT_PEOPLE,
  seed = 0x5bd1e995,
  initialInfected = 0.03,
  physicalDegree = DEFAULT_PHYSICAL_DEGREE,
  virtualDegree = DEFAULT_VIRTUAL_DEGREE,
  shared = DEFAULT_SHARED,
): Multiplex {
  const network: Multiplex = {
    size,
    aware: new Array<boolean>(size).fill(false),
    infected: new Array<boolean>(size).fill(false),
    physical: [],
    physicalIncident: Array.from({ length: size }, () => []),
    physicalPairs: new Set(),
    virtual: [],
    virtualIncident: Array.from({ length: size }, () => []),
    randomState: seed >>> 0 || 1,
    time: 0,
  };
  const random = randomFor(network);
  const physical = (a: number, b: number) =>
    addTie(network.physical, network.physicalIncident, network.physicalPairs, a, b);
  const virtualPairs = new Set<number>();
  const virtual = (a: number, b: number) =>
    addTie(network.virtual, network.virtualIncident, virtualPairs, a, b);

  for (let person = 0; person < size; person += 1) {
    while (!physical(person, randomIndex(random(), size)));
  }
  const physicalCount = Math.round((size * physicalDegree) / 2);
  while (network.physical.length < physicalCount) {
    physical(randomIndex(random(), size), randomIndex(random(), size));
  }

  const virtualCount = Math.round((size * virtualDegree) / 2);
  for (const tie of network.physical) {
    if (network.virtual.length >= virtualCount * shared) break;
    if (random() < virtualDegree / physicalDegree) virtual(tie.a, tie.b);
  }
  for (let person = 0; person < size; person += 1) {
    if (network.virtualIncident[person]!.length > 0) continue;
    while (!virtual(person, randomIndex(random(), size)));
  }
  while (network.virtual.length < virtualCount) {
    virtual(randomIndex(random(), size), randomIndex(random(), size));
  }

  for (let person = 0; person < size; person += 1) {
    if (random() < initialInfected) {
      network.infected[person] = true;
      network.aware[person] = true;
    }
  }
  return network;
}

export function otherEnd(tie: Tie, person: number) {
  return tie.a === person ? tie.b : tie.a;
}

function healthyStranger(network: Multiplex, person: number, random: () => number) {
  const candidates: number[] = [];
  for (let other = 0; other < network.size; other += 1) {
    if (other === person || network.infected[other]) continue;
    if (network.physicalPairs.has(pairKey(person, other))) continue;
    candidates.push(other);
  }
  return candidates.length === 0 ? null : candidates[randomIndex(random(), candidates.length)]!;
}

/** Advances by `duration` in steps of at most MAX_STEP; returns every change. */
export function stepMultiplex(
  network: Multiplex,
  duration: number,
  parameters: MultiplexParameters,
): MultiplexEvent[] {
  const random = randomFor(network);
  const events: MultiplexEvent[] = [];
  const { aware, infected } = network;
  let remaining = Math.max(0, duration);
  while (remaining > 1e-9) {
    const delta = Math.min(MAX_STEP, remaining);
    remaining -= delta;
    network.time += delta;
    const informChance = chance(parameters.information, delta);
    const unawareChance = chance(parameters.infection, delta);
    const awareChance = chance(parameters.infection * parameters.protection, delta);
    const avoidChance = chance(parameters.avoidance, delta);
    const newlyInformed = new Map<number, number>();
    const newlyInfected = new Map<number, number | null>();

    // Every process reads the states at the start of the step.
    for (const tie of network.virtual) {
      if (aware[tie.a] === aware[tie.b]) continue;
      const listener = aware[tie.a] ? tie.b : tie.a;
      if (random() < informChance && !newlyInformed.has(listener)) {
        newlyInformed.set(listener, otherEnd(tie, listener));
      }
    }

    for (const tie of network.physical) {
      if (infected[tie.a] === infected[tie.b]) continue;
      const susceptible = infected[tie.a] ? tie.b : tie.a;
      const source = otherEnd(tie, susceptible);
      const careful = aware[susceptible]!;
      if (random() < (careful ? awareChance : unawareChance)) {
        if (!newlyInfected.has(susceptible)) newlyInfected.set(susceptible, source);
        continue;
      }
      if (!careful || random() >= avoidChance) continue;
      const stranger = healthyStranger(network, susceptible, random);
      if (stranger === null || newlyInfected.has(stranger)) continue;
      network.physicalPairs.delete(pairKey(susceptible, source));
      removeIncident(network.physicalIncident, source, tie.id);
      tie.a = susceptible;
      tie.b = stranger;
      network.physicalPairs.add(pairKey(susceptible, stranger));
      network.physicalIncident[stranger]!.push(tie.id);
      events.push({ kind: "avoid", person: susceptible, from: source, to: stranger, tie: tie.id });
    }

    const forgetChance = chance(parameters.forgetting, delta);
    const recoverChance = chance(parameters.recovery, delta);
    const importChance = chance(parameters.importation, delta);
    for (let person = 0; person < network.size; person += 1) {
      if (infected[person]) {
        if (random() < recoverChance) {
          infected[person] = false;
          events.push({ kind: "recover", person });
        }
        continue;
      }
      if (!newlyInfected.has(person) && random() < importChance) newlyInfected.set(person, null);
      if (aware[person] && random() < forgetChance) {
        aware[person] = false;
        events.push({ kind: "forget", person });
      }
    }
    for (const [person, source] of newlyInformed) {
      if (aware[person] || newlyInfected.has(person)) continue;
      aware[person] = true;
      events.push({ kind: "inform", person, source });
    }
    for (const [person, source] of newlyInfected) {
      infected[person] = true;
      aware[person] = true;
      events.push({ kind: "infect", person, source });
    }
  }
  return events;
}

/** Infects one person from outside; they become aware. False if already ill. */
export function infectPerson(network: Multiplex, person: number) {
  if (person < 0 || person >= network.size || network.infected[person]) return false;
  network.infected[person] = true;
  network.aware[person] = true;
  return true;
}

/**
 * One person announces the disease: they and every virtual contact become
 * aware at once. Returns the people who were newly informed.
 */
export function announce(network: Multiplex, person: number) {
  if (person < 0 || person >= network.size) return [];
  const informed: number[] = [];
  if (!network.aware[person]) {
    network.aware[person] = true;
    informed.push(person);
  }
  for (const tieId of network.virtualIncident[person]!) {
    const other = otherEnd(network.virtual[tieId]!, person);
    if (network.aware[other]) continue;
    network.aware[other] = true;
    informed.push(other);
  }
  return informed;
}

export function measureMultiplex(network: Multiplex): MultiplexMeasure {
  let infected = 0;
  let aware = 0;
  for (let person = 0; person < network.size; person += 1) {
    if (network.infected[person]) infected += 1;
    if (network.aware[person]) aware += 1;
  }
  let exposed = 0;
  for (const tie of network.physical) {
    if (network.infected[tie.a] !== network.infected[tie.b]) exposed += 1;
  }
  const virtualPairs = new Set(network.virtual.map((tie) => pairKey(tie.a, tie.b)));
  let shared = 0;
  for (const key of network.physicalPairs) if (virtualPairs.has(key)) shared += 1;
  const people = Math.max(1, network.size);
  return {
    infected: infected / people,
    aware: aware / people,
    exposedTies: exposed / Math.max(1, network.physical.length),
    overlap: shared / Math.max(1, network.physical.length),
  };
}
