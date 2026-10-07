// PageRank performed, not drawn. PageRank is the share of time a random
// surfer spends on each page: at a page it follows a link chosen by weight
// with probability d, and otherwise jumps to any page. Here tens of thousands
// of surfers do exactly that on the GPU, and the picture is nothing but the
// trail they leave. Nothing is given a shape: a page is where surfers linger
// (so its light grows with its rank), a link is where they travel (so its
// vein thickens with the rank it carries), and both are the same trail, so
// node and link cannot come apart.
//
// Surfers steer toward the page they are bound for but bend toward trail
// already laid, as Physarum does (Jones, Artificial Life 16, 127 (2010)), so
// paths bundle and well-used ones are used more: rich get richer in the
// paths themselves. The colony starts small and divides — a surfer that
// finishes a stay may split — so the network grows out of a few seeds.
//
// Per frame, all in GLSL: one agent step (two float targets per agent,
// ping-pong), trail diffusion and decay, a deposit of every living agent as
// a point, and a composite of the trail as soft light with slight relief.

export const AGENT_SIDE = 192;
export const MAX_AGENTS = AGENT_SIDE * AGENT_SIDE;
export const MAX_TEXTURE_PAGES = 1_024;
/** Candidate links per page in the link table. */
export const LINK_SLOTS = 8;
/** The trail runs at CSS resolution, so veins stay fine. */
const TRAIL_SCALE = 1;

