"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./bounded-confidence.module.css";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
} from "./layout";
import {
  addExtremist,
  createOpinionNetwork,
  DEFAULT_PARAMETERS,
  MAX_PEOPLE,
  measureOpinions,
  REWIRING_RANGE,
  setOpinion,
  setStubborn,
  stepOpinionNetwork,
  TOLERANCE_RANGE,
  type OpinionNetwork,
} from "./model";
import {
  opinionAxis,
  opinionToX,
  TRACE_SECONDS,
  VIEW_MIX,
  viewLabels,
  viewTargets,
  VIEWS,
  xToOpinion,
  type ViewId,
} from "./views";

/** Model time units per second; groups settle within about 15 s. */
const TEMPO = 1.5;
const INK = "17, 17, 15";
/** Opinion ramp from 0 to 1: indigo through magenta to orange, lightness rising. */
const RAMP_STOPS = [
  [26, 16, 138],
  [106, 0, 168],
  [177, 42, 144],
  [222, 92, 100],
  [244, 136, 62],
] as const;
const RAMP_STEPS = 64;
const MARK_LIFETIME = 0.9;
const MAX_MARKS = 160;
const NEWCOMER_TIES = 3;
const TRANSITION_SECONDS = 0.9;
/** How quickly points follow their target once a view has settled. */
const FOLLOW_RATE = 12;
/** Space kept clear for the collapsed options toggle. */
const CONTROL_BAND = 56;
/** Pointer travel that turns a tap on a person into a drag of their opinion. */
const DRAG_THRESHOLD = 6;
const SAMPLE_SECONDS = 0.25;
const SAMPLES = Math.round(TRACE_SECONDS / SAMPLE_SECONDS);
const KEY_STEP = 0.02;

type Mark = { person: number; from: number; to: number; at: number };

type Mix = { ties: number; axis: number; trace: number };

type Transition = {
  from: Float64Array;
  previous: ViewId;
  mixFrom: Mix;
  startedAt: number;
};

/** A person held by the pointer or the keyboard; stubborn until released. */
type Hold = {
  person: number | null;
  pointerId: number | null;
  startX: number;
  startOpinion: number;
  wasStubborn: boolean;
  moved: boolean;
};

type History = { values: Float32Array; head: number; filled: number; since: number };

const RAMP = Array.from({ length: RAMP_STEPS }, (_, step) => {
  const position = (step / (RAMP_STEPS - 1)) * (RAMP_STOPS.length - 1);
  const index = Math.min(RAMP_STOPS.length - 2, Math.floor(position));
  const blend = position - index;
  const [r, g, b] = RAMP_STOPS[index]!.map(
    (channel, at) => channel + (RAMP_STOPS[index + 1]![at]! - channel) * blend,
  );
  return `rgb(${Math.round(r!)}, ${Math.round(g!)}, ${Math.round(b!)})`;
});

function opinionColour(opinion: number) {
  return RAMP[Math.round(Math.min(1, Math.max(0, opinion)) * (RAMP_STEPS - 1))]!;
}

