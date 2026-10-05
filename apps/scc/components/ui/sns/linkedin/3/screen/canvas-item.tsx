"use client";

import { useRef, useState, type ReactNode } from "react";
import styles from "./canvas-item.module.css";

type Point = { x: number; y: number };

let highestLayer = 20;
const nestedPoints = new WeakMap<HTMLElement, Point>();

function nestedContainer(target: HTMLElement, root: HTMLElement) {
  const candidate = target.closest<HTMLElement>(
    "article, section, header, nav, footer, aside, form, div",
  );
  if (!candidate || !root.contains(candidate) || candidate.parentElement === root) {
    return root;
  }
  return candidate;
}

export function CanvasItem({
  id,
  label,
  initial,
  width,
  children,
}: {
  id: string;
  label: string;
  initial: Point;
  width?: number;
  children: ReactNode;
}) {
  const [point, setPoint] = useState(initial);
  const [layer, setLayer] = useState(1);
  const [dragging, setDragging] = useState(false);
  const pointRef = useRef(point);

  function startDrag(event: React.PointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (
      event.pointerType === "touch" ||
      target.closest("a, button, input, textarea, select, video")
    ) {
      return;
    }

    const root = event.currentTarget;
    const nestedEnabled = root.closest('[data-nested-layers="true"]');
    const moving = nestedEnabled ? nestedContainer(target, root) : root;
    const isNested = moving !== root;
    const origin = isNested
      ? nestedPoints.get(moving) ?? { x: 0, y: 0 }
      : pointRef.current;
    const start = { x: event.clientX, y: event.clientY };
    let moved = false;
    setLayer(++highestLayer);

    function move(pointerEvent: PointerEvent) {
      const distance = Math.hypot(
        pointerEvent.clientX - start.x,
        pointerEvent.clientY - start.y,
      );
      if (!moved && distance < 4) return;
      if (!moved) {
        moved = true;
        setDragging(true);
        document.body.style.userSelect = "none";
      }
      pointerEvent.preventDefault();
      const next: Point = {
        x: Math.max(0, origin.x + pointerEvent.clientX - start.x),
        y: Math.max(0, origin.y + pointerEvent.clientY - start.y),
      };
      if (isNested) {
        nestedPoints.set(moving, next);
        moving.dataset.canvasNestedLayer = "true";
        if (getComputedStyle(moving).position === "static") {
          moving.style.position = "relative";
        }
        moving.style.zIndex = String(++highestLayer);
        moving.style.setProperty("translate", `${next.x}px ${next.y}px`);
      } else {
        pointRef.current = next;
        setPoint(next);
      }
    }

    function stop() {
      if (moved) {
        setDragging(false);
        document.body.style.userSelect = "";
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  return (
    <section
      className={`${styles.item} ${dragging ? styles.dragging : ""}`}
      data-canvas-item={id}
      onPointerDown={startDrag}
      style={{ left: point.x, top: point.y, width, zIndex: layer }}
    >
      <span className={styles.label} aria-hidden="true">{label}</span>
      {children}
    </section>
  );
}
