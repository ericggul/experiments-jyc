"use client";

import { useEffect, useRef, useState } from "react";
import { applyContactChanges, type Contact } from "./model/contacts";
import styles from "./screen.module.css";

const maximumPixelRatio = 1.5;
const pulseDuration = 1600;

export default function MobileFingerNetworkOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const diagnosticRef = useRef<HTMLOutputElement>(null);
  const [hasFingers, setHasFingers] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;

    const touchFingers = new Map<number, Contact>();
    const pointerFingers = new Map<number, Contact>();
    const useTouchEvents = "ontouchstart" in window;
    const debugEnabled = new URLSearchParams(window.location.search).has("touch-debug");
    const diagnostic = debugEnabled ? diagnosticRef.current : null;
    if (debugEnabled) setShowDiagnostic(true);
    let highestTouchCount = 0;
    let cancellationCount = 0;
    let lastInput = "waiting";
    const updateDiagnostic = () => {
      if (!diagnostic) return;
      diagnostic.textContent = [
        `reported maxTouchPoints: ${navigator.maxTouchPoints}`,
        `highest reported: ${highestTouchCount}`,
        `active: ${touchFingers.size + pointerFingers.size}`,
        `touchcancel: ${cancellationCount}`,
        `last: ${lastInput}`,
      ].join("\n");
    };
    updateDiagnostic();
    let width = 1;
    let height = 1;
    let frame: number | null = null;

    const paint = (time: number) => {
      frame = null;
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);

      const points = [...touchFingers.values(), ...pointerFingers.values()];
      context.strokeStyle = "rgba(255, 255, 255, 0.85)";
      context.lineWidth = 1;
      context.beginPath();
      for (let first = 0; first < points.length; first += 1) {
        for (let second = first + 1; second < points.length; second += 1) {
          context.moveTo(points[first]!.x, points[first]!.y);
          context.lineTo(points[second]!.x, points[second]!.y);
        }
      }
      context.stroke();

      for (const point of points) {
        const phase = (time % pulseDuration) / pulseDuration;
        context.beginPath();
        context.arc(point.x, point.y, 9 + phase * 26, 0, Math.PI * 2);
        context.strokeStyle = `rgba(255, 255, 255, ${0.55 * (1 - phase)})`;
        context.stroke();

        context.beginPath();
        context.arc(point.x, point.y, 8, 0, Math.PI * 2);
        context.strokeStyle = "rgba(255, 255, 255, 0.72)";
        context.stroke();

        context.beginPath();
        context.arc(point.x, point.y, 3, 0, Math.PI * 2);
        context.fillStyle = "#fff";
        context.fill();
      }

      if (touchFingers.size + pointerFingers.size > 0) frame = window.requestAnimationFrame(paint);
    };

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(paint);
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      schedule();
    };

    const position = (clientX: number, clientY: number, bounds: DOMRect): Contact => {
      return {
        x: Math.max(0, Math.min(width, clientX - bounds.left)),
        y: Math.max(0, Math.min(height, clientY - bounds.top)),
      };
    };

    const syncTouches = (event: TouchEvent) => {
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      const changes = Array.from(event.changedTouches, (touch) => ({
        identifier: touch.identifier,
        ...position(touch.clientX, touch.clientY, bounds),
      }));
      applyContactChanges(touchFingers, event.type as "touchstart" | "touchmove" | "touchend" | "touchcancel", changes);
      highestTouchCount = Math.max(highestTouchCount, event.touches.length);
      if (event.type === "touchcancel") cancellationCount += 1;
      lastInput = `${event.type}: touches ${event.touches.length}, changed ${event.changedTouches.length}`;
      updateDiagnostic();
      setHasFingers(touchFingers.size + pointerFingers.size > 0);
      schedule();
    };

    const onDown = (event: PointerEvent) => {
      if (useTouchEvents && event.pointerType === "touch") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const bounds = canvas.getBoundingClientRect();
      pointerFingers.set(event.pointerId, position(event.clientX, event.clientY, bounds));
      lastInput = `${event.type}: ${event.pointerType}`;
      updateDiagnostic();
      setHasFingers(true);
      schedule();
    };

    const onMove = (event: PointerEvent) => {
      if (!pointerFingers.has(event.pointerId)) return;
      const bounds = canvas.getBoundingClientRect();
      pointerFingers.set(event.pointerId, position(event.clientX, event.clientY, bounds));
      if (diagnostic) {
        lastInput = `${event.type}: ${event.pointerType}`;
        updateDiagnostic();
      }
      schedule();
    };

    const onEnd = (event: PointerEvent) => {
      if (!pointerFingers.delete(event.pointerId)) return;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      lastInput = `${event.type}: ${event.pointerType}`;
      updateDiagnostic();
      setHasFingers(touchFingers.size + pointerFingers.size > 0);
      schedule();
    };

    const preventGesture = (event: Event) => {
      event.preventDefault();
      lastInput = event.type;
      updateDiagnostic();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("touchstart", syncTouches, { passive: false, capture: true });
    document.addEventListener("touchmove", syncTouches, { passive: false, capture: true });
    document.addEventListener("touchend", syncTouches, { passive: false, capture: true });
    document.addEventListener("touchcancel", syncTouches, { passive: false, capture: true });
    document.addEventListener("gesturestart", preventGesture, { passive: false, capture: true });
    document.addEventListener("gesturechange", preventGesture, { passive: false, capture: true });
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onEnd);
    canvas.addEventListener("pointercancel", onEnd);
    canvas.addEventListener("lostpointercapture", onEnd);
    resize();

    return () => {
      observer.disconnect();
      document.removeEventListener("touchstart", syncTouches, true);
      document.removeEventListener("touchmove", syncTouches, true);
      document.removeEventListener("touchend", syncTouches, true);
      document.removeEventListener("touchcancel", syncTouches, true);
      document.removeEventListener("gesturestart", preventGesture, true);
      document.removeEventListener("gesturechange", preventGesture, true);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onEnd);
      canvas.removeEventListener("pointercancel", onEnd);
      canvas.removeEventListener("lostpointercapture", onEnd);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className={styles.field}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Touch the screen with one or more fingers to connect their positions" role="img" />
      {!hasFingers && <p className={styles.instruction}>화면을 여러 손가락으로 터치하세요</p>}
      <output ref={diagnosticRef} className={styles.diagnostic} hidden={!showDiagnostic} aria-live="off" />
    </main>
  );
}
