// GLSL for the entangled clouds, after Bjørn Staal's two-window particle
// clouds: a veined outer shell, an inner core in the partner's colour, and an
// hourglass bridge of two intertwined streams. Positions are desktop points
// with y negated. All motion is computed here from uniforms; no buffer is
// rewritten per frame.

const rotate = /* glsl */ `
vec3 rotateY(vec3 p, float a) { return vec3(p.x * cos(a) + p.z * sin(a), p.y, -p.x * sin(a) + p.z * cos(a)); }
vec3 rotateX(vec3 p, float a) { return vec3(p.x, p.y * cos(a) - p.z * sin(a), p.y * sin(a) + p.z * cos(a)); }`;

/** One layer of a cloud (shell, core or dust); `position` is on or near the unit sphere. */
export const cloudVertex = /* glsl */ `
${rotate}
uniform vec2 uCenter;
uniform float uRadius;
uniform float uTime;
uniform float uSeed;
uniform float uSize;
/** Unit direction to the entangled partner (desktop axes, y down) and link strength. */
uniform vec2 uToward;
uniform float uPull;
varying float vDepth;
varying float vMouth;
void main() {
  vec3 p = position;
  // Slow organic breathing along the surface, different per cloud.
  float wave = sin(dot(p, vec3(4.1, 3.3, 2.7)) * 1.7 + uTime * 0.7 + uSeed) + sin(dot(p, vec3(-2.3, 3.9, 1.1)) * 2.3 - uTime * 0.5);
  p *= 1.0 + 0.035 * wave;
  p = rotateX(rotateY(p, uTime * 0.13 + uSeed), uTime * 0.07 + uSeed * 0.5);
  // The side facing the partner stretches out into the bridge's mouth.
  vec2 toward = vec2(uToward.x, -uToward.y);
  float facing = max(0.0, dot(normalize(p.xy + 1e-4), toward) * length(p.xy));
  vMouth = uPull * smoothstep(0.55, 1.0, facing);
  p.xy += toward * vMouth * 0.55;
  vDepth = p.z * 0.5 + 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(uCenter + p.xy * uRadius, 0.0, 1.0);
  gl_PointSize = uSize * (0.7 + 0.6 * vDepth) * (1.0 + 0.6 * vMouth);
}`;

export const cloudFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
varying float vDepth;
varying float vMouth;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  vec3 color = mix(uColor, vec3(1.0), vMouth * 0.35);
  gl_FragColor = vec4(color, min(1.0, uAlpha * (0.35 + 0.65 * vDepth + vMouth)) * (1.0 - d * 4.0));
}`;

/**
 * Hourglass bridge between two clouds. Each particle runs along the line from
 * A to B; its distance from the axis follows a profile that is wide where it
 * enters each cloud and pinched in the middle, turning around the axis so the
 * tube reads as a volume.
 */
export const bridgeVertex = /* glsl */ `
uniform vec2 uA;
uniform vec2 uB;
uniform float uRadiusA;
uniform float uRadiusB;
uniform float uStrength;
uniform float uTime;
uniform float uSize;
attribute float aOffset;
attribute float aSpeed;
attribute float aTheta;
attribute float aStream;
/** 1 for particles of the bright axial filament. */
attribute float aCore;
varying float vFade;
varying float vStream;
varying float vCore;
void main() {
  float direction = aStream > 0.5 ? -1.0 : 1.0;
  float t = fract(aOffset + direction * uTime * 0.045 * aSpeed);
  vec2 axis = uB - uA;
  vec2 dir = axis / max(length(axis), 1.0);
  vec2 perp = vec2(-dir.y, dir.x);
  float flare = mix(uRadiusA, uRadiusB, t) * 0.62;
  float waist = min(uRadiusA, uRadiusB) * 0.17;
  float edge = abs(2.0 * t - 1.0);
  float radius = mix(waist, flare, edge * edge * edge) * mix(1.0, 0.12, aCore);
  float theta = aTheta + t * 5.0 + uTime * 0.5 + aStream * 3.14159;
  vec2 p = mix(uA, uB, t) + perp * cos(theta) * radius;
  // Pulses travel both ways along the bridge: the exchange made visible.
  float pulse = pow(0.5 + 0.5 * sin(t * 14.0 - direction * uTime * 2.6), 6.0);
  vFade = uStrength * (0.45 + 0.55 * (sin(theta) * 0.5 + 0.5)) * smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.94, t) * (0.55 + 1.4 * pulse);
  vStream = aStream;
  vCore = aCore;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
  gl_PointSize = uSize * (1.0 + 0.5 * aCore + 0.6 * pulse);
}`;

export const bridgeFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAlpha;
varying float vFade;
varying float vStream;
varying float vCore;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25 || vFade <= 0.0) discard;
  vec3 color = mix(vStream > 0.5 ? uColorB : uColorA, vec3(1.0), vCore * 0.45);
  gl_FragColor = vec4(color, min(1.0, uAlpha * vFade) * (1.0 - d * 4.0));
}`;

/** Cube tunnel: lines joining corresponding corners of two cubes; colour runs from one to the other. */
export const tunnelVertex = /* glsl */ `
attribute float aSide;
varying float vSide;
void main() {
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const tunnelFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uStrength;
varying float vSide;
void main() { gl_FragColor = vec4(mix(uColorA, uColorB, vSide), uStrength); }`;