const COMMON = /* glsl */ `
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

// One step of every surfer. A: position (CSS px), heading, timer.
// B: target page, current page, mode (−1 unborn, 0 travelling, 1 staying), unused.
const AGENT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D agentsA;
uniform sampler2D agentsB;
uniform sampler2D pages;   // x, y, radius, number of candidate links
uniform sampler2D links;   // per page: target, cumulative weight (0–1)
uniform sampler2D trail;
uniform vec2 frame;
uniform float seconds;
uniform float time;
uniform float pageCount;
uniform float damping;
uniform float population;
uniform float parents;
uniform float speed;
uniform float stay;
layout(location = 0) out vec4 nextA;
layout(location = 1) out vec4 nextB;
${COMMON}

vec4 pageAt(float page) {
  return texelFetch(pages, ivec2(int(page), 0), 0);
}

float trailAt(vec2 point) {
  return texture(trail, vec2(point.x / frame.x, 1.0 - point.y / frame.y)).r;
}

float wrapAngle(float angle) {
  return atan(sin(angle), cos(angle));
}

// Where a surfer goes after a stay: with probability d along a link chosen by
// weight, otherwise (or from a page without links) to any page.
float nextPage(float page, float roll, float pick, out bool jumped) {
  vec4 here = pageAt(page);
  jumped = roll > damping || here.w < 0.5;
  if (jumped) return min(floor(pick * pageCount), pageCount - 1.0);
  float chosen = texelFetch(links, ivec2(0, int(page)), 0).x;
  for (int slot = 0; slot < ${LINK_SLOTS}; slot += 1) {
    vec4 link = texelFetch(links, ivec2(slot, int(page)), 0);
    if (float(slot) >= here.w) break;
    chosen = link.x;
    if (pick <= link.y) break;
  }
  return chosen;
}

void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  float index = float(texel.y * ${AGENT_SIDE} + texel.x);
  vec4 a = texelFetch(agentsA, texel, 0);
  vec4 b = texelFetch(agentsB, texel, 0);
  float r1 = hash(vec2(index * 0.013, time * 1.7));
  float r2 = hash(vec2(index * 0.029 + 3.1, time * 2.3));
  float r3 = hash(vec2(index * 0.047 + 7.7, time * 0.9));

  if (index >= population || pageCount < 1.0) {
    nextA = vec4(0.0);
    nextB = vec4(0.0, 0.0, -1.0, 0.0);
    return;
  }
  if (b.z < -0.5) {
    // Born: a copy of its parent, the surfer it divided from. The first
    // surfers, with no living parent, start at random pages.
    float parent = mod(index, max(parents, 1.0));
    ivec2 at = ivec2(int(mod(parent, ${AGENT_SIDE}.0)), int(floor(parent / ${AGENT_SIDE}.0)));
    vec4 pa = texelFetch(agentsA, at, 0);
    vec4 pb = texelFetch(agentsB, at, 0);
    if (pb.z < -0.5 || parent >= index) {
      float page = min(floor(r1 * pageCount), pageCount - 1.0);
      vec4 p = pageAt(page);
      vec2 offset = (vec2(r2, r3) - 0.5) * p.z;
      nextA = vec4(p.xy + offset, r1 * 6.2831853, stay * r2);
      nextB = vec4(page, page, 1.0, 0.0);
    } else {
      nextA = vec4(pa.xy, pa.z + (r1 - 0.5) * 2.0, pa.w);
      nextB = pb;
    }
    return;
  }

  vec2 position = a.xy;
  float heading = a.z;
  float timer = a.w;
  float target = b.x;
  float current = b.y;
  float mode = b.z;
  if (target >= pageCount || current >= pageCount) {
    // Its page is gone: it jumps anywhere.
    current = min(floor(r1 * pageCount), pageCount - 1.0);
    vec4 p = pageAt(current);
    nextA = vec4(p.xy, r2 * 6.2831853, stay);
    nextB = vec4(current, current, 1.0, 0.0);
    return;
  }

  if (mode < 0.5) {
    // Travelling: toward the target, bent toward trail already laid.
    vec4 goal = pageAt(target);
    vec2 toward = goal.xy - position;
    float gap = length(toward);
    float aim = wrapAngle(atan(toward.y, toward.x) - heading);
    float sense = 12.0;
    float spread = 0.7;
    float left = trailAt(position + sense * vec2(cos(heading - spread), sin(heading - spread)));
    float front = trailAt(position + sense * vec2(cos(heading), sin(heading)));
    float right = trailAt(position + sense * vec2(cos(heading + spread), sin(heading + spread)));
    float follow = front >= left && front >= right ? 0.0 : (right > left ? 1.0 : -1.0);
    float turn = 5.0 * seconds;
    // Bound for its target and drawn as much to laid trail, so paths bend,
    // merge and branch as a mould's veins do yet still arrive.
    heading += clamp(aim, -turn, turn) * 0.6 + follow * turn * 0.6 + (r1 - 0.5) * 8.0 * seconds;
    position += vec2(cos(heading), sin(heading)) * speed * seconds;
    if (gap < max(goal.z * 0.6, 2.5)) {
      mode = 1.0;
      current = target;
      timer = stay;
    }
  } else {
    // Staying: wandering inside the page, drawn back toward its middle.
    vec4 here = pageAt(current);
    vec2 back = here.xy - position;
    float aim = wrapAngle(atan(back.y, back.x) - heading);
    float pull = smoothstep(0.4, 0.9, length(back) / max(here.z, 1.5));
    heading += (r1 - 0.5) * 9.0 * seconds + aim * pull * 6.0 * seconds;
    position += vec2(cos(heading), sin(heading)) * speed * 0.35 * seconds;
    timer -= seconds;
    if (timer <= 0.0) {
      bool jumped;
      float next = nextPage(current, r2, r3, jumped);
      if (jumped) {
        // A jump leaves no trail: it reappears inside its new page.
        vec4 p = pageAt(next);
        position = p.xy + (vec2(r1, r3) - 0.5) * p.z;
        current = next;
        target = next;
        timer = stay;
      } else {
        target = next;
        mode = 0.0;
        vec4 goal = pageAt(target);
        heading = atan(goal.y - position.y, goal.x - position.x) + (r1 - 0.5) * 0.8;
      }
    }
  }
  nextA = vec4(position, heading, timer);
  nextB = vec4(target, current, mode, 0.0);
}
`;

const TRAIL_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D trail;
uniform vec2 size;
uniform float decay;
out vec4 next;
void main() {
  vec2 texel = 1.0 / size;
  float sum = 0.0;
  for (int dx = -1; dx <= 1; dx += 1) {
    for (int dy = -1; dy <= 1; dy += 1) {
      sum += texture(trail, uv + vec2(float(dx), float(dy)) * texel).r;
    }
  }
  float here = texture(trail, uv).r;
  next = vec4(mix(here, sum / 9.0, 0.15) * decay, 0.0, 0.0, 1.0);
}
`;

const DEPOSIT_VERTEX = /* glsl */ `#version 300 es
uniform sampler2D agentsA;
uniform sampler2D agentsB;
uniform vec2 frame;
uniform float pointSize;
out float strength;
void main() {
  ivec2 texel = ivec2(gl_VertexID % ${AGENT_SIDE}, gl_VertexID / ${AGENT_SIDE});
  vec4 a = texelFetch(agentsA, texel, 0);
  vec4 b = texelFetch(agentsB, texel, 0);
  strength = b.z < -0.5 ? 0.0 : 1.0;
  vec2 clip = a.xy / frame * 2.0 - 1.0;
  gl_Position = b.z < -0.5 ? vec4(2.0, 2.0, 0.0, 1.0) : vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = pointSize;
}
`;

const DEPOSIT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in float strength;
uniform float amount;
out vec4 deposit;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float soft = max(0.0, 1.0 - dot(c, c));
  deposit = vec4(strength * amount * soft, 0.0, 0.0, 0.0);
}
`;

