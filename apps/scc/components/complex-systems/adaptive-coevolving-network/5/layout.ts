// Browser-side geometry. Position encodes nothing but the current signs:
// friends pull toward a common distance, enemies push apart, everyone keeps a
// little personal space and a weak pull toward the centre. A balanced network
// therefore draws itself as one cluster or as two clusters facing each other,
// and a person who changes camp visibly crosses over.

import type { SignedNetwork } from "./model";

const GRAVITY = 1.1;
const SPRING = 4;
const ENMITY = 0.8;
const SPACE = 0.3;

export type Body = { x: number; y: number; vx: number; vy: number };

export type Frame = { width: number; height: number };

/** Typical distance between friends. */
export function idealLength(frame: Frame, count: number) {
  return Math.min(frame.width, frame.height) * (0.26 + 0.6 / Math.sqrt(Math.max(1, count)));
}

export function createBodies(count: number, frame: Frame, seed = 0x2f6b31d9): Body[] {
  let state = seed >>> 0 || 1;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
  const radius = Math.min(frame.width, frame.height) * 0.3;
  return Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius;
    return {
      x: frame.width / 2 + Math.cos(angle) * distance,
      y: frame.height / 2 + Math.sin(angle) * distance,
      vx: 0,
      vy: 0,
    };
  });
}

export function rescaleBodies(bodies: Body[], previous: Frame, next: Frame) {
  if (previous.width <= 0 || previous.height <= 0) return;
  const scale = Math.min(next.width / previous.width, next.height / previous.height);
  for (const body of bodies) {
    body.x = next.width / 2 + (body.x - previous.width / 2) * scale;
    body.y = next.height / 2 + (body.y - previous.height / 2) * scale;
  }
}

/** One relaxation step; `delta` in seconds. Every pair is signed, so O(n²). */
export function relaxBodies(bodies: Body[], network: SignedNetwork, frame: Frame, delta: number) {
  const count = Math.min(bodies.length, network.size);
  const length = idealLength(frame, count);
  const rest = length * 0.45;
  const friendX = new Float64Array(count);
  const friendY = new Float64Array(count);
  const enemyX = new Float64Array(count);
  const enemyY = new Float64Array(count);
  const forceX = new Float64Array(count);
  const forceY = new Float64Array(count);
  const friends = new Uint16Array(count);
  const space = length * length * SPACE / Math.max(1, count - 1);
  const softening = (length * 0.08) ** 2;

  for (let first = 0; first < count; first += 1) {
    const a = bodies[first]!;
    for (let second = first + 1; second < count; second += 1) {
      const b = bodies[second]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const squared = dx * dx + dy * dy;
      const distance = Math.max(1e-3, Math.sqrt(squared));
      if (network.signs[first * network.stride + second]! > 0) {
        const pull = (distance - rest) / distance;
        friendX[first]! += dx * pull;
        friendY[first]! += dy * pull;
        friendX[second]! -= dx * pull;
        friendY[second]! -= dy * pull;
        friends[first]! += 1;
        friends[second]! += 1;
      } else {
        // Enmity pushes with the same strength at any distance; gravity
        // alone decides how far apart two camps settle.
        const push = length / (distance + length * 0.05);
        enemyX[first]! -= dx * push;
        enemyY[first]! -= dy * push;
        enemyX[second]! += dx * push;
        enemyY[second]! += dy * push;
      }
      const spacing = space / (squared + softening);
      forceX[first]! -= dx * spacing;
      forceY[first]! -= dy * spacing;
      forceX[second]! += dx * spacing;
      forceY[second]! += dy * spacing;
    }
  }

  // Each person averages over their own friends and enemies, so a small camp
  // holds together as firmly as a large one.
  for (let index = 0; index < count; index += 1) {
    const enemies = count - 1 - friends[index]!;
    if (friends[index]! > 0) {
      forceX[index]! += (friendX[index]! * SPRING) / friends[index]!;
      forceY[index]! += (friendY[index]! * SPRING) / friends[index]!;
    }
    if (enemies > 0) {
      forceX[index]! += (enemyX[index]! * ENMITY) / Math.max(enemies, (count - 1) / 2);
      forceY[index]! += (enemyY[index]! * ENMITY) / Math.max(enemies, (count - 1) / 2);
    }
  }

  const centreX = frame.width / 2;
  const centreY = frame.height / 2;
  const short = Math.min(frame.width, frame.height);
  const gravityX = GRAVITY * (short / frame.width);
  const gravityY = GRAVITY * (short / frame.height);
  const step = Math.min(delta, 1 / 30);
  const damping = Math.exp(-5 * step);
  const maxSpeed = length * 4;
  const margin = Math.min(frame.width, frame.height) * 0.05;

  for (let index = 0; index < count; index += 1) {
    const body = bodies[index]!;
    const fx = forceX[index]! - (body.x - centreX) * gravityX;
    const fy = forceY[index]! - (body.y - centreY) * gravityY;
    body.vx = (body.vx + fx * step) * damping;
    body.vy = (body.vy + fy * step) * damping;
    const speed = Math.hypot(body.vx, body.vy);
    if (speed > maxSpeed) {
      body.vx *= maxSpeed / speed;
      body.vy *= maxSpeed / speed;
    }
    body.x = Math.min(frame.width - margin, Math.max(margin, body.x + body.vx * step));
    body.y = Math.min(frame.height - margin, Math.max(margin, body.y + body.vy * step));
  }
}
