// One flat 2D gel instead of discs and lines. Every voter (a disc) and every
// tie (a curved, tapering ribbon) adds exp(−d / k) of its own signed distance
// d into one float field with additive blending. −k · ln(Σ) is then exactly
// the exponential smooth-minimum of all those distances: a single signed
// distance field in which ties fillet into the voters they leave and every
// junction is a smooth web. The composite reads that distance per device
// pixel, so edges stay anti-aliased and crisp at any pixel ratio; colour is
// the same weights' average of the primitives' hues.
//
// A tie's half-width is measured in pixels from each end: wide where it
// leaves a voter, decaying over a few pixels toward its own middle width.
// Short ties become fleshy bridges, long ties gossamer. Ties are quadratic
// curves whose bend sways; ties across a disagreement carry bright beads that
// swell the ribbon as they travel.
//
// Per frame: one instanced ribbon draw, one instanced disc draw, one
// full-screen composite. Instance data is written in place by the caller.
// Each weight's exponent is capped at 9.5 (about 5 px of depth) so sums stay
// finite even in a half-float target.

export const MAX_TIES = 16_384;
export const MAX_VOTERS = 8_192;
export const TIE_FLOATS = 20;
export const VOTER_FLOATS = 8;
/** Smooth-union radius k, in CSS pixels. */
const SOFTNESS = 0.55;
/** How far past its edge each primitive writes, in units of k. */
const REACH = 15;
/**
 * Economy reach for large populations: weights below e^−9.5 are dropped,
 * which only trims the haze's last fraction of a pixel but cuts the area
 * every hairline tie covers by about a third.
 */
const ECONOMY_REACH = 9.5;
/** Ribbon samples; cosine spacing puts most of them near the two voters. */
const RIBBON_SEGMENTS = 40;

export type Brush = { x: number; y: number; radius: number; colour: readonly [number, number, number] };

/** How a tie leaves its voters and whether its thickness keeps changing. */
export type TieStyle = {
  /** Root taper length = min(scale · r + offset, cap), with exponent `power`. */
  readonly taper: readonly [scale: number, offset: number, cap: number, power: number];
  /** 0 for still widths, 1 for breathing ties with a travelling swell. */
  readonly alive: number;
};

const SHARED = /* glsl */ `
uniform vec4 taper;
uniform float alive;

vec2 toClip(vec2 point, vec2 frame) {
  vec2 clip = point / frame * 2.0 - 1.0;
  return vec2(clip.x, -clip.y);
}

// Half-width at distances fromA / fromB along a tie. At each voter the
// ribbon is as wide as the voter itself and narrows smoothly toward the
// tie's middle width, so voter and tie are one teardrop body with no seam.
float ribbonWidth(float fromA, float fromB, float rootA, float rootB, float middle) {
  float a = max(rootA - middle, 0.0) * exp(-pow(fromA / min(rootA * taper.x + taper.y, taper.z), taper.w));
  float b = max(rootB - middle, 0.0) * exp(-pow(fromB / min(rootB * taper.x + taper.y, taper.z), taper.w));
  return min(middle + a + b, max(max(rootA, rootB), middle));
}

// Each tie breathes and carries a slow swelling wave, so its thickness keeps
// changing; the roots stay still so the joint with the voter never breaks.
float living(float width, float fromA, float fromB, float rootA, float rootB, float time, float phase) {
  float away = smoothstep(0.0, 1.5, min(fromA / max(rootA, 0.5), fromB / max(rootB, 0.5)));
  float breath = sin(time * (0.5 + 0.35 * fract(phase * 3.7)) + phase * 5.0);
  float wave = sin(fromA * 0.11 - time * 1.1 + phase * 2.0);
  return width * (1.0 + alive * away * (0.22 * breath + 0.16 * wave));
}

// Beads that travel along a discordant tie, as a 0–1 swelling.
float bead(float fromA, float fromB, float time, float phase) {
  float spacing = 52.0;
  float offset = mod(fromA - time * 34.0 + phase * 31.0, spacing) - spacing * 0.5;
  return exp(-offset * offset / 14.0) * smoothstep(2.0, 9.0, min(fromA, fromB));
}
`;

