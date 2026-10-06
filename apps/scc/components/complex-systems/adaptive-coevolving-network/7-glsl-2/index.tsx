"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ranked-web-fibres.module.css";
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
import { beginFrame, createBundler, curvePoint, linkKey, linkPoint, POINTS, prune, relaxBundles, report, type BundledLink } from "./bundling";
import { createFibreRenderer, DOT_FLOATS, FIBRE_FLOATS, MAX_DOTS, MAX_FIBRES, MAX_ROWS, MAX_SPARKS, SPARK_FLOATS } from "./fibres";
import { LINK_VISIBILITY, viewTargets, VIEWS, type ViewId } from "./views";

/**
 * Share of the field's area that all page dots together cover; area = rank ×
 * this. Small, as BarabásiLab's nodes are: the fibres carry the picture.
 */
const AREA_BUDGET = 0.008;
const MIN_RADIUS = 1.4;
/** Pages are spaced by this share of their radius, plus 4 px. */
const REACH_SHARE = 1.2;
/**
 * A link is drawn as 1 + FIBRES_PER_RANK · (d·PR·w/W) fibres, so its
 * brightness is the rank it passes on; all links together carry about
 * d · FIBRES_PER_RANK fibres.
 */
const FIBRES_PER_RANK = 2_000;
/** One fibre's light, before the tone map. */
const FIBRE_ALPHA = 0.11;
/** Width of a link's bundle in px: this floor plus this times √fibres. */
const SPREAD = { floor: 0.5, scale: 1.5 } as const;
/** Weight a link drawn by hand starts with; it then follows appeal like any other. */
const HAND_LINK_WEIGHT = 0.5;
/** Random surfers running along the fibres as sparks; their density approximates rank. */
const SURFERS = 300;
const SURFER_RADIUS = 0.9;
/** A spark and its fading tail of earlier positions along its fibre. */
const TAIL = [1.5, 0.7, 0.4, 0.22, 0.12] as const;
const TAIL_STEP = 0.018;
const TRANSITION_SECONDS = 0.9;
const FOLLOW_RATE = 12;
const DRAG_THRESHOLD = 6;
const HIT_SLOP = 6;
/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;
const MIN_PAGES = 20;

type Surfer = { from: number; to: number; progress: number; duration: number; jump: boolean; lane: number };

type Press = { x: number; y: number; source: number | null; dragging: boolean; pointerX: number; pointerY: number };

type Transition = { from: Float64Array; linksFrom: number; startedAt: number };

type WeightedLink = { from: number; to: number; weight: number; flow: number };

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

