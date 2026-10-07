/**
 * A grid of instruction signs played by finger skating, after fractal/clock/2.
 * Each sign has two channels: the arrow's bend (`heading`, the `arrowFor`
 * turn) and the whole sign's rotation. Either channel can be driven by
 * `exit` (toward the point where the finger left the rim) or `follow`
 * (toward the nearest finger while it is down). Angles are clockwise from
 * straight ahead (up); the arrow is drawn at rotation + bend.
 */

export const MOBILE_SIGN_CELL = 36;
export const MAXIMUM_SIGN_CELL = 52;
export const VIEWPORT_CELLS_ON_SHORT_SIDE = 20;
export const SIGN_RADIUS_IN_CELL = 0.47;

const TAU = Math.PI * 2;
const SPRING_STIFFNESS = 70;
const SPRING_DAMPING = 2 * Math.sqrt(SPRING_STIFFNESS) * 0.72;
const SETTLED_ANGLE = 1e-3;
const SETTLED_VELOCITY = 1e-2;
/** How far past a U-turn the sign may carry a held bend before it sweeps to the other side. */
const U_TURN_HYSTERESIS = 0.6;
/** A held bend this close to its target is locked to it instead of sprung. */
const LOCKED_BEND = 0.02;

export type Point = Readonly<{ x: number; y: number }>;
export type SignChannel = "arrow" | "sign";

export type SignGrid = {
  width: number;
  height: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  radius: number;
  heading: Float64Array;
  headingTarget: Float64Array;
  headingVelocity: Float64Array;
  rotation: Float64Array;
  rotationTarget: Float64Array;
  rotationVelocity: Float64Array;
  /**
   * Screen heading recorded when a finger last left each sign: the finger's
   * travel direction when given, else the exit point. NaN until then.
   */
  exit: Float64Array;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Shortest signed rotation from `from` to `to`, in (-π, π]. */
export function angleDelta(from: number, to: number) {
  const delta = to - from - Math.floor((to - from + Math.PI) / TAU) * TAU;
  return delta === -Math.PI ? Math.PI : delta;
}

/** Heading of the vector (dx, dy), clockwise from up. */
export function headingOf(dx: number, dy: number) {
  return Math.atan2(dx, -dy);
}

export function signCellForViewport(width: number, height: number) {
  const shortest = Math.max(0, Math.min(width, height));
  return clamp(shortest / VIEWPORT_CELLS_ON_SHORT_SIDE, MOBILE_SIGN_CELL, MAXIMUM_SIGN_CELL);
}

export function signCenter(grid: SignGrid, index: number): Point {
  const column = index % grid.columns;
  const row = Math.floor(index / grid.columns);
  return { x: (column + 0.5) * grid.cellWidth, y: (row + 0.5) * grid.cellHeight };
}

export function createSignGrid(width: number, height: number): SignGrid {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const cell = signCellForViewport(safeWidth, safeHeight);
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
    radius: Math.min(cellWidth, cellHeight) * SIGN_RADIUS_IN_CELL,
    heading: new Float64Array(count),
    headingTarget: new Float64Array(count),
    headingVelocity: new Float64Array(count),
    rotation: new Float64Array(count),
    rotationTarget: new Float64Array(count),
    rotationVelocity: new Float64Array(count),
    exit: new Float64Array(count).fill(Number.NaN),
  };
}

/** Rebuild the grid for a new viewport, carrying each sign's angles from the nearest old sign. */
export function resizeSignGrid(previous: SignGrid, width: number, height: number): SignGrid {
  const next = createSignGrid(width, height);
  for (let index = 0; index < next.columns * next.rows; index += 1) {
    const center = signCenter(next, index);
    const column = clamp(Math.floor((center.x / next.width) * previous.columns), 0, previous.columns - 1);
    const row = clamp(Math.floor((center.y / next.height) * previous.rows), 0, previous.rows - 1);
    const source = row * previous.columns + column;
    next.heading[index] = previous.headingTarget[source]!;
    next.headingTarget[index] = previous.headingTarget[source]!;
    next.rotation[index] = previous.rotationTarget[source]!;
    next.rotationTarget[index] = previous.rotationTarget[source]!;
    next.exit[index] = previous.exit[source]!;
  }
  return next;
}

/**
 * Heading from `center` to the point where segment `from → to` leaves the
 * circle, or null when the segment does not cross the rim outward.
 */
export function exitHeading(center: Point, radius: number, from: Point, to: Point): number | null {
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
  return headingOf(fx + dx * leave, fy + dy * leave);
}

/**
 * Headings live in [-π, π] without wrapping: −π is the left U-turn arrow and
 * +π the right one. Moving between them sweeps back through straight ahead,
 * so the arrow's shape changes continuously instead of flipping sides.
 */
function turnToward(grid: SignGrid, index: number, heading: number) {
  const current = grid.headingTarget[index]!;
  const turn = wrapHeading(heading);
  // Straight back keeps the U-turn side the arrow already bends toward.
  grid.headingTarget[index] = turn === Math.PI && current < 0 ? -Math.PI : turn;
}

/** The whole sign has no sides, so it always rotates the shorter way. */
function rotateToward(grid: SignGrid, index: number, heading: number) {
  const current = grid.rotationTarget[index]!;
  grid.rotationTarget[index] = current + angleDelta(current, heading);
}

function towardFor(channel: SignChannel) {
  return channel === "arrow" ? turnToward : rotateToward;
}

/** Back to the start: every sign upright with a straight arrow and no recorded exit. */
export function resetSignGrid(grid: SignGrid) {
  for (const values of [
    grid.heading,
    grid.headingTarget,
    grid.headingVelocity,
    grid.rotation,
    grid.rotationTarget,
    grid.rotationVelocity,
  ]) {
    values.fill(0);
  }
  grid.exit.fill(Number.NaN);
}

