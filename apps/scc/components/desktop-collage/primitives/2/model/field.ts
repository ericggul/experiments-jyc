// The shared field, in desktop coordinates (top-left origin, points). The
// window renderer (GLSL) and the control-page preview use the same relations.

export type Rect = { x: number; y: number; width: number; height: number };

/** Chrome app title bar height; the page (and its sphere) sits below it. */
export const TITLE_BAR = 28;

export const center = (rect: Rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });

/** Outer shell radius for a window's page area; the core is about half of it. */
export const sphereRadius = (rect: Rect) => 0.36 * Math.min(rect.width, rect.height);
export const CORE_SCALE = 0.48;

/** 1 when spheres are within 35% of the range, falling smoothly to 0 at the range. */
export function linkStrength(distance: number, range: number) {
  const t = Math.min(1, Math.max(0, (range - distance) / (range * 0.65)));
  return t * t * (3 - 2 * t);
}

/** Quadratic control point: the link bows sideways, by up to 22% of its length. */
export function controlPoint(a: { x: number; y: number }, b: { x: number; y: number }, bend: number) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return { x: mx - (b.y - a.y) * 0.22 * bend, y: my + (b.x - a.x) * 0.22 * bend };
}

export function intersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

/**
 * Particles per cloud layer and per bridge, so the whole field, summed over
 * every window it is seen through, stays within 8,192 visible particles (the
 * repository's unobserved-device budget).
 */
export function particleBudget(count: number) {
  const pairs = (count * (count - 1)) / 2;
  const bridge = Math.max(32, Math.floor((8192 * 0.32) / Math.max(1, pairs)));
  const perCloud = Math.floor((8192 - pairs * bridge) / count);
  return {
    shell: Math.floor(perCloud * 0.66),
    core: Math.floor(perCloud * 0.29),
    dust: Math.floor(perCloud * 0.05),
    bridge,
  };
}
