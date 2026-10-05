/**
 * Logo fractal: every logo holds a copy of itself, `ratio` times its size,
 * centred on each of its tips. A logo with n-fold rotational symmetry has n
 * tips (ChatGPT six, Gemini four, Qwen three); others use the midpoints of
 * their content box. The root holds a copy on every tip; every other copy
 * skips the tip pointing straight back into its parent unless `allTips`. The
 * whole fractal is laid out once, centred, down to sub-pixel copies or the
 * sprite budget.
 */

export const DEFAULT_RATIO = 0.5;
export const MIN_RATIO = 0.3;
export const MAX_RATIO = 0.6;
/** Levels below the root; MAX_DEPTH means "until copies are sub-pixel". */
export const MAX_DEPTH = 12;
/** The fractal's outer extent spans this share of the viewport's sides. */
export const FILL = 0.92;
export const MAX_VISIBLE_LOGOS = 8192;
export const MIN_HALF_PX = 0.75;

type Vector = readonly [number, number];

/** Tip vectors and body extent around the centre, in units of the half-size. */
export type FractalShape = {
  tips: readonly Vector[];
  body: Vector;
};

/** Right, down, left, up (screen y down) at the edge midpoints of a box. */
export function boxShape(aspect: Vector = [1, 1]): FractalShape {
  const [ax, ay] = aspect;
  return {
    tips: [
      [ax, 0],
      [0, ay],
      [-ax, 0],
      [0, -ay],
    ],
    body: aspect,
  };
}

/** n tips of length 1, the first at `angleDeg` clockwise from the right. */
export function rotationalShape(order: number, angleDeg: number, body: Vector): FractalShape {
  const tips = Array.from({ length: order }, (_, index): Vector => {
    const angle = ((angleDeg + (360 * index) / order) * Math.PI) / 180;
    return [Math.cos(angle), Math.sin(angle)];
  });
  return { tips, body };
}

/** For each tip, the tip pointing straight back along it, or -1 (odd orders). */
export function backTips(tips: readonly Vector[]) {
  return tips.map(([x, y]) => {
    const length = Math.hypot(x, y);
    return tips.findIndex(
      ([u, v]) => (x * u + y * v) / (length * Math.hypot(u, v)) < -0.9999,
    );
  });
}

export type FractalOptions = {
  ratio?: number;
  depth?: number;
  allTips?: boolean;
  shape?: FractalShape;
  /** Number of logos to cycle through; each copy differs from its parent and siblings. */
  variants?: number;
  rootVariant?: number;
  minHalfPx?: number;
  budget?: number;
};

export type LogoLayout = {
  count: number;
  /** Centre x/y and half-size in CSS px, parents first. */
  x: Float64Array;
  y: Float64Array;
  half: Float64Array;
  depth: Uint8Array;
  variant: Uint8Array;
  rootHalf: number;
};

export function createLogoLayout(capacity = MAX_VISIBLE_LOGOS): LogoLayout {
  return {
    count: 0,
    x: new Float64Array(capacity),
    y: new Float64Array(capacity),
    half: new Float64Array(capacity),
    depth: new Uint8Array(capacity),
    variant: new Uint8Array(capacity),
    rootHalf: 0,
  };
}

/**
 * Along any branch the offsets and the last body sum, per axis, to a convex
 * combination of body and maxTip / (1 − ratio), so this bounds the subtree.
 */
export function subtreeReach(shape: FractalShape, ratio: number): Vector {
  const tipX = Math.max(...shape.tips.map(([x]) => Math.abs(x)));
  const tipY = Math.max(...shape.tips.map(([, y]) => Math.abs(y)));
  return [
    Math.max(shape.body[0], tipX / (1 - ratio)),
    Math.max(shape.body[1], tipY / (1 - ratio)),
  ];
}

export function rootHalfForViewport(
  width: number,
  height: number,
  ratio = DEFAULT_RATIO,
  shape: FractalShape = boxShape(),
) {
  const [reachX, reachY] = subtreeReach(shape, ratio);
  return (FILL / 2) * Math.min(width / reachX, height / reachY);
}

/** Breadth-first, so a level is drawn whole or not at all within the budget. */
export function layoutLogoFractal(
  layout: LogoLayout,
  width: number,
  height: number,
  options: FractalOptions = {},
) {
  const ratio = options.ratio ?? DEFAULT_RATIO;
  const maxDepth = options.depth ?? MAX_DEPTH;
  const unlimited = maxDepth >= MAX_DEPTH;
  const allTips = options.allTips ?? false;
  const shape = options.shape ?? boxShape();
  const variants = Math.max(1, options.variants ?? 1);
  const minHalfPx = options.minHalfPx ?? MIN_HALF_PX;
  const budget = Math.min(options.budget ?? MAX_VISIBLE_LOGOS, layout.x.length);
  const rootHalf = rootHalfForViewport(width, height, ratio, shape);
  const [reachX, reachY] = subtreeReach(shape, ratio);
  const [bodyX, bodyY] = shape.body;
  const back = backTips(shape.tips);

  // x, y, half, arrival tip (-1 for the root), variant
  let frontier = [width / 2, height / 2, rootHalf, -1, (options.rootVariant ?? 0) % variants];
  let level = 0;
  layout.count = 0;
  layout.rootHalf = rootHalf;

  while (frontier.length > 0 && (unlimited || level <= maxDepth)) {
    const next: number[] = [];
    const drawn: number[] = [];
    for (let index = 0; index < frontier.length; index += 5) {
      const half = frontier[index + 2]!;
      if (half < minHalfPx) continue;
      const x = frontier[index]!;
      const y = frontier[index + 1]!;
      const outsideX = Math.max(0, -x, x - width);
      const outsideY = Math.max(0, -y, y - height);
      if (outsideX > reachX * half || outsideY > reachY * half) continue;
      const variant = frontier[index + 4]!;
      if (outsideX <= bodyX * half && outsideY <= bodyY * half) drawn.push(x, y, half, variant);
      const arrival = frontier[index + 3]!;
      const skipped = allTips || arrival < 0 ? -1 : back[arrival]!;
      for (let tip = 0; tip < shape.tips.length; tip += 1) {
        if (tip === skipped) continue;
        const [dx, dy] = shape.tips[tip]!;
        next.push(
          x + dx * half,
          y + dy * half,
          half * ratio,
          tip,
          (variant + 1 + (tip % Math.max(1, variants - 1))) % variants,
        );
      }
    }
    if (layout.count + drawn.length / 4 > budget) break;
    for (let index = 0; index < drawn.length; index += 4) {
      const slot = layout.count;
      layout.x[slot] = drawn[index]!;
      layout.y[slot] = drawn[index + 1]!;
      layout.half[slot] = drawn[index + 2]!;
      layout.variant[slot] = drawn[index + 3]!;
      layout.depth[slot] = level;
      layout.count += 1;
    }
    frontier = next;
    level += 1;
  }
  return layout;
}
