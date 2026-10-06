// Combed fibres on black, after BarabásiLab's "150 years of Nature" (2019):
// links are not strokes but bundles of hairline fibres whose light adds up,
// so where many fibres run together (one link's many fibres, or compatible
// links combed into one bundle) the bundle glows by sheer density, and a lone
// fibre is a faint grey hair. Pages are flat dots drawn over them.
//
// Per frame: one instanced draw of fibres and one of surfer sparks into a
// half-float density target (additive), one full-screen tone map, one
// instanced draw of page dots over the result. Every fibre follows its link's
// bundled points (a row of a float texture written by the caller) as a
// Catmull–Rom curve, offset sideways by its own place in the link's bundle;
// the bundle narrows to nothing at both pages.

import { POINTS } from "./bundling";

export const MAX_ROWS = 8_192;
export const MAX_FIBRES = 40_000;
export const MAX_SPARKS = 4_096;
export const MAX_DOTS = 2_048;
export const FIBRE_FLOATS = 8;
export const SPARK_FLOATS = 4;
export const DOT_FLOATS = 4;
const FIBRE_SEGMENTS = 40;
/** Half-width of one fibre's core in CSS px. */
const FIBRE_HALF_WIDTH = 0.32;

const COMMON = /* glsl */ `
vec2 toClip(vec2 point, vec2 frame) {
  vec2 clip = point / frame * 2.0 - 1.0;
  return vec2(clip.x, -clip.y);
}
`;

const FIBRE_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 fibre;  // row, offset (−1…1), spread px, alpha
layout(location = 2) in vec4 more;   // reach, seed, source radius, target radius
uniform sampler2D points;
uniform vec2 frame;
uniform float time;
uniform float ratio;
out float across;
out float fade;
${COMMON}
vec2 at(int row, int index) {
  return texelFetch(points, ivec2(clamp(index, 0, ${POINTS - 1}), row), 0).xy;
}
void main() {
  int row = int(fibre.x);
  float u = corner.x * more.x;
  float s = u * ${(POINTS - 1).toFixed(1)};
  int i = min(int(floor(s)), ${POINTS - 2});
  float t = s - float(i);
  vec2 p1 = at(row, i);
  vec2 p2 = at(row, i + 1);
  vec2 p0 = i > 0 ? at(row, i - 1) : 2.0 * p1 - p2;
  vec2 p3 = i + 2 < ${POINTS} ? at(row, i + 2) : 2.0 * p2 - p1;
  // Uniform Catmull–Rom through the bundled points, and its derivative.
  vec2 a = 2.0 * p1;
  vec2 b = p2 - p0;
  vec2 c = 2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3;
  vec2 d = 3.0 * (p1 - p2) + p3 - p0;
  vec2 point = 0.5 * (a + b * t + c * t * t + d * t * t * t);
  vec2 tangent = 0.5 * (b + 2.0 * c * t + 3.0 * d * t * t);
  tangent = length(tangent) > 1e-5 ? normalize(tangent) : vec2(1.0, 0.0);
  vec2 normal = vec2(-tangent.y, tangent.x);
  // A fibre keeps its place across the bundle, which narrows toward its
  // pages but fans out over each page's dot like the roots of a hair tuft,
  // with a slow, slight wave of its own.
  float envelope = pow(sin(3.14159265 * u), 0.75);
  float seed = more.y;
  float wave = 0.22 * sin(u * 6.0 + seed * 6.2831853 + time * 0.25) * envelope;
  float roots = 0.75 * (more.z * (1.0 - u) * (1.0 - u) * (1.0 - u) + more.w * u * u * u);
  float side = (fibre.y + wave) * (fibre.z * envelope + roots);
  float extent = ${FIBRE_HALF_WIDTH.toFixed(3)} + 1.0 / ratio;
  across = corner.y * extent;
  // A growing link's fibres fade out toward their tip.
  fade = fibre.w * (more.x < 0.999 ? 1.0 - smoothstep(more.x * 0.6, more.x, u) : 1.0);
  gl_Position = vec4(toClip(point + normal * (side + across), frame), 0.0, 1.0);
}
`;

const FIBRE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in float across;
in float fade;
uniform float ratio;
out vec4 density;
void main() {
  // Pixel coverage of a line of fixed CSS half-width: thin and anti-aliased.
  float cover = clamp((${FIBRE_HALF_WIDTH.toFixed(3)} + 0.5 / ratio - abs(across)) * ratio, 0.0, 1.0);
  density = vec4(fade * cover, 0.0, 0.0, 0.0);
}
`;

