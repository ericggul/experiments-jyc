"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./autocatalytic-ecosystem.module.css";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
  type Link,
} from "./layout";
import {
  createEcosystem,
  DEFAULT_LINKAGE,
  DEFAULT_SPECIES,
  LINKAGE_RANGE,
  measureEcosystem,
  removeSpecies,
  updateEcosystem,
  type Ecosystem,
  type Replacement,
} from "./model";
import { LINK_VISIBILITY, viewLabels, viewTargets, VIEWS, type ViewId } from "./views";

/** Seed whose first minute shows an autocatalytic set filling the field, then a crash. */
const SEED = 9;
/** Graph updates (one species replaced) per second. */
const DEFAULT_RATE = 8;
const RATE_RANGE = [2, 16] as const;
const INK = "17, 17, 15";
const CORE = "18, 122, 82";
const MARK_LIFETIME = 0.9;
const MAX_MARKS = 160;
const TRANSITION_SECONDS = 0.9;
/** How quickly points follow their target once a view has settled. */
const FOLLOW_RATE = 12;
/** How quickly drawn sizes follow population after an update. */
const GROWTH_RATE = 6;
/** Space kept clear for the collapsed options toggle. */
const CONTROL_BAND = 56;

type Mark =
  | ({ kind: "replace"; at: number } & Pick<Replacement, "species" | "cause" | "lostOut" | "lostInto" | "out" | "into">)
  | { kind: "die"; species: number; at: number };

type Transition = {
  from: Float64Array;
  previous: ViewId;
  linksFrom: number;
  startedAt: number;
};

