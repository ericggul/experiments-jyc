"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./coevolving-culture.module.css";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
} from "./layout";
import {
  createCultureNetwork,
  DEFAULT_AGENTS,
  DEFAULT_PARAMETERS,
  DEFAULT_TRAITS,
  DRIFT_RANGE,
  FEATURES,
  impose,
  measureCulture,
  otherEnd,
  randomizeCulture,
  redrawCultures,
  sharedFeatures,
  stepCultureNetwork,
  TRAITS_RANGE,
  type CultureNetwork,
} from "./model";
import {
  createEmbedding,
  TIE_VISIBILITY,
  updateEmbedding,
  viewLabels,
  viewTargets,
  VIEWS,
  type Embedding,
  type ViewId,
} from "./views";

/** Model time units per second: each agent looks at one tie about six times a second. */
const TEMPO = 6;
const INK = "17, 17, 15";
const MARK_LIFETIME = 0.7;
const MAX_MARKS = 240;
const TRANSITION_SECONDS = 0.9;
/** How quickly points follow their target once a view has settled. */
const FOLLOW_RATE = 12;
/** Space kept clear for the collapsed options toggle. */
const CONTROL_BAND = 56;
/** Pointer travel that turns a tap (a stranger) into a drag (carry a culture). */
const DRAG_THRESHOLD = 6;
/** Seconds between recomputations of the similarity map. */
const EMBEDDING_INTERVAL = 0.5;
/** Tie ink by shared features, 0…FEATURES; zero overlap is drawn dashed. */
const TIE_ALPHA = [0.42, 0.1, 0.22, 0.42];
const SECTOR = (Math.PI * 2) / FEATURES;

type Mark =
  | { kind: "copy"; agent: number; source: number; trait: number; at: number }
  | { kind: "rewire"; agent: number; from: number; to: number; at: number }
  | { kind: "change"; agent: number; at: number };

type Transition = {
  from: Float64Array;
  previous: ViewId;
  tiesFrom: number;
  startedAt: number;
};

type Press = { x: number; y: number; source: number | null; dragging: boolean };

// One palette shared by all features: golden-angle hues with three lightness
// steps, so neighbouring trait numbers never look alike.
const TRAIT_COLOURS = Array.from({ length: TRAITS_RANGE[1] }, (_, trait) => ({
  hue: (trait * 137.508 + 18) % 360,
  saturation: 56 + (trait % 2) * 14,
  lightness: [50, 36, 64][trait % 3]!,
}));

function traitColour(trait: number, alpha = 1) {
  const { hue, saturation, lightness } = TRAIT_COLOURS[trait] ?? TRAIT_COLOURS[0]!;
  return `hsla(${hue.toFixed(1)}, ${saturation}%, ${lightness}%, ${alpha})`;
}

