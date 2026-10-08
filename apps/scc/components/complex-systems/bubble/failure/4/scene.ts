// The drawn foam: network → packing → bubbles on screen. Pure TypeScript
// (measured in Node); the component only paces frames and hands the arrays
// to the renderer.
//
// Every frame: the network steps; the packing's radii re-converge from
// their previous values (Collins–Stephenson) under a free, rounded frame;
// centres are laid out and the raft is fitted inside the screen with a
// margin of black; drawn bubbles follow their packing circles with
// critically damped springs, so swaps, births and coalescences move
// continuously. Removed bubbles stay as ghosts while they shrink. Along
// the links with the strongest net flow, small portions bud at the wall
// and cross it from source to target, each link at its own period.

import { BUBBLE_FLOATS, FACE_K, SLOT_FLOATS, SLOTS } from "./foam.ts";
import {
  CAPACITY,
  createNetwork,
  DAMPING,
  degree,
  edgeKey,
  growInto,
  type Network,
  type NetworkEvent,
  type NetworkParameters,
  OMEGA,
  stepNetwork,
} from "./network.ts";
import { createPacking, fitRaft, layoutCentres, type Packing, type RaftFit, shapeFrame, solveRadii, soddyRadius, toScreen } from "./packing.ts";

/** Collins–Stephenson sweeps per frame (warm start). */
const SWEEPS = 12;
/** Spring rate of drawn bubbles (rad/s, critically damped). */
const SPRING = 1.8;
/** Bubbles younger than this are not yet asked to vanish. */
const GRACE = 8;
/** A bubble whose packing radius is below this (CSS px) vanishes (T2). */
const VISIBLE = 2;
/** A swapped wall stays in the lists while the geometry catches up. */
const LINGER = 2.5;
/** The frame is reshaped (and its aspect corrected) this often (s). */
const SHAPE_EVERY = 0.2;
/** Black margin round the raft, as a share of the screen. */
const MARGIN = 0.035;
/** Free-face radius over packing radius. */
const FACE_SCALE = Math.sqrt(1 + FACE_K) + 0.02;
/** Transfers: ids after the network's, at most this many at once. */
export const PORTIONS = 14;
export const RENDER_CAPACITY = CAPACITY + PORTIONS;
/** Net flow (over the mean link flux) a link needs to carry visible portions. */
const PORTION_FLOW = 0.6;
const PORTION_PERIOD = [3.5, 7] as const;
/** A burst wall thins away over this long before the two bubbles are one (s). */
const BURST = 0.25;
/** After a merge the film settles for this long (s). */
const SETTLE = 1;

export type SceneParameters = NetworkParameters & { traffic: boolean };

type Transfer = { from: number; to: number; start: number; period: number; size: number; fade: number; slot: number };

export type Scene = {
  net: Network;
  packing: Packing;
  /** Drawn state per id (CSS px). */
  x: Float64Array;
  y: Float64Array;
  r: Float64Array;
  vx: Float64Array;
  vy: Float64Array;
  vr: Float64Array;
  /** Packing targets per id (CSS px). */
  tx: Float64Array;
  ty: Float64Array;
  tr: Float64Array;
  seed: Float64Array;
  born: Float64Array;
  /** A ghost's bubble (id) after a burst, −1 otherwise. */
  alias: Int32Array;
  ghost: Uint8Array;
  /** A vanished ghost's last walls. */
  ghostWalls: Map<number, readonly number[]>;
  linger: Map<number, number>;
  small: Uint8Array;
  time: number;
  frame: number;
  /** Time not yet given to the network. */
  networkTime: number;
  shapeClock: number;
  fit: RaftFit | null;
  width: number;
  height: number;
  focus: number | null;
  transfers: Map<number, Transfer>;
  /** Changes whenever a transfer starts or ends. */
  transferVersion: number;
  /** When each burst ghost merged, and when each kept bubble last merged. */
  burstAt: Map<number, number>;
  mergedAt: Float64Array;
  /** Portion state per transfer slot (CSS px). */
  portion: { x: Float64Array; y: Float64Array; r: Float64Array; vx: Float64Array; vy: Float64Array };
  /** Times of recent events, for the summary. */
  history: { kind: NetworkEvent["kind"]; at: number }[];
  /** Ids in use are below this (portions included). */
  count: number;
};

