"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./structural-balance.module.css";
import { createBodies, relaxBodies, rescaleBodies, type Body, type Frame } from "./layout";
import {
  addPerson,
  createSignedNetwork,
  DEFAULT_PARAMETERS,
  factions,
  flipRelation,
  isolatePerson,
  MAX_PEOPLE,
  measureBalance,
  pairTension,
  RECONCILE_RANGE,
  relation,
  stepSignedNetwork,
  UNREST_RANGE,
  type SignedNetwork,
} from "./model";
import {
  CELL_VISIBILITY,
  LINE_VISIBILITY,
  matrixGeometry,
  viewTargets,
  VIEWS,
  type ViewId,
} from "./views";

/** Model time units per second; one wrong relationship among 30 heals in ≈ .4 s. */
const TEMPO = 1;
const INK = "17, 17, 15";
const ENEMY = "214, 58, 34";
const MARK_LIFETIME = 0.8;
const MAX_MARKS = 120;
const TRANSITION_SECONDS = 0.9;
/** How quickly points follow their target once a view has settled. */
const FOLLOW_RATE = 12;
/** Space kept clear for the collapsed options toggle. */
const CONTROL_BAND = 56;
/** Pointer travel that turns a press into a drag. */
const DRAG_THRESHOLD = 6;
/** Tension buckets for drawing: share of a pair's triangles that are unbalanced. */
const TENSION_STEPS = [0, 0.15, 0.4, 0.7] as const;

type Mark =
  | { kind: "flip"; a: number; b: number; sign: 1 | -1; triangle: readonly [number, number, number] | null; at: number }
  | { kind: "person"; person: number; sign: 1 | -1; at: number };

type Transition = {
  from: Float64Array;
  linesFrom: number;
  cellsFrom: number;
  startedAt: number;
};

type Drag = { from: number; x: number; y: number; startX: number; startY: number; moved: boolean };

