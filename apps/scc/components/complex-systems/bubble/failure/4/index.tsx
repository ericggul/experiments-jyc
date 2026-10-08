"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./packed-foam.module.css";
import { createFoamRenderer } from "./foam";
import { DEFAULT_TARGET, TARGET_RANGE } from "./network";
import { createScene, fillRenderer, growBeside, RENDER_CAPACITY, resizeScene, type Scene, stepScene, summarise, tapScene } from "./scene";

/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;
const DRAG_THRESHOLD = 6;
/** Seconds the film takes to forget (its memory) when memory is on. */
const FILM_MEMORY = 7;
const DEFAULT_LIQUID = 0.08;

type Settings = { liquid: number; memory: boolean; traffic: boolean; target: number };

export default function PackedFoam() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const pressRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [liquid, setLiquid] = useState(DEFAULT_LIQUID);
  const [memory, setMemory] = useState(true);
  const [traffic, setTraffic] = useState(true);
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const settingsRef = useRef<Settings>({ liquid: DEFAULT_LIQUID, memory: true, traffic: true, target: DEFAULT_TARGET });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    settingsRef.current = { liquid, memory, traffic, target };
  }, [liquid, memory, traffic, target]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createFoamRenderer(canvas, RENDER_CAPACITY);
    if (!renderer) {
      console.warn("bubble/4 needs WebGL2 with float render targets.");
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = performance.now();
    let sinceSummary = 2;
    let filmTime = 0;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      renderer.resize(width, height, Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
      if (!sceneRef.current) sceneRef.current = createScene(width, height, settingsRef.current.target);
      else resizeScene(sceneRef.current, width, height);
    };

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (now - previous < FRAME_INTERVAL) return;
      const delta = Math.min((now - previous) / 1_000, 1 / 15);
      previous = now;
      const scene = sceneRef.current;
      if (!scene) return;
      const still = reduceMotion.matches;
      const settings = settingsRef.current;
      stepScene(scene, delta, { target: settings.target, volatility: 1, traffic: settings.traffic }, still);
      const slotsChanged = fillRenderer(scene, renderer.bubbles, renderer.slots);
      if (!still) filmTime += delta;
      renderer.render({
        count: scene.count,
        time: filmTime,
        seconds: still ? 0 : delta,
        memory: settings.memory ? FILM_MEMORY : 0,
        liquid: settings.liquid,
        traffic: settings.traffic ? 1 : 0,
        slotsChanged,
      });
      sinceSummary += delta;
      if (sinceSummary > 2) {
        sinceSummary = 0;
        setSummary(summarise(scene));
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
        aria-describedby="packed-foam-summary"
        aria-label="A planar network packed as a soap foam. Every bubble is a node and every wall between two bubbles is a link, so a bubble with many links is large among small neighbours. Traffic along the links thins the walls it crosses; a wall that drains bursts and its two bubbles merge, small bubbles vanish, walls swap, and new bubbles are born where three meet. The films remember how they were stirred. Tap the middle of a bubble to show its links; tap near where walls meet to add a bubble there. Press N to add a bubble beside the focused one, Escape to clear focus."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          pressRef.current = { ...point, moved: false };
        }}
        onPointerMove={(event) => {
          const press = pressRef.current;
          if (!press || (event.buttons & 1) === 0) return;
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          if (Math.hypot(point.x - press.x, point.y - press.y) >= DRAG_THRESHOLD) press.moved = true;
        }}
        onPointerUp={(event) => {
          const press = pressRef.current;
          pressRef.current = null;
          const scene = sceneRef.current;
          if (!press || press.moved || !scene) return;
          const point = pointFor(event.currentTarget, event.clientX, event.clientY);
          tapScene(scene, point.x, point.y);
        }}
        onPointerCancel={() => {
          pressRef.current = null;
        }}
        onKeyDown={(event) => {
          const scene = sceneRef.current;
          if (!scene) return;
          if (event.key === "Escape") scene.focus = null;
          if (event.key === "n" || event.key === "N") growBeside(scene);
        }}
      />
      <p id="packed-foam-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {optionsOpen && (
          <div id="packed-foam-options" className={styles.options}>
            <p className={styles.hint}>벽 하나가 링크 하나 · 거품 가운데를 누르면 그 링크들, 벽이 만나는 곳을 누르면 새 거품</p>
            <div className={styles.toggles} role="group" aria-label="막">
              <button type="button" className={styles.button} aria-pressed={memory} onClick={() => setMemory((on) => !on)}>
                막의 기억
              </button>
              <button type="button" className={styles.button} aria-pressed={traffic} onClick={() => setTraffic((on) => !on)}>
                흐름
              </button>
            </div>
            <label className={styles.balance}>
              <span>마른</span>
              <input
                aria-label="거품 속 액체의 양"
                aria-valuetext={`액체 ${Math.round(liquid * 100)}%`}
                max="1"
                min="0"
                step="0.01"
                type="range"
                value={liquid}
                onChange={(event) => setLiquid(Number(event.target.value))}
              />
              <span>젖은</span>
            </label>
            <label className={styles.balance}>
              <span>거품</span>
              <input
                aria-label="거품 수; 태어나고 사라지며 천천히 맞춰집니다"
                aria-valuetext={`거품 약 ${target}개`}
                max={TARGET_RANGE[1]}
                min={TARGET_RANGE[0]}
                step="10"
                type="range"
                value={target}
                onChange={(event) => setTarget(Number(event.target.value))}
              />
              <span className={styles.count}>{target}</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.button} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="packed-foam-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