const TIE_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 ends;
layout(location = 2) in vec4 roots;
layout(location = 3) in vec4 colourA;
layout(location = 4) in vec4 colourB;
layout(location = 5) in vec4 extra;
uniform vec2 frame;
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
  gl_Position = vec4(toClip(point + normal * across, frame), 0.0, 1.0);
}
`;

const TIE_FRAGMENT = /* glsl */ `#version 300 es
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
  float shape = ribbonWidth(along, fromB, profile.x, profile.y, profile.z);
  float width = living(shape, along, fromB, profile.x, profile.y, time, phase) + swell * 0.5;
  float weight = exp(min(-(abs(across) - width) / softness, 9.5));
  // A pulse is only a brightening of the tie's own hue.
  vec3 tint = colour * (1.0 + 0.9 * swell);
  field = vec4(tint * weight, weight);
}
`;

const VOTER_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 cell;
layout(location = 2) in vec4 tint;
uniform vec2 frame;
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
  gl_Position = vec4(toClip(cell.xy + local, frame), 0.0, 1.0);
}
`;

const VOTER_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in float radius;
flat in vec3 colour;
uniform float softness;
out vec4 field;
void main() {
  float weight = exp(min(-(length(local) - radius) / softness, 9.5));
  field = vec4(colour * weight, weight);
}
`;

const COMPOSITE_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
out vec2 uv;
void main() {
  uv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

const COMPOSITE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D field;
uniform vec2 frame;
uniform float softness;
uniform vec4 brush;
uniform vec3 brushColour;
out vec4 pixel;
void main() {
  vec4 sum = texture(field, uv);
  float total = max(sum.a, 1e-30);
  float gap = -softness * log(total);
  vec3 hue = sum.rgb / total;

  // Clamped to a real pixel footprint: where a splat's quad ends the field
  // jumps, and an unclamped fwidth would paint the quad's border.
  float pixelSize = clamp(fwidth(gap), 1e-3, 1.5);
  float cover = clamp(0.5 - gap / pixelSize, 0.0, 1.0);
  float depth = max(-gap, 0.0);
  // No outlines: light rises smoothly with depth, so thin processes are dim
  // and thick bodies glow from within. The haze ends well inside the reach
  // of every primitive, so no splat boundary can show.
  float body = pow(smoothstep(0.0, 4.5, depth), 0.75);
  vec3 light = hue * (0.3 + 0.95 * body) * cover;
  light += hue * 0.08 * exp(-max(gap, 0.0) / 1.6) * (1.0 - smoothstep(2.5, 5.0, gap)) * (1.0 - cover);
  vec3 colour = 1.0 - exp(-light * 1.3);

  vec2 point = vec2(uv.x, 1.0 - uv.y) * frame;
  float ring = abs(length(point - brush.xy) - brush.z);
  colour += brushColour * brush.w * 0.9 * exp(-ring * ring / 0.8);
  pixel = vec4(colour, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram();
  const shaders = [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const;
  for (const [kind, source] of shaders) {
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

function instanced(
  gl: WebGL2RenderingContext,
  template: WebGLBuffer,
  data: Float32Array,
  attributes: number,
) {
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

export type FluidRenderer = {
  /** Per tie: ax ay bx by | rootA rootB reach phase | rgbA pulse | rgbB strength | sway middle 0 0. */
  readonly ties: Float32Array;
  /** Per voter: x y radius excitement | rgb 0. */
  readonly voters: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  /** Large populations: shorter splat reach and a half-float field. */
  setEconomy(economy: boolean): void;
  render(tieCount: number, voterCount: number, time: number, style: TieStyle, brush: Brush | null): void;
  dispose(): void;
};

export function createFluidRenderer(canvas: HTMLCanvasElement): FluidRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  // The summed weights need an unclamped, blendable float target.
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;
  const fullFloat = gl.getExtension("EXT_float_blend") !== null;

  let programs: readonly [WebGLProgram, WebGLProgram, WebGLProgram];
  try {
    programs = [
      compile(gl, TIE_VERTEX, TIE_FRAGMENT),
      compile(gl, VOTER_VERTEX, VOTER_FRAGMENT),
      compile(gl, COMPOSITE_VERTEX, COMPOSITE_FRAGMENT),
    ];
  } catch (error) {
    console.error(error);
    return null;
  }
  const [tieProgram, voterProgram, compositeProgram] = programs;
  const location = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);
  const tieUniforms = {
    frame: location(tieProgram, "frame"),
    time: location(tieProgram, "time"),
    softness: location(tieProgram, "softness"),
    reach: location(tieProgram, "reach"),
    taper: location(tieProgram, "taper"),
    alive: location(tieProgram, "alive"),
  };
  const voterUniforms = {
    frame: location(voterProgram, "frame"),
    softness: location(voterProgram, "softness"),
    reach: location(voterProgram, "reach"),
  };
  const compositeUniforms = {
    field: location(compositeProgram, "field"),
    frame: location(compositeProgram, "frame"),
    softness: location(compositeProgram, "softness"),
    brush: location(compositeProgram, "brush"),
    brushColour: location(compositeProgram, "brushColour"),
  };

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
  const voterMesh = instanced(gl, squareTemplate, voters, 2);
  const screen = gl.createVertexArray();
  gl.bindVertexArray(screen);
  gl.bindBuffer(gl.ARRAY_BUFFER, squareTemplate);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const texture = gl.createTexture();
  const target = gl.createFramebuffer();
  let frame = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };

  let economy = false;
  let lastSize = { width: 1, height: 1, ratio: 1 };
  const resize = (width: number, height: number, ratio: number) => {
    lastSize = { width, height, ratio };
    const wide = fullFloat && !economy;
    frame = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
    };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      wide ? gl.RGBA32F : gl.RGBA16F,
      pixels.width,
      pixels.height,
      0,
      gl.RGBA,
      wide ? gl.FLOAT : gl.HALF_FLOAT,
      null,
    );
    // The field is read one texel per pixel.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const render: FluidRenderer["render"] = (tieCount, voterCount, time, style, brush) => {
    const tieTotal = Math.min(tieCount, MAX_TIES);
    const voterTotal = Math.min(voterCount, MAX_VOTERS);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(tieProgram);
    gl.uniform2f(tieUniforms.frame, frame.width, frame.height);
    gl.uniform1f(tieUniforms.time, time);
    gl.uniform1f(tieUniforms.softness, SOFTNESS);
    gl.uniform1f(tieUniforms.reach, economy ? ECONOMY_REACH : REACH);
    gl.uniform4f(tieUniforms.taper, ...style.taper);
    gl.uniform1f(tieUniforms.alive, style.alive);
    gl.bindVertexArray(tieMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, tieMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, ties, 0, tieTotal * TIE_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (RIBBON_SEGMENTS + 1) * 2, tieTotal);

    gl.useProgram(voterProgram);
    gl.uniform2f(voterUniforms.frame, frame.width, frame.height);
    gl.uniform1f(voterUniforms.softness, SOFTNESS);
    gl.uniform1f(voterUniforms.reach, economy ? ECONOMY_REACH : REACH);
    gl.bindVertexArray(voterMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, voterMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, voters, 0, voterTotal * VOTER_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, voterTotal);
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(compositeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(compositeUniforms.field, 0);
    gl.uniform2f(compositeUniforms.frame, frame.width, frame.height);
    gl.uniform1f(compositeUniforms.softness, SOFTNESS);
    gl.uniform4f(compositeUniforms.brush, brush?.x ?? 0, brush?.y ?? 0, brush?.radius ?? 0, brush ? 1 : 0);
    gl.uniform3f(compositeUniforms.brushColour, ...(brush?.colour ?? ([0, 0, 0] as const)));
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    for (const program of [tieProgram, voterProgram, compositeProgram]) gl.deleteProgram(program);
    for (const buffer of [ribbonTemplate, squareTemplate, tieMesh.buffer, voterMesh.buffer]) gl.deleteBuffer(buffer);
    for (const vao of [tieMesh.vao, voterMesh.vao, screen]) gl.deleteVertexArray(vao);
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(target);
  };

  const setEconomy = (next: boolean) => {
    if (next === economy) return;
    economy = next;
    resize(lastSize.width, lastSize.height, lastSize.ratio);
  };

  return { ties, voters, resize, setEconomy, render, dispose };
}
