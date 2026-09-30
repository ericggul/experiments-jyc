"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./local-optimum.module.css";
import Controls from "./controls";
import { NODE_COUNT, TRAIL_LENGTH, createCoupledMap, stepCoupledMap, type CoupledMap } from "./model/coupled-map";
import { clampParameter, dynamics, type Plane } from "./model/dynamics";
import { demandAt, positionFor } from "./model/demand";

const nodes = Array.from({ length: NODE_COUNT }, (_, id) => id);
const edges = nodes.flatMap((from) => nodes.slice(from + 1).map((to) => ({ id: `${from}-${to}`, from, to })));
const slots = Array.from({ length: TRAIL_LENGTH }, (_, slot) => slot);
const INITIAL_PLANE: Plane = "2d";
const initialRest = nodes.map((node) => positionFor(INITIAL_PLANE, node, dynamics[INITIAL_PLANE].rest));
// Forty keyboard steps span each plane's whole demand range.
const KEY_STEPS = 40;

const descriptions: Record<Plane, string> = {
  "1d":
    "Each node sits on its own ray, and its distance from the centre is its current state. Past a threshold the demanded node splits into alternating and then irregular states along its ray.",
  "2d":
    "Each node is a point in a shared circular plane around its place in the hexagon. Past a threshold the demanded node circles between alternating positions and then wanders across the disc.",
};

function ease(t: number) {
  return t * t * (3 - 2 * t);
}

function createFor(plane: Plane) {
  const { rest, base } = dynamics[plane];
  return createCoupledMap(Math.floor(Math.random() * 2 ** 32), rest, base, plane === "2d");
}

