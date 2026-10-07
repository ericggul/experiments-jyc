// The ranked web as a tissue that patterns itself. Nothing here is drawn as a
// shape: a Gray–Scott reaction–diffusion system (two morphogens u and v,
// u + 2v → 3v, v decays; Pearson, Science 261, 189 (1993)) runs on the GPU
// every frame, and the network only sets where and how it may grow.
//
// 1. Territory (half the CSS resolution, two targets, additive). Every page adds a
//    soft disc and every link a ribbon along its grown path (tentacle.ts),
//    as exp(−d/k) of its signed distance, so −k·ln Σ is one smooth-union
//    distance: links fillet into pages as one body. Target 0 also carries
//    how much of each point is page (vs link) and the link's orientation as
//    (cos 2θ, sin 2θ), which never cancels for opposite directions. Target 1
//    carries each link's drift (source → target) and pulses from surfers.
// 2. Morphogenesis (half the CSS resolution, float32 ping-pong; once per
//    frame a parameter pass, then ITERATIONS cheap steps). Inside a page the kinetics sit in the self-replicating-spot
//    regime, so a page is a colony of dividing cells and holds more of them
//    the more rank it has; inside a link the diffusion is anisotropic along
//    the link, so the same chemistry lines up into fibres — one filament
//    for a thin link, a bundle for a link that passes on much rank — and
//    the whole pattern drifts slowly from source to target. Outside, v dies.
//    Where page meets link the parameters blend, so spots turn into fibres
//    with no seam. A new link's corridor is colonised by a growing front; a
//    fading link's tissue dies back.
// 3. Relief (device resolution): v is a height field, lit from its own
//    normals: ivory ridges, dark valleys, the territory a faint membrane.

import { TENTACLE_GLSL } from "./tentacle";

export const MAX_TIES = 16_384;
export const MAX_VOTERS = 8_192;
export const TIE_FLOATS = 20;
export const VOTER_FLOATS = 8;
/** Smooth-union radius of the territory, CSS px, and the exponent cap that keeps half-float sums finite. */
const SOFTNESS = 2;
const CEILING = 5;
/** How far past its edge a primitive writes, in units of SOFTNESS. */
const REACH = 6;
const RIBBON_SEGMENTS = 64;
/** Reaction–diffusion steps per frame. */
export const ITERATIONS = 10;
/** The territory and the morphogens run at this share of the CSS resolution. */
const SIMULATION_SCALE = 0.5;

/** How a link leaves its pages: root taper length = min(scale · r + offset, cap), exponent `power`. */
export type TieStyle = { readonly taper: readonly [scale: number, offset: number, cap: number, power: number] };

const SHARED = /* glsl */ `
uniform vec4 taper;
const float SOFTNESS = ${SOFTNESS.toFixed(3)};
const float CEILING = ${CEILING.toFixed(2)};

vec2 toClip(vec2 point, vec2 frame) {
  vec2 clip = point / frame * 2.0 - 1.0;
  return vec2(clip.x, -clip.y);
}

// As wide as most of a page where it leaves it, narrowing to its own width.
float ribbonWidth(float fromA, float fromB, float rootA, float rootB, float middle) {
  float a = max(rootA - middle, 0.0) * exp(-pow(fromA / min(rootA * taper.x + taper.y, taper.z), taper.w));
  float b = max(rootB - middle, 0.0) * exp(-pow(fromB / min(rootB * taper.x + taper.y, taper.z), taper.w));
  return min(middle + a + b, max(max(rootA, rootB), middle));
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
`;

