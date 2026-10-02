export const CLOCK_RECURSION_DEPTH = 4;
export const DEFAULT_CHILD_RADIUS_RATIO = 0.6;
export const MIN_CHILD_RADIUS_RATIO = 0.42;
export const MAX_CHILD_RADIUS_RATIO = 0.62;
export const SIMULATED_SECONDS_PER_SECOND = 12;
export const ROOT_DIAMETER_RATIO = 0.8;

const TAU = Math.PI * 2;
export const CLOCK_PERIOD_SECONDS = 12 * 60 * 60;

export const CLOCK_HANDS = [
  { id: "hour", length: 0.53, periodSeconds: 12 * 60 * 60 },
  { id: "minute", length: 0.74, periodSeconds: 60 * 60 },
  { id: "second", length: 0.9, periodSeconds: 60 },
] as const;

export type ClockHandId = (typeof CLOCK_HANDS)[number]["id"];

export type Point = Readonly<{
  x: number;
  y: number;
}>;

export type RecursiveClockHand = Readonly<{
  id: ClockHandId;
  angle: number;
  length: number;
  tip: Point;
}>;

export type RecursiveClock = Readonly<{
  id: string;
  parentId: string | null;
  attachedTo: ClockHandId | null;
  depth: number;
  radius: number;
  center: Point;
  rate: number;
  phase: number;
  hands: readonly RecursiveClockHand[];
}>;

export type ClockTree = Readonly<{
  clocks: readonly RecursiveClock[];
  recursionDepth: number;
  childRadiusRatio: number;
  outerExtent: number;
}>;

export type ClockTreeOptions = Readonly<{
  center: Point;
  rootRadius: number;
  childRadiusRatio?: number;
  recursionDepth?: number;
  elapsedSeconds: number;
}>;

export const CHILD_RATE_MULTIPLIER: Record<ClockHandId, number> = {
  hour: 0.86,
  minute: 1,
  second: 1.14,
};

export const CHILD_PHASE_INCREMENT: Record<ClockHandId, number> = {
  hour: 0.191,
  minute: 0.463,
  second: 0.787,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function unitFraction(value: number) {
  return value - Math.floor(value);
}

export function normalizeChildRadiusRatio(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_CHILD_RADIUS_RATIO;
  return clamp(value, MIN_CHILD_RADIUS_RATIO, MAX_CHILD_RADIUS_RATIO);
}

export function normalizeRecursionDepth(value: number) {
  if (!Number.isFinite(value)) return CLOCK_RECURSION_DEPTH;
  return Math.max(0, Math.floor(value));
}

export function clockHandAngle(
  hand: ClockHandId,
  elapsedSeconds: number,
) {
  const definition = CLOCK_HANDS.find((item) => item.id === hand);
  if (!definition) return -Math.PI / 2;
  return -Math.PI / 2 + TAU * unitFraction(elapsedSeconds / definition.periodSeconds);
}

export function localClockSeconds(date: Date) {
  return (
    (date.getHours() % 12) * 60 * 60 +
    date.getMinutes() * 60 +
    date.getSeconds() +
    date.getMilliseconds() / 1000
  );
}

export function clockTreeOuterExtent(
  childRadiusRatio: number,
  recursionDepth: number,
) {
  const ratio = normalizeChildRadiusRatio(childRadiusRatio);
  const depth = normalizeRecursionDepth(recursionDepth);
  const longestHand = CLOCK_HANDS[CLOCK_HANDS.length - 1]!.length;
  let extent = 0;
  let radius = 1;

  for (let level = 0; level < depth; level += 1) {
    extent += longestHand * radius;
    radius *= ratio;
  }

  return extent + radius;
}

export function rootClockRadiusForViewport(
  width: number,
  height: number,
) {
  const shortestSide = Math.max(0, Math.min(width, height));
  return (shortestSide * ROOT_DIAMETER_RATIO) / 2;
}

export function createClockTree({
  center,
  rootRadius,
  childRadiusRatio = DEFAULT_CHILD_RADIUS_RATIO,
  recursionDepth = CLOCK_RECURSION_DEPTH,
  elapsedSeconds,
}: ClockTreeOptions): ClockTree {
  const ratio = normalizeChildRadiusRatio(childRadiusRatio);
  const depthLimit = normalizeRecursionDepth(recursionDepth);
  const clocks: RecursiveClock[] = [];

  const appendClock = ({
    id,
    parentId,
    attachedTo,
    depth,
    radius,
    center,
    rate,
    phase,
  }: {
    id: string;
    parentId: string | null;
    attachedTo: ClockHandId | null;
    depth: number;
    radius: number;
    center: Point;
    rate: number;
    phase: number;
  }) => {
    const localSeconds = elapsedSeconds * rate + phase * CLOCK_PERIOD_SECONDS;
    const hands = CLOCK_HANDS.map((definition) => {
      const angle = clockHandAngle(definition.id, localSeconds);
      const length = radius * definition.length;
      return {
        id: definition.id,
        angle,
        length,
        tip: {
          x: center.x + Math.cos(angle) * length,
          y: center.y + Math.sin(angle) * length,
        },
      };
    });

    const clock: RecursiveClock = {
      id,
      parentId,
      attachedTo,
      depth,
      radius,
      center,
      rate,
      phase,
      hands,
    };
    clocks.push(clock);

    if (depth >= depthLimit) return;
    for (const hand of hands) {
      appendClock({
        id: `${id}/${hand.id}`,
        parentId: id,
        attachedTo: hand.id,
        depth: depth + 1,
        radius: radius * ratio,
        center: hand.tip,
        rate: rate * CHILD_RATE_MULTIPLIER[hand.id],
        phase: unitFraction(phase + CHILD_PHASE_INCREMENT[hand.id]),
      });
    }
  };

  appendClock({
    id: "root",
    parentId: null,
    attachedTo: null,
    depth: 0,
    radius: Math.max(0, rootRadius),
    center,
    rate: 1,
    phase: 0,
  });

  return {
    clocks,
    recursionDepth: depthLimit,
    childRadiusRatio: ratio,
    outerExtent: clockTreeOuterExtent(ratio, depthLimit),
  };
}
