"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./echo-chambers.module.css";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
} from "./layout";
import {
  addActivePerson,
  CONTACT_MEMORY,
  CONTROVERSY_RANGE,
  createEchoNetwork,
  DEFAULT_PARAMETERS,
  HOMOPHILY_RANGE,
  holdOpinion,
  MAX_PEOPLE,
  measureEcho,
  stepEchoNetwork,
  type EchoNetwork,
} from "./model";
import {
  axisGeometry,
  CONTACT_VISIBILITY,
  opinionToUnit,
  unitToOpinion,
  viewLabels,
  viewTargets,
  VIEWS,
  type ViewId,
} from "./views";

/** Model time units per second; opinions relax over about 1.7 s. */
const TEMPO = 0.6;
const INK = [17, 17, 15] as const;
/** The two sides: negative opinions blue, positive opinions red. */
const LEFT = [38, 88, 178] as const;
const RIGHT = [214, 58, 34] as const;
/** Opinion at which a person is drawn in their side's full colour. */
const FULL_COLOUR = 1.5;
/** A new contact draws out from the person who reached out over this long. */
const DRAW_OUT_SECONDS = 0.18;
const MARK_LIFETIME = 0.9;
const NEWCOMER_OPINION = 2;
const TRANSITION_SECONDS = 0.9;
/** How quickly points follow their target once a view has settled. */
const FOLLOW_RATE = 12;
/** Space kept clear for the collapsed options toggle. */
const CONTROL_BAND = 56;
/** Pointer travel that turns a press on a person into a drag. */
const DRAG_THRESHOLD = 6;

type Rgb = readonly [number, number, number];

type Mark = { person: number; at: number };

type Transition = {
  from: Float64Array;
  previous: ViewId;
  contactsFrom: number;
  startedAt: number;
};

type Press = {
  x: number;
  y: number;
  person: number | null;
  /** The held person's opinion axis position when the drag began. */
  unit: number;
  dragging: boolean;
};

