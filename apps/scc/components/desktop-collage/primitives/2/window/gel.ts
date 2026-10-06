import * as THREE from "three";

// The network drawn as one flat 2D gel, ported from
// complex-systems/adaptive-coevolving-network/1-glsl (fluid.ts) into three.js.
// Every person (a disc) and every tie (a curved, tapering ribbon) adds
// exp(−d / k) of its signed distance d into one float field; the composite
// takes −k · ln Σ, the exponential smooth-minimum, so ties fillet into the
// people they leave and the whole network reads as one body. Colour is the
// weights' average hue.
//
// Changes from the source: positions are desktop points and each window draws
// the field from its own place on the desktop (`origin`), so the gel continues
// across windows; ties across windows carry the source's travelling swell and
// brightening, which there marked ties across a disagreement.
//
// Per frame: one instanced ribbon draw and one instanced disc draw into the
// field, one full-screen composite. Instance data is written in place by the
// caller; nothing is allocated per frame.

export const MAX_TIES = 4096;
export const MAX_DISCS = 1024;
export const TIE_FLOATS = 20;
export const DISC_FLOATS = 8;
/** Smooth-union radius k, in CSS pixels (source value). */
const SOFTNESS = 0.55;
/** How far past its edge each primitive writes, in units of k (source value). */
const REACH = 15;
const RIBBON_SEGMENTS = 40;
/** The source's `thin` ties: root taper scale, offset, cap and power; still widths. */
const TAPER = new THREE.Vector4(1.3, 1.2, 10000, 1.6);

const SHARED = /* glsl */ `
uniform vec4 taper;
uniform vec2 origin;
uniform vec2 frame;

vec2 toClip(vec2 point) {
  vec2 clip = (point - origin) / frame * 2.0 - 1.0;
  return vec2(clip.x, -clip.y);
}

float ribbonWidth(float fromA, float fromB, float rootA, float rootB, float middle) {
  float a = max(rootA - middle, 0.0) * exp(-pow(fromA / min(rootA * taper.x + taper.y, taper.z), taper.w));
  float b = max(rootB - middle, 0.0) * exp(-pow(fromB / min(rootB * taper.x + taper.y, taper.z), taper.w));
  return min(middle + a + b, max(max(rootA, rootB), middle));
}

// Beads that travel along a tie across windows, as a 0–1 swelling.
float bead(float fromA, float fromB, float time, float phase) {
  float spacing = 52.0;
  float offset = mod(fromA - time * 34.0 + phase * 31.0, spacing) - spacing * 0.5;
  return exp(-offset * offset / 14.0) * smoothstep(2.0, 9.0, min(fromA, fromB));
}
`;

const TIE_VERTEX = /* glsl */ `
precision highp float;
in vec2 corner;
in vec4 ends;
in vec4 roots;
in vec4 colourA;
in vec4 colourB;
in vec4 extra;
uniform float time;
uniform float softness;
uniform float reach;
out float across;
out float along;
out vec3 colour;
flat out float spanLength;
flat out vec4 profile;
flat out float phase;
${SHARED}
void main() {
  vec2 a = ends.xy;
  vec2 b = ends.zw;
  vec2 span = b - a;
  spanLength = max(length(span), 1e-3);
  vec2 direction = span / spanLength;
  phase = roots.w;
  float swing = 0.7 * sin(time * 0.55 + phase) + 0.3 * sin(time * 1.37 + phase * 1.9);
  vec2 control = (a + b) * 0.5 + vec2(-direction.y, direction.x) * extra.x * swing;
  float u = corner.x * roots.z;
  float s = 1.0 - u;
  vec2 point = s * s * a + 2.0 * s * u * control + u * u * b;
  vec2 tangent = 2.0 * s * (control - a) + 2.0 * u * (b - control);
  tangent = length(tangent) > 1e-4 ? normalize(tangent) : direction;
  vec2 normal = vec2(-tangent.y, tangent.x);
  float strength = colourB.a;
  profile = vec4(roots.x * strength, roots.y * strength, extra.y * strength, colourA.a);
  along = u * spanLength;
  float width = ribbonWidth(along, spanLength - along, profile.x, profile.y, profile.z) * 1.4;
  float extent = width + profile.w * 0.5 + reach * softness;
  across = corner.y * extent;
  colour = mix(colourA.rgb, colourB.rgb, u);
  gl_Position = vec4(toClip(point + normal * across), 0.0, 1.0);
}`;

