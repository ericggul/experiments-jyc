// Echo chambers: people hold an opinion whose sign is a side and whose size is
// conviction. Who talks to whom depends on opinions, and what people hear moves
// their opinions, so the conversation network and the opinions shape each other.
//
// Each person i has an opinion x_i and a fixed activity a_i (how often they
// reach out). The network is temporary: in each round of length `ROUND`,
// person i is active with probability a_i and contacts m others, choosing j
// with probability ∝ |x_i − x_j|^(−β) (homophily β). The active person hears
// each contact; with probability r the contact also hears them. Opinions follow
//   dx_i/dt = −x_i + K Σ_j A_ij(t) tanh(α x_j),
// where A_ij(t) = 1 while i hears j in the current round and α is how
// controversial the topic is. Activities follow a power law a ∈ [ε, 1] with
// exponent γ, so a few people talk far more than everyone else.
//
// Source: Baumann, Lorenz-Spreen, Sokolov & Starnini, "Modeling echo chambers
// and polarization dynamics in social networks", PRL 124, 048301 (2020).
// Positions are not part of this model.

export type EchoContact = {
  readonly id: number;
  /** The active person who reached out. */
  readonly source: number;
  readonly target: number;
  /** Whether the contact also heard the active person. */
  readonly mutual: boolean;
  readonly at: number;
};

export type EchoNetwork = {
  size: number;
  readonly opinion: number[];
  readonly activity: number[];
  /** Contacts of the current round first, older ones after; pruned by age. */
  contacts: EchoContact[];
  /** How many leading entries of `contacts` belong to the current round. */
  roundSize: number;
  /** Person whose opinion is held by the participant, or null. */
  held: number | null;
  nextContact: number;
  roundLeft: number;
  randomState: number;
  time: number;
};

export type EchoParameters = {
  /** K: weight of what one contact says. */
  influence: number;
  /** α: how strongly a held view is voiced, i.e. how controversial the topic is. */
  controversy: number;
  /** β: preference for contacts of similar opinion. */
  homophily: number;
};

export type EchoMeasure = {
  /** |mean x| / mean |x|: 1 when everyone leans the same way, 0 when sides balance. */
  alignment: number;
  meanConviction: number;
  /** Share of people with x > 0. */
  positive: number;
  /** Share of recent contacts joining people of opposite sign. */
  crossContacts: number;
  /** Pearson correlation of x_i with the mean opinion of i's recent contacts. */
  echo: number;
};

export const DEFAULT_PEOPLE = 200;
export const MAX_PEOPLE = 400;
/** Contacts per activation (m), reciprocity (r), activity floor (ε), exponent (γ). */
export const CONTACTS_PER_ACTIVATION = 4;
export const RECIPROCITY = 0.5;
export const ACTIVITY_FLOOR = 0.01;
export const ACTIVITY_EXPONENT = 2.1;
/** Contacts are drawn once per round and held for its length. */
export const ROUND = 0.1;
/** How long a contact stays in the recent-contact record, in model time. */
export const CONTACT_MEMORY = 1.6;
export const CONTROVERSY_RANGE = [0, 4] as const;
export const HOMOPHILY_RANGE = [0, 4] as const;
export const DEFAULT_PARAMETERS: EchoParameters = {
  influence: 7.5,
  controversy: 3,
  homophily: 3,
};
const MAX_STEP = 0.02;
/** Opinion gaps below this count as this, so |Δx|^(−β) stays finite. */
const MIN_GAP = 0.02;

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(network: EchoNetwork) {
  return () => {
    const [value, next] = nextRandom(network.randomState);
    network.randomState = next;
    return value;
  };
}

/** Inverse-CDF sample of F(a) ∝ a^(−γ) on [ε, 1]. */
export function sampleActivity(value: number) {
  const exponent = 1 - ACTIVITY_EXPONENT;
  const low = ACTIVITY_FLOOR ** exponent;
  return (low + value * (1 - low)) ** (1 / exponent);
}

/** People with power-law activity and opinions uniform in [−1, 1]. */
export function createEchoNetwork(size = DEFAULT_PEOPLE, seed = 0x5bd1e995): EchoNetwork {
  const network: EchoNetwork = {
    size,
    opinion: [],
    activity: [],
    contacts: [],
    roundSize: 0,
    held: null,
    nextContact: 0,
    roundLeft: 0,
    randomState: seed >>> 0 || 1,
    time: 0,
  };
  const random = randomFor(network);
  for (let person = 0; person < size; person += 1) {
    network.activity.push(sampleActivity(random()));
    network.opinion.push(random() * 2 - 1);
  }
  return network;
}

/** Draws m distinct contacts for `person`, weighted by |x_i − x_j|^(−β). */
function chooseContacts(
  network: EchoNetwork,
  person: number,
  homophily: number,
  random: () => number,
  weights: Float64Array,
) {
  const { size, opinion } = network;
  const own = opinion[person]!;
  let total = 0;
  for (let other = 0; other < size; other += 1) {
    const weight = other === person ? 0 : Math.max(MIN_GAP, Math.abs(own - opinion[other]!)) ** -homophily;
    weights[other] = weight;
    total += weight;
  }
  const chosen: number[] = [];
  const count = Math.min(CONTACTS_PER_ACTIVATION, size - 1);
  while (chosen.length < count && total > 0) {
    let pick = random() * total;
    let other = 0;
    for (; other < size - 1; other += 1) {
      pick -= weights[other]!;
      if (pick < 0) break;
    }
    if (weights[other] === 0) continue;
    chosen.push(other);
    total -= weights[other]!;
    weights[other] = 0;
  }
  return chosen;
}