function layoutFrame(size: Frame): Frame {
  return { width: size.width, height: Math.max(size.height * 0.5, size.height - CONTROL_BAND) };
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

function baseRadius(size: Frame, count: number) {
  return Math.max(2, Math.min(4.5, idealLength(size, count) * 0.1));
}

function personRadius(network: EchoNetwork, size: Frame, person: number) {
  return baseRadius(size, network.size) * (0.8 + Math.sqrt(network.activity[person]!) * 0.9);
}

/** Ink near zero, the side's colour as conviction grows. */
function opinionColour(opinion: number): Rgb {
  const side = opinion < 0 ? LEFT : RIGHT;
  const share = Math.min(1, Math.abs(opinion) / FULL_COLOUR);
  return [
    Math.round(INK[0] + (side[0] - INK[0]) * share),
    Math.round(INK[1] + (side[1] - INK[1]) * share),
    Math.round(INK[2] + (side[2] - INK[2]) * share),
  ];
}

function rgba([red, green, blue]: Rgb, alpha: number) {
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  network: EchoNetwork,
  points: Float64Array,
  marks: readonly Mark[],
  time: number,
  modelTime: number,
  /** Model time a new contact takes to draw out from the person who reached out. */
  drawOut: number,
  contactVisibility: number,
  axisVisibility: number,
  labels: readonly { text: string; x: number; y: number; align: CanvasTextAlign; alpha: number }[],
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";
  const { opinion } = network;
  const field = layoutFrame(size);

  // Zero opinion: the line between the two sides.
  if (axisVisibility > 0.01) {
    const { centre, top, bottom } = axisGeometry(field);
    context.strokeStyle = rgba(INK, 0.12 * axisVisibility);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(centre, top - 8);
    context.lineTo(centre, bottom + 8);
    context.stroke();
  }

  // Recent contacts bow upward between the two people; fresh ones are strong.
  // Within a side they take the side's colour, across sides they are ink.
  if (contactVisibility > 0.01) {
    for (const contact of network.contacts) {
      const age = modelTime - contact.at;
      const freshness = 1 - age / CONTACT_MEMORY;
      if (freshness <= 0) continue;
      const a = opinion[contact.source]!;
      const b = opinion[contact.target]!;
      const across = a * b < 0;
      const colour = across ? INK : a < 0 ? LEFT : RIGHT;
      const x1 = points[contact.source * 2]!;
      const y1 = points[contact.source * 2 + 1]!;
      let x2 = points[contact.target * 2]!;
      let y2 = points[contact.target * 2 + 1]!;
      const reach = drawOut > 0 ? Math.min(1, age / drawOut) : 1;
      x2 = x1 + (x2 - x1) * reach;
      y2 = y1 + (y2 - y1) * reach;
      const dx = x2 - x1;
      const dy = y2 - y1;
      // Normal pointing up the screen, a quarter of the length out.
      let nx = -dy;
      let ny = dx;
      if (ny > 0) {
        nx = -nx;
        ny = -ny;
      }
      context.strokeStyle = rgba(colour, (across ? 0.5 : 0.42) * freshness ** 1.5 * contactVisibility);
      context.lineWidth = contact.mutual ? 1.1 : 0.7;
      context.beginPath();
      context.moveTo(x1, y1);
      context.quadraticCurveTo((x1 + x2) / 2 + nx * 0.25, (y1 + y2) / 2 + ny * 0.25, x2, y2);
      context.stroke();
    }
  }

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1 || mark.person >= network.size) continue;
    context.strokeStyle = rgba(opinionColour(opinion[mark.person]!), 0.7 * (1 - progress));
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(points[mark.person * 2]!, points[mark.person * 2 + 1]!, 5 + progress * 16, 0, Math.PI * 2);
    context.stroke();
  }

  for (let person = 0; person < network.size; person += 1) {
    context.fillStyle = rgba(opinionColour(opinion[person]!), 1);
    context.beginPath();
    context.arc(points[person * 2]!, points[person * 2 + 1]!, personRadius(network, size, person), 0, Math.PI * 2);
    context.fill();
  }

  // The person the participant holds carries a thin ring.
  if (network.held !== null) {
    const held = network.held;
    context.strokeStyle = rgba(INK, 0.8);
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(points[held * 2]!, points[held * 2 + 1]!, personRadius(network, size, held) + 4, 0, Math.PI * 2);
    context.stroke();
  }

  context.font = "12px Arial, Helvetica, sans-serif";
  context.textBaseline = "middle";
  for (const label of labels) {
    if (label.alpha < 0.01) continue;
    context.fillStyle = rgba(INK, 0.55 * label.alpha);
    context.textAlign = label.align;
    context.fillText(label.text, label.x, label.y);
  }
}

