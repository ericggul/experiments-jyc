"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { linkStrength } from "../model/field";
import { idealLength, relax } from "../model/layout";
import { createSociety, crossKey, effective, effectiveCross, KEY, step, type Partner, type Society } from "../model/society";
import { createGel, DISC_FLOATS, MAX_DISCS, MAX_TIES, TIE_FLOATS } from "./gel";
import type { Eased } from "./mutate";
import type { Peers } from "./peers";

// The network form: each window runs its own society in continuous time
// (model/society.ts), integrated every frame with the layout, and shares a
// snapshot 24 times a second; every window draws every window's network where
// that window sits, as one gel (gel.ts, after adaptive-coevolving-network/1-glsl).
//
// Everything drawn is a continuous quantity of the model: a tie's thickness
// and reach are its effective strength, a person's size is their presence and
// summed strength. This window's own society is drawn live; other windows'
// snapshots are eased toward every frame, so nothing steps at 24 Hz.
//
// Performance: drawing writes instance data in place into preallocated arrays
// and costs three draw calls; the model and layout are O(people² + ties ·
// degree) per frame.

const SHARE_HZ = 24;
/** Frames are paced to at most this rate (1-glsl paces to 60 Hz on whole vsyncs). */
const FRAME_HZ = 60;
/** Falloff toward other windows' snapshots, per 60 Hz frame. */
const FOLLOW = 0.12;
/** The turnover setting (2–30) per person per second: at 6, a person stays about nine minutes. */
const TURNOVER_SCALE = 0.0003;
/** Seconds a newcomer swells and brightens (1-glsl's excitement). */
const EXCITEMENT = 2.5;
const GROUND = "#05040c";

/** Flattened for compact messages: nodes [id, x, y, presence, age]…, ties [a, b, strength]…, cross [mine, window, node, strength, spark]…; x, y are 0–1 of the page. */
export type GraphSnapshot = { nodes: number[]; ties: number[]; cross: number[] };

const populationSize = (width: number, height: number) => Math.max(24, Math.min(72, Math.round((width * height) / 9000)));

function snapshotOf(society: Society, partners: readonly Partner[], width: number, height: number): GraphSnapshot {
  const nodes: number[] = [];
  for (const p of society.people.values()) nodes.push(p.id, p.x / width, p.y / height, p.presence, p.age);
  const ties: number[] = [];
  for (const tie of society.ties.values()) { const w = effective(society, tie); if (w > 0.002) ties.push(tie.a, tie.b, w); }
  const cross: number[] = [];
  for (const tie of society.cross.values()) { const w = effectiveCross(society, tie, partners); if (w > 0.002) cross.push(tie.mine, tie.window, tie.node, w, tie.spark); }
  return { nodes, ties, cross };
}

/** Stable 0–1 noise per index (as in 1-glsl), so each tie keeps its own build. */
const grain = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};
/** A small stable seed for a pair of node keys, independent of drawing order. */
const pairSeed = (a: number, b: number) => ((Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(Math.floor(a / KEY), 83492791)) >>> 0) % 100003;
const smooth = (edge: number, x: number) => { const t = Math.min(1, Math.max(0, x / edge)); return t * t * (3 - 2 * t); };

function rgb(hex: string, out: Float32Array) {
  const value = parseInt(hex.slice(1), 16);
  out[0] = ((value >> 16) & 255) / 255;
  out[1] = ((value >> 8) & 255) / 255;
  out[2] = (value & 255) / 255;
}

type Scratch = {
  frame: number;
  index: Map<number, number>;
  /** Other windows' people as shown, eased toward their snapshots: x, y, presence, last frame seen. */
  shown: Map<number, Float32Array>;
  /** Other windows' tie strengths as shown, per window, eased toward their snapshots: strength, last frame seen. */
  strength: Map<number, Map<number, Float32Array>>;
  /** Ties across windows drawn so far this frame: pair → instance. */
  drawn: Map<number, number>;
  key: Float64Array;
  x: Float32Array;
  y: Float32Array;
  presence: Float32Array;
  age: Float32Array;
  load: Float32Array;
  base: Float32Array;
  window: Int32Array;
  crossWindow: Int32Array;
  crossLoad: Float32Array;
  colours: Map<number, Float32Array>;
};

function nextFrame(s: Scratch) {
  s.frame++;
}

/** Eases a remembered value toward its target; returns the record. */
function follow(map: Map<number, Float32Array>, key: number, frame: number, size: number, targets: readonly number[], rate: number) {
  let record = map.get(key);
  if (!record) { record = new Float32Array(size + 1); for (let i = 0; i < size; i++) record[i] = targets[i]; map.set(key, record); }
  else for (let i = 0; i < size; i++) record[i] += (targets[i] - record[i]) * rate;
  record[size] = frame;
  return record;
}

