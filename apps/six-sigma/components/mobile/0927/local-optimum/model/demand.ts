import { NODE_COUNT, type Point } from "./coupled-map.ts";
import { clampParameter, dynamics, type Plane } from "./dynamics.ts";

// Shared field geometry: the viewBox is 400 × 400 and the nodes keep the K6
// baseline's angles.
export const CENTRE = 200;
export const DEAD_ZONE = 40;
export const OUTER_REACH = 190;

export const angles = Array.from({ length: NODE_COUNT }, (_, id) => (id * Math.PI) / 3 - Math.PI / 2);

// 1D: the state is the node's distance from the centre along its own ray.
const RAY_INNER = 20;
const RAY_SPAN = 170;

// 2D: the displacement from the rest point, rotated into each node's own
// frame (local +x points outward along its ray), scaled around a hexagonal
// anchor, and softly compressed so every position stays inside one disc.
const ANCHOR = 120;
const PLANE_SCALE = 80;
const KNEE = 150;

function compress(radius: number) {
  if (radius <= KNEE) return radius;
  const room = OUTER_REACH - KNEE;
  return KNEE + room * Math.tanh((radius - KNEE) / room);
}

export function positionFor(plane: Plane, node: number, state: Point): Point {
  const angle = angles[node];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  if (plane === "1d") {
    const radius = RAY_INNER + RAY_SPAN * state.x;
    return { x: CENTRE + radius * cos, y: CENTRE + radius * sin };
  }
  const { rest } = dynamics["2d"];
  const dx = (state.x - rest.x) * PLANE_SCALE;
  const dy = (state.y - rest.y) * PLANE_SCALE;
  const x = ANCHOR * cos + dx * cos - dy * sin;
  const y = ANCHOR * sin + dx * sin + dy * cos;
  const radius = Math.hypot(x, y);
  const scale = radius > 0 ? compress(radius) / radius : 1;
  return { x: CENTRE + x * scale, y: CENTRE + y * scale };
}

export function restReach(plane: Plane) {
  const { x, y } = positionFor(plane, 0, dynamics[plane].rest);
  return Math.hypot(x - CENTRE, y - CENTRE);
}

// A finger resting on a node's rest position leaves it unchanged; pulling
// outward demands more, pushing inward demands less.
export function parameterForReach(plane: Plane, reach: number) {
  const { base, max } = dynamics[plane];
  const rest = restReach(plane);
  return clampParameter(plane, base + ((reach - rest) * (max - base)) / (OUTER_REACH - rest));
}

// Six equal sectors around the nodes' rays, so a continuous stroke around the
// centre selects every node it passes.
export function demandAt(plane: Plane, x: number, y: number): { node: number; parameter: number } | null {
  const dx = x - CENTRE;
  const dy = y - CENTRE;
  const reach = Math.hypot(dx, dy);
  if (reach < DEAD_ZONE) return null;
  const turn = (Math.atan2(dy, dx) + Math.PI / 2) / (Math.PI / 3);
  const node = ((Math.round(turn) % NODE_COUNT) + NODE_COUNT) % NODE_COUNT;
  return { node, parameter: parameterForReach(plane, reach) };
}
