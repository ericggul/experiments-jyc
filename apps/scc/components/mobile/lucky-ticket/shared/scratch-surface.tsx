"use client";

import { useEffect, useRef } from "react";
import styles from "./screen.module.css";

type Point = { x: number; y: number };

const brushWidth = 0.7;

export default function ScratchSurface({ onFirstScratch }: { onFirstScratch: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const touches = new Map<number, Point>();
    const touchStarts = new Map<number, Point>();
    const pointers = new Map<number, Point>();
    const pointerStarts = new Map<number, Point>();
    const useTouchEvents = "ontouchstart" in window;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let hasScratched = false;

    const markScratched = () => {
      if (hasScratched) return;
      hasScratched = true;
      onFirstScratch();
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const hasPrevious = width > 0 && height > 0;
      const previous = document.createElement("canvas");
      if (hasPrevious) {
        previous.width = canvas.width;
        previous.height = canvas.height;
        previous.getContext("2d")?.drawImage(canvas, 0, 0);
      }
      width = bounds.width;
      height = bounds.height;
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(1, 0, 0, 1, 0, 0);
      if (hasPrevious) {
        context.globalCompositeOperation = "copy";
        context.drawImage(previous, 0, 0, canvas.width, canvas.height);
      } else {
        context.fillStyle = "#000";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.globalCompositeOperation = "source-over";
      canvas.style.backgroundColor = "transparent";
      touches.clear();
      touchStarts.clear();
      pointers.clear();
      pointerStarts.clear();
    };

    const point = (clientX: number, clientY: number, bounds: DOMRect): Point => ({
      x: Math.max(0, Math.min(width, clientX - bounds.left)),
      y: Math.max(0, Math.min(height, clientY - bounds.top)),
    });

    const erase = (from: Point, to: Point) => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.globalCompositeOperation = "destination-out";
      context.strokeStyle = "#000";
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = brushWidth;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
      context.globalCompositeOperation = "source-over";
    };

    const activateRevealedButton = (clientX: number, clientY: number) => {
      canvas.style.pointerEvents = "none";
      const button = document.elementFromPoint(clientX, clientY)?.closest("[data-scratch-share] button");
      canvas.style.pointerEvents = "";
      if (!(button instanceof HTMLButtonElement)) return;
      const bounds = button.getBoundingClientRect();
      const left = Math.max(0, Math.floor((bounds.left - canvas.getBoundingClientRect().left) * ratio));
      const top = Math.max(0, Math.floor((bounds.top - canvas.getBoundingClientRect().top) * ratio));
      const right = Math.min(canvas.width, Math.ceil((bounds.right - canvas.getBoundingClientRect().left) * ratio));
      const bottom = Math.min(canvas.height, Math.ceil((bounds.bottom - canvas.getBoundingClientRect().top) * ratio));
      if (right <= left || bottom <= top) return;
      const pixels = context.getImageData(left, top, right - left, bottom - top).data;
      let revealed = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] < 128) revealed++;
      }
      if (revealed / (pixels.length / 4) >= 0.08) button.click();
    };

    const onDown = (event: PointerEvent) => {
      if (useTouchEvents && event.pointerType === "touch") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const at = point(event.clientX, event.clientY, canvas.getBoundingClientRect());
      pointers.set(event.pointerId, at);
      pointerStarts.set(event.pointerId, at);
      erase(at, at);
      markScratched();
    };
    const onMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const bounds = canvas.getBoundingClientRect();
      let from = previous;
      for (const sample of [...(event.getCoalescedEvents?.() ?? []), event]) {
        const to = point(sample.clientX, sample.clientY, bounds);
        if (Math.hypot(to.x - from.x, to.y - from.y) < 0.5) continue;
        erase(from, to);
        from = to;
      }
      pointers.set(event.pointerId, from);
    };
    const onUp = (event: PointerEvent) => {
      const start = pointerStarts.get(event.pointerId);
      onMove(event);
      const at = point(event.clientX, event.clientY, canvas.getBoundingClientRect());
      if (start && Math.hypot(at.x - start.x, at.y - start.y) < 10) {
        activateRevealedButton(event.clientX, event.clientY);
      }
      pointers.delete(event.pointerId);
      pointerStarts.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const onCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      pointerStarts.delete(event.pointerId);
    };

    const onTouch = (event: TouchEvent) => {
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      for (const touch of Array.from(event.changedTouches)) {
        const at = point(touch.clientX, touch.clientY, bounds);
        const previous = touches.get(touch.identifier);
        if (event.type === "touchstart") {
          touches.set(touch.identifier, at);
          touchStarts.set(touch.identifier, at);
          erase(at, at);
          markScratched();
        } else if (event.type === "touchmove") {
          if (!previous) continue;
          if (Math.hypot(at.x - previous.x, at.y - previous.y) < 0.5) continue;
          erase(previous, at);
          touches.set(touch.identifier, at);
        } else {
          if (previous && event.type === "touchend") erase(previous, at);
          const start = touchStarts.get(touch.identifier);
          if (start && event.type === "touchend" && Math.hypot(at.x - start.x, at.y - start.y) < 10) {
            activateRevealedButton(touch.clientX, touch.clientY);
          }
          touches.delete(touch.identifier);
          touchStarts.delete(touch.identifier);
        }
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.pointerEvents = "none";
      markScratched();
    };
    const onBlur = () => { touches.clear(); touchStarts.clear(); pointers.clear(); pointerStarts.clear(); };
    const preventGesture = (event: Event) => event.preventDefault();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("touchstart", onTouch, { passive: false });
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchend", onTouch, { passive: false });
    canvas.addEventListener("touchcancel", onTouch, { passive: false });
    canvas.addEventListener("gesturestart", preventGesture, { passive: false });
    canvas.addEventListener("gesturechange", preventGesture, { passive: false });
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("lostpointercapture", onCancel);
    canvas.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    resize();
    return () => {
      observer.disconnect();
      canvas.removeEventListener("touchstart", onTouch);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchend", onTouch);
      canvas.removeEventListener("touchcancel", onTouch);
      canvas.removeEventListener("gesturestart", preventGesture);
      canvas.removeEventListener("gesturechange", preventGesture);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("lostpointercapture", onCancel);
      canvas.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    };
  }, [onFirstScratch]);

  return <canvas ref={canvasRef} className={styles.cover} role="button" tabIndex={0} aria-label="복권을 긁으세요. 키보드는 Enter 키로 전체를 볼 수 있습니다." />;
}
