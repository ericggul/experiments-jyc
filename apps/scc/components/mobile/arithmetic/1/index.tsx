"use client";

import { useEffect, useRef, useState } from "react";
import { pickAction, type Action } from "./model/actions";
import styles from "./screen.module.css";

type Stamp = { action: Action; x: number; y: number };

const INK = "rgb(248, 249, 249)";
const MAX_RATIO = 3;
const MAX_STAMPS = 2000;
// While a finger skates, one more action is placed along its trace at this interval.
const TRAIL_MS = 25;
const TRAIL_MIN_TRAVEL = 3;

// Half of /default's row size: min(9vw, 9vh).
const glyphSize = (width: number, height: number) => Math.min(width, height) * 0.09;

export default function ArithmeticOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const paths = new Map<string, Path2D>();
    const pathFor = (action: Action) => {
      let path = paths.get(action.id);
      if (!path) {
        path = new Path2D(action.path);
        if ("fold" in action) {
          path.moveTo(action.fold.x1, action.fold.y1);
          path.lineTo(action.fold.x2, action.fold.y2);
        }
        paths.set(action.id, path);
      }
      return path;
    };

    const stamps: Stamp[] = [];
    let width = 0;
    let height = 0;
    const useTouchEvents = "ontouchstart" in window;
    // Last placement per finger: touch identifiers and pointer ids are kept apart.
    const fingers = new Map<string, { x: number; y: number; time: number }>();

    const draw = ({ action, x, y }: Stamp) => {
      const scale = glyphSize(width, height) / 24;
      context.save();
      context.translate(x - 12 * scale, y - 12 * scale);
      context.scale(scale, scale);
      if (action.paint === "fill") {
        context.fillStyle = INK;
        context.fill(pathFor(action));
      } else {
        context.strokeStyle = INK;
        context.lineWidth = 2;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.stroke(pathFor(action));
      }
      context.restore();
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      stamps.forEach(draw);
    };

    const place = (finger: string, x: number, y: number, time: number) => {
      const stamp = { action: pickAction(), x, y };
      stamps.push(stamp);
      if (stamps.length > MAX_STAMPS) stamps.shift();
      draw(stamp);
      fingers.set(finger, { x, y, time });
      setTouched(true);
    };

    // A finger places one action on contact, then one more whenever TRAIL_MS has passed and it has moved on.
    const contact = (finger: string, clientX: number, clientY: number, bounds: DOMRect) => {
      const x = clientX - bounds.left;
      const y = clientY - bounds.top;
      const time = performance.now();
      const last = fingers.get(finger);
      if (!last) return place(finger, x, y, time);
      if (time - last.time >= TRAIL_MS && Math.hypot(x - last.x, y - last.y) >= TRAIL_MIN_TRAVEL) place(finger, x, y, time);
    };

    const onTouch = (event: TouchEvent) => {
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      for (const touch of Array.from(event.changedTouches)) {
        const finger = `touch-${touch.identifier}`;
        if (event.type === "touchend" || event.type === "touchcancel") fingers.delete(finger);
        else contact(finger, touch.clientX, touch.clientY, bounds);
      }
    };

    const onDown = (event: PointerEvent) => {
      if (useTouchEvents && event.pointerType === "touch") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      contact(`pointer-${event.pointerId}`, event.clientX, event.clientY, canvas.getBoundingClientRect());
    };

    const onMove = (event: PointerEvent) => {
      if (!fingers.has(`pointer-${event.pointerId}`)) return;
      contact(`pointer-${event.pointerId}`, event.clientX, event.clientY, canvas.getBoundingClientRect());
    };

    const onEnd = (event: PointerEvent) => {
      if (!fingers.delete(`pointer-${event.pointerId}`)) return;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };

    const preventGesture = (event: Event) => event.preventDefault();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    for (const type of ["touchstart", "touchmove", "touchend", "touchcancel"] as const) {
      document.addEventListener(type, onTouch, { passive: false, capture: true });
    }
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
      for (const type of ["touchstart", "touchmove", "touchend", "touchcancel"] as const) {
        document.removeEventListener(type, onTouch, true);
      }
      document.removeEventListener("gesturestart", preventGesture, true);
      document.removeEventListener("gesturechange", preventGesture, true);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onEnd);
      canvas.removeEventListener("pointercancel", onEnd);
      canvas.removeEventListener("lostpointercapture", onEnd);
    };
  }, []);

  return (
    <main className={styles.field}>
      <canvas ref={canvasRef} className={styles.canvas} onContextMenu={(event) => event.preventDefault()} />
      {!touched && <p className={styles.instruction}>화면을 탭하세요</p>}
    </main>
  );
}
