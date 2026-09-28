import type { Point } from "./gaze";

export function placeInViewport(point: Point, width: number, height: number): Point {
  return {
    x: Math.min(width, Math.max(0, point.x * width)),
    y: Math.min(height, Math.max(0, point.y * height)),
  };
}