function strengthsOf(s: Scratch, id: number) {
  let strengths = s.strength.get(id);
  if (!strengths) { strengths = new Map(); s.strength.set(id, strengths); }
  return strengths;
}

function forgetUnseen(map: Map<number, Float32Array>, frame: number) {
  for (const [key, record] of map) if (record[record.length - 1] !== frame) map.delete(key);
}

// Instance writers. Buffers are filled in place every frame; these are the only
// functions that write them.

/** Places every window's people in desktop points; returns how many. */
function placePeople(s: Scratch, peers: Peers, eased: Eased, selfId: number, own: Society, rate: number) {
  s.index.clear();
  let count = 0;
  const target = [0, 0, 0];
  for (const id of peers.getIds()) {
    const peer = peers.get(id);
    const centre = eased.centres.get(id);
    const graph = peers.shared(id) as GraphSnapshot | undefined;
    if (!peer || !centre || (!graph && id !== selfId)) continue;
    let colour = s.colours.get(id);
    if (!colour) { colour = new Float32Array(3); s.colours.set(id, colour); }
    rgb(peer.color, colour);
    const left = centre.x - peer.content.width / 2;
    const top = centre.y - peer.content.height / 2;
    const add = (person: number, px: number, py: number, presence: number, age: number, size: number) => {
      if (count >= MAX_DISCS || presence <= 0) return;
      const key = id * KEY + person;
      s.index.set(key, count);
      s.key[count] = key;
      s.x[count] = left + px;
      s.y[count] = top + py;
      s.presence[count] = presence;
      s.age[count] = age;
      // 1-glsl's body scale: clamp(0.12 × ideal length, 2.6, 5.5).
      s.base[count] = Math.max(2.6, Math.min(5.5, idealLength(peer.content.width, peer.content.height, size) * 0.12));
      s.window[count] = id;
      s.load[count] = 0;
      s.crossLoad[count] = 0;
      s.crossWindow[count] = -1;
      count++;
    };
    if (id === selfId) {
      // This window's own society, live.
      for (const p of own.people.values()) add(p.id, p.x, p.y, p.presence, p.age, own.people.size);
      continue;
    }
    const nodes = graph!.nodes;
    for (let i = 0; i < nodes.length; i += 5) {
      target[0] = nodes[i + 1] * peer.content.width;
      target[1] = nodes[i + 2] * peer.content.height;
      target[2] = nodes[i + 3];
      const shown = follow(s.shown, id * KEY + nodes[i], s.frame, 3, target, rate);
      add(nodes[i], shown[0], shown[1], shown[2], nodes[i + 4], nodes.length / 5);
    }
  }
  forgetUnseen(s.shown, s.frame);
  return count;
}

/** Appends one tie of effective strength `w`; returns the new tie count. Roots are filled later from the discs. */
function writeTie(ties: Float32Array, count: number, s: Scratch, a: number, b: number, w: number, colourA: Float32Array, colourB: Float32Array, across: boolean, middle: number, seed: number) {
  if (count >= MAX_TIES || w < 0.003) return count;
  const ax = s.x[a], ay = s.y[a], bx = s.x[b], by = s.y[b];
  const length = Math.hypot(bx - ax, by - ay);
  // As in 1-glsl, long quiet ties are dimmer; ties across windows keep full light.
  const glow = across ? 1 : 1 - 0.6 * Math.min(1, Math.max(0, (length - 30) / 140));
  // A tie reaches out from A as it strengthens and draws back as it weakens; its body is its strength.
  const reach = smooth(0.35, w);
  const body = Math.sqrt(w);
  let o = count * TIE_FLOATS;
  ties[o++] = ax; ties[o++] = ay; ties[o++] = bx; ties[o++] = by;
  ties[o++] = 0; ties[o++] = 0; ties[o++] = reach; ties[o++] = grain(seed, 7) * Math.PI * 2;
  ties[o++] = colourA[0] * glow; ties[o++] = colourA[1] * glow; ties[o++] = colourA[2] * glow; ties[o++] = across ? 1 : 0;
  ties[o++] = colourB[0] * glow; ties[o++] = colourB[1] * glow; ties[o++] = colourB[2] * glow; ties[o++] = body;
  ties[o++] = Math.min(12, length * (0.06 + 0.12 * grain(seed, 8))) * (grain(seed, 11) < 0.5 ? -1 : 1);
  // 1-glsl `thin`: middle half-width falls off with length; ties across windows keep more body.
  ties[o++] = middle * (across ? Math.min(1, Math.max(0.55, 60 / Math.max(length, 1))) : Math.min(1, Math.max(0.3, 30 / Math.max(length, 1))));
  // extra.zw is unused by the shader: it carries the node indices for the roots.
  ties[o++] = a; ties[o++] = b;
  s.load[a] += w; s.load[b] += w;
  return count + 1;
}