function random01(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43_758.5453;
  return value - Math.floor(value);
}

/** Reshapes the frame and nudges its aspect toward the screen's. */
function reshape(scene: Scene, gain: number) {
  const { net, packing } = scene;
  shapeFrame(net, packing, scene.time);
  layoutCentres(net, packing);
  const fit = fitRaft(net, packing, FACE_SCALE, scene.fit?.angle ?? 0);
  const error = Math.log(fit.width / fit.height / (scene.width / scene.height));
  packing.share = Math.min(0.45, Math.max(0.2, packing.share - gain * error));
  return error;
}

export function createScene(width: number, height: number, target: number, seed = 0x4b0e): Scene {
  const net = createNetwork(seed, target, width / height);
  const packing = createPacking();
  const array = () => new Float64Array(CAPACITY);
  const slotArray = () => new Float64Array(PORTIONS);
  const scene: Scene = {
    net,
    packing,
    x: array(),
    y: array(),
    r: array(),
    vx: array(),
    vy: array(),
    vr: array(),
    tx: array(),
    ty: array(),
    tr: array(),
    seed: array(),
    born: array().fill(-GRACE),
    alias: new Int32Array(CAPACITY).fill(-1),
    ghost: new Uint8Array(CAPACITY),
    ghostWalls: new Map(),
    linger: new Map(),
    small: new Uint8Array(CAPACITY),
    time: 0,
    frame: 0,
    networkTime: 0,
    shapeClock: 0,
    fit: null,
    width,
    height,
    focus: null,
    transfers: new Map(),
    transferVersion: 0,
    burstAt: new Map(),
    mergedAt: array().fill(-1e9),
    portion: { x: slotArray(), y: slotArray(), r: slotArray(), vx: slotArray(), vy: slotArray() },
    history: [],
    count: CAPACITY,
  };
  for (let v = 0; v < CAPACITY; v += 1) scene.seed[v] = random01(v + 1);
  // Converge from cold, shaping the frame to the screen, before the first frame.
  solveRadii(net, packing, 20_000, 1e-7);
  for (let round = 0; round < 60; round += 1) {
    const error = reshape(scene, 0.05);
    solveRadii(net, packing, 3_000, 1e-7);
    if (round > 3 && Math.abs(error) < 0.01) break;
  }
  updateTargets(scene);
  for (let v = 1; v < CAPACITY; v += 1) {
    scene.x[v] = scene.tx[v]!;
    scene.y[v] = scene.ty[v]!;
    scene.r[v] = scene.tr[v]!;
  }
  return scene;
}

/** Packing → screen targets (x, y, r per id). */
function updateTargets(scene: Scene) {
  const { net, packing } = scene;
  layoutCentres(net, packing);
  const fit = fitRaft(net, packing, FACE_SCALE, scene.fit?.angle ?? 0);
  scene.fit = fit;
  for (let v = 1; v < CAPACITY; v += 1) {
    if (!net.alive[v]) {
      scene.tr[v] = 0;
      continue;
    }
    const at = toScreen(fit, scene.width, scene.height, MARGIN, packing.x[v]!, packing.y[v]!);
    scene.tx[v] = at.x;
    scene.ty[v] = at.y;
    scene.tr[v] = packing.radius[v]! * at.scale;
  }
}

/** Keeps the drawn foam in place when the screen changes size. */
export function resizeScene(scene: Scene, width: number, height: number) {
  if (width === scene.width && height === scene.height) return;
  const sx = width / scene.width;
  const sy = height / scene.height;
  const scale = Math.min(sx, sy);
  for (let v = 0; v < CAPACITY; v += 1) {
    scene.x[v] = scene.x[v]! * sx;
    scene.y[v] = scene.y[v]! * sy;
    scene.r[v] = scene.r[v]! * scale;
  }
  scene.width = width;
  scene.height = height;
}

