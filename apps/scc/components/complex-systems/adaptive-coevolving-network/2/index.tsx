"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./adaptive-epidemic.module.css";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
} from "./layout";
import {
  addPerson,
  AVOIDANCE_RANGE,
  createEpidemicNetwork,
  DEFAULT_PARAMETERS,
  infectPerson,
  MAX_PEOPLE,
  measureEpidemic,
  stepEpidemicNetwork,
  type EpidemicNetwork,
} from "./model";
import { TIE_VISIBILITY, viewLabels, viewTargets, VIEWS, type ViewId } from "./views";

/** Model time units per second; an infection lasts about 2.7 s on average. */
const TEMPO = 1.5;
const INK = "17, 17, 15";
const ILL = "214, 58, 34";
const MARK_LIFETIME = 0.9;
const MAX_MARKS = 240;
const NEWCOMER_TIES = 2;
const TRANSITION_SECONDS = 0.9;
/** How quickly points follow their target once a view has settled. */
const FOLLOW_RATE = 12;
/** Space kept clear for the collapsed options toggle. */
const CONTROL_BAND = 56;

type Mark =
  | { kind: "avoid"; person: number; from: number; to: number; at: number }
  | { kind: "infect"; person: number; at: number };

type Transition = {
  from: Float64Array;
  previous: ViewId;
  tiesFrom: number;
  startedAt: number;
};