const TIE_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 ends;
layout(location = 2) in vec4 roots;   // rootA, rootB, reach, phase
layout(location = 3) in vec4 colourA; // 0, source velocity (px/s), 0
layout(location = 4) in vec4 colourB; // 0, target velocity (px/s), strength
layout(location = 5) in vec4 extra;   // writhe, middle, drift speed, vitality
uniform vec2 frame;
uniform float time;
out float across;
out float along;
out vec2 orientation;
out vec2 travel;
flat out float spanLength;
flat out vec4 profile;
flat out float tip;
flat out float vitality;
${SHARED}
${TENTACLE_GLSL}
void main() {
  vec2 a = ends.xy;
  vec2 b = ends.zw;
  spanLength = max(distance(a, b), 1e-3);
  float u = corner.x * roots.z;
  tip = roots.z < 0.999 ? roots.z * spanLength : -1.0;
  vec2 point = tentaclePoint(a, b, u, roots.w, extra.x);
  vec2 tangent = tentaclePoint(a, b, u + 0.002, roots.w, extra.x) - tentaclePoint(a, b, u - 0.002, roots.w, extra.x);
  tangent = length(tangent) > 1e-4 ? normalize(tangent) : normalize(b - a + 1e-4);
  float strength = colourB.a;
  profile = vec4(roots.x * strength, roots.y * strength, extra.y * strength, strength);
  along = u * spanLength;
  float width = ribbonWidth(along, spanLength - along, profile.x, profile.y, profile.z);
  across = corner.y * (width + ${REACH.toFixed(1)} * SOFTNESS);
  // Orientation as a doubled angle, so opposite directions agree.
  orientation = vec2(tangent.x * tangent.x - tangent.y * tangent.y, 2.0 * tangent.x * tangent.y);
  // Drift along the link, plus the motion of the body itself, so the tissue
  // rides with its link instead of being redrawn as the layout moves.
  travel = tangent * extra.z + mix(colourA.yz, colourB.yz, u);
  vitality = extra.w;
  gl_Position = vec4(toClip(point + vec2(-tangent.y, tangent.x) * across, frame), 0.0, 1.0);
}
`;

const TIE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in float across;
in float along;
in vec2 orientation;
in vec2 travel;
flat in float spanLength;
flat in vec4 profile;
flat in float tip;
flat in float vitality;
layout(location = 0) out vec4 territory;
layout(location = 1) out vec4 motion;
layout(location = 2) out vec4 nourishment;
${SHARED}
void main() {
  float width = ribbonWidth(along, spanLength - along, profile.x, profile.y, profile.z);
  if (tip >= 0.0) width *= smoothstep(0.0, 10.0, tip - along);
  float distance = abs(across) - width;
  float weight = exp(min(-distance / SOFTNESS, CEILING));
  territory = vec4(weight, 0.0, weight * orientation);
  // Drift only where the link is the tissue, and not inside its pages.
  float inside = (1.0 - smoothstep(-1.0, 1.0, distance)) * profile.w;
  inside *= smoothstep(profile.x, profile.x + 6.0, along) * smoothstep(profile.y * 0.5, profile.y + 6.0, spanLength - along);
  motion = vec4(travel * inside, inside, 0.0);
  nourishment = vec4(vitality * inside, inside, 0.0, 0.0);
}
`;

const CELL_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 cell;  // x, y, radius, excitement
layout(location = 2) in vec4 tint;  // rgb, seed (0 for a surfer)
uniform vec2 frame;
out vec2 local;
flat out vec3 shape;  // radius, seed, excitement
flat out float vitality;
flat out vec2 velocity;
${SHARED}
void main() {
  shape = vec3(cell.z, tint.a, cell.w);
  vitality = tint.r;
  velocity = tint.gb;
  local = (corner * 2.0 - 1.0) * (cell.z * 1.1 + ${REACH.toFixed(1)} * SOFTNESS);
  gl_Position = vec4(toClip(cell.xy + local, frame), 0.0, 1.0);
}
`;

const CELL_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in vec3 shape;
flat in float vitality;
flat in vec2 velocity;
uniform float time;
layout(location = 0) out vec4 territory;
layout(location = 1) out vec4 motion;
layout(location = 2) out vec4 nourishment;
${SHARED}
void main() {
  float radius = shape.x;
  if (shape.y <= 0.0) {
    // A surfer: a pulse of v where it is, no territory of its own.
    float pulse = 1.0 - smoothstep(radius * 0.4, radius, length(local));
    territory = vec4(0.0);
    motion = vec4(0.0, 0.0, 0.0, pulse);
    nourishment = vec4(0.0);
    return;
  }
  // A page: a disc of its rank area, its membrane drifting in three shallow
  // lobes near the rim only (area within .2%).
  float angle = atan(local.y, local.x);
  float phase = shape.y * 6.2831853;
  float rim = smoothstep(0.35 * radius, 0.85 * radius, length(local));
  float edge = radius * (1.0 + rim * (0.045 * sin(2.0 * angle + time * 0.4 + phase)
    + 0.03 * sin(3.0 * angle - time * 0.6 + phase * 2.3) + 0.02 * sin(5.0 * angle + time * 0.9 + phase * 3.7)));
  float weight = exp(min(-(length(local) - edge) / SOFTNESS, CEILING));
  // Depth into the page as a share of its radius, as exp(4 · depth / r):
  // 1 at the rim, e⁴ at the centre. Pages never overlap.
  float depth = exp(min(4.0 * (edge - length(local)) / max(edge, 1.0), 4.0));
  territory = vec4(weight, depth, 0.0, 0.0);
  // A newborn or focused page is stirred with pulses at its centre.
  // Inside its own body a page's vitality outweighs the links that enter it.
  float cover = 1.0 - smoothstep(edge - 1.0, edge + 1.0, length(local));
  // The page's tissue rides with it as the layout moves it.
  motion = vec4(velocity * cover * depth, cover * depth, shape.z * (1.0 - smoothstep(0.0, radius * 0.5, length(local))) * 0.6);
  nourishment = vec4(vitality * cover * depth, cover * depth, 0.0, 0.0);
}
`;

