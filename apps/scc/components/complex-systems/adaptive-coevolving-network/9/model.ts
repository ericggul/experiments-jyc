// Self-organized critical threshold network: Boolean nodes switch on or off
// from the signed sum of their inputs, and the inputs themselves change with
// the activity they produce. A node that has stayed still gains an input; a
// node that keeps changing loses one. Frozen networks therefore thicken and
// chaotic ones thin out, until about half the nodes are still and half blink:
// the boundary between order and chaos.
//
// Dynamics, all nodes in parallel:
//   σ_i(t+1) = sgn( Σ_j w_ij σ_j(t) + h ),   σ ∈ {−1,+1}, w ∈ {−1,0,+1}, sgn(0) = +1.
// Topology, `rewiresPerStep` times after every update: pick a random node i.
//   If σ_i has not changed during the last `window` updates (frozen), add an
//   input j → i from a random non-input j with a random sign w_ij = ±1.
//   Otherwise (active), remove one of its inputs at random.
//
// Source: Bornholdt & Rohlf, "Topological evolution of dynamical networks:
// global criticality from local dynamics", PRL 84, 6114 (2000). The paper
// restarts each epoch from a random state and judges activity on the reached
// attractor; here the trajectory never restarts and activity is judged over a
// trailing window, so what is on screen is what the rule reads (see the route
// record for the comparison). Positions are not part of this model.

export type ThresholdLink = {
  readonly id: number;
  readonly source: number;
  readonly target: number;
  /** +1 excitatory, −1 inhibitory. */
  readonly weight: 1 | -1;
};

export type ThresholdNetwork = {
  readonly size: number;
  /** σ_i as +1 (on) or −1 (off). */
  readonly state: Int8Array;
  /** Update count at which each node last changed; −Infinity-like if never. */
  readonly lastChange: Float64Array;
  /** Incoming links of each node. */
  readonly inputs: ThresholdLink[][];
  readonly pairs: Set<number>;
  linkCount: number;
  nextLinkId: number;
  /** The unperturbed twin trajectory after a flip, or null once it has healed. */
  shadow: Int8Array | null;
  shadowAge: number;
  updates: number;
  randomState: number;
};

export type ThresholdParameters = {
  /** h, added to every input sum. */
  threshold: number;
  /** Updates a node must stay unchanged to count as frozen. */
  window: number;
  /** Topology changes after each parallel update. */
  rewiresPerStep: number;
};

export type ThresholdEvent =
  | { kind: "gain"; link: ThresholdLink }
  | { kind: "lose"; link: ThresholdLink };

export type ThresholdMeasure = {
  /** K: mean number of inputs per node. */
  meanInputs: number;
  /** Share of nodes that changed during the last window. */
  activeShare: number;
  /** Nodes whose state differs from the unperturbed twin, or 0 without one. */
  damage: number;
};

export const DEFAULT_NODES = 120;
export const DEFAULT_MEAN_INPUTS = 1;
export const MEAN_INPUT_RANGE = [0.25, 6] as const;
export const DEFAULT_PARAMETERS: ThresholdParameters = {
  threshold: 0,
  window: 16,
  rewiresPerStep: 2,
};
/** A damage trace is dropped after this many updates even if it never heals. */
export const SHADOW_LIMIT = 40;
const PAIR_STRIDE = 1 << 16;
const NEVER = -1e9;

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(network: ThresholdNetwork) {
  return () => {
    const [value, next] = nextRandom(network.randomState);
    network.randomState = next;
    return value;
  };
}

function randomIndex(value: number, length: number) {
  return Math.min(length - 1, Math.floor(value * length));
}

function pairKey(source: number, target: number) {
  return target * PAIR_STRIDE + source;
}

function addLink(network: ThresholdNetwork, source: number, target: number, weight: 1 | -1) {
  if (source === target) return null;
  const key = pairKey(source, target);
  if (network.pairs.has(key)) return null;
  const link: ThresholdLink = { id: network.nextLinkId, source, target, weight };
  network.nextLinkId += 1;
  network.pairs.add(key);
  network.inputs[target]!.push(link);
  network.linkCount += 1;
  return link;
}

function removeInput(network: ThresholdNetwork, target: number, index: number) {
  const list = network.inputs[target]!;
  const link = list[index]!;
  list[index] = list[list.length - 1]!;
  list.pop();
  network.pairs.delete(pairKey(link.source, link.target));
  network.linkCount -= 1;
  return link;
}

/** A random input from a node that is not yet an input; null if none is left. */
function gainInput(network: ThresholdNetwork, target: number, random: () => number) {
  if (network.inputs[target]!.length >= network.size - 1) return null;
  for (;;) {
    const source = randomIndex(random(), network.size);
    const link = addLink(network, source, target, random() < 0.5 ? -1 : 1);
    if (link) return link;
  }
}

function addRandomLink(network: ThresholdNetwork, random: () => number) {
  if (network.linkCount >= network.size * (network.size - 1)) return null;
  for (;;) {
    const link = addLink(
      network,
      randomIndex(random(), network.size),
      randomIndex(random(), network.size),
      random() < 0.5 ? -1 : 1,
    );
    if (link) return link;
  }
}

