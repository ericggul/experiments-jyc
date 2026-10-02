import type { Point } from "./rig";

export type Reach = { joint: Point; end: Point };

// A rigid two-segment limb reaching from root toward target: the end stops short when the target is out of reach,
// and the middle joint bends to the side of the hint (the stylized pose's elbow or knee).
export function reachLimb(root: Point, target: Point, upper: number, lower: number, hint: Point): Reach {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const span = Math.hypot(dx, dy);
  const ux = span > 1e-6 ? dx / span : 0;
  const uy = span > 1e-6 ? dy / span : 1;
  const distance = Math.max(Math.abs(upper - lower) + 1e-3, Math.min(upper + lower - 1e-3, span));
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const across = Math.sqrt(Math.max(0, upper * upper - along * along));
  const side = ux * (hint.y - root.y) - uy * (hint.x - root.x) < 0 ? -1 : 1;
  return {
    joint: { x: root.x + ux * along - uy * across * side, y: root.y + uy * along + ux * across * side },
    end: { x: root.x + ux * distance, y: root.y + uy * distance },
  };
}
