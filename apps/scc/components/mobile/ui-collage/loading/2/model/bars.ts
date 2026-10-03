export type Point = { x: number; y: number };

/** The area bars may occupy: viewport minus the 16 px gutter and safe-area insets. */
export type Bounds = { left: number; top: number; right: number; bottom: number };

export type Rows = {
  thickness: number;
  gap: number;
  /** thickness + gap, an integer so per-row patterns stay aligned. */
  pitch: number;
  count: number;
  /** Horizontal extent shared by every bar of every look: all bars start and end on these lines. */
  left: number;
  right: number;
  /** Top of the first bar; the stack is centred vertically in the bounds. */
  top: number;
};

export type Loads = {
  rows: Rows;
  /** 0–1 per row. */
  progress: Float32Array;
  /** Progress per second for the current burst. */
  rate: Float32Array;
  /** Seconds left in the current burst. */
  remaining: Float32Array;
  /** Mean seconds a row takes from 0 to 1. */
  duration: Float32Array;
  random: () => number;
};

// Rows keep a gap of 0.6× the thickness, at least 6 px.
export function rowsFor(bounds: Bounds, thickness: number): Rows {
  const gap = Math.max(6, Math.round(thickness * 0.6));
  const pitch = thickness + gap;
  const available = Math.max(0, bounds.bottom - bounds.top);
  const count = Math.max(1, Math.floor((available + gap) / pitch));
  const used = count * pitch - gap;
  return {
    thickness,
    gap,
    pitch,
    count,
    left: Math.round(bounds.left),
    right: Math.round(bounds.right),
    top: Math.round(bounds.top + (available - used) / 2),
  };
}

export function rowTop(rows: Rows, row: number) {
  return rows.top + row * rows.pitch;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// A restarted load first waits for its "request" before any progress appears.
function restart(loads: Loads, row: number) {
  loads.progress[row] = 0;
  loads.rate[row] = 0;
  loads.remaining[row] = 0.15 + loads.random() * 0.5;
  loads.duration[row] = 4 + loads.random() * 10;
}

// Real loads arrive in bursts: a fifth of bursts stall, the rest run between 0.35× and 1.65× the mean pace.
function nextBurst(loads: Loads, row: number) {
  const stall = loads.random() < 0.2;
  loads.rate[row] = stall ? 0 : (0.35 + loads.random() * 1.3) / (0.8 * loads.duration[row]!);
  loads.remaining[row] = 0.25 + loads.random() * 1.2;
}

export function createLoads(bounds: Bounds, thickness: number, seed = 1): Loads {
  const rows = rowsFor(bounds, thickness);
  const loads: Loads = {
    rows,
    progress: new Float32Array(rows.count),
    rate: new Float32Array(rows.count),
    remaining: new Float32Array(rows.count),
    duration: new Float32Array(rows.count),
    random: mulberry32(seed),
  };
  for (let row = 0; row < rows.count; row += 1) restart(loads, row);
  return loads;
}

/** Same thickness on new bounds: rows keep their state by index; new rows start at 0%. */
export function resizeLoads(previous: Loads, bounds: Bounds): Loads {
  const next = createLoads(bounds, previous.rows.thickness, Math.floor(previous.random() * 2 ** 32));
  const shared = Math.min(next.rows.count, previous.rows.count);
  next.progress.set(previous.progress.subarray(0, shared));
  next.rate.set(previous.rate.subarray(0, shared));
  next.remaining.set(previous.remaining.subarray(0, shared));
  next.duration.set(previous.duration.subarray(0, shared));
  return next;
}

/** Advances every load; returns whether any is still below 100%. */
export function stepLoads(loads: Loads, seconds: number): boolean {
  let loading = false;
  for (let row = 0; row < loads.progress.length; row += 1) {
    if (loads.progress[row]! >= 1) continue;
    let left = seconds;
    while (left > 0) {
      const span = Math.min(left, loads.remaining[row]!);
      loads.progress[row] = Math.min(1, loads.progress[row]! + loads.rate[row]! * span);
      loads.remaining[row] = loads.remaining[row]! - span;
      left -= span;
      if (loads.remaining[row]! <= 0) nextBurst(loads, row);
    }
    if (loads.progress[row]! < 1) loading = true;
  }
  return loading;
}

/** Liang–Barsky: does the segment from → to touch the rectangle? A zero-length segment is a point test. */
export function segmentHitsRect(from: Point, to: Point, left: number, top: number, right: number, bottom: number) {
  let t0 = 0;
  let t1 = 1;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const edges: [number, number][] = [
    [-dx, from.x - left],
    [dx, right - from.x],
    [-dy, from.y - top],
    [dy, bottom - from.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

/** After a seek the load pauses briefly, as a real transfer does after the user scrubs it, then carries on. */
function seek(loads: Loads, row: number, value: number) {
  loads.progress[row] = value;
  loads.rate[row] = 0;
  loads.remaining[row] = 0.15 + loads.random() * 0.5;
}

/** Where along the row the finger is: its current point if that lies in the band, else where the segment crosses the row's centre line. */
function crossingX(from: Point, to: Point, centre: number, top: number, bottom: number) {
  if (to.y >= top && to.y <= bottom) return to.x;
  if (from.y !== to.y && (from.y - centre) * (to.y - centre) <= 0) {
    return from.x + ((centre - from.y) / (to.y - from.y)) * (to.x - from.x);
  }
  return from.x;
}

/**
 * Sets every bar whose row band the finger's segment crosses to the horizontal position of that
 * crossing: a finger through the middle of a bar leaves it at 50%. Returns how many bars moved.
 * A band is the bar plus half the gap above and below, so the stack has no dead strips.
 */
export function seekAlong(loads: Loads, from: Point, to: Point): number {
  const { rows } = loads;
  const half = rows.gap / 2;
  const first = Math.max(0, Math.floor((Math.min(from.y, to.y) - rows.top + half) / rows.pitch));
  const last = Math.min(rows.count - 1, Math.floor((Math.max(from.y, to.y) - rows.top + half) / rows.pitch));
  let moved = 0;
  for (let row = first; row <= last; row += 1) {
    const top = rowTop(rows, row);
    if (!segmentHitsRect(from, to, rows.left, top - half, rows.right, top + rows.thickness + half)) continue;
    const x = crossingX(from, to, top + rows.thickness / 2, top - half, top + rows.thickness + half);
    seek(loads, row, Math.max(0, Math.min(1, (x - rows.left) / (rows.right - rows.left))));
    moved += 1;
  }
  return moved;
}
