"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./foam.module.css";
import {
  blow,
  COARSENING_RANGE,
  createFoam,
  DEFAULT_PARAMETERS,
  feed,
  LIQUID_RANGE,
  meanArea,
  NUCLEATION_RANGE,
  raftArea,
  resizeFoam,
  stepFoam,
  type Foam,
  type FoamParameters,
} from "./model";
import { foamStatistics, sidesOf } from "./measure";
import { createFoamRenderer } from "./foam";

/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;
/** Foam time run before the first frame (coarse steps), so the page opens on a grown foam. */
const WARM_STEPS = 400;
const WARM_STEP = 1 / 20;
/** A held press blows this many mean bubble areas per second. */
const BLOW_RATE = 3;

type Held = { id: number };

export default function FoamNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const foamRef = useRef<Foam | null>(null);
  const heldRef = useRef<Held | null>(null);
  const parametersRef = useRef<FoamParameters>(DEFAULT_PARAMETERS);
  const [coarsening, setCoarsening] = useState(DEFAULT_PARAMETERS.coarsening);
  const [nucleation, setNucleation] = useState(DEFAULT_PARAMETERS.nucleation);
  const [liquid, setLiquid] = useState(DEFAULT_PARAMETERS.liquid);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    parametersRef.current = { coarsening, nucleation, liquid };
  }, [coarsening, nucleation, liquid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createFoamRenderer(canvas);
    if (!renderer) {
      console.warn("bubble/3 needs WebGL2.");
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = performance.now();
    let motionTime = 0;
    let sinceSummary = 2;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) return;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      renderer.resize(bounds.width, bounds.height, ratio);
      const foam = foamRef.current;
      if (!foam) {
        const fresh = createFoam(bounds.width, bounds.height);
        for (let step = 0; step < WARM_STEPS; step += 1) stepFoam(fresh, WARM_STEP, parametersRef.current);
        foamRef.current = fresh;
      } else {
        resizeFoam(foam, bounds.width, bounds.height);
      }
    };

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (now - previous < FRAME_INTERVAL) return;
      const delta = Math.min((now - previous) / 1_000, 1 / 15);
      previous = now;
      const foam = foamRef.current;
      if (!foam) return;
      const still = reduceMotion.matches;
      // Reduced motion: no coarsening, no new bubbles, films hold still;
      // the foam only settles around a bubble blown by hand.
      const parameters = still ? { ...parametersRef.current, coarsening: 0, nucleation: 0 } : parametersRef.current;
      const held = heldRef.current;
      if (held && !feed(foam, held.id, BLOW_RATE * meanArea(foam) * delta) && !foam.pending.some((entry) => entry.id === held.id)) {
        heldRef.current = null;
      }
      stepFoam(foam, delta, parameters);
      if (!still) motionTime += delta;
      renderer.render(foam, motionTime, foam.borderRadius);

      sinceSummary += delta;
      if (sinceSummary > 2) {
        sinceSummary = 0;
        const statistics = foamStatistics(foam);
        let largest = 0;
        for (let i = 1; i < foam.count; i += 1) if (foam.area[i]! > foam.area[largest]!) largest = i;
        setSummary(
          `A raft of ${statistics.count} bubbles; each is a node and each wall it shares is a link. ` +
            `The largest has ${sidesOf(foam, largest)} walls and fills ${Math.round((foam.area[largest]! / raftArea(foam)) * 100)}% of the raft. ` +
            `Gas passes through the walls from bubbles with fewer than six walls into those with more, so small bubbles feed the large ones and vanish; new small bubbles are blown in where walls meet. ` +
            `${statistics.filmContacts.toFixed(1)} of a bubble's walls are thin films at this wetness.`,
        );
      }
    };

    sizeCanvas();
    const observer = new ResizeObserver(sizeCanvas);
    observer.observe(canvas);
    frame = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, []);

  const startBlowing = (x: number, y: number) => {
    const foam = foamRef.current;
    if (!foam) return;
    heldRef.current = { id: blow(foam, x, y) };
  };

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
        aria-describedby="bubble-3-summary"
        aria-label="A raft of soap bubbles on black that is its own network: every bubble is a node and every wall two bubbles share is a link. Gas passes through the walls, seen as small portions budding from one bubble into its neighbour, so bubbles with more than six walls grow into large hubs and the small, few-walled bubbles crowded around them shrink until they vanish; walls shrink to a point and regrow the other way as neighbours swap; new small bubbles are blown in where three walls meet. Press and hold to blow a bubble in at that point; Enter or Space blows one in at the centre while held."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          startBlowing(point.x, point.y);
        }}
        onPointerUp={() => {
          heldRef.current = null;
        }}
        onPointerCancel={() => {
          heldRef.current = null;
        }}
        onKeyDown={(event) => {
          if ((event.key !== "Enter" && event.key !== " ") || event.repeat) return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          startBlowing(bounds.width / 2, bounds.height / 2);
        }}
        onKeyUp={(event) => {
          if (event.key === "Enter" || event.key === " ") heldRef.current = null;
        }}
      />
      <p id="bubble-3-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {optionsOpen && (
          <div id="bubble-3-options" className={styles.options}>
            <p className={styles.hint}>기체는 벽이 적은 거품에서 많은 거품으로 건너감 · 누르는 동안 거품을 불어넣음</p>
            <label className={styles.balance}>
              <span>천천히</span>
              <input
                aria-label="기체가 벽을 건너는 빠르기: 벽이 많은 거품이 자라고 적은 거품이 줄어드는 속도"
                aria-valuetext={`κ ${coarsening.toFixed(3)}`}
                max={COARSENING_RANGE[1]}
                min={COARSENING_RANGE[0]}
                step="0.005"
                type="range"
                value={coarsening}
                onChange={(event) => setCoarsening(Number(event.target.value))}
              />
              <span>빠르게</span>
            </label>
            <label className={styles.balance}>
              <span>새 거품 없음</span>
              <input
                aria-label="벽이 만나는 곳에 새 거품이 생기는 빈도"
                aria-valuetext={`${nucleation.toFixed(0)}`}
                max={NUCLEATION_RANGE[1]}
                min={NUCLEATION_RANGE[0]}
                step="1"
                type="range"
                value={nucleation}
                onChange={(event) => setNucleation(Number(event.target.value))}
              />
              <span>많이</span>
            </label>
            <label className={styles.balance}>
              <span>마른 거품</span>
              <input
                aria-label="액체 비율: 높을수록 벽이 끊기고 거품이 둥글어짐"
                aria-valuetext={`액체 ${(liquid * 100).toFixed(1)}%`}
                max={LIQUID_RANGE[1]}
                min={LIQUID_RANGE[0]}
                step="0.002"
                type="range"
                value={liquid}
                onChange={(event) => setLiquid(Number(event.target.value))}
              />
              <span>젖은 거품</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.button} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="bubble-3-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
