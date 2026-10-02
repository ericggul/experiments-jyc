"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./coevolving-voter.module.css";
import {
  createBodies,
  idealLength,
  relaxBodies,
  rescaleBodies,
  type Body,
  type Frame,
} from "./layout";
import {
  createCoevolvingNetwork,
  DEFAULT_PARAMETERS,
  plantOpinion,
  rarestOpinion,
  stepCoevolvingNetwork,
  type CoevolvingNetwork,
} from "./model";

// One colour per opinion; ink is reserved for ties across a disagreement.
const OPINION_COLOURS = [
  [200, 55, 45],
  [35, 99, 168],
  [222, 160, 30],
  [47, 138, 87],
  [123, 74, 168],
  [217, 106, 167],
] as const;
const INK = "22, 22, 20";
const UPDATES_PER_VOTER_PER_SECOND = 2;
const MARK_LIFETIME = 0.9;
const MAX_MARKS = 220;
const CONTROL_BAND = 88;

type Mark =
  | { kind: "rewire"; voter: number; from: number; to: number; at: number }
  | { kind: "turn"; voter: number; opinion: number; at: number };

function colour(opinion: number, alpha: number) {
  const [red, green, blue] = OPINION_COLOURS[opinion] ?? OPINION_COLOURS[0];
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function layoutFrame(size: Frame): Frame {
  return {
    width: size.width,
    height: Math.max(size.height * 0.5, size.height - CONTROL_BAND),
  };
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  network: CoevolvingNetwork,
  bodies: readonly Body[],
  marks: readonly Mark[],
  time: number,
  brush: { x: number; y: number; radius: number; opinion: number } | null,
) {
  context.clearRect(0, 0, size.width, size.height);
  const { opinions, ties } = network;

  context.lineCap = "round";
  // Agreeing ties sit quietly in their shared colour.
  context.lineWidth = 1;
  for (const tie of ties) {
    const opinion = opinions[tie.a]!;
    if (opinion !== opinions[tie.b]) continue;
    const a = bodies[tie.a]!;
    const b = bodies[tie.b]!;
    context.strokeStyle = colour(opinion, 0.34);
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  }
  // Disagreeing ties are where the next adoption or rewiring can happen.
  context.strokeStyle = `rgba(${INK}, 0.62)`;
  context.lineWidth = 1.15;
  context.beginPath();
  for (const tie of ties) {
    if (opinions[tie.a] === opinions[tie.b]) continue;
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
    const voter = bodies[mark.voter]!;
    if (mark.kind === "rewire") {
      // The severed tie lingers toward its old end; the new tie is drawn out.
      const from = bodies[mark.from]!;
      const to = bodies[mark.to]!;
      context.setLineDash([2, 4]);
      context.strokeStyle = `rgba(${INK}, ${0.5 * fade})`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(voter.x, voter.y);
      context.lineTo(from.x, from.y);
      context.stroke();
      context.setLineDash([]);
      const reach = Math.min(1, progress * 3);
      context.strokeStyle = colour(opinions[mark.voter]!, 0.9 * fade + 0.1);
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(voter.x, voter.y);
      context.lineTo(voter.x + (to.x - voter.x) * reach, voter.y + (to.y - voter.y) * reach);
      context.stroke();
    } else {
      context.strokeStyle = colour(mark.opinion, 0.7 * fade);
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(voter.x, voter.y, 4 + progress * 14, 0, Math.PI * 2);
      context.stroke();
    }
  }

  const base = Math.max(2.6, Math.min(5.5, idealLength(size, bodies.length) * 0.12));
  for (let voter = 0; voter < bodies.length; voter += 1) {
    const body = bodies[voter]!;
    const degree = network.incident[voter]!.length;
    context.fillStyle = colour(opinions[voter]!, 1);
    context.beginPath();
    context.arc(body.x, body.y, base * (0.72 + Math.sqrt(degree) * 0.16), 0, Math.PI * 2);
    context.fill();
  }

  if (brush) {
    context.strokeStyle = colour(brush.opinion, 0.8);
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(brush.x, brush.y, brush.radius, 0, Math.PI * 2);
    context.stroke();
  }
}

export default function CoevolvingVoterOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<CoevolvingNetwork>(createCoevolvingNetwork());
  const bodiesRef = useRef<Body[] | null>(null);
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const rewiringRef = useRef(DEFAULT_PARAMETERS.rewiring);
  const brushRef = useRef<{ x: number; y: number; radius: number; opinion: number } | null>(null);
  const [rewiring, setRewiring] = useState(DEFAULT_PARAMETERS.rewiring);
  const [planted, setPlanted] = useState(false);

  useEffect(() => {
    rewiringRef.current = rewiring;
  }, [rewiring]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = performance.now();
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
        pendingUpdates += delta * tempo * network.size * UPDATES_PER_VOTER_PER_SECOND;
        const count = Math.floor(pendingUpdates);
        pendingUpdates -= count;
        const events = stepCoevolvingNetwork(network, count, {
          ...DEFAULT_PARAMETERS,
          rewiring: rewiringRef.current,
        });
        const marks = marksRef.current;
        if (!reduceMotion.matches) {
          for (const event of events) {
            marks.push(
              event.kind === "rewire"
                ? { kind: "rewire", voter: event.voter, from: event.from, to: event.to, at: timeRef.current }
                : { kind: "turn", voter: event.voter, opinion: event.opinion, at: timeRef.current },
            );
          }
        }
        const fresh = marks.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);
        marksRef.current = fresh.slice(Math.max(0, fresh.length - MAX_MARKS));
        relaxBodies(bodies, network.ties, layoutFrame(sizeRef.current), delta * tempo);
        draw(context, sizeRef.current, network, bodies, marksRef.current, timeRef.current, brushRef.current);
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

  const plantAt = useCallback((x: number, y: number, opinion: number) => {
    const bodies = bodiesRef.current;
    if (!bodies) return;
    const radius = idealLength(sizeRef.current, bodies.length) * 1.1;
    brushRef.current = { x, y, radius, opinion };
    const reached: number[] = [];
    bodies.forEach((body, voter) => {
      if (Math.hypot(body.x - x, body.y - y) <= radius) reached.push(voter);
    });
    const changed = plantOpinion(networkRef.current, reached, opinion);
    for (const voter of changed) {
      marksRef.current.push({ kind: "turn", voter, opinion, at: timeRef.current });
    }
    if (changed.length > 0) setPlanted(true);
  }, []);

  const pointFor = (target: HTMLCanvasElement, clientX: number, clientY: number) => {
    const bounds = target.getBoundingClientRect();
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-label="Coevolving voter network. Each voter disagreeing with a tie either adopts that neighbour's view or cuts the tie and reconnects to someone who already agrees. Press and drag across voters to plant the least-held view; press Enter to plant it at the centre."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          plantAt(point.x, point.y, rarestOpinion(networkRef.current));
        }}
        onPointerMove={(event) => {
          const brush = brushRef.current;
          if (!brush || (event.buttons & 1) === 0) return;
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          plantAt(point.x, point.y, brush.opinion);
        }}
        onPointerUp={() => {
          brushRef.current = null;
        }}
        onPointerCancel={() => {
          brushRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const frame = layoutFrame(sizeRef.current);
          plantAt(frame.width / 2, frame.height / 2, rarestOpinion(networkRef.current));
          brushRef.current = null;
        }}
      />

      <div className={styles.control}>
        <p className={styles.hint} data-hidden={planted}>
          press a crowd to plant a view
        </p>
        <label className={styles.balance}>
          <span>adopt</span>
          <input
            aria-label="When voters disagree: adopt the neighbour's view, or rewire to someone like-minded"
            aria-valuetext={`${Math.round(rewiring * 100)}% rewire, ${Math.round((1 - rewiring) * 100)}% adopt`}
            max="1"
            min="0"
            step="0.01"
            type="range"
            value={rewiring}
            onChange={(event) => setRewiring(Number(event.target.value))}
          />
          <span>rewire</span>
        </label>
      </div>
    </main>
  );
}