const COMPOSITE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D trail;
uniform vec2 size;
uniform float gain;
out vec4 pixel;
const vec3 LIGHT = vec3(0.94, 0.92, 0.87);
float lightAt(vec2 at) {
  return 1.0 - exp(-texture(trail, at).r * gain);
}
void main() {
  vec2 texel = 1.0 / size;
  float l = lightAt(uv);
  // Slight relief from the light's own slope, so the trail has body.
  float gx = lightAt(uv + vec2(texel.x, 0.0)) - lightAt(uv - vec2(texel.x, 0.0));
  float gy = lightAt(uv + vec2(0.0, texel.y)) - lightAt(uv - vec2(0.0, texel.y));
  vec3 normal = normalize(vec3(-gx * 3.0, -gy * 3.0, 1.0));
  float shade = 0.82 + 0.3 * dot(normal, normalize(vec3(-0.45, 0.55, 0.7)));
  pixel = vec4(LIGHT * l * shade, 1.0);
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

function floatTexture(gl: WebGL2RenderingContext, width: number, height: number, half: boolean, linear: boolean) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

type Agents = { a: WebGLTexture; b: WebGLTexture; target: WebGLFramebuffer };
type Layer = { texture: WebGLTexture; target: WebGLFramebuffer };

export type SwarmStep = {
  seconds: number;
  pageCount: number;
  damping: number;
  /** Living surfers this frame, and last frame (the parents of newborns). */
  population: number;
  parents: number;
};

export type SwarmRenderer = {
  /** Per page: x y radius candidateCount (CSS px). */
  readonly pages: Float32Array;
  /** Per page row, LINK_SLOTS × (target, cumulative weight, 0, 0). */
  readonly links: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  /** Kills every surfer and clears the trail, as when the web starts over. */
  reset(): void;
  render(step: SwarmStep, time: number): void;
  dispose(): void;
};

export function createSwarmRenderer(canvas: HTMLCanvasElement): SwarmRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;

  let programs: readonly WebGLProgram[];
  try {
    programs = [
      compile(gl, SCREEN_VERTEX, AGENT_FRAGMENT),
      compile(gl, SCREEN_VERTEX, TRAIL_FRAGMENT),
      compile(gl, DEPOSIT_VERTEX, DEPOSIT_FRAGMENT),
      compile(gl, SCREEN_VERTEX, COMPOSITE_FRAGMENT),
    ];
  } catch (error) {
    console.error(error);
    return null;
  }
  const [agentProgram, trailProgram, depositProgram, compositeProgram] = programs as [WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram];
  const location = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);

  const square = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const screen = gl.createVertexArray();
  gl.bindVertexArray(screen);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const empty = gl.createVertexArray();
  gl.bindVertexArray(null);

  const pages = new Float32Array(MAX_TEXTURE_PAGES * 4);
  const links = new Float32Array(MAX_TEXTURE_PAGES * LINK_SLOTS * 4);
  const pageTexture = floatTexture(gl, MAX_TEXTURE_PAGES, 1, false, false);
  const linkTexture = floatTexture(gl, LINK_SLOTS, MAX_TEXTURE_PAGES, false, false);

  const makeAgents = (): Agents => {
    const a = floatTexture(gl, AGENT_SIDE, AGENT_SIDE, false, false);
    const b = floatTexture(gl, AGENT_SIDE, AGENT_SIDE, false, false);
    const target = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, a, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, b, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    return { a, b, target };
  };
  let agents: [Agents, Agents] = [makeAgents(), makeAgents()];

  const killAll = () => {
    for (const set of agents) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, set.target);
      gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
      gl.clearBufferfv(gl.COLOR, 1, [0, 0, -1, 0]);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  killAll();

  let trails: [Layer, Layer] | null = null;
  let frame = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };
  let sim = { width: 1, height: 1 };

  const releaseTrails = () => {
    for (const layer of trails ?? []) {
      gl.deleteTexture(layer.texture);
      gl.deleteFramebuffer(layer.target);
    }
  };

  const clearTrails = () => {
    for (const layer of trails ?? []) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.target);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const resize: SwarmRenderer["resize"] = (width, height, ratio) => {
    frame = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    sim = { width: Math.max(1, Math.round(width * TRAIL_SCALE)), height: Math.max(1, Math.round(height * TRAIL_SCALE)) };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    releaseTrails();
    trails = [0, 1].map(() => {
      const texture = floatTexture(gl, sim.width, sim.height, true, true);
      const target = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return { texture, target };
    }) as [Layer, Layer];
    clearTrails();
  };

  const reset = () => {
    killAll();
    clearTrails();
  };

  const render: SwarmRenderer["render"] = (step, time) => {
    if (!trails) return;
    const seconds = Math.min(step.seconds, 1 / 30);
    gl.bindTexture(gl.TEXTURE_2D, pageTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, MAX_TEXTURE_PAGES, 1, gl.RGBA, gl.FLOAT, pages);
    gl.bindTexture(gl.TEXTURE_2D, linkTexture);
    const rows = Math.max(1, Math.min(MAX_TEXTURE_PAGES, step.pageCount));
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LINK_SLOTS, rows, gl.RGBA, gl.FLOAT, links, 0);
    gl.bindVertexArray(screen);

    if (seconds > 0) {
      // 1. Surfers step, reading the trail as it was.
      const [from, to] = agents;
      gl.bindFramebuffer(gl.FRAMEBUFFER, to.target);
      gl.viewport(0, 0, AGENT_SIDE, AGENT_SIDE);
      gl.useProgram(agentProgram);
      const textures: [string, WebGLTexture][] = [
        ["agentsA", from.a],
        ["agentsB", from.b],
        ["pages", pageTexture],
        ["links", linkTexture],
        ["trail", trails[0].texture],
      ];
      textures.forEach(([name, texture], unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(location(agentProgram, name), unit);
      });
      gl.uniform2f(location(agentProgram, "frame"), frame.width, frame.height);
      gl.uniform1f(location(agentProgram, "seconds"), seconds);
      gl.uniform1f(location(agentProgram, "time"), time);
      gl.uniform1f(location(agentProgram, "pageCount"), step.pageCount);
      gl.uniform1f(location(agentProgram, "damping"), step.damping);
      gl.uniform1f(location(agentProgram, "population"), step.population);
      gl.uniform1f(location(agentProgram, "parents"), step.parents);
      gl.uniform1f(location(agentProgram, "speed"), 95);
      gl.uniform1f(location(agentProgram, "stay"), 0.7);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      agents = [to, from];

      // 2. Trail diffuses and decays.
      const [trailFrom, trailTo] = trails;
      gl.bindFramebuffer(gl.FRAMEBUFFER, trailTo.target);
      gl.viewport(0, 0, sim.width, sim.height);
      gl.useProgram(trailProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, trailFrom.texture);
      gl.uniform1i(location(trailProgram, "trail"), 0);
      gl.uniform2f(location(trailProgram, "size"), sim.width, sim.height);
      gl.uniform1f(location(trailProgram, "decay"), Math.exp(-seconds / 1.2));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // 3. Every living surfer deposits where it is.
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(depositProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, agents[0].a);
      gl.uniform1i(location(depositProgram, "agentsA"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, agents[0].b);
      gl.uniform1i(location(depositProgram, "agentsB"), 1);
      gl.uniform2f(location(depositProgram, "frame"), frame.width, frame.height);
      gl.uniform1f(location(depositProgram, "pointSize"), 1.5);
      gl.uniform1f(location(depositProgram, "amount"), 0.016);
      gl.bindVertexArray(empty);
      gl.drawArrays(gl.POINTS, 0, Math.min(step.population, MAX_AGENTS));
      gl.disable(gl.BLEND);
      gl.bindVertexArray(screen);
      trails = [trailTo, trailFrom];
    }

    // 4. Composite.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.useProgram(compositeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, trails[0].texture);
    gl.uniform1i(location(compositeProgram, "trail"), 0);
    gl.uniform2f(location(compositeProgram, "size"), sim.width, sim.height);
    gl.uniform1f(location(compositeProgram, "gain"), 1.1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    releaseTrails();
    for (const program of programs) gl.deleteProgram(program);
    for (const set of agents) {
      gl.deleteTexture(set.a);
      gl.deleteTexture(set.b);
      gl.deleteFramebuffer(set.target);
    }
    gl.deleteTexture(pageTexture);
    gl.deleteTexture(linkTexture);
    gl.deleteBuffer(square);
    gl.deleteVertexArray(screen);
    gl.deleteVertexArray(empty);
  };

  return { pages, links, resize, reset, render, dispose };
}
