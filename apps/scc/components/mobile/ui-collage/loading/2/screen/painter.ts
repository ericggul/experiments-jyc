import { rowTop, type Rows } from "../model/bars";
import { lookOrder, looks, type Env, type LookId, type Prepared } from "./looks";

export type Choice = LookId | "mix";

export const background = "#fff";

export function lookOfRow(choice: Choice, row: number): LookId {
  return choice === "mix" ? lookOrder[row % lookOrder.length]! : choice;
}

/**
 * Groups rows by look, prepares each look once, and caches all static chrome in one layer,
 * so a frame is one drawImage plus a few batched fills per look.
 */
export function createPainter(g: CanvasRenderingContext2D) {
  const layer = document.createElement("canvas");
  const layerContext = layer.getContext("2d", { alpha: false })!;
  let prepared: Prepared[] = [];
  let ratio = 1;

  return {
    configure(rows: Rows, choice: Choice, showPercent: boolean, pixelRatio: number) {
      ratio = pixelRatio;
      const groups = new Map<LookId, number[]>();
      for (let row = 0; row < rows.count; row += 1) {
        const look = lookOfRow(choice, row);
        const group = groups.get(look);
        if (group) group.push(row);
        else groups.set(look, [row]);
      }
      prepared = [];
      for (const id of lookOrder) {
        const group = groups.get(id);
        if (!group) continue;
        const env: Env = {
          thickness: rows.thickness,
          pitch: rows.pitch,
          top: rows.top,
          left: rows.left,
          right: rows.right,
          ratio,
          rows: Int32Array.from(group),
          ys: Float64Array.from(group, (row) => rowTop(rows, row)),
          showPercent,
        };
        prepared.push(looks[id](g, env));
      }
      if (layer.width !== g.canvas.width || layer.height !== g.canvas.height) {
        layer.width = g.canvas.width;
        layer.height = g.canvas.height;
      }
      layerContext.setTransform(1, 0, 0, 1, 0, 0);
      layerContext.fillStyle = background;
      layerContext.fillRect(0, 0, layer.width, layer.height);
      layerContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      for (const look of prepared) look.under(layerContext);
    },

    draw(progress: Float32Array, time: number) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(layer, 0, 0);
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      for (const look of prepared) look.frame(g, progress, time);
    },
  };
}
