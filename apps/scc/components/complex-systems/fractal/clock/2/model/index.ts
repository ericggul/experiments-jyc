export const MOBILE_CLOCK_CELL = 50;
export const MAXIMUM_CLOCK_CELL = 72;
export const VIEWPORT_CELLS_ON_SHORT_SIDE = 14;
export const CLOCK_RADIUS_IN_CELL = 0.44;
export const HOUR_HAND_LENGTH = 0.53;
export const MINUTE_HAND_LENGTH = 0.74;

const TAU = Math.PI * 2;
const HOUR_SECONDS = 3600;
const DIAL_SECONDS = 12 * HOUR_SECONDS;
const SPRING_STIFFNESS = 70;
const SPRING_DAMPING = 2 * Math.sqrt(SPRING_STIFFNESS) * 0.72;
const SETTLED_SECONDS = 0.5;
const SETTLED_VELOCITY = 2;

export type Point = Readonly<{ x: number; y: number }>;

/**
 * Every clock shows `realSeconds + offset`. Its hour and minute hands are
 * geared from that one time, so turning one turns the other.
 */
export type ClockGrid = {
  width: number;
  height: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  radius: number;
  offset: Float64Array;
  offsetTarget: Float64Array;
  offsetVelocity: Float64Array;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function unitFraction(value: number) {
  return value - Math.floor(value);
}

/** Shortest signed rotation from `from` to `to`, in (-π, π]. */
export function angleDelta(from: number, to: number) {
  const delta = unitFraction((to - from + Math.PI) / TAU) * TAU - Math.PI;
  return delta === -Math.PI ? Math.PI : delta;
}

/** Fraction of a turn, clockwise from twelve o'clock, for a canvas angle. */
function dialTurns(angle: number) {
  return unitFraction((angle + Math.PI / 2) / TAU);
}

export function handAngles(seconds: number) {
  return {
    hour: -Math.PI / 2 + TAU * unitFraction(seconds / DIAL_SECONDS),
    minute: -Math.PI / 2 + TAU * unitFraction(seconds / HOUR_SECONDS),
  };
}

/**
 * The time on a 12-hour dial whose minute hand points exactly at
 * `minuteAngle` and whose hour hand is nearest `hourAngle`.
 */
export function timeForHands(hourAngle: number, minuteAngle: number) {
  const minuteFraction = dialTurns(minuteAngle);
  const hour = Math.round(dialTurns(hourAngle) * 12 - minuteFraction);
  return (((hour % 12) + 12) % 12 + minuteFraction) * HOUR_SECONDS;
}

function nearestEquivalent(value: number, reference: number, period: number) {
  return value + Math.round((reference - value) / period) * period;
}

export function localClockSeconds(date: Date) {
  return (
    (date.getHours() % 12) * HOUR_SECONDS +
    date.getMinutes() * 60 +
    date.getSeconds() +
    date.getMilliseconds() / 1000
  );
}

export function clockCellForViewport(width: number, height: number) {
  const shortest = Math.max(0, Math.min(width, height));
  return clamp(
    shortest / VIEWPORT_CELLS_ON_SHORT_SIDE,
    MOBILE_CLOCK_CELL,
    MAXIMUM_CLOCK_CELL,
  );
}

export function clockCenter(grid: ClockGrid, index: number): Point {
  const column = index % grid.columns;
  const row = Math.floor(index / grid.columns);
  return {
    x: (column + 0.5) * grid.cellWidth,
    y: (row + 0.5) * grid.cellHeight,
  };
}

export function createClockGrid(width: number, height: number): ClockGrid {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const cell = clockCellForViewport(safeWidth, safeHeight);
  const columns = Math.max(1, Math.round(safeWidth / cell));
  const rows = Math.max(1, Math.round(safeHeight / cell));
  const cellWidth = safeWidth / columns;
  const cellHeight = safeHeight / rows;
  const count = columns * rows;
  return {
    width: safeWidth,
    height: safeHeight,
    columns,
    rows,
    cellWidth,
    cellHeight,
    radius: Math.min(cellWidth, cellHeight) * CLOCK_RADIUS_IN_CELL,
    offset: new Float64Array(count),
    offsetTarget: new Float64Array(count),
    offsetVelocity: new Float64Array(count),
  };
}

/** Rebuild the grid for a new viewport, carrying each time from the nearest old clock. */
export function resizeClockGrid(
  previous: ClockGrid,
  width: number,
  height: number,
): ClockGrid {
  const next = createClockGrid(width, height);
  for (let index = 0; index < next.columns * next.rows; index += 1) {
    const center = clockCenter(next, index);
    const column = clamp(
      Math.floor((center.x / next.width) * previous.columns),
      0,
      previous.columns - 1,
    );
    const row = clamp(
      Math.floor((center.y / next.height) * previous.rows),
      0,
      previous.rows - 1,
    );
    const source = row * previous.columns + column;
    next.offset[index] = previous.offsetTarget[source]!;
    next.offsetTarget[index] = previous.offsetTarget[source]!;
  }
  return next;
}

/**
 * Direction from `center` to the point where segment `from → to` leaves the
 * circle, or null when the segment does not cross the rim outward.
 */
export function exitAngle(
  center: Point,
  radius: number,
  from: Point,
  to: Point,
): number | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const fx = from.x - center.x;
  const fy = from.y - center.y;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant <= 0) return null;
  const leave = (-b + Math.sqrt(discriminant)) / (2 * a);
  if (leave <= 0 || leave > 1) return null;
  return Math.atan2(fy + dy * leave, fx + dx * leave);
}