function layoutFrame(size: Frame): Frame {
  return { width: size.width, height: Math.max(size.height * 0.5, size.height - CONTROL_BAND) };
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

function mixBetween(from: Mix, to: Mix, amount: number): Mix {
  return {
    ties: from.ties + (to.ties - from.ties) * amount,
    axis: from.axis + (to.axis - from.axis) * amount,
    trace: from.trace + (to.trace - from.trace) * amount,
  };
}

function personRadius(network: OpinionNetwork, size: Frame, person: number) {
  const base = Math.max(2, Math.min(4.5, idealLength(size, network.size) * 0.1));
  return base * (0.75 + Math.sqrt(network.incident[person]!.length) * 0.14);
}

function createHistory(): History {
  return { values: new Float32Array(SAMPLES * MAX_PEOPLE).fill(Number.NaN), head: 0, filled: 0, since: 0 };
}

function recordHistory(history: History, network: OpinionNetwork) {
  const row = history.head * MAX_PEOPLE;
  for (let person = 0; person < network.size; person += 1) {
    history.values[row + person] = network.opinions[person]!;
  }
  history.head = (history.head + 1) % SAMPLES;
  history.filled = Math.min(SAMPLES, history.filled + 1);
  history.since = 0;
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  network: OpinionNetwork,
  points: Float64Array,
  marks: readonly Mark[],
  time: number,
  tolerance: number,
  mix: Mix,
  history: History,
  held: readonly number[],
  labels: readonly { text: string; x: number; y: number; align: CanvasTextAlign; alpha: number }[],
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";
  context.lineJoin = "round";
  const { opinions, stubborn, ties } = network;
  const axis = opinionAxis(layoutFrame(size));
  const line = (a: number, b: number) => {
    context.moveTo(points[a * 2]!, points[a * 2 + 1]!);
    context.lineTo(points[b * 2]!, points[b * 2 + 1]!);
  };

  // Trails: each person's opinion over the last TRACE_SECONDS, newest at the top.
  if (mix.trace > 0.01) {
    const span = axis.bottom - axis.top;
    context.strokeStyle = `rgba(${INK}, ${0.2 * mix.trace})`;
    context.lineWidth = 0.7;
    context.beginPath();
    for (let person = 0; person < network.size; person += 1) {
      context.moveTo(opinionToX(axis, opinions[person]!), axis.top);
      for (let back = 0; back < history.filled; back += 1) {
        const row = (history.head - 1 - back + SAMPLES) % SAMPLES;
        const value = history.values[row * MAX_PEOPLE + person]!;
        if (Number.isNaN(value)) break;
        const age = history.since + back * SAMPLE_SECONDS;
        context.lineTo(opinionToX(axis, value), axis.top + Math.min(1, age / TRACE_SECONDS) * span);
      }
    }
    context.stroke();
  }

  // Ties within tolerance are quiet; ties beyond it are the ones that can be
  // cut, so they are drawn strongest.
  if (mix.ties > 0.01) {
    for (const [alpha, width, intolerant] of [
      [0.1, 0.7, false],
      [0.5, 0.9, true],
    ] as const) {
      context.strokeStyle = `rgba(${INK}, ${alpha * mix.ties})`;
      context.lineWidth = width;
      context.beginPath();
      for (const tie of ties) {
        if ((Math.abs(opinions[tie.a]! - opinions[tie.b]!) >= tolerance) === intolerant) line(tie.a, tie.b);
      }
      context.stroke();
    }

    for (const mark of marks) {
      const progress = (time - mark.at) / MARK_LIFETIME;
      if (progress < 0 || progress >= 1) continue;
      const fade = (1 - progress) * mix.ties;
      // The cut tie lingers toward the abandoned person; the new one is drawn out.
      context.setLineDash([2, 4]);
      context.strokeStyle = `rgba(${INK}, ${0.55 * fade})`;
      context.lineWidth = 1;
      context.beginPath();
      line(mark.person, mark.from);
      context.stroke();
      context.setLineDash([]);
      const x = points[mark.person * 2]!;
      const y = points[mark.person * 2 + 1]!;
      const reach = Math.min(1, progress * 3);
      context.strokeStyle = `rgba(${INK}, ${0.15 + 0.5 * fade})`;
      context.lineWidth = 1.4;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (points[mark.to * 2]! - x) * reach, y + (points[mark.to * 2 + 1]! - y) * reach);
      context.stroke();
    }
  }

  // The tolerance of a held person: everyone inside the bracket can still move them.
  if (mix.axis > 0.01) {
    context.strokeStyle = `rgba(${INK}, ${0.4 * mix.axis})`;
    context.lineWidth = 1;
    context.beginPath();
    for (const person of held) {
      const y = points[person * 2 + 1]!;
      const from = opinionToX(axis, Math.max(0, opinions[person]! - tolerance));
      const to = opinionToX(axis, Math.min(1, opinions[person]! + tolerance));
      context.moveTo(from, y - 5);
      context.lineTo(from, y + 5);
      context.moveTo(from, y);
      context.lineTo(to, y);
      context.moveTo(to, y - 5);
      context.lineTo(to, y + 5);
    }
    context.stroke();
  }

  for (let person = 0; person < network.size; person += 1) {
    const x = points[person * 2]!;
    const y = points[person * 2 + 1]!;
    const radius = personRadius(network, size, person);
    context.fillStyle = opinionColour(opinions[person]!);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    if (stubborn[person]) {
      // Stubborn people keep their opinion: an ink ring.
      context.strokeStyle = `rgb(${INK})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(x, y, radius + 2.5, 0, Math.PI * 2);
      context.stroke();
    }
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

export default function BoundedConfidenceSix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<OpinionNetwork>(createOpinionNetwork());
  const bodiesRef = useRef<Body[] | null>(null);
  const pointsRef = useRef(new Float64Array(MAX_PEOPLE * 2));
  const targetsRef = useRef(new Float64Array(MAX_PEOPLE * 2));
  const historyRef = useRef<History | null>(null);
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const toleranceRef = useRef(DEFAULT_PARAMETERS.tolerance);
  const rewiringRef = useRef(DEFAULT_PARAMETERS.rewiring);
  const viewRef = useRef<ViewId>("opinion");
  const mixRef = useRef<Mix>(VIEW_MIX.opinion);
  const transitionRef = useRef<Transition | null>(null);
  const pointerHoldRef = useRef<Hold | null>(null);
  const keyHoldRef = useRef<Hold | null>(null);
  const nextExtremeRef = useRef(0);
  const [tolerance, setTolerance] = useState(DEFAULT_PARAMETERS.tolerance);
  const [rewiring, setRewiring] = useState(DEFAULT_PARAMETERS.rewiring);
  const [view, setView] = useState<ViewId>("opinion");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    toleranceRef.current = tolerance;
  }, [tolerance]);

  useEffect(() => {
    rewiringRef.current = rewiring;
  }, [rewiring]);

  const changeView = useCallback((next: ViewId) => {
    setView(next);
    if (next === viewRef.current) return;
    const count = networkRef.current.size;
    transitionRef.current = {
      from: pointsRef.current.slice(0, count * 2),
      previous: viewRef.current,
      mixFrom: mixRef.current,
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
    const history = (historyRef.current ??= createHistory());
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
        viewTargets(viewRef.current, networkRef.current, bodiesRef.current, layoutFrame(next), pointsRef.current);
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
        const parameters = {
          ...DEFAULT_PARAMETERS,
          tolerance: toleranceRef.current,
          rewiring: rewiringRef.current,
        };
        const events = stepOpinionNetwork(network, delta * tempo * TEMPO, parameters);
        const marks = marksRef.current;
        if (!reduceMotion.matches) {
          for (const event of events) {
            if (event.kind === "cut") {
              marks.push({ person: event.person, from: event.from, to: event.to, at: timeRef.current });
            }
          }
        }
        const fresh = marks.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);
        marksRef.current = fresh.slice(Math.max(0, fresh.length - MAX_MARKS));
        history.since += delta;
        if (history.since >= SAMPLE_SECONDS || history.filled === 0) recordHistory(history, network);
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
        mixRef.current = mixBetween(transition?.mixFrom ?? VIEW_MIX[current], VIEW_MIX[current], eased);
        const labels = [
          ...viewLabels(current, field).map((label) => ({ ...label, alpha: eased })),
          ...(transition && progress < 1
            ? viewLabels(transition.previous, field).map((label) => ({ ...label, alpha: 1 - eased }))
            : []),
        ];
        if (transition && progress >= 1) transitionRef.current = null;

        const held = [pointerHoldRef.current?.person, keyHoldRef.current?.person]
          .filter((person): person is number => typeof person === "number");
        draw(
          context,
          size,
          network,
          points,
          marksRef.current,
          timeRef.current,
          toleranceRef.current,
          mixRef.current,
          history,
          held,
          labels,
        );

        sinceSummary += delta;
        if (sinceSummary > 2) {
          sinceSummary = 0;
          const measure = measureOpinions(network, toleranceRef.current);
          setSummary(
            `${measure.clusters} opinion ${measure.clusters === 1 ? "group" : "groups"}; the largest holds ${Math.round(measure.largestCluster * 100)}% of people. ${Math.round(measure.intolerantTies * 100)}% of ties join people beyond each other's tolerance. The network is in ${measure.components} ${measure.components === 1 ? "piece" : "pieces"}, the largest with ${Math.round(measure.largestComponent * 100)}% of people.`,
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
  }, []);

  const axisWidth = () => {
    const axis = opinionAxis(layoutFrame(sizeRef.current));
    return Math.max(1, axis.right - axis.left);
  };

  const personAt = useCallback((x: number, y: number) => {
    const network = networkRef.current;
    const points = pointsRef.current;
    let nearest: number | null = null;
    let best = Infinity;
    for (let person = 0; person < network.size; person += 1) {
      const distance = Math.hypot(points[person * 2]! - x, points[person * 2 + 1]! - y);
      if (distance <= personRadius(network, sizeRef.current, person) + 8 && distance < best) {
        best = distance;
        nearest = person;
      }
    }
    return nearest;
  }, []);

  // A stubborn newcomer at the tapped opinion, tied to the nearest three on screen.
  const addNewcomer = useCallback((x: number, y: number, opinion: number) => {
    const bodies = bodiesRef.current;
    const network = networkRef.current;
    const points = pointsRef.current;
    if (!bodies) return;
    const acquaintances = Array.from({ length: network.size }, (_, person) => ({
      person,
      distance: Math.hypot(points[person * 2]! - x, points[person * 2 + 1]! - y),
    }))
      .sort((first, second) => first.distance - second.distance)
      .slice(0, NEWCOMER_TIES)
      .map((entry) => entry.person);
    const person = addExtremist(network, opinion, acquaintances);
    if (person === null) return;
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

  const releaseKeyHold = useCallback(() => {
    const hold = keyHoldRef.current;
    if (hold?.person != null) setStubborn(networkRef.current, hold.person, hold.wasStubborn);
    keyHoldRef.current = null;
  }, []);

  // Arrow keys hold the person nearest the centre and move their opinion.
  const nudge = useCallback((direction: number) => {
    const network = networkRef.current;
    let hold = keyHoldRef.current;
    if (!hold) {
      const { width, height } = layoutFrame(sizeRef.current);
      const points = pointsRef.current;
      let nearest = 0;
      let best = Infinity;
      for (let person = 0; person < network.size; person += 1) {
        const distance = Math.hypot(points[person * 2]! - width / 2, points[person * 2 + 1]! - height / 2);
        if (distance < best) {
          best = distance;
          nearest = person;
        }
      }
      hold = {
        person: nearest,
        pointerId: null,
        startX: 0,
        startOpinion: network.opinions[nearest]!,
        wasStubborn: network.stubborn[nearest]!,
        moved: true,
      };
      keyHoldRef.current = hold;
      setStubborn(network, nearest, true);
    }
    const person = hold.person!;
    setOpinion(network, person, network.opinions[person]! + direction * KEY_STEP);
    setTouched(true);
  }, []);

  const addExtremeFromKeyboard = useCallback(() => {
    const opinion = nextExtremeRef.current;
    nextExtremeRef.current = 1 - opinion;
    const field = layoutFrame(sizeRef.current);
    addNewcomer(opinionToX(opinionAxis(field), opinion), field.height / 2, opinion);
    setTouched(true);
  }, [addNewcomer]);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="bounded-confidence-summary"
        aria-label="Bounded confidence opinion network. Each person holds an opinion from 0 to 1, shown as colour and, in the opinion view, as horizontal position. Tied people whose opinions are within the tolerance move toward each other; a tie beyond the tolerance may be cut and moved to a random stranger. Drag a person sideways to hold them at a new opinion; tap a person to make them stubborn or release them; tap empty space to add a stubborn person with the opinion under your finger. Arrow keys hold the person nearest the centre and move their opinion, Escape releases them, Enter adds a stubborn person at alternating extremes. Options below change the tolerance, the rewiring and the view."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          const y = event.clientY - bounds.top;
          const network = networkRef.current;
          const person = personAt(x, y);
          pointerHoldRef.current = {
            person,
            pointerId: event.pointerId,
            startX: x,
            startOpinion: person === null ? xToOpinion(opinionAxis(layoutFrame(sizeRef.current)), x) : network.opinions[person]!,
            wasStubborn: person === null ? false : network.stubborn[person]!,
            moved: false,
          };
          if (person !== null) setStubborn(network, person, true);
          setTouched(true);
        }}
        onPointerMove={(event) => {
          const hold = pointerHoldRef.current;
          if (!hold || hold.pointerId !== event.pointerId || hold.person === null) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const dx = event.clientX - bounds.left - hold.startX;
          if (!hold.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
          hold.moved = true;
          setOpinion(networkRef.current, hold.person, hold.startOpinion + dx / axisWidth());
        }}
        onPointerUp={(event) => {
          const hold = pointerHoldRef.current;
          if (!hold || hold.pointerId !== event.pointerId) return;
          pointerHoldRef.current = null;
          const network = networkRef.current;
          if (hold.person !== null) {
            // A drag lets go; a tap toggles whether the person is stubborn.
            setStubborn(network, hold.person, hold.moved ? hold.wasStubborn : !hold.wasStubborn);
            return;
          }
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          if (Math.abs(x - hold.startX) < DRAG_THRESHOLD) {
            addNewcomer(x, event.clientY - bounds.top, hold.startOpinion);
          }
        }}
        onPointerCancel={() => {
          const hold = pointerHoldRef.current;
          if (hold?.person != null) setStubborn(networkRef.current, hold.person, hold.wasStubborn);
          pointerHoldRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            nudge(event.key === "ArrowLeft" ? -1 : 1);
          } else if (event.key === "Escape") {
            releaseKeyHold();
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            addExtremeFromKeyboard();
          }
        }}
        onBlur={releaseKeyHold}
      />
      <p id="bounded-confidence-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>사람을 옆으로 끌면 의견이 바뀌고, 빈 곳을 누르면 고집 센 사람</p>
        )}
        {optionsOpen && (
          <div id="bounded-confidence-options" className={styles.options}>
            <p className={styles.about}>
              사람마다 0과 1 사이의 의견이 있고, 연결된 두 사람은 의견 차이가 허용 범위 안이면
              서로 조금씩 가까워집니다. 차이가 범위를 넘으면 그 연결을 끊고 아무나 새로 사귈 수
              있습니다. 의견이 어떤 연결이 남을지를 정하고, 남은 연결이 누가 누구를 끌어당길지를
              정합니다. (제한된 신뢰 모델, Deffuant 외 2000; Kozma·Barrat 2008)
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
              <span>좁게</span>
              <input
                aria-label="서로 귀 기울이는 의견 차이의 범위"
                aria-valuetext={`허용 범위 ${tolerance.toFixed(2)}`}
                max={TOLERANCE_RANGE[1]}
                min={TOLERANCE_RANGE[0]}
                step="0.01"
                type="range"
                value={tolerance}
                onChange={(event) => setTolerance(Number(event.target.value))}
              />
              <span>넓게</span>
            </label>
            <label className={styles.balance}>
              <span>유지</span>
              <input
                aria-label="범위를 넘는 연결을 끊고 새로 잇는 정도"
                aria-valuetext={`끊기 ${rewiring.toFixed(2)}`}
                max={REWIRING_RANGE[1]}
                min={REWIRING_RANGE[0]}
                step="0.01"
                type="range"
                value={rewiring}
                onChange={(event) => setRewiring(Number(event.target.value))}
              />
              <span>끊기</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="bounded-confidence-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