function drawRound(network: EchoNetwork, parameters: EchoParameters, random: () => number) {
  const weights = new Float64Array(network.size);
  const fresh: EchoContact[] = [];
  for (let person = 0; person < network.size; person += 1) {
    if (random() >= network.activity[person]!) continue;
    for (const target of chooseContacts(network, person, parameters.homophily, random, weights)) {
      fresh.push({
        id: network.nextContact,
        source: person,
        target,
        mutual: random() < RECIPROCITY,
        at: network.time,
      });
      network.nextContact += 1;
    }
  }
  const memory = network.time - CONTACT_MEMORY;
  network.contacts = [...fresh, ...network.contacts.filter((contact) => contact.at > memory)];
  network.roundSize = fresh.length;
  return fresh;
}

/** Advances by `duration`; returns the contacts made in rounds that began. */
export function stepEchoNetwork(
  network: EchoNetwork,
  duration: number,
  parameters: EchoParameters,
): EchoContact[] {
  const random = randomFor(network);
  const made: EchoContact[] = [];
  const heard = new Float64Array(network.size);
  let current = network.contacts.slice(0, network.roundSize);
  let remaining = Math.max(0, duration);
  while (remaining > 1e-9) {
    if (network.roundLeft <= 1e-9) {
      current = drawRound(network, parameters, random);
      made.push(...current);
      network.roundLeft = ROUND;
    }
    const delta = Math.min(MAX_STEP, remaining, network.roundLeft);
    remaining -= delta;
    network.roundLeft -= delta;
    network.time += delta;

    // Euler step of dx_i/dt = −x_i + K Σ_j A_ij tanh(α x_j).
    heard.fill(0);
    const { opinion } = network;
    for (const contact of current) {
      heard[contact.source]! += Math.tanh(parameters.controversy * opinion[contact.target]!);
      if (contact.mutual) heard[contact.target]! += Math.tanh(parameters.controversy * opinion[contact.source]!);
    }
    for (let person = 0; person < network.size; person += 1) {
      if (person === network.held) continue;
      const x = opinion[person]!;
      opinion[person] = x + delta * (-x + parameters.influence * heard[person]!);
    }
  }
  return made;
}

/** The participant holds a person at an opinion; null releases them. */
export function holdOpinion(network: EchoNetwork, person: number | null, value = 0) {
  if (person === null || person < 0 || person >= network.size) {
    network.held = null;
    return false;
  }
  network.held = person;
  network.opinion[person] = value;
  return true;
}

/** Appends a person who is active in every round, at the given opinion. */
export function addActivePerson(network: EchoNetwork, opinion: number) {
  if (network.size >= MAX_PEOPLE) return null;
  const person = network.size;
  network.size += 1;
  network.opinion.push(opinion);
  network.activity.push(1);
  return person;
}

export function measureEcho(network: EchoNetwork): EchoMeasure {
  const { size, opinion } = network;
  let sum = 0;
  let conviction = 0;
  let positive = 0;
  for (let person = 0; person < size; person += 1) {
    const x = opinion[person]!;
    sum += x;
    conviction += Math.abs(x);
    if (x > 0) positive += 1;
  }

  let cross = 0;
  const neighbourSum = new Float64Array(size);
  const neighbourCount = new Float64Array(size);
  for (const contact of network.contacts) {
    const a = opinion[contact.source]!;
    const b = opinion[contact.target]!;
    if (Math.sign(a) !== Math.sign(b)) cross += 1;
    neighbourSum[contact.source]! += b;
    neighbourCount[contact.source]! += 1;
    neighbourSum[contact.target]! += a;
    neighbourCount[contact.target]! += 1;
  }

  // Correlation between own opinion and the mean opinion of recent contacts.
  let n = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let person = 0; person < size; person += 1) {
    if (neighbourCount[person] === 0) continue;
    const x = opinion[person]!;
    const y = neighbourSum[person]! / neighbourCount[person]!;
    n += 1;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  const covariance = sxy / Math.max(1, n) - (sx / Math.max(1, n)) * (sy / Math.max(1, n));
  const spreadX = sxx / Math.max(1, n) - (sx / Math.max(1, n)) ** 2;
  const spreadY = syy / Math.max(1, n) - (sy / Math.max(1, n)) ** 2;
  const echo = spreadX > 1e-12 && spreadY > 1e-12 ? covariance / Math.sqrt(spreadX * spreadY) : 0;

  return {
    alignment: Math.abs(sum) / Math.max(1e-9, conviction),
    meanConviction: conviction / Math.max(1, size),
    positive: positive / Math.max(1, size),
    crossContacts: cross / Math.max(1, network.contacts.length),
    echo,
  };
}