function handle(scene: Scene, event: NetworkEvent) {
  const { packing } = scene;
  scene.history.push({ kind: event.kind, at: scene.time });
  if (event.kind === "birth") {
    const v = event.vertex;
    const [a, b, c] = event.face;
    if (a === OMEGA) {
      packing.radius[v] = (packing.radius[b]! + packing.radius[c]!) / 4;
      scene.x[v] = (scene.x[b]! + scene.x[c]!) / 2;
      scene.y[v] = (scene.y[b]! + scene.y[c]!) / 2;
    } else {
      packing.radius[v] = soddyRadius(packing.radius[a]!, packing.radius[b]!, packing.radius[c]!);
      // Born in the junction: the interstice, weighted toward the smaller bubbles.
      let wx = 0;
      let wy = 0;
      let total = 0;
      for (const w of [a, b, c]) {
        const weight = 1 / Math.max(scene.r[w]!, 0.5);
        wx += scene.x[w]! * weight;
        wy += scene.y[w]! * weight;
        total += weight;
      }
      scene.x[v] = wx / total;
      scene.y[v] = wy / total;
    }
    scene.r[v] = 0;
    scene.vx[v] = 0;
    scene.vy[v] = 0;
    scene.vr[v] = 0;
    scene.born[v] = scene.time;
    scene.alias[v] = -1;
    scene.ghost[v] = 0;
    scene.ghostWalls.delete(v);
    scene.seed[v] = random01(scene.time * 97 + v);
  } else if (event.kind === "merge") {
    scene.ghost[event.removed] = 1;
    scene.alias[event.removed] = event.kept;
    scene.burstAt.set(event.removed, scene.time);
    scene.mergedAt[event.kept] = scene.time;
    if (scene.focus === event.removed) scene.focus = event.kept;
  } else if (event.kind === "vanish") {
    scene.ghost[event.vertex] = 1;
    scene.alias[event.vertex] = -1;
    scene.ghostWalls.set(event.vertex, event.around);
    if (scene.focus === event.vertex) scene.focus = null;
  } else {
    scene.linger.set(edgeKey(event.from[0], event.from[1]), scene.time + LINGER);
  }
}

/** Advances the scene; `still` (reduced motion) holds the network and snaps the springs. */
export function stepScene(scene: Scene, seconds: number, parameters: SceneParameters, still: boolean) {
  const { net, packing } = scene;
  scene.time += seconds;
  scene.frame += 1;
  // The network steps on odd frames (over both frames' time), the packing re-converges on even ones.
  scene.networkTime += seconds;
  if (!still && scene.frame % 2 === 1) {
    const events = stepNetwork(net, scene.networkTime, parameters, packing.radius, scene.small);
    for (const event of events) handle(scene, event);
  }
  if (scene.frame % 2 === 1) scene.networkTime = 0;
  scene.shapeClock += seconds;
  // Reduced motion holds the frame's shape too (its wobble is autonomous).
  if (scene.shapeClock >= SHAPE_EVERY && !still) {
    scene.shapeClock = 0;
    reshape(scene, 0.01);
  }
  // The packing re-converges and is laid out every other frame; the springs carry the drawn bubbles between.
  if (scene.frame % 2 === 0 || still) {
    solveRadii(net, packing, SWEEPS, 2e-5);
    updateTargets(scene);
  }

  // Springs (exact critically damped update for a step of `seconds`).
  const w = SPRING;
  const decay = Math.exp(-w * seconds);
  const follow = (position: Float64Array, velocity: Float64Array, target: Float64Array, v: number) => {
    const offset = position[v]! - target[v]!;
    const rate = velocity[v]! + w * offset;
    position[v] = target[v]! + (offset + rate * seconds) * decay;
    velocity[v] = (velocity[v]! - w * rate * seconds) * decay;
  };
  let count = 1;
  for (let v = 1; v < CAPACITY; v += 1) {
    if (net.alive[v]) {
      if (still) {
        scene.x[v] = scene.tx[v]!;
        scene.y[v] = scene.ty[v]!;
        scene.r[v] = scene.tr[v]!;
        scene.vx[v] = scene.vy[v] = scene.vr[v] = 0;
      } else {
        follow(scene.x, scene.vx, scene.tx, v);
        follow(scene.y, scene.vy, scene.ty, v);
        follow(scene.r, scene.vr, scene.tr, v);
      }
      scene.small[v] = scene.time - scene.born[v]! > GRACE && scene.tr[v]! < VISIBLE ? 1 : 0;
      count = v + 1;
    } else if (scene.ghost[v]) {
      // Ghosts shrink in place.
      const bursting = scene.time - (scene.burstAt.get(v) ?? -1e9) < BURST;
      // A burst bubble keeps its size while its wall thins away, then its film retracts into the merged bubble.
      scene.r[v] = still ? 0 : bursting ? scene.r[v]! : scene.r[v]! * Math.exp(-5 * seconds) - 3 * seconds;
      scene.vx[v] = scene.vy[v] = 0;
      if (scene.r[v]! <= 0.05) {
        scene.r[v] = 0;
        scene.ghost[v] = 0;
        scene.alias[v] = -1;
        scene.ghostWalls.delete(v);
        scene.burstAt.delete(v);
      } else count = v + 1;
    } else scene.r[v] = 0;
    if (!net.alive[v]) scene.small[v] = 0;
  }
  const portions = stepTransfers(scene, seconds, parameters.traffic && !still);
  scene.count = portions > 0 ? CAPACITY + portions : count;
  for (const [key, until] of scene.linger) if (until < scene.time) scene.linger.delete(key);
  while (scene.history.length > 0 && scene.history[0]!.at < scene.time - 60) scene.history.shift();
}