function layoutFrame(size: Frame): Frame {
  return { width: size.width, height: Math.max(size.height * 0.5, size.height - CONTROL_BAND) };
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

function personRadius(size: Frame) {
  return Math.max(3, Math.min(5, Math.min(size.width, size.height) * 0.009));
}

function tensionStep(tension: number) {
  let step = 0;
  while (step < TENSION_STEPS.length - 1 && tension > TENSION_STEPS[step + 1]!) step += 1;
  return tension > 0 ? Math.max(1, step) : 0;
}

function nearestPerson(points: Float64Array, count: number, x: number, y: number, except = -1) {
  let nearest = -1;
  let best = Infinity;
  for (let person = 0; person < count; person += 1) {
    if (person === except) continue;
    const distance = Math.hypot(points[person * 2]! - x, points[person * 2 + 1]! - y);
    if (distance < best) {
      best = distance;
      nearest = person;
    }
  }
  return { person: nearest, distance: best };
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  field: Frame,
  network: SignedNetwork,
  points: Float64Array,
  tension: Float32Array,
  marks: readonly Mark[],
  time: number,
  lines: number,
  cells: number,
  drag: Drag | null,
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";
  const count = network.size;
  const x = (person: number) => points[person * 2]!;
  const y = (person: number) => points[person * 2 + 1]!;
  const line = (a: number, b: number) => {
    context.moveTo(x(a), y(a));
    context.lineTo(x(b), y(b));
  };

  // Friendship in ink, enmity in red. A relationship that sits in unbalanced
  // triangles is drawn stronger: those are the only places where the next
  // change can happen.
  if (lines > 0.01) {
    for (const sign of [1, -1] as const) {
      for (let step = 0; step < TENSION_STEPS.length; step += 1) {
        const strain = step === 0 ? 0 : TENSION_STEPS[step]! + 0.15;
        const alpha = ((sign > 0 ? 0.13 : 0.1) + 0.45 * strain) * lines;
        context.strokeStyle = `rgba(${sign > 0 ? INK : ENEMY}, ${Math.min(0.85, alpha)})`;
        context.lineWidth = step === 0 ? 0.7 : 1;
        context.beginPath();
        for (let a = 0; a < count; a += 1) {
          for (let b = a + 1; b < count; b += 1) {
            if (relation(network, a, b) !== sign) continue;
            if (tensionStep(tension[a * network.stride + b]!) === step) line(a, b);
          }
        }
        context.stroke();
      }
    }
  }

  // Matrix cells sit at (x of column person, y of row person), so they follow
  // the people as camps reorder.
  const { cell } = matrixGeometry(field, count);
  if (cells > 0.01) {
    const box = cell * 0.86;
    for (const sign of [1, -1] as const) {
      context.fillStyle = `rgba(${sign > 0 ? INK : ENEMY}, ${(sign > 0 ? 0.78 : 0.62) * cells})`;
      context.beginPath();
      for (let a = 0; a < count; a += 1) {
        for (let b = a + 1; b < count; b += 1) {
          if (relation(network, a, b) !== sign) continue;
          context.rect(x(b) - box / 2, y(a) - box / 2, box, box);
          context.rect(x(a) - box / 2, y(b) - box / 2, box, box);
        }
      }
      context.fill();
    }
  }

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1) continue;
    const fade = 1 - progress;
    if (mark.kind === "person") {
      context.strokeStyle = `rgba(${mark.sign > 0 ? INK : ENEMY}, ${0.7 * fade})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(x(mark.person), y(mark.person), 6 + progress * 16, 0, Math.PI * 2);
      context.stroke();
      continue;
    }
    const colour = mark.sign > 0 ? INK : ENEMY;
    if (lines > 0.01) {
      // The unbalanced triangle that forced the change flashes thinly; the
      // changed relationship is drawn heavy in its new sign.
      if (mark.triangle) {
        const [first, second, third] = mark.triangle;
        context.strokeStyle = `rgba(${INK}, ${0.4 * fade * lines})`;
        context.lineWidth = 0.9;
        context.beginPath();
        context.moveTo(x(first), y(first));
        context.lineTo(x(second), y(second));
        context.lineTo(x(third), y(third));
        context.closePath();
        context.stroke();
      }
      context.strokeStyle = `rgba(${colour}, ${0.9 * fade * lines})`;
      context.lineWidth = 2.4;
      context.beginPath();
      line(mark.a, mark.b);
      context.stroke();
    }
    if (cells > 0.01) {
      const box = cell * 1.5;
      context.strokeStyle = `rgba(${colour}, ${0.9 * fade * cells})`;
      context.lineWidth = 1.4;
      context.strokeRect(x(mark.b) - box / 2, y(mark.a) - box / 2, box, box);
      context.strokeRect(x(mark.a) - box / 2, y(mark.b) - box / 2, box, box);
    }
  }

  if (drag?.moved) {
    const target = nearestPerson(points, count, drag.x, drag.y, drag.from);
    const snapped = target.person >= 0 && target.distance <= personRadius(size) + 12;
    // While dragging, the line previews the sign the relationship will take.
    const next = snapped ? -relation(network, drag.from, target.person) : 0;
    context.setLineDash(snapped ? [] : [3, 4]);
    context.strokeStyle = `rgba(${next < 0 ? ENEMY : INK}, ${snapped ? 0.9 : 0.5})`;
    context.lineWidth = snapped ? 2.4 : 1.2;
    context.beginPath();
    context.moveTo(x(drag.from), y(drag.from));
    context.lineTo(snapped ? x(target.person) : drag.x, snapped ? y(target.person) : drag.y);
    context.stroke();
    context.setLineDash([]);
  }

  const radius = Math.min(personRadius(size), Math.max(1.5, cell * 0.42 + (1 - cells) * 5));
  context.fillStyle = `rgb(${INK})`;
  context.beginPath();
  for (let person = 0; person < count; person += 1) {
    context.moveTo(x(person) + radius, y(person));
    context.arc(x(person), y(person), radius, 0, Math.PI * 2);
  }
  context.fill();
}

export default function StructuralBalanceFive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<SignedNetwork>(createSignedNetwork());
  const bodiesRef = useRef<Body[] | null>(null);
  const pointsRef = useRef(new Float64Array(MAX_PEOPLE * 2));
  const targetsRef = useRef(new Float64Array(MAX_PEOPLE * 2));
  const tensionRef = useRef(new Float32Array(MAX_PEOPLE * MAX_PEOPLE));
  const campsRef = useRef<Int8Array>(new Int8Array(0));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const dragRef = useRef<Drag | null>(null);
  const reconcileRef = useRef(DEFAULT_PARAMETERS.reconcile);
  const unrestRef = useRef(DEFAULT_PARAMETERS.unrest);
  const reduceMotionRef = useRef(false);
  const viewRef = useRef<ViewId>("network");
  const linesRef = useRef(LINE_VISIBILITY.network);
  const cellsRef = useRef(CELL_VISIBILITY.network);
  const transitionRef = useRef<Transition | null>(null);
  const [reconcile, setReconcile] = useState(DEFAULT_PARAMETERS.reconcile);
  const [unrest, setUnrest] = useState(DEFAULT_PARAMETERS.unrest);
  const [view, setView] = useState<ViewId>("network");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    reconcileRef.current = reconcile;
  }, [reconcile]);

  useEffect(() => {
    unrestRef.current = unrest;
  }, [unrest]);

  const changeView = useCallback((next: ViewId) => {
    setView(next);
    if (next === viewRef.current) return;
    transitionRef.current = {
      from: pointsRef.current.slice(0, networkRef.current.size * 2),
      linesFrom: linesRef.current,
      cellsFrom: cellsRef.current,
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
      reduceMotionRef.current = reduceMotion.matches;
      const tempo = reduceMotion.matches ? 0.3 : 1;
      timeRef.current += delta;
      const network = networkRef.current;
      const bodies = bodiesRef.current;
      if (bodies) {
        const events = stepSignedNetwork(network, delta * tempo * TEMPO, {
          ...DEFAULT_PARAMETERS,
          reconcile: reconcileRef.current,
          unrest: unrestRef.current,
        });
        const marks = marksRef.current;
        if (!reduceMotion.matches) {
          for (const event of events) {
            marks.push({
              kind: "flip",
              a: event.a,
              b: event.b,
              sign: event.sign,
              triangle: event.kind === "resolve" ? event.triangle : null,
              at: timeRef.current,
            });
          }
        }
        const fresh = marks.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);
        marksRef.current = fresh.slice(Math.max(0, fresh.length - MAX_MARKS));
        pairTension(network, tensionRef.current);
        campsRef.current = factions(network, campsRef.current);
        // The force layout keeps running in every view so returning to it is continuous.
        const size = sizeRef.current;
        const field = layoutFrame(size);
        relaxBodies(bodies, network, field, delta * tempo);

        const current = viewRef.current;
        const points = pointsRef.current;
        const targets = targetsRef.current;
        viewTargets(current, network.size, campsRef.current, bodies, field, targets);
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
        const linesFrom = transition?.linesFrom ?? LINE_VISIBILITY[current];
        const cellsFrom = transition?.cellsFrom ?? CELL_VISIBILITY[current];
        linesRef.current = linesFrom + (LINE_VISIBILITY[current] - linesFrom) * eased;
        cellsRef.current = cellsFrom + (CELL_VISIBILITY[current] - cellsFrom) * eased;
        if (transition && progress >= 1) transitionRef.current = null;

        draw(
          context,
          size,
          field,
          network,
          points,
          tensionRef.current,
          marksRef.current,
          timeRef.current,
          linesRef.current,
          cellsRef.current,
          dragRef.current,
        );

        sinceSummary += delta;
        if (sinceSummary > 2) {
          sinceSummary = 0;
          const measure = measureBalance(network);
          const camps = measure.minority === 0
            ? "Everyone is in one camp."
            : `Two camps of ${network.size - measure.minority} and ${measure.minority}.`;
          setSummary(`${measure.balanced ? "Balanced." : `${measure.unbalanced} unbalanced triangles.`} ${camps} ${Math.round(measure.friendly * 100)}% of pairs are friends.`);
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

  const markPerson = (person: number, sign: 1 | -1) => {
    if (reduceMotionRef.current) return;
    marksRef.current.push({ kind: "person", person, sign, at: timeRef.current });
  };

  const markFlip = (a: number, b: number, sign: 1 | -1) => {
    if (reduceMotionRef.current) return;
    marksRef.current.push({ kind: "flip", a, b, sign, triangle: null, at: timeRef.current });
  };

  const isolate = useCallback((person: number) => {
    if (isolatePerson(networkRef.current, person)) markPerson(person, -1);
    setTouched(true);
  }, []);

  const flip = useCallback((a: number, b: number) => {
    const sign = flipRelation(networkRef.current, a, b);
    if (sign !== null) markFlip(a, b, sign);
    setTouched(true);
  }, []);

  // A newcomer arrives as everyone's friend at the tapped point.
  const welcome = useCallback((x: number, y: number) => {
    const network = networkRef.current;
    const bodies = bodiesRef.current;
    const points = pointsRef.current;
    if (!bodies) return;
    const person = addPerson(network);
    setTouched(true);
    if (person === null) return;
    bodies[person] = { x, y, vx: 0, vy: 0 };
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
    markPerson(person, 1);
  }, []);

  const centrePerson = () => {
    const { width, height } = layoutFrame(sizeRef.current);
    return nearestPerson(pointsRef.current, networkRef.current.size, width / 2, height / 2).person;
  };

  const pointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="structural-balance-summary"
        aria-label="Structural balance. Every pair of people are friends, drawn in ink, or enemies, drawn in red. A triangle with one or three enmities is unbalanced, and one of its relationships changes until no unbalanced triangle is left. Drag from one person to another to flip their relationship; tap a person to make them everyone's enemy; tap empty space to add a newcomer who is everyone's friend. Keys: Enter makes the person nearest the centre everyone's enemy, F flips the relationship between that person and the person farthest from them, N adds a newcomer. Options below change how unbalanced triangles are resolved, how often relationships change by themselves, and the view."
        onPointerDown={(event) => {
          const { x, y } = pointer(event);
          const network = networkRef.current;
          const nearest = nearestPerson(pointsRef.current, network.size, x, y);
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            from: nearest.distance <= personRadius(sizeRef.current) + 8 ? nearest.person : -1,
            x,
            y,
            startX: x,
            startY: y,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          const { x, y } = pointer(event);
          drag.x = x;
          drag.y = y;
          if (Math.hypot(x - drag.startX, y - drag.startY) > DRAG_THRESHOLD) drag.moved = drag.from >= 0;
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag) return;
          const { x, y } = pointer(event);
          const travelled = Math.hypot(x - drag.startX, y - drag.startY) > DRAG_THRESHOLD;
          if (drag.from < 0) {
            if (!travelled) welcome(x, y);
            return;
          }
          if (!travelled) {
            isolate(drag.from);
            return;
          }
          const target = nearestPerson(pointsRef.current, networkRef.current.size, x, y, drag.from);
          if (target.person >= 0 && target.distance <= personRadius(sizeRef.current) + 12) {
            flip(drag.from, target.person);
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onKeyDown={(event) => {
          const key = event.key.toLowerCase();
          if (key === "enter" || key === " ") {
            event.preventDefault();
            isolate(centrePerson());
          } else if (key === "f") {
            const person = centrePerson();
            const points = pointsRef.current;
            let farthest = -1;
            let best = -1;
            for (let other = 0; other < networkRef.current.size; other += 1) {
              const distance = Math.hypot(points[other * 2]! - points[person * 2]!, points[other * 2 + 1]! - points[person * 2 + 1]!);
              if (other !== person && distance > best) {
                best = distance;
                farthest = other;
              }
            }
            if (farthest >= 0) flip(person, farthest);
          } else if (key === "n") {
            const { width, height } = layoutFrame(sizeRef.current);
            welcome(width / 2, height / 2);
          }
        }}
      />
      <p id="structural-balance-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>사람에서 사람으로 끌면 관계가 뒤집히고, 누르면 모두의 적</p>
        )}
        {optionsOpen && (
          <div id="structural-balance-options" className={styles.options}>
            <p className={styles.about}>
              모든 두 사람은 친구이거나 적입니다. 세 사람 중 적대가 하나 또는 셋이면 그 삼각형은
              불균형이고, 적인 두 사람이 화해하거나 가운데 사람이 나머지 관계와 더 잘 맞는 쪽의 편을
              듭니다. 바뀐 관계는 그 관계를 공유하는 다른 삼각형의 균형을 다시 바꾸므로, 이 연쇄는
              모두가 친구가 되거나 서로 적대하는 두 편으로 갈라질 때에만 멈춥니다.
              (구조적 균형, Heider 1946; Antal·Krapivsky·Redner 2005)
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
              <span>편 가르기</span>
              <input
                aria-label="불균형한 삼각형에서 적인 두 사람이 화해할 확률"
                aria-valuetext={`화해 확률 ${reconcile.toFixed(2)}`}
                max={RECONCILE_RANGE[1]}
                min={RECONCILE_RANGE[0]}
                step="0.01"
                type="range"
                value={reconcile}
                onChange={(event) => setReconcile(Number(event.target.value))}
              />
              <span>화해</span>
            </label>
            <label className={styles.balance}>
              <span>고요</span>
              <input
                aria-label="관계가 저절로 바뀌는 빈도"
                aria-valuetext={`초당 ${unrest.toFixed(2)}번`}
                max={UNREST_RANGE[1]}
                min={UNREST_RANGE[0]}
                step="0.01"
                type="range"
                value={unrest}
                onChange={(event) => setUnrest(Number(event.target.value))}
              />
              <span>소란</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="structural-balance-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
