"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./potts-foam.module.css";
import { createFoamRenderer, type FoamStep } from "./foam";
import {
  COVERAGE,
  DEFAULT_FOAM,
  DEFAULT_NUCLEATION,
  DIFFUSION_RANGE,
  NUCLEATION_RANGE,
  seedFoam,
  SITES_PER_SEED,
  TEMPERATURE_RANGE,
  type FoamParameters,
} from "./potts";

/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;
const LONGEST_STEP = 1 / 30;
/** A blow request is offered for this many frames (its slot may be taken in the first). */
const REQUEST_FRAMES = 10;
/** With reduced motion the foam holds still, and moves for this long after a tap. */
const TAP_MOTION_MS = 2_500;
const DEFAULT_WET = 0.35;
const SUMMARY_MS = 1_000;

type Pending = { x: number; y: number; nucleus: boolean; serial: number; frames: number };

export default function BubblePottsFoam() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parametersRef = useRef<FoamParameters>(DEFAULT_FOAM);
  const nucleationRef = useRef(DEFAULT_NUCLEATION);
  const wetRef = useRef(DEFAULT_WET);
  const pendingRef = useRef<Pending | null>(null);
  const serialRef = useRef(0);
  const motionUntilRef = useRef(0);
  const [temperature, setTemperature] = useState(DEFAULT_FOAM.temperature);
  const [diffusion, setDiffusion] = useState(DEFAULT_FOAM.diffusion);
  const [nucleation, setNucleation] = useState(DEFAULT_NUCLEATION);
  const [wet, setWet] = useState(DEFAULT_WET);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    parametersRef.current = { ...DEFAULT_FOAM, temperature, diffusion };
    nucleationRef.current = nucleation;
    wetRef.current = wet;
  }, [temperature, diffusion, nucleation, wet]);

  const blow = (x: number, y: number, nucleus: boolean) => {
    serialRef.current += 1;
    pendingRef.current = { x, y, nucleus, serial: serialRef.current, frames: REQUEST_FRAMES };
    motionUntilRef.current = performance.now() + TAP_MOTION_MS;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createFoamRenderer(canvas);
    if (!renderer) {
      console.warn("bubble/5 needs WebGL2 with float render targets and float blending.");
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Presentation randomness: the first foam and where nuclei appear.
    let randomState = 0x2545f491;
    const random = () => {
      randomState ^= randomState << 13;
      randomState ^= randomState >>> 17;
      randomState ^= randomState << 5;
      randomState >>>= 0;
      return randomState / 4_294_967_296;
    };
    let field = { width: 1, height: 1 };
    let frame = 0;
    let previous = performance.now();
    let lastSummary = 0;
    let dirty = true;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      field = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      renderer.resize(field.width, field.height, ratio, (width, height) =>
        seedFoam(width, height, Math.max(8, Math.round((width * height) / SITES_PER_SEED)), random),
      );
      dirty = true;
    };

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (now - previous < FRAME_INTERVAL) return;
      const seconds = Math.min((now - previous) / 1_000, LONGEST_STEP);
      previous = now;
      const moving = !reduceMotion.matches || now < motionUntilRef.current;
      if (moving) {
        // Nucleation: a Poisson process over the screen's area.
        const expected = (nucleationRef.current * field.width * field.height * seconds) / 1_000_000;
        if (!pendingRef.current && random() < expected) {
          serialRef.current += 1;
          // Somewhere on the raft (its gas fills a round area of COVERAGE of the screen).
          const angle = random() * Math.PI * 2;
          const reach = Math.sqrt(random()) * 0.85 * Math.sqrt((COVERAGE * field.width * field.height) / Math.PI);
          pendingRef.current = {
            x: field.width / 2 + reach * Math.cos(angle),
            y: field.height / 2 + reach * Math.sin(angle),
            nucleus: true,
            serial: serialRef.current,
            frames: REQUEST_FRAMES,
          };
        }
        const pending = pendingRef.current;
        const step: FoamStep = {
          seconds,
          parameters: parametersRef.current,
          wet: wetRef.current,
          request: pending ? { x: pending.x, y: pending.y, nucleus: pending.nucleus, serial: pending.serial } : null,
        };
        renderer.step(step);
        if (pending) {
          pending.frames -= 1;
          if (pending.frames <= 0) pendingRef.current = null;
        }
        dirty = true;
      }
      if (dirty) {
        renderer.draw(wetRef.current);
        dirty = false;
      }
      if (now - lastSummary > SUMMARY_MS) {
        lastSummary = now;
        const counts = renderer.counts();
        if (counts && counts.bubbles > 0) {
          setSummary(
            `${counts.bubbles} bubbles float as one raft. Gas seeps through every wall from the smaller bubble into the larger, so small bubbles shrink and vanish while large ones grow and divide; a bubble by area is typically ${(counts.areaSquared / Math.max(counts.area, 1) / (counts.area / counts.bubbles)).toFixed(1)} times the average.`,
          );
        }
      }
    };

    sizeCanvas();
    const observer = new ResizeObserver(sizeCanvas);
    observer.observe(canvas);
    const redraw = () => {
      dirty = true;
    };
    reduceMotion.addEventListener("change", redraw);
    frame = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      reduceMotion.removeEventListener("change", redraw);
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, []);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="bubble-potts-summary"
        aria-label="A foam computed cell by cell on the screen. Every bubble presses on its neighbours, and gas seeps through each wall from the bubble at higher pressure, the smaller one, into the larger: small bubbles shrink and vanish, large ones grow and divide, and walls swap as they do. The walls between bubbles are the network. Tap to blow a new bubble; press Enter to blow one in the middle."
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          blow(event.clientX - bounds.left, event.clientY - bounds.top, false);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          blow(bounds.width / 2, bounds.height / 2, false);
        }}
      />
      <p id="bubble-potts-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {optionsOpen && (
          <div id="bubble-potts-options" className={styles.options}>
            <p className={styles.hint}>기체는 벽을 지나 작은 거품에서 큰 거품으로 · 누르면 거품을 불어 넣기</p>
            <label className={styles.balance}>
              <span>잔잔</span>
              <input
                aria-label="벽이 들썩이는 정도"
                aria-valuetext={`온도 ${temperature.toFixed(1)}`}
                max={TEMPERATURE_RANGE[1]}
                min={TEMPERATURE_RANGE[0]}
                step="0.1"
                type="range"
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
              />
              <span>들썩</span>
            </label>
            <label className={styles.balance}>
              <span>느리게</span>
              <input
                aria-label="기체가 벽을 지나는 빠르기"
                aria-valuetext={`확산 ${diffusion.toFixed(2)}`}
                max={DIFFUSION_RANGE[1]}
                min={DIFFUSION_RANGE[0]}
                step="0.05"
                type="range"
                value={diffusion}
                onChange={(event) => setDiffusion(Number(event.target.value))}
              />
              <span>빠르게</span>
            </label>
            <label className={styles.balance}>
              <span>새 거품 없음</span>
              <input
                aria-label="새 거품이 저절로 생기는 빈도"
                aria-valuetext={`백만 제곱픽셀마다 초당 ${nucleation.toFixed(1)}개`}
                max={NUCLEATION_RANGE[1]}
                min={NUCLEATION_RANGE[0]}
                step="0.1"
                type="range"
                value={nucleation}
                onChange={(event) => setNucleation(Number(event.target.value))}
              />
              <span>많이</span>
            </label>
            <label className={styles.balance}>
              <span>마른</span>
              <input
                aria-label="거품 사이 액체의 양"
                aria-valuetext={`젖음 ${Math.round(wet * 100)}%`}
                max="1"
                min="0"
                step="0.01"
                type="range"
                value={wet}
                onChange={(event) => setWet(Number(event.target.value))}
              />
              <span>젖은</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.button} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="bubble-potts-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
