import type { EyeRatios, Point } from "./gaze";

function projectEye(eye: Point): Point {
  // Front-camera landmarks are not mirrored in the video fed to MediaPipe.
  // Eye movement in camera x therefore points opposite to screen x.
  return {
    x: 0.5 - 0.5 * Math.tanh((eye.x - 0.5) * 10),
    y: Math.min(1, Math.max(0, eye.y)),
  };
}

export function projectGaze(eyes: EyeRatios): EyeRatios {
  return { left: projectEye(eyes.left), right: projectEye(eyes.right) };
}