/**
 * Set every clock whose rim the stroke leaves to the time whose hour hand is
 * nearest the exit direction and whose minute hand points at the finger.
 * The hands take the shorter way round the dial.
 */
export function applyStroke(
  grid: ClockGrid,
  from: Point,
  to: Point,
  realSeconds: number,
) {
  const { radius, columns, rows, cellWidth, cellHeight } = grid;
  const firstColumn = clamp(Math.floor((Math.min(from.x, to.x) - radius) / cellWidth), 0, columns - 1);
  const lastColumn = clamp(Math.floor((Math.max(from.x, to.x) + radius) / cellWidth), 0, columns - 1);
  const firstRow = clamp(Math.floor((Math.min(from.y, to.y) - radius) / cellHeight), 0, rows - 1);
  const lastRow = clamp(Math.floor((Math.max(from.y, to.y) + radius) / cellHeight), 0, rows - 1);
  let changed = false;
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const index = row * columns + column;
      const center = clockCenter(grid, index);
      const hour = exitAngle(center, radius, from, to);
      if (hour === null) continue;
      const minute = Math.atan2(to.y - center.y, to.x - center.x);
      const offset = timeForHands(hour, minute) - realSeconds;
      grid.offsetTarget[index] = nearestEquivalent(
        offset,
        grid.offsetTarget[index]!,
        DIAL_SECONDS,
      );
      changed = true;
    }
  }
  return changed;
}

/**
 * Turn every minute hand the shorter way toward its nearest finger. The
 * geared hour hand moves one twelfth as far.
 */
export function aimMinutes(
  grid: ClockGrid,
  fingers: readonly Point[],
  realSeconds: number,
) {
  if (fingers.length === 0) return;
  for (let index = 0; index < grid.columns * grid.rows; index += 1) {
    const center = clockCenter(grid, index);
    let nearestX = 0;
    let nearestY = 0;
    let nearest = Infinity;
    for (const finger of fingers) {
      const x = finger.x - center.x;
      const y = finger.y - center.y;
      const distance = x * x + y * y;
      if (distance < nearest) {
        nearest = distance;
        nearestX = x;
        nearestY = y;
      }
    }
    if (nearest < 1e-6) continue;
    const shown = realSeconds + grid.offsetTarget[index]!;
    const turns = dialTurns(Math.atan2(nearestY, nearestX)) - unitFraction(shown / HOUR_SECONDS);
    const shortest = turns - Math.round(turns);
    grid.offsetTarget[index] = grid.offsetTarget[index]! + shortest * HOUR_SECONDS;
  }
}

/** Advance every clock's time spring; returns whether any clock is still turning. */
export function stepClockGrid(grid: ClockGrid, seconds: number) {
  const dt = clamp(seconds, 0, 1 / 30);
  const { offset, offsetTarget, offsetVelocity } = grid;
  let moving = false;
  for (let index = 0; index < offset.length; index += 1) {
    const delta = offsetTarget[index]! - offset[index]!;
    let speed = offsetVelocity[index]!;
    if (Math.abs(delta) < SETTLED_SECONDS && Math.abs(speed) < SETTLED_VELOCITY) {
      offset[index] = offsetTarget[index]!;
      offsetVelocity[index] = 0;
      continue;
    }
    speed += (SPRING_STIFFNESS * delta - SPRING_DAMPING * speed) * dt;
    offsetVelocity[index] = speed;
    offset[index] = offset[index]! + speed * dt;
    moving = true;
  }
  return moving;
}
