import { columnLeft, type Layout } from "../model/layout";

export const background = "#fff";
export const ink = "#000";
/** 농담 only: the part of every column above its level, the same words barely there. */
export const restOpacity = 0.1;

/** 펼침 (default): the level stretches each column's line. 농담: the line stays full length, inked up to the level. */
export type Mode = "stretch" | "shade";

/**
 * sliders/2's grammar as a spectrum visualiser. Every column holds the sung word repeated, turned 90°
 * counter-clockwise to read upward, each column in its own face. At full level its ink fills exactly the
 * column's rectangle (ink height = column width, first glyph on the bottom edge, last on the top).
 *
 * The word changes the instant it is sung, so the lines are double-buffered: the front layer holds the word on
 * screen, the back layer is rasterised with the next word ahead of time, and the change itself is a swap.
 * A frame is one drawImage per column (plus the dim layer in 농담).
 */
export function createPainter(g: CanvasRenderingContext2D) {
  let front = document.createElement("canvas");
  let back = document.createElement("canvas");
  let layout: Layout | null = null;
  let ratio = 1;

  // A column's strip in device px, padded a pixel for antialiased overshoot (columns are ≥ 2 px apart) and
  // clamped to the canvas, since the columns run edge to edge and Safari skips source rects outside it.
  const strip = (column: number) => {
    const left = Math.max(0, Math.floor((columnLeft(layout!, column) - 1) * ratio));
    const right = Math.min(g.canvas.width, Math.ceil((columnLeft(layout!, column) + layout!.width + 1) * ratio));
    const top = Math.max(0, Math.floor(layout!.top * ratio) - 1);
    const bottom = Math.min(g.canvas.height, Math.ceil(layout!.bottom * ratio) + 1);
    return { left, top, width: right - left, height: bottom - top };
  };

  const rasterise = (layer: HTMLCanvasElement, text: string, fonts: readonly string[], repeats: number) => {
    const c = layer.getContext("2d")!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, layer.width, layer.height);
    if (!layout) return;
    c.fillStyle = ink;
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    const line = Array.from({ length: repeats }, () => text).join(" ");
    for (let column = 0; column < layout.count; column += 1) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.font = fonts[column]!;
      const metrics = c.measureText(line);
      const inkLength = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      if (!(inkLength > 0 && inkHeight > 0)) continue;
      // Text space (u along the line, v down from the baseline) → screen: u runs up from the bottom edge,
      // v runs right from the column's left edge (glyph tops face left).
      const along = (layout.bottom - layout.top) / inkLength;
      const across = layout.width / inkHeight;
      const x = columnLeft(layout, column) + metrics.actualBoundingBoxAscent * across;
      const y = layout.bottom - metrics.actualBoundingBoxLeft * along;
      c.setTransform(0, -ratio * along, ratio * across, 0, ratio * x, ratio * y);
      c.fillText(line, 0, 0);
    }
  };

  return {
    configure(next: Layout, pixelRatio: number) {
      layout = next;
      ratio = pixelRatio;
      for (const layer of [front, back]) {
        if (layer.width !== g.canvas.width || layer.height !== g.canvas.height) {
          layer.width = g.canvas.width;
          layer.height = g.canvas.height;
        }
      }
    },

    /** Rasterises a word into the layer on screen (a jump) or the one waiting behind it (the next word). */
    render(target: "front" | "back", text: string, fonts: readonly string[], repeats: number) {
      rasterise(target === "front" ? front : back, text, fonts, repeats);
    },

    /** The prepared next word goes on screen. */
    swap() {
      [front, back] = [back, front];
    },

    draw(levels: Float32Array, mode: Mode) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = background;
      g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      if (!layout) return;
      if (mode === "shade") {
        g.globalAlpha = restOpacity;
        g.drawImage(front, 0, 0);
        g.globalAlpha = 1;
      }
      for (let column = 0; column < layout.count; column += 1) {
        const area = strip(column);
        const scaled = area.height * Math.max(0, Math.min(1, levels[column] ?? 0));
        if (scaled < 0.5 || area.width <= 0) continue;
        const bottom = area.top + area.height;
        if (mode === "stretch") g.drawImage(front, area.left, area.top, area.width, area.height, area.left, bottom - scaled, area.width, scaled);
        else g.drawImage(front, area.left, bottom - scaled, area.width, scaled, area.left, bottom - scaled, area.width, scaled);
      }
    },
  };
}
