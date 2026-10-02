// Browser-side views of the same model state. Each view maps every person to
// a target point; the screen eases displayed points toward those targets, so
// switching views and opinion changes inside a view both read as motion.
//
// 의견 keeps the force layout's height and replaces the horizontal position
// with the opinion, so switching between it and 네트워크 is purely sideways
// motion: people slide to what they think. 궤적 puts everyone on one row at the
// top and lets their recent opinions trail downward.

import type { Body, Frame } from "./layout";
import type { OpinionNetwork } from "./model";

export const VIEWS = [
  { id: "opinion", label: "의견" },
  { id: "network", label: "네트워크" },
  { id: "trace", label: "궤적" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export type ViewLabel = { text: string; x: number; y: number; align: CanvasTextAlign };

/**
 * How much each layer shows in each view: standing ties and cut marks, the
 * tolerance bracket (only where horizontal position means opinion), and the
 * opinion trails.
 */
export const VIEW_MIX: Record<ViewId, { ties: number; axis: number; trace: number }> = {
  opinion: { ties: 1, axis: 1, trace: 0 },
  network: { ties: 1, axis: 0, trace: 0 },
  trace: { ties: 0, axis: 1, trace: 1 },
};

/** Seconds of screen time the trace view keeps. */
export const TRACE_SECONDS = 30;

export type Axis = { left: number; right: number; top: number; bottom: number };

/** The opinion axis spans the field with a margin; it is shared by every view. */
export function opinionAxis(frame: Frame): Axis {
  const side = Math.max(20, frame.width * 0.06);
  return {
    left: side,
    right: frame.width - side,
    top: Math.max(32, frame.height * 0.07),
    bottom: frame.height - Math.max(28, frame.height * 0.05),
  };
}

export function opinionToX(axis: Axis, opinion: number) {
  return axis.left + opinion * (axis.right - axis.left);
}

export function xToOpinion(axis: Axis, x: number) {
  return Math.min(1, Math.max(0, (x - axis.left) / Math.max(1, axis.right - axis.left)));
}

/** Writes each person's target point for `view` into `out` as x, y pairs. */
export function viewTargets(
  view: ViewId,
  network: OpinionNetwork,
  bodies: readonly Body[],
  frame: Frame,
  out: Float64Array,
) {
  const count = network.size;
  const axis = opinionAxis(frame);
  for (let person = 0; person < count; person += 1) {
    const body = bodies[person]!;
    if (view === "network") {
      out[person * 2] = body.x;
      out[person * 2 + 1] = body.y;
    } else {
      out[person * 2] = opinionToX(axis, network.opinions[person]!);
      out[person * 2 + 1] = view === "opinion" ? body.y : axis.top;
    }
  }
}

export function viewLabels(view: ViewId, frame: Frame): ViewLabel[] {
  if (view !== "trace") return [];
  const { left, top, bottom } = opinionAxis(frame);
  return [
    { text: "지금", x: left, y: top - 16, align: "left" },
    { text: `${TRACE_SECONDS}초 전`, x: left, y: bottom + 14, align: "left" },
  ];
}
