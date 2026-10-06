// One window's society in continuous time. It replaces the earlier discrete
// Davidsen–Ebel–Bornholdt updates, in which a tie or a person existed or did
// not and every event changed the picture in one step.
//
// Here nothing that is drawn or felt is binary:
// - every tie has a strength w in [0, 1] that is integrated every frame:
//     dw/dt = RHO · (spark + support) · (1 − w) − DELTA · (1 + load²) · w
//   `spark` is a newly met tie's own impulse, decaying over SPARK seconds;
//   `support` is the tie's embeddedness, Σ_k w_ik · w_kj over shared
//   acquaintances (continuous triadic closure, as in weighted social network
//   models after Kumpula et al. 2007); `load` is the two people's mean
//   summed strength over CAPACITY, a limited attention whose quadratic cost
//   keeps the network sparse. A tie no triangle holds therefore fades by
//   itself; a tie inside a cluster holds.
// - every person has a presence p in [0, 1]: rising over ARRIVE seconds after
//   arrival, falling over DEPART seconds after they begin to leave. A tie's
//   effective weight is w · p_a · p_b, so a leaving person's ties thin out with
//   them instead of vanishing.
// - events are only the moments new ties start, at strength 0, as Poisson
//   processes in seconds (introductions after DEB: a person introduces two
//   acquaintances, chosen in proportion to strength; one with fewer meets a
//   stranger), and the moments people begin to leave. An event therefore
//   changes nothing visible at once; everything after it is integrated.
//
// Across windows: ties to people in another window follow the same law, their
// support being how near the windows are (0–1) and their effective weight
// carrying the other person's presence as last shared.

export type Person = { readonly id: number; x: number; y: number; vx: number; vy: number; presence: number; leaving: boolean; age: number };
export type Tie = { readonly a: number; readonly b: number; w: number; spark: number };
export type CrossTie = { readonly mine: number; readonly window: number; readonly node: number; w: number; spark: number };
/** What this window knows of another: its people and their presence, and how near it is (0–1). */
export type Partner = { readonly window: number; readonly nodes: ReadonlyMap<number, number>; readonly strength: number };

export type Society = {
  readonly people: Map<number, Person>;
  /** Local ties keyed a · KEY + b with a < b. */
  readonly ties: Map<number, Tie>;
  readonly adjacent: Map<number, Set<number>>;
  /** Ties across windows keyed by crossKey. */
  readonly cross: Map<number, CrossTie>;
  /** Summed effective strength per person, refreshed every step. */
  readonly load: Map<number, number>;
  readonly size: number;
  nextId: number;
  time: number;
  readonly random: () => number;
};

export const KEY = 2 ** 20;
const tieKey = (a: number, b: number) => (a < b ? a * KEY + b : b * KEY + a);
export const crossKey = (mine: number, window: number, node: number) => (mine * 4096 + window) * KEY + node;

/** Seconds. */
export const ARRIVE = 1.6;
export const DEPART = 2.4;
const SPARK = 5;
/** Growth and decay rates per second. */
const RHO = 0.5;
const DELTA = 0.25;
/** Summed strength a person can hold before ties start to cost. */
const CAPACITY = 3;
/** Introductions per person per second. */
export const MEETING = 0.06;
/** Ties below this, without spark, are forgotten (they are invisible by then). */
const FORGET = 0.01;
/** Chance per stranger meeting, at full nearness, that the stranger lives in the nearest window. */
export const CROSS_STRANGER = 0.25;
/** Meetings across windows per person per second at full nearness, whatever a person's acquaintances. */
export const CROSS_CONTACT = 0.008;
/** Extra decay of ties across windows as the windows part. */
const CROSS_FAR = 6;

export function seededRandom(seed: number) {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
}

/** A tie's strength as drawn and felt: its own strength carried by both people's presence. */
export const effective = (society: Society, tie: Tie) => tie.w * (society.people.get(tie.a)?.presence ?? 0) * (society.people.get(tie.b)?.presence ?? 0);
export const effectiveCross = (society: Society, tie: CrossTie, partners: readonly Partner[]) =>
  tie.w * (society.people.get(tie.mine)?.presence ?? 0) * (partners.find((p) => p.window === tie.window)?.nodes.get(tie.node) ?? 0);

