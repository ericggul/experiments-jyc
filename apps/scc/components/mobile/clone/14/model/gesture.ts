// Pure gesture maths for the watch panel, Shorts pager, feed header and double-tap seek.

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Miniplayer progress p: 0 = full watch page, 1 = docked miniplayer.
export function dragProgress(start: 0 | 1, dy: number, travel: number) {
  if (travel <= 0) return start;
  return clamp(start + dy / travel, 0, 1);
}

// Snap after release: a flick (progress per ms) wins; otherwise the nearer state.
export function snapMini(p: number, velocity: number): 0 | 1 {
  if (velocity > 0.0016) return 1;
  if (velocity < -0.0016) return 0;
  return p > 0.5 ? 1 : 0;
}

// Shorts pager: the next index after a vertical drag of dy px (negative = up) with velocity px/ms.
export function pagerStep(index: number, count: number, dy: number, height: number, velocity: number) {
  let next = index;
  if (dy < -height * 0.18 || velocity < -0.45) next = index + 1;
  else if (dy > height * 0.18 || velocity > 0.45) next = index - 1;
  return clamp(next, 0, Math.max(0, count - 1));
}

// Rubber-band past either end of the pager.
export function pagerOffset(index: number, count: number, dy: number) {
  const atStart = index === 0 && dy > 0;
  const atEnd = index >= count - 1 && dy < 0;
  return atStart || atEnd ? dy * 0.28 : dy;
}

// Collapsing header: hides with downward scroll, reappears with upward scroll; always shown at top.
export function headerOffset(previous: number, lastTop: number, top: number, height: number) {
  if (top <= 0) return 0;
  return clamp(previous + (top - lastTop), 0, height);
}

// After the scroll stops, a half-hidden header settles to whichever edge is nearer.
export function settleHeader(offset: number, height: number, top: number) {
  if (top < height) return 0;
  return offset > height / 2 ? height : 0;
}

// Double-tap seek: which half of the player was tapped and where playback lands.
export function seekSide(x: number, width: number): 'back' | 'forward' | null {
  if (width <= 0) return null;
  if (x < width * 0.4) return 'back';
  if (x > width * 0.6) return 'forward';
  return null;
}

export function seekTarget(time: number, duration: number, side: 'back' | 'forward', step = 10) {
  const target = side === 'back' ? time - step : time + step;
  return clamp(target, 0, Number.isFinite(duration) && duration > 0 ? duration : Math.max(0, target));
}

// Taps within this window on the same side accumulate (+10, +20, +30 …).
export function accumulateSeek(previous: { side: 'back' | 'forward'; amount: number; at: number } | null, side: 'back' | 'forward', now: number, step = 10, window = 700) {
  if (previous && previous.side === side && now - previous.at < window) return { side, amount: previous.amount + step, at: now };
  return { side, amount: step, at: now };
}

// Scrubber: pointer x → time.
export function scrubTime(x: number, left: number, width: number, duration: number) {
  if (width <= 0 || !Number.isFinite(duration) || duration <= 0) return 0;
  return clamp((x - left) / width, 0, 1) * duration;
}