const TIE_FRAGMENT = /* glsl */ `
precision highp float;
in float across;
in float along;
in vec3 colour;
flat in float spanLength;
flat in vec4 profile;
flat in float phase;
uniform float time;
uniform float softness;
out vec4 field;
${SHARED}
void main() {
  float fromB = spanLength - along;
  float swell = profile.w * bead(along, fromB, time, phase);
  float width = ribbonWidth(along, fromB, profile.x, profile.y, profile.z) + swell * 0.5;
  float weight = exp(min(-(abs(across) - width) / softness, 9.5));
  // A ribbon starts at its person's centre with a flat cut; fading it in over
  // the inner part of the body (which the disc already covers) hides that cut,
  // which otherwise shows as a bright wedge in hubs and a notch behind tips.
  weight *= smoothstep(0.0, profile.x * 0.7 + 1e-3, along) * smoothstep(0.0, profile.y * 0.7 + 1e-3, fromB);
  field = vec4(colour * (1.0 + 0.9 * swell) * weight, weight);
}`;

const DISC_VERTEX = /* glsl */ `
precision highp float;
in vec2 corner;
in vec4 cell;
in vec4 tint;
uniform float softness;
uniform float reach;
out vec2 local;
flat out float radius;
flat out vec3 colour;
${SHARED}
void main() {
  radius = cell.z;
  colour = tint.rgb * (1.0 + 0.8 * cell.w);
  local = (corner * 2.0 - 1.0) * (radius + reach * softness);
  gl_Position = vec4(toClip(cell.xy + local), 0.0, 1.0);
}`;

const DISC_FRAGMENT = /* glsl */ `
precision highp float;
in vec2 local;
flat in float radius;
flat in vec3 colour;
uniform float softness;
out vec4 field;
void main() {
  float weight = exp(min(-(length(local) - radius) / softness, 9.5));
  field = vec4(colour * weight, weight);
}`;

const COMPOSITE_VERTEX = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 uv;
void main() {
  uv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const COMPOSITE_FRAGMENT = /* glsl */ `
precision highp float;
in vec2 uv;
uniform sampler2D field;
uniform float softness;
uniform vec3 ground;
out vec4 pixel;
void main() {
  // A half-float field can overflow to infinity where many roots overlap;
  // clamping keeps the hue ratio finite instead of a black NaN speck.
  vec4 sum = min(texture(field, uv), vec4(6.0e4));
  float total = max(sum.a, 1e-30);
  float gap = -softness * log(total);
  vec3 hue = sum.rgb / total;
  float pixelSize = clamp(fwidth(gap), 1e-3, 1.5);
  float cover = clamp(0.5 - gap / pixelSize, 0.0, 1.0);
  float depth = max(-gap, 0.0);
  float body = pow(smoothstep(0.0, 4.5, depth), 0.75);
  vec3 light = hue * (0.3 + 0.95 * body) * cover;
  light += hue * 0.08 * exp(-max(gap, 0.0) / 1.6) * (1.0 - smoothstep(2.5, 5.0, gap)) * (1.0 - cover);
  pixel = vec4(ground + 1.0 - exp(-light * 1.3), 1.0);
}`;

const ADDITIVE = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, depthTest: false, depthWrite: false, transparent: true } as const;

function instancedGeometry(template: number[], index: number[], data: Float32Array, stride: number, names: string[]) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("corner", new THREE.Float32BufferAttribute(template, 2));
  geometry.setIndex(index);
  const buffer = new THREE.InstancedInterleavedBuffer(data, stride).setUsage(THREE.DynamicDrawUsage);
  names.forEach((name, i) => geometry.setAttribute(name, new THREE.InterleavedBufferAttribute(buffer, 4, i * 4)));
  geometry.instanceCount = 0;
  return { geometry, buffer };
}

