// Sumi ink on still water. Every page is a well where ink rises steadily,
// as dense as its rank is rich. Every link is a current on the water from its
// source to its target, as strong as the rank it carries (d·PR·w/W), so ink
// is drawn out of each well along its links in long graded filaments and
// carried into the pages it feeds. The picture is one ink on one sheet: a
// page is where ink wells up, a link is where it is drawn away, and nothing
// is drawn over anything. Ink thins within seconds, so nothing accumulates.
//
// The water is a 2D incompressible fluid (stable fluids: Stam, SIGGRAPH 1999)
// at half CSS resolution: per frame, link currents are splatted into a source
// texture, velocity is advected and forced and projected with a pressure
// solve (Jacobi), then ink is advected, refreshed at the wells and faded. The
// composite maps ink density to a graded wash and lights the paper by the
// ink's own slope.

export const MAX_TEXTURE_PAGES = 1_024;
export const MAX_CURRENTS = 8_192;
/** Floats per current: ax ay bx by | strength halfWidth 0 0. */
export const CURRENT_FLOATS = 8;
/** Floats per page: x y radius wellRate | phase 0 0 0. */
export const PAGE_FLOATS = 8;
/** The water runs at this share of the CSS resolution. */
const SCALE = 0.5;
const JACOBI_ITERATIONS = 48;
/**
 * Ink moves in this many sub-steps a frame, so a fast current carries it at
 * most about a texel per step: the well is drawn out as one continuous thread
 * instead of being stamped once a frame into a string of beads.
 */
const INK_SUBSTEPS = 8;

const COMMON = /* glsl */ `
vec2 toClip(vec2 point, vec2 frame) {
  vec2 clip = point / frame * 2.0 - 1.0;
  return vec2(clip.x, -clip.y);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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

// A link's current: a ribbon along its chord that pushes water toward the
// target. It takes hold right at the source, so ink leaves the well along
// it, and eases off near the target so it does not stab into its centre.
const CURRENT_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 ends;
layout(location = 2) in vec4 shape;  // strength, half-width
uniform vec2 frame;
out vec2 local;          // along (px), across (px)
flat out vec4 info;      // length, half-width, strength, 0
flat out vec2 direction;
${COMMON}
void main() {
  vec2 a = ends.xy;
  vec2 b = ends.zw;
  float span = max(distance(a, b), 1e-3);
  direction = (b - a) / span;
  vec2 normal = vec2(-direction.y, direction.x);
  float reach = shape.y * 2.0;
  local = vec2(corner.x * span, corner.y * reach);
  info = vec4(span, shape.y, shape.x, 0.0);
  gl_Position = vec4(toClip(a + direction * local.x + normal * local.y, frame), 0.0, 1.0);
}
`;

const CURRENT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in vec4 info;
flat in vec2 direction;
out vec4 source;
void main() {
  float across = local.y / info.y;
  float profile = exp(-across * across * 1.2);
  // The current takes the ink right where it wells up at its source and
  // eases off only as it reaches its target.
  float ends = smoothstep(0.0, 0.04, local.x / info.x) * (1.0 - smoothstep(0.45, 1.0, local.x / info.x));
  vec2 push = direction * info.z * profile * ends;
  source = vec4(push, 0.0, 0.0);
}
`;

// A page's drop: injection (it pushes the water outward as it falls) and its
// ink, alternating with clear drops at a rate set by its rank.
const DROP_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 page;   // x, y, radius, well rate
layout(location = 2) in vec4 extra;  // phase, injection
uniform vec2 frame;
out vec2 local;
flat out vec4 drop;
${COMMON}
void main() {
  float core = max(4.0, 0.7 * page.z);
  drop = vec4(core, page.w, extra.x, extra.y);
  local = (corner * 2.0 - 1.0) * (core + 2.0);
  gl_Position = vec4(toClip(page.xy + local, frame), 0.0, 1.0);
}
`;