/** Net flow a → b along a link (random walk with restart), over the mean link flux. */
function netFlow(net: Network, a: number, b: number) {
  return (DAMPING * (net.rank[a]! / degree(net, a) - net.rank[b]! / degree(net, b))) / (net.meanFlux || 1);
}

const easeInOut = (t: number) => t * t * (3 - 2 * t);

/**
 * Directed transfers. A link whose net flow is strong carries portions:
 * each buds from the source bubble at the wall, crosses it and is taken in
 * by the target, on the link's own period. Returns the highest slot used + 1.
 */
function stepTransfers(scene: Scene, seconds: number, active: boolean) {
  const { net, transfers, portion } = scene;
  const used = new Set<number>();
  for (const [key, transfer] of transfers) {
    const linked = net.alive[transfer.from] && net.alive[transfer.to] && net.edges.has(key);
    if (!active || !linked) transfer.fade = Math.max(0, transfer.fade - 4 * seconds);
    let cycle = (scene.time - transfer.start) / transfer.period;
    if (cycle >= 1) {
      const flow = linked ? netFlow(net, transfer.from, transfer.to) : 0;
      if (active && linked && flow > PORTION_FLOW * 0.8) {
        transfer.start += transfer.period * Math.floor(cycle);
        transfer.size = flow;
        cycle -= Math.floor(cycle);
      } else {
        transfers.delete(key);
        portion.r[transfer.slot] = 0;
        scene.transferVersion += 1;
        continue;
      }
    }
    if (transfer.fade <= 0) {
      transfers.delete(key);
      portion.r[transfer.slot] = 0;
      scene.transferVersion += 1;
      continue;
    }
    used.add(transfer.slot);
  }
  // New transfers start at the beginning of their cycle (radius 0): nothing pops in.
  if (active && Math.floor(scene.time / 0.25) !== Math.floor((scene.time - seconds) / 0.25)) {
    const candidates: [number, number, number][] = [];
    for (const key of net.edges.keys()) {
      if (transfers.has(key)) continue;
      const a = Math.floor(key / CAPACITY);
      const b = key % CAPACITY;
      const flow = netFlow(net, a, b);
      if (Math.abs(flow) > PORTION_FLOW) candidates.push(flow > 0 ? [a, b, flow] : [b, a, -flow]);
    }
    candidates.sort((p, q) => q[2] - p[2]);
    for (const [from, to, flow] of candidates) {
      if (transfers.size >= PORTIONS) break;
      let slot = 0;
      while (used.has(slot)) slot += 1;
      used.add(slot);
      const key = edgeKey(from, to);
      const period = PORTION_PERIOD[0] + (PORTION_PERIOD[1] - PORTION_PERIOD[0]) * random01(key * 0.37);
      transfers.set(key, { from, to, start: scene.time, period, size: flow, fade: 1, slot });
      scene.transferVersion += 1;
    }
  }
  let highest = 0;
  for (const transfer of transfers.values()) {
    const { from, to, slot } = transfer;
    const cycle = Math.min(1, (scene.time - transfer.start) / transfer.period);
    const dx = scene.x[to]! - scene.x[from]!;
    const dy = scene.y[to]! - scene.y[from]!;
    const distance = Math.hypot(dx, dy) || 1;
    const ra = scene.r[from]!;
    const rb = scene.r[to]!;
    const ux = dx / distance;
    const uy = dy / distance;
    // The contact point of the two bubbles.
    const cx = scene.x[from]! + dx * (ra / Math.max(ra + rb, 1e-6));
    const cy = scene.y[from]! + dy * (ra / Math.max(ra + rb, 1e-6));
    // A portion of mass the size of a small bubble: it necks off inside the source, squeezes through the
    // wall and is taken in well inside the target.
    const largest = Math.min(18, Math.max(4, 0.45 * Math.min(ra, rb))) * (0.7 + 0.3 * Math.min(1, transfer.size / (3 * PORTION_FLOW)));
    const travel = (-1.8 + 3.6 * easeInOut(cycle)) * largest;
    const x = cx + ux * travel;
    const y = cy + uy * travel;
    if (seconds > 0 && portion.r[slot]! > 0) {
      portion.vx[slot] = (x - portion.x[slot]!) / seconds;
      portion.vy[slot] = (y - portion.y[slot]!) / seconds;
    } else {
      portion.vx[slot] = 0;
      portion.vy[slot] = 0;
    }
    portion.x[slot] = x;
    portion.y[slot] = y;
    portion.r[slot] = largest * Math.min(1, 2.2 * Math.sin(Math.PI * cycle)) ** 1.5 * transfer.fade;
    highest = Math.max(highest, slot + 1);
  }
  return highest;
}

