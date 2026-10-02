// Browser-side views of the same model state. Each view maps every node to a
// target point; the screen eases displayed points toward those targets, so
// switching views and state changes inside a view both read as motion.

import type { Body, Frame } from "./layout";
import type { ThresholdNetwork } from "./model";

export const VIEWS = [
  { id: "network", label: "네트워크" },
  { id: "inputs", label: "입력 수" },
  { id: "activity", label: "멈춤·깜빡임" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export type ViewLabel = { text: string; x: number; y: number; align: CanvasTextAlign };

/** How visible standing links are in each view. */
export const LINK_VISIBILITY: Record<ViewId, number> = {
  network: 1,
  inputs: 0.2,
  activity: 0.45,
};

/** Inputs at or beyond this share the last column. */
export const INPUT_MAX = 10;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** A fixed, evenly spread spot in the unit disc for each node. */
function home(node: number, count: number) {
  const radius = Math.sqrt((node + 0.5) / Math.max(1, count));
  const angle = node * GOLDEN_ANGLE;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function separateGeometry(frame: Frame) {
  const wide = frame.width >= frame.height;
  const radius = wide
    ? Math.min(frame.width * 0.2, frame.height * 0.36)
    : Math.min(frame.width * 0.38, frame.height * 0.2);
  const still = wide
    ? { x: frame.width * 0.29, y: frame.height / 2 }
    : { x: frame.width / 2, y: frame.height * 0.28 };
  const blinking = wide
    ? { x: frame.width * 0.71, y: frame.height / 2 }
    : { x: frame.width / 2, y: frame.height * 0.72 };
  return { radius, still, blinking };
}

function columnGeometry(frame: Frame) {
  const left = Math.max(24, frame.width * 0.08);
  const right = frame.width - Math.max(24, frame.width * 0.08);
  const top = Math.max(40, frame.height * 0.1);
  const bottom = frame.height - Math.max(36, frame.height * 0.08);
  const column = (right - left) / (INPUT_MAX + 1);
  return { left, right, top, bottom, column };
}

/**
 * Writes each node's target point for `view` into `out` as x, y pairs.
 * `active[node]` is 1 for a node that changed within the frozen window.
 */
export function viewTargets(
  view: ViewId,
  network: ThresholdNetwork,
  active: ArrayLike<number>,
  bodies: readonly Body[],
  frame: Frame,
  out: Float64Array,
) {
  const count = network.size;
  if (view === "network") {
    for (let node = 0; node < count; node += 1) {
      out[node * 2] = bodies[node]!.x;
      out[node * 2 + 1] = bodies[node]!.y;
    }
    return;
  }

  if (view === "activity") {
    // Each group fills a disc whose area follows its share of nodes.
    const { radius, still, blinking } = separateGeometry(frame);
    let moved = 0;
    for (let node = 0; node < count; node += 1) moved += active[node] ? 1 : 0;
    const stillRadius = radius * Math.max(0.2, Math.sqrt((count - moved) / Math.max(1, count)));
    const blinkingRadius = radius * Math.max(0.2, Math.sqrt(moved / Math.max(1, count)));
    for (let node = 0; node < count; node += 1) {
      const spot = home(node, count);
      const moving = active[node] === 1;
      const centre = moving ? blinking : still;
      const scale = moving ? blinkingRadius : stillRadius;
      out[node * 2] = centre.x + spot.x * scale;
      out[node * 2 + 1] = centre.y + spot.y * scale;
    }
    return;
  }

  // Inputs: one column per number of inputs, stacked upward, frozen nodes
  // below blinking ones, so the columns form a histogram of K split by activity.
  const { left, top, bottom, column } = columnGeometry(frame);
  const heights = new Array<number>(INPUT_MAX + 1).fill(0);
  const columnOf = (node: number) => Math.min(INPUT_MAX, network.inputs[node]!.length);
  for (let node = 0; node < count; node += 1) heights[columnOf(node)]! += 1;
  const tallest = Math.max(1, ...heights);
  const row = Math.min(column * 0.6, (bottom - top) / tallest);
  heights.fill(0);
  for (const moving of [false, true]) {
    for (let node = 0; node < count; node += 1) {
      if ((active[node] === 1) !== moving) continue;
      const index = columnOf(node);
      out[node * 2] = left + (index + 0.5) * column;
      out[node * 2 + 1] = bottom - (heights[index]! + 0.5) * row;
      heights[index]! += 1;
    }
  }
}

export function viewLabels(view: ViewId, frame: Frame): ViewLabel[] {
  if (view === "activity") {
    const { radius, still, blinking } = separateGeometry(frame);
    return [
      { text: "멈춤", x: still.x, y: still.y - radius - 14, align: "center" },
      { text: "깜빡임", x: blinking.x, y: blinking.y - radius - 14, align: "center" },
    ];
  }
  if (view === "inputs") {
    const { left, right, bottom, column } = columnGeometry(frame);
    return [
      { text: "0", x: left + column * 0.5, y: bottom + 22, align: "center" },
      { text: `입력 연결 수 → ${INPUT_MAX}+`, x: right, y: bottom + 22, align: "right" },
    ];
  }
  return [];
}