export default function EchoChambersSeven() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<EchoNetwork>(createEchoNetwork());
  const bodiesRef = useRef<Body[] | null>(null);
  const pointsRef = useRef(new Float64Array(MAX_PEOPLE * 2));
  const targetsRef = useRef(new Float64Array(MAX_PEOPLE * 2));
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const parametersRef = useRef(DEFAULT_PARAMETERS);
  const pressRef = useRef<Press | null>(null);
  const heldUnitRef = useRef(0);
  const viewRef = useRef<ViewId>("opinion");
  const contactVisibilityRef = useRef(CONTACT_VISIBILITY.opinion);
  const transitionRef = useRef<Transition | null>(null);
  const [controversy, setControversy] = useState(DEFAULT_PARAMETERS.controversy);
  const [homophily, setHomophily] = useState(DEFAULT_PARAMETERS.homophily);
  const [view, setView] = useState<ViewId>("opinion");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    parametersRef.current = { ...DEFAULT_PARAMETERS, controversy, homophily };
  }, [controversy, homophily]);

  const changeView = useCallback((next: ViewId) => {
    setView(next);
    if (next === viewRef.current) return;
    const count = networkRef.current.size;
    transitionRef.current = {
      from: pointsRef.current.slice(0, count * 2),
      previous: viewRef.current,
      contactsFrom: contactVisibilityRef.current,
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
      }
      sizeRef.current = next;
      if (timeRef.current === 0) {
        // Start on the live targets of the opening view.
        viewTargets(viewRef.current, networkRef.current, bodiesRef.current, layoutFrame(next), dotSpacing(next), pointsRef.current);
      }
    };

    const dotSpacing = (size: Frame) => baseRadius(size, networkRef.current.size) * 2.4;

    const render = (now: number) => {
      const delta = Math.min((now - previous) / 1_000, 0.05);
      previous = now;
      reduceMotionRef.current = reduceMotion.matches;
      const tempo = reduceMotion.matches ? 0.3 : 1;
      timeRef.current += delta;
      const network = networkRef.current;
      const bodies = bodiesRef.current;
      if (bodies) {
        const held = network.held;
        if (held !== null) holdOpinion(network, held, unitToOpinion(heldUnitRef.current));
        stepEchoNetwork(network, delta * tempo * TEMPO, parametersRef.current);
        marksRef.current = marksRef.current.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);

        const size = sizeRef.current;
        const field = layoutFrame(size);
        // The force layout keeps running in every view so returning to it is continuous.
        relaxBodies(bodies, network.contacts, network.time, CONTACT_MEMORY, field, delta * tempo);

        const current = viewRef.current;
        const points = pointsRef.current;
        const targets = targetsRef.current;
        viewTargets(current, network, bodies, field, dotSpacing(size), targets);
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
        const contactsFrom = transition?.contactsFrom ?? CONTACT_VISIBILITY[current];
        contactVisibilityRef.current = contactsFrom + (CONTACT_VISIBILITY[current] - contactsFrom) * eased;
        const axisNow = current === "network" ? 0 : 1;
        const axisBefore = transition ? (transition.previous === "network" ? 0 : 1) : axisNow;
        const labels = [
          ...viewLabels(current, field).map((label) => ({ ...label, alpha: eased })),
          ...(transition && progress < 1
            ? viewLabels(transition.previous, field).map((label) => ({ ...label, alpha: 1 - eased }))
            : []),
        ];
        if (transition && progress >= 1) transitionRef.current = null;

        draw(
          context,
          size,
          network,
          points,
          marksRef.current,
          timeRef.current,
          network.time,
          reduceMotion.matches ? 0 : DRAW_OUT_SECONDS * TEMPO,
          contactVisibilityRef.current,
          axisBefore + (axisNow - axisBefore) * eased,
          labels,
        );

        sinceSummary += delta;
        if (sinceSummary > 2) {
          sinceSummary = 0;
          const measure = measureEcho(network);
          setSummary(
            `${Math.round(measure.positive * 100)}% lean right, ${Math.round((1 - measure.positive) * 100)}% left; mean conviction ${measure.meanConviction.toFixed(1)}. ${Math.round(measure.crossContacts * 100)}% of recent conversations cross sides.`,
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

  const personAt = useCallback((x: number, y: number) => {
    const network = networkRef.current;
    const points = pointsRef.current;
    let nearest: number | null = null;
    let best = Infinity;
    for (let person = 0; person < network.size; person += 1) {
      const distance = Math.hypot(points[person * 2]! - x, points[person * 2 + 1]! - y);
      if (distance < best) {
        best = distance;
        nearest = person;
      }
    }
    if (nearest === null) return { nearest: null, hit: false };
    return { nearest, hit: best <= personRadius(network, sizeRef.current, nearest) + 8 };
  }, []);

  /** Appends a person who talks every round, at `opinion`, drawn at (x, y). */
  const addAt = useCallback((x: number, y: number, opinion: number) => {
    const network = networkRef.current;
    const bodies = bodiesRef.current;
    const points = pointsRef.current;
    setTouched(true);
    if (!bodies) return;
    const person = addActivePerson(network, opinion);
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
    if (!reduceMotionRef.current) marksRef.current.push({ person, at: timeRef.current });
  }, []);

  // A tap on empty space adds a talkative person: in the opinion and distribution
  // views at the tapped opinion, in the conversation view at the opinion of the
  // nearest person there.
  const tapAt = useCallback((x: number, y: number) => {
    const network = networkRef.current;
    const field = layoutFrame(sizeRef.current);
    let opinion: number;
    if (viewRef.current === "network") {
      const { nearest } = personAt(x, y);
      opinion = nearest === null ? 0 : network.opinion[nearest]!;
    } else {
      const { centre, half } = axisGeometry(field);
      opinion = unitToOpinion((x - centre) / half);
    }
    addAt(x, y, opinion);
  }, [addAt, personAt]);

  const width = () => axisGeometry(layoutFrame(sizeRef.current)).half;

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="echo-chambers-summary"
        aria-label="Echo chambers. Each dot is a person; colour shows their side, red right and blue left, stronger with conviction. Arcs are recent conversations, coloured within a side and dark across sides. People mostly talk to those whose opinion is close, and drift toward what they hear. Drag a person sideways to move and hold their opinion; tap empty space to add a person who talks constantly. Arrow Left or Right adds such a person on that side. Options below change how controversial the topic is, how strongly people seek like minds, and the view."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          const y = event.clientY - bounds.top;
          const { nearest, hit } = personAt(x, y);
          const person = hit ? nearest : null;
          pressRef.current = {
            x,
            y,
            person,
            unit: person === null ? 0 : opinionToUnit(networkRef.current.opinion[person]!),
            dragging: false,
          };
        }}
        onPointerMove={(event) => {
          const press = pressRef.current;
          if (!press || press.person === null) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          const y = event.clientY - bounds.top;
          if (!press.dragging) {
            if (Math.hypot(x - press.x, y - press.y) < DRAG_THRESHOLD) return;
            press.dragging = true;
            setTouched(true);
          }
          // Horizontal travel moves the person along the opinion axis, so in the
          // opinion and distribution views they follow the pointer.
          heldUnitRef.current = Math.max(-1, Math.min(1, press.unit + (x - press.x) / width()));
          holdOpinion(networkRef.current, press.person, unitToOpinion(heldUnitRef.current));
        }}
        onPointerUp={() => {
          const press = pressRef.current;
          pressRef.current = null;
          if (!press) return;
          if (press.dragging) holdOpinion(networkRef.current, null);
          else if (press.person === null) tapAt(press.x, press.y);
        }}
        onPointerCancel={() => {
          pressRef.current = null;
          holdOpinion(networkRef.current, null);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const side = event.key === "ArrowLeft" ? -1 : 1;
          const field = layoutFrame(sizeRef.current);
          const { centre, half, top } = axisGeometry(field);
          const x = centre + side * opinionToUnit(NEWCOMER_OPINION) * half;
          addAt(viewRef.current === "network" ? centre + side * half * 0.5 : x, top, side * NEWCOMER_OPINION);
        }}
      />
      <p id="echo-chambers-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>사람을 좌우로 끌면 의견이 바뀌고, 빈 곳을 누르면 말 많은 사람이 생깁니다</p>
        )}
        {optionsOpen && (
          <div id="echo-chambers-options" className={styles.options}>
            <p className={styles.about}>
              사람마다 의견이 있고, 부호는 편을, 크기는 확신을 뜻합니다. 말을 거는 사람은 의견이
              가까운 상대를 더 자주 고르고, 각자는 들은 의견 쪽으로 움직이며, 주제가 논쟁적일수록
              확신을 더 세게 전합니다. 의견이 대화 상대를 정하고 대화 상대가 다시 의견을 정하므로,
              비슷한 사람만 찾을수록 두 진영이 각자의 반향실에 갇힙니다.
              (Baumann·Lorenz-Spreen·Sokolov·Starnini 2020)
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
              <span>온건</span>
              <input
                aria-label="주제가 얼마나 논쟁적인지"
                aria-valuetext={`논쟁성 ${controversy.toFixed(2)}`}
                max={CONTROVERSY_RANGE[1]}
                min={CONTROVERSY_RANGE[0]}
                step="0.05"
                type="range"
                value={controversy}
                onChange={(event) => setControversy(Number(event.target.value))}
              />
              <span>논쟁</span>
            </label>
            <label className={styles.balance}>
              <span>아무나</span>
              <input
                aria-label="의견이 비슷한 사람을 골라 대화하는 정도"
                aria-valuetext={`동질성 ${homophily.toFixed(2)}`}
                max={HOMOPHILY_RANGE[1]}
                min={HOMOPHILY_RANGE[0]}
                step="0.05"
                type="range"
                value={homophily}
                onChange={(event) => setHomophily(Number(event.target.value))}
              />
              <span>비슷한 사람만</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="echo-chambers-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