const walls = Array.from({ length: RENDER_CAPACITY }, () => new Set<number>());
/** Wall lists are rebuilt when the topology or the transfers change, and every few frames for transient contacts. */
let wallsChanged = true;
let wallsFor: { scene: Scene | null; version: number; transfers: number; frames: number } = { scene: null, version: -1, transfers: -1, frames: 0 };

function burstAge(scene: Scene, v: number) {
  return scene.time - (scene.burstAt.get(v) ?? -1e9);
}

function drawn(scene: Scene, v: number) {
  if (v >= CAPACITY) return scene.portion.r[v - CAPACITY]! > 0;
  return scene.r[v]! > 0 && (scene.net.alive[v] === 1 || scene.ghost[v] === 1);
}

/**
 * Wall lists: graph neighbours, swapped walls still in contact, ghosts'
 * walls, transient contacts among second neighbours, and each portion's
 * two bubbles.
 */
export function wallLists(scene: Scene, reuse = false) {
  const { net } = scene;
  wallsChanged = true;
  const bursting = [...scene.burstAt.values()].some((at) => scene.time - at < BURST + 0.05);
  if (reuse && !bursting && wallsFor.scene === scene && wallsFor.version === net.version && wallsFor.transfers === scene.transferVersion && wallsFor.frames < 6) {
    wallsFor.frames += 1;
    wallsChanged = false;
    return walls;
  }
  wallsFor = { scene, version: net.version, transfers: scene.transferVersion, frames: 0 };
  const bubbles = Math.min(scene.count, CAPACITY);
  for (let v = 0; v < scene.count; v += 1) walls[v]!.clear();
  const link = (a: number, b: number) => {
    if (a === b || a === OMEGA || b === OMEGA || !drawn(scene, a) || !drawn(scene, b)) return;
    walls[a]!.add(b);
    walls[b]!.add(a);
  };
  for (let v = 1; v < bubbles; v += 1) {
    if (!net.alive[v]) continue;
    for (const w of net.rot[v]!) if (w > v) link(v, w);
  }
  for (const key of scene.linger.keys()) link(Math.floor(key / CAPACITY), key % CAPACITY);
  for (let v = 1; v < bubbles; v += 1) {
    if (!scene.ghost[v] || scene.r[v]! <= 0) continue;
    const around = scene.alias[v]! >= 0 ? net.rot[scene.alias[v]!]! : (scene.ghostWalls.get(v) ?? []);
    for (const w of around) link(v, w);
    if (scene.alias[v]! >= 0 && burstAge(scene, v) < BURST) link(v, scene.alias[v]!);
  }
  // Drawn discs of second neighbours that touch while the geometry moves.
  for (let v = 1; v < bubbles; v += 1) {
    if (!net.alive[v]) continue;
    for (const w of net.rot[v]!) {
      if (w === OMEGA) continue;
      for (const x of net.rot[w]!) {
        if (x <= v || x === OMEGA || walls[v]!.has(x)) continue;
        const reach = scene.r[v]! + scene.r[x]!;
        const dx = scene.x[v]! - scene.x[x]!;
        const dy = scene.y[v]! - scene.y[x]!;
        if (dx * dx + dy * dy < reach * reach) link(v, x);
      }
    }
  }
  for (const transfer of scene.transfers.values()) {
    const p = CAPACITY + transfer.slot;
    link(p, transfer.from);
    link(p, transfer.to);
  }
  return walls;
}