function removeRandomLink(network: ThresholdNetwork, random: () => number) {
  if (network.linkCount === 0) return null;
  // Pick a link uniformly by walking to its position across the input lists.
  let position = randomIndex(random(), network.linkCount);
  for (let target = 0; target < network.size; target += 1) {
    const count = network.inputs[target]!.length;
    if (position < count) return removeInput(network, target, position);
    position -= count;
  }
  return null;
}

/** Random signed inputs with mean `meanInputs` per node, and a random state. */
export function createThresholdNetwork(
  size = DEFAULT_NODES,
  meanInputs = DEFAULT_MEAN_INPUTS,
  seed = 0x3c6ef372,
): ThresholdNetwork {
  const network: ThresholdNetwork = {
    size,
    state: new Int8Array(size),
    lastChange: new Float64Array(size).fill(NEVER),
    inputs: Array.from({ length: size }, () => []),
    pairs: new Set(),
    linkCount: 0,
    nextLinkId: 0,
    shadow: null,
    shadowAge: 0,
    updates: 0,
    randomState: seed >>> 0 || 1,
  };
  const random = randomFor(network);
  for (let node = 0; node < size; node += 1) network.state[node] = random() < 0.5 ? -1 : 1;
  setMeanInputs(network, meanInputs);
  return network;
}

function nextState(network: ThresholdNetwork, from: Int8Array, threshold: number, out: Int8Array) {
  for (let node = 0; node < network.size; node += 1) {
    let field = threshold;
    for (const link of network.inputs[node]!) field += link.weight * from[link.source]!;
    out[node] = field >= 0 ? 1 : -1;
  }
}

export function isActive(network: ThresholdNetwork, node: number, window = DEFAULT_PARAMETERS.window) {
  return network.updates - network.lastChange[node]! < window;
}

export function isDamaged(network: ThresholdNetwork, node: number) {
  return network.shadow !== null && network.shadow[node] !== network.state[node];
}

/** One parallel update of every node, then the topology rule; returns link changes. */
export function stepThresholdNetwork(
  network: ThresholdNetwork,
  parameters: ThresholdParameters = DEFAULT_PARAMETERS,
): ThresholdEvent[] {
  const random = randomFor(network);
  const next = new Int8Array(network.size);
  nextState(network, network.state, parameters.threshold, next);
  network.updates += 1;
  for (let node = 0; node < network.size; node += 1) {
    if (next[node] !== network.state[node]) network.lastChange[node] = network.updates;
  }
  if (network.shadow) {
    const twin = new Int8Array(network.size);
    nextState(network, network.shadow, parameters.threshold, twin);
    network.shadow = twin;
  }
  network.state.set(next);
  if (network.shadow) {
    network.shadowAge += 1;
    let differs = false;
    for (let node = 0; node < network.size && !differs; node += 1) {
      differs = network.shadow[node] !== next[node];
    }
    if (!differs || network.shadowAge > SHADOW_LIMIT) network.shadow = null;
  }

  // Wait one full window so every node has a history to be judged on.
  const events: ThresholdEvent[] = [];
  if (network.updates <= parameters.window) return events;
  for (let change = 0; change < parameters.rewiresPerStep; change += 1) {
    const node = randomIndex(random(), network.size);
    if (!isActive(network, node, parameters.window)) {
      const link = gainInput(network, node, random);
      if (link) events.push({ kind: "gain", link });
    } else if (network.inputs[node]!.length > 0) {
      const index = randomIndex(random(), network.inputs[node]!.length);
      events.push({ kind: "lose", link: removeInput(network, node, index) });
    }
  }
  return events;
}

/**
 * Flips one node from outside. The unflipped trajectory keeps running as a
 * twin, so the nodes whose state differs from it are exactly the damage the
 * flip has caused. A flip during an open trace adds to the same trace.
 */
export function flipNode(network: ThresholdNetwork, node: number) {
  if (node < 0 || node >= network.size) return false;
  if (!network.shadow) {
    network.shadow = network.state.slice();
    network.shadowAge = 0;
  }
  network.state[node] = -network.state[node]!;
  network.lastChange[node] = network.updates;
  return true;
}

/** Adds or removes random links until K is as close to `meanInputs` as possible. */
export function setMeanInputs(network: ThresholdNetwork, meanInputs: number): ThresholdEvent[] {
  const random = randomFor(network);
  const goal = Math.max(0, Math.min(network.size * (network.size - 1), Math.round(meanInputs * network.size)));
  const events: ThresholdEvent[] = [];
  while (network.linkCount < goal) {
    const link = addRandomLink(network, random);
    if (!link) break;
    events.push({ kind: "gain", link });
  }
  while (network.linkCount > goal) {
    const link = removeRandomLink(network, random);
    if (!link) break;
    events.push({ kind: "lose", link });
  }
  return events;
}

export function measureThreshold(
  network: ThresholdNetwork,
  window = DEFAULT_PARAMETERS.window,
): ThresholdMeasure {
  let active = 0;
  let damage = 0;
  for (let node = 0; node < network.size; node += 1) {
    if (isActive(network, node, window)) active += 1;
    if (isDamaged(network, node)) damage += 1;
  }
  return {
    meanInputs: network.linkCount / Math.max(1, network.size),
    activeShare: active / Math.max(1, network.size),
    damage,
  };
}
