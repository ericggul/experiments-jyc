// Finds the closed-form curve that best explains one finger-skated stroke on a
// Cartesian plane. Every family is fitted by least squares (variable projection
// for its one nonlinear parameter), but families are compared on the same
// footing: orthogonal distance from the stroke to the curve, scored with BIC so
// that an extra parameter must earn its place. The winner's coefficients are
// then rounded as far as the stroke allows, so a drawn parabola reads
// `y = x² − 2`, not `y = 0.9874x² + 0.0213x − 2.0391`.

export type Point = Readonly<{ x: number; y: number }>;

export type FitKind =
  | "polynomial" // y = Σ cₖ xᵏ, params = [c₀, c₁, …]
  | "sine" // y = A sin(bx + φ) + d, params = [A, b, φ, d]
  | "exponential" // y = a e^(bx) + c, params = [a, b, c]
  | "absolute" // y = a|x − h| + k, params = [a, h, k]
  | "reciprocal" // y = a / (x − h) + k, params = [a, h, k]
  | "sideways" // x = Σ cₖ yᵏ, params = [c₀, c₁, …]
  | "circle"; // (x − h)² + (y − k)² = r², params = [h, k, r]

export type Fit = Readonly<{
  kind: FitKind;
  params: readonly number[];
  /** Root-mean-square orthogonal distance from the stroke to the curve, in plane units. */
  rms: number;
  score: number;
}>;

export type FitOptions = Readonly<{
  /** Hand and sensor jitter in plane units; residuals below it are not evidence. */
  noise: number;
  /** Round coefficients as far as the stroke allows. */
  simplify?: boolean;
}>;

const maximumSamples = 110;
const curveSamples = 140;

// ——— stroke preparation ———

/** Resamples by arc length so dwelling or fast travel does not weight the fit. */
export function resampleStroke(points: readonly Point[], step: number): Point[] {
  if (points.length < 2) return [...points];
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index]!.x - points[index - 1]!.x, points[index]!.y - points[index - 1]!.y);
  }
  const spacing = Math.max(step, length / (maximumSamples - 1));
  const result: Point[] = [points[0]!];
  let carried = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const segment = Math.hypot(to.x - from.x, to.y - from.y);
    let along = spacing - carried;
    while (along <= segment) {
      const t = along / segment;
      result.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
      along += spacing;
    }
    carried = segment - (along - spacing);
  }
  const last = points[points.length - 1]!;
  const tail = result[result.length - 1]!;
  if (Math.hypot(last.x - tail.x, last.y - tail.y) > spacing * 0.25) result.push(last);
  return result;
}

/**
 * A stroke is a graph of x when its middle never travels back against its
 * overall x direction by more than a tenth of its width. The first and last
 * few percent are ignored: a finger landing or lifting often hooks.
 */
export function isGraphOfX(points: readonly Point[], noise: number): boolean {
  const box = bounds(points);
  if (box.width < 0.12 * box.height) return false;
  const trim = Math.floor(points.length * 0.07);
  const core = points.length - 2 * trim >= 4 ? points.slice(trim, points.length - trim) : points;
  const direction = Math.sign(core[core.length - 1]!.x - core[0]!.x) || 1;
  let furthest = -Infinity;
  let retreat = 0;
  for (const point of core) {
    const x = point.x * direction;
    furthest = Math.max(furthest, x);
    retreat = Math.max(retreat, furthest - x);
  }
  return retreat <= Math.max(3 * noise, 0.1 * box.width);
}

