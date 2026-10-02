import { gridForViewport } from "./field.ts";

export type Point = Readonly<{ x: number; y: number }>;

// Opt 3 treats the screen as a window onto a thin 2D fluid layer at rest.
// The finger does not pose arrows: a moving finger drags fluid with it, so each
// stretch of travel leaves two opposite vortex-sheet elements on either side of
// its path (a shear layer bounding a jet). The arrows are the Biot-Savart
// velocity induced everywhere by all deposited vorticity, and that vorticity is
// carried by the very flow it induces (2D Euler, vortex-blob method), so the
// field keeps reorganising itself after release: jet ends roll into dipoles
// that travel, stroke crossings wind into each other. The screen edges are
// approximately free-slip walls (one tapered mirror image per nearby edge), so
// a travelling dipole splits and slides along a wall instead of leaving the
// window. Core spreading stands in
// for viscosity and a linear drag for the layer's floor friction, so the
// changed field slowly returns to rest.
export const vortexParameters = {
  /** Fraction of finger speed the dragged fluid adopts. */
  coupling: 0.55,
  maximumFingerSpeed: 1800,
  /** Blob core and shear-layer half-width, in grid spacings. */
  coreInSpacings: 0.9,
  halfWidthInSpacings: 1.1,
  /** Path travelled per deposited pair, in grid spacings. */
  depositInSpacings: 0.7,
  /** Kinematic viscosity (px²/s) applied by core spreading. */
  viscosity: 10,
  /** Floor friction rate (1/s): circulation decays as exp(-friction t). */
  friction: 0.05,
  maximumBlobs: 360,
  /** Distance from an edge, as a fraction of the short side, within which a blob is mirrored. */
  wallReach: 0.3,
  restSpeed: 1.5,
} as const;

export type Blob = { x: number; y: number; gamma: number; core2: number };

export type StrokeState = { x: number; y: number; time: number; speed: number; carry: number };

export type VortexField = {
  width: number;
  height: number;
  grid: ReturnType<typeof gridForViewport>;
  core: number;
  halfWidth: number;
  depositStep: number;
  blobs: Blob[];
  /** Sampled velocity (px/s) at every grid point, interleaved x/y. */
  vectors: Float32Array;
  maximumSpeed: number;
};

export function createVortexField(width: number, height: number, blobs: Blob[] = []): VortexField {
  const grid = gridForViewport(width, height);
  const field: VortexField = {
    width, height, grid,
    core: grid.spacing * vortexParameters.coreInSpacings,
    halfWidth: grid.spacing * vortexParameters.halfWidthInSpacings,
    depositStep: grid.spacing * vortexParameters.depositInSpacings,
    blobs,
    vectors: new Float32Array(grid.columns * grid.rows * 2),
    maximumSpeed: 0,
  };
  sampleVelocity(field);
  return field;
}

// Regularised (Rosenhead-Krasny) Biot-Savart kernel summed over all blobs.
export function velocityAt(blobs: readonly Blob[], x: number, y: number, skip = -1): [number, number] {
  let vx = 0;
  let vy = 0;
  for (let index = 0; index < blobs.length; index += 1) {
    if (index === skip) continue;
    const blob = blobs[index]!;
    const rx = x - blob.x;
    const ry = y - blob.y;
    const weight = blob.gamma / (2 * Math.PI * (rx * rx + ry * ry + blob.core2));
    vx -= ry * weight;
    vy += rx * weight;
  }
  return [vx, vy];
}

// Mirror images with opposite circulation make each nearby edge approximately
// impermeable. Images fade out with distance from their wall so a blob crossing
// the reach does not make the field jump; corners and multiple reflections are
// not modelled.
export function withWallImages(field: VortexField, blobs: readonly Blob[]): Blob[] {
  const { width, height } = field;
  const reach = Math.max(4 * field.core, vortexParameters.wallReach * Math.min(width, height));
  const taper = (distance: number) => {
    if (distance <= reach / 2) return 1;
    if (distance >= reach) return 0;
    const t = (reach - distance) / (reach / 2);
    return t * t * (3 - 2 * t);
  };
  const sources: Blob[] = [...blobs];
  for (const blob of blobs) {
    const walls = [
      [blob.x, -blob.x, blob.y],
      [width - blob.x, 2 * width - blob.x, blob.y],
      [blob.y, blob.x, -blob.y],
      [height - blob.y, blob.x, 2 * height - blob.y],
    ] as const;
    for (const [distance, x, y] of walls) {
      const weight = taper(distance);
      if (weight > 0) sources.push({ x, y, gamma: -blob.gamma * weight, core2: blob.core2 });
    }
  }
  return sources;
}

export function sampleVelocity(field: VortexField): void {
  const { grid, vectors } = field;
  const blobs = withWallImages(field, field.blobs);
  let maximum = 0;
  for (let row = 0; row < grid.rows; row += 1) {
    const y = grid.top + row * grid.spacing;
    for (let column = 0; column < grid.columns; column += 1) {
      const [vx, vy] = velocityAt(blobs, grid.left + column * grid.spacing, y);
      const index = (row * grid.columns + column) * 2;
      vectors[index] = vx;
      vectors[index + 1] = vy;
      maximum = Math.max(maximum, vx * vx + vy * vy);
    }
  }
  field.maximumSpeed = Math.sqrt(maximum);
}