function layoutFrame(size: Frame): Frame {
  return { width: size.width, height: Math.max(size.height * 0.5, size.height - CONTROL_BAND) };
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

function baseRadius(size: Frame, count: number) {
  return Math.max(2.2, Math.min(4.5, idealLength(layoutFrame(size), count) * 0.07));
}

/** Area grows with population; an average share 1/s draws at about 2.5 × base. */
function populationRadius(base: number, population: number, count: number) {
  if (population <= 0) return base * 0.8;
  return Math.min(base * 6, base * (0.9 + 1.6 * Math.sqrt(population * count)));
}

function linksOf(ecosystem: Ecosystem): Link[] {
  const links: Link[] = [];
  ecosystem.out.forEach((targets, from) => {
    for (const to of targets) links.push([from, to]);
  });
  return links;
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  ecosystem: Ecosystem,
  links: readonly Link[],
  points: Float64Array,
  radii: Float64Array,
  marks: readonly Mark[],
  time: number,
  linkVisibility: number,
  focus: number | null,
  labels: readonly { text: string; x: number; y: number; align: CanvasTextAlign; alpha: number }[],
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";
  const { population, role, size: count } = ecosystem;
  const base = baseRadius(size, count);
  const x = (species: number) => points[species * 2]!;
  const y = (species: number) => points[species * 2 + 1]!;

  // Each link j → i is a wedge, wide at the catalyst and pointed at the species
  // it feeds, as wide as the catalyst's population. Links out of species with
  // no population carry nothing and stay faint; links within the core are green.
  for (const [from, to] of links) {
    const dx = x(to) - x(from);
    const dy = y(to) - y(from);
    const distance = Math.hypot(dx, dy);
    if (distance < 1) continue;
    const feeding = population[from]! > 0;
    const inCore = role[from] === "core" && role[to] === "core";
    const alpha = !feeding
      ? 0.12 * linkVisibility
      : inCore
        ? 0.55 * Math.max(0.6, linkVisibility)
        : 0.38 * linkVisibility;
    if (alpha < 0.01) continue;
    const half = feeding ? Math.min(base * 1.6, 0.5 + base * 0.45 * Math.sqrt(population[from]! * count)) : 0.5;
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const reach = Math.max(0, distance - radii[to]! - 1) / distance;
    context.fillStyle = `rgba(${inCore ? CORE : INK}, ${alpha})`;
    context.beginPath();
    context.moveTo(x(from) + normalX * half, y(from) + normalY * half);
    context.lineTo(x(from) + dx * reach, y(from) + dy * reach);
    context.lineTo(x(from) - normalX * half, y(from) - normalY * half);
    context.closePath();
    context.fill();
  }

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1) continue;
    const fade = 1 - progress;
    const species = mark.species;
    if (mark.kind === "die") {
      // A species losing all its population: a ring closing in on it.
      context.strokeStyle = `rgba(${INK}, ${0.45 * fade})`;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(x(species), y(species), base * (1 + 3 * fade), 0, Math.PI * 2);
      context.stroke();
      continue;
    }
    // The departing species's links linger dashed; the newcomer's links are drawn out.
    context.setLineDash([2, 4]);
    context.strokeStyle = `rgba(${INK}, ${0.4 * fade})`;
    context.lineWidth = 1;
    context.beginPath();
    for (const other of [...mark.lostOut, ...mark.lostInto]) {
      context.moveTo(x(species), y(species));
      context.lineTo(x(other), y(other));
    }
    context.stroke();
    context.setLineDash([]);
    const extent = Math.min(1, progress * 3);
    context.strokeStyle = `rgba(${INK}, ${0.2 + 0.6 * fade})`;
    context.lineWidth = 1.4;
    context.beginPath();
    for (const other of mark.out) {
      context.moveTo(x(species), y(species));
      context.lineTo(x(species) + (x(other) - x(species)) * extent, y(species) + (y(other) - y(species)) * extent);
    }
    for (const other of mark.into) {
      context.moveTo(x(other), y(other));
      context.lineTo(x(other) + (x(species) - x(other)) * extent, y(other) + (y(species) - y(other)) * extent);
    }
    context.stroke();
    context.strokeStyle = `rgba(${INK}, ${(mark.cause === "removed" ? 0.8 : 0.5) * fade})`;
    context.lineWidth = mark.cause === "removed" ? 1.6 : 1;
    context.beginPath();
    context.arc(x(species), y(species), base + progress * (mark.cause === "removed" ? 26 : 12), 0, Math.PI * 2);
    context.stroke();
  }

  for (let species = 0; species < count; species += 1) {
    const radius = radii[species]!;
    context.beginPath();
    context.arc(x(species), y(species), radius, 0, Math.PI * 2);
    if (role[species] === "absent") {
      context.strokeStyle = `rgba(${INK}, 0.38)`;
      context.lineWidth = 1;
      context.stroke();
    } else {
      context.fillStyle = role[species] === "core" ? `rgb(${CORE})` : `rgb(${INK})`;
      context.fill();
    }
  }

  if (focus !== null) {
    context.strokeStyle = `rgb(${INK})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(x(focus), y(focus), radii[focus]! + 5, 0, Math.PI * 2);
    context.stroke();
  }

  context.font = "12px Arial, Helvetica, sans-serif";
  context.textBaseline = "middle";
  for (const label of labels) {
    if (label.alpha < 0.01) continue;
    context.fillStyle = `rgba(${INK}, ${0.55 * label.alpha})`;
    context.textAlign = label.align;
    context.fillText(label.text, label.x, label.y);
  }
}

export default function AutocatalyticEcosystemEight() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ecosystemRef = useRef<Ecosystem>(createEcosystem(DEFAULT_SPECIES, DEFAULT_LINKAGE, SEED));
  const linksRef = useRef<{ updates: number; links: Link[] }>({ updates: -1, links: [] });
  const bodiesRef = useRef<Body[] | null>(null);
  const pointsRef = useRef(new Float64Array(DEFAULT_SPECIES * 2));
  const targetsRef = useRef(new Float64Array(DEFAULT_SPECIES * 2));
  const radiiRef = useRef(new Float64Array(DEFAULT_SPECIES));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const linkageRef = useRef(DEFAULT_LINKAGE);
  const rateRef = useRef(DEFAULT_RATE);
  const viewRef = useRef<ViewId>("network");
  const linkVisibilityRef = useRef(LINK_VISIBILITY.network);
  const transitionRef = useRef<Transition | null>(null);
  const focusRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(false);
  const [linkage, setLinkage] = useState(DEFAULT_LINKAGE);
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [view, setView] = useState<ViewId>("network");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    linkageRef.current = linkage;
  }, [linkage]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const changeView = useCallback((next: ViewId) => {
    setView(next);
    if (next === viewRef.current) return;
    transitionRef.current = {
      from: pointsRef.current.slice(),
      previous: viewRef.current,
      linksFrom: linkVisibilityRef.current,
      startedAt: timeRef.current,
    };
    viewRef.current = next;
  }, []);

  /** Records an update's events; the replaced species restarts at rest. */
  const record = useCallback((event: Replacement) => {
    const body = bodiesRef.current?.[event.species];
    if (body) {
      body.vx = 0;
      body.vy = 0;
    }
    if (reduceMotionRef.current) return;
    const at = timeRef.current;
    marksRef.current.push({
      kind: "replace",
      species: event.species,
      cause: event.cause,
      lostOut: event.lostOut,
      lostInto: event.lostInto,
      out: event.out,
      into: event.into,
      at,
    });
    for (const species of event.died) marksRef.current.push({ kind: "die", species, at });
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
    let pending = 0;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const next = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(next.width * ratio);
      canvas.height = Math.round(next.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const ecosystem = ecosystemRef.current;
      if (bodiesRef.current) {
        rescaleBodies(bodiesRef.current, layoutFrame(sizeRef.current), layoutFrame(next));
      } else {
        bodiesRef.current = createBodies(ecosystem.size, layoutFrame(next));
        bodiesRef.current.forEach((body, species) => {
          pointsRef.current[species * 2] = body.x;
          pointsRef.current[species * 2 + 1] = body.y;
          radiiRef.current[species] = populationRadius(baseRadius(next, ecosystem.size), ecosystem.population[species]!, ecosystem.size);
        });
      }
      sizeRef.current = next;
    };

    const render = (now: number) => {
      const delta = Math.min((now - previous) / 1_000, 0.05);
      previous = now;
      reduceMotionRef.current = reduceMotion.matches;
      const tempo = reduceMotion.matches ? 0.3 : 1;
      timeRef.current += delta;
      const ecosystem = ecosystemRef.current;
      const bodies = bodiesRef.current;
      if (bodies) {
        // At most three updates per frame, so a slow frame never bursts.
        pending = Math.min(3, pending + delta * rateRef.current * tempo);
        while (pending >= 1) {
          pending -= 1;
          record(updateEcosystem(ecosystem, linkageRef.current));
        }
        const fresh = marksRef.current.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);
        marksRef.current = fresh.slice(Math.max(0, fresh.length - MAX_MARKS));
        if (linksRef.current.updates !== ecosystem.updates) {
          linksRef.current = { updates: ecosystem.updates, links: linksOf(ecosystem) };
        }
        const links = linksRef.current.links;
        // The force layout keeps running in every view so returning to it is continuous.
        relaxBodies(bodies, links, layoutFrame(sizeRef.current), delta * tempo);

        const size = sizeRef.current;
        const field = layoutFrame(size);
        const current = viewRef.current;
        const points = pointsRef.current;
        const targets = targetsRef.current;
        viewTargets(current, ecosystem, bodies, field, targets);
        const transition = transitionRef.current;
        const progress = transition
          ? Math.min(1, (timeRef.current - transition.startedAt) / (reduceMotion.matches ? 0.01 : TRANSITION_SECONDS))
          : 1;
        const eased = easeInOut(progress);
        const follow = 1 - Math.exp(-FOLLOW_RATE * delta);
        for (let index = 0; index < ecosystem.size * 2; index += 1) {
          points[index] = transition && progress < 1
            ? transition.from[index]! + (targets[index]! - transition.from[index]!) * eased
            : points[index]! + (targets[index]! - points[index]!) * follow;
        }
        const base = baseRadius(size, ecosystem.size);
        const grow = 1 - Math.exp(-GROWTH_RATE * delta * tempo);
        const radii = radiiRef.current;
        for (let species = 0; species < ecosystem.size; species += 1) {
          const target = populationRadius(base, ecosystem.population[species]!, ecosystem.size);
          radii[species] = radii[species]! + (target - radii[species]!) * grow;
        }
        const linksFrom = transition?.linksFrom ?? LINK_VISIBILITY[current];
        linkVisibilityRef.current = linksFrom + (LINK_VISIBILITY[current] - linksFrom) * eased;
        const labels = [
          ...viewLabels(current, field).map((label) => ({ ...label, alpha: eased })),
          ...(transition && progress < 1
            ? viewLabels(transition.previous, field).map((label) => ({ ...label, alpha: 1 - eased }))
            : []),
        ];
        if (transition && progress >= 1) transitionRef.current = null;

        const focus = document.activeElement === canvas ? focusRef.current : null;
        draw(context, size, ecosystem, links, points, radii, marksRef.current, timeRef.current, linkVisibilityRef.current, focus, labels);

        sinceSummary += delta;
        if (sinceSummary > 2) {
          sinceSummary = 0;
          const measure = measureEcosystem(ecosystem);
          setSummary(
            measure.lambda >= 1
              ? `${measure.living} of ${ecosystem.size} species have a population, held up by an autocatalytic core of ${measure.core}. Perron eigenvalue ${measure.lambda.toFixed(2)}.`
              : `No autocatalytic set yet; ${measure.living} of ${ecosystem.size} species have a population, at the ends of the longest catalytic chains.`,
          );
        }
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
  }, [record]);

  const extinguish = useCallback((species: number) => {
    const event = removeSpecies(ecosystemRef.current, species, linkageRef.current);
    if (event) record(event);
    setTouched(true);
  }, [record]);

  // Tapping a species makes it extinct; a random newcomer takes its place.
  const tapAt = useCallback((x: number, y: number) => {
    const ecosystem = ecosystemRef.current;
    const points = pointsRef.current;
    let nearest = -1;
    let best = Infinity;
    for (let species = 0; species < ecosystem.size; species += 1) {
      const distance = Math.hypot(points[species * 2]! - x, points[species * 2 + 1]! - y) - radiiRef.current[species]!;
      if (distance < best) {
        best = distance;
        nearest = species;
      }
    }
    focusRef.current = null;
    if (nearest >= 0 && best <= 8) extinguish(nearest);
  }, [extinguish]);

  // Arrow keys step through species from most to least populous; Enter removes.
  const onKey = useCallback((key: string) => {
    const ecosystem = ecosystemRef.current;
    const order = Array.from({ length: ecosystem.size }, (_, species) => species)
      .sort((a, b) => ecosystem.population[b]! - ecosystem.population[a]! || a - b);
    const focus = focusRef.current;
    if (key === "Enter" || key === " ") {
      extinguish(focus ?? order[0]!);
      return;
    }
    const step = key === "ArrowRight" || key === "ArrowDown" ? 1 : -1;
    const index = focus === null ? (step > 0 ? -1 : 0) : order.indexOf(focus);
    focusRef.current = order[(index + step + order.length) % order.length]!;
  }, [extinguish]);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="autocatalytic-ecosystem-summary"
        aria-label="Ecosystem of species that catalyse each other. Each wedge points from a species to one whose production it helps; dot size is population, green dots and wedges are the self-sustaining core, hollow dots have no population. Several times a second the least populous species dies out and a newcomer with random links takes its place. Tap a species to make it extinct. Arrow keys step through species from most to least populous; Enter makes the selected one extinct. Options below change how many links newcomers make, the pace, and the view."
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          tapAt(event.clientX - bounds.left, event.clientY - bounds.top);
        }}
        onKeyDown={(event) => {
          if (!["Enter", " ", "ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) return;
          event.preventDefault();
          onKey(event.key);
        }}
      />
      <p id="autocatalytic-ecosystem-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>종을 누르면 멸종</p>
        )}
        {optionsOpen && (
          <div id="autocatalytic-ecosystem-options" className={styles.options}>
            <p className={styles.about}>
              연결은 한 종이 다른 종의 생산을 돕는 촉매 관계이고(뾰족한 쪽이 도움을 받는 종),
              개체수는 이 연결을 따라 곧바로 자리를 잡습니다. 그때마다 개체수가 가장 적은 종이 사라지고, 연결이 무작위인
              새 종이 그 자리에 들어옵니다. 우연히 생긴 촉매 순환이 개체수를 모으면 순환에서 먹이를
              받는 새 종만 살아남아 순환이 생태계 전체로 자라고, 그 핵심 종이 사라지면 한꺼번에
              무너집니다. (자가촉매 집합 모델, Jain·Krishna 1998)
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
              <span>드묾</span>
              <input
                aria-label="새 종이 맺는 촉매 연결의 수"
                aria-valuetext={`새 종 하나당 평균 ${linkage.toFixed(2)}개`}
                max={LINKAGE_RANGE[1]}
                min={LINKAGE_RANGE[0]}
                step="0.05"
                type="range"
                value={linkage}
                onChange={(event) => setLinkage(Number(event.target.value))}
              />
              <span>잦음</span>
            </label>
            <label className={styles.balance}>
              <span>느리게</span>
              <input
                aria-label="초당 교체되는 종의 수"
                aria-valuetext={`초당 ${rate}종`}
                max={RATE_RANGE[1]}
                min={RATE_RANGE[0]}
                step="1"
                type="range"
                value={rate}
                onChange={(event) => setRate(Number(event.target.value))}
              />
              <span>빠르게</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="autocatalytic-ecosystem-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