function bounds(points: readonly Point[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const { x, y } of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

// ——— linear algebra ———

/**
 * Weighted least squares by modified Gram-Schmidt QR; null when the columns
 * are degenerate. Rows are scaled by √w, so `rss` is the weighted residual.
 */
function leastSquares(
  rawColumns: readonly Float64Array[],
  rawTarget: Float64Array,
  weights?: Float64Array,
): { coefficients: number[]; rss: number } | null {
  const root = weights ? Float64Array.from(weights, Math.sqrt) : null;
  const columns = root ? rawColumns.map((values) => Float64Array.from(values, (value, row) => value * root[row]!)) : rawColumns;
  const target = root ? Float64Array.from(rawTarget, (value, row) => value * root[row]!) : rawTarget;
  const m = columns.length;
  const n = target.length;
  if (n < m) return null;
  const q = columns.map((column) => Float64Array.from(column));
  const r = Array.from({ length: m }, () => new Float64Array(m));
  for (let j = 0; j < m; j += 1) {
    const qj = q[j]!;
    for (let i = 0; i < j; i += 1) {
      const qi = q[i]!;
      let dot = 0;
      for (let row = 0; row < n; row += 1) dot += qi[row]! * qj[row]!;
      r[i]![j] = dot;
      for (let row = 0; row < n; row += 1) qj[row] = qj[row]! - dot * qi[row]!;
    }
    let norm = 0;
    for (let row = 0; row < n; row += 1) norm += qj[row]! * qj[row]!;
    norm = Math.sqrt(norm);
    if (norm < 1e-9 * Math.sqrt(n)) return null;
    r[j]![j] = norm;
    for (let row = 0; row < n; row += 1) qj[row] = qj[row]! / norm;
  }
  const projected = q.map((column) => {
    let dot = 0;
    for (let row = 0; row < n; row += 1) dot += column[row]! * target[row]!;
    return dot;
  });
  const coefficients = new Array<number>(m).fill(0);
  for (let i = m - 1; i >= 0; i -= 1) {
    let value = projected[i]!;
    for (let j = i + 1; j < m; j += 1) value -= r[i]![j]! * coefficients[j]!;
    coefficients[i] = value / r[i]![i]!;
  }
  let rss = 0;
  for (let row = 0; row < n; row += 1) {
    let prediction = 0;
    for (let j = 0; j < m; j += 1) prediction += columns[j]![row]! * coefficients[j]!;
    rss += (target[row]! - prediction) ** 2;
  }
  return { coefficients, rss };
}

function goldenMinimum(objective: (value: number) => number, lower: number, upper: number, iterations = 36): number {
  const ratio = (Math.sqrt(5) - 1) / 2;
  let a = lower;
  let b = upper;
  let c = b - ratio * (b - a);
  let d = a + ratio * (b - a);
  let fc = objective(c);
  let fd = objective(d);
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    if (fc < fd) {
      b = d; d = c; fd = fc; c = b - ratio * (b - a); fc = objective(c);
    } else {
      a = c; c = d; fc = fd; d = a + ratio * (b - a); fd = objective(d);
    }
  }
  return (a + b) / 2;
}

// Scans a grid of one nonlinear parameter, solving the linear ones exactly at
// each value, then refines between the best grid neighbours.
function projectedSearch(
  grid: readonly number[],
  solve: (value: number) => LinearSolution | null,
): { value: number; coefficients: number[] } | null {
  let best = -1;
  let bestRss = Infinity;
  grid.forEach((value, index) => {
    const result = solve(value);
    if (result && result.rss < bestRss) {
      best = index;
      bestRss = result.rss;
    }
  });
  if (best < 0) return null;
  const lower = grid[Math.max(0, best - 1)]!;
  const upper = grid[Math.min(grid.length - 1, best + 1)]!;
  const value = goldenMinimum((candidate) => solve(candidate)?.rss ?? Infinity, lower, upper);
  const refined = solve(value);
  const fallback = solve(grid[best]!);
  if (refined && (!fallback || refined.rss <= fallback.rss)) return { value, coefficients: refined.coefficients };
  return fallback ? { value: grid[best]!, coefficients: fallback.coefficients } : null;
}

const range = <T,>(count: number, map: (t: number) => T): T[] => Array.from({ length: count }, (_, index) => map(index / (count - 1)));
const column = (points: readonly Point[], map: (point: Point) => number) => Float64Array.from(points, map);

// ——— families ———

function binomial(n: number, k: number) {
  let value = 1;
  for (let i = 1; i <= k; i += 1) value = value * (n - k + i) / i;
  return value;
}

/** Polynomial in `input` fitted on a normalised variable, returned as plain coefficients of `input`. */
function fitPolynomial(points: readonly Point[], weights: Float64Array, degree: number, input: "x" | "y"): number[] | null {
  const output = input === "x" ? "y" : "x";
  const values = points.map((point) => point[input]);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const scale = Math.max(1e-6, ...values.map((value) => Math.abs(value - mean)));
  const normalised = values.map((value) => (value - mean) / scale);
  const columns = Array.from({ length: degree + 1 }, (_, power) => Float64Array.from(normalised, (value) => value ** power));
  const solved = leastSquares(columns, column(points, (point) => point[output]), weights);
  if (!solved) return null;
  const coefficients = new Array<number>(degree + 1).fill(0);
  solved.coefficients.forEach((a, k) => {
    for (let j = 0; j <= k; j += 1) coefficients[j] = coefficients[j]! + a * binomial(k, j) * (-mean) ** (k - j) / scale ** k;
  });
  return coefficients;
}

type LinearSolution = { coefficients: number[]; rss: number };

// Small weighted normal equations for the 2–3 linear coefficients inside a
// one-dimensional scan: no allocation per sample, which keeps live fitting fast.
// The bases here (sin/cos/1, centred exp/1, |x − h|/1, 1/(x − h)/1) are well
// conditioned; the polynomials keep the QR path above.
function smallLeastSquares(
  xs: Float64Array, ys: Float64Array, weights: Float64Array, size: 2 | 3,
  basis: (x: number, out: Float64Array) => void,
): LinearSolution | null {
  const gram = new Float64Array(9);
  const right = new Float64Array(3);
  const phi = new Float64Array(3);
  let weightedSquares = 0;
  for (let row = 0; row < xs.length; row += 1) {
    basis(xs[row]!, phi);
    const w = weights[row]!;
    const y = ys[row]!;
    weightedSquares += w * y * y;
    for (let a = 0; a < size; a += 1) {
      right[a] = right[a]! + w * phi[a]! * y;
      for (let b = 0; b < size; b += 1) gram[a * 3 + b] = gram[a * 3 + b]! + w * phi[a]! * phi[b]!;
    }
  }
  // Gaussian elimination with partial pivoting on the size × size system.
  const matrix = Array.from({ length: size }, (_, a) => [...Array.from({ length: size }, (_, b) => gram[a * 3 + b]!), right[a]!]);
  const diagonal = Math.max(...Array.from({ length: size }, (_, a) => Math.abs(gram[a * 3 + a]!)), 1e-300);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (Math.abs(matrix[row]![column]!) > Math.abs(matrix[pivot]![column]!)) pivot = row;
    if (Math.abs(matrix[pivot]![column]!) < 1e-12 * diagonal) return null;
    [matrix[column], matrix[pivot]] = [matrix[pivot]!, matrix[column]!];
    for (let row = column + 1; row < size; row += 1) {
      const factor = matrix[row]![column]! / matrix[column]![column]!;
      for (let k = column; k <= size; k += 1) matrix[row]![k] = matrix[row]![k]! - factor * matrix[column]![k]!;
    }
  }
  const coefficients = new Array<number>(size).fill(0);
  for (let row = size - 1; row >= 0; row -= 1) {
    let value = matrix[row]![size]!;
    for (let k = row + 1; k < size; k += 1) value -= matrix[row]![k]! * coefficients[k]!;
    coefficients[row] = value / matrix[row]![row]!;
  }
  let explained = 0;
  for (let a = 0; a < size; a += 1) explained += coefficients[a]! * right[a]!;
  return { coefficients, rss: Math.max(0, weightedSquares - explained) };
}