function inside(field: VortexField, x: number, y: number) {
  const reflect = (value: number, limit: number) => {
    const mirrored = value < 0 ? -value : value > limit ? 2 * limit - value : value;
    return Math.min(limit, Math.max(0, mirrored));
  };
  return { x: reflect(x, field.width), y: reflect(y, field.height) };
}

export function beginStroke(point: Point, time: number): StrokeState {
  return { x: point.x, y: point.y, time, speed: 0, carry: 0 };
}

// Deposits shear-layer pairs every `depositStep` of travel, so pointer sampling
// rate never sets the strength; circulation per pair is (fluid speed × step).
export function continueStroke(field: VortexField, stroke: StrokeState, to: Point, time: number): void {
  const dx = to.x - stroke.x;
  const dy = to.y - stroke.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.25) return;
  const elapsed = Math.max(0.004, (time - stroke.time) / 1000);
  const instant = Math.min(vortexParameters.maximumFingerSpeed, distance / elapsed);
  stroke.speed = stroke.speed === 0 ? instant : stroke.speed * 0.6 + instant * 0.4;
  const tangentX = dx / distance;
  const tangentY = dy / distance;
  const gamma = vortexParameters.coupling * stroke.speed * field.depositStep;
  let travelled = field.depositStep - stroke.carry;
  while (travelled <= distance) {
    const x = stroke.x + tangentX * travelled;
    const y = stroke.y + tangentY * travelled;
    // n = (-t_y, t_x): +Γ on that side and -Γ opposite induce flow along t between them.
    field.blobs.push(
      { ...inside(field, x - tangentY * field.halfWidth, y + tangentX * field.halfWidth), gamma, core2: field.core ** 2 },
      { ...inside(field, x + tangentY * field.halfWidth, y - tangentX * field.halfWidth), gamma: -gamma, core2: field.core ** 2 },
    );
    travelled += field.depositStep;
  }
  stroke.carry = distance - (travelled - field.depositStep);
  stroke.x = to.x;
  stroke.y = to.y;
  stroke.time = time;
  if (field.blobs.length > vortexParameters.maximumBlobs) remesh(field);
}

// Merges blobs sharing a cell into one at their |Γ|-weighted centre. Total
// circulation is conserved; opposite signs in one cell cancel, as they would
// by viscous annihilation.
export function remesh(field: VortexField, cellSize = field.core): void {
  const cells = new Map<string, { sx: number; sy: number; weight: number; gamma: number; core2: number }>();
  for (const blob of field.blobs) {
    const key = `${Math.floor(blob.x / cellSize)}:${Math.floor(blob.y / cellSize)}`;
    const weight = Math.abs(blob.gamma);
    const cell = cells.get(key);
    if (cell) {
      cell.sx += blob.x * weight;
      cell.sy += blob.y * weight;
      cell.weight += weight;
      cell.gamma += blob.gamma;
      cell.core2 = Math.max(cell.core2, blob.core2);
    } else {
      cells.set(key, { sx: blob.x * weight, sy: blob.y * weight, weight, gamma: blob.gamma, core2: blob.core2 });
    }
  }
  const merged: Blob[] = [];
  for (const cell of cells.values()) {
    if (cell.weight === 0 || Math.abs(cell.gamma) < 1e-3) continue;
    merged.push({ x: cell.sx / cell.weight, y: cell.sy / cell.weight, gamma: cell.gamma, core2: cell.core2 });
  }
  field.blobs = merged;
  if (merged.length > vortexParameters.maximumBlobs) remesh(field, cellSize * 1.5);
}

// Advances the blobs by their mutual induced velocity (midpoint rule), then
// applies viscosity and friction and resamples the observed grid. Returns
// whether the layer is still in motion.
export function stepVortexField(field: VortexField, elapsedSeconds: number): boolean {
  const dt = Math.min(0.05, Math.max(0, elapsedSeconds));
  const { blobs } = field;
  if (dt > 0 && blobs.length > 0) {
    // Real blobs lead each source list, so index i skips only the blob itself, not its images.
    const sources = withWallImages(field, blobs);
    const midpoints = blobs.map((blob, index) => {
      const [vx, vy] = velocityAt(sources, blob.x, blob.y, index);
      return { ...blob, ...inside(field, blob.x + vx * dt / 2, blob.y + vy * dt / 2) };
    });
    const midpointSources = withWallImages(field, midpoints);
    const decay = Math.exp(-vortexParameters.friction * dt);
    const spread = 4 * vortexParameters.viscosity * dt;
    field.blobs = blobs.map((blob, index) => {
      const [vx, vy] = velocityAt(midpointSources, midpoints[index]!.x, midpoints[index]!.y, index);
      return { ...inside(field, blob.x + vx * dt, blob.y + vy * dt), gamma: blob.gamma * decay, core2: blob.core2 + spread };
    });
  }
  sampleVelocity(field);
  if (field.maximumSpeed < vortexParameters.restSpeed) {
    field.blobs = [];
    return false;
  }
  return true;
}

// Blobs keep their position relative to the viewport, so the field survives rotation.
export function resizeVortexField(previous: VortexField, width: number, height: number): VortexField {
  const scaleX = width / previous.width;
  const scaleY = height / previous.height;
  return createVortexField(width, height, previous.blobs.map((blob) => ({
    ...blob, x: blob.x * scaleX, y: blob.y * scaleY,
  })));
}