function arrive(society: Society, width: number, height: number, presence: number) {
  const id = society.nextId++;
  // A newcomer appears beside someone already there, with no presence yet.
  let near: Person | undefined;
  let seen = 0;
  for (const person of society.people.values()) if (!person.leaving && society.random() * ++seen < 1) near = person;
  const angle = society.random() * Math.PI * 2;
  const spread = 0.04 * Math.min(width, height);
  const x = near ? near.x + Math.cos(angle) * spread : width * (0.25 + 0.5 * society.random());
  const y = near ? near.y + Math.sin(angle) * spread : height * (0.25 + 0.5 * society.random());
  society.people.set(id, { id, x: Math.min(width, Math.max(0, x)), y: Math.min(height, Math.max(0, y)), vx: 0, vy: 0, presence, leaving: false, age: 0 });
  society.adjacent.set(id, new Set());
}

export function createSociety(size: number, seed: number, width: number, height: number): Society {
  const society: Society = { people: new Map(), ties: new Map(), adjacent: new Map(), cross: new Map(), load: new Map(), size, nextId: 0, time: 0, random: seededRandom(seed) };
  for (let i = 0; i < size; i++) arrive(society, width, height, 1);
  return society;
}

function meet(society: Society, a: number, b: number) {
  const key = tieKey(a, b);
  const tie = society.ties.get(key);
  if (tie) { tie.spark = 1; return; }
  society.ties.set(key, a < b ? { a, b, w: 0, spark: 1 } : { a: b, b: a, w: 0, spark: 1 });
  society.adjacent.get(a)!.add(b);
  society.adjacent.get(b)!.add(a);
}

function meetAcross(society: Society, mine: number, window: number, node: number) {
  const key = crossKey(mine, window, node);
  const tie = society.cross.get(key);
  if (tie) tie.spark = 1;
  else society.cross.set(key, { mine, window, node, w: 0, spark: 1 });
}

function forgetTie(society: Society, key: number, tie: Tie) {
  society.ties.delete(key);
  society.adjacent.get(tie.a)?.delete(tie.b);
  society.adjacent.get(tie.b)?.delete(tie.a);
}

function nearestOf(partners: readonly Partner[]) {
  let best: Partner | undefined;
  for (const partner of partners) if (partner.nodes.size && (!best || partner.strength > best.strength)) best = partner;
  return best;
}

function pickNode(partner: Partner, random: () => number) {
  let chosen = -1;
  let total = 0;
  for (const [node, presence] of partner.nodes) {
    total += presence;
    if (presence > 0 && random() * total < presence) chosen = node;
  }
  return chosen;
}

/** One introduction by `id`, after DEB. */
function introduce(society: Society, id: number, partners: readonly Partner[]) {
  const random = society.random;
  // Acquaintances, local and across, chosen in proportion to their strength.
  type Option = { local: number; weight: number } | { cross: CrossTie; weight: number };
  const options: Option[] = [];
  for (const other of society.adjacent.get(id)!) {
    const weight = effective(society, society.ties.get(tieKey(id, other))!);
    if (weight > 0.1) options.push({ local: other, weight });
  }
  for (const tie of society.cross.values()) {
    if (tie.mine !== id) continue;
    const weight = effectiveCross(society, tie, partners);
    if (weight > 0.1) options.push({ cross: tie, weight });
  }
  const draw = (from: Option[]) => {
    let total = 0;
    for (const option of from) total += option.weight;
    let r = random() * total;
    for (const option of from) if ((r -= option.weight) <= 0) return option;
    return from[from.length - 1];
  };
  if (options.length >= 2) {
    const first = draw(options);
    const second = draw(options.filter((option) => option !== first));
    if ('local' in first && 'local' in second) meet(society, first.local, second.local);
    else if ('local' in first !== 'local' in second) {
      const mine = 'local' in first ? first.local : (second as { local: number }).local;
      const there = 'cross' in first ? first.cross : (second as { cross: CrossTie }).cross;
      const strength = partners.find((partner) => partner.window === there.window)?.strength ?? 0;
      if (random() < strength) meetAcross(society, mine, there.window, there.node);
    }
    return;
  }
  const nearest = nearestOf(partners);
  if (nearest && random() < nearest.strength * CROSS_STRANGER) {
    const node = pickNode(nearest, random);
    if (node >= 0) { meetAcross(society, id, nearest.window, node); return; }
  }
  let stranger = -1;
  let seen = 0;
  const known = society.adjacent.get(id)!;
  for (const person of society.people.values()) {
    if (person.id === id || person.leaving || known.has(person.id)) continue;
    if (random() * ++seen < 1) stranger = person.id;
  }
  if (stranger >= 0) meet(society, id, stranger);
}