/** Stand every sign upright again, the shorter way round. */
export function uprightSigns(grid: SignGrid) {
  for (let index = 0; index < grid.rotationTarget.length; index += 1) {
    const current = grid.rotationTarget[index]!;
    grid.rotationTarget[index] = Math.round(current / TAU) * TAU;
  }
}

/**
 * Point `channel` of every sign whose rim the stroke leaves toward its exit
 * point. An arrow stroke also records a screen heading for the exit: the
 * finger's `travel` heading when given, else the exit point. With
 * `recordOnly` it leaves the bend to `holdExitsOnScreen`.
 */
export function applyStroke(
  grid: SignGrid,
  from: Point,
  to: Point,
  channel: SignChannel = "arrow",
  recordOnly = false,
  travel?: number,
) {
  const toward = towardFor(channel);
  const { radius, columns, rows, cellWidth, cellHeight } = grid;
  const firstColumn = clamp(Math.floor((Math.min(from.x, to.x) - radius) / cellWidth), 0, columns - 1);
  const lastColumn = clamp(Math.floor((Math.max(from.x, to.x) + radius) / cellWidth), 0, columns - 1);
  const firstRow = clamp(Math.floor((Math.min(from.y, to.y) - radius) / cellHeight), 0, rows - 1);
  const lastRow = clamp(Math.floor((Math.max(from.y, to.y) + radius) / cellHeight), 0, rows - 1);
  let changed = false;
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const index = row * columns + column;
      const heading = exitHeading(signCenter(grid, index), radius, from, to);
      if (heading === null) continue;
      if (!recordOnly) toward(grid, index, heading);
      if (channel === "arrow") grid.exit[index] = travel ?? heading;
      changed = true;
    }
  }
  return changed;
}

/**
 * Re-solve every recorded bend against the sign's current rotation, so the
 * drawn arrow (rotation + bend) keeps pointing at the exit while the sign
 * turns. Once a bend has reached its target it is locked to it, not sprung,
 * so it never lags the rotation; a new exit or a change of side springs
 * there first. A bend held at a U-turn stays there until the sign has turned
 * U_TURN_HYSTERESIS past it, then sweeps through straight to the other side.
 */
export function holdExitsOnScreen(grid: SignGrid) {
  for (let index = 0; index < grid.exit.length; index += 1) {
    const exit = grid.exit[index]!;
    if (Number.isNaN(exit)) continue;
    const current = grid.heading[index]!;
    const locked = Math.abs(current - grid.headingTarget[index]!) < LOCKED_BEND;
    let target = wrapHeading(exit - grid.rotation[index]!);
    if (Math.abs(target - current) > Math.PI) {
      const sameSide = current > 0 ? target + TAU : target - TAU;
      if (Math.abs(sameSide) <= Math.PI + U_TURN_HYSTERESIS) target = clamp(sameSide, -Math.PI, Math.PI);
    }
    grid.headingTarget[index] = target;
    if (locked && Math.abs(target - current) < 0.5) {
      grid.heading[index] = target;
      grid.headingVelocity[index] = 0;
    }
  }
}

/** Turn `channel` of every sign toward its nearest finger. */
export function aimAtFingers(grid: SignGrid, fingers: readonly Point[], channel: SignChannel = "arrow") {
  if (fingers.length === 0) return;
  const toward = towardFor(channel);
  for (let index = 0; index < grid.columns * grid.rows; index += 1) {
    const center = signCenter(grid, index);
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
    toward(grid, index, headingOf(nearestX, nearestY));
  }
}

/** Advance every bend and rotation spring; returns whether any sign is still turning. */
export function stepSignGrid(grid: SignGrid, seconds: number, snap = false) {
  const dt = clamp(seconds, 0, 1 / 30);
  const { heading, headingTarget, headingVelocity, rotation, rotationTarget, rotationVelocity } = grid;
  let moving = false;
  for (let index = 0; index < rotation.length; index += 1) {
    const delta = rotationTarget[index]! - rotation[index]!;
    let speed = rotationVelocity[index]!;
    if (snap || (Math.abs(delta) < SETTLED_ANGLE && Math.abs(speed) < SETTLED_VELOCITY)) {
      rotation[index] = rotationTarget[index]!;
      rotationVelocity[index] = 0;
      continue;
    }
    speed += (SPRING_STIFFNESS * delta - SPRING_DAMPING * speed) * dt;
    rotationVelocity[index] = speed;
    rotation[index] = rotation[index]! + speed * dt;
    moving = true;
  }
  for (let index = 0; index < heading.length; index += 1) {
    const delta = headingTarget[index]! - heading[index]!;
    let speed = headingVelocity[index]!;
    if (snap || (Math.abs(delta) < SETTLED_ANGLE && Math.abs(speed) < SETTLED_VELOCITY)) {
      heading[index] = headingTarget[index]!;
      headingVelocity[index] = 0;
      continue;
    }
    speed += (SPRING_STIFFNESS * delta - SPRING_DAMPING * speed) * dt;
    headingVelocity[index] = speed;
    const next = heading[index]! + speed * dt;
    // Overshoot past a U-turn would flip the bend; hold it at the U-turn.
    heading[index] = clamp(next, -Math.PI, Math.PI);
    if (next !== heading[index]) headingVelocity[index] = 0;
    moving = true;
  }
  return moving;
}

/** `heading` wrapped to (-π, π], the domain of `arrowFor`. */
export function wrapHeading(heading: number) {
  return angleDelta(0, heading);
}
