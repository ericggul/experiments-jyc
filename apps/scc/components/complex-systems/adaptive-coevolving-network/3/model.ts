// Adaptive cooperation: players in a weak prisoner's dilemma copy neighbours
// who earn more, and anyone may walk away from a defecting partner. Strategy
// decides which ties survive; the surviving ties decide who earns most and
// is therefore copied.
//
// Each player plays every neighbour once per round. Payoffs (weak PD):
//   C meets C → 1 each;  D meets C → b to D, 0 to C;  D meets D → 0 each.
// So a cooperator earns its number of cooperating neighbours, a defector b
// times that number. One update, for a random player i and a random
// neighbour j of i:
//   switching — if j defects, with probability `switching` i drops j and ties
//               itself to one of j's other neighbours it does not yet know
//               (a random stranger if there is none);
//   imitation — otherwise, if j earns more than i, i copies j's strategy with
//               probability (Πj − Πi) / (b · max(ki, kj));
//   mutation  — with a small probability i instead flips its strategy.
// Ties are conserved. Nobody leaves a cooperator, so cooperators collect ties,
// earn more and are copied more: switching turns the dilemma into a race that
// cooperators can win.
//
// Sources: Zimmermann, Eguíluz & San Miguel, PRE 69, 065102 (2004) and
// PRE 72, 056118 (2005) — leaving unprofitable partners, leaders, cascades;
// Santos, Pacheco & Lenaerts, PLoS Comput. Biol. 2, e140 (2006) — anyone
// leaves a defector, for a neighbour of that defector; Santos & Pacheco,
// PRL 95, 098104 (2005) — the imitation probability. Positions are not part of
// this model.

export type Strategy = "C" | "D";

export type PlayerTie = { readonly id: number; a: number; b: number };

export type CooperationNetwork = {
  size: number;
  readonly strategy: Strategy[];
  readonly ties: PlayerTie[];
  readonly incident: number[][];
  readonly pairs: Set<number>;
  /** Cooperating neighbours of each player; payoff follows from it. */
  readonly cooperativeNeighbours: number[];
  randomState: number;
  /** Elementary updates performed so far. */
  updates: number;
};

export type CooperationParameters = {
  /** b: what a defector earns from each cooperating neighbour (> 1). */
  temptation: number;
  /** p: chance a player who meets a defecting neighbour leaves it. */
  switching: number;
  /** Chance per update that the chosen player flips its strategy instead. */
  mutation: number;
};

export type CooperationEvent =
  | { kind: "imitate"; player: number; model: number; strategy: Strategy }
  | { kind: "switch"; player: number; from: number; to: number; tie: number }
  | { kind: "mutate"; player: number; strategy: Strategy };

export type CooperationMeasure = {
  cooperators: number;
  /** Share of ties joining two cooperators. */
  cooperativeTies: number;
  meanDegreeCooperator: number;
  meanDegreeDefector: number;
  /** Ties of the best-connected player divided by the mean degree. */
  hubRatio: number;
};

