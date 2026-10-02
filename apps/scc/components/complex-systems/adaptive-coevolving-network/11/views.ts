// Browser-side views of the same people. Every person is drawn twice — once on
// the virtual layer (awareness, news ties) and once on the physical layer
// (health, contacts) — and each view maps both copies to target points. In
// 겹침 the copies coincide; in 층 the layers separate, each a scaled copy of
// the same force layout, so a person sits at matching spots on both.

import type { Body, Frame } from "./layout";

export const VIEWS = [
  { id: "overlay", label: "겹침" },
  { id: "layers", label: "층" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export type ViewLabel = { text: string; x: number; y: number; align: CanvasTextAlign };

/** Copy index in the point arrays: virtual copies first, then physical. */
export const VIRTUAL = 0;
export const PHYSICAL = 1;

/** Offset of a person's copy on `layer` in an x, y point array for `count` people. */
export function pointIndex(layer: number, person: number, count: number) {
  return (layer * count + person) * 2;
}

type Panel = { x: number; y: number; scale: number; width: number; height: number };

/** Side by side when wide (virtual left), stacked when tall (virtual on top). */
export function layerPanels(frame: Frame): readonly [Panel, Panel] {
  const wide = frame.width >= frame.height;
  const gap = Math.min(frame.width, frame.height) * 0.04;
  const width = wide ? (frame.width - gap) / 2 : frame.width;
  const height = wide ? frame.height : (frame.height - gap) / 2;
  const scale = Math.min(width / frame.width, height / frame.height);
  const panel = (offsetX: number, offsetY: number): Panel => ({
    x: offsetX + width / 2,
    y: offsetY + height / 2,
    scale,
    width,
    height,
  });
  return wide
    ? [panel(0, 0), panel(width + gap, 0)]
    : [panel(0, 0), panel(0, height + gap)];
}

/** Writes both copies of every person for `view` into `out` (see pointIndex). */
export function viewTargets(
  view: ViewId,
  bodies: readonly Body[],
  count: number,
  frame: Frame,
  out: Float64Array,
) {
  if (view === "overlay") {
    for (let person = 0; person < count; person += 1) {
      const body = bodies[person]!;
      for (const layer of [VIRTUAL, PHYSICAL]) {
        const index = pointIndex(layer, person, count);
        out[index] = body.x;
        out[index + 1] = body.y;
      }
    }
    return;
  }
  const panels = layerPanels(frame);
  for (const layer of [VIRTUAL, PHYSICAL]) {
    const panel = panels[layer]!;
    for (let person = 0; person < count; person += 1) {
      const body = bodies[person]!;
      const index = pointIndex(layer, person, count);
      out[index] = panel.x + (body.x - frame.width / 2) * panel.scale;
      out[index + 1] = panel.y + (body.y - frame.height / 2) * panel.scale;
    }
  }
}

export function viewLabels(view: ViewId, frame: Frame): ViewLabel[] {
  if (view !== "layers") return [];
  const [virtual, physical] = layerPanels(frame);
  const inset = 14;
  return [
    { text: "소통", x: virtual.x - virtual.width / 2 + inset, y: virtual.y - virtual.height / 2 + inset, align: "left" },
    { text: "접촉", x: physical.x - physical.width / 2 + inset, y: physical.y - physical.height / 2 + inset, align: "left" },
  ];
}
