import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export const FEATURE_SIZE = 256;

// Keep the original camera colours in three local patches. The shader pulls a
// thin edge from each patch; the complete features stay in the foreground.
export function updateFeatureAtlas(
  atlas: HTMLCanvasElement,
  _tile: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: NormalizedLandmark[],
  contours: readonly number[][],
) {
  const context = atlas.getContext("2d");
  if (!context || !video.videoWidth || !video.videoHeight) return false;

  for (let feature = 0; feature < contours.length; feature += 1) {
    const points = contours[feature].map((index) => landmarks[index]);
    if (points.some((point) => !point)) return false;
    const xs = points.map((point) => point.x * video.videoWidth);
    const ys = points.map((point) => point.y * video.videoHeight);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const side = Math.min(
      video.videoWidth,
      video.videoHeight,
      Math.max(right - left, bottom - top, 8) * 2.7,
    );
    const sourceX = Math.max(0, Math.min(video.videoWidth - side, (left + right - side) / 2));
    const sourceY = Math.max(0, Math.min(video.videoHeight - side, (top + bottom - side) / 2));
    context.drawImage(
      video,
      sourceX,
      sourceY,
      side,
      side,
      feature * FEATURE_SIZE,
      0,
      FEATURE_SIZE,
      FEATURE_SIZE,
    );
  }
  return true;
}
