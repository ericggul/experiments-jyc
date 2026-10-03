/** Top-left corner and uniform scale of a piece, in stage coordinates (transform origin 0 0). */
export type Pose = { x: number; y: number; scale: number };

/**
 * Linear in x, y, and scale, so the centre of a piece of any size moves along
 * the straight segment between its two centres: the drawn line is its path.
 */
export const lerpPose = (from: Pose, to: Pose, t: number): Pose => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
  scale: from.scale + (to.scale - from.scale) * t,
});

export const poseTransform = ({ x, y, scale }: Pose) => `translate(${x}px, ${y}px) scale(${scale})`;

export const centerOf = ({ x, y, scale }: Pose, width: number, height: number) => ({
  x: x + (width * scale) / 2,
  y: y + (height * scale) / 2,
});

/** Ease-out used by every piece's progress tween. */
export const easeOut = (x: number) => 1 - (1 - x) ** 4;

/** The path a piece's centre takes: the straight segment, or a parabolic arc. */
export type RouteShape = "line" | "curve";
type Point = { x: number; y: number };

const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

const BULGE = 0.3;

/**
 * Control points of the curve: a parabola (a quadratic Bézier raised to cubic
 * form) bending once, its apex pushed sideways from the chord's midpoint by
 * 30 % of the distance, toward the top of the screen like a thrown arc. A
 * purely vertical move bends to the right.
 */
export function curveControls(start: Point, end: Point): [Point, Point] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!length) return [start, end];
  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0 || (ny === 0 && nx < 0)) [nx, ny] = [-nx, -ny];
  const apex = { x: (start.x + end.x) / 2 + nx * length * BULGE, y: (start.y + end.y) / 2 + ny * length * BULGE };
  return [mix(start, apex, 2 / 3), mix(end, apex, 2 / 3)];
}

/** De Casteljau: the point at t and the two sub-curves either side of it. */
export function splitCubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number) {
  const p01 = mix(p0, p1, t);
  const p12 = mix(p1, p2, t);
  const p23 = mix(p2, p3, t);
  const p012 = mix(p01, p12, t);
  const p123 = mix(p12, p23, t);
  const at = mix(p012, p123, t);
  return { at, before: [p0, p01, p012, at] as const, after: [at, p123, p23, p3] as const };
}

/**
 * The pose at t along a route between the original and the sorted pose. Scale
 * is always linear; the centre follows the route's shape, so on either shape
 * the drawn route is exactly the path of the piece's centre.
 */
export function poseAlong(home: Pose, place: Pose, width: number, height: number, t: number, shape: RouteShape): Pose {
  if (shape === "line") return lerpPose(home, place, t);
  const start = centerOf(home, width, height);
  const end = centerOf(place, width, height);
  const { at } = splitCubic(start, ...curveControls(start, end), end, t);
  const scale = home.scale + (place.scale - home.scale) * t;
  return { x: at.x - (width * scale) / 2, y: at.y - (height * scale) / 2, scale };
}

export type Route = { home: Pose; place: Pose; width: number; height: number; t: number };

const point = (value: number) => value.toFixed(1);
const cubic = ([p0, p1, p2, p3]: readonly Point[]) =>
  `M${point(p0.x)} ${point(p0.y)}C${point(p1.x)} ${point(p1.y)} ${point(p2.x)} ${point(p2.y)} ${point(p3.x)} ${point(p3.y)}`;

/**
 * Route thickness grows with the size of the piece that travels it (the
 * square root of its original area), from 0.5 px for a glyph to 5 px for a
 * photograph, in 0.25 px steps so routes of one thickness share a path.
 */
export const routeWidth = (width: number, height: number) =>
  Math.round(Math.min(5, Math.max(0.5, 0.25 + Math.sqrt(width * height) * 0.0175)) * 4) / 4;

/**
 * SVG path data for each route, from the piece's original centre to its
 * sorted centre along the given shape, grouped by thickness and split where the piece is now: the
 * travelled part (drawn dark) and the remaining part (drawn light), so the
 * dark share of every line is how far its piece has moved.
 */
export function routeLayers(routes: Iterable<Route>, shape: RouteShape = "line") {
  const layers = new Map<number, { travelled: string; remaining: string }>();
  for (const { home, place, width, height, t } of routes) {
    const weight = routeWidth(width, height);
    const start = centerOf(home, width, height);
    const end = centerOf(place, width, height);
    const layer = layers.get(weight) ?? { travelled: "", remaining: "" };
    if (shape === "curve") {
      const { before, after } = splitCubic(start, ...curveControls(start, end), end, t);
      if (t > 0) layer.travelled += cubic(before);
      if (t < 1) layer.remaining += cubic(after);
    } else {
      const now = mix(start, end, t);
      if (t > 0) layer.travelled += `M${point(start.x)} ${point(start.y)}L${point(now.x)} ${point(now.y)}`;
      if (t < 1) layer.remaining += `M${point(now.x)} ${point(now.y)}L${point(end.x)} ${point(end.y)}`;
    }
    layers.set(weight, layer);
  }
  return layers;
}
