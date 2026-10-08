"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./bubble-cluster.module.css";
import { BUBBLE_FLOATS, createLaceRenderer, MAX_BUBBLES } from "./lace";
import { relaxBodies, type Body, type Pair } from "./layout";
import {
  createFoam,
  DAMPING_RANGE,
  DEFAULT_BUBBLES,
  DEFAULT_DAMPING,
  DEFAULT_PARAMETERS,
  FLOOR_RANGE,
  GROWTH_RANGE,
  largest,
  nucleate,
  POPULATION_RANGE,
  POUR_SECONDS,
  RUPTURE_SECONDS,
  setDamping,
  stepFoam,
  type Foam,
} from "./model";

/** The packing's bound as a share of the screen's short side (it only gives the first places). */
const RAFT = 0.47;
/** Share of the screen all bubbles cover together; a bubble's area is its share of the gas. */
const AREA = 0.34;
const MIN_RADIUS = 2.2;
/** Plateau-border radius (CSS px). */
const WET = 5.5;
/** Bubbles are drawn this much larger than their rest size, so neighbours press into walls. */
const PRESS = 0.14;
/** A newborn bubble inflates over this many seconds. */
const INFLATE_SECONDS = 1.8;
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;
const UNDERNEATH = 140;

function hash(value: number) {
  const s = Math.sin(value * 12.9898 + 4.1414) * 43_758.5453;
  return s - Math.floor(s);
}

