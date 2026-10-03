"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./adaptive-cooperation.module.css";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
} from "./layout";
import {
  createCooperationNetwork,
  DEFAULT_PARAMETERS,
  DEFAULT_PLAYERS,
  flipPlayer,
  leadingCooperator,
  measureCooperation,
  payoff,
  stepCooperationNetwork,
  SWITCHING_RANGE,
  TEMPTATION_RANGE,
  type CooperationNetwork,
  type CooperationParameters,
} from "./model";
import { TIE_VISIBILITY, viewLabels, viewTargets, VIEWS, type ViewId } from "./views";

/** Updates per player per second: about forty strategy or tie changes a second. */
const SWEEPS_PER_SECOND = 2;
const INK = "17, 17, 15";
const DEFECT = "205, 62, 30";
const MARK_LIFETIME = 0.9;
const MAX_MARKS = 200;
const TRANSITION_SECONDS = 0.9;
/** How quickly points follow their target once a view has settled. */
const FOLLOW_RATE = 12;
/** Space kept clear for the collapsed options toggle. */
const CONTROL_BAND = 56;

type Mark =
  | { kind: "switch"; player: number; from: number; to: number; at: number }
  | { kind: "imitate"; player: number; model: number; defect: boolean; at: number }
  | { kind: "flip"; player: number; defect: boolean; at: number };

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

/**
 * Area grows with payoff above a floor, so the players most likely to be copied
 * are the largest while an exploited-out defector (payoff 0) stays visible.
 */