const DROP_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in vec4 drop;
uniform float time;
out vec4 source;
void main() {
  float spread = length(local) / drop.x;
  if (spread >= 1.0) discard;
  float body = exp(-spread * spread * 3.0) * (1.0 - spread);
  // A page wells ink steadily, as dense as its rank is rich (its rate,
  // .22–1.1, read as a concentration of .15–.7). It pushes no water: the
  // ink leaves only as the currents take it.
  float density = 0.15 + 0.55 * clamp((drop.y - 0.22) / 0.88, 0.0, 1.0);
  source = vec4(0.0, 0.0, 0.0, density * body);
}
`;

const ADVECT_VELOCITY_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D velocity;
uniform sampler2D sources;
uniform vec2 frame;      // CSS px
uniform float seconds;
uniform float damping;
uniform float time;
out vec4 next;
// Slow stream function: the still water is never quite still, so the ink
// drifts and curls as it is drawn out instead of running straight.
float stream(vec2 p) {
  return sin(p.x * 0.011 + time * 0.13) * cos(p.y * 0.013 - time * 0.11)
    + 0.6 * sin((p.x + p.y) * 0.019 - time * 0.17) + 0.4 * cos((p.x - 1.3 * p.y) * 0.027 + time * 0.07);
}
void main() {
  vec2 v = texture(velocity, uv).xy;
  vec2 from = uv - vec2(v.x, -v.y) * seconds / frame;
  vec2 carried = texture(velocity, from).xy;
  vec2 point = vec2(uv.x, 1.0 - uv.y) * frame;
  float e = 2.0;
  vec2 curl = vec2(stream(point + vec2(0.0, e)) - stream(point - vec2(0.0, e)),
    -(stream(point + vec2(e, 0.0)) - stream(point - vec2(e, 0.0)))) / (2.0 * e);
  vec2 push = texture(sources, uv).xy + curl * 1200.0;
  next = vec4((carried + push * seconds) * damping, 0.0, 1.0);
}
`;

const DIVERGENCE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D velocity;
uniform sampler2D sources;
uniform vec2 size;       // simulation px
uniform float cssPerTexel;
out vec4 result;
void main() {
  vec2 texel = 1.0 / size;
  float right = texture(velocity, uv + vec2(texel.x, 0.0)).x;
  float left = texture(velocity, uv - vec2(texel.x, 0.0)).x;
  // Velocity has y down; texture space has y up.
  float up = -texture(velocity, uv + vec2(0.0, texel.y)).y;
  float down = -texture(velocity, uv - vec2(0.0, texel.y)).y;
  float divergence = (right - left + up - down) / (2.0 * cssPerTexel);
  // A falling drop is a source: the solve makes the water spread from it.
  result = vec4(divergence - texture(sources, uv).z, 0.0, 0.0, 1.0);
}
`;

const JACOBI_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D pressure;
uniform sampler2D divergence;
uniform vec2 size;
uniform float cssPerTexel;
out vec4 result;
// The open sheet: beyond its edge pressure is zero, so water may leave.
float at(vec2 p) {
  if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) return 0.0;
  return texture(pressure, p).x;
}
void main() {
  vec2 texel = 1.0 / size;
  float sum = at(uv + vec2(texel.x, 0.0)) + at(uv - vec2(texel.x, 0.0)) + at(uv + vec2(0.0, texel.y)) + at(uv - vec2(0.0, texel.y));
  float d = texture(divergence, uv).x;
  result = vec4((sum - d * cssPerTexel * cssPerTexel) * 0.25, 0.0, 0.0, 1.0);
}
`;

