"use client";

import { useLayoutEffect, useRef } from "react";
import { collectFunctionalUnits, interactiveSelector, type FunctionalUnit } from "./functional-units";
import type { CommandGroup } from "./semantic";
import "./substitution.css";

type Mode = "outline" | "color" | "semantic";
export type Presentation = "replace" | "overlay" | "reveal";
type Clip = { left: number; top: number; right: number; bottom: number };
type CellStyle = { background: string | null; foreground: string; hasText: boolean };
type Cell = { rect: DOMRect; element: Element; color: string; label?: string };

const isColor = (value: string) =>
  value !== "transparent" && value !== "none" && !/^rgba?\(0, 0, 0, 0\)$/.test(value);

export default function SubstitutionRenderer({ mode, clone, group, presentation }: { mode: Mode; clone: string; group: CommandGroup; presentation: Presentation }) {
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const context = overlay?.getContext("2d");
    if (!overlay || !context) return;

    const root = document.documentElement;
    const rootMode = mode === "semantic" ? `semantic-${presentation}` : mode;
    let elements: Element[] = [];
    let textNodes: Text[] = [];
    let styles = new Map<Element, CellStyle>();
    let colors = new Map<Element, string>();
    let functionalUnits: FunctionalUnit[] = [];
    const imageColors = new Map<string, string | null>();
    let cacheDirty = true;
    let colorsDirty = true;
    let frame = 0;
    let active = true;
    let pointer: { x: number; y: number } | null = null;

    const sampleImage = (image: HTMLImageElement) => {
      const source = image.currentSrc || image.src;
      if (!source || imageColors.has(source)) return;
      imageColors.set(source, null);

      const readColor = (sourceImage: CanvasImageSource) => {
        const sample = document.createElement("canvas");
        sample.width = sample.height = 12;
        const sampleContext = sample.getContext("2d", { willReadFrequently: true });
        if (!sampleContext) return null;
        sampleContext.drawImage(sourceImage, 0, 0, 12, 12);
        const pixels = sampleContext.getImageData(0, 0, 12, 12).data;
        let red = 0, green = 0, blue = 0, weight = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3] / 255;
          red += pixels[index] * alpha;
          green += pixels[index + 1] * alpha;
          blue += pixels[index + 2] * alpha;
          weight += alpha;
        }
        return weight ? `rgb(${Math.round(red / weight)}, ${Math.round(green / weight)}, ${Math.round(blue / weight)})` : null;
      };

      try {
        if (image.complete && image.naturalWidth) {
          const color = readColor(image);
          if (color) {
            imageColors.set(source, color);
            colorsDirty = true;
            scheduleDraw();
            return;
          }
        }
      } catch {
        // Cross-origin images can only be sampled by a CORS-enabled copy.
      }

      const copy = new Image();
      copy.crossOrigin = "anonymous";
      copy.onload = () => {
        if (!active) return;
        try {
          imageColors.set(source, readColor(copy));
        } catch {
          imageColors.set(source, null);
        }
        colorsDirty = true;
        scheduleDraw();
      };
      copy.onerror = () => imageColors.set(source, null);
      copy.src = source;
    };

    const refreshCache = () => {
      if (mode === "semantic") {
        functionalUnits = collectFunctionalUnits(clone, group);
        cacheDirty = false;
        return;
      }
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nextTextNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (node.textContent?.trim() && parent && !parent.closest("script, style, noscript, [data-substitution-overlay], [data-substitution-ui]")) {
          nextTextNodes.push(node as Text);
        }
      }
      textNodes = nextTextNodes;
      elements = Array.from(document.body.querySelectorAll("*")).filter(
        (element) =>
          !element.hasAttribute("data-substitution-overlay") &&
          !element.closest("script, style, noscript, [data-substitution-ui]") &&
          (!element.closest("svg") || element.tagName.toLowerCase() === "svg")
      );

      if (mode === "color") {
        root.removeAttribute("data-mobile-substitution");
        const nextStyles = new Map<Element, CellStyle>();
        for (const element of elements) {
          const computed = window.getComputedStyle(element);
          const hasText = Array.from(element.childNodes).some(
            (child) => child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim())
          );
          const background = isColor(computed.backgroundColor) ? computed.backgroundColor : null;
          const foreground = element.tagName.toLowerCase() === "svg"
            ? (isColor(computed.stroke) ? computed.stroke : computed.fill)
            : computed.color;
          nextStyles.set(element, { background, foreground, hasText });
        }
        styles = nextStyles;
        root.setAttribute("data-mobile-substitution", rootMode);
        colorsDirty = true;
      }
      cacheDirty = false;
    };

    const refreshColors = () => {
      const nextColors = new Map<Element, string>();
      for (let index = elements.length - 1; index >= 0; index--) {
        const element = elements[index];
        const style = styles.get(element);
        let color = style?.background;
        if (element instanceof HTMLImageElement) {
          color = imageColors.get(element.currentSrc || element.src) || color || "#b8b8b8";
        } else if (!color && style?.hasText && isColor(style.foreground)) {
          color = style.foreground;
        } else if (!color && element.tagName.toLowerCase() === "svg" && style && isColor(style.foreground)) {
          color = style.foreground;
        }
        if (!color && element.children.length === 1) color = nextColors.get(element.children[0]) || null;
        nextColors.set(element, color || "#fff");
      }
      colors = nextColors;
      colorsDirty = false;
    };

    const visible = (rect: DOMRect) =>
      rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 &&
      rect.left < window.innerWidth && rect.top < window.innerHeight;

    const draw = () => {
      frame = 0;
      if (cacheDirty) refreshCache();
      if (mode === "color" && colorsDirty) refreshColors();

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (overlay.width !== Math.round(width * ratio) || overlay.height !== Math.round(height * ratio)) {
        overlay.width = Math.round(width * ratio);
        overlay.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      if (mode === "semantic" && presentation === "replace") {
        context.fillStyle = "#fff";
        context.fillRect(0, 0, width, height);
      }

      const clips = new Map<Element, Clip>();
      const viewport: Clip = { left: 0, top: 0, right: width, bottom: height };
      const clipFor = (element: Element): Clip => {
        const cached = clips.get(element);
        if (cached) return cached;
        const parent = element.parentElement;
        if (!parent) return viewport;
        const outer = clipFor(parent);
        const style = window.getComputedStyle(parent);
        const clipsX = /^(auto|scroll|hidden|clip)$/.test(style.overflowX);
        const clipsY = /^(auto|scroll|hidden|clip)$/.test(style.overflowY);
        if (!clipsX && !clipsY) {
          clips.set(element, outer);
          return outer;
        }
        const bounds = parent.getBoundingClientRect();
        const clip = {
          left: clipsX ? Math.max(outer.left, bounds.left) : outer.left,
          top: clipsY ? Math.max(outer.top, bounds.top) : outer.top,
          right: clipsX ? Math.min(outer.right, bounds.right) : outer.right,
          bottom: clipsY ? Math.min(outer.bottom, bounds.bottom) : outer.bottom,
        };
        clips.set(element, clip);
        return clip;
      };

      const cells: Cell[] = [];
      const addCell = (rect: DOMRect, element: Element, color: string, label?: string) => {
        if (!visible(rect)) return;
        const clip = clipFor(element);
        if (rect.right <= clip.left || rect.left >= clip.right || rect.bottom <= clip.top || rect.top >= clip.bottom) return;
        if (mode === "semantic" && (
          Math.min(rect.right, clip.right) - Math.max(rect.left, clip.left) < 18 ||
          Math.min(rect.bottom, clip.bottom) - Math.max(rect.top, clip.top) < 15
        )) return;
        cells.push({ rect, element, color, label });
      };

      if (mode === "semantic") {
        for (const unit of functionalUnits) {
          const rect = unit.element.getBoundingClientRect();
          if (rect.width < 18 || rect.height < 15) continue;
          if (unit.element.matches(interactiveSelector)) {
            const x = Math.max(0, Math.min(width - 1, (Math.max(0, rect.left) + Math.min(width, rect.right)) / 2));
            const y = Math.max(0, Math.min(height - 1, (Math.max(0, rect.top) + Math.min(height, rect.bottom)) / 2));
            const topmost = document.elementFromPoint(x, y);
            if (topmost && !unit.element.contains(topmost)) continue;
          }
          addCell(rect, unit.element, presentation === "overlay" ? "rgba(255,255,255,0.42)" : "#fff", unit.label);
        }
        cells.sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
      } else {
        for (const element of elements) {
          const rect = element.getBoundingClientRect();
          if (mode === "color" && element instanceof HTMLImageElement && visible(rect)) sampleImage(element);
          addCell(rect, element, mode === "color" ? colors.get(element) || "#fff" : "#fff");
        }
        const range = document.createRange();
        for (const node of textNodes) {
          const parent = node.parentElement;
          if (!parent || !visible(parent.getBoundingClientRect())) continue;
          range.selectNodeContents(node);
          const color = mode === "color" ? styles.get(parent)?.foreground || "#111" : "#fff";
          for (const rect of range.getClientRects()) addCell(rect, parent, color);
        }
        range.detach();
      }

      const paint = (cell: Cell, fill: boolean) => {
        const clip = clipFor(cell.element);
        context.save();
        context.beginPath();
        context.rect(clip.left, clip.top, clip.right - clip.left, clip.bottom - clip.top);
        context.clip();
        const left = Math.round(cell.rect.left) + 0.5;
        const top = Math.round(cell.rect.top) + 0.5;
        const cellWidth = Math.max(0, Math.round(cell.rect.width) - 1);
        const cellHeight = Math.max(0, Math.round(cell.rect.height) - 1);
        if (fill) {
          context.fillStyle = cell.color;
          context.fillRect(left, top, cellWidth, cellHeight);
        } else {
          context.strokeStyle = "#111";
          context.lineWidth = 1;
          context.strokeRect(left, top, cellWidth, cellHeight);
        }
        context.restore();
      };
      const paintLabel = (cell: Cell) => {
        if (!cell.label || cell.rect.width < 18 || cell.rect.height < 15) return;
        const clip = clipFor(cell.element);
        const left = Math.max(cell.rect.left, clip.left);
        const top = Math.max(cell.rect.top, clip.top);
        const right = Math.min(cell.rect.right, clip.right);
        const bottom = Math.min(cell.rect.bottom, clip.bottom);
        if (right - left < 18 || bottom - top < 15) return;
        context.save();
        context.beginPath();
        context.rect(left + 2, top + 1, right - left - 4, bottom - top - 2);
        context.clip();
        let fontSize = Math.min(58, (bottom - top) * 0.46);
        const availableWidth = Math.max(12, right - left - 8);
        context.font = `900 ${fontSize}px Impact, Arial Black, sans-serif`;
        while (fontSize > 9 && context.measureText(cell.label).width > availableWidth) {
          fontSize -= 1;
          context.font = `900 ${fontSize}px Impact, Arial Black, sans-serif`;
        }
        const measuredWidth = context.measureText(cell.label).width;
        const scaleX = Math.min(1, availableWidth / measuredWidth);
        const labelWidth = measuredWidth * scaleX + 14;
        const labelHeight = fontSize + 10;
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        const labelCenterY = cell.rect.width >= 240 && cell.rect.height >= 240
          ? [centerY, top + (bottom - top) * 0.35, top + (bottom - top) * 0.65]
          .find((candidateY) => !cells.some((other) => {
            if (other === cell || other.rect.width * other.rect.height >= cell.rect.width * cell.rect.height * 0.5) return false;
            return other.rect.left < centerX + labelWidth / 2 &&
              other.rect.right > centerX - labelWidth / 2 &&
              other.rect.top < candidateY + labelHeight / 2 &&
              other.rect.bottom > candidateY - labelHeight / 2;
          })) ?? centerY
          : centerY;
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

      if (mode === "semantic") {
        const drawnCells = presentation === "reveal"
          ? cells.filter((cell) => {
            if (!pointer) return false;
            const clip = clipFor(cell.element);
            return pointer.x >= Math.max(cell.rect.left, clip.left) &&
              pointer.x < Math.min(cell.rect.right, clip.right) &&
              pointer.y >= Math.max(cell.rect.top, clip.top) &&
              pointer.y < Math.min(cell.rect.bottom, clip.bottom);
          }).slice(-1)
          : cells;
        for (const cell of drawnCells) {
          paint(cell, true);
          paint(cell, false);
          paintLabel(cell);
        }
      } else {
        if (mode === "color") for (const cell of cells) paint(cell, true);
        for (const cell of cells) paint(cell, false);
      }
    };

    const scheduleDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const pointAt = (x: number, y: number, target: EventTarget | null) => {
      if (mode !== "semantic" || presentation !== "reveal") return;
      pointer = target instanceof Element && target.closest("[data-substitution-ui]") ? null : { x, y };
      scheduleDraw();
    };
    const onPointerMove = (event: PointerEvent) => pointAt(event.clientX, event.clientY, event.target);
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      pointer = null;
      scheduleDraw();
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) clearPointer();
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
      if (mutations.every((mutation) => overlay.contains(mutation.target) || mutation.target === root)) return;
      if (mutations.some((mutation) => mutation.type === "childList" || mutation.type === "characterData" || mutation.type === "attributes")) {
        cacheDirty = true;
      }
      scheduleDraw();
    });
    root.setAttribute("data-mobile-substitution", rootMode);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    window.addEventListener("scroll", scheduleDraw, true);
    window.addEventListener("resize", scheduleDraw);
    window.addEventListener("load", scheduleDraw);
    if (mode === "semantic" && presentation === "reveal") {
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
      active = false;
      observer.disconnect();
      window.removeEventListener("scroll", scheduleDraw, true);
      window.removeEventListener("resize", scheduleDraw);
      window.removeEventListener("load", scheduleDraw);
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
      root.removeAttribute("data-mobile-substitution");
    };
  }, [mode, clone, group, presentation]);

  return <canvas ref={overlayRef} data-substitution-overlay aria-hidden="true" />;
}