export default function LocalOptimum() {
  const id = useId();
  const [plane, setPlane] = useState<Plane>(INITIAL_PLANE);
  const [coupling, setCoupling] = useState(0.25);
  const [tempo, setTempo] = useState(8);
  const svgRef = useRef<SVGSVGElement>(null);
  const edgeRefs = useRef<(SVGLineElement | null)[]>([]);
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);
  const trailRefs = useRef<(SVGCircleElement | null)[]>([]);
  const mapRef = useRef<CoupledMap | null>(null);
  const previousRef = useRef<CoupledMap["state"]>([]);
  const heldRef = useRef(new Map<number, number | null>());
  const keyNodeRef = useRef<number | null>(null);
  const settingsRef = useRef({ plane, coupling, tempo });
  const trailsDirtyRef = useRef(true);

  useEffect(() => {
    settingsRef.current = { plane, coupling, tempo };
  }, [plane, coupling, tempo]);

  // A plane change restarts the system at rest: the two maps' parameters are
  // not on a shared scale, so demands cannot carry over.
  useEffect(() => {
    const map = createFor(plane);
    mapRef.current = map;
    previousRef.current = [...map.state];
    trailsDirtyRef.current = true;
  }, [plane]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = 0;
    let phase = 0;

    const drawTrails = (map: CoupledMap, plane: Plane) => {
      map.trail.forEach((trail, node) => {
        slots.forEach((slot) => {
          const dot = trailRefs.current[node * TRAIL_LENGTH + slot];
          if (!dot) return;
          const state = trail[trail.length - 1 - slot];
          if (!state) {
            dot.setAttribute("opacity", "0");
            return;
          }
          const { x, y } = positionFor(plane, node, state);
          dot.setAttribute("cx", x.toFixed(2));
          dot.setAttribute("cy", y.toFixed(2));
          dot.setAttribute("opacity", "0.4");
        });
      });
    };

    const draw = (map: CoupledMap, plane: Plane, alpha: number) => {
      const held = new Set(heldRef.current.values());
      if (keyNodeRef.current !== null) held.add(keyNodeRef.current);
      const t = ease(alpha);
      const points = map.state.map((state, node) => {
        const from = previousRef.current[node] ?? state;
        return positionFor(plane, node, { x: from.x + (state.x - from.x) * t, y: from.y + (state.y - from.y) * t });
      });
      points.forEach(({ x, y }, node) => {
        const dot = nodeRefs.current[node];
        if (!dot) return;
        dot.setAttribute("cx", x.toFixed(2));
        dot.setAttribute("cy", y.toFixed(2));
        dot.setAttribute("r", held.has(node) ? "4" : "2.5");
      });
      edges.forEach(({ from, to }, index) => {
        const line = edgeRefs.current[index];
        if (!line) return;
        line.setAttribute("x1", points[from].x.toFixed(2));
        line.setAttribute("y1", points[from].y.toFixed(2));
        line.setAttribute("x2", points[to].x.toFixed(2));
        line.setAttribute("y2", points[to].y.toFixed(2));
      });
    };

    const tick = (now: number) => {
      const map = mapRef.current;
      const { plane, coupling, tempo } = settingsRef.current;
      if (map) {
        const rate = reducedMotion.matches ? Math.min(tempo, 2) : tempo;
        // Clamp long frames so a stalled tab never replays a burst of iterations.
        phase += (Math.min(now - last, 250) / 1000) * rate;
        if (phase >= 1) {
          phase %= 1;
          previousRef.current = [...map.state];
          stepCoupledMap(map, coupling, dynamics[plane].map);
          trailsDirtyRef.current = true;
        }
        if (trailsDirtyRef.current) {
          drawTrails(map, plane);
          trailsDirtyRef.current = false;
        }
        draw(map, plane, reducedMotion.matches ? 1 : phase);
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const demand = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const map = mapRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !map || !matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const target = demandAt(settingsRef.current.plane, point.x, point.y);
    heldRef.current.set(event.pointerId, target?.node ?? null);
    if (target) map.parameter[target.node] = target.parameter;
  };

  const release = (event: PointerEvent<SVGSVGElement>) => {
    heldRef.current.delete(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const map = mapRef.current;
    if (!map) return;
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= NODE_COUNT) {
      keyNodeRef.current = digit - 1;
      event.preventDefault();
      return;
    }
    const direction = event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : event.key === "ArrowDown" || event.key === "ArrowLeft" ? -1 : 0;
    if (!direction) return;
    const node = keyNodeRef.current ?? 0;
    const { min, max } = dynamics[plane];
    keyNodeRef.current = node;
    map.parameter[node] = clampParameter(plane, map.parameter[node] + (direction * (max - min)) / KEY_STEPS);
    event.preventDefault();
  };

  return (
    <main className={styles.surface}>
      <svg
        ref={svgRef}
        className={styles.graph}
        viewBox="0 0 400 400"
        role="img"
        tabIndex={0}
        aria-labelledby={`${id}-title ${id}-description`}
        aria-keyshortcuts="1 2 3 4 5 6 ArrowUp ArrowDown"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          demand(event);
        }}
        onPointerMove={(event) => {
          if (heldRef.current.has(event.pointerId)) demand(event);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onKeyDown={onKeyDown}
        onBlur={() => {
          keyNodeRef.current = null;
        }}
      >
        <title id={`${id}-title`}>Local optimum</title>
        <desc id={`${id}-description`}>
          {`Six coupled nodes on a complete graph. Dragging a node outward demands more from it; dragging inward demands less. ${descriptions[plane]} Through the edges the other five begin to move as well. Keys 1 to 6 choose a node; arrow keys raise or lower its demand.`}
        </desc>
        <g fill="currentColor">
          {nodes.flatMap((node) =>
            slots.map((slot) => (
              <circle
                key={`${node}-${slot}`}
                ref={(element) => {
                  trailRefs.current[node * TRAIL_LENGTH + slot] = element;
                }}
                cx={initialRest[node].x} cy={initialRest[node].y} r="1.1" opacity="0"
              />
            )),
          )}
        </g>
        <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5">
          {edges.map(({ id: edgeId, from, to }, index) => (
            <line
              key={edgeId}
              ref={(element) => {
                edgeRefs.current[index] = element;
              }}
              x1={initialRest[from].x} y1={initialRest[from].y} x2={initialRest[to].x} y2={initialRest[to].y}
            />
          ))}
        </g>
        <g fill="currentColor">
          {nodes.map((node) => (
            <circle
              key={node}
              ref={(element) => {
                nodeRefs.current[node] = element;
              }}
              cx={initialRest[node].x} cy={initialRest[node].y} r="2.5"
            />
          ))}
        </g>
      </svg>
      <Controls id={id} plane={plane} setPlane={setPlane} coupling={coupling} setCoupling={setCoupling} tempo={tempo} setTempo={setTempo} />
    </main>
  );
}
