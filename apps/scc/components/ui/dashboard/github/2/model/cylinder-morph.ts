export const GITHUB_SURFACE_SEGMENTS_X = 96;
export const GITHUB_SURFACE_SEGMENTS_Y = 64;
export const SURFACE_MORPH_START = 0.06;
export const SURFACE_MORPH_END = 0.86;
export const CYLINDER_HALF_ARC_RADIANS = 1.16;
export const CYLINDER_VIEW_YAW_RADIANS = -0.14;
export const TORUS_MAJOR_RADIUS_RATIO = 0.26;
export const TORUS_MINOR_RADIUS_RATIO = 0.38;
export const TORUS_VIEW_YAW_RADIANS = 0.2;
export const TORUS_VIEW_TILT_RADIANS = -0.1;

export const surfaceTargets = ["cylinder", "torus"] as const;

export type SurfaceTarget = (typeof surfaceTargets)[number];

type SurfacePoint = {
  x: number;
  y: number;
  z: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothStep(value: number) {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

export function surfaceMorphProgress(inputProgress: number) {
  const interval = SURFACE_MORPH_END - SURFACE_MORPH_START;
  if (interval <= 0) return 1;
  return smoothStep((inputProgress - SURFACE_MORPH_START) / interval);
}

function cylinderTargetPoint(
  point: SurfacePoint,
  surfaceWidth: number,
): SurfacePoint {
  if (surfaceWidth <= 0) return point;

  const radius = surfaceWidth / (CYLINDER_HALF_ARC_RADIANS * 2);
  const angle = point.x / radius;
  return {
    x: Math.sin(angle) * radius,
    y: point.y,
    z: (Math.cos(angle) - 1) * radius,
  };
}

function torusTargetPoint(
  point: SurfacePoint,
  surfaceWidth: number,
  surfaceHeight: number,
): SurfacePoint {
  const minimumDimension = Math.min(surfaceWidth, surfaceHeight);
  if (minimumDimension <= 0) return point;

  const majorRadius = minimumDimension * TORUS_MAJOR_RADIUS_RATIO;
  const minorRadius = majorRadius * TORUS_MINOR_RADIUS_RATIO;
  const majorAngle = (point.x / surfaceWidth) * Math.PI * 2;
  const minorAngle = (point.y / surfaceHeight) * Math.PI * 2;
  const ringRadius = majorRadius + minorRadius * Math.cos(minorAngle);

  return {
    x: ringRadius * Math.cos(majorAngle),
    y: ringRadius * Math.sin(majorAngle),
    z: minorRadius * Math.sin(minorAngle),
  };
}

export function surfacePoint(
  point: SurfacePoint,
  surfaceWidth: number,
  surfaceHeight: number,
  target: SurfaceTarget,
  inputProgress: number,
): SurfacePoint {
  const blend = surfaceMorphProgress(inputProgress);
  if (blend <= 0) return point;

  const targetPoint = target === "torus"
    ? torusTargetPoint(point, surfaceWidth, surfaceHeight)
    : cylinderTargetPoint(point, surfaceWidth);

  return {
    x: point.x + (targetPoint.x - point.x) * blend,
    y: point.y + (targetPoint.y - point.y) * blend,
    z: point.z + (targetPoint.z - point.z) * blend,
  };
}

export function writeSurfacePositions(
  source: Float32Array,
  target: Float32Array,
  surfaceWidth: number,
  surfaceHeight: number,
  surfaceTarget: SurfaceTarget,
  inputProgress: number,
) {
  for (let offset = 0; offset < source.length; offset += 3) {
    const point = surfacePoint(
      {
        x: source[offset] ?? 0,
        y: source[offset + 1] ?? 0,
        z: source[offset + 2] ?? 0,
      },
      surfaceWidth,
      surfaceHeight,
      surfaceTarget,
      inputProgress,
    );
    target[offset] = point.x;
    target[offset + 1] = point.y;
    target[offset + 2] = point.z;
  }
}
