"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { EyeRatios } from "./model/gaze";
import { createLiquidRenderer } from "./liquid-renderer";
import { createSpacetimeRenderer } from "./spacetime-renderer";
import styles from "./screen.module.css";

const MAX_PIXELS = 1_600_000;
const MIN_CAPTURE_INTERVAL = 450;

export default function InterfaceSurface({ gazeRef, mode, radius, strength, showGrid = false }: {
  gazeRef: RefObject<EyeRatios>;
  mode: "liquid" | "spacetime";
  radius: number;
  strength: number;
  showGrid?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const radiusRef = useRef(radius);
  const strengthRef = useRef(strength);
  const showGridRef = useRef(showGrid);
  radiusRef.current = radius;
  strengthRef.current = strength;
  showGridRef.current = showGrid;

  useEffect(() => {
    const canvas = canvasRef.current;
    const clone = document.querySelector<HTMLElement>("[data-gaze-clone]");
    if (!canvas || !clone) return;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    let renderer: ReturnType<typeof createLiquidRenderer> | ReturnType<typeof createSpacetimeRenderer>;
    try {
      renderer = mode === "spacetime" ? createSpacetimeRenderer(gl) : createLiquidRenderer(gl);
    } catch (error) {
      console.error("Gaze interface shader could not start", error);
      return;
    }

    let active = true;
    let ready = false;
    let capturing = false;
    let pending = false;
    let captureTimer: ReturnType<typeof setTimeout> | null = null;
    let frame = 0;
    let lastFrame = 0;
    let lastCapture = -MIN_CAPTURE_INTERVAL;
    let scale = 1;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      scale = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(MAX_PIXELS / (width * height)));
      renderer.resize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
      ready = false;
      canvas.style.visibility = "hidden";
      requestCapture();
    };

    const capture = async () => {
      if (!active || capturing || document.hidden) {
        pending = true;
        return;
      }
      capturing = true;
      lastCapture = performance.now();
      try {
        const html2canvas = (await import("html2canvas")).default;
        const snapshot = await html2canvas(document.body, {
          backgroundColor: "#fff",
          width: window.innerWidth,
          height: window.innerHeight,
          x: window.scrollX,
          y: window.scrollY,
          scale,
          logging: false,
          useCORS: true,
          ignoreElements: (element) => element.hasAttribute("data-gaze-overlay") || element.hasAttribute("data-gaze-liquid"),
        });
        if (!active) return;
        renderer.updateTexture(snapshot);
        ready = true;
        canvas.style.visibility = "visible";
      } catch (error) {
        canvas.style.visibility = "hidden";
        console.error("Interface capture could not update", error);
      } finally {
        capturing = false;
        if (pending && active) {
          pending = false;
          requestCapture();
        }
      }
    };

    function requestCapture() {
      if (!active) return;
      if (capturing) {
        pending = true;
        return;
      }
      if (captureTimer !== null) return;
      const wait = Math.max(0, MIN_CAPTURE_INTERVAL - (performance.now() - lastCapture));
      captureTimer = setTimeout(() => {
        captureTimer = null;
        void capture();
      }, wait);
    }

    const observer = new MutationObserver(requestCapture);
    observer.observe(clone, { attributes: true, childList: true, characterData: true, subtree: true });
    const onVisibility = () => { if (!document.hidden) requestCapture(); };
    const draw = (now: number) => {
      if (!active) return;
      if (ready && !document.hidden && now - lastFrame >= (mode === "spacetime" ? 40 : 32)) {
        lastFrame = now;
        renderer.draw(reducedMotion.matches ? 0 : now * 0.001, gazeRef.current, radiusRef.current * scale, strengthRef.current / 50, showGridRef.current);
      }
      frame = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    document.addEventListener("scroll", requestCapture, true);
    document.addEventListener("load", requestCapture, true);
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    frame = requestAnimationFrame(draw);

    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("scroll", requestCapture, true);
      document.removeEventListener("load", requestCapture, true);
      document.removeEventListener("visibilitychange", onVisibility);
      if (captureTimer !== null) clearTimeout(captureTimer);
      cancelAnimationFrame(frame);
      renderer.destroy();
    };
  }, [gazeRef, mode]);

  return <canvas ref={canvasRef} className={styles.effectCanvas} style={{ visibility: "hidden" }} data-gaze-liquid aria-hidden="true" />;
}
