// Browser-side views of the same model state. Each view maps every person to
// a target point; the screen eases displayed points toward those targets, so
// switching views and camp changes inside a view both read as motion.
//
// The circle and matrix order people by camp (from `factions`) and then by
// id, so a balanced network shows as two arcs or two diagonal blocks, and a
// person who changes camp travels to the other arc or block.

import type { Body, Frame } from "./layout";

export const VIEWS = [
  { id: "network", label: "관계망" },
  { id: "circle", label: "원" },
  { id: "matrix", label: "행렬" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

/** How visible relationship lines and matrix cells are in each view. */
export const LINE_VISIBILITY: Record<ViewId, number> = { network: 1, circle: 1, matrix: 0 };
export const CELL_VISIBILITY: Record<ViewId, number> = { network: 0, circle: 0, matrix: 1 };

/** People in camp +1 first, then camp −1, each by id. */
export function campOrder(camps: Int8Array, count: number) {
  const order: number[] = [];
  for (const camp of [1, -1]) {
    for (let person = 0; person < count; person += 1) if ((camps[person] ?? 1) === camp) order.push(person);
  }
  return order;
}

/** Side length and top-left corner of the matrix square. */
export function matrixGeometry(frame: Frame, count: number) {
  const side = Math.min(frame.width, frame.height) * 0.84;
  const cell = side / Math.max(1, count);
  return { cell, left: (frame.width - side) / 2, top: (frame.height - side) / 2 };
}

/** Writes each person's target point for `view` into `out` as x, y pairs. */
export function viewTargets(
  view: ViewId,
  count: number,
  camps: Int8Array,
  bodies: readonly Body[],
  frame: Frame,
  out: Float64Array,
) {
  if (view === "network") {
    for (let person = 0; person < count; person += 1) {
      out[person * 2] = bodies[person]!.x;
      out[person * 2 + 1] = bodies[person]!.y;
    }
    return;
  }

  const order = campOrder(camps, count);
  if (view === "matrix") {
    // Each person sits on the diagonal; relationship (i, j) is drawn at
    // (x of j, y of i), so the cells move with the people.
    const { cell, left, top } = matrixGeometry(frame, count);
    order.forEach((person, rank) => {
      out[person * 2] = left + (rank + 0.5) * cell;
      out[person * 2 + 1] = top + (rank + 0.5) * cell;
    });
    return;
  }

  // Circle: camp +1 on the left arc, camp −1 on the right, one empty slot
  // between the camps on each side when there are two.
  let first = 0;
  for (const person of order) if ((camps[person] ?? 1) === 1) first += 1;
  const split = first > 0 && first < count;
  const slots = count + (split ? 2 : 0);
  const radius = Math.min(frame.width, frame.height) * 0.42;
  order.forEach((person, rank) => {
    const slot = rank + (split && rank >= first ? 1 : 0) + (split ? 0.5 : 0);
    const angle = Math.PI / 2 + ((slot + 0.5) / slots) * Math.PI * 2;
    out[person * 2] = frame.width / 2 + Math.cos(angle) * radius;
    out[person * 2 + 1] = frame.height / 2 + Math.sin(angle) * radius;
  });
}