/**
 * Writes the renderer's per-bubble data (ids from 0 to scene.count) and,
 * when the wall lists changed, the wall slots. Returns whether they did.
 */
export function fillRenderer(scene: Scene, bubbles: Float32Array, slots: Float32Array) {
  const { net } = scene;
  const lists = wallLists(scene, true);
  const listsChanged = wallsChanged;
  for (let v = 0; v < scene.count; v += 1) {
    const at = v * BUBBLE_FLOATS;
    const visible = drawn(scene, v);
    if (v >= CAPACITY) {
      const slot = v - CAPACITY;
      bubbles[at] = scene.portion.x[slot]!;
      bubbles[at + 1] = scene.portion.y[slot]!;
      bubbles[at + 2] = visible ? scene.portion.r[slot]! : 0;
      bubbles[at + 3] = 0;
      bubbles[at + 4] = scene.portion.vx[slot]!;
      bubbles[at + 5] = scene.portion.vy[slot]!;
      bubbles[at + 6] = random01(slot + 7);
      bubbles[at + 7] = 0;
    } else {
      bubbles[at] = scene.x[v]!;
      bubbles[at + 1] = scene.y[v]!;
      bubbles[at + 2] = visible ? scene.r[v]! : 0;
      // Group (alias + 1, or 0 for itself), plus .5 when focused.
      const merged = scene.ghost[v] && scene.alias[v]! >= 0 && burstAge(scene, v) >= BURST;
      bubbles[at + 3] = (merged ? scene.alias[v]! + 1 : 0) + (scene.focus === v ? 0.5 : 0);
      bubbles[at + 4] = scene.vx[v]!;
      bubbles[at + 5] = scene.vy[v]!;
      bubbles[at + 6] = scene.seed[v]!;
      bubbles[at + 7] = scene.ghost[v] && scene.alias[v]! >= 0 ? 1 : Math.max(0, 1 - (scene.time - scene.mergedAt[v]!) / SETTLE);
    }
    if (!listsChanged) continue;
    const base = v * SLOTS * SLOT_FLOATS;
    let slot = 0;
    for (const w of lists[v]!) {
      if (slot >= SLOTS) break;
      const edge = v < CAPACITY && w < CAPACITY ? net.edges.get(edgeKey(v, w)) : undefined;
      const s = base + slot * SLOT_FLOATS;
      // A bursting wall (ghost and the bubble it merges with) thins to nothing.
      const burstGhost = v < CAPACITY && scene.alias[v] === w ? v : w < CAPACITY && scene.alias[w] === v ? w : -1;
      const film = burstGhost >= 0 ? 0.25 * Math.max(0, 1 - burstAge(scene, burstGhost) / BURST) : (edge?.film ?? 1);
      slots[s] = w + 1;
      slots[s + 1] = film;
      slots[s + 2] = edge?.flux ?? 1;
      slots[s + 3] = 0;
      slot += 1;
    }
    if (slot < SLOTS) slots[base + slot * SLOT_FLOATS] = 0;
  }
  return listsChanged;
}