export const DEFAULT_PLAYERS = 240;
export const DEFAULT_MEAN_DEGREE = 8;
export const TEMPTATION_RANGE = [1.1, 2.5] as const;
export const SWITCHING_RANGE = [0, 1] as const;
export const DEFAULT_PARAMETERS: CooperationParameters = {
  temptation: 1.6,
  switching: 0.3,
  mutation: 0.002,
};
const PAIR_STRIDE = 1 << 16;

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(network: CooperationNetwork) {
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

function addTie(network: CooperationNetwork, a: number, b: number) {
  if (a === b) return false;
  const key = pairKey(a, b);
  if (network.pairs.has(key)) return false;
  const id = network.ties.length;
  network.pairs.add(key);
  network.ties.push({ id, a, b });
  network.incident[a]!.push(id);
  network.incident[b]!.push(id);
  if (network.strategy[a] === "C") network.cooperativeNeighbours[b]! += 1;
  if (network.strategy[b] === "C") network.cooperativeNeighbours[a]! += 1;
  return true;
}

function removeIncident(network: CooperationNetwork, player: number, tie: number) {
  const list = network.incident[player]!;
  const index = list.indexOf(tie);
  if (index < 0) return;
  list[index] = list[list.length - 1]!;
  list.pop();
}

export function otherEnd(tie: PlayerTie, player: number) {
  return tie.a === player ? tie.b : tie.a;
}

/** Total payoff of one round against every current neighbour. */
export function payoff(network: CooperationNetwork, player: number, temptation: number) {
  const gain = network.strategy[player] === "C" ? 1 : temptation;
  return gain * network.cooperativeNeighbours[player]!;
}

/** Sets a strategy and keeps every neighbour's cooperative count in step. */
function setStrategy(network: CooperationNetwork, player: number, strategy: Strategy) {
  if (network.strategy[player] === strategy) return false;
  network.strategy[player] = strategy;
  const change = strategy === "C" ? 1 : -1;
  for (const tieId of network.incident[player]!) {
    network.cooperativeNeighbours[otherEnd(network.ties[tieId]!, player)]! += change;
  }
  return true;
}

/** A random graph with every player tied at least once; a share starts cooperating. */
export function createCooperationNetwork(
  size = DEFAULT_PLAYERS,
  meanDegree = DEFAULT_MEAN_DEGREE,
  seed = 0x3c6ef372,
  initialCooperators = 0.6,
): CooperationNetwork {
  const network: CooperationNetwork = {
    size,
    strategy: [],
    ties: [],
    incident: Array.from({ length: size }, () => []),
    pairs: new Set(),
    cooperativeNeighbours: new Array<number>(size).fill(0),
    randomState: seed >>> 0 || 1,
    updates: 0,
  };
  const random = randomFor(network);
  for (let player = 0; player < size; player += 1) {
    network.strategy.push(random() < initialCooperators ? "C" : "D");
  }
  for (let player = 0; player < size; player += 1) {
    while (!addTie(network, player, randomIndex(random(), size)));
  }
  const tieCount = Math.round((size * meanDegree) / 2);
  while (network.ties.length < tieCount) {
    addTie(network, randomIndex(random(), size), randomIndex(random(), size));
  }
  return network;
}

/** A neighbour of `defector` not yet tied to `player`, else any stranger. */
function newPartner(
  network: CooperationNetwork,
  player: number,
  defector: number,
  random: () => number,
) {
  const near: number[] = [];
  for (const tieId of network.incident[defector]!) {
    const other = otherEnd(network.ties[tieId]!, defector);
    if (other !== player && !network.pairs.has(pairKey(player, other))) near.push(other);
  }
  if (near.length > 0) return near[randomIndex(random(), near.length)]!;
  // Rejection sampling is cheap while degree ≪ size; a scan is the fallback.
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const other = randomIndex(random(), network.size);
    if (other !== player && !network.pairs.has(pairKey(player, other))) return other;
  }
  const candidates: number[] = [];
  for (let other = 0; other < network.size; other += 1) {
    if (other !== player && !network.pairs.has(pairKey(player, other))) candidates.push(other);
  }
  return candidates.length === 0 ? null : candidates[randomIndex(random(), candidates.length)]!;
}

/** Moves the `player` end of a tie away from `from` and onto `to`. */
function moveTie(network: CooperationNetwork, tieId: number, player: number, from: number, to: number) {
  const tie = network.ties[tieId]!;
  network.pairs.delete(pairKey(player, from));
  removeIncident(network, from, tieId);
  if (network.strategy[player] === "C") network.cooperativeNeighbours[from]! -= 1;
  if (network.strategy[from] === "C") network.cooperativeNeighbours[player]! -= 1;
  tie.a = player;
  tie.b = to;
  network.pairs.add(pairKey(player, to));
  network.incident[to]!.push(tieId);
  if (network.strategy[player] === "C") network.cooperativeNeighbours[to]! += 1;
  if (network.strategy[to] === "C") network.cooperativeNeighbours[player]! += 1;
}