const coordinates = (points: readonly Point[]) => ({
  xs: Float64Array.from(points, (point) => point.x),
  ys: Float64Array.from(points, (point) => point.y),
});

function fitSine(points: readonly Point[], weights: Float64Array): number[] | null {
  const { minX, width } = bounds(points);
  if (width <= 0) return null;
  const { xs, ys } = coordinates(points);
  const meanStep = width / points.length;
  const lowest = Math.PI / width;
  const highest = Math.max(lowest * 1.5, Math.min(2 * Math.PI * 8 / width, Math.PI / (3 * meanStep)));
  const solve = (b: number) => smallLeastSquares(xs, ys, weights, 3, (x, out) => {
    out[0] = Math.sin(b * (x - minX));
    out[1] = Math.cos(b * (x - minX));
    out[2] = 1;
  });
  const found = projectedSearch(range(90, (t) => lowest * (highest / lowest) ** t), solve);
  if (!found) return null;
  const [s, c, d] = found.coefficients as [number, number, number];
  const b = found.value;
  // s sin(b(x − x₀)) + c cos(b(x − x₀)) = A sin(bx + φ)
  return [Math.hypot(s, c), b, wrapPhase(Math.atan2(c, s) - b * minX), d];
}

function wrapPhase(phase: number) {
  const wrapped = ((phase + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return wrapped <= -Math.PI ? wrapped + 2 * Math.PI : wrapped;
}

function better(first: { value: number; coefficients: number[] } | null, second: typeof first, solve: (value: number) => LinearSolution | null) {
  const rss = (found: typeof first) => (found ? solve(found.value)?.rss ?? Infinity : Infinity);
  return rss(first) <= rss(second) ? first : second;
}

function fitExponential(points: readonly Point[], weights: Float64Array): number[] | null {
  const { minX, width } = bounds(points);
  if (width <= 0) return null;
  const { xs, ys } = coordinates(points);
  const center = minX + width / 2;
  const solve = (b: number) => smallLeastSquares(xs, ys, weights, 2, (x, out) => {
    out[0] = Math.exp(b * (x - center));
    out[1] = 1;
  });
  const magnitudes = range(40, (t) => 0.6 / width * (14 / 0.6) ** t);
  const found = better(projectedSearch(magnitudes.map((value) => -value).reverse(), solve), projectedSearch(magnitudes, solve), solve);
  if (!found) return null;
  const [a, c] = found.coefficients as [number, number];
  return [a * Math.exp(-found.value * center), found.value, c];
}

function fitAbsolute(points: readonly Point[], weights: Float64Array): number[] | null {
  const { minX, maxX, width } = bounds(points);
  if (width <= 0) return null;
  const { xs, ys } = coordinates(points);
  const solve = (h: number) => smallLeastSquares(xs, ys, weights, 2, (x, out) => {
    out[0] = Math.abs(x - h);
    out[1] = 1;
  });
  const found = projectedSearch(range(48, (t) => minX + width * (0.04 + 0.92 * t)), solve);
  if (!found || found.value <= minX || found.value >= maxX) return null;
  const [a, k] = found.coefficients as [number, number];
  return [a, found.value, k];
}

function fitReciprocal(points: readonly Point[], weights: Float64Array): number[] | null {
  const { minX, maxX, width } = bounds(points);
  if (width <= 0) return null;
  const { xs, ys } = coordinates(points);
  const solve = (h: number) => smallLeastSquares(xs, ys, weights, 2, (x, out) => {
    out[0] = 1 / (x - h);
    out[1] = 1;
  });
  const gaps = range(36, (t) => width * 0.03 * 100 ** t);
  const found = better(
    projectedSearch(gaps.map((gap) => minX - gap).reverse(), solve),
    projectedSearch(gaps.map((gap) => maxX + gap), solve),
    solve,
  );
  if (!found) return null;
  const [a, k] = found.coefficients as [number, number];
  return [a, found.value, k];
}

function fitCircle(points: readonly Point[]): number[] | null {
  // Kåsa algebraic estimate, then Gauss-Newton on the geometric distance.
  const algebraic = leastSquares([
    column(points, (point) => point.x),
    column(points, (point) => point.y),
    new Float64Array(points.length).fill(1),
  ], column(points, (point) => -(point.x ** 2 + point.y ** 2)));
  if (!algebraic) return null;
  const [D, E, F] = algebraic.coefficients as [number, number, number];
  let h = -D / 2;
  let k = -E / 2;
  let r = Math.sqrt(Math.max(1e-9, h * h + k * k - F));
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const distances = points.map((point) => Math.max(1e-9, Math.hypot(point.x - h, point.y - k)));
    const step = leastSquares([
      Float64Array.from(points, (point, index) => (point.x - h) / distances[index]!),
      Float64Array.from(points, (point, index) => (point.y - k) / distances[index]!),
      new Float64Array(points.length).fill(1),
    ], Float64Array.from(distances, (distance) => distance - r));
    if (!step) break;
    h += step.coefficients[0]!;
    k += step.coefficients[1]!;
    r += step.coefficients[2]!;
  }
  return Number.isFinite(h + k + r) && r > 0 ? [h, k, Math.abs(r)] : null;
}

// ——— evaluation ———

export function evaluate(kind: FitKind, params: readonly number[], input: number): number {
  switch (kind) {
    case "polynomial":
    case "sideways":
      return params.reduceRight((sum, coefficient) => sum * input + coefficient, 0);
    case "sine":
      return params[0]! * Math.sin(params[1]! * input + params[2]!) + params[3]!;
    case "exponential":
      return params[0]! * Math.exp(params[1]! * input) + params[2]!;
    case "absolute":
      return params[0]! * Math.abs(input - params[1]!) + params[2]!;
    case "reciprocal":
      return params[0]! / (input - params[1]!) + params[2]!;
    case "circle":
      return NaN;
  }
}

function distanceToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

/** Orthogonal residuals of the stroke against the curve over the stroke's own extent. */
export function residuals(kind: FitKind, params: readonly number[], points: readonly Point[]): number[] {
  if (kind === "circle") {
    return points.map((point) => Math.abs(Math.hypot(point.x - params[0]!, point.y - params[1]!) - params[2]!));
  }
  const box = bounds(points);
  const sideways = kind === "sideways";
  const [from, to] = sideways ? [box.minY, box.maxY] : [box.minX, box.maxX];
  const limit = 50 * Math.max(box.width, box.height, 1);
  const curve = range(curveSamples, (t) => {
    const input = from + (to - from) * t;
    const output = Math.max(-limit, Math.min(limit, evaluate(kind, params, input)));
    return sideways ? { x: output, y: input } : { x: input, y: output };
  });
  return points.map((point) => {
    let best = Infinity;
    for (let index = 1; index < curve.length; index += 1) {
      best = Math.min(best, distanceToSegment(point, curve[index - 1]!, curve[index]!));
    }
    return best;
  });
}

/**
 * Model choice weighs relative error against complexity. A hand-drawn stroke
 * deviates from any ideal curve systematically, not by independent noise, so
 * its many samples are not many observations: an information criterion on the
 * raw sample count would let every extra coefficient chase the wobble. Error
 * is therefore taken relative to the stroke's size and floored at the
 * steadiness a hand can manage, and each parameter costs a fixed amount.
 * Tuned against simulated hand strokes (see the tests).
 */
export const selectionTuning = {
  /** Score cost per parameter, in units of ln(relative mean-square error). */
  complexityWeight: 0.5,
  /** Relative error below which a closer fit is not evidence of a different curve. */
  errorFloor: 0.02,
  /** Share of worst residuals ignored, so landing or lifting hooks do not decide the family. */
  trimmed: 0.06,
  /** Extra relative error allowed when rounding coefficients. */
  roundingSlack: 0.015,
};

function strokeScale(points: readonly Point[]) {
  const box = bounds(points);
  return Math.max(1e-6, Math.hypot(box.width, box.height));
}

function measure(kind: FitKind, params: readonly number[], points: readonly Point[], scale: number): Fit {
  const squares = residuals(kind, params, points).map((distance) => distance * distance).sort((a, b) => a - b);
  const kept = squares.slice(0, Math.max(1, Math.ceil(squares.length * (1 - selectionTuning.trimmed))));
  const meanSquare = kept.reduce((sum, value) => sum + value, 0) / kept.length;
  const relative = meanSquare / (scale * scale);
  const score = Math.log(relative + selectionTuning.errorFloor ** 2) + selectionTuning.complexityWeight * params.length;
  return { kind, params, rms: Math.sqrt(meanSquare), score };
}

// ——— simplification ———

const roundTo = (value: number, step: number) => {
  const rounded = Math.round(value / step) * step;
  return Object.is(rounded, -0) ? 0 : Number(rounded.toFixed(6));
};
const roundingSteps = [1, 0.5, 0.1, 0.05, 0.01, 0.001, 0.0001];

// Greedily gives each coefficient the coarsest step (whole, half, tenth, …)
// that keeps the curve about as close to the stroke as the unrounded fit.
function simplify(fit: Fit, points: readonly Point[], scale: number): Fit {
  const allowed = Math.max(fit.rms * 1.25, fit.rms + selectionTuning.roundingSlack * scale);
  let params = [...fit.params];
  let current = fit;
  fit.params.forEach((value, index) => {
    for (const step of roundingSteps) {
      const candidate = [...params];
      candidate[index] = roundTo(value, step);
      if (fit.kind === "circle" && candidate[2]! <= 0) continue;
      if (fit.kind === "sine" && candidate[1]! <= 0) continue;
      const measured = measure(fit.kind, candidate, points, scale);
      if (measured.rms <= allowed) {
        params = candidate;
        current = measured;
        return;
      }
    }
  });
  return current;
}

// ——— selection ———

type Family = Readonly<{ kind: FitKind; fit: (points: readonly Point[], weights: Float64Array) => number[] | null }>;

const graphFamilies: readonly Family[] = [
  ...[0, 1, 2, 3, 4, 5].map((degree): Family => ({ kind: "polynomial", fit: (points, weights) => fitPolynomial(points, weights, degree, "x") })),
  { kind: "sine", fit: fitSine },
  { kind: "exponential", fit: fitExponential },
  { kind: "absolute", fit: fitAbsolute },
  { kind: "reciprocal", fit: fitReciprocal },
];

// A stroke that turns back in x is no function of x: it is offered as a
// function of y or as a circle instead.
const relationFamilies: readonly Family[] = [
  ...[0, 1, 2, 3].map((degree): Family => ({ kind: "sideways", fit: (points, weights) => fitPolynomial(points, weights, degree, "y") })),
  { kind: "circle", fit: (points) => fitCircle(points) },
];

// Vertical least squares overweights steep stretches. Reweighting each sample
// by 1 / (1 + slope²) turns its vertical residual into the first-order
// orthogonal distance, so a few passes approach the geometric fit.
function fitFamily(family: Family, points: readonly Point[], scale: number): Fit | null {
  let weights = new Float64Array(points.length).fill(1);
  let best: Fit | null = null;
  const passes = family.kind === "circle" ? 1 : 3;
  for (let pass = 0; pass < passes; pass += 1) {
    const params = family.fit(points, weights);
    if (!params || !params.every(Number.isFinite)) break;
    const measured = measure(family.kind, params, points, scale);
    if (!best || measured.score < best.score) best = measured;
    const sideways = family.kind === "sideways";
    weights = Float64Array.from(points, (point) => {
      const input = sideways ? point.y : point.x;
      const step = 1e-4 * scale;
      const slope = (evaluate(family.kind, params, input + step) - evaluate(family.kind, params, input - step)) / (2 * step);
      return Number.isFinite(slope) ? 1 / (1 + Math.min(slope * slope, 1e4)) : 1e-4;
    });
  }
  return best;
}

export function fitStroke(stroke: readonly Point[], options: FitOptions): Fit | null {
  const points = resampleStroke(stroke, options.noise);
  if (points.length < 6) return null;
  const box = bounds(points);
  if (Math.max(box.width, box.height) < 6 * options.noise) return null;
  const scale = strokeScale(points);
  const families = isGraphOfX(points, options.noise) ? graphFamilies : relationFamilies;
  let best: Fit | null = null;
  for (const family of families) {
    const measured = fitFamily(family, points, scale);
    if (measured && (!best || measured.score < best.score)) best = measured;
  }
  if (!best) return null;
  return options.simplify === false ? best : simplify(best, points, scale);
}

// ——— drawing support ———

/** Polylines of the fitted curve across the visible plane, broken at asymptotes and far excursions. */
export function curvePolylines(fit: Fit, view: Readonly<{ minX: number; maxX: number; minY: number; maxY: number }>, step: number): Point[][] {
  if (fit.kind === "circle") {
    const [h, k, r] = fit.params as [number, number, number];
    const count = Math.max(48, Math.ceil(2 * Math.PI * r / step));
    return [range(count + 1, (t) => ({ x: h + r * Math.cos(2 * Math.PI * t), y: k + r * Math.sin(2 * Math.PI * t) }))];
  }
  const sideways = fit.kind === "sideways";
  const [from, to] = sideways ? [view.minY, view.maxY] : [view.minX, view.maxX];
  const [low, high] = sideways ? [view.minX, view.maxX] : [view.minY, view.maxY];
  const reach = (high - low) * 2;
  const lines: Point[][] = [];
  let line: Point[] = [];
  const count = Math.ceil((to - from) / step);
  for (let index = 0; index <= count; index += 1) {
    const input = from + (to - from) * index / count;
    const previousInput = from + (to - from) * (index - 1) / count;
    const crossesPole = fit.kind === "reciprocal" && index > 0 && (previousInput - fit.params[1]!) * (input - fit.params[1]!) <= 0;
    const output = evaluate(fit.kind, fit.params, input);
    const visible = Number.isFinite(output) && output > low - reach && output < high + reach;
    if (!visible || crossesPole) {
      if (line.length > 1) lines.push(line);
      line = [];
      if (!visible) continue;
    }
    line.push(sideways ? { x: output, y: input } : { x: input, y: output });
  }
  if (line.length > 1) lines.push(line);
  return lines;
}
