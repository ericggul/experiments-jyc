// Rank as a raft of soap bubbles. Every page is a bubble whose area is its
// displayed rank; the bubbles float together and press into one another.
//
// Shape follows planar soap-bubble geometry (Plateau's laws as in
// LittleBadger/bubbles): bubble i owns the points where
//   f_i(p) = |p − c_i|² / r_i − r_i
// is the smallest and negative. A free face is then a circle of radius r_i,
// and the wall between two bubbles is a circular arc whose curvature follows
// their pressure difference, bowing into the larger one; at the contact
// distance √(r₁² + r₂² − r₁r₂) walls meet three at a time at 120°. The
// layout (this route's copy) keeps touching bubbles at that distance.
//
// On the GPU, at a share of the CSS resolution, every bubble draws a square
// around itself twice with depth testing on f: the first pass keeps each
// pixel's bubble, the second the next one. The composite, at full
// resolution, recomputes both exactly and renders each bubble as a soap
// film filling its whole cell: a shallow cap (its normal from the distance
// to the cell's edge), a film whose thickness drains from top to bottom and
// swirls slowly, coloured by thin-film interference at three wavelengths,
// reflecting a soft window with a Fresnel weight; walls and the free face
// are where the film is seen edge-on. Nothing persists between frames.

export const MAX_BUBBLES = 16_384;
/** Floats per bubble: x y radius seed (CSS px). */
export const BUBBLE_FLOATS = 4;
/** The ownership passes run at this share of the CSS resolution. */
const SCALE = 0.75;
/** A bubble is drawn this far (CSS px) past its own radius, so its neighbour is found near the wall. */
const MARGIN = 24;

const SPLAT_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 bubble;  // x, y, radius, seed
uniform vec2 frame;
out vec2 local;
flat out vec4 disc;
void main() {
  float extent = bubble.z + ${MARGIN}.0;
  local = (corner * 2.0 - 1.0) * extent;
  disc = bubble;
  vec2 clip = (bubble.xy + local) / frame * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const SPLAT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in vec4 disc;
uniform highp sampler2D first;
uniform bool second;
out vec4 result;
void main() {
  float f = dot(local, local) / disc.z - disc.z;
  if (length(local) > disc.z + ${MARGIN}.0) discard;
  if (second) {
    vec4 found = texelFetch(first, ivec2(gl_FragCoord.xy), 0);
    if (found.z > 0.0 && distance(found.xy, disc.xy) < 1e-3 && abs(found.z - disc.z) < 1e-3) discard;
  }
  gl_FragDepth = clamp((f + 8192.0) / 16384.0, 0.0, 1.0);
  result = disc;
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

const FILM_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform highp sampler2D first;
uniform highp sampler2D second;
uniform vec2 frame;                   // CSS px
uniform float time;
out vec4 pixel;

float own(vec4 b, vec2 p) {
  if (b.z <= 0.0) return 1e9;
  vec2 d = p - b.xy;
  return dot(d, d) / b.z - b.z;
}

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 x) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i += 1) {
    sum += amplitude * noise(x);
    x = x * 2.03 + vec3(1.7, 9.2, 3.1);
    amplitude *= 0.5;
  }
  return sum;
}

// Reflectance of a soap film (n = 1.33) of thickness t (nm) at internal
// cosine c, per wavelength: two-beam interference with the half-wave shift
// at the front face, 2 sin²(2π n t c / λ).
vec3 interference(float t, float c) {
  vec3 lambda = vec3(650.0, 532.0, 450.0);
  vec3 phase = 6.2831853 * 1.33 * t * c / lambda;
  vec3 s = sin(phase);
  return 2.0 * s * s;
}

