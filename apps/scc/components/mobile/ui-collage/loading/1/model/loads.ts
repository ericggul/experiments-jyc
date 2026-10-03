export type Point = { x: number; y: number };

export type Grid = {
  size: number;
  pitch: number;
  columns: number;
  rows: number;
  /** Centre of the first cell; the grid is centred on both axes. */
  left: number;
  top: number;
};

export type Loads = {
  grid: Grid;
  /** 0–1 per cell. */
  progress: Float32Array;
  /** Progress per second for the current burst. */
  rate: Float32Array;
  /** Seconds left in the current burst. */
  remaining: Float32Array;
  /** Mean seconds a cell takes from 0 to 1. */
  duration: Float32Array;
  random: () => number;
};

// Cells keep a third of their size as gutter, with at least 8 px.
export function gridFor(width: number, height: number, size: number): Grid {
  const pitch = size + Math.max(8, Math.round(size / 3));
  const columns = Math.max(1, Math.floor(width / pitch));
  const rows = Math.max(1, Math.floor(height / pitch));
  return {
    size,
    pitch,
    columns,
    rows,
    left: (width - columns * pitch) / 2 + pitch / 2,
    top: (height - rows * pitch) / 2 + pitch / 2,
  };
}

export function cellCentre(grid: Grid, cell: number): Point {
  return {
    x: grid.left + (cell % grid.columns) * grid.pitch,
    y: grid.top + Math.floor(cell / grid.columns) * grid.pitch,
  };
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
function restart(loads: Loads, cell: number) {
  loads.progress[cell] = 0;
  loads.rate[cell] = 0;
  loads.remaining[cell] = 0.15 + loads.random() * 0.5;
  loads.duration[cell] = 4 + loads.random() * 10;
}

// Real loads arrive in bursts: a fifth of bursts stall, the rest run between 0.35× and 1.65× the mean pace.
function nextBurst(loads: Loads, cell: number) {
  const stall = loads.random() < 0.2;
  loads.rate[cell] = stall ? 0 : (0.35 + loads.random() * 1.3) / (0.8 * loads.duration[cell]!);
  loads.remaining[cell] = 0.25 + loads.random() * 1.2;
}

export function createLoads(width: number, height: number, size: number, seed = 1): Loads {
  const grid = gridFor(width, height, size);
  const count = grid.columns * grid.rows;
  const loads: Loads = {
    grid,
    progress: new Float32Array(count),
    rate: new Float32Array(count),
    remaining: new Float32Array(count),
    duration: new Float32Array(count),
    random: mulberry32(seed),
  };
  for (let cell = 0; cell < count; cell += 1) restart(loads, cell);
  return loads;
}

/** Same cell size on a new viewport: cells at the same row and column keep their state. */
export function resizeLoads(previous: Loads, width: number, height: number): Loads {
  const next = createLoads(width, height, previous.grid.size, Math.floor(previous.random() * 2 ** 32));
  const { columns, rows } = next.grid;
  for (let row = 0; row < Math.min(rows, previous.grid.rows); row += 1) {
    for (let column = 0; column < Math.min(columns, previous.grid.columns); column += 1) {
      const from = row * previous.grid.columns + column;
      const to = row * columns + column;
      next.progress[to] = previous.progress[from]!;
      next.rate[to] = previous.rate[from]!;
      next.remaining[to] = previous.remaining[from]!;
      next.duration[to] = previous.duration[from]!;
    }
  }
  return next;
}

/** Advances every load; returns whether any is still below 100%. */
export function stepLoads(loads: Loads, seconds: number): boolean {
  let loading = false;
  for (let cell = 0; cell < loads.progress.length; cell += 1) {
    if (loads.progress[cell]! >= 1) continue;
    let left = seconds;
    while (left > 0) {
      const span = Math.min(left, loads.remaining[cell]!);
      loads.progress[cell] = Math.min(1, loads.progress[cell]! + loads.rate[cell]! * span);
      loads.remaining[cell] = loads.remaining[cell]! - span;
      left -= span;
      if (loads.remaining[cell]! <= 0) nextBurst(loads, cell);
    }
    if (loads.progress[cell]! < 1) loading = true;
  }
  return loading;
}

function distanceToSegment(point: Point, from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / length));
  return Math.hypot(point.x - (from.x + dx * t), point.y - (from.y + dy * t));
}

/** Restarts every load whose cell the finger's segment passes through; returns how many restarted. */
export function restartAlong(loads: Loads, from: Point, to: Point): number {
  const { grid } = loads;
  const reach = grid.pitch / 2;
  const firstColumn = Math.max(0, Math.floor((Math.min(from.x, to.x) - reach - grid.left) / grid.pitch));
  const lastColumn = Math.min(grid.columns - 1, Math.ceil((Math.max(from.x, to.x) + reach - grid.left) / grid.pitch));
  const firstRow = Math.max(0, Math.floor((Math.min(from.y, to.y) - reach - grid.top) / grid.pitch));
  const lastRow = Math.min(grid.rows - 1, Math.ceil((Math.max(from.y, to.y) + reach - grid.top) / grid.pitch));
  let restarted = 0;
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const cell = row * grid.columns + column;
      if (distanceToSegment(cellCentre(grid, cell), from, to) > reach) continue;
      restart(loads, cell);
      restarted += 1;
    }
  }
  return restarted;
}
