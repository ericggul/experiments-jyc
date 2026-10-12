"use client";

import { useLayoutEffect, useRef } from "react";
import { collectFunctionalUnits, compareStacking, unitRect, type FunctionalUnit } from "./functional-units";
import type { CommandGroup } from "./semantic";
import "./substitution.css";

export type Presentation = "replace" | "overlay" | "reveal";
type Clip = { left: number; top: number; right: number; bottom: number };
type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type Cell = { rect: Box; element: Element; color: string; label?: string; clip: Clip; mask: boolean; stack: number[]; order: number; layer: Element | null };

// The animation frame in which some filter on this page last re-read its clone. Phones on a host page share one main thread
// and a re-read costs tens of milliseconds, so they take turns, one per frame; a lone page filter always has the frame to itself.
let readFrame = -1;

/**
 * Without `scope` the filter reads and covers the whole page. With it, it reads one element (a phone a host page such as
 * `/mobiles/2` draws, marked `data-substitution-command-scope` and holding this canvas) and draws in that element's own CSS pixels.
 */
export default function CommandRenderer({ clone, group, presentation, scope }: { clone: string; group: CommandGroup; presentation: Presentation; scope?: HTMLElement }) {
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const context = overlay?.getContext("2d");
    if (!overlay || !context) return;

    const host = scope ?? null;
    const body = host ?? document.body;
    const root = host ?? document.documentElement;
    // Where the host sits on screen and how much it is scaled; boxes and pointers are measured on screen.
    const view = () => {
      if (!host) return { left: 0, top: 0, scale: 1, width: window.innerWidth, height: window.innerHeight };
      const box = host.getBoundingClientRect();
      const width = host.offsetWidth;
      return { left: box.left, top: box.top, scale: width ? box.width / width : 1, width, height: host.offsetHeight };
    };
    const inside = (target: EventTarget | null) => !host || (target instanceof Node && host.contains(target));
    const rootMode = presentation;
    let functionalUnits: FunctionalUnit[] = [];
    let cacheDirty = true;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    let lastCollect = -Infinity;
    let collectTimer = 0;
    // Transitions and animations move boxes without scroll or DOM events; until this time every frame is redrawn.
    let movingUntil = 0;
    const range = document.createRange();
    const labelFits = new Map<string, { fontSize: number; scaleX: number; measuredWidth: number }>();

    const refreshCache = () => {
      // Read the clone with its own fills and borders visible; each unit's box depends on them.
      root.removeAttribute("data-mobile-substitution-command");
      const screen = host?.getBoundingClientRect();
      functionalUnits = host && screen
        ? collectFunctionalUnits(clone, group, body, screen.width * screen.height, host.offsetWidth ? screen.width / host.offsetWidth : 1)
        : collectFunctionalUnits(clone, group);
      root.setAttribute("data-mobile-substitution-command", rootMode);
      lastCollect = performance.now();
      cacheDirty = false;
    };

    const draw = (time: number) => {
      frame = 0;
      if (performance.now() < movingUntil) scheduleDraw();
      if (cacheDirty) {
        // A clone that mutates while scrolling (a hiding header, a playing video) is re-read at most four times a second.
        const wait = lastCollect + 250 - performance.now();
        if (wait > 0) {
          if (!collectTimer) collectTimer = window.setTimeout(() => { collectTimer = 0; scheduleDraw(); }, wait);
        } else if (time === readFrame) scheduleDraw();
        else {
          readFrame = time;
          refreshCache();
        }
      }

      // A scaled host is drawn at its on-screen resolution.
      const { left: originX, top: originY, scale, width, height } = view();
      const ratio = Math.min(window.devicePixelRatio || 1, 2) * scale;
      const local = (box: { left: number; top: number; right: number; bottom: number }) => host
        ? { left: (box.left - originX) / scale, top: (box.top - originY) / scale, right: (box.right - originX) / scale, bottom: (box.bottom - originY) / scale }
        : box;
      if (overlay.width !== Math.round(width * ratio) || overlay.height !== Math.round(height * ratio)) {
        overlay.width = Math.round(width * ratio);
        overlay.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      if (presentation === "replace") {
        context.fillStyle = "#fff";
        context.fillRect(0, 0, width, height);
      }

      const viewport: Clip = { left: 0, top: 0, right: width, bottom: height };
      const cells: Cell[] = [];
      const clipRects = new Map<Element, Clip>();
      for (const unit of functionalUnits) {
        if (!unit.label && presentation !== "replace") continue;
        const screenBounds = unitRect(unit, range);
        const bounds = screenBounds && local(screenBounds);
        if (!bounds || bounds.right - bounds.left < 4 || bounds.bottom - bounds.top < 4) continue;
        let clip = viewport;
        for (const ancestor of unit.clips) {
          let box = clipRects.get(ancestor);
          if (!box) clipRects.set(ancestor, (box = local(ancestor.getBoundingClientRect())));
          clip = { left: Math.max(clip.left, box.left), top: Math.max(clip.top, box.top), right: Math.min(clip.right, box.right), bottom: Math.min(clip.bottom, box.bottom) };
        }
        if (bounds.right <= clip.left || bounds.left >= clip.right || bounds.bottom <= clip.top || bounds.top >= clip.bottom) continue;
        const rect = { ...bounds, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
        cells.push({
          rect, element: unit.element, clip, mask: !unit.label, label: unit.label ?? undefined,
          color: presentation === "overlay" ? "rgba(255,255,255,0.42)" : "#fff",
          stack: unit.stack, order: unit.order, layer: unit.layer,
        });
      }
      // Paint in the page's own stacking order, so chrome over the scrolling content hides it exactly where the original does.
      cells.sort(compareStacking);

      const paint = (cell: Cell, fill: boolean) => {
        const clip = cell.clip;
        context.save();
        context.beginPath();
        context.rect(clip.left, clip.top, clip.right - clip.left, clip.bottom - clip.top);
        context.clip();
        // A fill covers whole pixels, so a cell on top also hides the outline of a cell below it that shares an edge.
        const left = Math.round(cell.rect.left);
        const top = Math.round(cell.rect.top);
        const cellWidth = Math.max(0, Math.round(cell.rect.right) - left);
        const cellHeight = Math.max(0, Math.round(cell.rect.bottom) - top);
        if (fill) {
          context.fillStyle = cell.color;
          context.fillRect(left, top, cellWidth, cellHeight);
        } else {
          context.strokeStyle = "#111";
          context.lineWidth = 1;
          context.strokeRect(left + 0.5, top + 0.5, Math.max(0, cellWidth - 1), Math.max(0, cellHeight - 1));
        }
        context.restore();
      };
      const shown = ({ rect, clip }: Cell) => ({ left: Math.max(rect.left, clip.left), top: Math.max(rect.top, clip.top), right: Math.min(rect.right, clip.right), bottom: Math.min(rect.bottom, clip.bottom) });
      // The part of a cell still seen: inside its clip, and not under an opaque cell painted later across its full width or height.
      const visibleSpan = (index: number) => {
        const span = shown(cells[index]);
        if (presentation !== "replace") return span;
        for (let later = index + 1; later < cells.length; later++) {
          const cover = shown(cells[later]);
          if (cover.right <= span.left || cover.left >= span.right || cover.bottom <= span.top || cover.top >= span.bottom) continue;
          if (cover.left <= span.left + 1 && cover.right >= span.right - 1) {
            if (cover.top <= span.top) span.top = Math.max(span.top, cover.bottom);
            else if (cover.bottom >= span.bottom) span.bottom = Math.min(span.bottom, cover.top);
          } else if (cover.top <= span.top + 1 && cover.bottom >= span.bottom - 1) {
            if (cover.left <= span.left) span.left = Math.max(span.left, cover.right);
            else if (cover.right >= span.right) span.right = Math.min(span.right, cover.left);
          }
        }
        return span;
      };
      // Keeps a label of fixed size inside what is seen of its cell, or null when it no longer fits there.
      const settle = (center: number, size: number, low: number, high: number) =>
        low + size / 2 <= high - size / 2 ? Math.min(Math.max(center, low + size / 2), high - size / 2) : null;
      // Whether a cell belongs to a bar, pill or sheet stacked over the other's layer, rather than to the same surface.
      const stackedAbove = (upper: Cell, lower: Cell) =>
        upper.layer !== lower.layer && compareStacking({ stack: upper.stack, order: 0 }, { stack: lower.stack, order: 0 }) > 0;

      const paintLabel = (cell: Cell, index: number) => {
        if (!cell.label || cell.rect.width < 12 || cell.rect.height < 9) return;
        // Sized from the whole cell, so a label never resizes while its cell scrolls.
        const clip = cell.clip;
        const { left, top, right, bottom } = cell.rect;
        context.save();
        context.beginPath();
        context.rect(Math.max(left + 2, clip.left), Math.max(top + 1, clip.top), Math.min(right - 2, clip.right) - Math.max(left + 2, clip.left), Math.min(bottom - 1, clip.bottom) - Math.max(top + 1, clip.top));
        context.clip();
        const availableWidth = Math.max(8, right - left - 8);
        const fitKey = `${cell.label}|${Math.round(right - left)}|${Math.round(bottom - top)}`;
        let fit = labelFits.get(fitKey);
        if (!fit) {
          let size = Math.min(58, (bottom - top) * 0.46);
          context.font = `900 ${size}px Impact, Arial Black, sans-serif`;
          while (size > 9 && context.measureText(cell.label).width > availableWidth) {
            size -= 1;
            context.font = `900 ${size}px Impact, Arial Black, sans-serif`;
          }
          const width = context.measureText(cell.label).width;
          labelFits.set(fitKey, (fit = { fontSize: size, scaleX: Math.min(1, availableWidth / width), measuredWidth: width }));
        }
        const { fontSize, scaleX, measuredWidth } = fit;
        context.font = `900 ${fontSize}px Impact, Arial Black, sans-serif`;
        const labelWidth = measuredWidth * scaleX + 14;
        const labelHeight = fontSize + 10;
        const seen = visibleSpan(index);
        // Fit is judged on the ink itself; the padding only spaces the overlay plaque.
        const centerX = settle((left + right) / 2, Math.min(labelWidth, measuredWidth * scaleX + 2), seen.left, seen.right);
        const middleY = settle((top + bottom) / 2, Math.min(labelHeight, fontSize), seen.top, seen.bottom);
        // A label is shown whole or not at all: never cut at an edge or half under a bar.
        if (centerX === null || middleY === null) {
          context.restore();
          return;
        }
        // A large surface moves its label off the controls painted on it.
        const labelCenterY = cell.rect.width >= 240 && cell.rect.height >= 240
          ? [middleY, top + (bottom - top) * 0.35, top + (bottom - top) * 0.65]
            .filter((candidateY) => candidateY - labelHeight / 2 >= seen.top && candidateY + labelHeight / 2 <= seen.bottom)
            .find((candidateY) => !cells.some((other, otherIndex) => {
              if (otherIndex <= index || other.mask || other.rect.width * other.rect.height >= cell.rect.width * cell.rect.height * 0.5) return false;
              const box = shown(other);
              return box.left < centerX + labelWidth / 2 &&
                box.right > centerX - labelWidth / 2 &&
                box.top < candidateY + labelHeight / 2 &&
                box.bottom > candidateY - labelHeight / 2;
            })) ?? middleY
          : middleY;
        if (presentation === "replace" && cells.some((other, otherIndex) => {
          if (otherIndex <= index || !stackedAbove(other, cell)) return false;
          const box = shown(other);
          return box.left < centerX + measuredWidth * scaleX / 2 && box.right > centerX - measuredWidth * scaleX / 2 &&
            box.top < labelCenterY + fontSize / 2 && box.bottom > labelCenterY - fontSize / 2;
        })) {
          context.restore();
          return;
        }
        if (presentation === "overlay") {
          const plaqueWidth = Math.min(right - left - 4, measuredWidth * scaleX + 14);
          const plaqueHeight = Math.min(bottom - top - 2, fontSize + 10);
          context.fillStyle = "rgba(255,255,255,0.94)";
          context.fillRect(centerX - plaqueWidth / 2, labelCenterY - plaqueHeight / 2, plaqueWidth, plaqueHeight);
        }
        context.translate(centerX, labelCenterY);
        context.scale(scaleX, 1);
        context.fillStyle = "#000";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(cell.label, 0, 0);
        context.restore();
      };

      const point = pointer && { x: (pointer.x - originX) / scale, y: (pointer.y - originY) / scale };
      const drawnCells = presentation === "reveal"
        ? cells.filter((cell) => {
          if (!point) return false;
          const clip = cell.clip;
          return point.x >= Math.max(cell.rect.left, clip.left) &&
            point.x < Math.min(cell.rect.right, clip.right) &&
            point.y >= Math.max(cell.rect.top, clip.top) &&
            point.y < Math.min(cell.rect.bottom, clip.bottom);
        }).slice(-1).filter((cell) => !cell.mask)
        : cells;
      for (const cell of drawnCells) {
        paint(cell, true);
        if (cell.mask) continue;
        paint(cell, false);
        paintLabel(cell, cells.indexOf(cell));
      }
    };

    const scheduleDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };
    const onScroll = (event: Event) => {
      if (inside(event.target)) scheduleDraw();
    };

    // Only motion that moves, sizes or shows a box. Changes the hiding stylesheet itself makes while each collection lifts it
    // (colours, media opacity, pseudo-element visibility) do not move cells.
    const movingProperty = /^(transform|translate|scale|rotate|top|right|bottom|left|inset|width|height|max-height|max-width|margin|opacity|visibility|clip-path)/;
    const moves = (event: TransitionEvent) =>
      movingProperty.test(event.propertyName) && !event.pseudoElement &&
      !(event.propertyName === "opacity" && event.target instanceof Element && event.target.matches("img, picture, svg, video, canvas, iframe, input, select, textarea"));
    const seconds = (list: string) => Math.max(0, ...list.split(",").map((value) => parseFloat(value) * (value.trim().endsWith("ms") ? 0.001 : 1) || 0));
    // A box that finished hiding or showing (a sheet's delayed visibility) changes which units exist.
    const onMotionEnd = (event: TransitionEvent | AnimationEvent) => {
      if (!inside(event.target)) return;
      if (event.target instanceof Element && event.target.closest("[data-substitution-command-ui]")) return;
      if (event instanceof TransitionEvent && !moves(event)) return;
      cacheDirty = true;
      scheduleDraw();
    };
    const onMotion = (event: TransitionEvent | AnimationEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !inside(target) || target.closest("[data-substitution-command-ui]")) return;
      const style = window.getComputedStyle(target);
      let length: number;
      if (event.type === "animationstart") {
        // Endless loops (spinners) are left to their own mutations; finite motion is followed to its end.
        if (style.animationIterationCount.split(",").some((count) => count.trim() === "infinite")) return;
        length = seconds(style.animationDelay) + seconds(style.animationDuration) * Math.max(1, ...style.animationIterationCount.split(",").map(Number));
      } else {
        if (!moves(event as TransitionEvent)) return;
        length = seconds(style.transitionDelay) + seconds(style.transitionDuration);
      }
      movingUntil = Math.max(movingUntil, performance.now() + Math.min(3, length) * 1000 + 50);
      scheduleDraw();
    };

    const pointAt = (x: number, y: number, target: EventTarget | null) => {
      if (presentation !== "reveal") return;
      const next = !inside(target) || (target instanceof Element && target.closest("[data-substitution-command-ui]")) ? null : { x, y };
      // Every phone on a host page hears every move; one the pointer is not over stays as it is.
      if (!next && !pointer) return;
      pointer = next;
      scheduleDraw();
    };
    const onPointerMove = (event: PointerEvent) => pointAt(event.clientX, event.clientY, event.target);
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      pointer = null;
      scheduleDraw();
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget || !inside(event.relatedTarget)) clearPointer();
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) pointAt(touch.clientX, touch.clientY, event.target);
    };
    const clearPointer = () => {
      pointer = null;
      scheduleDraw();
    };

    const observer = new MutationObserver((mutations) => {
      const own = (node: Node) => node === root || overlay.contains(node) || Boolean((node instanceof Element ? node : node.parentElement)?.closest("[data-substitution-command-ui]"));
      if (mutations.every((mutation) => own(mutation.target))) return;
      if (mutations.some((mutation) => mutation.type === "childList" || mutation.type === "characterData" || mutation.type === "attributes")) {
        cacheDirty = true;
      }
      scheduleDraw();
    });
    root.setAttribute("data-mobile-substitution-command", rootMode);
    observer.observe(body, { subtree: true, childList: true, characterData: true, attributes: true });
    // A host page resizes its frames without resizing the window.
    const resizes = new ResizeObserver(scheduleDraw);
    if (host) resizes.observe(host);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", scheduleDraw);
    window.addEventListener("load", scheduleDraw);
    document.addEventListener("transitionrun", onMotion, true);
    document.addEventListener("animationstart", onMotion, true);
    document.addEventListener("transitionend", onMotionEnd, true);
    document.addEventListener("animationend", onMotionEnd, true);
    if (presentation === "reveal") {
      window.addEventListener("pointermove", onPointerMove, true);
      window.addEventListener("pointerdown", onPointerMove, true);
      window.addEventListener("pointerup", onPointerEnd, true);
      window.addEventListener("pointerout", onPointerOut, true);
      window.addEventListener("pointercancel", clearPointer, true);
      window.addEventListener("touchstart", onTouchMove, { capture: true, passive: true });
      window.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
      window.addEventListener("touchend", clearPointer, true);
      window.addEventListener("touchcancel", clearPointer, true);
      window.addEventListener("blur", clearPointer);
    }
    scheduleDraw();

    return () => {
      observer.disconnect();
      resizes.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", scheduleDraw);
      window.removeEventListener("load", scheduleDraw);
      document.removeEventListener("transitionrun", onMotion, true);
      document.removeEventListener("animationstart", onMotion, true);
      document.removeEventListener("transitionend", onMotionEnd, true);
      document.removeEventListener("animationend", onMotionEnd, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerdown", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerEnd, true);
      window.removeEventListener("pointerout", onPointerOut, true);
      window.removeEventListener("pointercancel", clearPointer, true);
      window.removeEventListener("touchstart", onTouchMove, true);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("touchend", clearPointer, true);
      window.removeEventListener("touchcancel", clearPointer, true);
      window.removeEventListener("blur", clearPointer);
      if (frame) window.cancelAnimationFrame(frame);
      if (collectTimer) window.clearTimeout(collectTimer);
      root.removeAttribute("data-mobile-substitution-command");
    };
  }, [clone, group, presentation, scope]);

  return <canvas ref={overlayRef} data-substitution-command-overlay aria-hidden="true" />;
}
