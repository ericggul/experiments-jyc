import type { FeatureGeometry } from "./feature-atlas";

// One sRGB colour matrix grades both layers: the shader applies it to the
// field, and the same numbers are applied to the foreground cutout pixels.
const CONTRAST = 1.16;
const SATURATION = 1.14;
export const GRADE_OFFSET = 0.5 * (1 - CONTRAST);
export const IDENTITY_GAINS = [1, 1, 1] as const;

// Mean sRGB colour of the eye-and-mouth region from a 16×16 probe.
export function measureFaceTone(
  probe: HTMLCanvasElement,
  video: HTMLVideoElement,
  features: FeatureGeometry[],
) {
  const context = probe.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const { x, y, side } of features) {
    left = Math.min(left, x - side / 2);
    top = Math.min(top, y - side / 2);
    right = Math.max(right, x + side / 2);
    bottom = Math.max(bottom, y + side / 2);
  }
  left = Math.max(0, left);
  top = Math.max(0, top);
  right = Math.min(video.videoWidth, right);
  bottom = Math.min(video.videoHeight, bottom);
  if (right - left < 4 || bottom - top < 4) return null;
  context.drawImage(video, left, top, right - left, bottom - top, 0, 0, probe.width, probe.height);
  const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
  const tone = [0, 0, 0];
  for (let index = 0; index < pixels.length; index += 4) {
    tone[0] += pixels[index];
    tone[1] += pixels[index + 1];
    tone[2] += pixels[index + 2];
  }
  const count = 255 * (pixels.length / 4);
  return tone.map((channel) => channel / count) as [number, number, number];
}

// A backlit front camera exposes for the window: the face is dim and takes a
// grey-violet cast. Lift it toward mid-grey (never darken) and pull its
// channel ratios partway toward typical skin, bounded so no tint is invented.
export function targetGains([red, green, blue]: [number, number, number]) {
  const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  if (luma < 0.02) return [...IDENTITY_GAINS];
  const exposure = Math.max(1, Math.min(1.8, 0.5 / luma));
  const balance = [1, (0.82 * red) / Math.max(green, 0.01), (0.72 * red) / Math.max(blue, 0.01)]
    .map((gain) => Math.max(0.82, Math.min(1.22, 1 + (gain - 1) * 0.6)));
  const keepLuma = 1 / (0.2126 * balance[0] + 0.7152 * balance[1] + 0.0722 * balance[2]);
  return balance.map((gain) => gain * keepLuma * exposure);
}

// Row-major 3×3: contrast × saturation × per-channel gain.
export function gradeMatrix(gains: ArrayLike<number>, target = new Float32Array(9)) {
  const weights = [0.2126, 0.7152, 0.0722];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const saturation = (1 - SATURATION) * weights[column] + (row === column ? SATURATION : 0);
      target[row * 3 + column] = CONTRAST * saturation * gains[column];
    }
  }
  return target;
}

// Grades only the bounded feature regions of the foreground capture.
export function gradeRegion(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  matrix: Float32Array,
) {
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const right = Math.min(context.canvas.width, Math.ceil(x + width));
  const bottom = Math.min(context.canvas.height, Math.ceil(y + height));
  if (right <= left || bottom <= top) return;
  const image = context.getImageData(left, top, right - left, bottom - top);
  const pixels = image.data;
  const offset = GRADE_OFFSET * 255;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] === 0) continue;
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    pixels[index] = matrix[0] * red + matrix[1] * green + matrix[2] * blue + offset;
    pixels[index + 1] = matrix[3] * red + matrix[4] * green + matrix[5] * blue + offset;
    pixels[index + 2] = matrix[6] * red + matrix[7] * green + matrix[8] * blue + offset;
  }
  context.putImageData(image, left, top);
}
