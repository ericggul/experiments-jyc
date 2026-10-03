// The height threshold lives entirely in these shaders. A prism that is not
// admitted collapses its vertices outside the clip volume; admitted prisms in
// the frontier band take the accent. Censored lifespan ends fade with an
// ordered 4×4 Bayer screen door, so everything stays opaque and unsorted.

import * as THREE from "three";

export const PALETTE = {
  background: "#f1f0ec",
  face: "#d9d6cf",
  edge: "#a29e95",
  accent: "#b4532f",
  accentEdge: "#8c3b1f",
  axis: "#77736b",
} as const;

export type PrismUniforms = {
  uZ: THREE.IUniform<number>;
  uMode: THREE.IUniform<number>;
  uFrontier: THREE.IUniform<number>;
};

export function createPrismUniforms(): PrismUniforms {
  return { uZ: { value: 0 }, uMode: { value: 0 }, uFrontier: { value: 1.5 } };
}

const vertexShader = /* glsl */ `
uniform float uZ;
uniform float uMode;
uniform float uFrontier;
attribute float aHeight;
attribute float aT;
attribute vec2 aCensor;
attribute float aFuzzy;
varying float vT;
varying vec2 vCensor;
varying float vFuzzy;
varying float vFrontier;
varying vec3 vWorld;

void main() {
  float admitted = uMode < 0.5 ? step(aHeight, uZ) : step(uZ, aHeight);
  if (admitted < 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vFrontier = step(abs(aHeight - uZ), uFrontier);
  vT = aT;
  vCensor = aCensor;
  vFuzzy = aFuzzy;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const ditherChunk = /* glsl */ `
varying float vT;
varying vec2 vCensor;
varying float vFuzzy;
varying float vFrontier;
varying vec3 vWorld;
const float CENSOR_FADE = 0.4;
const float FUZZY_FADE = 0.15;

float bayer2(vec2 a) {
  a = floor(a);
  return fract(dot(a, vec2(0.5, a.y * 0.75)));
}

float bayer4(vec2 a) {
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

void screenDoor() {
  float alpha = 1.0;
  if (vCensor.x > 0.5) alpha *= smoothstep(0.0, CENSOR_FADE, vT);
  if (vCensor.y > 0.5) alpha *= smoothstep(0.0, CENSOR_FADE, 1.0 - vT);
  if (vFuzzy > 0.5) alpha *= mix(0.45, 1.0, smoothstep(0.0, FUZZY_FADE, vT));
  if (alpha <= bayer4(gl_FragCoord.xy)) discard;
}
`;

const faceFragment = /* glsl */ `
uniform vec3 uFace;
uniform vec3 uAccent;
${ditherChunk}
void main() {
  screenDoor();
  vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 light = normalize(vec3(0.42, 0.78, 0.46));
  float lambert = abs(dot(normal, light));
  vec3 base = mix(uFace, uAccent, vFrontier);
  gl_FragColor = vec4(base * (0.74 + 0.26 * lambert), 1.0);
  #include <colorspace_fragment>
}
`;

const edgeFragment = /* glsl */ `
uniform vec3 uEdge;
uniform vec3 uAccent;
${ditherChunk}
void main() {
  screenDoor();
  gl_FragColor = vec4(mix(uEdge, uAccent, vFrontier), 1.0);
  #include <colorspace_fragment>
}
`;

export function createFaceMaterial(uniforms: PrismUniforms) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uFace: { value: new THREE.Color(PALETTE.face) },
      uAccent: { value: new THREE.Color(PALETTE.accent) },
    },
    vertexShader,
    fragmentShader: faceFragment,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

export function createEdgeMaterial(uniforms: PrismUniforms) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uEdge: { value: new THREE.Color(PALETTE.edge) },
      uAccent: { value: new THREE.Color(PALETTE.accentEdge) },
    },
    vertexShader,
    fragmentShader: edgeFragment,
  });
}