function smooth(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

/** A foam's bubbles laid out and relaxed physically along its links (index = node − 1). */
type Raft = { bodies: Body[]; shown: { x: number; y: number }[]; radii: number[]; pending: { value: number } };

export default function ApollonianRaft() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const foamRef = useRef<Foam | null>(null);
  const parametersRef = useRef(DEFAULT_PARAMETERS);
  const tapRef = useRef<{ x: number; y: number } | null>(null);
  const restartRef = useRef<number | null>(null);
  const [growth, setGrowth] = useState(DEFAULT_PARAMETERS.growth);
  const [floor, setFloor] = useState(DEFAULT_PARAMETERS.floor);
  const [damping, setDampingValue] = useState(DEFAULT_DAMPING);
  const [population, setPopulation] = useState(DEFAULT_BUBBLES);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    parametersRef.current = { ...parametersRef.current, growth, floor, population };
  }, [growth, floor, population]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const lace = createLaceRenderer(canvas);
    if (!lace) {
      console.warn("bubble/2 needs WebGL2 with float render targets.");
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let foam = createFoam(DEFAULT_BUBBLES);
    foamRef.current = foam;
    // A larger, older foam lies below the raft, seen only through it.
    const underneath = createFoam(UNDERNEATH, 0x6b43a9d1);
    let frame = { width: 1, height: 1 };
    let time = 0;
    let previous = performance.now();
    let sinceSummary = 2;
    let animation = 0;

    /** Bodies start where the packing put them, then relax physically. */
    const settle = (of: Foam, spread: number, offset: { x: number; y: number }): Raft => {
      const bodies: Body[] = [];
      for (let node = 1; node < of.size; node += 1) {
        bodies.push({ x: frame.width / 2 + offset.x + of.x[node]! * spread, y: frame.height / 2 + offset.y + of.z[node]! * spread, vx: 0, vy: 0 });
      }
      return { bodies, shown: bodies.map((body) => ({ x: body.x, y: body.y })), radii: bodies.map(() => 0), pending: { value: 0 } };
    };
    let raft: Raft = { bodies: [], shown: [], radii: [], pending: { value: 0 } };
    let deep: Raft = { bodies: [], shown: [], radii: [], pending: { value: 0 } };
    const deepFrame = () => ({ width: frame.width * 1.8, height: frame.height * 1.8 });

    /** Steps a foam, keeps its bodies in step with births and removals, and relaxes them. */
    const advance = (of: Foam, state: Raft, seconds: number, parameters: typeof DEFAULT_PARAMETERS, area: number, layoutFrame: { width: number; height: number }, delta: number) => {
      const events = stepFoam(of, seconds, parameters, state.pending);
      for (const event of events) {
        if (event.kind === "birth") {
          // A newborn appears where the bubbles it touches meet.
          let x = 0;
          let y = 0;
          let n = 0;
          for (const other of of.links[event.bubble]!) {
            const body = other > 0 ? state.bodies[other - 1] : undefined;
            if (!body) continue;
            x += body.x;
            y += body.y;
            n += 1;
          }
          const body = n > 0 ? { x: x / n, y: y / n, vx: 0, vy: 0 } : { x: frame.width / 2, y: frame.height / 2, vx: 0, vy: 0 };
          state.bodies[event.bubble - 1] = body;
          state.shown[event.bubble - 1] = { x: body.x, y: body.y };
          state.radii[event.bubble - 1] = 0;
        } else if (event.kind === "remove") {
          if (event.bubble !== event.moved) {
            state.bodies[event.bubble - 1] = state.bodies[event.moved - 1]!;
            state.shown[event.bubble - 1] = state.shown[event.moved - 1]!;
            state.radii[event.bubble - 1] = state.radii[event.moved - 1]!;
          }
          state.bodies.length = of.size - 1;
          state.shown.length = of.size - 1;
          state.radii.length = of.size - 1;
        }
      }
      // Radii follow each bubble's gas; the raft relaxes along its links.
      const grow = 1 - Math.exp(-3 * delta);
      const pairs: Pair[] = [];
      for (let node = 1; node < of.size; node += 1) {
        const slot = node - 1;
        let target = Math.max(MIN_RADIUS, Math.sqrt((of.volume[node]! * area * frame.width * frame.height) / Math.PI));
        target *= smooth(of.age[node]! / INFLATE_SECONDS);
        if (of.into[node]! >= 0) target *= 1 - smooth((of.merging[node]! - RUPTURE_SECONDS) / POUR_SECONDS);
        state.radii[slot] = (state.radii[slot] ?? 0) + (target - (state.radii[slot] ?? 0)) * grow;
        for (const other of of.links[node]!) if (other > node) pairs.push({ from: slot, to: other - 1 });
      }
      relaxBodies(state.bodies, pairs, state.radii, layoutFrame, seconds > 0 ? delta : 0);
      const follow = 1 - Math.exp(-4 * delta);
      for (let index = 0; index < state.bodies.length; index += 1) {
        const point = state.shown[index]!;
        point.x += (state.bodies[index]!.x - point.x) * follow;
        point.y += (state.bodies[index]!.y - point.y) * follow;
      }
    };

    const write = (of: Foam, state: Raft, target: Float32Array, salt: number, offset: { x: number; y: number }) => {
      let count = 0;
      for (let node = 1; node < of.size && count < MAX_BUBBLES; node += 1) {
        // Bubbles press into their neighbours, so they meet in walls rather than at points.
        const radius = (state.radii[node - 1] ?? 0) * (1 + PRESS);
        if (radius < 0.3) continue;
        const at = count * BUBBLE_FLOATS;
        target[at] = state.shown[node - 1]!.x + offset.x;
        target[at + 1] = state.shown[node - 1]!.y + offset.y;
        target[at + 2] = radius;
        target[at + 3] = hash(of.identity[node]! + salt);
        count += 1;
      }
      return count;
    };

    const size = () => {
      const bounds = canvas.getBoundingClientRect();
      frame = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
      lace.resize(frame.width, frame.height, Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
      if (raft.bodies.length === 0) {
        raft = settle(foam, RAFT * Math.min(frame.width, frame.height), { x: 0, y: 0 });
        // Laid out on a field 1.8 times the screen, centred on that field.
        deep = settle(underneath, RAFT * Math.min(frame.width, frame.height) * 1.6, { x: frame.width * 0.4, y: frame.height * 0.4 });
      }
    };

    const render = (now: number) => {
      animation = requestAnimationFrame(render);
      if (now - previous < FRAME_INTERVAL) return;
      const delta = Math.min((now - previous) / 1_000, 1 / 15);
      previous = now;
      const still = reduceMotion.matches;
      const tempo = still ? 0.25 : 1;
      if (!still) time += delta;

      if (restartRef.current !== null) {
        const fresh = createFoam(restartRef.current);
        setDamping(fresh, foam.damping);
        foam = fresh;
        foamRef.current = foam;
        restartRef.current = null;
        raft = settle(foam, RAFT * Math.min(frame.width, frame.height), { x: 0, y: 0 });
      }
      const tap = tapRef.current;
      if (tap) {
        tapRef.current = null;
        // A bubble nucleates in a junction of the bubble nearest the tap.
        let nearest = -1;
        let best = Infinity;
        raft.bodies.forEach((body, index) => {
          const d = Math.hypot(body.x - tap.x, body.y - tap.y);
          if (d < best) {
            best = d;
            nearest = index + 1;
          }
        });
        for (let face = 0; face < foam.cells.length / 3 && nearest > 0; face += 1) {
          if (!foam.cells.slice(face * 3, face * 3 + 3).includes(nearest)) continue;
          const born = nucleate(foam, face, Math.random());
          if (born !== null) {
            raft.bodies[born - 1] = { x: tap.x, y: tap.y, vx: 0, vy: 0 };
            raft.shown[born - 1] = { x: tap.x, y: tap.y };
            raft.radii[born - 1] = 0;
            break;
          }
        }
      }

      advance(foam, raft, delta * tempo, parametersRef.current, AREA, frame, delta);
      advance(underneath, deep, delta * tempo * 0.4, { ...parametersRef.current, population: UNDERNEATH }, AREA * 3, deepFrame(), delta);

      const count = write(foam, raft, lace.bubbles, 0, { x: 0, y: 0 });
      // The foam below is laid out on a larger field, centred under the raft.
      const below = write(underneath, deep, lace.below, 977, { x: -(deepFrame().width - frame.width) / 2, y: -(deepFrame().height - frame.height) / 2 });
      lace.render(count, below, time, WET);

      sinceSummary += delta;
      if (sinceSummary > 2) {
        sinceSummary = 0;
        const top = largest(foam);
        setSummary(`${foam.size - 1} bubbles. The largest touches ${foam.links[top]!.length} others and holds ${(foam.volume[top]! * 100).toFixed(1)}% of the gas.`);
      }
    };

    size();
    const observer = new ResizeObserver(size);
    observer.observe(canvas);
    animation = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animation);
      lace.dispose();
    };
  }, []);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="apollonian-raft-summary"
        aria-label="A raft of soap bubbles whose contacts grow as a random Apollonian network: each new bubble nucleates where three bubbles meet and touches those three. Gas flows through the walls toward larger neighbours, so bubbles that gather links grow; old bubbles coalesce into their largest neighbour. Tap to nucleate a bubble beside the nearest bubble; press N to nucleate one beside the largest."
        onPointerUp={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          tapRef.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
        }}
        onKeyDown={(event) => {
          if (event.key !== "n" && event.key !== "N") return;
          const foam = foamRef.current;
          if (!foam) return;
          const hub = largest(foam);
          for (let face = 0; face < foam.cells.length / 3; face += 1) {
            if (foam.cells.slice(face * 3, face * 3 + 3).includes(hub) && nucleate(foam, face, Math.random()) !== null) break;
          }
        }}
      />
      <p id="apollonian-raft-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>
      <div className={styles.controls}>
        {optionsOpen && (
          <div id="apollonian-raft-options" className={styles.options}>
            <p className={styles.hint}>세 버블이 만나는 곳에서 새 버블이 태어남 · 탭하면 그 곁에 기포</p>
            <label className={styles.balance}>
              <span>탄생 없음</span>
              <input
                aria-label="새 버블이 생기는 속도"
                aria-valuetext={`초당 ${growth.toFixed(1)}개`}
                max={GROWTH_RANGE[1]}
                min={GROWTH_RANGE[0]}
                step="0.05"
                type="range"
                value={growth}
                onChange={(event) => setGrowth(Number(event.target.value))}
              />
              <span>많이</span>
            </label>
            <label className={styles.balance}>
              <span>고르게</span>
              <input
                aria-label="기체가 큰 버블로 쏠리는 정도"
                max="1"
                min="0"
                step="0.01"
                type="range"
                value={1 - Math.log(floor / FLOOR_RANGE[0]) / Math.log(FLOOR_RANGE[1] / FLOOR_RANGE[0])}
                onChange={(event) => setFloor(FLOOR_RANGE[0] * (FLOOR_RANGE[1] / FLOOR_RANGE[0]) ** (1 - Number(event.target.value)))}
              />
              <span>쏠리게</span>
            </label>
            <label className={styles.balance}>
              <span>재공급</span>
              <input
                aria-label="기체가 링크를 따라 흐르는 비율 d"
                aria-valuetext={`d ${damping.toFixed(2)}`}
                max={DAMPING_RANGE[1]}
                min={DAMPING_RANGE[0]}
                step="0.01"
                type="range"
                value={damping}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDampingValue(value);
                  if (foamRef.current) setDamping(foamRef.current, value);
                }}
              />
              <span>링크만</span>
            </label>
            <label className={styles.balance}>
              <span>버블</span>
              <input
                aria-label="버블 수; 바꾸면 처음부터 다시 자람"
                aria-valuetext={`버블 ${population}개`}
                max={POPULATION_RANGE[1]}
                min={POPULATION_RANGE[0]}
                step="10"
                type="range"
                value={population}
                onChange={(event) => {
                  const count = Number(event.target.value);
                  setPopulation(count);
                  restartRef.current = count;
                }}
              />
              <span className={styles.count}>{population}</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.button} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="apollonian-raft-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
