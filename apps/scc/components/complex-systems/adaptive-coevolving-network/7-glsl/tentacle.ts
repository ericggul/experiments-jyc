// The path a link takes between its two pages: the straight chord plus a
// sideways offset that vanishes at both ends. Each link has its own resting
// curve (from its phase), slowly sways between a C and an S, and carries a
// wave that travels from source to target, so it writhes like a tentacle.
// The same function drives the ribbon in the shader and, in the browser,
// the surfers riding inside it and link hit-testing, so all three agree.

/** Resting bend and its slow sway, as a share of the chord, capped in px. */
const BEND = { share: 0.16, cap: 26, pace: 0.35 } as const;
/** An S-shaped twist that comes and goes. */
const TWIST = { share: 0.07, cap: 10, pace: 0.27 } as const;
/** A travelling wave: wavenumber in rad/px, speed in rad/s. */
const WAVE = { share: 0.045, cap: 5, number: 0.12, speed: 1.6 } as const;

/** Sideways offset (px) at parameter u ∈ [0, 1] along a chord of `length` px. */
export function tentacleOffset(u: number, length: number, phase: number, time: number, amount: number) {
  const envelope = Math.sin(Math.PI * u);
  const bend =
    (0.55 * Math.sin(time * BEND.pace + phase) + 0.45 * Math.sin(phase * 3.1)) *
    Math.min(BEND.share * length, BEND.cap) *
    envelope;
  const twist =
    Math.sin(2 * Math.PI * u) * Math.sin(time * TWIST.pace + phase * 1.7) * Math.min(TWIST.share * length, TWIST.cap);
  const wave =
    Math.max(envelope, 0) ** 0.7 *
    Math.sin(u * length * WAVE.number - time * WAVE.speed + phase * 5) *
    Math.min(WAVE.share * length, WAVE.cap);
  return (bend + twist + wave) * amount;
}

/** Writes the point at u on the tentacle from (ax, ay) to (bx, by) into `out`. */
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
  const offset = tentacleOffset(u, length, phase, time, amount);
  out.x = ax + dx * u - (dy / length) * offset;
  out.y = ay + dy * u + (dx / length) * offset;
  return out;
}

/** The same offset in GLSL; `time` must be a uniform of the including shader. */
export const TENTACLE_GLSL = /* glsl */ `
float tentacleOffset(float u, float spanLength, float phase, float amount) {
  float envelope = sin(3.14159265 * u);
  float bend = (0.55 * sin(time * ${BEND.pace.toFixed(4)} + phase) + 0.45 * sin(phase * 3.1))
    * min(${BEND.share.toFixed(4)} * spanLength, ${BEND.cap.toFixed(1)}) * envelope;
  float twist = sin(6.2831853 * u) * sin(time * ${TWIST.pace.toFixed(4)} + phase * 1.7)
    * min(${TWIST.share.toFixed(4)} * spanLength, ${TWIST.cap.toFixed(1)});
  float wave = pow(max(envelope, 0.0), 0.7)
    * sin(u * spanLength * ${WAVE.number.toFixed(4)} - time * ${WAVE.speed.toFixed(4)} + phase * 5.0)
    * min(${WAVE.share.toFixed(4)} * spanLength, ${WAVE.cap.toFixed(1)});
  return (bend + twist + wave) * amount;
}
`;
