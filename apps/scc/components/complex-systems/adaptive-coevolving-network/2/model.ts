// Adaptive SIS epidemic: infection spreads along ties, and susceptible people
// cut ties to infected neighbours and reconnect to someone healthy. Each
// process changes the conditions of the other: avoidance reshapes the network,
// and the reshaped network decides how the next outbreak travels.
//
// Per tie between a susceptible S and an infected I, in continuous time:
//   infection  at rate `infection`  — S becomes infected;
//   avoidance  at rate `avoidance`  — S drops the tie and links to a random
//                                     susceptible it does not already know.
// Each infected person recovers at rate `recovery`. A small import rate infects
// a random susceptible from outside, so the epidemic can return after dying out.
//
// Source: Gross, D'Lima & Blasius, "Epidemic dynamics on an adaptive network",
// PRL 96, 208701 (2006). Positions are not part of this model.

export type Health = "S" | "I";

export type EpidemicTie = { readonly id: number; a: number; b: number };

export type EpidemicNetwork = {
  size: number;
  readonly health: Health[];
  readonly ties: EpidemicTie[];
  readonly incident: number[][];
  readonly pairs: Set<number>;
  randomState: number;
  time: number;
};

export type EpidemicParameters = {
  infection: number;
  recovery: number;
  avoidance: number;
  importation: number;
};

export type EpidemicEvent =
  | { kind: "infect"; person: number; source: number | null }
  | { kind: "recover"; person: number }
  | { kind: "avoid"; person: number; from: number; to: number; tie: number };

export type EpidemicMeasure = {
  infected: number;
  /** Share of ties joining a susceptible and an infected person. */
  exposedTies: number;
  meanDegreeSusceptible: number;
  meanDegreeInfected: number;
};