/** Stable 0–1 noise per pair. */
function grain(from: number, to: number) {
  const value = Math.sin(from * 12.9898 + to * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

/** How far a link has grown out of its source: a new candidate grows in, a fading one withdraws. */
function grown(weight: number) {
  return Math.min(1, weight * 6) ** 0.6;
}

export default function RankedWebFibres() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webRef = useRef<RankedWeb>(createRankedWeb());
  const bodiesRef = useRef<Body[]>([]);
  const radiiRef = useRef(new Float64Array(MAX_PAGES));
  const spacingRef = useRef(new Float64Array(MAX_PAGES));
  const pointsRef = useRef(new Float64Array(MAX_PAGES * 2));
  const targetsRef = useRef(new Float64Array(MAX_PAGES * 2));
  const bundlerRef = useRef(createBundler());
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const surfersRef = useRef<Surfer[]>([]);
  const pendingPagesRef = useRef({ value: 0 });
  const timeRef = useRef(0);
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
    const renderer = createFibreRenderer(canvas);
    if (!renderer) {
      console.warn("adaptive-coevolving-network/7-glsl-2 needs WebGL2 with float render targets.");
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Reused every frame: every candidate link, and the strong ones that pull in the layout.
    const links: WeightedLink[] = [];
    const pulling: WeightedLink[] = [];
    const riding = { x: 0, y: 0 };
    const linkOf: (BundledLink | null)[] = [];
    let frame = 0;
    let previous = performance.now();
    let sinceSummary = 2;
    let motionTime = 0;

    const tangentPoint = { x: 0, y: 0 };
    /** The rank the link from → to passes on, d · PR · w / W, or 0 if it is gone. */
    const linkFlow = (from: number, to: number) => {
      const web = webRef.current;
      const total = outWeight(web, from);
      const entry = candidate(web, from, to);
      return entry && total > 1e-12 ? (web.damping * web.rank[from]! * entry.weight) / total : 0;
    };

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
        surfer.lane = random() * 2 - 1;
        surfer.duration = 0.45 + distance / 360;
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
        return { from: page, to: page, progress: random(), duration: 0.6, jump: false, lane: random() * 2 - 1 };
      });
    };

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const next = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      renderer.resize(next.width, next.height, ratio);
      if (bodiesRef.current.length === 0) seedPages(next);
      else rescaleBodies(bodiesRef.current, sizeRef.current, next);
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
      const requested = repopulateRef.current;
      if (requested !== null) {
        // A new page count starts the web over, keeping the current d.
        repopulateRef.current = null;
        const fresh = createRankedWeb(requested);
        setDamping(fresh, dampingRef.current);
        webRef.current = fresh;
        pendingPagesRef.current = { value: 0 };
        transitionRef.current = null;
        focusRef.current = null;
        seedPages(sizeRef.current);
      }
      const web = webRef.current;
      const field = sizeRef.current;
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
      const grow = 1 - Math.exp(-8 * delta);
      const spacing = spacingRef.current;
      for (let page = 0; page < web.size; page += 1) {
        radii[page] = radii[page]! + (radiusFor(web.rank[page]!, field) - radii[page]!) * grow;
        spacing[page] = radii[page]! * REACH_SHARE + 4;
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

      // Bundling: every live link is combed toward its compatible neighbours.
      const bundler = bundlerRef.current;
      beginFrame(bundler);
      for (let index = 0; index < linkCount; index += 1) {
        const link = links[index]!;
        const presence = Math.min(1, link.weight * 6);
        linkOf[index] = presence > 0.02 ? report(bundler, link.from, link.to, presence) : null;
      }
      prune(bundler);
      relaxBundles(bundler, points, still ? 0 : delta);
      const rows = renderer.rows;
      const rowCount = Math.min(bundler.list.length, MAX_ROWS - 1);
      for (let row = 0; row < rowCount; row += 1) {
        const state = bundler.list[row]!;
        for (let index = 0; index < POINTS; index += 1) {
          linkPoint(state, points, index, riding);
          rows[(row * POINTS + index) * 2] = riding.x;
          rows[(row * POINTS + index) * 2 + 1] = riding.y;
        }
      }

      // Fibres: as many as the rank a link passes on; together they glow.
      const fibres = renderer.fibres;
      let fibreCount = 0;
      const writeFibre = (row: number, offset: number, spread: number, alpha: number, reach: number, seed: number, rootA: number, rootB: number) => {
        const at = fibreCount * FIBRE_FLOATS;
        fibres[at] = row;
        fibres[at + 1] = offset;
        fibres[at + 2] = spread;
        fibres[at + 3] = alpha;
        fibres[at + 4] = reach;
        fibres[at + 5] = seed;
        fibres[at + 6] = rootA;
        fibres[at + 7] = rootB;
        fibreCount += 1;
      };
      for (let index = 0; index < linkCount; index += 1) {
        const link = links[index]!;
        const state = linkOf[index];
        if (!state || state.row < 0 || state.row >= rowCount) continue;
        const involved = focus !== null && (link.from === focus || link.to === focus);
        const presence = state.presence;
        const strength = presence * (involved ? 1 : visibility) * (focus !== null && !involved ? 0.3 : 1);
        if (strength < 0.02) continue;
        const exact = 1 + link.flow * FIBRES_PER_RANK;
        const count = Math.ceil(exact);
        const spread = SPREAD.floor + SPREAD.scale * Math.sqrt(exact);
        const reach = grown(link.weight);
        const base = grain(link.from, link.to);
        for (let fibre = 0; fibre < count && fibreCount < MAX_FIBRES; fibre += 1) {
          // Fibres spread evenly across the bundle; the last carries the fraction left over.
          const place = ((fibre * 0.618_034 + base) % 1) * 2 - 1;
          const share = fibre === count - 1 ? exact - (count - 1) : 1;
          writeFibre(state.row, count === 1 ? 0 : place, spread, FIBRE_ALPHA * strength * share, reach, (base + fibre * 0.377) % 1, radii[link.from]!, radii[link.to]!);
        }
      }
      // A link being drawn by hand is a single bright fibre from its page to the pointer.
      const press = pressRef.current;
      if (press?.dragging && press.source !== null && fibreCount < MAX_FIBRES) {
        const ax = points[press.source * 2]!;
        const ay = points[press.source * 2 + 1]!;
        for (let index = 0; index < POINTS; index += 1) {
          const t = index / (POINTS - 1);
          rows[(rowCount * POINTS + index) * 2] = ax + (press.pointerX - ax) * t;
          rows[(rowCount * POINTS + index) * 2 + 1] = ay + (press.pointerY - ay) * t;
        }
        for (let fibre = 0; fibre < 6; fibre += 1) writeFibre(rowCount, fibre / 2.5 - 1, 1.2, FIBRE_ALPHA * 2, 1, fibre / 6, radii[press.source]!, 0);
      }

      // Surfers: sparks with short tails, riding a fibre of the link they follow;
      // a teleport fades one out at its page and in at another.
      const sparks = renderer.sparks;
      let sparkCount = 0;
      const writeSpark = (x: number, y: number, radius: number, intensity: number) => {
        if (sparkCount >= MAX_SPARKS) return;
        const at = sparkCount * SPARK_FLOATS;
        sparks[at] = x;
        sparks[at + 1] = y;
        sparks[at + 2] = radius;
        sparks[at + 3] = intensity;
        sparkCount += 1;
      };
      if (!still) {
        for (const surfer of surfersRef.current) {
          surfer.progress += delta / surfer.duration;
          if (surfer.progress >= 1) nextHop(surfer);
          const t = surfer.progress;
          if (surfer.jump) {
            const page = t < 0.5 ? surfer.from : surfer.to;
            writeSpark(points[page * 2]!, points[page * 2 + 1]!, SURFER_RADIUS, TAIL[0] * visibility * Math.abs(1 - t * 2));
            continue;
          }
          const state = bundler.links.get(linkKey(surfer.from, surfer.to));
          if (!state) continue;
          const exact = 1 + Math.max(0, linkFlow(surfer.from, surfer.to)) * FIBRES_PER_RANK;
          const spread = SPREAD.floor + SPREAD.scale * Math.sqrt(exact);
          for (let step = 0; step < TAIL.length; step += 1) {
            const u = t - step * TAIL_STEP;
            if (u <= 0) break;
            curvePoint(state, points, u, riding);
            // Offset across the bundle like a fibre at this lane.
            curvePoint(state, points, Math.min(1, u + 0.01), tangentPoint);
            const tx = tangentPoint.x - riding.x;
            const ty = tangentPoint.y - riding.y;
            const size = Math.hypot(tx, ty) || 1;
            const side = surfer.lane * spread * Math.sin(Math.PI * u) ** 0.75;
            writeSpark(riding.x - (ty / size) * side, riding.y + (tx / size) * side, SURFER_RADIUS, TAIL[step]! * visibility);
          }
        }
      }

      // Pages: flat dots whose area is their rank, over the fibres.
      const dots = renderer.dots;
      let dotCount = 0;
      for (let page = 0; page < web.size && dotCount < MAX_DOTS; page += 1) {
        const r = radii[page]!;
        if (r < 0.3) continue;
        const at = dotCount * DOT_FLOATS;
        dots[at] = points[page * 2]!;
        dots[at + 1] = points[page * 2 + 1]!;
        dots[at + 2] = r;
        dots[at + 3] = focus === null || page === focus ? 1 : 0.4;
        dotCount += 1;
      }

      renderer.render(rowCount + (press?.dragging && press.source !== null ? 1 : 0), fibreCount, sparkCount, dotCount, motionTime);

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
    const points = pointsRef.current;
    const previous = { x: 0, y: 0 };
    const next = { x: 0, y: 0 };
    for (const state of bundlerRef.current.list) {
      const entry = candidate(webRef.current, state.from, state.to);
      if (!entry || entry.fading || entry.weight < 0.05) continue;
      linkPoint(state, points, 0, previous);
      for (let index = 1; index < POINTS; index += 1) {
        linkPoint(state, points, index, next);
        if (distanceToSegment(x, y, previous.x, previous.y, next.x, next.y) <= HIT_SLOP) return { from: state.from, to: state.to };
        previous.x = next.x;
        previous.y = next.y;
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
        aria-describedby="ranked-web-fibres-summary"
        aria-label="A living web of pages ranked by PageRank, drawn as combed fibres of light. Each page is a dot whose area is its share of PageRank and grows or shrinks continuously; each link is a bundle of hairline fibres, as many as the rank it passes on, and links running the same way are combed together into brighter bundles; sparks are random surfers following links. Tap empty space to add a page; drag from one page to another to add a link or let it fade; drag from a page to empty space to create a page it links to; tap a bundle to let its link fade; tap a page to highlight its links. Press N to add a page linked from the leader, Escape to clear focus."
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
      <p id="ranked-web-fibres-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {optionsOpen && (
          <div id="ranked-web-fibres-options" className={styles.options}>
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
          aria-controls="ranked-web-fibres-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
