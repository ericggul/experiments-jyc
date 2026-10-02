/** clock/2's cell: the child clocks keep exactly this size. */
export const MOBILE_CLOCK_CELL = 50;
export const MAXIMUM_CLOCK_CELL = 72;
export const VIEWPORT_CELLS_ON_SHORT_SIDE = 14;
export const CLOCK_RADIUS_IN_CELL = 0.44;
export const HOUR_HAND_LENGTH = 0.53;
export const MINUTE_HAND_LENGTH = 0.74;
/** Nominal child radius relative to its parent; sets the parent cell size. */
export const CHILD_RADIUS_RATIO = 0.25;
/** Largest child that still fits inside the parent rim at the minute-hand tip. */
export const MAXIMUM_CHILD_RADIUS_RATIO = 1 - MINUTE_HAND_LENGTH;
/** Child slot order: 0 rides the hour-hand tip, 1 the minute-hand tip. */
export const CHILDREN_PER_CLOCK = 2;

const TAU = Math.PI * 2;
const HOUR_SECONDS = 3600;
const DIAL_SECONDS = 12 * HOUR_SECONDS;
const SPRING_STIFFNESS = 70;
const SPRING_DAMPING = 2 * Math.sqrt(SPRING_STIFFNESS) * 0.72;
const SETTLED_SECONDS = 0.5;
const SETTLED_VELOCITY = 2;

export type Point = Readonly<{ x: number; y: number }>;

/** Each clock shows `realSeconds + offset`; its two hands are geared from that one time. */
export type ClockTimes = {
  offset: Float64Array;
  offsetTarget: Float64Array;
  offsetVelocity: Float64Array;
};

export type ClockGrid = {
  width: number;
  height: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  radius: number;
  childRadius: number;
  parents: ClockTimes;
  children: ClockTimes;
  /** Child centers at the parents' current hand tips; refresh with `updateChildCenters`. */
  childX: Float64Array;
  childY: Float64Array;
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

/** clock/2's cell size, used for each child clock. */
export function childCellForViewport(width: number, height: number) {
  const shortest = Math.max(0, Math.min(width, height));
  return clamp(
    shortest / VIEWPORT_CELLS_ON_SHORT_SIDE,
    MOBILE_CLOCK_CELL,
    MAXIMUM_CLOCK_CELL,
  );
}

/** Parent cell large enough that its children are clock/2-sized. */
export function parentCellForViewport(width: number, height: number) {
  return childCellForViewport(width, height) / CHILD_RADIUS_RATIO;
}

export function clockCenter(grid: ClockGrid, index: number): Point {
  const column = index % grid.columns;
  const row = Math.floor(index / grid.columns);
  return {
    x: (column + 0.5) * grid.cellWidth,
    y: (row + 0.5) * grid.cellHeight,
  };
}

function createTimes(count: number): ClockTimes {
  return {
    offset: new Float64Array(count),
    offsetTarget: new Float64Array(count),
    offsetVelocity: new Float64Array(count),
  };
}

export function createClockGrid(width: number, height: number): ClockGrid {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const cell = parentCellForViewport(safeWidth, safeHeight);
  const columns = Math.max(1, Math.round(safeWidth / cell));
  const rows = Math.max(1, Math.round(safeHeight / cell));
  const cellWidth = safeWidth / columns;
  const cellHeight = safeHeight / rows;
  const count = columns * rows;
  const radius = Math.min(cellWidth, cellHeight) * CLOCK_RADIUS_IN_CELL;
  return {
    width: safeWidth,
    height: safeHeight,
    columns,
    rows,
    cellWidth,
    cellHeight,
    radius,
    childRadius: Math.min(
      childCellForViewport(safeWidth, safeHeight) * CLOCK_RADIUS_IN_CELL,
      radius * MAXIMUM_CHILD_RADIUS_RATIO,
    ),
    parents: createTimes(count),
    children: createTimes(count * CHILDREN_PER_CLOCK),
    childX: new Float64Array(count * CHILDREN_PER_CLOCK),
    childY: new Float64Array(count * CHILDREN_PER_CLOCK),
  };
}

/** Place every child at the current tip of the parent hand that holds it. */
export function updateChildCenters(grid: ClockGrid, realSeconds: number) {
  const hourLength = grid.radius * HOUR_HAND_LENGTH;
  const minuteLength = grid.radius * MINUTE_HAND_LENGTH;
  for (let index = 0; index < grid.columns * grid.rows; index += 1) {
    const center = clockCenter(grid, index);
    const { hour, minute } = handAngles(realSeconds + grid.parents.offset[index]!);
    const child = index * CHILDREN_PER_CLOCK;
    grid.childX[child] = center.x + Math.cos(hour) * hourLength;
    grid.childY[child] = center.y + Math.sin(hour) * hourLength;
    grid.childX[child + 1] = center.x + Math.cos(minute) * minuteLength;
    grid.childY[child + 1] = center.y + Math.sin(minute) * minuteLength;
  }
}

/** Rebuild the grid for a new viewport, carrying each time from the nearest old clock. */
export function resizeClockGrid(
  previous: ClockGrid,
  width: number,
  height: number,
  realSeconds: number,
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
    next.parents.offset[index] = previous.parents.offsetTarget[source]!;
    next.parents.offsetTarget[index] = previous.parents.offsetTarget[source]!;
    for (let slot = 0; slot < CHILDREN_PER_CLOCK; slot += 1) {
      const from = source * CHILDREN_PER_CLOCK + slot;
      const to = index * CHILDREN_PER_CLOCK + slot;
      next.children.offset[to] = previous.children.offsetTarget[from]!;
      next.children.offsetTarget[to] = previous.children.offsetTarget[from]!;
    }
  }
  updateChildCenters(next, realSeconds);
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
 * If the stroke leaves this clock's rim, set it to the time whose hour hand is
 * nearest the exit direction and whose minute hand points at the finger.
 */
function skateExit(
  times: ClockTimes,
  index: number,
  center: Point,
  radius: number,
  from: Point,
  to: Point,
  realSeconds: number,
) {
  const hour = exitAngle(center, radius, from, to);
  if (hour === null) return false;
  const minute = Math.atan2(to.y - center.y, to.x - center.x);
  times.offsetTarget[index] = nearestEquivalent(
    timeForHands(hour, minute) - realSeconds,
    times.offsetTarget[index]!,
    DIAL_SECONDS,
  );
  return true;
}

/** Apply the exit rule to every parent and child clock the stroke leaves. */
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
      if (skateExit(grid.parents, index, clockCenter(grid, index), radius, from, to, realSeconds)) {
        changed = true;
      }
      for (let slot = 0; slot < CHILDREN_PER_CLOCK; slot += 1) {
        const child = index * CHILDREN_PER_CLOCK + slot;
        const center = { x: grid.childX[child]!, y: grid.childY[child]! };
        if (skateExit(grid.children, child, center, grid.childRadius, from, to, realSeconds)) {
          changed = true;
        }
      }
    }
  }
  return changed;
}

