"use client";

import { useEffect, useRef, useState } from "react";
import { anchorPoint, buildPose, continueBinding, solveFigure, type Anchor, type Binding, type Endpoints, type Figure, type Point, type Role } from "./model/rig";
import { describeBody } from "./screen/readout";
import { drawFigure, drawNetwork } from "./screen/renderer";
import styles from "./screen.module.css";

const roles: Role[] = ["head", "leftHand", "rightHand", "leftFoot", "rightFoot"];
const maximumPixelRatio = 1.5;
const readoutInterval = 80;
// After a hand change the body eases into the new fit, then tracks the fingers tightly again.
const morphSeconds = 0.6;
const morphRate = 4;
const trackRate = 19;
const releaseFadeSeconds = 3;

export default function MobileFingerNetworkTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const [hasFingers, setHasFingers] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const readout = readoutRef.current;
    if (!canvas || !readout) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;

    const touchFingers = new Map<number, Point>();
    const pointerFingers = new Map<number, Point>();
    const useTouchEvents = "ontouchstart" in window;
    let width = 1;
    let height = 1;
    let frame: number | null = null;
    let previousTime = 0;
    let binding: Binding | null = null;
    let heldAnchors: Anchor[] = [];
    let lockedScale: number | null = null;
    let animated: Figure | null = null;
    let figureOpacity = 0;
    let morph = 1;
    let frozen: Endpoints | null = null;
    let skinTexture: CanvasPattern | null = null;
    let lastFigureTime = -Infinity;
    let lastReadoutTime = -Infinity;
    let readoutOpacity = "0";
    let instructionTimer: number | null = null;

    const paint = (time: number) => {
      frame = null;
      const dt = previousTime ? Math.min(0.05, (time - previousTime) / 1000) : 1 / 60;
      previousTime = time;
      const contacts = touchFingers.size > 0 ? touchFingers : pointerFingers;
      const points = [...contacts.values()];
      const briefDropout = contacts.size === 0 && binding !== null && time - lastFigureTime < 180;

      if (!briefDropout) {
        const next = continueBinding(binding, contacts);
        if (next && next !== binding) {
          lockedScale = animated && figureOpacity > 0 ? animated.frame.scale : null;
          const lifted = binding !== null && next.size < binding.size && [...next.keys()].every((id) => binding!.has(id));
          if (lifted && animated) {
            // A lifted finger leaves its part where it is; the remaining fingers keep hold of the rest.
            frozen = Object.fromEntries(roles.map((role) => [role, { ...animated!.endpoints[role] }])) as Endpoints;
          } else {
            frozen = null;
            morph = 0;
          }
        }
        binding = next;
        heldAnchors = binding ? [...binding.values()] : [];
        const target = binding ? solveFigure(binding, contacts, lockedScale, frozen) : null;
        if (target) {
          lastFigureTime = time;
          if (!animated || figureOpacity === 0) {
            animated = { frame: { ...target.frame }, endpoints: { ...target.endpoints } };
          } else {
            morph = Math.min(1, morph + dt / morphSeconds);
            const follow = 1 - Math.exp(-dt * (morphRate + (trackRate - morphRate) * morph * morph));
            const current = animated.frame;
            const turn = Math.atan2(Math.sin(target.frame.angle - current.angle), Math.cos(target.frame.angle - current.angle));
            animated.frame = {
              x: current.x + (target.frame.x - current.x) * follow,
              y: current.y + (target.frame.y - current.y) * follow,
              angle: current.angle + turn * follow,
              scale: current.scale + (target.frame.scale - current.scale) * follow,
            };
            for (const role of roles) {
              animated.endpoints[role] = {
                x: animated.endpoints[role].x + (target.endpoints[role].x - animated.endpoints[role].x) * follow,
                y: animated.endpoints[role].y + (target.endpoints[role].y - animated.endpoints[role].y) * follow,
              };
            }
          }
        }
      }

      // Released, the body keeps its last shape while fading out over three seconds; returning fingers take hold of it mid-fade.
      if (binding) {
        figureOpacity += (1 - figureOpacity) * (1 - Math.exp(-dt * 10));
      } else if (animated) {
        figureOpacity = Math.max(0, figureOpacity - dt / releaseFadeSeconds);
        if (figureOpacity === 0) {
          animated = null;
          frozen = null;
          if (contacts.size === 0) setHasFingers(false);
        }
      }

      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);
      drawNetwork(context, points, time, 1 - figureOpacity * 0.88);
      if (animated && figureOpacity > 0) {
        const { frame: body, endpoints } = animated;
        context.save();
        context.translate(body.x, body.y);
        context.rotate(body.angle);
        context.scale(body.scale, body.scale);
        const rings = heldAnchors.map((anchor) => anchorPoint(endpoints, anchor));
        const pose = buildPose(endpoints);
        drawFigure(context, pose, time, figureOpacity, skinTexture, rings);
        context.restore();
        if (time - lastReadoutTime >= readoutInterval) {
          lastReadoutTime = time;
          readout.textContent = describeBody(body, pose, heldAnchors, time, figureOpacity);
        }
      }
      const nextOpacity = figureOpacity.toFixed(3);
      if (nextOpacity !== readoutOpacity) {
        readoutOpacity = nextOpacity;
        readout.style.opacity = nextOpacity;
      }

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
          if (!animated) setHasFingers(false);
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
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Two to five fingertips form a moving human figure: two fingers place, turn, and size the whole body; more fingers take hold of the head, hands, and feet" role="img" />
      <p ref={readoutRef} className={styles.readout} aria-hidden="true" />
      {!hasFingers && <p className={styles.instruction}>손가락을 두 개 이상 화면에 올려 보세요</p>}
    </main>
  );
}
