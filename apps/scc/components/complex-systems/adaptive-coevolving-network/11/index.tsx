"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./awareness-multiplex.module.css";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
} from "./layout";
import {
  announce,
  AVOIDANCE_RANGE,
  createMultiplex,
  DEFAULT_PARAMETERS,
  DEFAULT_PEOPLE,
  infectPerson,
  INFORMATION_RANGE,
  measureMultiplex,
  stepMultiplex,
  type Multiplex,
} from "./model";
import {
  layerPanels,
  PHYSICAL,
  pointIndex,
  viewLabels,
  viewTargets,
  VIEWS,
  VIRTUAL,
  type ViewId,
} from "./views";

/**
 * Model time units per second; an infection lasts about 4 s on average. Slower
 * than route 2 because news events are several times more frequent than infections.
 */
const TEMPO = 1;
const INK = "17, 17, 15";
const ILL = "214, 58, 34";
const AWARE = "38, 92, 196";
const MARK_LIFETIME = 0.9;
const MAX_MARKS = 240;
const TRANSITION_SECONDS = 0.9;
/** How quickly points follow their target once a view has settled. */
const FOLLOW_RATE = 12;
/** Space kept clear for the collapsed options toggle. */
const CONTROL_BAND = 56;
/** A press held this long on a person announces instead of infecting. */
const HOLD_MS = 380;
/** Pointer travel that turns a press into an announcing drag. */
const DRAG_THRESHOLD = 8;

type Mark =
  | { kind: "avoid"; person: number; from: number; to: number; at: number }
  | { kind: "infect"; person: number; at: number }
  | { kind: "inform"; person: number; source: number; at: number }
  | { kind: "announce"; person: number; at: number };

type Transition = {
  from: Float64Array;
  previous: ViewId;
  splitFrom: number;
  startedAt: number;
};

type Press = {
  pointer: number;
  x: number;
  y: number;
  person: number | null;
  announcing: boolean;
  announced: Set<number>;
  timer: number;
};

