import { rowTop, type Rows } from "../model/bars";
import type { Loaded } from "./fonts";

export const background = "#fff";
export const ink = "#000";
/** The unfilled part of every row: the same words, barely there. */
export const restOpacity = 0.1;
/**
 * Each row's bar is one line of its word repeated (LOADING × 10 by default), its ink squeezed or stretched
 * to exactly the bar's rectangle (ink height = thickness, first glyph on the left edge, last on the right).
 * The lines are rasterised once into a layer; a frame draws the layer dim, then each row's filled span at full ink.
 */
export function createPainter(g: CanvasRenderingContext2D) {
  const layer = document.createElement("canvas");
  const layerContext = layer.getContext("2d")!;
  let rows: Rows | null = null;
  let ratio = 1;

  return {
    configure(next: Rows, pixelRatio: number, lines: readonly Loaded[], repeats: number) {
      rows = next;
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
      const width = rows.right - rows.left;
      for (let row = 0; row < rows.count; row += 1) {
        const { text, font } = lines[row]!;
        const line = Array.from({ length: repeats }, () => text).join(" ");
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.font = font;
        const metrics = c.measureText(line);
        const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
        const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        if (!(inkWidth > 0 && inkHeight > 0)) continue;
        const sx = width / inkWidth;
        const sy = rows.thickness / inkHeight;
        const x = rows.left + metrics.actualBoundingBoxLeft * sx;
        const y = rowTop(rows, row) + metrics.actualBoundingBoxAscent * sy;
        c.setTransform(ratio * sx, 0, 0, ratio * sy, ratio * x, ratio * y);
        c.fillText(line, 0, 0);
      }
    },

    draw(progress: Float32Array) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = background;
      g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      if (!rows) return;
      g.globalAlpha = restOpacity;
      g.drawImage(layer, 0, 0);
      g.globalAlpha = 1;
      // Each row's band in device px, padded a pixel for antialiased overshoot (rows are ≥ 2 px apart) and
      // clamped to the canvas, since the stack runs edge to edge and Safari skips source rects outside it.
      const left = Math.max(0, Math.floor(rows.left * ratio) - 1);
      const right = Math.min(layer.width, Math.ceil(rows.right * ratio) + 1);
      for (let row = 0; row < rows.count; row += 1) {
        const value = progress[row] ?? 0;
        if (value <= 0) continue;
        const end = value >= 1 ? right : Math.min(right, Math.round((rows.left + (rows.right - rows.left) * value) * ratio));
        const top = Math.max(0, Math.floor((rowTop(rows, row) - 1) * ratio));
        const bottom = Math.min(layer.height, Math.ceil((rowTop(rows, row) + rows.thickness + 1) * ratio));
        const width = end - left;
        const height = bottom - top;
        if (width <= 0 || height <= 0) continue;
        g.drawImage(layer, left, top, width, height, left, top, width, height);
      }
    },
  };
}