function playerRadius(network: CooperationNetwork, size: Frame, player: number, temptation: number) {
  const base = Math.max(2.6, Math.min(4.5, idealLength(size, network.size) * 0.1));
  return base * (1 + Math.sqrt(payoff(network, player, temptation)) * 0.16);
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  network: CooperationNetwork,
  temptation: number,
  points: Float64Array,
  marks: readonly Mark[],
  time: number,
  tieVisibility: number,
  labels: readonly { text: string; x: number; y: number; align: CanvasTextAlign; alpha: number }[],
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";
  const { strategy, ties } = network;
  const line = (a: number, b: number) => {
    context.moveTo(points[a * 2]!, points[a * 2 + 1]!);
    context.lineTo(points[b * 2]!, points[b * 2 + 1]!);
  };

  // Ties between cooperators quietly in ink. Any tie to a defector is in the
  // defector's colour, strongest where a cooperator is being exploited: these
  // are the only ties anyone walks away from.
  for (const [colour, alpha, width, match] of [
    [INK, 0.16 * tieVisibility, 0.8, (a: string, b: string) => a === "C" && b === "C"],
    [DEFECT, 0.2 * tieVisibility, 0.8, (a: string, b: string) => a === "D" && b === "D"],
    [DEFECT, 0.32 * Math.max(0.3, tieVisibility), 1, (a: string, b: string) => a !== b],
  ] as const) {
    if (alpha < 0.01) continue;
    context.strokeStyle = `rgba(${colour}, ${alpha})`;
    context.lineWidth = width;
    context.beginPath();
    for (const tie of ties) {
      if (match(strategy[tie.a]!, strategy[tie.b]!)) line(tie.a, tie.b);
    }
    context.stroke();
  }

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1) continue;
    const fade = 1 - progress;
    const x = points[mark.player * 2]!;
    const y = points[mark.player * 2 + 1]!;
    if (mark.kind === "switch") {
      // The abandoned defector keeps a dashed trace; the new tie is drawn out.
      context.setLineDash([2, 4]);
      context.strokeStyle = `rgba(${DEFECT}, ${0.55 * fade})`;
      context.lineWidth = 1;
      context.beginPath();
      line(mark.player, mark.from);
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
    } else if (mark.kind === "imitate") {
      // The copied strategy travels from the richer neighbour to the copier.
      const fromX = points[mark.model * 2]!;
      const fromY = points[mark.model * 2 + 1]!;
      const reach = Math.min(1, progress * 3);
      context.strokeStyle = `rgba(${mark.defect ? DEFECT : INK}, ${0.75 * fade})`;
      context.lineWidth = 1.6;
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(fromX + (x - fromX) * reach, fromY + (y - fromY) * reach);
      context.stroke();
    } else {
      context.strokeStyle = `rgba(${mark.defect ? DEFECT : INK}, ${0.7 * fade})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(x, y, 4 + progress * 14, 0, Math.PI * 2);
      context.stroke();
    }
  }

  // Cooperators first as plain ink discs; defectors on top, red with a white
  // rim and an outer red ring, so a few defectors read among many cooperators.
  for (const drawn of ["C", "D"] as const) {
    for (let player = 0; player < network.size; player += 1) {
      if (strategy[player] !== drawn) continue;
      const x = points[player * 2]!;
      const y = points[player * 2 + 1]!;
      const radius = playerRadius(network, size, player, temptation);
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      if (drawn === "C") {
        context.fillStyle = `rgb(${INK})`;
        context.fill();
        continue;
      }
      context.fillStyle = `rgb(${DEFECT})`;
      context.fill();
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1.5;
      context.stroke();
      context.strokeStyle = `rgba(${DEFECT}, 0.55)`;
      context.lineWidth = 1;
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

export default function AdaptiveCooperationThree() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<CooperationNetwork>(createCooperationNetwork());
  const bodiesRef = useRef<Body[] | null>(null);
  const pointsRef = useRef(new Float64Array(DEFAULT_PLAYERS * 2));
  const targetsRef = useRef(new Float64Array(DEFAULT_PLAYERS * 2));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const parametersRef = useRef<CooperationParameters>(DEFAULT_PARAMETERS);
  const viewRef = useRef<ViewId>("network");
  const tieVisibilityRef = useRef(TIE_VISIBILITY.network);
  const transitionRef = useRef<Transition | null>(null);
  const [temptation, setTemptation] = useState(DEFAULT_PARAMETERS.temptation);
  const [switching, setSwitching] = useState(DEFAULT_PARAMETERS.switching);
  const [view, setView] = useState<ViewId>("network");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    parametersRef.current = { ...DEFAULT_PARAMETERS, temptation, switching };
  }, [temptation, switching]);

  const changeView = useCallback((next: ViewId) => {
    setView(next);
    if (next === viewRef.current) return;
    transitionRef.current = {
      from: pointsRef.current.slice(),
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
    let pendingUpdates = 0;

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
        bodiesRef.current.forEach((body, player) => {
          pointsRef.current[player * 2] = body.x;
          pointsRef.current[player * 2 + 1] = body.y;
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
      const parameters = parametersRef.current;
      if (bodies) {
        pendingUpdates += network.size * SWEEPS_PER_SECOND * delta * tempo;
        const count = Math.floor(pendingUpdates);
        pendingUpdates -= count;
        const events = stepCooperationNetwork(network, count, parameters);
        const marks = marksRef.current;
        if (!reduceMotion.matches) {
          for (const event of events) {
            if (event.kind === "switch") {
              marks.push({ kind: "switch", player: event.player, from: event.from, to: event.to, at: timeRef.current });
            } else if (event.kind === "imitate") {
              marks.push({ kind: "imitate", player: event.player, model: event.model, defect: event.strategy === "D", at: timeRef.current });
            } else {
              marks.push({ kind: "flip", player: event.player, defect: event.strategy === "D", at: timeRef.current });
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
        viewTargets(current, network, parameters.temptation, bodies, field, targets);
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

        draw(context, size, network, parameters.temptation, points, marksRef.current, timeRef.current, tieVisibilityRef.current, labels);

        sinceSummary += delta;
        if (sinceSummary > 2) {
          sinceSummary = 0;
          const measure = measureCooperation(network);
          const most = Math.round(measure.hubRatio * (2 * network.ties.length) / network.size);
          setSummary(`${Math.round(measure.cooperators * 100)}% cooperate. Cooperators average ${measure.meanDegreeCooperator.toFixed(1)} ties, defectors ${measure.meanDegreeDefector.toFixed(1)}; the best-connected player has ${most}.`);
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

  const flip = useCallback((player: number) => {
    const strategy = flipPlayer(networkRef.current, player);
    if (strategy === null) return;
    marksRef.current.push({ kind: "flip", player, defect: strategy === "D", at: timeRef.current });
    setTouched(true);
  }, []);

  // Tapping a player flips their strategy: a cooperator starts defecting, a
  // defector starts cooperating. The nearest player within reach is chosen.
  const tapAt = useCallback((x: number, y: number) => {
    const network = networkRef.current;
    const points = pointsRef.current;
    const temptationNow = parametersRef.current.temptation;
    let nearest = -1;
    let best = Infinity;
    for (let player = 0; player < network.size; player += 1) {
      const distance = Math.hypot(points[player * 2]! - x, points[player * 2 + 1]! - y);
      const reach = Math.max(14, playerRadius(network, sizeRef.current, player, temptationNow) + 6);
      if (distance <= reach && distance < best) {
        best = distance;
        nearest = player;
      }
    }
    if (nearest >= 0) flip(nearest);
  }, [flip]);

  // Keyboard: the richest cooperator defects, which is where a cascade starts.
  const flipLeader = useCallback(() => {
    const network = networkRef.current;
    const leader = leadingCooperator(network);
    if (leader !== null) {
      flip(leader);
      return;
    }
    let hub = 0;
    for (let player = 1; player < network.size; player += 1) {
      if (network.incident[player]!.length > network.incident[hub]!.length) hub = player;
    }
    flip(hub);
  }, [flip]);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="adaptive-cooperation-summary"
        aria-label="Adaptive cooperation network. Each player plays a prisoner's dilemma with every neighbour; dark players cooperate, red players defect, and larger players earn more. Players copy neighbours who earn more, and anyone may leave a defecting neighbour for one of that neighbour's contacts. Tap a player to switch them between cooperating and defecting. Press Enter to make the richest cooperator defect. Options below change the temptation to defect, how readily players leave defectors, and the view."
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          tapAt(event.clientX - bounds.left, event.clientY - bounds.top);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          flipLeader();
        }}
      />
      <p id="adaptive-cooperation-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>검은 점은 협력, 빨간 점은 배신 · 누르면 뒤바뀜</p>
        )}
        {optionsOpen && (
          <div id="adaptive-cooperation-options" className={styles.options}>
            <p className={styles.about}>
              검은 점은 협력자, 빨간 점은 배신자이고 점이 클수록 많이 법니다. 모두가 이웃 각각과 죄수의 딜레마를 하고, 자기보다 많이 버는 이웃의 전략을 따라
              합니다. 배신자는 협력자를 이용해 더 벌지만, 누구든 배신하는 이웃을 떠나 그 이웃의 다른
              지인과 새로 연결할 수 있습니다. 아무도 협력자를 떠나지 않으니 연결이 협력자에게 모이고,
              연결이 많은 협력자가 가장 많이 벌어 따라 할 본보기가 됩니다. (적응형 죄수의 딜레마,
              Zimmermann·Eguíluz·San Miguel 2004; Santos·Pacheco·Lenaerts 2006)
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
              <span>작은 유혹</span>
              <input
                aria-label="배신자가 협력하는 이웃 하나에게서 얻는 보수"
                aria-valuetext={`유혹 ${temptation.toFixed(2)}`}
                max={TEMPTATION_RANGE[1]}
                min={TEMPTATION_RANGE[0]}
                step="0.01"
                type="range"
                value={temptation}
                onChange={(event) => setTemptation(Number(event.target.value))}
              />
              <span>큰 유혹</span>
            </label>
            <label className={styles.balance}>
              <span>머묾</span>
              <input
                aria-label="배신하는 이웃을 떠나는 정도"
                aria-valuetext={`떠남 ${switching.toFixed(2)}`}
                max={SWITCHING_RANGE[1]}
                min={SWITCHING_RANGE[0]}
                step="0.01"
                type="range"
                value={switching}
                onChange={(event) => setSwitching(Number(event.target.value))}
              />
              <span>떠남</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="adaptive-cooperation-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