/**
 * Advances the society by `delta` seconds. `turnover` is the chance per person
 * per second of beginning to leave; a newcomer arrives as someone begins to go.
 */
export function step(society: Society, delta: number, partners: readonly Partner[], turnover: number, width: number, height: number) {
  const dt = Math.min(delta, 1 / 20);
  society.time += dt;
  const random = society.random;

  // Presence, departures and arrivals.
  let arrivals = 0;
  for (const person of society.people.values()) {
    person.age += dt;
    if (person.leaving) person.presence = Math.max(0, person.presence - dt / DEPART);
    else {
      person.presence = Math.min(1, person.presence + dt / ARRIVE);
      if (random() < turnover * dt) { person.leaving = true; arrivals++; }
    }
  }
  for (const person of [...society.people.values()]) {
    if (!person.leaving || person.presence > 0) continue;
    for (const other of society.adjacent.get(person.id) ?? []) forgetTie(society, tieKey(person.id, other), society.ties.get(tieKey(person.id, other))!);
    for (const [key, tie] of society.cross) if (tie.mine === person.id) society.cross.delete(key);
    society.people.delete(person.id);
    society.adjacent.delete(person.id);
    society.load.delete(person.id);
  }
  for (; arrivals > 0; arrivals--) arrive(society, width, height, 0);

  // Introductions.
  for (const person of society.people.values()) {
    if (!person.leaving && person.presence > 0.5 && random() < MEETING * dt) introduce(society, person.id, partners);
  }
  const nearest = nearestOf(partners);
  if (nearest) {
    for (const person of society.people.values()) {
      if (person.leaving || random() >= nearest.strength * CROSS_CONTACT * dt) continue;
      const node = pickNode(nearest, random);
      if (node >= 0) meetAcross(society, person.id, nearest.window, node);
    }
  }

  // Load: each person's summed effective strength.
  society.load.clear();
  const add = (id: number, weight: number) => society.load.set(id, (society.load.get(id) ?? 0) + weight);
  for (const tie of society.ties.values()) { const weight = effective(society, tie); add(tie.a, weight); add(tie.b, weight); }
  for (const tie of society.cross.values()) add(tie.mine, effectiveCross(society, tie, partners));

  // Strengths.
  const fade = Math.exp(-dt / SPARK);
  for (const [key, tie] of society.ties) {
    const a = society.adjacent.get(tie.a)!;
    const b = society.adjacent.get(tie.b)!;
    const [small, large] = a.size < b.size ? [a, b] : [b, a];
    const [from, to] = a.size < b.size ? [tie.a, tie.b] : [tie.b, tie.a];
    let support = 0;
    for (const k of small) {
      if (!large.has(k)) continue;
      support += effective(society, society.ties.get(tieKey(from, k))!) * effective(society, society.ties.get(tieKey(to, k))!);
    }
    const load = ((society.load.get(tie.a) ?? 0) + (society.load.get(tie.b) ?? 0)) / (2 * CAPACITY);
    tie.w += (RHO * (tie.spark + Math.min(1, support)) * (1 - tie.w) - DELTA * (1 + load * load) * tie.w) * dt;
    tie.spark *= fade;
    if (tie.w < FORGET && tie.spark < 0.05) forgetTie(society, key, tie);
  }
  for (const [key, tie] of society.cross) {
    const partner = partners.find((candidate) => candidate.window === tie.window);
    const strength = partner?.strength ?? 0;
    const there = partner?.nodes.get(tie.node) ?? 0;
    const load = (society.load.get(tie.mine) ?? 0) / CAPACITY;
    tie.w += (RHO * (tie.spark + 0.5 * strength) * there * (1 - tie.w) - DELTA * (1 + load * load + CROSS_FAR * (1 - strength)) * tie.w) * dt;
    tie.spark *= fade;
    if ((tie.w < FORGET && tie.spark < 0.05) || (tie.w < FORGET && there === 0)) society.cross.delete(key);
  }
}
