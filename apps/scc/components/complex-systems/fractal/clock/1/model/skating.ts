import {
  CHILD_PHASE_INCREMENT,
  CHILD_RATE_MULTIPLIER,
  CLOCK_HANDS,
  CLOCK_PERIOD_SECONDS,
  normalizeChildRadiusRatio,
  normalizeRecursionDepth,
  type Point,
} from "./index.ts";

/**
 * Optional finger-skating layer for clock/1. Each clock shows its clock/1 time
 * plus a skated offset; with every offset at zero the layout equals
 * `createClockTree`.
 */

const TAU = Math.PI * 2;
const HOUR_SECONDS = 60 * 60;
const SPRING_STIFFNESS = 70;
const SPRING_DAMPING = 2 * Math.sqrt(SPRING_STIFFNESS) * 0.72;
const SETTLED_SECONDS = 0.5;
const SETTLED_VELOCITY = 2;

/** Index into `CLOCK_HANDS`: 0 hour, 1 minute, 2 second. */
export type HandIndex = 0 | 1 | 2;
export const NO_HAND = 255;

/**
 * clock/1's tree in flat, pre-order arrays: a parent always precedes its
 * children, so one forward pass lays the whole tree out.
 */
export type ClockStructure = Readonly<{
  count: number;
  depthLimit: number;
  keys: readonly string[];
  parent: Int32Array;
  hand: Uint8Array;
  depth: Uint8Array;
  rate: Float64Array;
  phase: Float64Array;
}>;

/**
 * Per-clock state. Each clock shows its clock/1 time plus a skated `offset`;
 * the hour and minute hands are geared from that sum. The second hand keeps
 * clock/1's time so geared jumps never spin it.
 */
