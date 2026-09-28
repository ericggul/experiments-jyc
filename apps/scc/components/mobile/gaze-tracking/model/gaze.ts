import type { Category, NormalizedLandmark } from "@mediapipe/tasks-vision";

export type Eye = "left" | "right";
export type Point = { x: number; y: number };
export type EyeRatios = Record<Eye, Point>;

const EYES = {
  right: { iris: 468, corners: [33, 133], lids: [159, 145] },
  left: { iris: 473, corners: [362, 263], lids: [386, 374] },
} as const;

function eyeRatio(landmarks: NormalizedLandmark[], eye: Eye, videoAspect: number): Point | null {
  if (!Number.isFinite(videoAspect) || videoAspect <= 0) return null;
  const { iris, corners, lids } = EYES[eye];
  const pupil = landmarks[iris];
  const a = landmarks[corners[0]];
  const b = landmarks[corners[1]];
  const upper = landmarks[lids[0]];
  const lower = landmarks[lids[1]];
  if (!pupil || !a || !b || !upper || !lower) return null;

  // MediaPipe x/y are normalized independently. Measure in video pixel proportions.
  const dx = (b.x - a.x) * videoAspect;
  const dy = b.y - a.y;
  const width = Math.hypot(dx, dy);
  const lidOpening = Math.hypot((lower.x - upper.x) * videoAspect, lower.y - upper.y);
  if (width < 0.012 * videoAspect || lidOpening / width < 0.1) return null;

  const px = (pupil.x - (a.x + b.x) / 2) * videoAspect;
  const py = pupil.y - (a.y + b.y) / 2;
  const along = (px * dx + py * dy) / (width * width);
  // Eye lids move with downward gaze. The perpendicular distance from the
  // stable eye corners retains that motion instead of dividing it away.
  const lidTop = Math.min(upper.y, lower.y);
  const lidHeight = Math.abs(upper.y - lower.y);

  return {
    x: 0.5 + along * Math.sign(dx),
    y: (pupil.y - lidTop) / lidHeight,
  };
}

export function readEyeRatios(landmarks: NormalizedLandmark[], videoAspect = 1, blendshapes: Category[] = []): EyeRatios | null {
  const left = eyeRatio(landmarks, "left", videoAspect);
  const right = eyeRatio(landmarks, "right", videoAspect);
  if (!left || !right) return null;
  const scores = new Map(blendshapes.map(({ categoryName, score }) => [categoryName, score]));
  for (const eye of ["left", "right"] as const) {
    const down = scores.get(eye === "left" ? "eyeLookDownLeft" : "eyeLookDownRight");
    const up = scores.get(eye === "left" ? "eyeLookUpLeft" : "eyeLookUpRight");
    if (down !== undefined && up !== undefined) {
      const vertical = Math.sqrt(Math.max(0, down)) - Math.sqrt(Math.max(0, up));
      (eye === "left" ? left : right).y = 0.5 + vertical * 0.45;
    }
  }
  return { left, right };
}
