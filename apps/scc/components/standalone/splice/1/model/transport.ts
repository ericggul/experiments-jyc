import type { DeckState } from "./types";

export const MIN_LOOP_SECONDS = 0.01;
export const PLAYBACK_EDGE_SECONDS = 0.0005;

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function crossfadeGains(value: number) {
  const position = clamp(value, -1, 1);
  const angle = ((position + 1) * Math.PI) / 4;
  return { a: Math.cos(angle), b: Math.sin(angle) };
}

export function usableLoop(loop: DeckState["loop"], duration: number) {
  const start = clamp(loop.start, 0, duration);
  const end = clamp(loop.end, 0, duration);
  return end - start >= MIN_LOOP_SECONDS ? { start, end } : null;
}

export function wrapPosition(
  position: number,
  loop: DeckState["loop"],
  duration: number,
) {
  const bounds = usableLoop(loop, duration);
  if (!bounds) return clamp(position, 0, duration);
  const length = bounds.end - bounds.start;
  return bounds.start + ((((position - bounds.start) % length) + length) % length);
}

export function positionAt({
  anchor,
  elapsed,
  duration,
  rate,
  reverse,
  loop,
}: {
  anchor: number;
  elapsed: number;
  duration: number;
  rate: number;
  reverse: boolean;
  loop: DeckState["loop"];
}) {
  const direction = reverse ? -1 : 1;
  const next = anchor + elapsed * rate * direction;
  if (loop.enabled && usableLoop(loop, duration)) {
    return wrapPosition(next, loop, duration);
  }
  return clamp(next, 0, duration);
}

export function sourceOffsetForPosition(
  position: number,
  duration: number,
  reverse: boolean,
) {
  return clamp(reverse ? duration - position : position, 0, duration);
}

export function resolvePlayPosition(
  position: number,
  duration: number,
  reverse: boolean,
  loop: DeckState["loop"],
) {
  const bounds = loop.enabled ? usableLoop(loop, duration) : null;
  if (bounds) {
    const resolved = wrapPosition(position, { ...bounds, enabled: true }, duration);
    return reverse && resolved <= bounds.start + PLAYBACK_EDGE_SECONDS
      ? bounds.end - PLAYBACK_EDGE_SECONDS
      : resolved;
  }
  if (reverse && position <= PLAYBACK_EDGE_SECONDS) {
    return Math.max(0, duration - PLAYBACK_EDGE_SECONDS);
  }
  if (!reverse && position >= duration - PLAYBACK_EDGE_SECONDS) return 0;
  return clamp(position, 0, duration);
}

export function originalLoopForSource(
  loop: DeckState["loop"],
  duration: number,
  reverse: boolean,
) {
  const bounds = usableLoop(loop, duration);
  if (!bounds) return null;
  return reverse
    ? { start: duration - bounds.end, end: duration - bounds.start }
    : bounds;
}