/** Writes every window's ties; returns how many. Ties across windows are drawn once per pair of people. */
function writeAllTies(ties: Float32Array, s: Scratch, peers: Peers, selfId: number, own: Society, partners: readonly Partner[], rate: number) {
  let count = 0;
  const target = [0];
  for (const id of peers.getIds()) {
    const colour = s.colours.get(id);
    if (!colour) continue;
    const local = (pa: number, pb: number, w: number) => {
      const a = s.index.get(id * KEY + pa);
      const b = s.index.get(id * KEY + pb);
      if (a === undefined || b === undefined) return;
      const seed = pairSeed(s.key[a], s.key[b]);
      count = writeTie(ties, count, s, a, b, w, colour, colour, false, 0.3 + 0.8 * grain(seed, 4) ** 3, seed);
    };
    if (id === selfId) {
      for (const tie of own.ties.values()) local(tie.a, tie.b, effective(own, tie));
      continue;
    }
    const graph = peers.shared(id) as GraphSnapshot | undefined;
    if (!graph) continue;
    const strengths = strengthsOf(s, id);
    for (let i = 0; i < graph.ties.length; i += 3) {
      target[0] = graph.ties[i + 2];
      const shown = follow(strengths, graph.ties[i] * KEY + graph.ties[i + 1], s.frame, 1, target, rate);
      local(graph.ties[i], graph.ties[i + 1], shown[0]);
    }
  }
  s.drawn.clear();
  const across = (id: number, mine: number, window: number, node: number, w: number, spark: number) => {
    const a = s.index.get(id * KEY + mine);
    const b = s.index.get(window * KEY + node);
    const colour = s.colours.get(id);
    const other = s.colours.get(window);
    if (a === undefined || b === undefined || !colour || !other) return;
    const pair = pairSeed(Math.min(s.key[a], s.key[b]), Math.max(s.key[a], s.key[b]));
    const drawn = s.drawn.get(pair);
    if (drawn !== undefined) {
      // Both windows may hold this pair: draw it once, as strong as the stronger.
      const o = drawn * TIE_FLOATS;
      ties[o + 15] = Math.max(ties[o + 15], Math.sqrt(w));
      ties[o + 6] = Math.max(ties[o + 6], smooth(0.35, w));
      return;
    }
    const before = count;
    count = writeTie(ties, count, s, a, b, w, colour, other, true, (0.36 + 0.8 * grain(pair, 4) ** 3) * (2.2 + 1.5 * spark), pair);
    if (count === before) return;
    s.drawn.set(pair, before);
    s.crossLoad[a] += w; s.crossLoad[b] += w;
    s.crossWindow[a] = window; s.crossWindow[b] = id;
  };
  for (const id of peers.getIds()) {
    if (id === selfId) {
      for (const tie of own.cross.values()) across(id, tie.mine, tie.window, tie.node, effectiveCross(own, tie, partners), tie.spark);
      continue;
    }
    const graph = peers.shared(id) as GraphSnapshot | undefined;
    if (!graph) continue;
    const strengths = strengthsOf(s, id);
    for (let i = 0; i < graph.cross.length; i += 5) {
      target[0] = graph.cross[i + 3];
      const shown = follow(strengths, -crossKey(graph.cross[i], graph.cross[i + 1], graph.cross[i + 2]), s.frame, 1, target, rate);
      across(id, graph.cross[i], graph.cross[i + 1], graph.cross[i + 2], shown[0], graph.cross[i + 4]);
    }
  }
  for (const [id, strengths] of s.strength) {
    forgetUnseen(strengths, s.frame);
    if (!strengths.size) s.strength.delete(id);
  }
  return count;
}

/** A stable per-person build, roughly log-normal over .55–2.2× (1-glsl). */
const build = (key: number) => Math.min(2.2, Math.max(0.55, Math.exp((grain(key % 100003, 3) + grain(key % 100003, 5) + grain(key % 100003, 9) - 1.5) * 0.9)));

/** People: size from presence and summed strength; newcomers arrive bright; ties across windows lend the other hue. */
function writeDiscs(discs: Float32Array, s: Scratch, count: number) {
  for (let n = 0; n < count; n++) {
    const colour = s.colours.get(s.window[n])!;
    const other = s.crossWindow[n] >= 0 ? s.colours.get(s.crossWindow[n]) : undefined;
    const blend = other ? Math.min(0.45, 0.3 * s.crossLoad[n]) : 0;
    const excitement = Math.max(0, 1 - s.age[n] / EXCITEMENT);
    const presence = smooth(1, s.presence[n]);
    const radius = s.base[n] * (0.5 + Math.sqrt(s.load[n]) * 0.25) * build(s.key[n]) * (1 + 0.45 * excitement) * presence;
    let o = n * DISC_FLOATS;
    discs[o++] = s.x[n]; discs[o++] = s.y[n]; discs[o++] = radius; discs[o++] = excitement * presence;
    for (let c = 0; c < 3; c++) discs[o++] = other ? colour[c] + (other[c] - colour[c]) * blend : colour[c];
    discs[o++] = 0;
  }
}

