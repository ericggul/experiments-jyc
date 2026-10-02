"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./threshold-network.module.css";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
} from "./layout";
import {
  createThresholdNetwork,
  DEFAULT_MEAN_INPUTS,
  DEFAULT_NODES,
  DEFAULT_PARAMETERS,
  flipNode,
  isActive,
  isDamaged,
  MEAN_INPUT_RANGE,
  measureThreshold,
  setMeanInputs,
  stepThresholdNetwork,
  type ThresholdEvent,
  type ThresholdNetwork,
} from "./model";
import { LINK_VISIBILITY, viewLabels, viewTargets, VIEWS, type ViewId } from "./views";

/** Parallel updates per second; the frozen window is then two seconds. */
const UPDATES_PER_SECOND = 8;
const REDUCED_UPDATES_PER_SECOND = 3;
const INK = "17, 17, 15";
const ACTIVE = "214, 58, 34";
const MARK_LIFETIME = 0.9;
const MAX_MARKS = 160;
const TRANSITION_SECONDS = 0.9;
/** How quickly points follow their target once a view has settled. */
const FOLLOW_RATE = 12;
/** Space kept clear for the collapsed options toggle. */
const CONTROL_BAND = 56;
/** How often the connectivity slider catches up with the network. */
const SLIDER_REFRESH = 0.4;

type Mark =
  | { kind: "gain" | "lose"; source: number; target: number; at: number }
  | { kind: "flip"; node: number; at: number };

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

function nodeRadius(network: ThresholdNetwork, size: Frame, node: number) {
  const base = Math.max(2.5, Math.min(5, idealLength(size, network.size) * 0.1));
  return base * (0.8 + Math.sqrt(network.inputs[node]!.length) * 0.16);
}