export type ClockField = {
  structure: ClockStructure;
  offset: Float64Array;
  offsetTarget: Float64Array;
  offsetVelocity: Float64Array;
  x: Float64Array;
  y: Float64Array;
  radius: Float64Array;
  /** Hand angles, three per clock in `CLOCK_HANDS` order. */
  angle: Float64Array;
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

function nearestEquivalent(value: number, reference: number, period: number) {
  return value + Math.round((reference - value) / period) * period;
}

export function handAngle(hand: HandIndex, seconds: number) {
  return -Math.PI / 2 + TAU * unitFraction(seconds / CLOCK_HANDS[hand].periodSeconds);
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

export function createClockStructure(recursionDepth: number): ClockStructure {
  const depthLimit = normalizeRecursionDepth(recursionDepth);
  const count = (3 ** (depthLimit + 1) - 1) / 2;
  const keys: string[] = [];
  const parent = new Int32Array(count);
  const hand = new Uint8Array(count);
  const depth = new Uint8Array(count);
  const rate = new Float64Array(count);
  const phase = new Float64Array(count);

  const append = (
    key: string,
    parentIndex: number,
    holdingHand: number,
    level: number,
    clockRate: number,
    clockPhase: number,
  ) => {
    const index = keys.length;
    keys.push(key);
    parent[index] = parentIndex;
    hand[index] = holdingHand;
    depth[index] = level;
    rate[index] = clockRate;
    phase[index] = clockPhase;
    if (level >= depthLimit) return;
    CLOCK_HANDS.forEach((definition, child) => {
      append(
        `${key}/${definition.id}`,
        index,
        child,
        level + 1,
        clockRate * CHILD_RATE_MULTIPLIER[definition.id],
        unitFraction(clockPhase + CHILD_PHASE_INCREMENT[definition.id]),
      );
    });
  };
  append("root", -1, NO_HAND, 0, 1, 0);

  return { count, depthLimit, keys, parent, hand, depth, rate, phase };
}

export function createClockField(structure: ClockStructure): ClockField {
  const { count } = structure;
  return {
    structure,
    offset: new Float64Array(count),
    offsetTarget: new Float64Array(count),
    offsetVelocity: new Float64Array(count),
    x: new Float64Array(count),
    y: new Float64Array(count),
    radius: new Float64Array(count),
    angle: new Float64Array(count * 3),
  };
}

/** Rebuild for a new depth, keeping every surviving clock's skated time by lineage. */
export function resizeClockFieldDepth(previous: ClockField, recursionDepth: number) {
  const next = createClockField(createClockStructure(recursionDepth));
  const previousIndex = new Map(previous.structure.keys.map((key, index) => [key, index]));
  next.structure.keys.forEach((key, index) => {
    const source = previousIndex.get(key);
    if (source === undefined) return;
    next.offset[index] = previous.offset[source]!;
    next.offsetTarget[index] = previous.offsetTarget[source]!;
    next.offsetVelocity[index] = previous.offsetVelocity[source]!;
  });
  return next;
}

/** clock/1's unskated time for one clock. */
export function baseClockSeconds(field: ClockField, index: number, elapsedSeconds: number) {
  const { rate, phase } = field.structure;
  return elapsedSeconds * rate[index]! + phase[index]! * CLOCK_PERIOD_SECONDS;
}

/** Place every clock at its holding hand tip and compute all hand angles. */
export function layoutClockField(
  field: ClockField,
  options: Readonly<{
    center: Point;
    rootRadius: number;
    childRadiusRatio: number;
    elapsedSeconds: number;
  }>,
) {
  const { structure, offset, x, y, radius, angle } = field;
  const ratio = normalizeChildRadiusRatio(options.childRadiusRatio);
  for (let index = 0; index < structure.count; index += 1) {
    const parentIndex = structure.parent[index]!;
    if (parentIndex < 0) {
      x[index] = options.center.x;
      y[index] = options.center.y;
      radius[index] = Math.max(0, options.rootRadius);
    } else {
      const holdingHand = structure.hand[index]!;
      const length = radius[parentIndex]! * CLOCK_HANDS[holdingHand as HandIndex].length;
      const parentAngle = angle[parentIndex * 3 + holdingHand]!;
      x[index] = x[parentIndex]! + Math.cos(parentAngle) * length;
      y[index] = y[parentIndex]! + Math.sin(parentAngle) * length;
      radius[index] = radius[parentIndex]! * ratio;
    }
    const base = baseClockSeconds(field, index, options.elapsedSeconds);
    const shown = base + offset[index]!;
    angle[index * 3] = handAngle(0, shown);
    angle[index * 3 + 1] = handAngle(1, shown);
    angle[index * 3 + 2] = handAngle(2, base);
  }
}

/**
 * Direction from `center` to the point where segment `from → to` leaves the
 * circle, or null when the segment does not cross the rim outward.
 */
export function exitAngle(
  centerX: number,
  centerY: number,
  radius: number,
  from: Point,
  to: Point,
): number | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const fx = from.x - centerX;
  const fy = from.y - centerY;
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
 * Every clock whose rim the stroke leaves is set to the time whose hour hand
 * is nearest the exit direction and whose minute hand points at the finger,
 * taking the shorter way round the dial. Uses the last layout's positions.
 */
export function applyStroke(
  field: ClockField,
  from: Point,
  to: Point,
  elapsedSeconds: number,
) {
  const { x, y, radius, offsetTarget } = field;
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);
  let changed = 0;
  for (let index = 0; index < field.structure.count; index += 1) {
    const r = radius[index]!;
    const cx = x[index]!;
    const cy = y[index]!;
    if (cx + r < minX || cx - r > maxX || cy + r < minY || cy - r > maxY) continue;
    const hour = exitAngle(cx, cy, r, from, to);
    if (hour === null) continue;
    const minute = Math.atan2(to.y - cy, to.x - cx);
    offsetTarget[index] = nearestEquivalent(
      timeForHands(hour, minute) - baseClockSeconds(field, index, elapsedSeconds),
      offsetTarget[index]!,
      CLOCK_PERIOD_SECONDS,
    );
    changed += 1;
  }
  return changed;
}

/**
 * Turn every minute hand the shorter way toward its nearest finger; the
 * geared hour hand moves one twelfth as far.
 */
export function aimMinutes(
  field: ClockField,
  fingers: readonly Point[],
  elapsedSeconds: number,
) {
  if (fingers.length === 0) return;
  const { x, y, offsetTarget } = field;
  for (let index = 0; index < field.structure.count; index += 1) {
    let nearestX = 0;
    let nearestY = 0;
    let nearest = Infinity;
    for (const finger of fingers) {
      const dx = finger.x - x[index]!;
      const dy = finger.y - y[index]!;
      const distance = dx * dx + dy * dy;
      if (distance < nearest) {
        nearest = distance;
        nearestX = dx;
        nearestY = dy;
      }
    }
    if (nearest < 1e-6) continue;
    const shown = baseClockSeconds(field, index, elapsedSeconds) + offsetTarget[index]!;
    const turns = dialTurns(Math.atan2(nearestY, nearestX)) - unitFraction(shown / HOUR_SECONDS);
    offsetTarget[index] = offsetTarget[index]! + (turns - Math.round(turns)) * HOUR_SECONDS;
  }
}

/** Advance every clock's offset spring; returns whether any clock is still turning. */
export function stepClockField(field: ClockField, seconds: number) {
  const dt = clamp(seconds, 0, 1 / 30);
  const { offset, offsetTarget, offsetVelocity } = field;
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
