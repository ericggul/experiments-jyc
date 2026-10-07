"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ranked-web-morphogen.module.css";
import {
  createMorphogenRenderer,
  MAX_TIES,
  MAX_VOTERS as MAX_CELLS,
  TIE_FLOATS,
  VOTER_FLOATS,
  type TieStyle,
} from "./morphogen";
import { bodyAt, relaxBodies, rescaleBodies, type Body, type Frame } from "./layout";
import {
  addCandidate,
  addPage,
  candidate,
  concentration,
  createRankedWeb,
  DAMPING_RANGE,
  DEFAULT_PAGES,
  DEFAULT_DAMPING,
  DEFAULT_PARAMETERS,
  fadeCandidate,
  FLOOR_RANGE,
  GROWTH_RANGE,
  leader,
  MAX_PAGES,
  outWeight,
  setDamping,
  stepRankedWeb,
  VOLATILITY_RANGE,
  type RankedWeb,
} from "./model";
import { tentaclePoint } from "./tentacle";
import { LINK_VISIBILITY, viewTargets, VIEWS, type ViewId } from "./views";

type Rgb = readonly [number, number, number];

// One restrained tone for everything, as route 7 is monochrome: hierarchy
// comes only from size, depth and brightness.
const TONE: Rgb = [0.86, 0.86, 0.84];
/** Surfers are the same tone, lit brighter, running inside the links. */
const SURFER_GLOW = 0.9;
/** Links are still: their width is data (the rank they pass on), so it does not breathe. */
/** A link's territory leaves its page as a broad root and narrows to its own width. */
const LINK_STYLE: TieStyle = { taper: [1.6, 3, 40, 1.3] };
/** How fast the tissue drifts along a link, from source to target, CSS px/s (up to twice this for the richest links). */
const DRIFT = 5;
/**
 * Richness (against the average) at which a region starves and at which it is
 * fully fed. Vitality runs 0–1 between them on a log scale, and sets the
 * tissue's feed rate: rich pages grow lush, poor ones die back.
 */
const PAGE_RICHNESS = [0.4, 5] as const;
const LINK_RICHNESS = [0.5, 8] as const;

function vitality(richness: number, [poor, rich]: readonly [number, number]) {
  const value = (Math.log(Math.max(richness, 1e-6)) - Math.log(poor)) / (Math.log(rich) - Math.log(poor));
  return Math.min(1, Math.max(0, value));
}
/**
 * Share of the field's area that all pages together cover; area = rank × this.
 * Route 7's 6%: a page must be large enough to hold a colony of the tissue's
 * cells, whose number then follows its rank.
 */
const AREA_BUDGET = 0.06;
const MIN_RADIUS = 2.2;
/** A page's soft outline reaches about 1.1 of its radius; pages are spaced by this so they never touch. */
const REACH_SHARE = 1.12;
/** Weight a link drawn by hand starts with; it then follows appeal like any other. */
const HAND_LINK_WEIGHT = 0.5;
/** Random surfers travelling along links; their density approximates rank. */
const SURFERS = 160;
const SURFER_RADIUS = 3;
const MARK_LIFETIME = 0.9;
const TRANSITION_SECONDS = 0.9;
/** Drawn positions follow the layout slowly, so a living tissue is not shoved about (7-glsl: 12). */
const FOLLOW_RATE = 3;
const DRAG_THRESHOLD = 6;
const HIT_SLOP = 6;
/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;
const MIN_PAGES = 20;

type Surfer = { from: number; to: number; progress: number; duration: number; jump: boolean };

type Press = { x: number; y: number; source: number | null; dragging: boolean; pointerX: number; pointerY: number };

type Transition = { from: Float64Array; linksFrom: number; startedAt: number };

type WeightedLink = { from: number; to: number; weight: number; flow: number };

