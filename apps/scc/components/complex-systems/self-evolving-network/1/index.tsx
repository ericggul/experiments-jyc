"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./self-evolving.module.css";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
  type Pair,
} from "./layout";
import {
  createSelfEvolvingNetwork,
  DEFAULT_PARAMETERS,
  forEachTie,
  MAX_TURNOVER,
  measureSelfEvolvingNetwork,
  MIN_TURNOVER,
  retirePerson,
  stepSelfEvolvingNetwork,
  type SelfEvolvingEvent,
  type SelfEvolvingNetwork,
} from "./model";

const UPDATES_PER_PERSON_PER_SECOND = 1;
const MARK_LIFETIME = 1.1;
const MAX_MARKS = 260;
const CONTROL_BAND = 88;
const NEW_TIE = "224, 66, 27";
const INK = "17, 17, 15";

/** `origin` keeps where a departing person stood, since a newcomer takes their body. */
type Mark = { event: SelfEvolvingEvent; at: number; origin?: { x: number; y: number } };

type Description = { ties: number; clustering: number; randomClustering: number };

function layoutFrame(size: Frame): Frame {
  return {
    width: size.width,
    height: Math.max(size.height * 0.5, size.height - CONTROL_BAND),
  };
}

/** 0 for a newcomer, approaching 1 for someone who has outlasted most others. */
function tenure(network: SelfEvolvingNetwork, person: number, turnover: number) {
  const expectedLife = network.size / Math.max(turnover, 1e-3);
  return 1 - Math.exp(-(network.updates - network.bornAt[person]!) / expectedLife);
}

function line(context: CanvasRenderingContext2D, a: Body, b: Body) {
  context.beginPath();
  context.moveTo(a.x, a.y);
  context.lineTo(b.x, b.y);
  context.stroke();
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  network: SelfEvolvingNetwork,
  ties: readonly Pair[],
  bodies: readonly Body[],
  marks: readonly Mark[],
  time: number,
  turnover: number,
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";

  context.strokeStyle = `rgba(${INK}, 0.16)`;
  context.lineWidth = 0.8;
  context.beginPath();
  for (const tie of ties) {
    const a = bodies[tie.a]!;
    const b = bodies[tie.b]!;
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
  }
  context.stroke();

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1) continue;
    const fade = 1 - progress;
    const { event } = mark;
    if (event.kind === "introduce") {
      // The broker's two existing ties, then the tie that closes the triangle.
      const broker = bodies[event.broker]!;
      const a = bodies[event.a]!;
      const b = bodies[event.b]!;
      context.strokeStyle = `rgba(${INK}, ${0.45 * fade})`;
      context.lineWidth = 1;
      line(context, broker, a);
      line(context, broker, b);
      context.strokeStyle = `rgba(${NEW_TIE}, ${0.15 + 0.85 * fade})`;
      context.lineWidth = 1.8;
      line(context, a, b);
    } else if (event.kind === "reach") {
      context.strokeStyle = `rgba(${NEW_TIE}, ${0.15 + 0.85 * fade})`;
      context.lineWidth = 1.8;
      line(context, bodies[event.person]!, bodies[event.stranger]!);
    } else {
      // Ties lost by a departure stay where they were, dashed, while they fade.
      context.setLineDash([2, 4]);
      context.strokeStyle = `rgba(${INK}, ${0.55 * fade})`;
      context.lineWidth = 1;
      const origin = mark.origin;
      if (origin) {
        for (const former of event.former) {
          const body = bodies[former]!;
          context.beginPath();
          context.moveTo(origin.x, origin.y);
          context.lineTo(body.x, body.y);
          context.stroke();
        }
      }
      context.setLineDash([]);
    }
  }

  const base = Math.max(1.8, Math.min(4, idealLength(size, bodies.length) * 0.08));
  for (let person = 0; person < bodies.length; person += 1) {
    const body = bodies[person]!;
    const degree = network.neighbours[person]!.size;
    const shade = Math.round(205 - tenure(network, person, turnover) * 190);
    context.fillStyle = `rgb(${shade}, ${shade}, ${Math.max(0, shade - 4)})`;
    context.beginPath();
    context.arc(body.x, body.y, base * (1 + Math.sqrt(degree) * 0.42), 0, Math.PI * 2);
    context.fill();
  }
}

export default function SelfEvolvingNetworkOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<SelfEvolvingNetwork>(createSelfEvolvingNetwork());
  const bodiesRef = useRef<Body[] | null>(null);
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const turnoverRef = useRef(DEFAULT_PARAMETERS.turnover);
  const [turnover, setTurnover] = useState(DEFAULT_PARAMETERS.turnover);
  const [touched, setTouched] = useState(false);
  const [description, setDescription] = useState<Description>({
    ties: 0,
    clustering: 0,
    randomClustering: 0,
  });

  useEffect(() => {
    turnoverRef.current = turnover;
  }, [turnover]);

  // A newcomer arrives from the edge of the field, where people without ties settle.
  const placeNewcomer = useCallback((person: number) => {
    const bodies = bodiesRef.current;
    if (!bodies) return;
    const frame = layoutFrame(sizeRef.current);
    const angle = (person * 2.399963) % (Math.PI * 2);
    bodies[person] = {
      x: frame.width / 2 + Math.cos(angle) * frame.width * 0.44,
      y: frame.height / 2 + Math.sin(angle) * frame.height * 0.44,
      vx: 0,
      vy: 0,
    };
  }, []);

  const recordDeparture = useCallback((event: SelfEvolvingEvent) => {
    const bodies = bodiesRef.current;
    if (!bodies || event.kind !== "retire") return;
    const body = bodies[event.person]!;
    marksRef.current.push({ event, at: timeRef.current, origin: { x: body.x, y: body.y } });
    placeNewcomer(event.person);
  }, [placeNewcomer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = performance.now();
    let pendingUpdates = 0;
    let lastDescription = 0;

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
    };

    const render = (now: number) => {
      const delta = Math.min((now - previous) / 1_000, 0.05);
      previous = now;
      const tempo = reduceMotion.matches ? 0.3 : 1;
      timeRef.current += delta;
      const network = networkRef.current;
      const bodies = bodiesRef.current;
      if (bodies) {
        pendingUpdates += delta * tempo * network.size * UPDATES_PER_PERSON_PER_SECOND;
        const count = Math.floor(pendingUpdates);
        pendingUpdates -= count;
        const events = stepSelfEvolvingNetwork(network, count, { turnover: turnoverRef.current });
        for (const event of events) {
          if (event.kind === "retire") recordDeparture(event);
          else if (!reduceMotion.matches) marksRef.current.push({ event, at: timeRef.current });
        }
        const fresh = marksRef.current.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);
        marksRef.current = fresh.slice(Math.max(0, fresh.length - MAX_MARKS));

        const ties: Pair[] = [];
        forEachTie(network, (a, b) => ties.push({ a, b }));
        relaxBodies(bodies, ties, layoutFrame(sizeRef.current), delta * tempo);
        draw(context, sizeRef.current, network, ties, bodies, marksRef.current, timeRef.current, turnoverRef.current);

        if (now - lastDescription > 2_000) {
          lastDescription = now;
          const measure = measureSelfEvolvingNetwork(network);
          setDescription({
            ties: measure.ties,
            clustering: measure.clustering,
            randomClustering: measure.randomClustering,
          });
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
  }, [recordDeparture]);

  const retireNearest = useCallback((x: number, y: number, reach: number) => {
    const bodies = bodiesRef.current;
    if (!bodies) return;
    let nearest = -1;
    let best = reach;
    bodies.forEach((body, person) => {
      const distance = Math.hypot(body.x - x, body.y - y);
      if (distance <= best) {
        best = distance;
        nearest = person;
      }
    });
    if (nearest < 0) return;
    const event = retirePerson(networkRef.current, nearest);
    if (event) recordDeparture(event);
    setTouched(true);
  }, [recordDeparture]);

  const retireMostConnected = useCallback(() => {
    const network = networkRef.current;
    let hub = 0;
    network.neighbours.forEach((known, person) => {
      if (known.size > network.neighbours[hub]!.size) hub = person;
    });
    const event = retirePerson(network, hub);
    if (event) recordDeparture(event);
    setTouched(true);
  }, [recordDeparture]);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="self-evolving-description"
        aria-label="A fixed population that rewires itself: people introduce two of their acquaintances to each other, people without acquaintances reach a stranger, and people leave and are replaced by newcomers. Darker means longer tenure; larger means more acquaintances. Press someone to make them leave; press Enter to remove the most connected person."
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          retireNearest(event.clientX - bounds.left, event.clientY - bounds.top, 24);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          retireMostConnected();
        }}
      />
      <p id="self-evolving-description" className={styles.screenReaderOnly}>
        {description.ties} acquaintances. Clustering {description.clustering.toFixed(2)}, against{" "}
        {description.randomClustering.toFixed(3)} for a random graph of the same density.
      </p>

      <div className={styles.control}>
        <p className={styles.hint} data-hidden={touched}>
          press someone to make them leave
        </p>
        <label className={styles.balance}>
          <span>stay</span>
          <input
            aria-label="How often people leave and are replaced"
            aria-valuetext={`turnover ${turnover.toFixed(2)} per encounter`}
            max={MAX_TURNOVER}
            min={MIN_TURNOVER}
            step="0.005"
            type="range"
            value={turnover}
            onChange={(event) => setTurnover(Number(event.target.value))}
          />
          <span>leave</span>
        </label>
      </div>
    </main>
  );
}
