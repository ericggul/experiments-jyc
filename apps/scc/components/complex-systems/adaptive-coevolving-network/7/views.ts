// Browser-side views. 네트워크 follows the force layout; 순위 lines the same
// rank-sized discs up from largest to smallest, wrapping into rows, so the
// ordering and the inequality of rank can be read directly.

import type { Body, Frame } from "./layout";

export const VIEWS = [
  { id: "network", label: "네트워크" },
  { id: "ranking", label: "순위" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

/** How visible links are in each view. */
export const LINK_VISIBILITY: Record<ViewId, number> = { network: 1, ranking: 0.15 };

const GAP = 6;

/** Writes each page's target centre for `view` into `out` as x, y pairs. */
export function viewTargets(
  view: ViewId,
  bodies: readonly Body[],
  radii: ArrayLike<number>,
  rank: ArrayLike<number>,
  count: number,
  frame: Frame,
  out: Float64Array,
) {
  if (view === "network") {
    for (let page = 0; page < count; page += 1) {
      out[page * 2] = bodies[page]!.x;
      out[page * 2 + 1] = bodies[page]!.y;
    }
    return;
  }
  const order = Array.from({ length: count }, (_, page) => page).sort((a, b) => rank[b]! - rank[a]! || a - b);
  const margin = Math.max(16, frame.width * 0.05);
  const rows: { pages: number[]; height: number }[] = [];
  let row: number[] = [];
  let used = 0;
  let height = 0;
  for (const page of order) {
    const diameter = radii[page]! * 2;
    if (row.length > 0 && used + diameter + GAP > frame.width - margin * 2) {
      rows.push({ pages: row, height });
      row = [];
      used = 0;
      height = 0;
    }
    row.push(page);
    used += diameter + GAP;
    height = Math.max(height, diameter);
  }
  if (row.length > 0) rows.push({ pages: row, height });
  const total = rows.reduce((sum, entry) => sum + entry.height + GAP * 2, 0);
  let y = Math.max(margin, (frame.height - total) / 2);
  for (const entry of rows) {
    let x = margin;
    for (const page of entry.pages) {
      const r = radii[page]!;
      out[page * 2] = x + r;
      // Discs in a row share a baseline, so their heights compare like bars.
      out[page * 2 + 1] = y + entry.height - r;
      x += r * 2 + GAP;
    }
    y += entry.height + GAP * 2;
  }
}
