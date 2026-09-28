"use client";

import { useEffect, useRef, useState } from "react";
import { assignRoles, buildPose, endpointsFor, type Endpoints, type Point, type Role, type RoleIds } from "./model/rig";
import { drawFigure, drawNetwork } from "./screen/renderer";
import styles from "./screen.module.css";

const roles: Role[] = ["head", "leftHand", "rightHand", "leftFoot", "rightFoot"];
const maximumPixelRatio = 1.5;

export default function MobileFingerNetworkTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasFingers, setHasFingers] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;

    const touchFingers = new Map<number, Point>();
    const pointerFingers = new Map<number, Point>();
    const useTouchEvents = "ontouchstart" in window;
    let width = 1;
    let height = 1;
    let frame: number | null = null;
    let previousTime = 0;
    let roleIds: RoleIds | null = null;
    let animatedEndpoints: Endpoints | null = null;
    let figureOpacity = 0;
    let skinTexture: CanvasPattern | null = null;
    let lastFiveTime = -Infinity;
    let instructionTimer: number | null = null;

    const paint = (time: number) => {
      frame = null;
      const dt = previousTime ? Math.min(0.05, (time - previousTime) / 1000) : 1 / 60;
      previousTime = time;
      const contacts = touchFingers.size > 0 ? touchFingers : pointerFingers;
      const points = [...contacts.values()];
      const fiveFingers = contacts.size === 5;
      if (fiveFingers) lastFiveTime = time;
      const briefDropout = contacts.size === 0 && roleIds !== null && time - lastFiveTime < 180;

      if (fiveFingers) {
        if (!roleIds || !endpointsFor(contacts, roleIds)) {
          roleIds = assignRoles(contacts);
          animatedEndpoints = roleIds ? endpointsFor(contacts, roleIds) : null;
        }
        const target = roleIds ? endpointsFor(contacts, roleIds) : null;
        if (target && animatedEndpoints) {
          const follow = 1 - Math.exp(-dt * 19);
          for (const role of roles) {
            animatedEndpoints[role] = {
              x: animatedEndpoints[role].x + (target[role].x - animatedEndpoints[role].x) * follow,
              y: animatedEndpoints[role].y + (target[role].y - animatedEndpoints[role].y) * follow,
            };
          }
        }
      } else if (!briefDropout) {
        roleIds = null;
      }

      const figureActive = fiveFingers || briefDropout;
      const fadeRate = figureActive ? 10 : 14;
      figureOpacity += ((figureActive ? 1 : 0) - figureOpacity) * (1 - Math.exp(-dt * fadeRate));
      if (figureOpacity < 0.003) figureOpacity = 0;

      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);
      drawNetwork(context, points, time, 1 - figureOpacity * 0.88);
      if (animatedEndpoints && figureOpacity > 0) drawFigure(context, buildPose(animatedEndpoints), time, figureOpacity, skinTexture);

      if (contacts.size > 0 || figureOpacity > 0) frame = window.requestAnimationFrame(paint);
      else previousTime = 0;
    };

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(paint);
    };

    const textureImage = new Image();
    textureImage.onload = () => {
      skinTexture = context.createPattern(textureImage, "repeat");
      schedule();
    };
    textureImage.src = "/assets/finger-network/skin-texture.png";

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

    const updateInstruction = () => {
      if (instructionTimer !== null) window.clearTimeout(instructionTimer);
      if (touchFingers.size + pointerFingers.size > 0) {
        setHasFingers(true);
      } else {
        instructionTimer = window.setTimeout(() => {
          setHasFingers(false);
          instructionTimer = null;
        }, 400);
      }
    };

    const syncTouches = (event: TouchEvent) => {
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      for (const touch of Array.from(event.changedTouches)) {
        if (event.type === "touchend" || event.type === "touchcancel") touchFingers.delete(touch.identifier);
        else touchFingers.set(touch.identifier, position(touch.clientX, touch.clientY, bounds));
      }
      updateInstruction();
      schedule();
    };

    const onDown = (event: PointerEvent) => {
      if (useTouchEvents && event.pointerType === "touch") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const bounds = canvas.getBoundingClientRect();
      pointerFingers.set(event.pointerId, position(event.clientX, event.clientY, bounds));
      updateInstruction();
      schedule();
    };

    const onMove = (event: PointerEvent) => {
      if (!pointerFingers.has(event.pointerId)) return;
      const bounds = canvas.getBoundingClientRect();
      pointerFingers.set(event.pointerId, position(event.clientX, event.clientY, bounds));
      schedule();
    };

    const onEnd = (event: PointerEvent) => {
      if (!pointerFingers.delete(event.pointerId)) return;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      updateInstruction();
      schedule();
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
      textureImage.onload = null;
      if (instructionTimer !== null) window.clearTimeout(instructionTimer);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className={styles.field}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Five fingertips form a moving human figure: top for head, two sides for hands, two below for feet" role="img" />
      {!hasFingers && <p className={styles.instruction}>다섯 손가락을 화면에 올려 보세요</p>}
    </main>
  );
}