const SPARK_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 spark;  // x, y, radius, intensity
uniform vec2 frame;
out vec2 local;
flat out vec2 shape;
${COMMON}
void main() {
  shape = spark.zw;
  local = (corner * 2.0 - 1.0) * spark.z * 2.5;
  gl_Position = vec4(toClip(spark.xy + local, frame), 0.0, 1.0);
}
`;

const SPARK_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in vec2 shape;
out vec4 density;
void main() {
  float r = length(local) / shape.x;
  density = vec4(shape.y * exp(-r * r * 1.6), 0.0, 0.0, 0.0);
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

const TONE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D density;
out vec4 pixel;
const vec3 GROUND = vec3(0.010, 0.010, 0.012);
const vec3 LIGHT = vec3(0.95, 0.94, 0.91);
void main() {
  float sum = texture(density, uv).r;
  float light = 1.0 - exp(-sum * 0.85);
  pixel = vec4(mix(GROUND, LIGHT, light), 1.0);
}
`;

const DOT_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 dot;  // x, y, radius, brightness
uniform vec2 frame;
out vec2 local;
flat out vec2 shape;
${COMMON}
void main() {
  shape = dot.zw;
  local = (corner * 2.0 - 1.0) * (dot.z + 1.5);
  gl_Position = vec4(toClip(dot.xy + local, frame), 0.0, 1.0);
}
`;

const DOT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in vec2 shape;
uniform float ratio;
out vec4 pixel;
const vec3 GROUND = vec3(0.010, 0.010, 0.012);
const vec3 LIGHT = vec3(0.95, 0.94, 0.91);
void main() {
  // Opaque, so no fibre shows through; a dimmed dot is darker, not clearer.
  float cover = clamp((shape.x - length(local)) * ratio + 0.5, 0.0, 1.0);
  if (cover <= 0.0) discard;
  pixel = vec4(mix(GROUND, LIGHT, shape.y), cover);
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

export type FibreRenderer = {
  /** Per row: POINTS × (x, y) bundled link points, in CSS px. */
  readonly rows: Float32Array;
  /** Per fibre: row offset spread alpha | reach seed 0 0. */
  readonly fibres: Float32Array;
  /** Per spark: x y radius intensity. */
  readonly sparks: Float32Array;
  /** Per dot: x y radius brightness. */
  readonly dots: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  render(rowCount: number, fibreCount: number, sparkCount: number, dotCount: number, time: number): void;
  dispose(): void;
};

export function createFibreRenderer(canvas: HTMLCanvasElement): FibreRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  // The density sum needs a renderable float target.
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;

  let programs: readonly WebGLProgram[];
  try {
    programs = [
      compile(gl, FIBRE_VERTEX, FIBRE_FRAGMENT),
      compile(gl, SPARK_VERTEX, SPARK_FRAGMENT),
      compile(gl, SCREEN_VERTEX, TONE_FRAGMENT),
      compile(gl, DOT_VERTEX, DOT_FRAGMENT),
    ];
  } catch (error) {
    console.error(error);
    return null;
  }
  const [fibreProgram, sparkProgram, toneProgram, dotProgram] = programs as [WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram];
  const uniform = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);
  const fibreUniforms = {
    points: uniform(fibreProgram, "points"),
    frame: uniform(fibreProgram, "frame"),
    time: uniform(fibreProgram, "time"),
    ratio: uniform(fibreProgram, "ratio"),
  };
  const sparkUniforms = { frame: uniform(sparkProgram, "frame") };
  const toneUniforms = { density: uniform(toneProgram, "density") };
  const dotUniforms = { frame: uniform(dotProgram, "frame"), ratio: uniform(dotProgram, "ratio") };

  const strip: number[] = [];
  for (let index = 0; index <= FIBRE_SEGMENTS; index += 1) {
    strip.push(index / FIBRE_SEGMENTS, -1, index / FIBRE_SEGMENTS, 1);
  }
  const stripTemplate = staticBuffer(gl, strip);
  const squareTemplate = staticBuffer(gl, [0, 0, 1, 0, 0, 1, 1, 1]);
  const rows = new Float32Array(MAX_ROWS * POINTS * 2);
  const fibres = new Float32Array(MAX_FIBRES * FIBRE_FLOATS);
  const sparks = new Float32Array(MAX_SPARKS * SPARK_FLOATS);
  const dots = new Float32Array(MAX_DOTS * DOT_FLOATS);
  const fibreMesh = instanced(gl, stripTemplate, fibres, 2);
  const sparkMesh = instanced(gl, squareTemplate, sparks, 1);
  const dotMesh = instanced(gl, squareTemplate, dots, 1);
  const screen = gl.createVertexArray();
  gl.bindVertexArray(screen);
  gl.bindBuffer(gl.ARRAY_BUFFER, squareTemplate);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const pointTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, pointTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, POINTS, MAX_ROWS, 0, gl.RG, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  const densityTexture = gl.createTexture();
  const target = gl.createFramebuffer();
  let frame = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };
  let ratio = 1;

  const resize: FibreRenderer["resize"] = (width, height, nextRatio) => {
    ratio = nextRatio;
    frame = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    gl.bindTexture(gl.TEXTURE_2D, densityTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, pixels.width, pixels.height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, densityTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const render: FibreRenderer["render"] = (rowCount, fibreCount, sparkCount, dotCount, time) => {
    const rowTotal = Math.min(rowCount, MAX_ROWS);
    const fibreTotal = Math.min(fibreCount, MAX_FIBRES);
    const sparkTotal = Math.min(sparkCount, MAX_SPARKS);
    const dotTotal = Math.min(dotCount, MAX_DOTS);

    gl.bindTexture(gl.TEXTURE_2D, pointTexture);
    if (rowTotal > 0) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, POINTS, rowTotal, gl.RG, gl.FLOAT, rows, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(fibreProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pointTexture);
    gl.uniform1i(fibreUniforms.points, 0);
    gl.uniform2f(fibreUniforms.frame, frame.width, frame.height);
    gl.uniform1f(fibreUniforms.time, time);
    gl.uniform1f(fibreUniforms.ratio, ratio);
    gl.bindVertexArray(fibreMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, fibreMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, fibres, 0, fibreTotal * FIBRE_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (FIBRE_SEGMENTS + 1) * 2, fibreTotal);

    gl.useProgram(sparkProgram);
    gl.uniform2f(sparkUniforms.frame, frame.width, frame.height);
    gl.bindVertexArray(sparkMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, sparkMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, sparks, 0, sparkTotal * SPARK_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, sparkTotal);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.BLEND);
    gl.useProgram(toneProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, densityTexture);
    gl.uniform1i(toneUniforms.density, 0);
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Page dots lie flat over the fibres.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(dotProgram);
    gl.uniform2f(dotUniforms.frame, frame.width, frame.height);
    gl.uniform1f(dotUniforms.ratio, ratio);
    gl.bindVertexArray(dotMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, dotMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dots, 0, dotTotal * DOT_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, dotTotal);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    for (const program of programs) gl.deleteProgram(program);
    for (const buffer of [stripTemplate, squareTemplate, fibreMesh.buffer, sparkMesh.buffer, dotMesh.buffer]) gl.deleteBuffer(buffer);
    for (const vao of [fibreMesh.vao, sparkMesh.vao, dotMesh.vao, screen]) gl.deleteVertexArray(vao);
    gl.deleteTexture(pointTexture);
    gl.deleteTexture(densityTexture);
    gl.deleteFramebuffer(target);
  };

  return { rows, fibres, sparks, dots, resize, render, dispose };
}
