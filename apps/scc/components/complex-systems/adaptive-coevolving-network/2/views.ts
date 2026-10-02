// Browser-side views of the same model state. Each view maps every person to
// a target point; the screen eases displayed points toward those targets, so
// switching views and state changes inside a view both read as motion.

import type { Body, Frame } from "./layout";
import type { EpidemicNetwork } from "./model";

export const VIEWS = [
  { id: "network", label: "네트워크" },
  { id: "separate", label: "분리" },
  { id: "degree", label: "연결 수" },
  { id: "exposure", label: "노출" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export type ViewLabel = { text: string; x: number; y: number; align: CanvasTextAlign };

/** How visible standing ties are in each view; exposure ties keep a floor. */
export const TIE_VISIBILITY: Record<ViewId, number> = {
  network: 1,
  separate: 1,
  degree: 0.35,
  exposure: 0.1,
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const EXPOSURE_MAX = 8;
const DEGREE_MAX = 20;

/** A fixed, evenly spread spot in the unit disc for each person. */
function home(person: number, count: number) {
  const radius = Math.sqrt((person + 0.5) / Math.max(1, count));
  const angle = person * GOLDEN_ANGLE;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/** Deterministic offset in [−0.5, 0.5) so equal integer values do not stack. */
function jitter(person: number, salt: number) {
  const value = Math.sin(person * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value) - 0.5;
}

function infectedNeighbours(network: EpidemicNetwork, person: number) {
  let count = 0;
  for (const tieId of network.incident[person]!) {
    const tie = network.ties[tieId]!;
    const other = tie.a === person ? tie.b : tie.a;
    if (network.health[other] === "I") count += 1;
  }
  return count;
}

function separateGeometry(frame: Frame) {
  const wide = frame.width >= frame.height;
  const radius = wide
    ? Math.min(frame.width * 0.2, frame.height * 0.4)
    : Math.min(frame.width * 0.4, frame.height * 0.2);
  const healthy = wide
    ? { x: frame.width * 0.29, y: frame.height / 2 }
    : { x: frame.width / 2, y: frame.height * 0.28 };
  const infected = wide
    ? { x: frame.width * 0.71, y: frame.height / 2 }
    : { x: frame.width / 2, y: frame.height * 0.72 };
  return { radius, healthy, infected };
}

function exposureGeometry(frame: Frame) {
  const left = Math.max(44, frame.width * 0.1);
  const right = frame.width - Math.max(24, frame.width * 0.06);
  const top = Math.max(40, frame.height * 0.08);
  const bottom = frame.height - Math.max(36, frame.height * 0.08);
  return { left, right, top, bottom };
}

/** Writes each person's target point for `view` into `out` as x, y pairs. */
export function viewTargets(
  view: ViewId,
  network: EpidemicNetwork,
  bodies: readonly Body[],
  frame: Frame,
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

  if (view === "separate") {
    // Each group fills a disc whose area follows its share of people.
    const { radius, healthy, infected } = separateGeometry(frame);
    let ill = 0;
    for (let person = 0; person < count; person += 1) if (network.health[person] === "I") ill += 1;
    const healthyRadius = radius * Math.max(0.25, Math.sqrt((count - ill) / Math.max(1, count)));
    const illRadius = radius * Math.max(0.25, Math.sqrt(ill / Math.max(1, count)));
    for (let person = 0; person < count; person += 1) {
      const spot = home(person, count);
      const isIll = network.health[person] === "I";
      const centre = isIll ? infected : healthy;
      const scale = isIll ? illRadius : healthyRadius;
      out[person * 2] = centre.x + spot.x * scale;
      out[person * 2 + 1] = centre.y + spot.y * scale;
    }
    return;
  }

  if (view === "degree") {
    // Distance from the centre falls with the number of ties.
    const radius = Math.min(frame.width, frame.height) * 0.44;
    for (let person = 0; person < count; person += 1) {
      const degree = network.incident[person]!.length;
      const reach = 0.06 + 0.94 * (1 - Math.min(1, degree / DEGREE_MAX));
      const angle = person * GOLDEN_ANGLE;
      out[person * 2] = frame.width / 2 + Math.cos(angle) * radius * reach;
      out[person * 2 + 1] = frame.height / 2 + Math.sin(angle) * radius * reach;
    }
    return;
  }

  // Exposure: infected neighbours across, ties up.
  const { left, right, top, bottom } = exposureGeometry(frame);
  for (let person = 0; person < count; person += 1) {
    const exposure = Math.min(EXPOSURE_MAX, infectedNeighbours(network, person) + jitter(person, 1) * 0.6);
    const degree = Math.min(DEGREE_MAX, network.incident[person]!.length + jitter(person, 2) * 0.6);
    out[person * 2] = left + ((exposure + 0.3) / (EXPOSURE_MAX + 0.6)) * (right - left);
    out[person * 2 + 1] = bottom - ((degree + 0.3) / (DEGREE_MAX + 0.6)) * (bottom - top);
  }
}

export function viewLabels(view: ViewId, frame: Frame): ViewLabel[] {
  if (view === "separate") {
    const { radius, healthy, infected } = separateGeometry(frame);
    return [
      { text: "건강", x: healthy.x, y: healthy.y - radius - 14, align: "center" },
      { text: "감염", x: infected.x, y: infected.y - radius - 14, align: "center" },
    ];
  }
  if (view === "degree") {
    const radius = Math.min(frame.width, frame.height) * 0.44;
    return [{ text: `가운데일수록 연결이 많음 (${DEGREE_MAX}개 이상은 중심)`, x: frame.width / 2, y: frame.height / 2 + radius + 18, align: "center" }];
  }
  if (view === "exposure") {
    const { left, right, top, bottom } = exposureGeometry(frame);
    return [
      { text: `감염된 이웃 수 → ${EXPOSURE_MAX}`, x: right, y: bottom + 22, align: "right" },
      { text: "0", x: left, y: bottom + 22, align: "left" },
      { text: `연결 수 ${DEGREE_MAX} ↑`, x: left - 8, y: top - 12, align: "left" },
    ];
  }
  return [];
}