function layoutFrame(size: Frame): Frame {
  return { width: size.width, height: Math.max(size.height * 0.5, size.height - CONTROL_BAND) };
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

/** Radius grows with contacts; shrinks toward the panel scale as the layers split. */
function personRadius(network: Multiplex, field: Frame, person: number, shrink: number) {
  const base = Math.max(2, Math.min(4.5, idealLength(field, network.size) * 0.1));
  return base * (0.75 + Math.sqrt(network.physicalIncident[person]!.length) * 0.14) * shrink;
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  field: Frame,
  network: Multiplex,
  points: Float64Array,
  marks: readonly Mark[],
  time: number,
  shrink: number,
  labels: readonly { text: string; x: number; y: number; align: CanvasTextAlign; alpha: number }[],
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";
  const { aware, infected } = network;
  const count = network.size;
  const at = (layer: number, person: number) => pointIndex(layer, person, count);
  const line = (layer: number, a: number, b: number) => {
    context.moveTo(points[at(layer, a)]!, points[at(layer, a) + 1]!);
    context.lineTo(points[at(layer, b)]!, points[at(layer, b) + 1]!);
  };

  // News ties: thin, dashed, blue — the channel, not an event.
  context.setLineDash([2, 3]);
  context.strokeStyle = `rgba(${AWARE}, 0.16)`;
  context.lineWidth = 0.7;
  context.beginPath();
  for (const tie of network.virtual) line(VIRTUAL, tie.a, tie.b);
  context.stroke();
  context.setLineDash([]);

  // Contacts as in route 2: healthy ties quietly in ink; ties touching an
  // infected person in red, strongest where infection or avoidance can happen.
  for (const [colour, alpha, width, match] of [
    [INK, 0.16, 0.8, (a: boolean, b: boolean) => !a && !b],
    [ILL, 0.16, 0.8, (a: boolean, b: boolean) => a && b],
    [ILL, 0.62, 1.1, (a: boolean, b: boolean) => a !== b],
  ] as const) {
    context.strokeStyle = `rgba(${colour}, ${alpha})`;
    context.lineWidth = width;
    context.beginPath();
    for (const tie of network.physical) {
      if (match(infected[tie.a]!, infected[tie.b]!)) line(PHYSICAL, tie.a, tie.b);
    }
    context.stroke();
  }

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1) continue;
    const fade = 1 - progress;
    if (mark.kind === "avoid") {
      // The cut contact lingers toward the infected person; the new one is drawn out.
      const x = points[at(PHYSICAL, mark.person)]!;
      const y = points[at(PHYSICAL, mark.person) + 1]!;
      context.setLineDash([2, 4]);
      context.strokeStyle = `rgba(${ILL}, ${0.55 * fade})`;
      context.lineWidth = 1;
      context.beginPath();
      line(PHYSICAL, mark.person, mark.from);
      context.stroke();
      context.setLineDash([]);
      const reach = Math.min(1, progress * 3);
      const toX = points[at(PHYSICAL, mark.to)]!;
      const toY = points[at(PHYSICAL, mark.to) + 1]!;
      context.strokeStyle = `rgba(${INK}, ${0.2 + 0.6 * fade})`;
      context.lineWidth = 1.6;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (toX - x) * reach, y + (toY - y) * reach);
      context.stroke();
    } else if (mark.kind === "inform") {
      // News runs along the virtual tie from the teller to the listener.
      const fromX = points[at(VIRTUAL, mark.source)]!;
      const fromY = points[at(VIRTUAL, mark.source) + 1]!;
      const toX = points[at(VIRTUAL, mark.person)]!;
      const toY = points[at(VIRTUAL, mark.person) + 1]!;
      const reach = Math.min(1, progress * 3);
      context.strokeStyle = `rgba(${AWARE}, ${0.6 * fade})`;
      context.lineWidth = 1.3;
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(fromX + (toX - fromX) * reach, fromY + (toY - fromY) * reach);
      context.stroke();
    } else {
      const layer = mark.kind === "infect" ? PHYSICAL : VIRTUAL;
      context.strokeStyle = `rgba(${mark.kind === "infect" ? ILL : AWARE}, ${0.7 * fade})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(points[at(layer, mark.person)]!, points[at(layer, mark.person) + 1]!, 4 + progress * 14, 0, Math.PI * 2);
      context.stroke();
    }
  }

  // Virtual copies carry only awareness: a faint dot for presence (hidden
  // under the physical dot when the layers coincide), a blue ring if aware.
  context.fillStyle = `rgba(${INK}, 0.3)`;
  context.beginPath();
  for (let person = 0; person < count; person += 1) {
    const x = points[at(VIRTUAL, person)]!;
    const y = points[at(VIRTUAL, person) + 1]!;
    context.moveTo(x + 1.6, y);
    context.arc(x, y, 1.6, 0, Math.PI * 2);
  }
  context.fill();

  // Physical copies carry only health.
  for (let person = 0; person < count; person += 1) {
    context.fillStyle = infected[person] ? `rgb(${ILL})` : `rgb(${INK})`;
    context.beginPath();
    context.arc(points[at(PHYSICAL, person)]!, points[at(PHYSICAL, person) + 1]!, personRadius(network, field, person, shrink), 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = `rgb(${AWARE})`;
  context.lineWidth = 1.1;
  context.beginPath();
  for (let person = 0; person < count; person += 1) {
    if (!aware[person]) continue;
    const x = points[at(VIRTUAL, person)]!;
    const y = points[at(VIRTUAL, person) + 1]!;
    const radius = personRadius(network, field, person, shrink) + 2.2;
    context.moveTo(x + radius, y);
    context.arc(x, y, radius, 0, Math.PI * 2);
  }
  context.stroke();

  context.font = "12px Arial, Helvetica, sans-serif";
  context.textBaseline = "middle";
  for (const label of labels) {
    if (label.alpha < 0.01) continue;
    context.fillStyle = `rgba(${INK}, ${0.55 * label.alpha})`;
    context.textAlign = label.align;
    context.fillText(label.text, label.x, label.y);
  }
}

export default function AwarenessMultiplexEleven() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<Multiplex>(createMultiplex());
  const bodiesRef = useRef<Body[] | null>(null);
  const pointsRef = useRef(new Float64Array(DEFAULT_PEOPLE * 4));
  const targetsRef = useRef(new Float64Array(DEFAULT_PEOPLE * 4));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const informationRef = useRef(DEFAULT_PARAMETERS.information);
  const avoidanceRef = useRef(DEFAULT_PARAMETERS.avoidance);
  const viewRef = useRef<ViewId>("overlay");
  const splitRef = useRef(0);
  const transitionRef = useRef<Transition | null>(null);
  const pressRef = useRef<Press | null>(null);
  const [information, setInformation] = useState(DEFAULT_PARAMETERS.information);
  const [avoidance, setAvoidance] = useState(DEFAULT_PARAMETERS.avoidance);
  const [view, setView] = useState<ViewId>("overlay");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    informationRef.current = information;
  }, [information]);

  useEffect(() => {
    avoidanceRef.current = avoidance;
  }, [avoidance]);

  const changeView = useCallback((next: ViewId) => {
    setView(next);
    if (next === viewRef.current) return;
    transitionRef.current = {
      from: pointsRef.current.slice(),
      previous: viewRef.current,
      splitFrom: splitRef.current,
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
        const network = networkRef.current;
        bodiesRef.current = createBodies(network.size, layoutFrame(next));
        bodiesRef.current.forEach((body, person) => {
          for (const layer of [VIRTUAL, PHYSICAL]) {
            pointsRef.current[pointIndex(layer, person, network.size)] = body.x;
            pointsRef.current[pointIndex(layer, person, network.size) + 1] = body.y;
          }
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
      const network = networkRef.current;
      const bodies = bodiesRef.current;
      if (bodies) {
        const events = stepMultiplex(network, delta * tempo * TEMPO, {
          ...DEFAULT_PARAMETERS,
          information: informationRef.current,
          avoidance: avoidanceRef.current,
        });
        const marks = marksRef.current;
        if (!reduceMotion.matches) {
          for (const event of events) {
            if (event.kind === "avoid") {
              marks.push({ kind: "avoid", person: event.person, from: event.from, to: event.to, at: timeRef.current });
            } else if (event.kind === "infect") {
              marks.push({ kind: "infect", person: event.person, at: timeRef.current });
            } else if (event.kind === "inform") {
              marks.push({ kind: "inform", person: event.person, source: event.source, at: timeRef.current });
            }
          }
        }
        const fresh = marks.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);
        marksRef.current = fresh.slice(Math.max(0, fresh.length - MAX_MARKS));
        // The force layout follows contacts only and keeps running in every view.
        relaxBodies(bodies, network.physical, layoutFrame(sizeRef.current), delta * tempo);

        const size = sizeRef.current;
        const field = layoutFrame(size);
        const current = viewRef.current;
        const points = pointsRef.current;
        const targets = targetsRef.current;
        viewTargets(current, bodies, network.size, field, targets);
        const transition = transitionRef.current;
        const progress = transition
          ? Math.min(1, (timeRef.current - transition.startedAt) / (reduceMotion.matches ? 0.01 : TRANSITION_SECONDS))
          : 1;
        const eased = easeInOut(progress);
        const follow = 1 - Math.exp(-FOLLOW_RATE * delta);
        for (let index = 0; index < points.length; index += 1) {
          points[index] = transition && progress < 1
            ? transition.from[index]! + (targets[index]! - transition.from[index]!) * eased
            : points[index]! + (targets[index]! - points[index]!) * follow;
        }
        const splitTarget = current === "layers" ? 1 : 0;
        const splitFrom = transition?.splitFrom ?? splitTarget;
        splitRef.current = splitFrom + (splitTarget - splitFrom) * eased;
        const shrink = 1 - splitRef.current * (1 - Math.sqrt(layerPanels(field)[0].scale));
        const labels = [
          ...viewLabels(current, field).map((label) => ({ ...label, alpha: eased })),
          ...(transition && progress < 1
            ? viewLabels(transition.previous, field).map((label) => ({ ...label, alpha: 1 - eased }))
            : []),
        ];
        if (transition && progress >= 1) transitionRef.current = null;

        draw(context, size, field, network, points, marksRef.current, timeRef.current, shrink, labels);

        sinceSummary += delta;
        if (sinceSummary > 2) {
          sinceSummary = 0;
          const measure = measureMultiplex(network);
          setSummary(`${Math.round(measure.infected * 100)}% infected, ${Math.round(measure.aware * 100)}% aware of the disease. ${Math.round(measure.exposedTies * 100)}% of contacts join a healthy and an infected person.`);
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
      const press = pressRef.current;
      if (press) window.clearTimeout(press.timer);
    };
  }, []);

  /** The person whose copy on either layer lies under (x, y), if any. */
  const personAt = useCallback((x: number, y: number) => {
    const network = networkRef.current;
    const points = pointsRef.current;
    const field = layoutFrame(sizeRef.current);
    const shrink = 1 - splitRef.current * (1 - Math.sqrt(layerPanels(field)[0].scale));
    let nearest: number | null = null;
    let best = Infinity;
    for (const layer of [VIRTUAL, PHYSICAL]) {
      for (let person = 0; person < network.size; person += 1) {
        const index = pointIndex(layer, person, network.size);
        const distance = Math.hypot(points[index]! - x, points[index + 1]! - y);
        if (distance < best && distance <= personRadius(network, field, person, shrink) + 6) {
          best = distance;
          nearest = person;
        }
      }
    }
    return nearest;
  }, []);

  const infectAt = useCallback((person: number) => {
    if (infectPerson(networkRef.current, person) && !reduceMotionRef.current) {
      marksRef.current.push({ kind: "infect", person, at: timeRef.current });
    }
  }, []);

  const announceAt = useCallback((person: number) => {
    const informed = announce(networkRef.current, person);
    if (reduceMotionRef.current) return;
    const at = timeRef.current;
    marksRef.current.push({ kind: "announce", person, at });
    for (const other of informed) {
      if (other !== person) marksRef.current.push({ kind: "inform", person: other, source: person, at });
    }
  }, []);

  const personNearCentre = useCallback(() => {
    const network = networkRef.current;
    const points = pointsRef.current;
    const { width, height } = layoutFrame(sizeRef.current);
    let nearest = 0;
    let best = Infinity;
    for (let person = 0; person < network.size; person += 1) {
      const index = pointIndex(PHYSICAL, person, network.size);
      const distance = Math.hypot(points[index]! - width / 2, points[index + 1]! - height / 2);
      if (distance < best) {
        best = distance;
        nearest = person;
      }
    }
    return nearest;
  }, []);

  const endPress = (pointer: number, apply: boolean) => {
    const press = pressRef.current;
    if (!press || press.pointer !== pointer) return;
    window.clearTimeout(press.timer);
    pressRef.current = null;
    if (apply && !press.announcing && press.person !== null) infectAt(press.person);
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="awareness-multiplex-summary"
        aria-label="Awareness and infection on two layers of the same people. Dashed blue ties carry news of the disease; ink ties are physical contacts, along which red infection spreads. A blue ring marks a person who knows about the disease; aware people are infected less often and cut contacts with infected people, linking to a healthy person instead. Tap a person to infect them; press and hold, or drag across people, to announce the disease to them and their news contacts. Press Enter to infect, or A to announce, at the person nearest the centre. Options below change how fast news spreads, how strongly aware people avoid, and whether the layers are drawn together or apart."
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          const y = event.clientY - bounds.top;
          const previousPress = pressRef.current;
          if (previousPress) endPress(previousPress.pointer, false);
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setTouched(true);
          const person = personAt(x, y);
          const press: Press = {
            pointer: event.pointerId,
            x,
            y,
            person,
            announcing: false,
            announced: new Set(),
            timer: 0,
          };
          if (person !== null) {
            press.timer = window.setTimeout(() => {
              if (pressRef.current !== press || press.announcing) return;
              press.announcing = true;
              press.announced.add(person);
              announceAt(person);
            }, HOLD_MS);
          }
          pressRef.current = press;
        }}
        onPointerMove={(event) => {
          const press = pressRef.current;
          if (!press || press.pointer !== event.pointerId) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          const y = event.clientY - bounds.top;
          if (!press.announcing) {
            if (Math.hypot(x - press.x, y - press.y) < DRAG_THRESHOLD) return;
            press.announcing = true;
            window.clearTimeout(press.timer);
            if (press.person !== null) {
              press.announced.add(press.person);
              announceAt(press.person);
            }
          }
          const person = personAt(x, y);
          if (person === null || press.announced.has(person)) return;
          press.announced.add(person);
          announceAt(person);
        }}
        onPointerUp={(event) => endPress(event.pointerId, true)}
        onPointerCancel={(event) => endPress(event.pointerId, false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            infectAt(personNearCentre());
            setTouched(true);
          } else if (event.key === "a" || event.key === "A") {
            event.preventDefault();
            announceAt(personNearCentre());
            setTouched(true);
          }
        }}
      />
      <p id="awareness-multiplex-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>누르면 감염, 길게 누르거나 쓸면 소식 알림</p>
        )}
        {optionsOpen && (
          <div id="awareness-multiplex-options" className={styles.options}>
            <p className={styles.about}>
              같은 사람들이 두 망에 함께 있습니다. 소통망에서는 병에 대한 소식이 퍼지고 잊히며,
              접촉망에서는 병이 퍼지고 회복됩니다. 감염되면 소식을 알게 되고, 소식을 아는 사람은
              덜 감염되며 감염된 접촉을 끊고 건강한 사람과 새로 연결합니다. 그래서 소식이 접촉망의
              모양을 바꾸고, 바뀐 접촉망이 다음 감염과 다음 소식을 정합니다. (UAU–SIS 다층 모델,
              Granell·Gómez·Arenas 2013; 회피 재연결은 이 실험의 확장)
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
              <span>소문 느림</span>
              <input
                aria-label="소통망에서 소식이 퍼지는 빠르기"
                aria-valuetext={`소식 전파 ${information.toFixed(2)}`}
                max={INFORMATION_RANGE[1]}
                min={INFORMATION_RANGE[0]}
                step="0.01"
                type="range"
                value={information}
                onChange={(event) => setInformation(Number(event.target.value))}
              />
              <span>소문 빠름</span>
            </label>
            <label className={styles.balance}>
              <span>유지</span>
              <input
                aria-label="소식을 아는 사람이 감염된 접촉을 끊는 정도"
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
          aria-controls="awareness-multiplex-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