const SCREEN_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
out vec2 uv;
void main() {
  uv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

// Once per frame: everything the reaction–diffusion steps need per pixel,
// so the steps themselves only read two parameter texels and the stencil.
// A: kinetics (F, k) and the anisotropy as a vector along the link;
// B: the drift per step in texture units, the seeding threshold and pulses.
const PARAMETER_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D territory;
uniform sampler2D motion;
uniform sampler2D nourishment;
uniform vec2 size;
uniform float stepSeconds;
uniform float cssScale;   // simulation px per CSS px
layout(location = 0) out vec4 kinetics;
layout(location = 1) out vec4 transport;
${SHARED}
void main() {
  vec4 t = texture(territory, uv);
  float gap = -SOFTNESS * log(max(t.x, 1e-30));
  float inside = 1.0 - smoothstep(-1.0, 1.5, gap);
  // How deep into a page, as a share of its radius (0 at the rim, 1 at the
  // centre, negative outside), from the pages' own channel alone.
  float depth = clamp(log(max(t.y, 1e-30)) / 4.0, -1.0, 1.0);
  float page = smoothstep(-0.05, 0.08, depth);
  // A link's fibres run on into the page and loosen into its tissue: near
  // the rim the link's kinetics and orientation continue; toward the centre,
  // where many links meet and their directions cancel, the tissue packs.
  float core = smoothstep(0.08, 0.55, depth);
  vec2 orientation = t.zw / max(t.x, 1e-30);
  float coherence = clamp(length(orientation), 0.0, 1.0);
  float angle = 0.5 * atan(orientation.y, orientation.x);
  // Texture space has y up; the network's coordinates have y down.
  vec2 along = vec2(cos(angle), -sin(angle));
  // Links diffuse faster along themselves, so spots stretch into fibres.
  float anisotropy = (1.0 - core) * coherence * 0.8 * inside;

  // Feed follows rank: Gray–Scott's F is literally the rate at which food is
  // supplied. A page's vitality is its rank against the average page, a
  // link's the rank it passes on against the average link (both set by the
  // browser, 0–1 on a log scale). A starving region's tissue dies back
  // (F ≈ .013: none survives); a rich one grows lush and spreads (F ≈ .035:
  // about 80% cover, measured in Node at k = .0565).
  vec4 n = texture(nourishment, uv);
  float vitality = n.y > 1e-3 ? clamp(n.x / n.y, 0.0, 1.0) : 0.0;
  // Pages never starve: the poorest still holds tissue over about half its
  // body (F = .026, 48% cover), the richest is nearly filled (F = .036,
  // about 90%); a weak link can still go bare.
  vec2 fed = vec2(mix(mix(0.013, 0.026, page), 0.036, vitality), 0.0565);
  vec2 barren = vec2(0.01, 0.1);
  vec2 rates = mix(barren, fed, inside);
  kinetics = vec4(rates, along * anisotropy);

  vec4 m = texture(motion, uv);
  vec2 drift = m.z > 1e-3 ? m.xy / m.z : vec2(0.0);
  vec2 shift = vec2(drift.x, -drift.y) * cssScale * stepSeconds / size;
  // Pages are seeded more densely than links, so their colonies fill first.
  // Only fed ground is seeded; a page's well-fed depth densely.
  // Ground that cannot sustain tissue is never seeded, so nothing flickers
  // into life there only to die.
  float sustains = max(vitality, page * 0.6);
  float threshold = inside > 0.5 && sustains > 0.15 ? mix(0.9996, mix(mix(0.9993, 0.995, page), 0.985, core), sustains) : 2.0;
  transport = vec4(shift, threshold, m.w * inside);
}
`;

const MORPHOGEN_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D state;
uniform sampler2D kinetics;
uniform sampler2D transport;
uniform vec2 size;
uniform float pulses;    // 1 on the first step of a frame
uniform float seed;
out vec4 next;
${SHARED}
void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  vec4 k = texelFetch(kinetics, texel, 0);
  vec4 m = texelFetch(transport, texel, 0);
  // Drift: the whole stencil is read from upstream (semi-Lagrangian).
  vec2 from = uv - m.xy;
  vec2 texelSize = 1.0 / size;
  vec2 here = texture(state, from).xy;
  float anisotropy = length(k.zw);
  vec2 along = anisotropy > 1e-4 ? k.zw / anisotropy : vec2(1.0, 0.0);
  vec2 tangent = along * texelSize;
  vec2 normal = vec2(-along.y, along.x) * texelSize;
  vec2 alongCurve = texture(state, from + tangent).xy + texture(state, from - tangent).xy - 2.0 * here;
  vec2 acrossCurve = texture(state, from + normal).xy + texture(state, from - normal).xy - 2.0 * here;
  vec2 laplacian = (1.0 + anisotropy) * alongCurve + (1.0 - anisotropy) * acrossCurve;
  float u = here.x;
  float v = here.y;
  float reaction = u * v * v;
  u += 0.21 * laplacian.x - reaction + k.x * (1.0 - u);
  v += 0.105 * laplacian.y + reaction - (k.x + k.y) * v;
  // Sparse nuclei seed new territory, each a 5 × 5 block (Gray–Scott's
  // usual seed, u = .5, v = .25): measured in Node with these rates, a
  // 3 × 3 seed dies in every regime and a 5 × 5 one grows;
  // surfers and stirred pages add pulses.
  vec2 block = floor(gl_FragCoord.xy / 5.0);
  float disc = 1.0 - step(2.3, length(gl_FragCoord.xy - block * 5.0 - 2.5));
  float spark = step(m.z, hash(block + seed)) * step(v, 0.05) * disc;
  u = mix(u, 0.5, spark);
  // Surfers and stirred pages only nudge the tissue, so they ripple rather than flash.
  v = mix(v, 0.25, spark) + 0.025 * pulses * m.w;
  next = vec4(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0), 0.0, 1.0);
}
`;

const RELIEF_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D state;
uniform sampler2D territory;
uniform vec2 size;
out vec4 pixel;
${SHARED}
const vec3 RIDGE = vec3(0.93, 0.91, 0.86);
const vec3 VALLEY = vec3(0.05, 0.048, 0.045);

float heightAt(vec2 at) {
  return smoothstep(0.06, 0.36, texture(state, at).y);
}

void main() {
  vec2 texel = 1.0 / size;
  float h = heightAt(uv);
  float hx = heightAt(uv + vec2(texel.x, 0.0)) - heightAt(uv - vec2(texel.x, 0.0));
  float hy = heightAt(uv + vec2(0.0, texel.y)) - heightAt(uv - vec2(0.0, texel.y));
  vec3 normal = normalize(vec3(-hx * 2.2, -hy * 2.2, 1.0));
  vec3 light = normalize(vec3(-0.45, 0.55, 0.7));
  float lambert = max(dot(normal, light), 0.0);
  float sheen = pow(max(dot(normal, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 24.0);

  vec4 t = texture(territory, uv);
  float gap = -SOFTNESS * log(max(t.x, 1e-30));
  float inside = 1.0 - smoothstep(-0.8, 0.8, gap);
  float membrane = exp(-gap * gap / 0.6) * 0.9;

  // The territory itself is only a faint membrane line; the tissue rises out of the dark.
  vec3 ground = VALLEY * (0.25 * inside + membrane);
  vec3 tissue = RIDGE * (0.35 + 0.75 * lambert) + sheen * 0.12;
  vec3 colour = mix(ground, tissue, h);
  pixel = vec4(colour, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram();
  for (const [kind, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(kind)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? "shader failed to compile");
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program failed to link");
  }
  return program;
}

function staticBuffer(gl: WebGL2RenderingContext, values: readonly number[]) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
  return buffer;
}

function instanced(gl: WebGL2RenderingContext, template: WebGLBuffer, data: Float32Array, attributes: number) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, template);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  for (let index = 0; index < attributes; index += 1) {
    gl.enableVertexAttribArray(index + 1);
    gl.vertexAttribPointer(index + 1, 4, gl.FLOAT, false, attributes * 16, index * 16);
    gl.vertexAttribDivisor(index + 1, 1);
  }
  gl.bindVertexArray(null);
  return { vao, buffer };
}

type Layer = { texture: WebGLTexture; target: WebGLFramebuffer };

export type MorphogenRenderer = {
  /** Per tie: ax ay bx by | rootA rootB reach phase | 0 vA 0 | 0 vB strength | writhe middle drift vitality (v in px/s). */
  readonly ties: Float32Array;
  /** Per cell: x y radius excitement | vitality vx vy seed (0 for a surfer; v in px/s). */
  readonly voters: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  /** `seconds` is the frame's step; 0 holds the tissue still. */
  render(tieCount: number, voterCount: number, time: number, seconds: number, style: TieStyle): void;
  dispose(): void;
};

export function createMorphogenRenderer(canvas: HTMLCanvasElement): MorphogenRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  // Float targets for the territory sums and the morphogens; linear float
  // filtering keeps the anisotropic stencil and the drift smooth.
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;
  const linearFloat = gl.getExtension("OES_texture_float_linear") !== null;

  let programs: readonly WebGLProgram[];
  try {
    programs = [
      compile(gl, TIE_VERTEX, TIE_FRAGMENT),
      compile(gl, CELL_VERTEX, CELL_FRAGMENT),
      compile(gl, SCREEN_VERTEX, MORPHOGEN_FRAGMENT),
      compile(gl, SCREEN_VERTEX, RELIEF_FRAGMENT),
      compile(gl, SCREEN_VERTEX, PARAMETER_FRAGMENT),
    ];
  } catch (error) {
    console.error(error);
    return null;
  }
  const [tieProgram, cellProgram, morphogenProgram, reliefProgram, parameterProgram] = programs as [
    WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram,
  ];
  const location = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);

  const ribbon: number[] = [];
  for (let index = 0; index <= RIBBON_SEGMENTS; index += 1) {
    const u = 0.5 - 0.5 * Math.cos((Math.PI * index) / RIBBON_SEGMENTS);
    ribbon.push(u, -1, u, 1);
  }
  const ribbonTemplate = staticBuffer(gl, ribbon);
  const squareTemplate = staticBuffer(gl, [0, 0, 1, 0, 0, 1, 1, 1]);
  const ties = new Float32Array(MAX_TIES * TIE_FLOATS);
  const voters = new Float32Array(MAX_VOTERS * VOTER_FLOATS);
  const tieMesh = instanced(gl, ribbonTemplate, ties, 5);
  const cellMesh = instanced(gl, squareTemplate, voters, 2);
  const screen = gl.createVertexArray();
  gl.bindVertexArray(screen);
  gl.bindBuffer(gl.ARRAY_BUFFER, squareTemplate);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const texture = (width: number, height: number, half: boolean) => {
    const created = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, created);
    if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    const filter = half || linearFloat ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return created;
  };

  let territory: Layer | null = null;
  let parameters: { kinetics: WebGLTexture; transport: WebGLTexture; target: WebGLFramebuffer } | null = null;
  let motion: WebGLTexture | null = null;
  let nourishment: WebGLTexture | null = null;
  let states: [Layer, Layer] | null = null;
  let frame = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };
  let sim = { width: 1, height: 1 };
  let seed = 0;

  const release = () => {
    if (territory) {
      gl.deleteTexture(territory.texture);
      gl.deleteFramebuffer(territory.target);
    }
    if (motion) gl.deleteTexture(motion);
    if (nourishment) gl.deleteTexture(nourishment);
    if (parameters) {
      gl.deleteTexture(parameters.kinetics);
      gl.deleteTexture(parameters.transport);
      gl.deleteFramebuffer(parameters.target);
    }
    for (const layer of states ?? []) {
      gl.deleteTexture(layer.texture);
      gl.deleteFramebuffer(layer.target);
    }
  };

  const resize: MorphogenRenderer["resize"] = (width, height, ratio) => {
    frame = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    sim = { width: Math.max(1, Math.round(width * SIMULATION_SCALE)), height: Math.max(1, Math.round(height * SIMULATION_SCALE)) };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    release();
    // Territory and motion share one framebuffer as two colour attachments.
    const territoryTexture = texture(sim.width, sim.height, true);
    motion = texture(sim.width, sim.height, true);
    nourishment = texture(sim.width, sim.height, true);
    const territoryTarget = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, territoryTarget);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, territoryTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, motion, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, nourishment, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    territory = { texture: territoryTexture, target: territoryTarget };
    const kinetics = texture(sim.width, sim.height, true);
    const transport = texture(sim.width, sim.height, false);
    const parameterTarget = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, parameterTarget);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, kinetics, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, transport, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    parameters = { kinetics, transport, target: parameterTarget };
    // The morphogens start as u = 1, v = 0 everywhere: bare ground.
    states = [0, 1].map(() => {
      const layer = { texture: texture(sim.width, sim.height, false), target: gl.createFramebuffer() };
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.target);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, layer.texture, 0);
      gl.clearColor(1, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return layer;
    }) as [Layer, Layer];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const render: MorphogenRenderer["render"] = (tieCount, voterCount, time, seconds, style) => {
    if (!territory || !motion || !nourishment || !states || !parameters) return;
    const tieTotal = Math.min(tieCount, MAX_TIES);
    const voterTotal = Math.min(voterCount, MAX_VOTERS);

    // 1. Territory and motion.
    gl.bindFramebuffer(gl.FRAMEBUFFER, territory.target);
    gl.viewport(0, 0, sim.width, sim.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(tieProgram);
    gl.uniform2f(location(tieProgram, "frame"), frame.width, frame.height);
    gl.uniform1f(location(tieProgram, "time"), time);
    gl.uniform4f(location(tieProgram, "taper"), ...style.taper);
    gl.bindVertexArray(tieMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, tieMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, ties, 0, tieTotal * TIE_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (RIBBON_SEGMENTS + 1) * 2, tieTotal);
    gl.useProgram(cellProgram);
    gl.uniform2f(location(cellProgram, "frame"), frame.width, frame.height);
    gl.uniform1f(location(cellProgram, "time"), time);
    gl.bindVertexArray(cellMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, cellMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, voters, 0, voterTotal * VOTER_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, voterTotal);
    gl.disable(gl.BLEND);

    // 2. Morphogenesis: the frame's parameters, then ITERATIONS steps.
    if (seconds > 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, parameters.target);
      gl.useProgram(parameterProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, territory.texture);
      gl.uniform1i(location(parameterProgram, "territory"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, motion);
      gl.uniform1i(location(parameterProgram, "motion"), 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, nourishment);
      gl.uniform1i(location(parameterProgram, "nourishment"), 2);
      gl.uniform2f(location(parameterProgram, "size"), sim.width, sim.height);
      gl.uniform1f(location(parameterProgram, "stepSeconds"), Math.min(seconds, 1 / 20) / ITERATIONS);
      gl.uniform1f(location(parameterProgram, "cssScale"), SIMULATION_SCALE);
      gl.bindVertexArray(screen);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.useProgram(morphogenProgram);
      gl.uniform1i(location(morphogenProgram, "state"), 0);
      gl.uniform1i(location(morphogenProgram, "kinetics"), 1);
      gl.uniform1i(location(morphogenProgram, "transport"), 2);
      gl.uniform2f(location(morphogenProgram, "size"), sim.width, sim.height);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, parameters.kinetics);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, parameters.transport);
      const pulses = location(morphogenProgram, "pulses");
      const seedLocation = location(morphogenProgram, "seed");
      let pair: [Layer, Layer] = states;
      for (let step = 0; step < ITERATIONS; step += 1) {
        const from: Layer = pair[0];
        const to: Layer = pair[1];
        gl.bindFramebuffer(gl.FRAMEBUFFER, to.target);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, from.texture);
        gl.uniform1f(pulses, step === 0 ? 1 : 0);
        seed = (seed + 17.31) % 1_000;
        gl.uniform1f(seedLocation, seed);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        pair = [to, from];
      }
      states = pair;
    }

    // 3. Relief.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.useProgram(reliefProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, states[0].texture);
    gl.uniform1i(location(reliefProgram, "state"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, territory.texture);
    gl.uniform1i(location(reliefProgram, "territory"), 1);
    gl.uniform2f(location(reliefProgram, "size"), sim.width, sim.height);
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    release();
    for (const program of programs) gl.deleteProgram(program);
    for (const buffer of [ribbonTemplate, squareTemplate, tieMesh.buffer, cellMesh.buffer]) gl.deleteBuffer(buffer);
    for (const vao of [tieMesh.vao, cellMesh.vao, screen]) gl.deleteVertexArray(vao);
  };

  return { ties, voters, resize, render, dispose };
}
