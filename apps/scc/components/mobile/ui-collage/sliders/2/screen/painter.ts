import { columnLeft, type Layout } from "../model/columns";
import type { Loaded } from "./fonts";

export const background = "#fff";
export const ink = "#000";
/** 농담 only: the part of every column above its value, the same words barely there. */
export const restOpacity = 0.1;

/**
 * 펼침 (default) or 농담: whether the value stretches each column's line or sets how much of it is inked.
 */
export type Mode = "stretch" | "shade";

/**
 * Each column's slider is one line of its word repeated (SLIDER × 14 by default), turned 90° counter-clockwise so
 * it reads upward from the bottom. At 100% its ink fills exactly the column's rectangle (ink height = column
 * width, first glyph on the bottom edge, last on the top). The value scales that line along the column from the
 * bottom edge, scaleY(0) to scaleY(1): every word is always there and always in full ink, only more or less
 * condensed. In 농담 (the first version) the line stays at full length, at full ink below the value and at 0.1
 * above. The lines are rasterised once at full length into a layer; a frame draws each column's strip of it
 * scaled to (펼침) or cut at (농담) its value.
 */
export function createPainter(g: CanvasRenderingContext2D) {
  const layer = document.createElement("canvas");
  const layerContext = layer.getContext("2d")!;
  let layout: Layout | null = null;
  let ratio = 1;

  return {
    configure(next: Layout, pixelRatio: number, lines: readonly Loaded[], repeats: number) {
      layout = next;
      ratio = pixelRatio;
      if (layer.width !== g.canvas.width || layer.height !== g.canvas.height) {
        layer.width = g.canvas.width;
        layer.height = g.canvas.height;
      }
      const c = layerContext;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, layer.width, layer.height);
      c.fillStyle = ink;
      c.textAlign = "left";
      c.textBaseline = "alphabetic";
      const length = layout.bottom - layout.top;
      for (let column = 0; column < layout.count; column += 1) {
        const { text, font } = lines[column]!;
        const line = Array.from({ length: repeats }, () => text).join(" ");
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.font = font;
        const metrics = c.measureText(line);
        const inkLength = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
        const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        if (!(inkLength > 0 && inkHeight > 0)) continue;
        // Text space (u along the line, v down from the baseline) → screen: u runs up from the bottom edge,
        // v runs right from the column's left edge (glyph tops face left).
        const along = length / inkLength;
        const across = layout.width / inkHeight;
        const x = columnLeft(layout, column) + metrics.actualBoundingBoxAscent * across;
        const y = layout.bottom - metrics.actualBoundingBoxLeft * along;
        c.setTransform(0, -ratio * along, ratio * across, 0, ratio * x, ratio * y);
        c.fillText(line, 0, 0);
      }
    },

    draw(shown: Float32Array, mode: Mode) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = background;
      g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      if (!layout) return;
      if (mode === "shade") {
        g.globalAlpha = restOpacity;
        g.drawImage(layer, 0, 0);
        g.globalAlpha = 1;
      }
      // Each column's strip in device px, padded a pixel for antialiased overshoot (columns are ≥ 2 px apart) and
      // clamped to the canvas, since the columns run edge to edge and Safari skips source rects outside it.
      const top = Math.max(0, Math.floor(layout.top * ratio) - 1);
      const bottom = Math.min(layer.height, Math.ceil(layout.bottom * ratio) + 1);
      const length = bottom - top;
      for (let column = 0; column < layout.count; column += 1) {
        // 용수철 can overshoot past either end; the column stops at the screen.
        const value = Math.max(0, Math.min(1, shown[column] ?? 0));
        const scaled = length * value;
        if (scaled < 0.5) continue;
        const left = Math.max(0, Math.floor((columnLeft(layout, column) - 1) * ratio));
        const right = Math.min(layer.width, Math.ceil((columnLeft(layout, column) + layout.width + 1) * ratio));
        const width = right - left;
        if (width <= 0 || length <= 0) continue;
        if (mode === "stretch") g.drawImage(layer, left, top, width, length, left, bottom - scaled, width, scaled);
        else g.drawImage(layer, left, bottom - scaled, width, scaled, left, bottom - scaled, width, scaled);
      }
    },
  };
}
