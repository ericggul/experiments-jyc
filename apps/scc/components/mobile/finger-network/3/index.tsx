"use client";

import { useEffect, useRef, useState } from "react";
import { applyContactChanges, createNetwork, isLinked, lifeOf, pruneFaded, type ContactEvent, type Point } from "./model/network";
import styles from "./screen.module.css";

const maximumPixelRatio = 1.5;
const pulseDuration = 1600;
// Cross-session reach as a share of the screen's shorter side.
const reachShare = 0.3;
const lifetime = 5000;
// Edges are batched into this many opacity steps so fading costs a few strokes, not one per edge.
const opacitySteps = 24;

export default function MobileFingerNetworkThree() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasNodes, setHasNodes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;

    const network = createNetwork();
    const useTouchEvents = "ontouchstart" in window;
    // Pointer identifiers are kept negative so they never share a slot with touch identifiers.
    const pointerIdentifier = (event: PointerEvent) => -1 - event.pointerId;
    const heldPointers = new Set<number>();
    let width = 1;
    let height = 1;
    let frame: number | null = null;

    const paint = (time: number) => {
      frame = null;
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);

      pruneFaded(network, time, lifetime);
      const nodes = network.nodes;
      const lives = nodes.map((node) => lifeOf(node, time, lifetime));
      const reach = Math.min(width, height) * reachShare;
      // An edge is as alive as its weaker end.
      const steps = Array.from({ length: opacitySteps + 1 }, () => [] as number[]);
      for (let first = 0; first < nodes.length; first += 1) {
        for (let second = first + 1; second < nodes.length; second += 1) {
          if (!isLinked(nodes[first]!, nodes[second]!, reach)) continue;
          const step = Math.round(Math.min(lives[first]!, lives[second]!) * opacitySteps);
          if (step > 0) steps[step]!.push(first, second);
        }
      }
      context.lineWidth = 1;
      steps.forEach((pairs, step) => {
        if (pairs.length === 0) return;
        context.strokeStyle = `rgba(255, 255, 255, ${(0.85 * step) / opacitySteps})`;
        context.beginPath();
        for (let index = 0; index < pairs.length; index += 2) {
          context.moveTo(nodes[pairs[index]!]!.x, nodes[pairs[index]!]!.y);
          context.lineTo(nodes[pairs[index + 1]!]!.x, nodes[pairs[index + 1]!]!.y);
        }
        context.stroke();
      });

      const phase = (time % pulseDuration) / pulseDuration;
      context.strokeStyle = `rgba(255, 255, 255, ${0.55 * (1 - phase)})`;
      for (const point of network.held.values()) ring(context, point, 9 + phase * 26);
      nodes.forEach((point, index) => {
        context.globalAlpha = lives[index]!;
        context.strokeStyle = "rgba(255, 255, 255, 0.72)";
        ring(context, point, 8);
        context.fillStyle = "#fff";
        context.beginPath();
        context.arc(point.x, point.y, 3, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;

      if (nodes.length > 0) frame = window.requestAnimationFrame(paint);
      else setHasNodes(false);
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

    const position = (clientX: number, clientY: number, bounds: DOMRect): Point => ({
      x: Math.max(0, Math.min(width, clientX - bounds.left)),
      y: Math.max(0, Math.min(height, clientY - bounds.top)),
    });

    const apply = (type: ContactEvent, changes: { identifier: number; x: number; y: number }[]) => {
      applyContactChanges(network, type, changes, performance.now());
      if (network.nodes.length > 0) setHasNodes(true);
      schedule();
    };

    const syncTouches = (event: TouchEvent) => {
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      apply(
        event.type as ContactEvent,
        Array.from(event.changedTouches, (touch) => ({ identifier: touch.identifier, ...position(touch.clientX, touch.clientY, bounds) })),
      );
    };

    const onDown = (event: PointerEvent) => {
      if (useTouchEvents && event.pointerType === "touch") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      heldPointers.add(event.pointerId);
      apply("touchstart", [{ identifier: pointerIdentifier(event), ...position(event.clientX, event.clientY, canvas.getBoundingClientRect()) }]);
    };

    const onMove = (event: PointerEvent) => {
      if (!heldPointers.has(event.pointerId)) return;
      apply("touchmove", [{ identifier: pointerIdentifier(event), ...position(event.clientX, event.clientY, canvas.getBoundingClientRect()) }]);
    };

    const onEnd = (event: PointerEvent) => {
      if (!heldPointers.delete(event.pointerId)) return;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      apply("touchend", [{ identifier: pointerIdentifier(event), x: 0, y: 0 }]);
    };

    const preventGesture = (event: Event) => event.preventDefault();
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
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Every touch leaves a fading node, joined to all nodes of the same touch session and to nearby nodes of earlier sessions" role="img" />
      {!hasNodes && <p className={styles.instruction}>화면을 여러 손가락으로 터치하세요</p>}
    </main>
  );
}

function ring(context: CanvasRenderingContext2D, point: Point, radius: number) {
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.stroke();
}