function roundInputs(value: number) {
  return Math.round(value * 20) / 20;
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  network: ThresholdNetwork,
  active: Uint8Array,
  points: Float64Array,
  marks: readonly Mark[],
  time: number,
  linkVisibility: number,
  labels: readonly { text: string; x: number; y: number; align: CanvasTextAlign; alpha: number }[],
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";
  const radii = new Float64Array(network.size);
  for (let node = 0; node < network.size; node += 1) radii[node] = nodeRadius(network, size, node);

  // Links from still nodes quietly in ink; links from blinking nodes in red,
  // because only they pass change on. Excitation ends in an arrow, inhibition
  // in a bar, just short of the target.
  for (const [colour, alpha, fromActive] of [
    [INK, 0.16, 0],
    [ACTIVE, 0.42, 1],
  ] as const) {
    const strength = alpha * linkVisibility;
    if (strength < 0.01) continue;
    context.strokeStyle = `rgba(${colour}, ${strength})`;
    context.lineWidth = 0.8;
    context.beginPath();
    for (const list of network.inputs) {
      for (const link of list) {
        if (active[link.source] !== fromActive) continue;
        const sx = points[link.source * 2]!;
        const sy = points[link.source * 2 + 1]!;
        const tx = points[link.target * 2]!;
        const ty = points[link.target * 2 + 1]!;
        const distance = Math.hypot(tx - sx, ty - sy);
        const gap = radii[link.target]! + 2;
        if (distance <= gap + 2) continue;
        const ux = (tx - sx) / distance;
        const uy = (ty - sy) / distance;
        const ex = tx - ux * gap;
        const ey = ty - uy * gap;
        context.moveTo(sx, sy);
        context.lineTo(ex, ey);
        if (link.weight > 0) {
          context.moveTo(ex - ux * 4 - uy * 2.4, ey - uy * 4 + ux * 2.4);
          context.lineTo(ex, ey);
          context.lineTo(ex - ux * 4 + uy * 2.4, ey - uy * 4 - ux * 2.4);
        } else {
          context.moveTo(ex - uy * 3, ey + ux * 3);
          context.lineTo(ex + uy * 3, ey - ux * 3);
        }
      }
    }
    context.stroke();
  }

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1) continue;
    const fade = 1 - progress;
    if (mark.kind === "flip") {
      context.strokeStyle = `rgba(${ACTIVE}, ${0.7 * fade})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(points[mark.node * 2]!, points[mark.node * 2 + 1]!, 5 + progress * 16, 0, Math.PI * 2);
      context.stroke();
      continue;
    }
    const sx = points[mark.source * 2]!;
    const sy = points[mark.source * 2 + 1]!;
    const tx = points[mark.target * 2]!;
    const ty = points[mark.target * 2 + 1]!;
    if (mark.kind === "lose") {
      // A blinking node drops an input: the cut link lingers dashed in red.
      context.setLineDash([2, 4]);
      context.strokeStyle = `rgba(${ACTIVE}, ${0.6 * fade})`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(sx, sy);
      context.lineTo(tx, ty);
      context.stroke();
      context.setLineDash([]);
    } else {
      // A still node gains an input: the new link is drawn out toward it.
      const reach = Math.min(1, progress * 3);
      context.strokeStyle = `rgba(${INK}, ${0.2 + 0.6 * fade})`;
      context.lineWidth = 1.6;
      context.beginPath();
      context.moveTo(sx, sy);
      context.lineTo(sx + (tx - sx) * reach, sy + (ty - sy) * reach);
      context.stroke();
    }
  }

  // Nodes: on is filled, off is an open ring; red while blinking, ink while
  // still. A second red ring marks nodes a flip has changed (the damage).
  for (let node = 0; node < network.size; node += 1) {
    const x = points[node * 2]!;
    const y = points[node * 2 + 1]!;
    const radius = radii[node]!;
    const colour = active[node] ? ACTIVE : INK;
    if (isDamaged(network, node)) {
      context.strokeStyle = `rgba(${ACTIVE}, 0.75)`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(x, y, radius + 3.5, 0, Math.PI * 2);
      context.stroke();
    }
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    if (network.state[node]! > 0) {
      context.fillStyle = `rgb(${colour})`;
      context.fill();
    } else {
      context.fillStyle = "#ffffff";
      context.fill();
      context.strokeStyle = `rgb(${colour})`;
      context.lineWidth = 1.3;
      context.beginPath();
      context.arc(x, y, radius - 0.65, 0, Math.PI * 2);
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

export default function ThresholdNetworkNine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<ThresholdNetwork>(createThresholdNetwork());
  const bodiesRef = useRef<Body[] | null>(null);
  const pointsRef = useRef(new Float64Array(DEFAULT_NODES * 2));
  const targetsRef = useRef(new Float64Array(DEFAULT_NODES * 2));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const viewRef = useRef<ViewId>("network");
  const linkVisibilityRef = useRef(LINK_VISIBILITY.network);
  const transitionRef = useRef<Transition | null>(null);
  const draggingRef = useRef(false);
  const [meanInputs, setMeanInputsValue] = useState(DEFAULT_MEAN_INPUTS);
  const [view, setView] = useState<ViewId>("network");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");

  const pushMarks = useCallback((events: readonly ThresholdEvent[]) => {
    if (reduceMotionRef.current) return;
    for (const event of events) {
      marksRef.current.push({
        kind: event.kind,
        source: event.link.source,
        target: event.link.target,
        at: timeRef.current,
      });
    }
  }, []);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = performance.now();
    let clock = 0;
    let sinceSummary = 0;
    let sinceSlider = 0;

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
        bodiesRef.current.forEach((body, node) => {
          pointsRef.current[node * 2] = body.x;
          pointsRef.current[node * 2 + 1] = body.y;
        });
      }
      sizeRef.current = next;
    };

    const render = (now: number) => {
      const delta = Math.min((now - previous) / 1_000, 0.05);
      previous = now;
      reduceMotionRef.current = reduceMotion.matches;
      timeRef.current += delta;
      const network = networkRef.current;
      const bodies = bodiesRef.current;
      if (bodies) {
        // The displayed trajectory is the model's trajectory: one parallel
        // update per tick, each followed by its topology changes.
        clock += delta * (reduceMotion.matches ? REDUCED_UPDATES_PER_SECOND : UPDATES_PER_SECOND);
        while (clock >= 1) {
          clock -= 1;
          pushMarks(stepThresholdNetwork(network, DEFAULT_PARAMETERS));
        }
        const fresh = marksRef.current.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);
        marksRef.current = fresh.slice(Math.max(0, fresh.length - MAX_MARKS));
        // The force layout keeps running in every view so returning to it is continuous.
        relaxBodies(bodies, network.inputs, layoutFrame(sizeRef.current), delta * (reduceMotion.matches ? 0.3 : 1));

        const size = sizeRef.current;
        const field = layoutFrame(size);
        const current = viewRef.current;
        const points = pointsRef.current;
        const targets = targetsRef.current;
        const active = new Uint8Array(network.size);
        for (let node = 0; node < network.size; node += 1) active[node] = isActive(network, node) ? 1 : 0;
        viewTargets(current, network, active, bodies, field, targets);
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
        const linksFrom = transition?.linksFrom ?? LINK_VISIBILITY[current];
        linkVisibilityRef.current = linksFrom + (LINK_VISIBILITY[current] - linksFrom) * eased;
        const labels = [
          ...viewLabels(current, field).map((label) => ({ ...label, alpha: eased })),
          ...(transition && progress < 1
            ? viewLabels(transition.previous, field).map((label) => ({ ...label, alpha: 1 - eased }))
            : []),
        ];
        if (transition && progress >= 1) transitionRef.current = null;

        draw(context, size, network, active, points, marksRef.current, timeRef.current, linkVisibilityRef.current, labels);

        // The slider shows the network's own K whenever nobody is holding it.
        sinceSlider += delta;
        if (sinceSlider > SLIDER_REFRESH && !draggingRef.current) {
          sinceSlider = 0;
          setMeanInputsValue(roundInputs(network.linkCount / network.size));
        }
        sinceSummary += delta;
        if (sinceSummary > 2) {
          sinceSummary = 0;
          const measure = measureThreshold(network);
          setSummary(
            `Nodes have ${measure.meanInputs.toFixed(1)} inputs on average; ${Math.round(measure.activeShare * 100)}% are blinking and the rest are still.${measure.damage > 0 ? ` A flip has changed ${measure.damage} nodes so far.` : ""}`,
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
  }, [pushMarks]);

  const flip = useCallback((node: number) => {
    if (!flipNode(networkRef.current, node)) return;
    if (!reduceMotionRef.current) marksRef.current.push({ kind: "flip", node, at: timeRef.current });
    setTouched(true);
  }, []);

  // Tapping a node flips it; the unflipped twin then shows what the flip changed.
  const tapAt = useCallback((x: number, y: number) => {
    const network = networkRef.current;
    const points = pointsRef.current;
    let nearest = -1;
    let best = Infinity;
    for (let node = 0; node < network.size; node += 1) {
      const distance = Math.hypot(points[node * 2]! - x, points[node * 2 + 1]! - y);
      if (distance < best) {
        best = distance;
        nearest = node;
      }
    }
    if (nearest >= 0 && best <= nodeRadius(network, sizeRef.current, nearest) + 10) flip(nearest);
  }, [flip]);

  const flipCentre = useCallback(() => {
    const { width, height } = layoutFrame(sizeRef.current);
    const network = networkRef.current;
    const points = pointsRef.current;
    let nearest = 0;
    let best = Infinity;
    for (let node = 0; node < network.size; node += 1) {
      const distance = Math.hypot(points[node * 2]! - width / 2, points[node * 2 + 1]! - height / 2);
      if (distance < best) {
        best = distance;
        nearest = node;
      }
    }
    flip(nearest);
  }, [flip]);

  const imposeInputs = useCallback((value: number) => {
    setMeanInputsValue(value);
    pushMarks(setMeanInputs(networkRef.current, value).slice(-MAX_MARKS));
  }, [pushMarks]);

  const release = () => {
    draggingRef.current = false;
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="threshold-network-summary"
        aria-label="Self-organizing threshold network. Each node is on (filled) or off (open) according to the signed sum of its inputs; red nodes have changed in the last two seconds, ink nodes have stayed still. Still nodes gain an input and blinking nodes lose one, so the network settles where about half the nodes blink. Tap a node to flip it; nodes the flip has changed get a red ring. Press Enter to flip the node nearest the centre. Options below set the number of links and the view."
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          tapAt(event.clientX - bounds.left, event.clientY - bounds.top);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          flipCentre();
        }}
      />
      <p id="threshold-network-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>점을 누르면 켜짐과 꺼짐이 뒤바뀜</p>
        )}
        {optionsOpen && (
          <div id="threshold-network-options" className={styles.options}>
            <p className={styles.about}>
              각 점은 들어오는 연결(흥분은 화살표, 억제는 막대)의 합에 따라 매 순간 켜지거나
              꺼집니다. 이따금 한 점을 골라, 한동안 멈춰 있었으면 입력 연결을 하나 얻고
              깜빡이고 있었으면 하나를 잃습니다. 그래서 너무 고요한 네트워크는 연결이 늘고 너무
              요란한 네트워크는 연결이 줄어, 질서와 혼돈의 경계로 스스로 모입니다.
              (Bornholdt·Rohlf 2000)
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
              <span>성김</span>
              <input
                aria-label="점 하나당 평균 입력 연결 수. 바꾸면 무작위 연결이 더해지거나 지워지고, 이후 네트워크가 스스로 조정합니다"
                aria-valuetext={`평균 입력 ${meanInputs.toFixed(1)}개`}
                max={MEAN_INPUT_RANGE[1]}
                min={MEAN_INPUT_RANGE[0]}
                step="0.05"
                type="range"
                value={Math.min(MEAN_INPUT_RANGE[1], Math.max(MEAN_INPUT_RANGE[0], meanInputs))}
                onPointerDown={() => {
                  draggingRef.current = true;
                }}
                onPointerUp={release}
                onPointerCancel={release}
                onBlur={release}
                onChange={(event) => imposeInputs(Number(event.target.value))}
              />
              <span>빽빽함</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="threshold-network-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
