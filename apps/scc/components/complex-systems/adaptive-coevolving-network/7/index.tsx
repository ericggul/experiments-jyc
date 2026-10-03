"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ranked-web.module.css";
import { bodyAt, relaxBodies, rescaleBodies, type Body, type Frame, type Pair } from "./layout";
import {
  addCandidate,
  addPage,
  candidate,
  concentration,
  createRankedWeb,
  DAMPING_RANGE,
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
import { LINK_VISIBILITY, viewTargets, VIEWS, type ViewId } from "./views";

const INK = "17, 17, 15";
const ACCENT = "214, 58, 34";
const CONTROL_BAND = 56;
/** Share of the field's area that all discs together cover; disc area = rank × this. */
const AREA_BUDGET = 0.06;
const MIN_RADIUS = 2.2;
/** Discs at least this wide carry their rank as a percentage inside. */
const LABEL_RADIUS = 14;
/** Weight a link drawn by hand starts with; it then follows appeal like any other. */
const HAND_LINK_WEIGHT = 0.5;
/** Random surfers drawn moving along links; their density approximates rank. */
const SURFERS = 160;
const MARK_LIFETIME = 0.9;
const TRANSITION_SECONDS = 0.9;
const FOLLOW_RATE = 12;
const DRAG_THRESHOLD = 6;
const HIT_SLOP = 6;

type Surfer = { from: number; to: number; progress: number; duration: number; jump: boolean };

type Press = { x: number; y: number; source: number | null; dragging: boolean; pointerX: number; pointerY: number };

type Transition = { from: Float64Array; linksFrom: number; startedAt: number };

type WeightedPair = Pair & { weight: number; flow: number };

function layoutFrame(size: Frame): Frame {
  return { width: size.width, height: Math.max(size.height * 0.5, size.height - CONTROL_BAND) };
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

/** Every candidate link with its weight and the rank it passes on, d · PR · w / W. */
function weightedLinks(web: RankedWeb): WeightedPair[] {
  const links: WeightedPair[] = [];
  for (let from = 0; from < web.size; from += 1) {
    const total = outWeight(web, from);
    if (total <= 1e-12) continue;
    for (const entry of web.out[from]!) {
      links.push({
        from,
        to: entry.target,
        weight: entry.weight,
        flow: (web.damping * web.rank[from]! * entry.weight) / total,
      });
    }
  }
  return links;
}

/** A link from rim to rim; its width is the rank it passes on. */
function drawLink(
  context: CanvasRenderingContext2D,
  points: Float64Array,
  radii: Float64Array,
  link: { from: number; to: number; flow: number },
  alpha: number,
  colour = INK,
) {
  const { from, to, flow } = link;
  const x1 = points[from * 2]!;
  const y1 = points[from * 2 + 1]!;
  const x2 = points[to * 2]!;
  const y2 = points[to * 2 + 1]!;
  const distance = Math.hypot(x2 - x1, y2 - y1);
  if (distance < radii[from]! + radii[to]! + 2) return;
  const ux = (x2 - x1) / distance;
  const uy = (y2 - y1) / distance;
  const width = 0.4 + flow * 60;
  const head = 3 + width * 1.3;
  const startX = x1 + ux * (radii[from]! + 1);
  const startY = y1 + uy * (radii[from]! + 1);
  const tipX = x2 - ux * (radii[to]! + 1.5);
  const tipY = y2 - uy * (radii[to]! + 1.5);
  context.strokeStyle = `rgba(${colour}, ${alpha})`;
  context.fillStyle = `rgba(${colour}, ${alpha})`;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(tipX - ux * head * 0.7, tipY - uy * head * 0.7);
  context.stroke();
  context.beginPath();
  context.moveTo(tipX, tipY);
  context.lineTo(tipX - ux * head - uy * head * 0.5, tipY - uy * head + ux * head * 0.5);
  context.lineTo(tipX - ux * head + uy * head * 0.5, tipY - uy * head - ux * head * 0.5);
  context.closePath();
  context.fill();
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

export default function RankedWebSeven() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webRef = useRef<RankedWeb>(createRankedWeb());
  const bodiesRef = useRef<Body[]>([]);
  const radiiRef = useRef(new Float64Array(MAX_PAGES));
  const pointsRef = useRef(new Float64Array(MAX_PAGES * 2));
  const targetsRef = useRef(new Float64Array(MAX_PAGES * 2));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const pagesBornRef = useRef<{ page: number; at: number }[]>([]);
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
  const [view, setView] = useState<ViewId>("network");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
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
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = performance.now();
    let sinceSummary = 2;

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

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const next = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(next.width * ratio);
      canvas.height = Math.round(next.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const field = layoutFrame(next);
      if (bodiesRef.current.length === 0) {
        const web = webRef.current;
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
      } else {
        rescaleBodies(bodiesRef.current, layoutFrame(sizeRef.current), field);
      }
      sizeRef.current = next;
    };

    const render = (now: number) => {
      const delta = Math.min((now - previous) / 1_000, 0.05);
      previous = now;
      timeRef.current += delta;
      const web = webRef.current;
      const size = sizeRef.current;
      const field = layoutFrame(size);
      const tempo = reduceMotion.matches ? 0.3 : 1;

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
      for (let page = 0; page < web.size; page += 1) {
        radii[page] = radii[page]! + (radiusFor(web.rank[page]!, field) - radii[page]!) * grow;
      }
      const links = weightedLinks(web);
      relaxBodies(bodiesRef.current, links.filter((link) => link.weight > 0.08), radii, field, delta * tempo);

      const current = viewRef.current;
      const points = pointsRef.current;
      const targets = targetsRef.current;
      viewTargets(current, bodiesRef.current, radii, web.rank, web.size, field, targets);
      const transition = transitionRef.current;
      const progress = transition
        ? Math.min(1, (timeRef.current - transition.startedAt) / (reduceMotion.matches ? 0.01 : TRANSITION_SECONDS))
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

      // Links: width and ink are the rank each passes on; they swell and fade continuously.
      context.clearRect(0, 0, size.width, size.height);
      context.lineCap = "round";
      const visibility = linkVisibilityRef.current;
      const focus = focusRef.current;
      for (const link of links) {
        const involved = focus !== null && (link.from === focus || link.to === focus);
        const strength = Math.min(0.7, 0.05 + link.flow * 12) * Math.min(1, link.weight * 6);
        const alpha = strength * (involved ? 1.6 : visibility) * (focus !== null && !involved ? 0.5 : 1);
        if (alpha < 0.008) continue;
        drawLink(context, points, radii, link, Math.min(0.9, alpha), involved ? ACCENT : INK);
      }
      const press = pressRef.current;
      if (press?.dragging && press.source !== null) {
        context.setLineDash([3, 4]);
        context.strokeStyle = `rgba(${ACCENT}, 0.7)`;
        context.lineWidth = 1.4;
        context.beginPath();
        context.moveTo(points[press.source * 2]!, points[press.source * 2 + 1]!);
        context.lineTo(press.pointerX, press.pointerY);
        context.stroke();
        context.setLineDash([]);
      }

      // Surfers: following a link they glide along it; jumping they fade out and in.
      if (!reduceMotion.matches) {
        context.fillStyle = `rgba(${ACCENT}, 0.85)`;
        for (const surfer of surfersRef.current) {
          surfer.progress += delta / surfer.duration;
          if (surfer.progress >= 1) nextHop(surfer);
          const t = surfer.progress;
          const fx = points[surfer.from * 2]!;
          const fy = points[surfer.from * 2 + 1]!;
          const tx = points[surfer.to * 2]!;
          const ty = points[surfer.to * 2 + 1]!;
          let x = fx + (tx - fx) * t;
          let y = fy + (ty - fy) * t;
          let alpha = visibility;
          if (surfer.jump) {
            x = t < 0.5 ? fx : tx;
            y = t < 0.5 ? fy : ty;
            alpha *= Math.abs(1 - t * 2) * 0.6;
          }
          if (alpha < 0.05) continue;
          context.globalAlpha = Math.min(1, alpha);
          context.beginPath();
          context.arc(x, y, 1.7, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
      }

      // Pages: disc area is rank; large discs carry their percentage.
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (let page = 0; page < web.size; page += 1) {
        const x = points[page * 2]!;
        const y = points[page * 2 + 1]!;
        const r = radii[page]!;
        context.fillStyle = page === focus ? `rgb(${ACCENT})` : `rgb(${INK})`;
        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fill();
        if (r >= LABEL_RADIUS) {
          context.fillStyle = "#ffffff";
          context.font = `${Math.round(Math.min(18, 9 + r * 0.2))}px Arial, Helvetica, sans-serif`;
          context.fillText(percent(web.rank[page]!), x, y);
        }
      }
      pagesBornRef.current = pagesBornRef.current.filter((born) => timeRef.current - born.at < MARK_LIFETIME);
      for (const born of pagesBornRef.current) {
        const fade = 1 - (timeRef.current - born.at) / MARK_LIFETIME;
        context.strokeStyle = `rgba(${ACCENT}, ${0.7 * fade})`;
        context.lineWidth = 1.2;
        context.beginPath();
        context.arc(points[born.page * 2]!, points[born.page * 2 + 1]!, radii[born.page]! + 4 + (1 - fade) * 14, 0, Math.PI * 2);
        context.stroke();
      }
      if (focus !== null && focus < web.size && radii[focus]! < LABEL_RADIUS) {
        context.fillStyle = `rgb(${ACCENT})`;
        context.font = "12px Arial, Helvetica, sans-serif";
        context.fillText(percent(web.rank[focus]!), points[focus * 2]!, points[focus * 2 + 1]! - radii[focus]! - 10);
      }

      sinceSummary += delta;
      if (sinceSummary > 2) {
        sinceSummary = 0;
        const share = concentration(web);
        setSummary(`${web.size} pages. The leading page, number ${leader(web) + 1}, holds ${percent(share.top)} of PageRank; the top tenth of pages hold ${percent(share.topTenth)}.`);
      }
      frame = requestAnimationFrame(render);
    };

    sizeCanvas();
    const observer = new ResizeObserver(sizeCanvas);
    observer.observe(canvas);
    frame = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
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
        aria-describedby="ranked-web-summary"
        aria-label="A living web of pages ranked by PageRank. Each page's area is its share of PageRank and grows or shrinks continuously; each link's width is the rank it passes on; red dots are random surfers following links. Tap empty space to add a page; drag from one page to another to add a link or let it fade; drag from a page to empty space to create a page it links to; tap a link to let it fade; tap a page to highlight its links. Press N to add a page linked from the leader, Escape to clear focus."
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
          setTouched(true);
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
          setTouched(true);
        }}
      />
      <p id="ranked-web-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>크기가 곧 PageRank · 빈 곳을 누르면 새 페이지, 페이지에서 페이지로 끌면 링크</p>
        )}
        {optionsOpen && (
          <div id="ranked-web-options" className={styles.options}>
            <p className={styles.about}>
              PageRank는 링크를 따라 무작위로 돌아다니는 사람(빨간 점)이 각 페이지에 머무는 시간의
              비율이고, 원의 넓이가 곧 그 비율입니다. 페이지들은 관심을 매력 있는 곳(순위가 높고
              품질이 좋은 곳)으로 조금씩 옮기고, 그 관심이 다시 순위를 만듭니다. 품질이 계속
              오르내려서 1위도 계속 바뀝니다. (Brin·Page 1998; Fortunato·Flammini·Menczer 2006)
            </p>
            <div className={styles.views} role="group" aria-label="보기">
              {VIEWS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.control}
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
                  setDamping(webRef.current, value);
                }}
              />
              <span>링크만</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="ranked-web-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