/** Turn one minute hand the shorter way toward its nearest finger. */
function aimMinute(
  times: ClockTimes,
  index: number,
  x: number,
  y: number,
  fingers: readonly Point[],
  realSeconds: number,
) {
  let nearestX = 0;
  let nearestY = 0;
  let nearest = Infinity;
  for (const finger of fingers) {
    const dx = finger.x - x;
    const dy = finger.y - y;
    const distance = dx * dx + dy * dy;
    if (distance < nearest) {
      nearest = distance;
      nearestX = dx;
      nearestY = dy;
    }
  }
  if (nearest < 1e-6) return;
  const shown = realSeconds + times.offsetTarget[index]!;
  const turns = dialTurns(Math.atan2(nearestY, nearestX)) - unitFraction(shown / HOUR_SECONDS);
  times.offsetTarget[index] = times.offsetTarget[index]! + (turns - Math.round(turns)) * HOUR_SECONDS;
}

/**
 * Turn every parent and child minute hand toward its nearest finger. Each
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
    aimMinute(grid.parents, index, center.x, center.y, fingers, realSeconds);
  }
  for (let child = 0; child < grid.childX.length; child += 1) {
    aimMinute(grid.children, child, grid.childX[child]!, grid.childY[child]!, fingers, realSeconds);
  }
}

function stepTimes({ offset, offsetTarget, offsetVelocity }: ClockTimes, dt: number) {
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

/** Advance every clock's time spring; returns whether any clock is still turning. */
export function stepClockGrid(grid: ClockGrid, seconds: number) {
  const dt = clamp(seconds, 0, 1 / 30);
  const parentsMoving = stepTimes(grid.parents, dt);
  const childrenMoving = stepTimes(grid.children, dt);
  return parentsMoving || childrenMoving;
}