function layoutFrame(size: Frame): Frame {
  return { width: size.width, height: Math.max(size.height * 0.5, size.height - CONTROL_BAND) };
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

function glyphRadius(network: CultureNetwork, size: Frame) {
  return Math.max(4, Math.min(8, idealLength(size, network.size) * 0.16));
}

/** One agent: a disc cut into FEATURES sectors, each in its trait's colour. */
function drawGlyph(context: CanvasRenderingContext2D, cultures: Uint8Array, agent: number, x: number, y: number, radius: number) {
  for (let feature = 0; feature < FEATURES; feature += 1) {
    const start = -Math.PI / 2 + feature * SECTOR;
    context.fillStyle = traitColour(cultures[agent * FEATURES + feature]!);
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, radius, start, start + SECTOR);
    context.closePath();
    context.fill();
  }
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  network: CultureNetwork,
  points: Float64Array,
  marks: readonly Mark[],
  time: number,
  tieVisibility: number,
  labels: readonly { text: string; x: number; y: number; align: CanvasTextAlign; alpha: number }[],
  carried: { agent: number; x: number; y: number } | null,
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";
  const { cultures, ties } = network;
  const radius = glyphRadius(network, size);
  const line = (a: number, b: number) => {
    context.moveTo(points[a * 2]!, points[a * 2 + 1]!);
    context.lineTo(points[b * 2]!, points[b * 2 + 1]!);
  };

  // Tie ink follows overlap; ties with nothing shared are dashed, because
  // they are the ones about to be cut.
  const byOverlap: number[][] = Array.from({ length: FEATURES + 1 }, () => []);
  for (const tie of ties) byOverlap[sharedFeatures(network, tie.a, tie.b)]!.push(tie.id);
  byOverlap.forEach((group, shared) => {
    const alpha = TIE_ALPHA[shared]! * (shared === 0 ? Math.max(0.5, tieVisibility) : tieVisibility);
    if (alpha < 0.01 || group.length === 0) return;
    context.setLineDash(shared === 0 ? [2, 4] : []);
    context.strokeStyle = `rgba(${INK}, ${alpha})`;
    context.lineWidth = shared === FEATURES ? 1.2 : 0.9;
    context.beginPath();
    for (const id of group) line(ties[id]!.a, ties[id]!.b);
    context.stroke();
  });
  context.setLineDash([]);

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1) continue;
    const fade = 1 - progress;
    const x = points[mark.agent * 2]!;
    const y = points[mark.agent * 2 + 1]!;
    if (mark.kind === "copy") {
      // The trait travels along the tie, in its own colour.
      context.strokeStyle = traitColour(mark.trait, 0.75 * fade);
      context.lineWidth = 2.2;
      context.beginPath();
      line(mark.source, mark.agent);
      context.stroke();
    } else if (mark.kind === "rewire") {
      context.setLineDash([2, 4]);
      context.strokeStyle = `rgba(${INK}, ${0.5 * fade})`;
      context.lineWidth = 1;
      context.beginPath();
      line(mark.agent, mark.from);
      context.stroke();
      context.setLineDash([]);
      const reach = Math.min(1, progress * 3);
      const toX = points[mark.to * 2]!;
      const toY = points[mark.to * 2 + 1]!;
      context.strokeStyle = `rgba(${INK}, ${0.2 + 0.6 * fade})`;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (toX - x) * reach, y + (toY - y) * reach);
      context.stroke();
    } else {
      context.strokeStyle = `rgba(${INK}, ${0.6 * fade})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(x, y, radius + 2 + progress * 12, 0, Math.PI * 2);
      context.stroke();
    }
  }

  for (let agent = 0; agent < network.size; agent += 1) {
    drawGlyph(context, cultures, agent, points[agent * 2]!, points[agent * 2 + 1]!, radius);
  }

  if (carried) {
    // The culture being carried follows the pointer.
    context.strokeStyle = `rgba(${INK}, 0.5)`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(carried.x, carried.y, radius * 1.6 + 2, 0, Math.PI * 2);
    context.stroke();
    drawGlyph(context, cultures, carried.agent, carried.x, carried.y, radius * 1.6);
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

export default function CoevolvingCultureTen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<CultureNetwork>(createCultureNetwork());
  const bodiesRef = useRef<Body[] | null>(null);
  const pointsRef = useRef(new Float64Array(DEFAULT_AGENTS * 2));
  const targetsRef = useRef(new Float64Array(DEFAULT_AGENTS * 2));
  const embeddingRef = useRef<Embedding>(createEmbedding(DEFAULT_AGENTS));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const driftRef = useRef(DEFAULT_PARAMETERS.drift);
  const viewRef = useRef<ViewId>("network");
  const tieVisibilityRef = useRef(TIE_VISIBILITY.network);
  const transitionRef = useRef<Transition | null>(null);
  const pressRef = useRef<Press | null>(null);
  const carriedRef = useRef<{ agent: number; x: number; y: number } | null>(null);
  const [traits, setTraits] = useState(DEFAULT_TRAITS);
  const [drift, setDrift] = useState(DEFAULT_PARAMETERS.drift);
  const [view, setView] = useState<ViewId>("network");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    driftRef.current = drift;
  }, [drift]);

  const changeView = useCallback((next: ViewId) => {
    setView(next);
    if (next === viewRef.current) return;
    if (next === "similarity") updateEmbedding(networkRef.current, embeddingRef.current);
    transitionRef.current = {
      from: pointsRef.current.slice(),
      previous: viewRef.current,
      tiesFrom: tieVisibilityRef.current,
      startedAt: timeRef.current,
    };
    viewRef.current = next;
  }, []);

  const changeTraits = useCallback((next: number) => {
    setTraits(next);
    // A new generation of cultures on the same ties.
    redrawCultures(networkRef.current, next);
    marksRef.current = [];
    if (viewRef.current === "similarity") updateEmbedding(networkRef.current, embeddingRef.current);
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
    let sinceEmbedding = 0;

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
        bodiesRef.current.forEach((body, agent) => {
          pointsRef.current[agent * 2] = body.x;
          pointsRef.current[agent * 2 + 1] = body.y;
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
        const events = stepCultureNetwork(network, delta * tempo * TEMPO, { drift: driftRef.current });
        const marks = marksRef.current;
        if (!reduceMotion.matches) {
          for (const event of events) {
            if (event.kind === "copy") {
              marks.push({ kind: "copy", agent: event.agent, source: event.source, trait: event.trait, at: timeRef.current });
            } else if (event.kind === "rewire") {
              marks.push({ kind: "rewire", agent: event.agent, from: event.from, to: event.to, at: timeRef.current });
            } else {
              marks.push({ kind: "change", agent: event.agent, at: timeRef.current });
            }
          }
        }
        const fresh = marks.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);
        marksRef.current = fresh.slice(Math.max(0, fresh.length - MAX_MARKS));
        // The force layout keeps running in every view so returning to it is continuous.
        relaxBodies(bodies, network.ties, layoutFrame(sizeRef.current), delta * tempo);

        const current = viewRef.current;
        sinceEmbedding += delta;
        if (current === "similarity" && sinceEmbedding > EMBEDDING_INTERVAL) {
          sinceEmbedding = 0;
          updateEmbedding(network, embeddingRef.current);
        }

        const size = sizeRef.current;
        const field = layoutFrame(size);
        const points = pointsRef.current;
        const targets = targetsRef.current;
        viewTargets(current, network, bodies, field, embeddingRef.current, targets);
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

        draw(context, size, network, points, marksRef.current, timeRef.current, tieVisibilityRef.current, labels, carriedRef.current);

        sinceSummary += delta;
        if (sinceSummary > 2) {
          sinceSummary = 0;
          const measure = measureCulture(network);
          setSummary(`${measure.cultures} distinct cultures; the most common is held by ${Math.round(measure.largestCulture * 100)}% of agents. The network is in ${measure.components} separate ${measure.components === 1 ? "part" : "parts"}; the largest holds ${Math.round(measure.largestComponent * 100)}%.`);
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

  const markChange = (agent: number) => {
    marksRef.current.push({ kind: "change", agent, at: timeRef.current });
  };

  const agentAt = useCallback((x: number, y: number) => {
    const network = networkRef.current;
    const points = pointsRef.current;
    const reach = glyphRadius(network, sizeRef.current) + 8;
    let nearest: number | null = null;
    let best = reach;
    for (let agent = 0; agent < network.size; agent += 1) {
      const distance = Math.hypot(points[agent * 2]! - x, points[agent * 2 + 1]! - y);
      if (distance <= best) {
        best = distance;
        nearest = agent;
      }
    }
    return nearest;
  }, []);

  // Every agent the carried culture passes over takes it whole.
  const carryOver = useCallback((source: number, x: number, y: number) => {
    const network = networkRef.current;
    const points = pointsRef.current;
    const reach = glyphRadius(network, sizeRef.current) * 1.6 + 8;
    for (let agent = 0; agent < network.size; agent += 1) {
      if (Math.hypot(points[agent * 2]! - x, points[agent * 2 + 1]! - y) > reach) continue;
      if (impose(network, source, agent)) markChange(agent);
    }
  }, []);

  const centreAgent = useCallback(() => {
    const { width, height } = layoutFrame(sizeRef.current);
    const network = networkRef.current;
    const points = pointsRef.current;
    let nearest = 0;
    let best = Infinity;
    for (let agent = 0; agent < network.size; agent += 1) {
      const distance = Math.hypot(points[agent * 2]! - width / 2, points[agent * 2 + 1]! - height / 2);
      if (distance < best) {
        best = distance;
        nearest = agent;
      }
    }
    return nearest;
  }, []);

  const pointFor = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="coevolving-culture-summary"
        aria-label="Culture on a coevolving network. Each agent's disc shows three cultural features in colour. Agents copy a feature from neighbours they partly resemble; a tie between agents with nothing in common, drawn dashed, is cut and moved to a random agent. Tap an agent to give it a random culture; drag from an agent to carry its culture onto others. Press Enter to give the agent nearest the centre a random culture, Space to spread its culture to its neighbours. Options below change the number of traits per feature, the drift rate and the view."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          pressRef.current = { ...point, source: agentAt(point.x, point.y), dragging: false };
        }}
        onPointerMove={(event) => {
          const press = pressRef.current;
          if (!press || press.source === null || (event.buttons & 1) === 0) return;
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          if (!press.dragging) {
            if (Math.hypot(point.x - press.x, point.y - press.y) < DRAG_THRESHOLD) return;
            press.dragging = true;
            setTouched(true);
          }
          carriedRef.current = { agent: press.source, ...point };
          carryOver(press.source, point.x, point.y);
        }}
        onPointerUp={() => {
          const press = pressRef.current;
          if (press && press.source !== null && !press.dragging) {
            if (randomizeCulture(networkRef.current, press.source)) markChange(press.source);
            setTouched(true);
          }
          pressRef.current = null;
          carriedRef.current = null;
        }}
        onPointerCancel={() => {
          pressRef.current = null;
          carriedRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const network = networkRef.current;
          const agent = centreAgent();
          if (event.key === "Enter") {
            if (randomizeCulture(network, agent)) markChange(agent);
          } else {
            for (const tieId of network.incident[agent]!) {
              const neighbour = otherEnd(network.ties[tieId]!, agent);
              if (impose(network, agent, neighbour)) markChange(neighbour);
            }
          }
          setTouched(true);
        }}
      />
      <p id="coevolving-culture-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>누르면 낯선 문화, 끌면 그 문화를 옮김</p>
        )}
        {optionsOpen && (
          <div id="coevolving-culture-options" className={styles.options}>
            <p className={styles.about}>
              각 사람은 세 가지 문화 특성을 지닙니다. 이웃과 닮은 만큼 그 이웃의 특성 하나를
              따라 하고, 닮은 점이 하나도 없으면 관계를 끊고 아무나와 새로 연결합니다. 닮음이
              관계를 고르고, 남은 관계가 다시 누가 누구를 닮아 갈지를 정합니다.
              (액설로드 문화 모형의 공진화판, Centola 외 2007)
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
              <span>획일</span>
              <input
                aria-label="특성마다 가능한 값의 수. 바꾸면 모든 문화를 새로 뽑습니다"
                aria-valuetext={`값 ${traits}가지`}
                max={TRAITS_RANGE[1]}
                min={TRAITS_RANGE[0]}
                step="1"
                type="range"
                value={traits}
                onChange={(event) => changeTraits(Number(event.target.value))}
              />
              <span>다양</span>
            </label>
            <label className={styles.balance}>
              <span>고정</span>
              <input
                aria-label="문화가 저절로 바뀌는 정도"
                aria-valuetext={`표류 ${drift.toFixed(4)}`}
                max={DRIFT_RANGE[1]}
                min={DRIFT_RANGE[0]}
                step="0.0005"
                type="range"
                value={drift}
                onChange={(event) => setDrift(Number(event.target.value))}
              />
              <span>표류</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="coevolving-culture-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
