export const RADIUS = 42;
export const GAP = 1;
export const LIFETIME = 30;
export const radius = (b: Bubble) => RADIUS * Math.max(0, 1 - b.age / LIFETIME);
export type Bubble = { id: number; age: number; x: number; y: number; vx: number; vy: number; words: [string, string]; color: string };
export type Bounds = { width: number; height: number };
export type Target = { id: number; x: number; y: number };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function fits(items: Bubble[], bounds: Bounds) {
  return items.every((a, i) => a.x >= radius(a) - 0.001 && a.x <= bounds.width - radius(a) + 0.001 && a.y >= radius(a) - 0.001 && a.y <= bounds.height - radius(a) + 0.001 && items.slice(i + 1).every((b) => Math.hypot(a.x - b.x, a.y - b.y) >= radius(a) + radius(b) + GAP - 0.001));
}

export function spawnPoint(items: Bubble[], bounds: Bounds) {
  const points = [];
  for (let y = RADIUS; y <= bounds.height - RADIUS; y += 7) {
    for (let x = RADIUS; x <= bounds.width - RADIUS; x += 7) {
      if (items.every((b) => Math.hypot(x - b.x, y - b.y) >= RADIUS + radius(b) + GAP)) points.push({ x, y });
    }
  }
  points.sort((a, b) => Math.hypot(a.x - bounds.width / 2, a.y - bounds.height * 0.65) - Math.hypot(b.x - bounds.width / 2, b.y - bounds.height * 0.65));
  return points[0] ?? null;
}

// Small bounded steps prevent a dragged circle from tunnelling through neighbours.
// Projection resolves chains; an unsolved dense step rolls back to its valid positions.
export function step(items: Bubble[], bounds: Bounds, seconds: number, target: Target | null = null, ageSeconds = seconds): Bubble[] {
  const next = items.map((b) => ({ ...b, age: b.age + ageSeconds })).filter((b) => b.age < LIFETIME);
  const count = Math.max(1, Math.ceil(Math.min(seconds, 0.032) / 0.004));
  const dt = Math.max(0.000001, Math.min(seconds, 0.032) / count);
  for (let sub = 0; sub < count; sub++) {
    const before = next.map((b) => ({ x: b.x, y: b.y }));
    for (const b of next) {
      if (b.id === target?.id) {
        const dx = target.x - b.x, dy = target.y - b.y;
        const distance = Math.hypot(dx, dy);
        const amount = Math.min(distance, 1600 * dt);
        b.vx = distance ? dx / distance * amount / dt : 0;
        b.vy = distance ? dy / distance * amount / dt : 0;
      } else {
        b.vx *= Math.exp(-3.8 * dt);
        b.vy *= Math.exp(-3.8 * dt);
        if (Math.hypot(b.vx, b.vy) < 2) { b.vx = 0; b.vy = 0; }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
    }
    for (let pass = 0; pass < 40; pass++) {
      for (const b of next) {
        const x = clamp(b.x, radius(b), bounds.width - radius(b));
        const y = clamp(b.y, radius(b), bounds.height - radius(b));
        if (x !== b.x) b.vx *= -0.72;
        if (y !== b.y) b.vy *= -0.72;
        b.x = x; b.y = y;
      }
      for (let i = 0; i < next.length; i++) for (let j = i + 1; j < next.length; j++) {
        const a = next[i], b = next[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const diameter = radius(a) + radius(b) + GAP;
        if (d >= diameter) continue;
        const nx = d > 0 ? dx / d : 1, ny = d > 0 ? dy / d : 0;
        const overlap = diameter - d + 0.0001;
        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2; b.y += ny * overlap / 2;
        const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (closing < 0) {
          const impulse = -(1 + 0.78) * closing / 2;
          a.vx -= impulse * nx; a.vy -= impulse * ny;
          b.vx += impulse * nx; b.vy += impulse * ny;
        }
      }
      if (fits(next, bounds)) break;
    }
    if (!fits(next, bounds)) next.forEach((b, i) => { b.x = before[i].x; b.y = before[i].y; b.vx = 0; b.vy = 0; });
  }
  return next;
}
