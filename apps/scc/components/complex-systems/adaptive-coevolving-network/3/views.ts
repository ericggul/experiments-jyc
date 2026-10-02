// Browser-side views of the same model state. Each view maps every player to
// a target point; the screen eases displayed points toward those targets, so
// switching views and state changes inside a view both read as motion.

import type { Body, Frame } from "./layout";
import type { CooperationNetwork } from "./model";

export const VIEWS = [
  { id: "network", label: "네트워크" },
  { id: "rank", label: "서열" },
  { id: "payoff", label: "연결과 보수" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export type ViewLabel = { text: string; x: number; y: number; align: CanvasTextAlign };

/** How visible standing ties are in each view; ties to defectors keep a floor. */
export const TIE_VISIBILITY: Record<ViewId, number> = {
  network: 1,
  rank: 0.4,
  payoff: 0.08,
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Both axes of the payoff view and the rank view share this square-root scale. */
export const SCALE_MAX = 64;

/** Deterministic offset in [−0.5, 0.5) so equal integer values do not stack. */
function jitter(player: number, salt: number) {
  const value = Math.sin(player * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value) - 0.5;
}

/** Same payoff as the model: 1 or b per cooperating neighbour. */
function earned(network: CooperationNetwork, player: number, temptation: number) {
  return (network.strategy[player] === "C" ? 1 : temptation) * network.cooperativeNeighbours[player]!;
}

function scaled(value: number) {
  return Math.sqrt(Math.min(SCALE_MAX, Math.max(0, value)) / SCALE_MAX);
}

function rankRadius(frame: Frame) {
  return Math.min(frame.width, frame.height) * 0.44;
}

/** A square plot, so a cooperator earning 1 per tie sits on the diagonal. */
function payoffGeometry(frame: Frame) {
  const side = Math.min(frame.width - 88, frame.height - 96);
  const left = (frame.width - side) / 2 + 12;
  const top = (frame.height - side) / 2 - 4;
  return { left, right: left + side, top, bottom: top + side };
}

/** Writes each player's target point for `view` into `out` as x, y pairs. */
export function viewTargets(
  view: ViewId,
  network: CooperationNetwork,
  temptation: number,
  bodies: readonly Body[],
  frame: Frame,
  out: Float64Array,
) {
  const count = network.size;
  if (view === "network") {
    for (let player = 0; player < count; player += 1) {
      out[player * 2] = bodies[player]!.x;
      out[player * 2 + 1] = bodies[player]!.y;
    }
    return;
  }

  if (view === "rank") {
    // Distance from the centre falls with payoff, so copying runs inward-out.
    const radius = rankRadius(frame);
    for (let player = 0; player < count; player += 1) {
      const reach = 0.05 + 0.95 * (1 - scaled(earned(network, player, temptation)));
      const angle = player * GOLDEN_ANGLE;
      out[player * 2] = frame.width / 2 + Math.cos(angle) * radius * reach;
      out[player * 2 + 1] = frame.height / 2 + Math.sin(angle) * radius * reach;
    }
    return;
  }

  // Payoff: ties across, payoff up.
  const { left, right, top, bottom } = payoffGeometry(frame);
  for (let player = 0; player < count; player += 1) {
    const ties = network.incident[player]!.length + jitter(player, 1) * 0.5;
    const value = earned(network, player, temptation) + jitter(player, 2) * 0.5;
    out[player * 2] = left + scaled(ties) * (right - left);
    out[player * 2 + 1] = bottom - scaled(value) * (bottom - top);
  }
}

export function viewLabels(view: ViewId, frame: Frame): ViewLabel[] {
  if (view === "rank") {
    const radius = rankRadius(frame);
    return [{ text: "가운데일수록 많이 벌어 따라 할 대상", x: frame.width / 2, y: frame.height / 2 + radius + 18, align: "center" }];
  }
  if (view === "payoff") {
    const { left, right, top, bottom } = payoffGeometry(frame);
    return [
      { text: `연결 수 → ${SCALE_MAX}`, x: right, y: bottom + 22, align: "right" },
      { text: "0", x: left, y: bottom + 22, align: "left" },
      { text: `보수 ${SCALE_MAX} ↑`, x: left - 8, y: top - 14, align: "left" },
    ];
  }
  return [];
}
