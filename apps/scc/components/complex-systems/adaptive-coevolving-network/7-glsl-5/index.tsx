"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ranked-web-swarm.module.css";
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
import { createSwarmRenderer, LINK_SLOTS, MAX_AGENTS, MAX_TEXTURE_PAGES } from "./swarm";
import { LINK_VISIBILITY, viewTargets, VIEWS, type ViewId } from "./views";

/**
 * Share of the field's area that all pages together cover: a surfer stays
 * inside its page's disc, so its trail fills an area that grows with rank.
 */
const AREA_BUDGET = 0.03;
const MIN_RADIUS = 2.5;
/** Pages are spaced by this share of their radius, plus a gap that shrinks for small pages. */
const REACH_SHARE = 1.12;
/** Weight a link drawn by hand starts with; it then follows appeal like any other. */
const HAND_LINK_WEIGHT = 0.5;
/** The colony: it starts with this many surfers and doubles every DIVISION seconds up to MAX_AGENTS. */
const FOUNDERS = 192;
const DIVISION = 1.6;
const TRANSITION_SECONDS = 0.9;
const FOLLOW_RATE = 12;
const DRAG_THRESHOLD = 6;
const HIT_SLOP = 6;
/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;
const MIN_PAGES = 20;

type Press = { x: number; y: number; source: number | null; dragging: boolean; pointerX: number; pointerY: number };

type Transition = { from: Float64Array; linksFrom: number; startedAt: number };

type WeightedLink = { from: number; to: number; weight: number };

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

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

export default function RankedWebSwarm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webRef = useRef<RankedWeb>(createRankedWeb());
  const bodiesRef = useRef<Body[]>([]);
  const radiiRef = useRef(new Float64Array(MAX_PAGES));
  const spacingRef = useRef(new Float64Array(MAX_PAGES));
  const pointsRef = useRef(new Float64Array(MAX_PAGES * 2));
  const targetsRef = useRef(new Float64Array(MAX_PAGES * 2));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
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

  /** Presentation-only randomness (layout seeds); never touches the model. */
  const random = useCallback(() => {
    let state = randomRef.current;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    randomRef.current = state >>> 0 || 1;
    return randomRef.current / 4_294_967_296;
  }, []);

  /** Gives page `page` a body and a position at (x, y); it grows in from nothing. */
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
    const renderer = createSwarmRenderer(canvas);
    if (!renderer) {
      console.warn("adaptive-coevolving-network/7-glsl-5 needs WebGL2 with float render targets.");
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pulling: WeightedLink[] = [];
    const presence = new Float64Array(MAX_PAGES);
    let frame = 0;
    let previous = performance.now();
    let sinceSummary = 2;
    let motionTime = 0;
    // The colony's age: its size doubles every DIVISION seconds.
    let colonyAge = 0;
    let colony = FOUNDERS;

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
        // A new page count starts the web, and the colony, over.
        repopulateRef.current = null;
        const fresh = createRankedWeb(requested);
        setDamping(fresh, dampingRef.current);
        webRef.current = fresh;
        pendingPagesRef.current = { value: 0 };
        transitionRef.current = null;
        focusRef.current = null;
        seedPages(sizeRef.current);
        renderer.reset();
        colonyAge = 0;
        colony = FOUNDERS;
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

      // Radii track rank; small pages may cluster (as in 7-glsl-3).
      const radii = radiiRef.current;
      const grow = 1 - Math.exp(-8 * delta);
      const spacing = spacingRef.current;
      for (let page = 0; page < web.size; page += 1) {
        radii[page] = radii[page]! + (radiusFor(web.rank[page]!, field) - radii[page]!) * grow;
        presence[page] = Math.min(1, Math.max(0.35, Math.sqrt((web.rank[page]! * web.size) / 4)));
        spacing[page] = radii[page]! * REACH_SHARE + 3 * presence[page]!;
      }

      // The layout pulls on links that matter.
      pulling.length = 0;
      for (let from = 0; from < web.size; from += 1) {
        for (const entry of web.out[from]!) {
          if (entry.weight > 0.08) pulling.push({ from, to: entry.target, weight: entry.weight });
        }
      }
      relaxBodies(bodiesRef.current, pulling, spacing, field, delta * tempo, presence);

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

      // Pages and their links, as the surfers read them: position, radius,
      // and each page's candidates as a cumulative distribution of weight.
      const pageData = renderer.pages;
      const linkData = renderer.links;
      const count = Math.min(web.size, MAX_TEXTURE_PAGES);
      for (let page = 0; page < count; page += 1) {
        const total = outWeight(web, page);
        const list = web.out[page]!;
        let slots = 0;
        let running = 0;
        if (total > 1e-9) {
          for (const entry of list) {
            if (slots >= LINK_SLOTS) break;
            running += entry.weight;
            const at = (page * LINK_SLOTS + slots) * 4;
            linkData[at] = entry.target;
            linkData[at + 1] = running / total;
            slots += 1;
          }
          // The last slot takes whatever weight the table could not hold.
          if (slots > 0) linkData[(page * LINK_SLOTS + slots - 1) * 4 + 1] = 1;
        }
        pageData[page * 4] = points[page * 2]!;
        pageData[page * 4 + 1] = points[page * 2 + 1]!;
        pageData[page * 4 + 2] = radii[page]!;
        pageData[page * 4 + 3] = slots;
      }

      // The colony divides until it is full.
      const parents = colony;
      if (!still) {
        colonyAge += delta;
        colony = Math.min(MAX_AGENTS, Math.round(FOUNDERS * 2 ** (colonyAge / DIVISION)));
      }

      renderer.render(
        { seconds: still ? 0 : delta, pageCount: count, damping: web.damping, population: colony, parents },
        motionTime,
      );

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
    for (let from = 0; from < web.size; from += 1) {
      for (const entry of web.out[from]!) {
        if (entry.fading || entry.weight < 0.05) continue;
        const to = entry.target;
        const d = distanceToSegment(x, y, points[from * 2]!, points[from * 2 + 1]!, points[to * 2]!, points[to * 2 + 1]!);
        if (d <= HIT_SLOP) return { from, to };
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
        aria-describedby="ranked-web-swarm-summary"
        aria-label="A living web of pages ranked by PageRank, performed by a colony of random surfers. Each surfer stays a moment at a page, then follows a link chosen by weight with probability d or jumps anywhere; the picture is only the trail they leave, so a page glows as brightly as its rank and a link is a vein as thick as the rank it carries. The colony grows by division from a few surfers. Tap empty space to add a page; drag from one page to another to add a link or let it fade; drag from a page to empty space to create a page it links to; tap between two pages to let their link fade; tap a page to focus it. Press N to add a page linked from the leader, Escape to clear focus."
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
      <p id="ranked-web-swarm-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {optionsOpen && (
          <div id="ranked-web-swarm-options" className={styles.options}>
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
          aria-controls="ranked-web-swarm-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
