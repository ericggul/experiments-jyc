import type { Point } from "./model/gaze";

export function easePoint(current: Point, target: Point, elapsedMs: number): Point {
  // Time-based damping keeps the same feel at 60 Hz and on lower-refresh phones.
  const step = Math.min(50, Math.max(0, elapsedMs));
  const amount = 1 - Math.exp(-step / 105);
  return {
    x: current.x + (target.x - current.x) * amount,
    y: current.y + (target.y - current.y) * amount,
  };
}
