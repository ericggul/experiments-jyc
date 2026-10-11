"use client";

import { useLayoutEffect, useRef } from "react";
import "./substitution.css";

export type FormMode = "outline" | "color";
type Clip = { left: number; top: number; right: number; bottom: number };
type CellStyle = { background: string | null; foreground: string; hasText: boolean };
type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type Cell = { rect: Box; element: Element; color: string };

const isColor = (value: string) =>
  value !== "transparent" && value !== "none" && !/^rgba?\(0, 0, 0, 0\)$/.test(value);

export default function FormRenderer({ mode }: { mode: FormMode }) {
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const context = overlay?.getContext("2d");
    if (!overlay || !context) return;

    const root = document.documentElement;
    let elements: Element[] = [];
    let textNodes: Text[] = [];
    let styles = new Map<Element, CellStyle>();
    let colors = new Map<Element, string>();
    const imageColors = new Map<string, string | null>();
    let cacheDirty = true;
    let colorsDirty = true;
    let frame = 0;
    let active = true;

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
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nextTextNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (node.textContent?.trim() && parent && !parent.closest("script, style, noscript, [data-substitution-form-overlay], [data-substitution-form-ui]")) {
          nextTextNodes.push(node as Text);
        }
      }
      textNodes = nextTextNodes;
      elements = Array.from(document.body.querySelectorAll("*")).filter(
        (element) =>
          !element.hasAttribute("data-substitution-form-overlay") &&
          !element.closest("script, style, noscript, [data-substitution-form-ui]") &&
          (!element.closest("svg") || element.tagName.toLowerCase() === "svg")
      );

      if (mode === "color") {
        root.removeAttribute("data-mobile-substitution-form");
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
        root.setAttribute("data-mobile-substitution-form", mode);
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
      const addCell = (rect: DOMRect, element: Element, color: string) => {
        if (!visible(rect)) return;
        const clip = clipFor(element);
        if (rect.right <= clip.left || rect.left >= clip.right || rect.bottom <= clip.top || rect.top >= clip.bottom) return;
        cells.push({ rect, element, color });
      };

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

      if (mode === "color") for (const cell of cells) paint(cell, true);
      for (const cell of cells) paint(cell, false);
    };

    const scheduleDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const observer = new MutationObserver((mutations) => {
      const own = (node: Node) => node === root || overlay.contains(node) || Boolean((node instanceof Element ? node : node.parentElement)?.closest("[data-substitution-form-ui]"));
      if (mutations.every((mutation) => own(mutation.target))) return;
      if (mutations.some((mutation) => mutation.type === "childList" || mutation.type === "characterData" || mutation.type === "attributes")) {
        cacheDirty = true;
      }
      scheduleDraw();
    });
    root.setAttribute("data-mobile-substitution-form", mode);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    window.addEventListener("scroll", scheduleDraw, true);
    window.addEventListener("resize", scheduleDraw);
    window.addEventListener("load", scheduleDraw);
    scheduleDraw();

    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener("scroll", scheduleDraw, true);
      window.removeEventListener("resize", scheduleDraw);
      window.removeEventListener("load", scheduleDraw);
      if (frame) window.cancelAnimationFrame(frame);
      root.removeAttribute("data-mobile-substitution-form");
    };
  }, [mode]);

  return <canvas ref={overlayRef} data-substitution-form-overlay aria-hidden="true" />;
}