/** Triangle-strip indices for `pairs` left/right vertex pairs. */
const stripIndex = (pairs: number) => Array.from({ length: pairs - 1 }, (_, i) => [2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2]).flat();

export function createGel(renderer: THREE.WebGLRenderer, ground: string) {
  // Summed weights need an unclamped, blendable float target; half floats where float blending is missing.
  const fullFloat = renderer.extensions.has("EXT_float_blend");
  const target = new THREE.WebGLRenderTarget(1, 1, { type: fullFloat ? THREE.FloatType : THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const ties = new Float32Array(MAX_TIES * TIE_FLOATS);
  const discs = new Float32Array(MAX_DISCS * DISC_FLOATS);

  const ribbon: number[] = [];
  for (let i = 0; i <= RIBBON_SEGMENTS; i++) {
    const u = 0.5 - 0.5 * Math.cos((Math.PI * i) / RIBBON_SEGMENTS);
    ribbon.push(u, -1, u, 1);
  }
  const shared = { origin: { value: new THREE.Vector2() }, frame: { value: new THREE.Vector2(1, 1) }, taper: { value: TAPER }, softness: { value: SOFTNESS }, reach: { value: REACH }, time: { value: 0 } };
  const tieMesh = instancedGeometry(ribbon, stripIndex(RIBBON_SEGMENTS + 1), ties, TIE_FLOATS, ["ends", "roots", "colourA", "colourB", "extra"]);
  const discMesh = instancedGeometry([0, 0, 1, 0, 0, 1, 1, 1], [0, 1, 2, 1, 3, 2], discs, DISC_FLOATS, ["cell", "tint"]);
  const tieMaterial = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: TIE_VERTEX, fragmentShader: TIE_FRAGMENT, uniforms: shared, ...ADDITIVE });
  const discMaterial = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: DISC_VERTEX, fragmentShader: DISC_FRAGMENT, uniforms: shared, ...ADDITIVE });
  const field = new THREE.Scene();
  for (const mesh of [new THREE.Mesh(tieMesh.geometry, tieMaterial), new THREE.Mesh(discMesh.geometry, discMaterial)]) { mesh.frustumCulled = false; field.add(mesh); }

  const compositeGeometry = new THREE.PlaneGeometry(2, 2);
  const compositeMaterial = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: COMPOSITE_VERTEX, fragmentShader: COMPOSITE_FRAGMENT, uniforms: { field: { value: target.texture }, softness: { value: SOFTNESS }, ground: { value: new THREE.Color(ground) } }, depthTest: false, depthWrite: false });
  const composite = new THREE.Scene();
  const quad = new THREE.Mesh(compositeGeometry, compositeMaterial);
  quad.frustumCulled = false;
  composite.add(quad);
  const camera = new THREE.Camera();
  const size = new THREE.Vector2();

  return {
    ties,
    discs,
    /** Draws `tieCount` ties and `discCount` discs; `origin` and `frame` are this window's page in desktop points. */
    render(tieCount: number, discCount: number, origin: { x: number; y: number }, frame: { width: number; height: number }, time: number) {
      renderer.getDrawingBufferSize(size);
      if (target.width !== size.x || target.height !== size.y) target.setSize(size.x, size.y);
      shared.origin.value.set(origin.x, origin.y);
      shared.frame.value.set(frame.width, frame.height);
      shared.time.value = time;
      for (const [mesh, count, stride] of [[tieMesh, Math.min(tieCount, MAX_TIES), TIE_FLOATS], [discMesh, Math.min(discCount, MAX_DISCS), DISC_FLOATS]] as const) {
        mesh.geometry.instanceCount = count;
        mesh.buffer.clearUpdateRanges();
        mesh.buffer.addUpdateRange(0, count * stride);
        mesh.buffer.needsUpdate = true;
      }
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, false, false);
      renderer.render(field, camera);
      renderer.setRenderTarget(null);
      renderer.render(composite, camera);
    },
    dispose() {
      target.dispose();
      for (const item of [tieMesh.geometry, discMesh.geometry, tieMaterial, discMaterial, compositeGeometry, compositeMaterial]) item.dispose();
    },
  };
}

export type Gel = ReturnType<typeof createGel>;