/** Each tie is as wide as its people where it leaves them (1-glsl: .92 of the radius). */
function writeRoots(ties: Float32Array, discs: Float32Array, count: number) {
  for (let t = 0; t < count; t++) {
    const o = t * TIE_FLOATS;
    ties[o + 4] = discs[ties[o + 18] * DISC_FLOATS + 2] * 0.92;
    ties[o + 5] = discs[ties[o + 19] * DISC_FLOATS + 2] * 0.92;
  }
}

/** Warm start, so a window opens on a grown, settled network. */
function grow(selfId: number, width: number, height: number) {
  const society = createSociety(populationSize(width, height), 0x5eed + selfId * 7919, width, height);
  for (let i = 0; i < 90 * 30; i++) {
    step(society, 1 / 30, [], 0, width, height);
    relax(society, width, height, [], () => undefined, 1 / 30);
  }
  return society;
}

export function NetworkForm({ peers, selfId, eased, range, turnover, reducedMotion }: { peers: Peers; selfId: number; eased: Eased; range: number; turnover: number; reducedMotion: boolean }) {
  const renderer = useThree((state) => state.gl);
  const gel = useMemo(() => createGel(renderer, GROUND), [renderer]);
  useEffect(() => () => gel.dispose(), [gel]);

  const society = useMemo(() => grow(selfId, window.innerWidth, window.innerHeight), [selfId]);
  /** Other windows as this one sees them, refreshed with every share. */
  const partners = useRef<Partner[]>([]);

  const scratch = useMemo<Scratch>(() => ({
    frame: 0,
    index: new Map(),
    shown: new Map(),
    strength: new Map(),
    drawn: new Map(),
    key: new Float64Array(MAX_DISCS),
    x: new Float32Array(MAX_DISCS),
    y: new Float32Array(MAX_DISCS),
    presence: new Float32Array(MAX_DISCS),
    age: new Float32Array(MAX_DISCS),
    load: new Float32Array(MAX_DISCS),
    base: new Float32Array(MAX_DISCS),
    window: new Int32Array(MAX_DISCS),
    crossWindow: new Int32Array(MAX_DISCS),
    crossLoad: new Float32Array(MAX_DISCS),
    colours: new Map(),
  }), []);

  const toward = useMemo(() => (window: number) => {
    const a = eased.centres.get(selfId);
    const b = eased.centres.get(window);
    if (!a || !b) return undefined;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
  }, [eased, selfId]);

  // Sharing at 24 Hz: read the other windows' people and nearness, publish this one.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      const self = eased.centres.get(selfId);
      const next: Partner[] = [];
      for (const id of peers.getIds()) {
        if (id === selfId) continue;
        const graph = peers.shared(id) as GraphSnapshot | undefined;
        const other = eased.centres.get(id);
        const nodes = new Map<number, number>();
        for (let i = 0; graph && i < graph.nodes.length; i += 5) nodes.set(graph.nodes[i], graph.nodes[i + 3]);
        next.push({ window: id, nodes, strength: self && other ? linkStrength(Math.hypot(other.x - self.x, other.y - self.y), range) : 0 });
      }
      partners.current = next;
      peers.share(snapshotOf(society, next, window.innerWidth, window.innerHeight));
    }, 1000 / SHARE_HZ);
    return () => clearInterval(timer);
  }, [society, peers, selfId, eased, range]);

  // Frames paced to at most 60 Hz while visible; reduced motion leaves redraws to window moves.
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (document.hidden || now - last < 1000 / FRAME_HZ - 2) return;
      last = now;
      invalidate();
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [invalidate, reducedMotion]);

  // Priority 1: this form draws the frame itself — model, layout, field passes, composite.
  useFrame((_, delta) => {
    const me = peers.get(selfId);
    if (!me || !eased.offset) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (!reducedMotion) {
      step(society, delta, partners.current, turnover * TURNOVER_SCALE, width, height);
      relax(society, width, height, partners.current, toward, delta);
    }
    nextFrame(scratch);
    const rate = 1 - Math.pow(1 - FOLLOW, Math.min(delta, 0.1) * 60);
    const people = placePeople(scratch, peers, eased, selfId, society, rate);
    const ties = writeAllTies(gel.ties, scratch, peers, selfId, society, partners.current, rate);
    writeDiscs(gel.discs, scratch, people);
    writeRoots(gel.ties, gel.discs, ties);
    gel.render(ties, people, eased.offset, me.content, eased.time);
  }, 1);

  return null;
}
