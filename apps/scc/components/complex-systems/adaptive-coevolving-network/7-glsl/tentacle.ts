// The path a link takes between its two pages, grown rather than waved: a
// cubic Hermite curve that leaves its source in its own direction and
// arrives at its target from its own direction. Both angles are fixed per
// link (from its phase) and drift slowly, so every link has a different,
// slowly changing C or S shape, like a neurite or a hypha; long links run
// straighter. A faint ripple travels along it. The same function drives the
// ribbon in the shader and, in the browser, the surfers riding inside it and
// link hit-testing.

/** Largest departure and arrival angle off the chord, in radians. */
const ANGLE = 0.8;
/** How far each angle drifts, in radians, and how fast. */
const DRIFT = { angle: 0.22, pace: [0.17, 0.13] as const };
/** Chord length (px) beyond which a link straightens: its angles shrink as 220 / length, to at most half. */
const STRAIGHTEN = 220;
/** Tangent length as a share of the chord. */
const REACH = 0.85;
/** A faint ripple: amplitude in px, wavenumber in rad/px, speed in rad/s. */
const RIPPLE = { amplitude: 1.2, number: 0.1, speed: 1.2 } as const;

function angles(phase: number, time: number, amount: number) {
  return [
    amount * (ANGLE * Math.sin(phase * 3.7 + 1) + DRIFT.angle * Math.sin(time * DRIFT.pace[0] + phase)),
    amount * (ANGLE * Math.sin(phase * 5.3 + 2) + DRIFT.angle * Math.sin(time * DRIFT.pace[1] + phase * 1.9)),
  ] as const;
}

/** Writes the point at u ∈ [0, 1] on the link from (ax, ay) to (bx, by) into `out`. */
export function tentaclePoint(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  u: number,
  phase: number,
  time: number,
  amount: number,
  out: { x: number; y: number },
) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.max(Math.hypot(dx, dy), 1e-3);
  const bending = amount * Math.min(1, Math.max(0.5, STRAIGHTEN / length));
  const [leave, arrive] = angles(phase, time, bending);
  const scale = REACH;
  const m0x = (dx * Math.cos(leave) - dy * Math.sin(leave)) * scale;
  const m0y = (dx * Math.sin(leave) + dy * Math.cos(leave)) * scale;
  const m1x = (dx * Math.cos(arrive) - dy * Math.sin(arrive)) * scale;
  const m1y = (dx * Math.sin(arrive) + dy * Math.cos(arrive)) * scale;
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  const ripple =
    amount *
    RIPPLE.amplitude *
    Math.min(1, length / 60) *
    Math.sin(Math.PI * u) *
    Math.sin(u * length * RIPPLE.number - time * RIPPLE.speed + phase * 4);
  out.x = h00 * ax + h10 * m0x + h01 * bx + h11 * m1x - (dy / length) * ripple;
  out.y = h00 * ay + h10 * m0y + h01 * by + h11 * m1y + (dx / length) * ripple;
  return out;
}

/** The same path in GLSL; `time` must be a uniform of the including shader. */
export const TENTACLE_GLSL = /* glsl */ `
vec2 turn(vec2 v, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

vec2 tentaclePoint(vec2 a, vec2 b, float u, float phase, float amount) {
  vec2 span = b - a;
  float spanLength = max(length(span), 1e-3);
  float bending = amount * clamp(${STRAIGHTEN.toFixed(1)} / spanLength, 0.5, 1.0);
  float leave = bending * (${ANGLE.toFixed(4)} * sin(phase * 3.7 + 1.0)
    + ${DRIFT.angle.toFixed(4)} * sin(time * ${DRIFT.pace[0].toFixed(4)} + phase));
  float arrive = bending * (${ANGLE.toFixed(4)} * sin(phase * 5.3 + 2.0)
    + ${DRIFT.angle.toFixed(4)} * sin(time * ${DRIFT.pace[1].toFixed(4)} + phase * 1.9));
  vec2 m0 = turn(span, leave) * ${REACH.toFixed(4)};
  vec2 m1 = turn(span, arrive) * ${REACH.toFixed(4)};
  float u2 = u * u;
  float u3 = u2 * u;
  vec2 point = (2.0 * u3 - 3.0 * u2 + 1.0) * a + (u3 - 2.0 * u2 + u) * m0
    + (-2.0 * u3 + 3.0 * u2) * b + (u3 - u2) * m1;
  float ripple = amount * ${RIPPLE.amplitude.toFixed(4)} * min(1.0, spanLength / 60.0)
    * sin(3.14159265 * u)
    * sin(u * spanLength * ${RIPPLE.number.toFixed(4)} - time * ${RIPPLE.speed.toFixed(4)} + phase * 4.0);
  return point + vec2(-span.y, span.x) / spanLength * ripple;
}
`;
