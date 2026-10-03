import type { Point } from "./rig";

export type Finger = "thumb" | "index" | "middle" | "ring" | "pinky";
export type HandTargets<T extends Point> = { wrist: T | null; tips: Partial<Record<Finger, T>> };

const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const minus = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

// One touch, one finger, on a right hand seen from its back (thumb on the screen's left). `up` is the body's
// screen-space up (unit).
// Two touches: the lower one is the wrist, the upper one the middle fingertip (the full gesture).
// Three or four: the lowest is the wrist; the touch most in line with the hand is the middle fingertip, and the
// others open index then thumb on its left, ring then pinky on its right.
// Five: thumb to pinky from left to right; no touch is the wrist (see inferWrist).
export function assignFingers<T extends Point>(points: readonly T[], up: Point): HandTargets<T> | null {
  if (points.length < 2) return null;
  const right = { x: -up.y, y: up.x };
  if (points.length >= 5) {
    const [thumb, index, middle, ring, pinky] = [...points].sort((a, b) => dot(a, right) - dot(b, right));
    return { wrist: null, tips: { thumb, index, middle, ring, pinky } };
  }
  const byHeight = [...points].sort((a, b) => dot(a, up) - dot(b, up));
  const wrist = byHeight[0]!;
  const rest = byHeight.slice(1);
  const alignment = (point: Point) => {
    const offset = minus(point, wrist);
    return dot(offset, up) / (Math.hypot(offset.x, offset.y) || 1);
  };
  const middle = rest.reduce((best, point) => (alignment(point) > alignment(best) ? point : best));
  const side = (point: Point) => dot(minus(point, middle), right);
  const left = rest.filter((point) => point !== middle && side(point) < 0).sort((a, b) => side(b) - side(a));
  const rightSide = rest.filter((point) => point !== middle && side(point) >= 0).sort((a, b) => side(a) - side(b));
  const tips: Partial<Record<Finger, T>> = { middle };
  (["index", "thumb"] as const).forEach((finger, order) => {
    if (left[order]) tips[finger] = left[order];
  });
  (["ring", "pinky"] as const).forEach((finger, order) => {
    if (rightSide[order]) tips[finger] = rightSide[order];
  });
  return { wrist, tips };
}

// A wrist below the fingertips, as far as a hand that wide is long.
export function inferWrist(tips: readonly Point[], up: Point): Point {
  const right = { x: -up.y, y: up.x };
  const center = tips.reduce((sum, point) => ({ x: sum.x + point.x / tips.length, y: sum.y + point.y / tips.length }), { x: 0, y: 0 });
  const sides = tips.map((point) => dot(point, right));
  const reach = (Math.max(...sides) - Math.min(...sides)) * 1.15;
  return { x: center.x - up.x * reach, y: center.y - up.y * reach };
}
