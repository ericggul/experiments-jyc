import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type Eye = "left" | "right";
export type Point = { x: number; y: number };
export type EyeRatios = Record<Eye, Point>;

const EYES = {
  right: { iris: 468, corners: [33, 133], lids: [159, 145] },
  left: { iris: 473, corners: [362, 263], lids: [386, 374] },
} as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function eyeRatio(landmarks: NormalizedLandmark[], eye: Eye): Point | null {
  const { iris, corners, lids } = EYES[eye];
  const pupil = landmarks[iris];
  const a = landmarks[corners[0]];
  const b = landmarks[corners[1]];
  const upper = landmarks[lids[0]];
  const lower = landmarks[lids[1]];
  if (!pupil || !a || !b || !upper || !lower) return null;

  const minX = Math.min(a.x, b.x);
  const width = Math.abs(a.x - b.x);
  const minY = Math.min(upper.y, lower.y);
  const height = Math.abs(upper.y - lower.y);
  if (width < 0.012 || height / width < 0.1) return null;

  return {
    x: clamp((pupil.x - minX) / width, 0, 1),
    y: clamp((pupil.y - minY) / height, 0, 1),
  };
}

export function readEyeRatios(landmarks: NormalizedLandmark[]): EyeRatios | null {
  const left = eyeRatio(landmarks, "left");
  const right = eyeRatio(landmarks, "right");
  return left && right ? { left, right } : null;
}

export function projectGaze(ratio: Point, center: Point = { x: 0.5, y: 0.5 }): Point {
  // A front-facing camera reverses the person's horizontal movement in its image.
  return {
    x: clamp(0.5 - (ratio.x - center.x) * 2.35, 0.07, 0.93),
    y: clamp(0.5 + (ratio.y - center.y) * 1.65, 0.09, 0.91),
  };
}
