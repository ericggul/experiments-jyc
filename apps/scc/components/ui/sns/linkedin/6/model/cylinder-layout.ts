export const LINKEDIN_SURFACE_ARC_RADIANS = 1.48;
export const LINKEDIN_SURFACE_RADIAL_SEGMENTS = 48;

export function cylinderSurfaceMetrics(
  width: number,
  height: number,
  arcRadians = LINKEDIN_SURFACE_ARC_RADIANS,
) {
  return {
    height,
    radius: width / arcRadians,
  };
}

export function writeCylinderSurfacePositions(
  source: Float32Array,
  target: Float32Array,
  width: number,
  arcRadians = LINKEDIN_SURFACE_ARC_RADIANS,
) {
  if (width <= 0 || arcRadians <= 0) return;
  const radius = width / arcRadians;
  for (let offset = 0; offset < source.length; offset += 3) {
    const planeX = source[offset] ?? 0;
    const angle = planeX / radius;
    target[offset] = Math.sin(angle) * radius;
    target[offset + 1] = source[offset + 1] ?? 0;
    target[offset + 2] = (Math.cos(angle) - 1) * radius;
  }
}
