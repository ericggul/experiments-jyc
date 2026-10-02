// Browser-side views of the same model state. Each view maps every person to
// a target point; the screen eases displayed points toward those targets, so
// switching views and opinion changes inside a view both read as motion.

import type { Body, Frame } from "./layout";
import type { EchoNetwork } from "./model";

export const VIEWS = [
  { id: "opinion", label: "의견" },
  { id: "network", label: "대화망" },
  { id: "distribution", label: "분포" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export type ViewLabel = { text: string; x: number; y: number; align: CanvasTextAlign };

/** How visible recent contacts are in each view. */
export const CONTACT_VISIBILITY: Record<ViewId, number> = {
  opinion: 1,
  network: 1,
  distribution: 0.4,
};

/** Opinion at which a person is about three quarters of the way to the edge. */
const OPINION_SCALE = 2.5;
const MAX_UNIT = 0.985;

/** Screen position along the opinion axis in [−1, 1]; compresses the heavy tail. */
export function opinionToUnit(opinion: number) {
  return Math.sign(opinion) * Math.tanh(Math.abs(opinion) / OPINION_SCALE);
}

export function unitToOpinion(unit: number) {
  const clamped = Math.max(-MAX_UNIT, Math.min(MAX_UNIT, unit));
  return Math.sign(clamped) * OPINION_SCALE * Math.atanh(Math.abs(clamped));
}

/** Deterministic offset in [−0.5, 0.5) so equal values do not stack. */
function jitter(person: number, salt: number) {
  const value = Math.sin(person * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value) - 0.5;
}

/** Horizontal extent of the opinion axis and the vertical band it uses. */
export function axisGeometry(frame: Frame) {
  const inset = Math.max(20, frame.width * 0.05);
  const centre = frame.width / 2;
  const half = centre - inset;
  const top = Math.max(48, frame.height * 0.14);
  const bottom = frame.height - Math.max(28, frame.height * 0.06);
  return { centre, half, top, bottom };
}

/** Screen x for an opinion in the opinion and distribution views. */
export function opinionX(frame: Frame, opinion: number) {
  const { centre, half } = axisGeometry(frame);
  return centre + opinionToUnit(opinion) * half;
}

/** Height in [0, 1] for an activity, logarithmic from `least` to 1. */
function activityHeight(activity: number, least: number) {
  return least >= 1 ? 1 : Math.log(activity / least) / Math.log(1 / least);
}

/** Writes each person's target point for `view` into `out` as x, y pairs. */
export function viewTargets(
  view: ViewId,
  network: EchoNetwork,
  bodies: readonly Body[],
  frame: Frame,
  dotSpacing: number,
  out: Float64Array,
) {
  const count = network.size;
  if (view === "network") {
    for (let person = 0; person < count; person += 1) {
      out[person * 2] = bodies[person]!.x;
      out[person * 2 + 1] = bodies[person]!.y;
    }
    return;
  }

  const { top, bottom } = axisGeometry(frame);
  if (view === "opinion") {
    // Opinion across; activity up, so the talkative few sit on top.
    let least = 1;
    for (let person = 0; person < count; person += 1) least = Math.min(least, network.activity[person]!);
    for (let person = 0; person < count; person += 1) {
      const height = activityHeight(network.activity[person]!, least) * 0.9 + 0.05 + jitter(person, 1) * 0.1;
      out[person * 2] = opinionX(frame, network.opinion[person]!);
      out[person * 2 + 1] = bottom - Math.max(0, Math.min(1, height)) * (bottom - top);
    }
    return;
  }

  // Distribution: one column of stacked dots per opinion bin, ordered by id.
  const columns = new Map<number, number>();
  let tallest = 1;
  const column = new Int32Array(count);
  const level = new Int32Array(count);
  for (let person = 0; person < count; person += 1) {
    const bin = Math.round(opinionX(frame, network.opinion[person]!) / dotSpacing);
    const height = columns.get(bin) ?? 0;
    column[person] = bin;
    level[person] = height;
    columns.set(bin, height + 1);
    tallest = Math.max(tallest, height + 1);
  }
  const step = Math.min(dotSpacing, (bottom - top) / tallest);
  for (let person = 0; person < count; person += 1) {
    out[person * 2] = column[person]! * dotSpacing;
    out[person * 2 + 1] = bottom - (level[person]! + 0.5) * step;
  }
}

export function viewLabels(view: ViewId, frame: Frame): ViewLabel[] {
  if (view === "opinion") {
    const { centre, half, top } = axisGeometry(frame);
    return [{ text: "말이 많을수록 위", x: centre - half, y: top - 18, align: "left" }];
  }
  return [];
}