/** The bubble at a CSS point (smallest f), or null. */
export function bubbleAt(scene: Scene, cssX: number, cssY: number) {
  const ux = cssX;
  const uy = cssY;
  let best: number | null = null;
  let bestF = Infinity;
  for (let v = 1; v < scene.count; v += 1) {
    if (!scene.net.alive[v] || scene.r[v]! <= 0) continue;
    const dx = ux - scene.x[v]!;
    const dy = uy - scene.y[v]!;
    const f = (dx * dx + dy * dy - scene.r[v]! ** 2) / scene.r[v]!;
    if (f < bestF) {
      bestF = f;
      best = v;
    }
  }
  return best;
}

/**
 * A tap: inside a bubble's middle it focuses that bubble's walls (or
 * clears the focus); nearer its walls it inserts a bubble into the
 * junction (face) closest to the tap.
 */
export function tapScene(scene: Scene, cssX: number, cssY: number) {
  const a = bubbleAt(scene, cssX, cssY);
  if (a === null) return null;
  const ux = cssX;
  const uy = cssY;
  const fromCentre = Math.hypot(ux - scene.x[a]!, uy - scene.y[a]!);
  if (fromCentre < 0.55 * scene.r[a]!) {
    scene.focus = scene.focus === a ? null : a;
    return { kind: "focus" as const, bubble: a };
  }
  const list = scene.net.rot[a]!;
  let best: [number, number, number] | null = null;
  let bestDistance = Infinity;
  for (let i = 0; i < list.length; i += 1) {
    const w = list[i]!;
    const x = list[(i + 1) % list.length]!;
    if (w === OMEGA || x === OMEGA) continue;
    let px = 0;
    let py = 0;
    let total = 0;
    for (const v of [a, w, x]) {
      const weight = 1 / Math.max(scene.r[v]!, 0.5);
      px += scene.x[v]! * weight;
      py += scene.y[v]! * weight;
      total += weight;
    }
    const distance = Math.hypot(px / total - ux, py / total - uy);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = [a, w, x];
    }
  }
  if (!best) return null;
  const event = growInto(scene.net, best);
  if (!event) return null;
  handle(scene, event);
  return { kind: "birth" as const, bubble: event.kind === "birth" ? event.vertex : a };
}

/** Inserts a bubble beside the focused (or largest) bubble: the keyboard's way in. */
export function growBeside(scene: Scene) {
  let a = scene.focus;
  if (a === null || !scene.net.alive[a]) {
    for (let v = 1; v < CAPACITY; v += 1) if (scene.net.alive[v] && (a === null || scene.tr[v]! > scene.tr[a]!)) a = v;
  }
  if (a === null) return;
  const list = scene.net.rot[a]!;
  const start = Math.floor(random01(scene.time) * list.length);
  for (let k = 0; k < list.length; k += 1) {
    const w = list[(start + k) % list.length]!;
    const x = list[(start + k + 1) % list.length]!;
    if (w === OMEGA || x === OMEGA) continue;
    const event = growInto(scene.net, [a, w, x]);
    if (event) {
      handle(scene, event);
      return;
    }
  }
}

export function summarise(scene: Scene) {
  const { net } = scene;
  let largest = -1;
  for (let v = 1; v < CAPACITY; v += 1) if (net.alive[v] && (largest < 0 || scene.tr[v]! > scene.tr[largest]!)) largest = v;
  const counts = { birth: 0, merge: 0, vanish: 0, flip: 0 };
  for (const entry of scene.history) counts[entry.kind] += 1;
  const focus = scene.focus !== null && net.alive[scene.focus] ? ` The focused bubble has ${degree(net, scene.focus)} walls.` : "";
  return `${net.size} bubbles and ${net.edges.size} walls; every wall is a link. The largest bubble has ${largest > 0 ? degree(net, largest) : 0} walls. In the last minute ${counts.birth} bubbles were born, ${counts.merge} walls burst and merged two bubbles, ${counts.vanish} bubbles vanished and ${counts.flip} walls swapped.${focus}`;
}