const PROJECT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D velocity;
uniform sampler2D pressure;
uniform vec2 size;
uniform float cssPerTexel;
out vec4 next;
float at(vec2 p) {
  if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) return 0.0;
  return texture(pressure, p).x;
}
void main() {
  vec2 texel = 1.0 / size;
  float gx = (at(uv + vec2(texel.x, 0.0)) - at(uv - vec2(texel.x, 0.0))) / (2.0 * cssPerTexel);
  float gy = (at(uv + vec2(0.0, texel.y)) - at(uv - vec2(0.0, texel.y))) / (2.0 * cssPerTexel);
  vec2 v = texture(velocity, uv).xy;
  // Back to y down for the velocity.
  next = vec4(v - vec2(gx, -gy), 0.0, 1.0);
}
`;

const INK_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D ink;
uniform sampler2D velocity;
uniform sampler2D sources;
uniform vec2 frame;
uniform vec2 size;
uniform float seconds;
uniform float fade;
out vec4 next;
void main() {
  vec2 v = texture(velocity, uv).xy;
  vec2 from = uv - vec2(v.x, -v.y) * seconds / frame;
  float carried = texture(ink, from).x;
  // A very slight spreading, so bands soften only over many seconds.
  vec2 texel = 1.0 / size;
  float around = 0.25 * (texture(ink, from + vec2(texel.x, 0.0)).x + texture(ink, from - vec2(texel.x, 0.0)).x
    + texture(ink, from + vec2(0.0, texel.y)).x + texture(ink, from - vec2(0.0, texel.y)).x);
  float value = mix(carried, around, 0.008) * fade;
  // Each page wells a little ink every moment, as rich as its rank; the
  // water carries it on and it thins as it goes, so no well hardens into a dot.
  float well = texture(sources, uv).w;
  value += max(well - value, 0.0) * min(1.0, seconds * 20.0);
  next = vec4(clamp(value, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;

const COMPOSITE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D ink;
uniform vec2 size;
out vec4 pixel;
const vec3 PAPER = vec3(0.945, 0.93, 0.895);
const vec3 SUMI = vec3(0.075, 0.072, 0.07);
// Ink as diluted sumi: graded washes, densest where it wells up, thinning
// as the currents draw it out — no hard-edged blots.
float toneAt(vec2 at) {
  float c = texture(ink, at).x;
  return 0.92 * (1.0 - exp(-c * 3.8));
}
void main() {
  vec2 texel = 1.0 / size;
  float tone = toneAt(uv);
  // The sheet takes the ink as a faint relief: it sits a little proud of
  // the paper, lit from the upper left.
  float gx = toneAt(uv + vec2(texel.x, 0.0)) - toneAt(uv - vec2(texel.x, 0.0));
  float gy = toneAt(uv + vec2(0.0, texel.y)) - toneAt(uv - vec2(0.0, texel.y));
  vec3 normal = normalize(vec3(-gx * 1.6, -gy * 1.6, 1.0));
  float light = 0.94 + 0.08 * dot(normal, normalize(vec3(-0.45, 0.55, 0.7)));
  pixel = vec4(mix(PAPER, SUMI, tone) * light, 1.0);
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

function instanced(gl: WebGL2RenderingContext, template: WebGLBuffer, data: Float32Array) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, template);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  for (let index = 0; index < 2; index += 1) {
    gl.enableVertexAttribArray(index + 1);
    gl.vertexAttribPointer(index + 1, 4, gl.FLOAT, false, 32, index * 16);
    gl.vertexAttribDivisor(index + 1, 1);
  }
  gl.bindVertexArray(null);
  return { vao, buffer };
}

type Layer = { texture: WebGLTexture; target: WebGLFramebuffer };

export type MarblingStep = {
  seconds: number;
  currents: number;
  pages: number;
};

export type MarblingRenderer = {
  /** Per current: ax ay bx by | strength (CSS px/s²) halfWidth 0 0. */
  readonly currents: Float32Array;
  /** Per page: x y radius wellRate (.22–1.1) | phase 0 0 0. */
  readonly pages: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  /** Clears the water, as when the web starts over. */
  reset(): void;
  render(step: MarblingStep, time: number): void;
  dispose(): void;
};

export function createMarblingRenderer(canvas: HTMLCanvasElement): MarblingRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;

  let programs: readonly WebGLProgram[];
  try {
    programs = [
      compile(gl, CURRENT_VERTEX, CURRENT_FRAGMENT),
      compile(gl, DROP_VERTEX, DROP_FRAGMENT),
      compile(gl, SCREEN_VERTEX, ADVECT_VELOCITY_FRAGMENT),
      compile(gl, SCREEN_VERTEX, DIVERGENCE_FRAGMENT),
      compile(gl, SCREEN_VERTEX, JACOBI_FRAGMENT),
      compile(gl, SCREEN_VERTEX, PROJECT_FRAGMENT),
      compile(gl, SCREEN_VERTEX, INK_FRAGMENT),
      compile(gl, SCREEN_VERTEX, COMPOSITE_FRAGMENT),
    ];
  } catch (error) {
    console.error(error);
    return null;
  }
  const [currentProgram, dropProgram, advectProgram, divergenceProgram, jacobiProgram, projectProgram, inkProgram, compositeProgram] =
    programs as [WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram];
  const location = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);

  const square = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const ribbon = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ribbon);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const screen = gl.createVertexArray();
  gl.bindVertexArray(screen);
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const currents = new Float32Array(MAX_CURRENTS * CURRENT_FLOATS);
  const pages = new Float32Array(MAX_TEXTURE_PAGES * PAGE_FLOATS);
  const currentMesh = instanced(gl, ribbon, currents);
  const dropMesh = instanced(gl, square, pages);

  const layer = (width: number, height: number): Layer => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const target = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, target };
  };

  type Field = {
    sources: Layer;
    velocity: [Layer, Layer];
    divergence: Layer;
    pressure: [Layer, Layer];
    ink: [Layer, Layer];
  };
  let field: Field | null = null;
  let frame = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };
  let sim = { width: 1, height: 1 };

  const allLayers = (f: Field) => [f.sources, ...f.velocity, f.divergence, ...f.pressure, ...f.ink];

  const release = () => {
    if (!field) return;
    for (const item of allLayers(field)) {
      gl.deleteTexture(item.texture);
      gl.deleteFramebuffer(item.target);
    }
    field = null;
  };

  const resize: MarblingRenderer["resize"] = (width, height, ratio) => {
    frame = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    sim = { width: Math.max(1, Math.round(width * SCALE)), height: Math.max(1, Math.round(height * SCALE)) };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    release();
    field = {
      sources: layer(sim.width, sim.height),
      velocity: [layer(sim.width, sim.height), layer(sim.width, sim.height)],
      divergence: layer(sim.width, sim.height),
      pressure: [layer(sim.width, sim.height), layer(sim.width, sim.height)],
      ink: [layer(sim.width, sim.height), layer(sim.width, sim.height)],
    };
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const reset = () => {
    if (!field) return;
    for (const item of allLayers(field)) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, item.target);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  /** Binds `textures` to units 0… and their sampler uniforms. */
  const bind = (program: WebGLProgram, textures: readonly (readonly [string, WebGLTexture])[]) => {
    textures.forEach(([name, texture], unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(location(program, name), unit);
    });
  };

  const pass = (target: Layer) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.target);
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const render: MarblingRenderer["render"] = (step, time) => {
    if (!field) return;
    const f = field;
    const seconds = Math.min(step.seconds, 1 / 30);
    const cssPerTexel = 1 / SCALE;
    gl.viewport(0, 0, sim.width, sim.height);

    if (seconds > 0) {
      // 1. Sources: link currents (xy), drop injection (z) and drop ink (w).
      const currentCount = Math.min(step.currents, MAX_CURRENTS);
      const pageCount = Math.min(step.pages, MAX_TEXTURE_PAGES);
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.sources.target);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(currentProgram);
      gl.uniform2f(location(currentProgram, "frame"), frame.width, frame.height);
      gl.bindVertexArray(currentMesh.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, currentMesh.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, currents, 0, currentCount * CURRENT_FLOATS);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, currentCount);
      gl.useProgram(dropProgram);
      gl.uniform2f(location(dropProgram, "frame"), frame.width, frame.height);
      gl.uniform1f(location(dropProgram, "time"), time);
      gl.bindVertexArray(dropMesh.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, dropMesh.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pages, 0, pageCount * PAGE_FLOATS);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, pageCount);
      gl.disable(gl.BLEND);

      // 2. Velocity: advected by itself, pushed by the currents, damped.
      gl.useProgram(advectProgram);
      bind(advectProgram, [["velocity", f.velocity[0].texture], ["sources", f.sources.texture]]);
      gl.uniform2f(location(advectProgram, "frame"), frame.width, frame.height);
      gl.uniform1f(location(advectProgram, "seconds"), seconds);
      gl.uniform1f(location(advectProgram, "damping"), Math.exp(-seconds / 1.1));
      gl.uniform1f(location(advectProgram, "time"), time);
      pass(f.velocity[1]);
      f.velocity.reverse();

      // 3. Projection: the water stays incompressible except where drops fall.
      gl.useProgram(divergenceProgram);
      bind(divergenceProgram, [["velocity", f.velocity[0].texture], ["sources", f.sources.texture]]);
      gl.uniform2f(location(divergenceProgram, "size"), sim.width, sim.height);
      gl.uniform1f(location(divergenceProgram, "cssPerTexel"), cssPerTexel);
      pass(f.divergence);
      gl.useProgram(jacobiProgram);
      gl.uniform2f(location(jacobiProgram, "size"), sim.width, sim.height);
      gl.uniform1f(location(jacobiProgram, "cssPerTexel"), cssPerTexel);
      for (let iteration = 0; iteration < JACOBI_ITERATIONS; iteration += 1) {
        bind(jacobiProgram, [["pressure", f.pressure[0].texture], ["divergence", f.divergence.texture]]);
        pass(f.pressure[1]);
        f.pressure.reverse();
      }
      gl.useProgram(projectProgram);
      bind(projectProgram, [["velocity", f.velocity[0].texture], ["pressure", f.pressure[0].texture]]);
      gl.uniform2f(location(projectProgram, "size"), sim.width, sim.height);
      gl.uniform1f(location(projectProgram, "cssPerTexel"), cssPerTexel);
      pass(f.velocity[1]);
      f.velocity.reverse();

      // 4. Ink: carried, refreshed at the wells, fading.
      gl.useProgram(inkProgram);
      gl.uniform2f(location(inkProgram, "frame"), frame.width, frame.height);
      gl.uniform2f(location(inkProgram, "size"), sim.width, sim.height);
      gl.uniform1f(location(inkProgram, "seconds"), seconds / INK_SUBSTEPS);
      gl.uniform1f(location(inkProgram, "fade"), Math.exp(-seconds / INK_SUBSTEPS / 6));
      for (let substep = 0; substep < INK_SUBSTEPS; substep += 1) {
        bind(inkProgram, [["ink", f.ink[0].texture], ["velocity", f.velocity[0].texture], ["sources", f.sources.texture]]);
        pass(f.ink[1]);
        f.ink.reverse();
      }
    }

    // 5. Composite.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.useProgram(compositeProgram);
    bind(compositeProgram, [["ink", f.ink[0].texture]]);
    gl.uniform2f(location(compositeProgram, "size"), sim.width, sim.height);
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    release();
    for (const program of programs) gl.deleteProgram(program);
    for (const buffer of [square, ribbon, currentMesh.buffer, dropMesh.buffer]) gl.deleteBuffer(buffer);
    for (const vao of [screen, currentMesh.vao, dropMesh.vao]) gl.deleteVertexArray(vao);
  };

  return { currents, pages, resize, reset, render, dispose };
}
