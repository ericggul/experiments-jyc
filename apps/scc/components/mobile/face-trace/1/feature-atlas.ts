import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export const TILE_SIZE = 256;
export const FEATURE_COUNT = 3;
// Detection frames (~15/s) behind the live row. The lattice cells draw from
// these echoes, so a blink or a spoken word ripples through the collage.
export const ECHO_DELAYS = [0, 3, 8, 16] as const;
const HISTORY = ECHO_DELAYS[ECHO_DELAYS.length - 1] + 1;

export type FeatureGeometry = { x: number; y: number; side: number };

export type FeatureAtlas = {
  canvas: HTMLCanvasElement;
  history: HTMLCanvasElement[];
  cursor: number;
  filled: number;
};

export function createFeatureAtlas(): FeatureAtlas {
  const canvas = document.createElement("canvas");
  canvas.width = FEATURE_COUNT * TILE_SIZE;
  canvas.height = ECHO_DELAYS.length * TILE_SIZE;
  const history = Array.from({ length: HISTORY }, () => {
    const strip = document.createElement("canvas");
    strip.width = FEATURE_COUNT * TILE_SIZE;
    strip.height = TILE_SIZE;
    return strip;
  });
  return { canvas, history, cursor: -1, filled: 0 };
}

// Every tile is centred on one feature, sized from its own width along the eye
// line, so each cell of the field can align eye with eye and lip with lip.
export function measureFeatures(
  landmarks: NormalizedLandmark[],
  contours: readonly number[][],
  width: number,
  height: number,
  angle: number,
): FeatureGeometry[] | null {
  const axisX = Math.cos(angle);
  const axisY = Math.sin(angle);
  const features: FeatureGeometry[] = [];
  for (let feature = 0; feature < contours.length; feature += 1) {
    const points = contours[feature].map((index) => landmarks[index]);
    if (points.some((point) => !point)) return null;
    let x = 0;
    let y = 0;
    let low = Infinity;
    let high = -Infinity;
    for (const point of points) {
      const px = point.x * width;
      const py = point.y * height;
      x += px;
      y += py;
      const along = px * axisX + py * axisY;
      low = Math.min(low, along);
      high = Math.max(high, along);
    }
    const reach = feature === 2 ? 1.3 : 1.45;
    features.push({
      x: x / points.length,
      y: y / points.length,
      side: Math.max(12, (high - low) * reach),
    });
  }
  return features;
}

// Tiles are mirrored like the foreground and rotated upright, then the echo
// rows are assembled from the history ring.
export function writeFeatureAtlas(
  atlas: FeatureAtlas,
  video: HTMLVideoElement,
  features: FeatureGeometry[],
  angle: number,
) {
  atlas.cursor = (atlas.cursor + 1) % atlas.history.length;
  atlas.filled = Math.min(atlas.filled + 1, atlas.history.length);
  const strip = atlas.history[atlas.cursor].getContext("2d");
  const context = atlas.canvas.getContext("2d");
  if (!strip || !context) return false;

  strip.imageSmoothingQuality = "high";
  strip.fillStyle = "#000";
  strip.fillRect(0, 0, strip.canvas.width, strip.canvas.height);
  for (let feature = 0; feature < features.length; feature += 1) {
    const { x, y, side } = features[feature];
    strip.save();
    strip.beginPath();
    strip.rect(feature * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    strip.clip();
    strip.translate(feature * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2);
    strip.scale(TILE_SIZE / side, TILE_SIZE / side);
    strip.rotate(angle);
    strip.scale(-1, 1);
    strip.translate(-x, -y);
    strip.drawImage(video, 0, 0);
    strip.restore();
  }

  for (let slot = 0; slot < ECHO_DELAYS.length; slot += 1) {
    const delay = Math.min(ECHO_DELAYS[slot], atlas.filled - 1);
    const index = (atlas.cursor - delay + atlas.history.length) % atlas.history.length;
    context.drawImage(atlas.history[index], 0, slot * TILE_SIZE);
  }
  return true;
}