/** Runs `count` random sequential updates in place and reports each change. */
export function stepCooperationNetwork(
  network: CooperationNetwork,
  count: number,
  parameters: CooperationParameters,
): CooperationEvent[] {
  const random = randomFor(network);
  const temptation = Math.max(1, parameters.temptation);
  const switching = Math.min(1, Math.max(0, parameters.switching));
  const mutation = Math.min(1, Math.max(0, parameters.mutation));
  const events: CooperationEvent[] = [];

  for (let update = 0; update < count; update += 1) {
    network.updates += 1;
    const player = randomIndex(random(), network.size);

    if (random() < mutation) {
      const strategy: Strategy = network.strategy[player] === "C" ? "D" : "C";
      setStrategy(network, player, strategy);
      events.push({ kind: "mutate", player, strategy });
      continue;
    }

    const incident = network.incident[player]!;
    if (incident.length === 0) continue;
    const tieId = incident[randomIndex(random(), incident.length)]!;
    const neighbour = otherEnd(network.ties[tieId]!, player);

    if (network.strategy[neighbour] === "D" && random() < switching) {
      const partner = newPartner(network, player, neighbour, random);
      if (partner === null) continue;
      moveTie(network, tieId, player, neighbour, partner);
      events.push({ kind: "switch", player, from: neighbour, to: partner, tie: tieId });
      continue;
    }

    const strategy = network.strategy[neighbour]!;
    if (strategy === network.strategy[player]) continue;
    const advantage = payoff(network, neighbour, temptation) - payoff(network, player, temptation);
    if (advantage <= 0) continue;
    const scale = temptation * Math.max(incident.length, network.incident[neighbour]!.length);
    if (random() >= advantage / scale) continue;
    setStrategy(network, player, strategy);
    events.push({ kind: "imitate", player, model: neighbour, strategy });
  }
  return events;
}

/** Flips a player's strategy from outside; returns the new strategy. */
export function flipPlayer(network: CooperationNetwork, player: number) {
  if (player < 0 || player >= network.size) return null;
  const strategy: Strategy = network.strategy[player] === "C" ? "D" : "C";
  setStrategy(network, player, strategy);
  return strategy;
}

/** The cooperator with the highest payoff, or null if nobody cooperates. */
export function leadingCooperator(network: CooperationNetwork) {
  let leader: number | null = null;
  for (let player = 0; player < network.size; player += 1) {
    if (network.strategy[player] !== "C") continue;
    if (leader === null || network.cooperativeNeighbours[player]! > network.cooperativeNeighbours[leader]!) {
      leader = player;
    }
  }
  return leader;
}

export function measureCooperation(network: CooperationNetwork): CooperationMeasure {
  let cooperators = 0;
  let degreeC = 0;
  let degreeD = 0;
  let maxDegree = 0;
  for (let player = 0; player < network.size; player += 1) {
    const degree = network.incident[player]!.length;
    maxDegree = Math.max(maxDegree, degree);
    if (network.strategy[player] === "C") {
      cooperators += 1;
      degreeC += degree;
    } else {
      degreeD += degree;
    }
  }
  let cooperative = 0;
  for (const tie of network.ties) {
    if (network.strategy[tie.a] === "C" && network.strategy[tie.b] === "C") cooperative += 1;
  }
  const defectors = network.size - cooperators;
  return {
    cooperators: cooperators / Math.max(1, network.size),
    cooperativeTies: cooperative / Math.max(1, network.ties.length),
    meanDegreeCooperator: degreeC / Math.max(1, cooperators),
    meanDegreeDefector: degreeD / Math.max(1, defectors),
    hubRatio: maxDegree / Math.max(1e-9, (2 * network.ties.length) / Math.max(1, network.size)),
  };
}