/** Pages may use the whole screen; the options float over it. */
function layoutFrame(size: Frame): Frame {
  return size;
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

/** Disc area is exactly proportional to rank: πr² = rank × budget. */
function radiusFor(rank: number, field: Frame) {
  return Math.max(MIN_RADIUS, Math.sqrt((rank * AREA_BUDGET * field.width * field.height) / Math.PI));
}

function percent(rank: number) {
  return `${(rank * 100).toFixed(rank >= 0.1 ? 0 : 1)}%`;
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** Stable 0–1 noise per link. */
function grain(from: number, to: number) {
  const value = Math.sin(from * 12.9898 + to * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

/** Each link's own phase: its resting curve and the timing of its writhing. */
function linkPhase(from: number, to: number) {
  return grain(from, to) * Math.PI * 2;
}

/** Samples along a tentacle for hit-testing. */
const HIT_SAMPLES = 24;

/** One ribbon: ax ay bx by | rootA rootB reach phase | rgbA pulse | rgbB strength | writhe middle. */
function writeLink(
  data: Float32Array,
  index: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rootA: number,
  rootB: number,
  reach: number,
  phase: number,
  hueA: ArrayLike<number>,
  hueB: ArrayLike<number>,
  strength: number,
  writhe: number,
  middle: number,
  drift: number,
  vitality: number,
) {
  let offset = index * TIE_FLOATS;
  data[offset++] = ax;
  data[offset++] = ay;
  data[offset++] = bx;
  data[offset++] = by;
  data[offset++] = rootA;
  data[offset++] = rootB;
  data[offset++] = reach;
  data[offset++] = phase;
  data[offset++] = hueA[0]!;
  data[offset++] = hueA[1]!;
  data[offset++] = hueA[2]!;
  data[offset++] = 0;
  data[offset++] = hueB[0]!;
  data[offset++] = hueB[1]!;
  data[offset++] = hueB[2]!;
  data[offset++] = strength;
  data[offset++] = writhe;
  data[offset++] = middle;
  data[offset++] = drift;
  data[offset++] = vitality;
}

function writeCell(
  data: Float32Array,
  index: number,
  x: number,
  y: number,
  radius: number,
  glow: number,
  hue: ArrayLike<number>,
  seed = 0,
) {
  const offset = index * VOTER_FLOATS;
  data[offset] = x;
  data[offset + 1] = y;
  data[offset + 2] = radius;
  data[offset + 3] = glow;
  data[offset + 4] = hue[0]!;
  data[offset + 5] = hue[1]!;
  data[offset + 6] = hue[2]!;
  data[offset + 7] = seed;
}

/** A stable seed in (0, 1] for each page's outline and buds. */
function pageSeed(page: number) {
  return 0.02 + 0.98 * grain(page, 17);
}

export default function RankedWebMorphogen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webRef = useRef<RankedWeb>(createRankedWeb());
  const bodiesRef = useRef<Body[]>([]);
  const radiiRef = useRef(new Float64Array(MAX_PAGES));
  const spacingRef = useRef(new Float64Array(MAX_PAGES));
  const pointsRef = useRef(new Float64Array(MAX_PAGES * 2));
  const targetsRef = useRef(new Float64Array(MAX_PAGES * 2));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const pagesBornRef = useRef<{ page: number; at: number }[]>([]);
  const surfersRef = useRef<Surfer[]>([]);
  const pendingPagesRef = useRef({ value: 0 });
  const timeRef = useRef(0);
  const motionTimeRef = useRef(0);
  const pressRef = useRef<Press | null>(null);
  const focusRef = useRef<number | null>(null);
  const viewRef = useRef<ViewId>("network");
  const linkVisibilityRef = useRef(LINK_VISIBILITY.network);
  const transitionRef = useRef<Transition | null>(null);
  const parametersRef = useRef(DEFAULT_PARAMETERS);
  const randomRef = useRef(0x9e3779b9);
  const [growth, setGrowth] = useState(DEFAULT_PARAMETERS.growth);
  const [volatility, setVolatility] = useState(DEFAULT_PARAMETERS.volatility);
  const [floor, setFloor] = useState(DEFAULT_PARAMETERS.floor);
  const [damping, setDampingValue] = useState(DEFAULT_DAMPING);
  const dampingRef = useRef(DEFAULT_DAMPING);
  const [population, setPopulation] = useState(DEFAULT_PAGES);
  /** A requested page count; the frame loop starts the web over with it. */
  const repopulateRef = useRef<number | null>(null);
  const [view, setView] = useState<ViewId>("network");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    parametersRef.current = { ...DEFAULT_PARAMETERS, growth, volatility, floor };
  }, [growth, volatility, floor]);

  /** Presentation-only randomness (layout seeds, surfer choices); never touches the model. */
  const random = useCallback(() => {
    let state = randomRef.current;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    randomRef.current = state >>> 0 || 1;
    return randomRef.current / 4_294_967_296;
  }, []);

  /** Gives page `page` a body and a drawn position at (x, y); it grows in from nothing. */
  const placePage = useCallback((page: number, x: number, y: number) => {
    bodiesRef.current[page] = { x, y, vx: 0, vy: 0 };
    pointsRef.current[page * 2] = x;
    pointsRef.current[page * 2 + 1] = y;
    radiiRef.current[page] = 0;
    pagesBornRef.current.push({ page, at: timeRef.current });
    const transition = transitionRef.current;
    if (transition && transition.from.length < (page + 1) * 2) {
      const from = new Float64Array((page + 1) * 2);
      from.set(transition.from);
      from[page * 2] = x;
      from[page * 2 + 1] = y;
      transition.from = from;
    }
  }, []);

  const changeView = useCallback((next: ViewId) => {
    setView(next);
    if (next === viewRef.current) return;
    transitionRef.current = {
      from: pointsRef.current.slice(0, webRef.current.size * 2),
      linksFrom: linkVisibilityRef.current,
      startedAt: timeRef.current,
    };
    viewRef.current = next;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createMorphogenRenderer(canvas);
    if (!renderer) {
      console.warn("adaptive-coevolving-network/7-glsl-3 needs WebGL2 with float render targets.");
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Reused every frame: every candidate link, and the strong ones that pull in the layout.
    const links: WeightedLink[] = [];
    const pulling: WeightedLink[] = [];
    const glow = new Float32Array(MAX_PAGES);
    // Each page's drawn velocity (px/s, smoothed), so its tissue can ride with it.
    const velocities = new Float64Array(MAX_PAGES * 2);
    const lastPoints = new Float64Array(MAX_PAGES * 2);
    let lastCount = 0;
    const riding = { x: 0, y: 0 };
    let frame = 0;
    let previous = performance.now();
    let sinceSummary = 2;
    let motionTime = 0;

    const nextHop = (surfer: Surfer) => {
      const web = webRef.current;
      const at = surfer.to;
      const total = outWeight(web, at);
      surfer.from = at;
      surfer.progress = 0;
      if (total > 1e-9 && random() < web.damping) {
        // Follow a link with probability proportional to its weight.
        let cursor = random() * total;
        let target = web.out[at]![0]!.target;
        for (const entry of web.out[at]!) {
          cursor -= entry.weight;
          target = entry.target;
          if (cursor <= 0) break;
        }
        const points = pointsRef.current;
        const distance = Math.hypot(points[target * 2]! - points[at * 2]!, points[target * 2 + 1]! - points[at * 2 + 1]!);
        surfer.to = target;
        surfer.jump = false;
        surfer.duration = 0.35 + distance / 520;
      } else {
        surfer.to = Math.min(web.size - 1, Math.floor(random() * web.size));
        surfer.jump = true;
        surfer.duration = 0.5;
      }
    };

    /** Places every page of the current web and scatters the surfers over it. */
    const seedPages = (field: Frame) => {
      const web = webRef.current;
      bodiesRef.current = [];
      for (let page = 0; page < web.size; page += 1) {
        const body = bodyAt(field, random);
        bodiesRef.current[page] = body;
        pointsRef.current[page * 2] = body.x;
        pointsRef.current[page * 2 + 1] = body.y;
        radiiRef.current[page] = radiusFor(web.rank[page]!, field);
      }
      surfersRef.current = Array.from({ length: SURFERS }, () => {
        const page = Math.floor(random() * web.size);
        return { from: page, to: page, progress: random(), duration: 0.6, jump: false };
      });
    };

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const next = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      renderer.resize(next.width, next.height, ratio);
      const field = layoutFrame(next);
      if (bodiesRef.current.length === 0) seedPages(field);
      else rescaleBodies(bodiesRef.current, layoutFrame(sizeRef.current), field);
      sizeRef.current = next;
    };

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (now - previous < FRAME_INTERVAL) return;
      const delta = Math.min((now - previous) / 1_000, 1 / 15);
      previous = now;
      const still = reduceMotion.matches;
      timeRef.current += delta;
      if (!still) motionTime += delta;
      motionTimeRef.current = motionTime;
      const requested = repopulateRef.current;
      if (requested !== null) {
        // A new page count starts the web over, keeping the current d.
        repopulateRef.current = null;
        const fresh = createRankedWeb(requested);
        setDamping(fresh, dampingRef.current);
        webRef.current = fresh;
        pagesBornRef.current = [];
        pendingPagesRef.current = { value: 0 };
        transitionRef.current = null;
        focusRef.current = null;
        seedPages(layoutFrame(sizeRef.current));
      }
      const web = webRef.current;
      const size = sizeRef.current;
      const field = layoutFrame(size);
      const tempo = still ? 0.3 : 1;

      const events = stepRankedWeb(web, delta * tempo, parametersRef.current, pendingPagesRef.current);
      for (const event of events) {
        // A new page appears beside the first page it links to.
        const anchor = bodiesRef.current[event.targets[0] ?? 0];
        const angle = random() * Math.PI * 2;
        placePage(
          event.page,
          (anchor?.x ?? field.width / 2) + Math.cos(angle) * 24,
          (anchor?.y ?? field.height / 2) + Math.sin(angle) * 24,
        );
      }

      // Radii track rank directly: the model already changes continuously.
      const radii = radiiRef.current;
      // Bodies swell and shrink slowly, as tissue grows (7-glsl: 8/s).
      const grow = 1 - Math.exp(-2 * delta);
      const spacing = spacingRef.current;
      for (let page = 0; page < web.size; page += 1) {
        radii[page] = radii[page]! + (radiusFor(web.rank[page]!, field) - radii[page]!) * grow;
        spacing[page] = radii[page]! * REACH_SHARE + 2;
      }

      // Every candidate link with its weight and the rank it passes on, d · PR · w / W.
      let linkCount = 0;
      pulling.length = 0;
      for (let from = 0; from < web.size; from += 1) {
        const total = outWeight(web, from);
        if (total <= 1e-12) continue;
        for (const entry of web.out[from]!) {
          const link = links[linkCount] ?? { from: 0, to: 0, weight: 0, flow: 0 };
          links[linkCount++] = link;
          link.from = from;
          link.to = entry.target;
          link.weight = entry.weight;
          link.flow = (web.damping * web.rank[from]! * entry.weight) / total;
          if (link.weight > 0.08) pulling.push(link);
        }
      }
      relaxBodies(bodiesRef.current, pulling, spacing, field, delta * tempo);

      const current = viewRef.current;
      const points = pointsRef.current;
      const targets = targetsRef.current;
      viewTargets(current, bodiesRef.current, spacing, web.rank, web.size, field, targets);
      const transition = transitionRef.current;
      const progress = transition
        ? Math.min(1, (timeRef.current - transition.startedAt) / (still ? 0.01 : TRANSITION_SECONDS))
        : 1;
      const eased = easeInOut(progress);
      const follow = 1 - Math.exp(-FOLLOW_RATE * delta);
      for (let index = 0; index < web.size * 2; index += 1) {
        points[index] = transition && progress < 1
          ? transition.from[index]! + (targets[index]! - transition.from[index]!) * eased
          : points[index]! + (targets[index]! - points[index]!) * follow;
      }
      const linksFrom = transition?.linksFrom ?? LINK_VISIBILITY[current];
      linkVisibilityRef.current = linksFrom + (LINK_VISIBILITY[current] - linksFrom) * eased;
      if (transition && progress >= 1) transitionRef.current = null;
      const visibility = linkVisibilityRef.current;
      const focus = focusRef.current;

      // Links: each grows along its own curved path; it leaves its source at nearly the source's full width and
      // enters its target nearly as wide as the target, in the same tone,
      // so page and link are one body; between them it narrows to
      // the width of the rank it passes on. Weight and view thin it, and it
      // swells and fades continuously.
      // Drawn velocities, smoothed over about a tenth of a second; a page that
      // just appeared, or a web that was started over, starts at rest.
      const settle = 1 - Math.exp(-10 * delta);
      for (let index = 0; index < web.size * 2; index += 1) {
        const moved = index < lastCount * 2 && delta > 0 ? (points[index]! - lastPoints[index]!) / delta : 0;
        velocities[index] = index < lastCount * 2 ? velocities[index]! + (moved - velocities[index]!) * settle : 0;
        lastPoints[index] = points[index]!;
      }
      lastCount = web.size;
      const tieData = renderer.ties;
      let tieCount = 0;
      // Richness against the average: a page's rank × N, a link's flow
      // against the mean flow of all links (whose flows sum to about d).
      const meanFlow = linkCount > 0 ? web.damping / linkCount : 1;
      for (let index = 0; index < linkCount && tieCount < MAX_TIES; index += 1) {
        const link = links[index]!;
        const linkVitality = vitality(link.flow / meanFlow, LINK_RICHNESS);
        const involved = focus !== null && (link.from === focus || link.to === focus);
        const presence = Math.min(1, link.weight * 6);
        const strength = presence * (involved ? 1 : visibility) * (focus !== null && !involved ? 0.6 : 1);
        if (strength < 0.02) continue;
        // A link's territory is as wide as the rank it passes on: a weak link
        // is only a membrane line too narrow for tissue, a strong one a
        // corridor that grows one filament or a bundle of them.
        const middle = 1.2 + link.flow * 70;
        const source = radii[link.from]!;
        const sink = radii[link.to]!;
        const ax = points[link.from * 2]!;
        const ay = points[link.from * 2 + 1]!;
        const bx = points[link.to * 2]!;
        const by = points[link.to * 2 + 1]!;
        writeLink(
          tieData,
          tieCount++,
          ax,
          ay,
          bx,
          by,
          // Roots barely wider than the link: the smooth union fillets them
          // into the page, and the page keeps its own territory.
          middle + Math.min(source * 0.35, 4),
          middle + Math.min(sink * 0.35, 4),
          // A new candidate grows out of its source as its weight rises; a
          // fading one withdraws back into it.
          presence ** 0.6,
          linkPhase(link.from, link.to),
          [0, velocities[link.from * 2]!, velocities[link.from * 2 + 1]!],
          [0, velocities[link.to * 2]!, velocities[link.to * 2 + 1]!],
          strength,
          1,
          middle,
          // Food streams faster through a link that passes on more rank.
          DRIFT * strength * (0.4 + 1.6 * linkVitality),
          linkVitality,
        );
      }
      // A link being drawn by hand reaches from its page toward the pointer.
      const press = pressRef.current;
      if (press?.dragging && press.source !== null && tieCount < MAX_TIES) {
        const r = radii[press.source]!;
        writeLink(
          tieData,
          tieCount++,
          points[press.source * 2]!,
          points[press.source * 2 + 1]!,
          press.pointerX,
          press.pointerY,
          r * 0.92,
          0.6,
          1,
          0,
          TONE,
          TONE,
          1,
          0.5,
          2.6,
          0,
          0.5,
        );
      }

      // Pages: soft cells whose area is their rank; a new page, and the
      // focused one, glow.
      glow.fill(0, 0, web.size);
      pagesBornRef.current = pagesBornRef.current.filter((born) => timeRef.current - born.at < MARK_LIFETIME);
      for (const born of pagesBornRef.current) {
        glow[born.page] = Math.max(glow[born.page]!, 0.8 * (1 - (timeRef.current - born.at) / MARK_LIFETIME));
      }
      const cellData = renderer.voters;
      let cellCount = 0;
      for (let page = 0; page < web.size && cellCount < MAX_CELLS; page += 1) {
        const r = radii[page]!;
        if (r < 0.3) continue;
        const x = points[page * 2]!;
        const y = points[page * 2 + 1]!;
        const lit = page === focus ? Math.max(glow[page]!, 0.7) : glow[page]!;
        writeCell(cellData, cellCount++, x, y, r, lit, [vitality(web.rank[page]! * web.size, PAGE_RICHNESS), velocities[page * 2]!, velocities[page * 2 + 1]!], pageSeed(page));
      }

      // Surfers: bright beads gliding inside the links; jumping, they shrink away and back.
      if (!still) {
        for (const surfer of surfersRef.current) {
          surfer.progress += delta / surfer.duration;
          if (surfer.progress >= 1) nextHop(surfer);
          const t = surfer.progress;
          const fx = points[surfer.from * 2]!;
          const fy = points[surfer.from * 2 + 1]!;
          const tx = points[surfer.to * 2]!;
          const ty = points[surfer.to * 2 + 1]!;
          // Riding a link, a surfer follows the same writhing path as its ribbon.
          tentaclePoint(fx, fy, tx, ty, t, linkPhase(surfer.from, surfer.to), motionTime, 1, riding);
          let x = riding.x;
          let y = riding.y;
          let alpha = visibility;
          if (surfer.jump) {
            x = t < 0.5 ? fx : tx;
            y = t < 0.5 ? fy : ty;
            alpha *= Math.abs(1 - t * 2) * 0.6;
          }
          const radius = SURFER_RADIUS * Math.min(1, alpha * 1.2);
          if (radius < 0.4 || cellCount >= MAX_CELLS) continue;
          writeCell(cellData, cellCount++, x, y, radius, SURFER_GLOW, TONE);
        }
      }

      renderer.render(tieCount, cellCount, motionTime, still ? 0 : delta, LINK_STYLE);

      sinceSummary += delta;
      if (sinceSummary > 2) {
        sinceSummary = 0;
        const share = concentration(web);
        setSummary(`${web.size} pages. The leading page, number ${leader(web) + 1}, holds ${percent(share.top)} of PageRank; the top tenth of pages hold ${percent(share.topTenth)}.`);
      }
    };

    sizeCanvas();
    const observer = new ResizeObserver(sizeCanvas);
    observer.observe(canvas);
    frame = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, [random, placePage]);

  const pageAt = useCallback((x: number, y: number) => {
    const web = webRef.current;
    const points = pointsRef.current;
    let best: number | null = null;
    let bestDistance = Infinity;
    for (let page = 0; page < web.size; page += 1) {
      const distance = Math.hypot(points[page * 2]! - x, points[page * 2 + 1]! - y);
      if (distance <= radiiRef.current[page]! + HIT_SLOP && distance < bestDistance) {
        best = page;
        bestDistance = distance;
      }
    }
    return best;
  }, []);

  const linkAt = useCallback((x: number, y: number) => {
    const web = webRef.current;
    const points = pointsRef.current;
    const time = motionTimeRef.current;
    const previous = { x: 0, y: 0 };
    const next = { x: 0, y: 0 };
    for (let from = 0; from < web.size; from += 1) {
      for (const entry of web.out[from]!) {
        if (entry.fading || entry.weight < 0.05) continue;
        const to = entry.target;
        const phase = linkPhase(from, to);
        const grown = Math.min(1, entry.weight * 6) ** 0.6;
        const ax = points[from * 2]!;
        const ay = points[from * 2 + 1]!;
        const bx = points[to * 2]!;
        const by = points[to * 2 + 1]!;
        tentaclePoint(ax, ay, bx, by, 0, phase, time, 1, previous);
        for (let sample = 1; sample <= HIT_SAMPLES; sample += 1) {
          tentaclePoint(ax, ay, bx, by, (sample / HIT_SAMPLES) * grown, phase, time, 1, next);
          if (distanceToSegment(x, y, previous.x, previous.y, next.x, next.y) <= HIT_SLOP) return { from, to };
          previous.x = next.x;
          previous.y = next.y;
        }
      }
    }
    return null;
  }, []);

  const pointFor = (target: HTMLCanvasElement, clientX: number, clientY: number) => {
    const bounds = target.getBoundingClientRect();
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  };

  const createPage = useCallback((x: number, y: number, linkedFrom: number | null) => {
    const web = webRef.current;
    const page = addPage(web);
    if (page === null) return null;
    if (linkedFrom !== null) addCandidate(web, linkedFrom, page, HAND_LINK_WEIGHT);
    placePage(page, x, y);
    return page;
  }, [placePage]);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="ranked-web-morphogen-summary"
        aria-label="A living web of pages ranked by PageRank, grown as a tissue that patterns itself. Each page is a territory whose area is its share of PageRank, colonised by dividing cells; each link that passes on enough rank grows a bundle of fibres that drifts toward the page it feeds; random surfers pulse the tissue. Tap empty space to add a page; drag from one page to another to add a link or let it fade; drag from a page to empty space to create a page it links to; tap a link to let it fade; tap a page to stir it and highlight its links. Press N to add a page linked from the leader, Escape to clear focus."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          pressRef.current = { ...point, source: pageAt(point.x, point.y), dragging: false, pointerX: point.x, pointerY: point.y };
        }}
        onPointerMove={(event) => {
          const press = pressRef.current;
          if (!press || (event.buttons & 1) === 0) return;
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          press.pointerX = point.x;
          press.pointerY = point.y;
          if (!press.dragging && Math.hypot(point.x - press.x, point.y - press.y) >= DRAG_THRESHOLD) press.dragging = true;
        }}
        onPointerUp={(event) => {
          const press = pressRef.current;
          pressRef.current = null;
          if (!press) return;
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          const web = webRef.current;
          if (press.source !== null && press.dragging) {
            const target = pageAt(point.x, point.y);
            if (target === null) {
              createPage(point.x, point.y, press.source);
            } else if (target !== press.source) {
              const existing = candidate(web, press.source, target);
              if (existing && !existing.fading) fadeCandidate(web, press.source, target);
              else addCandidate(web, press.source, target, HAND_LINK_WEIGHT);
            }
            return;
          }
          if (press.source !== null) {
            focusRef.current = focusRef.current === press.source ? null : press.source;
            return;
          }
          if (press.dragging) return;
          const link = linkAt(point.x, point.y);
          if (link) {
            fadeCandidate(web, link.from, link.to);
            return;
          }
          createPage(point.x, point.y, null);
        }}
        onPointerCancel={() => {
          pressRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") focusRef.current = null;
          if (event.key !== "n" && event.key !== "N") return;
          const web = webRef.current;
          const top = leader(web);
          const anchor = bodiesRef.current[top];
          createPage((anchor?.x ?? 0) + 30, (anchor?.y ?? 0) + 30, top);
        }}
      />
      <p id="ranked-web-morphogen-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {optionsOpen && (
          <div id="ranked-web-morphogen-options" className={styles.options}>
            <p className={styles.hint}>크기가 곧 PageRank · 빈 곳을 누르면 새 페이지, 페이지에서 페이지로 끌면 링크</p>
            <div className={styles.views} role="group" aria-label="보기">
              {VIEWS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.button}
                  aria-pressed={view === option.id}
                  onClick={() => changeView(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className={styles.balance}>
              <span>잔잔</span>
              <input
                aria-label="페이지 품질이 오르내리는 정도"
                aria-valuetext={`요동 ${volatility.toFixed(2)}`}
                max={VOLATILITY_RANGE[1]}
                min={VOLATILITY_RANGE[0]}
                step="0.05"
                type="range"
                value={volatility}
                onChange={(event) => setVolatility(Number(event.target.value))}
              />
              <span>요동</span>
            </label>
            <label className={styles.balance}>
              <span>고르게</span>
              <input
                aria-label="관심이 순위 높은 페이지로 쏠리는 정도"
                aria-valuetext={`쏠림 ${(1 - Math.log(floor / FLOOR_RANGE[0]) / Math.log(FLOOR_RANGE[1] / FLOOR_RANGE[0])).toFixed(2)}`}
                max="1"
                min="0"
                step="0.01"
                type="range"
                value={1 - Math.log(floor / FLOOR_RANGE[0]) / Math.log(FLOOR_RANGE[1] / FLOOR_RANGE[0])}
                onChange={(event) => {
                  const position = Number(event.target.value);
                  setFloor(FLOOR_RANGE[0] * (FLOOR_RANGE[1] / FLOOR_RANGE[0]) ** (1 - position));
                }}
              />
              <span>쏠리게</span>
            </label>
            <label className={styles.balance}>
              <span>새 페이지 없음</span>
              <input
                aria-label="새 페이지가 생기는 속도"
                aria-valuetext={`초당 ${growth.toFixed(1)}개`}
                max={GROWTH_RANGE[1]}
                min={GROWTH_RANGE[0]}
                step="0.05"
                type="range"
                value={growth}
                onChange={(event) => setGrowth(Number(event.target.value))}
              />
              <span>많이</span>
            </label>
            <label className={styles.balance}>
              <span>순간이동</span>
              <input
                aria-label="링크를 따라갈 확률 d"
                aria-valuetext={`d ${damping.toFixed(2)}`}
                max={DAMPING_RANGE[1]}
                min={DAMPING_RANGE[0]}
                step="0.01"
                type="range"
                value={damping}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDampingValue(value);
                  dampingRef.current = value;
                  setDamping(webRef.current, value);
                }}
              />
              <span>링크만</span>
            </label>
            <label className={styles.balance}>
              <span>페이지</span>
              <input
                aria-label="페이지 수; 바꾸면 웹이 처음부터 다시 시작됩니다"
                aria-valuetext={`페이지 ${population}개`}
                max={MAX_PAGES}
                min={MIN_PAGES}
                step="10"
                type="range"
                value={population}
                onChange={(event) => {
                  const count = Number(event.target.value);
                  setPopulation(count);
                  repopulateRef.current = count;
                }}
              />
              <span className={styles.count}>{population}</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.button} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="ranked-web-morphogen-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
