import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_SECOND, createColony, stepColony } from "../model/index.ts";
import { createBodies, updateBodies } from "./bodies.ts";

const FRAME = 1 / 24;

type Trace = { x: number; y: number; px?: number; py?: number; heading: number; born: number };

test("drawn bodies of every size move without jumps at 24 fps", () => {
  const colony = createColony(7);
  const bodies = createBodies();
  const traces = new Map<number, Trace>();
  let carried = 0;
  let worstAcceleration = 0;
  let worstMove = 0;
  let worstTurn = 0;
  let divisions = 0;

  for (let frame = 0; frame < 24 * 25; frame += 1) {
    carried += FRAME * TICKS_PER_SECOND;
    while (carried >= 1) {
      stepColony(colony);
      carried -= 1;
    }
    updateBodies(bodies, colony, carried, FRAME);
    for (const body of bodies.list) {
      const last = traces.get(body.id);
      if (last && last.born === body.born) {
        // Measured in the body's own radii: sizes span more than tenfold.
        worstMove = Math.max(worstMove, Math.hypot(body.x - last.x, body.y - last.y) / body.radius);
        if (last.px !== undefined && last.py !== undefined) {
          const ax = body.x - 2 * last.x + last.px;
          const ay = body.y - 2 * last.y + last.py;
          worstAcceleration = Math.max(worstAcceleration, Math.hypot(ax, ay) / body.radius);
        }
        worstTurn = Math.max(worstTurn, Math.abs(Math.atan2(Math.sin(body.heading - last.heading), Math.cos(body.heading - last.heading))));
        traces.set(body.id, { x: body.x, y: body.y, px: last.x, py: last.y, heading: body.heading, born: body.born });
      } else {
        if (last) divisions += 1;
        traces.set(body.id, { x: body.x, y: body.y, heading: body.heading, born: body.born });
      }
    }
  }

  assert.ok(divisions > 50, `divisions ${divisions}`);
  assert.ok(worstAcceleration < 0.15, `worst velocity change ${worstAcceleration.toFixed(3)} own radii per frame²`);
  assert.ok(worstMove < 0.5, `worst move ${worstMove.toFixed(3)} own radii per frame`);
  assert.ok(worstTurn < 0.11, `worst turn ${worstTurn.toFixed(3)} rad`);
});

test("a parent re-anchors onto the half its dividing shape already drew", () => {
  const colony = createColony(7);
  const bodies = createBodies();
  for (let t = 0; t < 200; t += 1) {
    stepColony(colony);
    updateBodies(bodies, colony, 0, 1 / TICKS_PER_SECOND);
  }
  for (const body of bodies.list) {
    const slot = Array.from(colony.id.subarray(0, colony.count)).indexOf(body.id);
    if (slot < 0 || colony.born[slot] !== colony.tick - 1) continue;
    assert.ok(Math.hypot(body.x - colony.x[slot], body.y - colony.y[slot]) < 1e-6);
  }
});