function layoutFrame(size: Frame): Frame {
  return { width: size.width, height: Math.max(size.height * 0.5, size.height - CONTROL_BAND) };
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

function personRadius(network: EpidemicNetwork, size: Frame, person: number) {
  const base = Math.max(2, Math.min(4.5, idealLength(size, network.size) * 0.1));
  return base * (0.75 + Math.sqrt(network.incident[person]!.length) * 0.14);
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  network: EpidemicNetwork,
  points: Float64Array,
  marks: readonly Mark[],
  time: number,
  tieVisibility: number,
  labels: readonly { text: string; x: number; y: number; align: CanvasTextAlign; alpha: number }[],
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";
  const { health, ties } = network;
  const line = (a: number, b: number) => {
    context.moveTo(points[a * 2]!, points[a * 2 + 1]!);
    context.lineTo(points[b * 2]!, points[b * 2 + 1]!);
  };

  // Healthy ties quietly in ink; any tie touching an infected person in red,
  // strongest where it can still pass the infection on.
  for (const [colour, alpha, width, match] of [
    [INK, 0.14 * tieVisibility, 0.8, (a: string, b: string) => a === "S" && b === "S"],
    [ILL, 0.16 * tieVisibility, 0.8, (a: string, b: string) => a === "I" && b === "I"],
    [ILL, 0.62 * Math.max(0.3, tieVisibility), 1.1, (a: string, b: string) => a !== b],
  ] as const) {
    if (alpha < 0.01) continue;
    context.strokeStyle = `rgba(${colour}, ${alpha})`;
    context.lineWidth = width;
    context.beginPath();
    for (const tie of ties) {
      if (match(health[tie.a]!, health[tie.b]!)) line(tie.a, tie.b);
    }
    context.stroke();
  }

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1) continue;
    const fade = 1 - progress;
    const x = points[mark.person * 2]!;
    const y = points[mark.person * 2 + 1]!;
    if (mark.kind === "avoid") {
      // The cut tie lingers toward the infected person; the new one is drawn out.
      context.setLineDash([2, 4]);
      context.strokeStyle = `rgba(${ILL}, ${0.55 * fade})`;
      context.lineWidth = 1;
      context.beginPath();
      line(mark.person, mark.from);
      context.stroke();
      context.setLineDash([]);
      const reach = Math.min(1, progress * 3);
      const toX = points[mark.to * 2]!;
      const toY = points[mark.to * 2 + 1]!;
      context.strokeStyle = `rgba(${INK}, ${0.2 + 0.6 * fade})`;
      context.lineWidth = 1.6;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (toX - x) * reach, y + (toY - y) * reach);
      context.stroke();
    } else {
      context.strokeStyle = `rgba(${ILL}, ${0.7 * fade})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(x, y, 4 + progress * 14, 0, Math.PI * 2);
      context.stroke();
    }
  }

  for (let person = 0; person < network.size; person += 1) {
    context.fillStyle = health[person] === "I" ? `rgb(${ILL})` : `rgb(${INK})`;
    context.beginPath();
    context.arc(points[person * 2]!, points[person * 2 + 1]!, personRadius(network, size, person), 0, Math.PI * 2);
    context.fill();
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

export default function AdaptiveEpidemicTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<EpidemicNetwork>(createEpidemicNetwork());
  const bodiesRef = useRef<Body[] | null>(null);
  const pointsRef = useRef(new Float64Array(MAX_PEOPLE * 2));
  const targetsRef = useRef(new Float64Array(MAX_PEOPLE * 2));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const avoidanceRef = useRef(DEFAULT_PARAMETERS.avoidance);
  const viewRef = useRef<ViewId>("network");
  const tieVisibilityRef = useRef(TIE_VISIBILITY.network);
  const transitionRef = useRef<Transition | null>(null);
  const [avoidance, setAvoidance] = useState(DEFAULT_PARAMETERS.avoidance);
  const [view, setView] = useState<ViewId>("network");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    avoidanceRef.current = avoidance;
  }, [avoidance]);

  const changeView = useCallback((next: ViewId) => {
    setView(next);
    if (next === viewRef.current) return;
    const count = networkRef.current.size;
    transitionRef.current = {
      from: pointsRef.current.slice(0, count * 2),
      previous: viewRef.current,
      tiesFrom: tieVisibilityRef.current,
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
    let sinceSummary = 0;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const next = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(next.width * ratio);
      canvas.height = Math.round(next.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (bodiesRef.current) {
        rescaleBodies(bodiesRef.current, layoutFrame(sizeRef.current), layoutFrame(next));
      } else {
        bodiesRef.current = createBodies(networkRef.current.size, layoutFrame(next));
        bodiesRef.current.forEach((body, person) => {
          pointsRef.current[person * 2] = body.x;
          pointsRef.current[person * 2 + 1] = body.y;
        });
      }
      sizeRef.current = next;
    };

    const render = (now: number) => {
      const delta = Math.min((now - previous) / 1_000, 0.05);
      previous = now;
      const tempo = reduceMotion.matches ? 0.3 : 1;
      timeRef.current += delta;
      const network = networkRef.current;
      const bodies = bodiesRef.current;
      if (bodies) {
        const events = stepEpidemicNetwork(network, delta * tempo * TEMPO, {
          ...DEFAULT_PARAMETERS,
          avoidance: avoidanceRef.current,
        });
        const marks = marksRef.current;
        if (!reduceMotion.matches) {
          for (const event of events) {
            if (event.kind === "avoid") {
              marks.push({ kind: "avoid", person: event.person, from: event.from, to: event.to, at: timeRef.current });
            } else if (event.kind === "infect") {
              marks.push({ kind: "infect", person: event.person, at: timeRef.current });
            }
          }
        }
        const fresh = marks.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);
        marksRef.current = fresh.slice(Math.max(0, fresh.length - MAX_MARKS));
        // The force layout keeps running in every view so returning to it is continuous.
        relaxBodies(bodies, network.ties, layoutFrame(sizeRef.current), delta * tempo);

        const size = sizeRef.current;
        const field = layoutFrame(size);
        const current = viewRef.current;
        const points = pointsRef.current;
        const targets = targetsRef.current;
        viewTargets(current, network, bodies, field, targets);
        const transition = transitionRef.current;
        const progress = transition
          ? Math.min(1, (timeRef.current - transition.startedAt) / (reduceMotion.matches ? 0.01 : TRANSITION_SECONDS))
          : 1;
        const eased = easeInOut(progress);
        const follow = 1 - Math.exp(-FOLLOW_RATE * delta);
        for (let index = 0; index < network.size * 2; index += 1) {
          points[index] = transition && progress < 1
            ? transition.from[index]! + (targets[index]! - transition.from[index]!) * eased
            : points[index]! + (targets[index]! - points[index]!) * follow;
        }
        const tiesFrom = transition?.tiesFrom ?? TIE_VISIBILITY[current];
        tieVisibilityRef.current = tiesFrom + (TIE_VISIBILITY[current] - tiesFrom) * eased;
        const labels = [
          ...viewLabels(current, field).map((label) => ({ ...label, alpha: eased })),
          ...(transition && progress < 1
            ? viewLabels(transition.previous, field).map((label) => ({ ...label, alpha: 1 - eased }))
            : []),
        ];
        if (transition && progress >= 1) transitionRef.current = null;

        draw(context, size, network, points, marksRef.current, timeRef.current, tieVisibilityRef.current, labels);

        sinceSummary += delta;
        if (sinceSummary > 2) {
          sinceSummary = 0;
          const measure = measureEpidemic(network);
          setSummary(`${Math.round(measure.infected * 100)}% infected. Infected people average ${measure.meanDegreeInfected.toFixed(1)} ties, healthy people ${measure.meanDegreeSusceptible.toFixed(1)}.`);
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
  }, []);

  const markInfection = (person: number) => {
    marksRef.current.push({ kind: "infect", person, at: timeRef.current });
  };

  // Tapping a person infects them; tapping empty space adds a healthy person
  // there, tied to the nearest two on screen.
  const tapAt = useCallback((x: number, y: number) => {
    const bodies = bodiesRef.current;
    const network = networkRef.current;
    const points = pointsRef.current;
    if (!bodies) return;
    const byDistance = Array.from({ length: network.size }, (_, person) => ({
      person,
      distance: Math.hypot(points[person * 2]! - x, points[person * 2 + 1]! - y),
    })).sort((first, second) => first.distance - second.distance);
    const nearest = byDistance[0];
    setTouched(true);
    if (nearest && nearest.distance <= personRadius(network, sizeRef.current, nearest.person) + 6) {
      if (infectPerson(network, nearest.person)) markInfection(nearest.person);
      return;
    }
    const acquaintances = byDistance.slice(0, NEWCOMER_TIES).map((entry) => entry.person);
    const person = addPerson(network, acquaintances);
    if (person === null) return;
    // In the force layout the newcomer starts beside its first acquaintance.
    const anchor = viewRef.current === "network" ? { x, y } : bodies[acquaintances[0] ?? 0] ?? { x, y };
    bodies[person] = { x: anchor.x, y: anchor.y, vx: 0, vy: 0 };
    points[person * 2] = x;
    points[person * 2 + 1] = y;
    const transition = transitionRef.current;
    if (transition) {
      const from = new Float64Array(network.size * 2);
      from.set(transition.from.subarray(0, Math.min(transition.from.length, from.length)));
      from[person * 2] = x;
      from[person * 2 + 1] = y;
      transition.from = from;
    }
  }, []);

  const infectCentre = useCallback(() => {
    const network = networkRef.current;
    const points = pointsRef.current;
    const { width, height } = layoutFrame(sizeRef.current);
    let nearest = 0;
    let best = Infinity;
    for (let person = 0; person < network.size; person += 1) {
      const distance = Math.hypot(points[person * 2]! - width / 2, points[person * 2 + 1]! - height / 2);
      if (distance < best) {
        best = distance;
        nearest = person;
      }
    }
    if (infectPerson(network, nearest)) markInfection(nearest);
    setTouched(true);
  }, []);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="adaptive-epidemic-summary"
        aria-label="Adaptive epidemic network. Red people are infected and recover after a while; infection travels along ties. Healthy people may cut a tie to an infected neighbour and link to another healthy person instead. Tap a person to infect them; tap empty space to add a healthy person. Press Enter to infect the person nearest the centre. Options below change the avoidance rate and the view."
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          tapAt(event.clientX - bounds.left, event.clientY - bounds.top);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          infectCentre();
        }}
      />
      <p id="adaptive-epidemic-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>사람을 누르면 감염, 빈 곳을 누르면 새 사람</p>
        )}
        {optionsOpen && (
          <div id="adaptive-epidemic-options" className={styles.options}>
            <p className={styles.about}>
              감염은 연결을 따라 퍼지고, 감염된 사람은 시간이 지나면 회복합니다. 건강한 사람은
              감염된 이웃과의 연결을 끊고 다른 건강한 사람과 새로 연결할 수 있습니다. 이 회피가
              네트워크의 모양을 바꾸고, 바뀐 모양이 다음 감염이 퍼지는 길을 정합니다.
              (적응형 SIS 모델, Gross·D&apos;Lima·Blasius 2006)
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
              <span>유지</span>
              <input
                aria-label="건강한 사람이 감염된 이웃과의 연결을 끊는 정도"
                aria-valuetext={`회피 ${avoidance.toFixed(2)}`}
                max={AVOIDANCE_RANGE[1]}
                min={AVOIDANCE_RANGE[0]}
                step="0.01"
                type="range"
                value={avoidance}
                onChange={(event) => setAvoidance(Number(event.target.value))}
              />
              <span>회피</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="adaptive-epidemic-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