void main() {
  vec2 p = vec2(uv.x, 1.0 - uv.y) * frame;
  vec4 a = texture(first, uv);
  vec4 b = texture(second, uv);
  float fa = own(a, p);
  float fb = own(b, p);
  if (fb < fa) {
    vec4 s = a; a = b; b = s;
    float t = fa; fa = fb; fb = t;
  }
  // Distances in px: to the free face (where f = 0) and to the wall (where
  // the two bubbles' f meet), each from f's own gradient.
  vec2 da = p - a.xy;
  float slopeA = max(2.0 * length(da) / a.z, 1e-3);
  float toFace = -fa / slopeA;
  float toWall = 1e4;
  if (b.z > 0.0 && fb < 0.0) {
    vec2 db = p - b.xy;
    vec2 gradient = 2.0 * da / a.z - 2.0 * db / b.z;
    toWall = (fb - fa) / max(length(gradient), 1e-3);
  }
  float toEdge = min(toFace, toWall);
  float coverage = smoothstep(-0.7, 0.7, toFace);
  if (coverage <= 0.0) {
    pixel = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // A shallow cap over the cell: steep at the edge, nearly level inside.
  float r = a.z;
  float rise = clamp(toEdge / (0.45 * r + 2.0), 0.0, 1.0);
  float h = sqrt(max(1.0 - (1.0 - rise) * (1.0 - rise), 0.0));
  vec2 slope = vec2(dFdx(h), -dFdy(h)) * (0.45 * r + 2.0);
  vec3 normal = normalize(vec3(-slope, max(h, 0.05) + 0.6));
  float facing = clamp(normal.z, 0.0, 1.0);

  // The film drains: thin (towards black film) at the top of each bubble,
  // thicker at the bottom, and swirls slowly in its own currents.
  vec2 q = da / r;
  float seed = a.w * 37.0;
  vec3 at = vec3(q * 1.6 + seed, time * 0.07 + seed);
  vec2 warp = vec2(fbm(at), fbm(at + vec3(5.2, 1.3, 2.7))) - 0.5;
  float swirl = fbm(vec3(q * 2.2 + warp * 1.8 + seed, time * 0.05));
  float drain = clamp(0.5 + 0.5 * q.y, 0.0, 1.0);
  float thickness = mix(80.0, 760.0, drain) * (0.55 + 0.9 * swirl);
  float inner = sqrt(max(1.0 - (1.0 - facing * facing) / (1.33 * 1.33), 0.0));
  vec3 film = interference(thickness, inner);
  // Real films are pale and gentle on dark ground: keep the colour, temper it.
  float grey = dot(film, vec3(0.3333));
  film = mix(vec3(grey), film, 0.55);

  // Fresnel weight and a soft window, mirrored faintly by the back face.
  vec3 view = vec3(0.0, 0.0, 1.0);
  float fresnel = 0.05 + 0.95 * pow(1.0 - facing, 5.0);
  vec3 window = normalize(vec3(-0.45, 0.6, 0.66));
  float front = pow(max(dot(normal, normalize(window + view)), 0.0), 90.0);
  vec3 mirrored = normalize(vec3(0.45, -0.6, 0.66));
  float back = pow(max(dot(normal, normalize(mirrored + view)), 0.0), 60.0) * 0.25;
  float ambient = 0.16 + 0.12 * (0.5 - 0.5 * q.y);
  // Seen edge-on, at a wall or the free face, the film catches more light.
  float edgeOn = exp(-toEdge / 1.4);

  vec3 colour = film * (ambient + 0.85 * fresnel + 0.55 * edgeOn) + vec3(1.0) * (front * 0.9 + back);
  pixel = vec4(colour * coverage, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram();
  const shaders = [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const;
  for (const [type, source] of shaders) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`7-glsl-6 bubble shader: ${log}`);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`7-glsl-6 bubble program: ${gl.getProgramInfoLog(program)}`);
  return program;
}

export type FoamRenderer = {
  /** Per bubble: x y radius seed (CSS px; seed in [0, 1)). */
  readonly bubbles: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  render(bubbleCount: number, time: number): void;
  dispose(): void;
};

export function createFoamRenderer(canvas: HTMLCanvasElement): FoamRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;

  const splatProgram = compile(gl, SPLAT_VERTEX, SPLAT_FRAGMENT);
  const filmProgram = compile(gl, SCREEN_VERTEX, FILM_FRAGMENT);
  const location = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);

  const square = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const screen = gl.createVertexArray();
  gl.bindVertexArray(screen);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const bubbles = new Float32Array(MAX_BUBBLES * BUBBLE_FLOATS);
  const bubbleBuffer = gl.createBuffer();
  const bubbleMesh = gl.createVertexArray();
  gl.bindVertexArray(bubbleMesh);
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bubbleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, bubbles.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, BUBBLE_FLOATS * 4, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.bindVertexArray(null);

  type Layer = { texture: WebGLTexture; target: WebGLFramebuffer };
  const depth = gl.createRenderbuffer();
  const layers = [
    { texture: gl.createTexture(), target: gl.createFramebuffer() },
    { texture: gl.createTexture(), target: gl.createFramebuffer() },
  ] as const satisfies readonly Layer[];
  let frame = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };
  let sim = { width: 1, height: 1 };

  const resize: FoamRenderer["resize"] = (width, height, ratio) => {
    frame = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    sim = { width: Math.max(1, Math.round(width * SCALE)), height: Math.max(1, Math.round(height * SCALE)) };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, sim.width, sim.height);
    for (const layer of layers) {
      gl.bindTexture(gl.TEXTURE_2D, layer.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, sim.width, sim.height, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.target);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, layer.texture, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const render: FoamRenderer["render"] = (bubbleCount, time) => {
    const count = Math.min(bubbleCount, MAX_BUBBLES);
    gl.bindBuffer(gl.ARRAY_BUFFER, bubbleBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, bubbles, 0, count * BUBBLE_FLOATS);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.useProgram(splatProgram);
    gl.uniform2f(location(splatProgram, "frame"), frame.width, frame.height);
    gl.uniform1i(location(splatProgram, "first"), 0);
    for (let peel = 0; peel < 2; peel += 1) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, layers[peel]!.target);
      gl.viewport(0, 0, sim.width, sim.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (count === 0) continue;
      gl.uniform1i(location(splatProgram, "second"), peel);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, peel === 1 ? layers[0].texture : null);
      gl.bindVertexArray(bubbleMesh);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }
    gl.disable(gl.DEPTH_TEST);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.useProgram(filmProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layers[0].texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, layers[1].texture);
    gl.uniform1i(location(filmProgram, "first"), 0);
    gl.uniform1i(location(filmProgram, "second"), 1);
    gl.uniform2f(location(filmProgram, "frame"), frame.width, frame.height);
    gl.uniform1f(location(filmProgram, "time"), time);
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const dispose = () => {
    for (const layer of layers) {
      gl.deleteTexture(layer.texture);
      gl.deleteFramebuffer(layer.target);
    }
    gl.deleteRenderbuffer(depth);
    for (const buffer of [square, bubbleBuffer]) gl.deleteBuffer(buffer);
    for (const vao of [screen, bubbleMesh]) gl.deleteVertexArray(vao);
    gl.deleteProgram(splatProgram);
    gl.deleteProgram(filmProgram);
  };

  return { bubbles, resize, render, dispose };
}