export const DEFAULT_PEOPLE = 300;
export const MAX_PEOPLE = 600;
export const DEFAULT_MEAN_DEGREE = 8;
export const AVOIDANCE_RANGE = [0, 1] as const;
export const DEFAULT_PARAMETERS: EpidemicParameters = {
  infection: 0.08,
  recovery: 0.25,
  avoidance: 0.3,
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

function randomFor(network: EpidemicNetwork) {
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

function addTie(network: EpidemicNetwork, a: number, b: number) {
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

function removeIncident(network: EpidemicNetwork, person: number, tie: number) {
  const list = network.incident[person]!;
  const index = list.indexOf(tie);
  if (index < 0) return;
  list[index] = list[list.length - 1]!;
  list.pop();
}

/** A random graph with every person tied at least once, and a few initial cases. */
export function createEpidemicNetwork(
  size = DEFAULT_PEOPLE,
  meanDegree = DEFAULT_MEAN_DEGREE,
  seed = 0x1b873593,
  initialInfected = 0.05,
): EpidemicNetwork {
  const network: EpidemicNetwork = {
    size,
    health: Array.from({ length: size }, () => "S" as Health),
    ties: [],
    incident: Array.from({ length: size }, () => []),
    pairs: new Set(),
    randomState: seed >>> 0 || 1,
    time: 0,
  };
  const random = randomFor(network);
  for (let person = 0; person < size; person += 1) {
    while (!addTie(network, person, randomIndex(random(), size)));
  }
  const tieCount = Math.round((size * meanDegree) / 2);
  while (network.ties.length < tieCount) {
    addTie(network, randomIndex(random(), size), randomIndex(random(), size));
  }
  for (let person = 0; person < size; person += 1) {
    if (random() < initialInfected) network.health[person] = "I";
  }
  return network;
}

export function otherEnd(tie: EpidemicTie, person: number) {
  return tie.a === person ? tie.b : tie.a;
}

function healthyStranger(network: EpidemicNetwork, person: number, random: () => number) {
  const candidates: number[] = [];
  for (let other = 0; other < network.size; other += 1) {
    if (other === person || network.health[other] !== "S") continue;
    if (network.pairs.has(pairKey(person, other))) continue;
    candidates.push(other);
  }
  return candidates.length === 0 ? null : candidates[randomIndex(random(), candidates.length)]!;
}

/** Advances by `duration` in steps of at most MAX_STEP; returns every change. */
export function stepEpidemicNetwork(
  network: EpidemicNetwork,
  duration: number,
  parameters: EpidemicParameters,
): EpidemicEvent[] {
  const random = randomFor(network);
  const events: EpidemicEvent[] = [];
  let remaining = Math.max(0, duration);
  while (remaining > 1e-9) {
    const delta = Math.min(MAX_STEP, remaining);
    remaining -= delta;
    network.time += delta;
    const infectChance = chance(parameters.infection, delta);
    const avoidChance = chance(parameters.avoidance, delta);
    const newlyInfected = new Map<number, number | null>();

    // Tie processes read the health at the start of the step.
    for (const tie of network.ties) {
      const healthA = network.health[tie.a];
      if (healthA === network.health[tie.b]) continue;
      const susceptible = healthA === "S" ? tie.a : tie.b;
      const infected = otherEnd(tie, susceptible);
      if (random() < infectChance) {
        if (!newlyInfected.has(susceptible)) newlyInfected.set(susceptible, infected);
        continue;
      }
      if (random() >= avoidChance) continue;
      const stranger = healthyStranger(network, susceptible, random);
      if (stranger === null || newlyInfected.has(stranger)) continue;
      network.pairs.delete(pairKey(susceptible, infected));
      removeIncident(network, infected, tie.id);
      tie.a = susceptible;
      tie.b = stranger;
      network.pairs.add(pairKey(susceptible, stranger));
      network.incident[stranger]!.push(tie.id);
      events.push({ kind: "avoid", person: susceptible, from: infected, to: stranger, tie: tie.id });
    }

    const recoverChance = chance(parameters.recovery, delta);
    const importChance = chance(parameters.importation, delta);
    for (let person = 0; person < network.size; person += 1) {
      if (network.health[person] === "I") {
        if (random() < recoverChance) {
          network.health[person] = "S";
          events.push({ kind: "recover", person });
        }
      } else if (!newlyInfected.has(person) && random() < importChance) {
        newlyInfected.set(person, null);
      }
    }
    for (const [person, source] of newlyInfected) {
      network.health[person] = "I";
      events.push({ kind: "infect", person, source });
    }
  }
  return events;
}

/** Infects one person from outside; returns false if they were already ill. */
export function infectPerson(network: EpidemicNetwork, person: number) {
  if (person < 0 || person >= network.size || network.health[person] === "I") return false;
  network.health[person] = "I";
  return true;
}

/** Appends a susceptible person tied to the given acquaintances. */
export function addPerson(network: EpidemicNetwork, acquaintances: Iterable<number>) {
  if (network.size >= MAX_PEOPLE) return null;
  const person = network.size;
  network.size += 1;
  network.health.push("S");
  network.incident.push([]);
  for (const other of acquaintances) {
    if (other >= 0 && other < person) addTie(network, person, other);
  }
  return person;
}

export function measureEpidemic(network: EpidemicNetwork): EpidemicMeasure {
  let infected = 0;
  let degreeS = 0;
  let degreeI = 0;
  for (let person = 0; person < network.size; person += 1) {
    const degree = network.incident[person]!.length;
    if (network.health[person] === "I") {
      infected += 1;
      degreeI += degree;
    } else {
      degreeS += degree;
    }
  }
  let exposed = 0;
  for (const tie of network.ties) {
    if (network.health[tie.a] !== network.health[tie.b]) exposed += 1;
  }
  const susceptible = network.size - infected;
  return {
    infected: infected / Math.max(1, network.size),
    exposedTies: exposed / Math.max(1, network.ties.length),
    meanDegreeSusceptible: degreeS / Math.max(1, susceptible),
    meanDegreeInfected: degreeI / Math.max(1, infected),
  };
}
