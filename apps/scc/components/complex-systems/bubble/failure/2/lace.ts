// A wet foam raft seen from above, rendered the way a macro photograph sees
// foam. Each bubble presses into its neighbours (bubble i owns the points
// where f_i = |p − c_i|²/r_i − r_i is smallest), and its cell is that polygon
// with corners rounded at the Plateau-border radius, so the liquid between
// cells is a thin lamella along each wall and a concave triangle where three
// meet — by geometry, not by drawing. A height field (film domes over the
// cells, concave menisci in the liquid, a faint ripple on both) gives normals
// that reflect one room: a window with mullions, a soft ceiling, a dim lamp
// opposite. Films reflect from both faces with a faint pastel interference
// tint and pass the rest; the liquid reflects like water and passes the rest,
// bent. Only reflection and transmission: no glow, no drawn outline.
//
// Depth: a second, larger foam lies below, rendered first at half the CSS
// resolution and blurred through its mip chain; the raft's films show it
// through themselves, shifted by their slope, and its liquid bends it more.
// Four rotated-grid samples per device pixel keep the thin walls clean.

export const MAX_BUBBLES = 1_024;
/** Floats per bubble: x, y, radius (CSS px), seed. */
export const BUBBLE_FLOATS = 4;
const ROW = 64;
const SCALE = 0.5;

const SPLAT_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
uniform highp sampler2D bubbles;
uniform vec2 frame;
uniform float reach;
out vec2 local;
flat out vec4 disc;
void main() {
  int id = gl_InstanceID;
  vec4 b = texelFetch(bubbles, ivec2(id % ${ROW}, id / ${ROW}), 0);
  float extent = b.z + reach;
  local = (corner * 2.0 - 1.0) * extent;
  disc = vec4(b.xyz, float(id) + 1.0);
  vec2 clip = (b.xy + local) / frame * 2.0 - 1.0;
  gl_Position = b.z > 0.3 ? vec4(clip.x, -clip.y, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const SPLAT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in vec4 disc;
uniform float reach;
out vec4 result;
void main() {
  // The same ownership rule as the cells: smallest f = |p − c|² / r − r.
  if (length(local) - disc.z > reach) discard;
  float f = dot(local, local) / disc.z - disc.z;
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

const SHADE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform highp sampler2D owners;
uniform highp sampler2D bubbles;
uniform sampler2D below;      // the deeper foam, linear light, with mips
uniform vec2 frame;
uniform float pixel;          // one output pixel in CSS px
uniform float wet;            // Plateau-border radius (CSS px)
uniform float time;
uniform float deep;           // 1 when drawing the deeper foam itself
uniform float samples;        // 1 or 4
out vec4 pixelOut;

vec4 found[9];
int count = 0;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x), u.y);
}
// A faint ripple: the gradient of two octaves of slowly drifting noise.
vec2 ripple(vec2 p) {
  float e = 0.6;
  vec2 a = p;
  float n0 = noise(a) + 0.5 * noise(a * 2.3 + 7.1);
  float nx = noise(a + vec2(e, 0.0)) + 0.5 * noise((a + vec2(e, 0.0)) * 2.3 + 7.1);
  float ny = noise(a + vec2(0.0, e)) + 0.5 * noise((a + vec2(0.0, e)) * 2.3 + 7.1);
  return vec2(nx - n0, ny - n0) / e;
}

// The room, seen in a surface (d: reflected direction, y up, z toward the
// viewer): a window up and to the left with four panes in a dark frame, a
// soft ceiling, pale walls all round, a dim lamp low on the right.
float roundedRect(vec2 q, vec2 extent, float corner) {
  vec2 e = abs(q) - extent + corner;
  return length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - corner;
}
vec3 room(vec3 d) {
  vec3 light = vec3(0.0);
  vec3 centre = normalize(vec3(-0.42, 0.5, 0.76));
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), centre));
  vec3 up = cross(centre, right);
  float facing = dot(d, centre);
  if (facing > 0.0) {
    vec2 q = vec2(dot(d, right), dot(d, up)) / facing;
    // A large diffuser: soft-edged, brighter toward its top.
    float pane = 1.0 - smoothstep(-0.05, 0.05, roundedRect(q, vec2(0.3, 0.22), 0.12));
    float sky = 0.7 + 0.3 * smoothstep(-0.22, 0.22, q.y);
    light += vec3(1.0) * 4.5 * pane * sky;
  }
  light += vec3(0.16, 0.165, 0.18) * smoothstep(0.1, 0.9, d.y) * smoothstep(-0.2, 0.6, d.z);
  // The room's walls, pale and softly lit: steep surfaces (liquid, the edges
  // of each film) look sideways and see them.
  float horizon = 1.0 - smoothstep(0.08, 0.6, d.z);
  float wallLight = 0.55 + 0.35 * d.y + 0.1 * sin(atan(d.y, d.x) * 3.0);
  light += vec3(0.62, 0.64, 0.68) * horizon * wallLight;
  light += vec3(0.86) * 0.5 * pow(max(dot(d, normalize(vec3(0.62, -0.42, 0.66))), 0.0), 12.0);
  light += vec3(0.02, 0.021, 0.024);
  return light;
}

// Two-beam reflectance of a soap film at three wavelengths (for a faint tint).
vec3 interference(float h, float cosI) {
  float cosT = sqrt(max(1.0 - (1.0 - cosI * cosI) / 1.7689, 0.0));
  vec3 phase = 12.566371 * 1.33 * h * cosT / vec3(640.0, 540.0, 460.0);
  return 0.5 - 0.5 * cos(phase);
}

vec3 roundIntersect(vec3 a, vec3 b, float rho) {
  vec2 v = vec2(a.x + rho, b.x + rho);
  if (v.x > 0.0 && v.y > 0.0) {
    float l = length(v);
    return vec3(l - rho, (v.x * a.yz + v.y * b.yz) / l);
  }
  return a.x > b.x ? a : b;
}

// The owner's cell at p: (signed distance to its film edge, gradient).
vec3 cellAt(vec2 p, out vec4 owner) {
  float fa = 1e9;
  owner = found[0];
  for (int i = 0; i < 9; i += 1) {
    if (i >= count) break;
    vec2 v = p - found[i].xy;
    float f = dot(v, v) / found[i].z - found[i].z;
    if (f < fa) {
      fa = f;
      owner = found[i];
    }
  }
  vec2 ga = 2.0 * (p - owner.xy) / owner.z;
  vec2 fromCentre = p - owner.xy;
  float lc = max(length(fromCentre), 1e-4);
  vec3 first = vec3(lc - owner.z, fromCentre / lc);
  vec3 second = vec3(-1e5, 0.0, 0.0);
  for (int i = 0; i < 9; i += 1) {
    if (i >= count || found[i].w == owner.w) continue;
    vec2 v = p - found[i].xy;
    float fb = dot(v, v) / found[i].z - found[i].z;
    vec2 g = 2.0 * v / found[i].z - ga;
    float gl = max(length(g), 1e-4);
    vec3 wall = vec3(-(fb - fa) / gl, -g / gl);
    if (wall.x > first.x) {
      second = first;
      first = wall;
    } else if (wall.x > second.x) {
      second = wall;
    }
  }
  return roundIntersect(first, second, wet);
}

vec3 belowAt(vec2 p, float blur) {
  vec2 at = clamp(vec2(p.x, frame.y - p.y) / frame, vec2(0.0), vec2(1.0));
  return textureLod(below, at, blur).rgb;
}

vec3 shade(vec2 p) {
  vec4 owner;
  vec3 cell = cellAt(p, owner);
  float G = cell.x;
  vec2 grad = cell.yz;
  float seed = texelFetch(bubbles, ivec2(int(owner.w - 1.0) % ${ROW}, int(owner.w - 1.0) / ${ROW}), 0).w;
  float lamella = 0.45;
  bool isLiquid = G >= -lamella;
  vec2 slope2;
  if (!isLiquid) {
    float e = -G - lamella;
    // Each dome a little different: its height and a slight lean.
    float span = max((0.36 + 0.14 * seed) * owner.z, 2.0);
    float height = (0.22 + 0.14 * fract(seed * 7.3)) * owner.z;
    float u = min(e / span, 1.0);
    slope2 = grad * (height * 2.0 * (1.0 - u) / span);
    slope2 += (vec2(fract(seed * 13.1), fract(seed * 29.7)) - 0.5) * 0.12 * smoothstep(0.0, 1.0, u);
    slope2 += ripple((p - owner.xy) / max(owner.z * 0.5, 4.0) + seed * 17.0) * 0.012;
  } else {
    if (G > wet) return vec3(0.0);
    float q = G + lamella;
    float dq = clamp(wet - abs(q), 0.0, wet);
    float slope = dq / sqrt(max(wet * wet - dq * dq, 0.04 * wet * wet));
    slope2 = -grad * min(slope, 6.0) + ripple(p * 0.35) * 0.03;
  }
  vec3 n = normalize(vec3(slope2, 1.0));
  vec3 up = vec3(n.x, -n.y, n.z);
  float cosI = clamp(up.z, 0.0, 1.0);
  vec3 reflected = vec3(0.0, 0.0, -1.0) + 2.0 * cosI * up;
  float F = 0.02 + 0.98 * pow(1.0 - cosI, 5.0);
  vec3 colour;
  if (isLiquid) {
    // Water: Fresnel reflection; the foam below seen through it, bent.
    colour = room(reflected) * F;
    if (deep < 0.5) colour += belowAt(p + slope2 * 18.0, 4.2) * (1.0 - F) * 0.7;
  } else {
    // Film: two faces, a faint pastel tint from its thickness; the rest of
    // the light passes, so the foam below shows through, shifted by the slope.
    float film = 2.0 * F / (1.0 + F);
    vec2 q = (p - owner.xy) / owner.z;
    float h = 1100.0 + 500.0 * seed + 300.0 * q.y;
    vec3 tint = mix(vec3(1.0), 2.0 * interference(h, cosI), 0.05);
    colour = room(reflected) * film * tint;
    if (deep < 0.5) colour += belowAt(p + slope2 * 6.0, 3.6) * (1.0 - film) * 0.9;
  }
  return colour;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 p = vec2(uv.x, 1.0 - uv.y) * frame;
  ivec2 size = textureSize(owners, 0);
  ivec2 centre = ivec2(uv * vec2(size));
  for (int y = -1; y <= 1; y += 1) {
    for (int x = -1; x <= 1; x += 1) {
      vec4 c = texelFetch(owners, clamp(centre + ivec2(x, y), ivec2(0), size - 1), 0);
      if (c.w <= 0.0) continue;
      bool seen = false;
      for (int k = 0; k < 9; k += 1) {
        if (k >= count) break;
        if (found[k].w == c.w) seen = true;
      }
      if (seen) continue;
      found[count] = c;
      count += 1;
    }
  }
  vec3 colour = vec3(0.0);
  if (count > 0) {
    if (samples > 1.5) {
      vec2 offsets[4] = vec2[4](vec2(-0.125, -0.375), vec2(0.375, -0.125), vec2(0.125, 0.375), vec2(-0.375, 0.125));
      for (int s = 0; s < 4; s += 1) colour += shade(p + offsets[s] * pixel);
      colour *= 0.25;
    } else {
      colour = shade(p);
    }
  }
  if (deep > 0.5) {
    // The deeper foam stays in linear light, dimmer: it is further away.
    pixelOut = vec4(colour * 0.5, 1.0);
    return;
  }
  // Exposed as a photograph of foam would be: the window close to white.
  vec3 mapped = aces(colour * 2.4);
  pixelOut = vec4(mix(mapped * 12.92, 1.055 * pow(mapped, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, mapped)), 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`bubble/2 shader: ${gl.getShaderInfoLog(shader)}`);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`bubble/2 program: ${gl.getProgramInfoLog(program)}`);
  return program;
}

type Layer = {
  readonly bubbles: Float32Array;
  readonly data: WebGLTexture;
  readonly owners: WebGLTexture;
  readonly ownerTarget: WebGLFramebuffer;
  readonly depth: WebGLRenderbuffer;
};

export type LaceRenderer = {
  /** The raft. */
  readonly bubbles: Float32Array;
  /** The deeper foam, seen through the raft. */
  readonly below: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  render(bubbleCount: number, belowCount: number, time: number, wet: number): void;
  dispose(): void;
};

export function createLaceRenderer(canvas: HTMLCanvasElement): LaceRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;
  const splat = compile(gl, SPLAT_VERTEX, SPLAT_FRAGMENT);
  const shadeProgram = compile(gl, SCREEN_VERTEX, SHADE_FRAGMENT);
  const location = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);

  const square = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const mesh = gl.createVertexArray();
  gl.bindVertexArray(mesh);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const texture = (internal: number, width: number, height: number, type: number, minFilter: number, magFilter: number) => {
    const created = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, created);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return created;
  };
  const layer = (): Layer => ({
    bubbles: new Float32Array(MAX_BUBBLES * BUBBLE_FLOATS),
    data: texture(gl.RGBA32F, ROW, MAX_BUBBLES / ROW, gl.FLOAT, gl.NEAREST, gl.NEAREST),
    owners: texture(gl.RGBA32F, 1, 1, gl.FLOAT, gl.NEAREST, gl.NEAREST),
    ownerTarget: gl.createFramebuffer(),
    depth: gl.createRenderbuffer(),
  });
  const raft = layer();
  const deep = layer();
  let belowTexture = texture(gl.RGBA16F, 1, 1, gl.HALF_FLOAT, gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR);
  const belowTarget = gl.createFramebuffer();
  let frame = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };
  let sim = { width: 1, height: 1 };

  const resize: LaceRenderer["resize"] = (width, height, ratio) => {
    frame = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    sim = { width: Math.max(1, Math.round(width * SCALE)), height: Math.max(1, Math.round(height * SCALE)) };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    for (const target of [raft, deep]) {
      gl.bindTexture(gl.TEXTURE_2D, target.owners);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, sim.width, sim.height, 0, gl.RGBA, gl.FLOAT, null);
      gl.bindRenderbuffer(gl.RENDERBUFFER, target.depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, sim.width, sim.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.ownerTarget);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.owners, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, target.depth);
    }
    gl.deleteTexture(belowTexture);
    belowTexture = texture(gl.RGBA16F, sim.width, sim.height, gl.HALF_FLOAT, gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, belowTarget);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, belowTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const ownersPass = (target: Layer, count: number, wet: number) => {
    gl.bindTexture(gl.TEXTURE_2D, target.data);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW, Math.max(1, Math.ceil(count / ROW)), gl.RGBA, gl.FLOAT, target.bubbles, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.ownerTarget);
    gl.viewport(0, 0, sim.width, sim.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (count === 0) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.useProgram(splat);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target.data);
    gl.uniform1i(location(splat, "bubbles"), 0);
    gl.uniform2f(location(splat, "frame"), frame.width, frame.height);
    gl.uniform1f(location(splat, "reach"), wet * 3 + 4);
    gl.bindVertexArray(mesh);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.disable(gl.DEPTH_TEST);
  };

  const shadePass = (target: Layer, output: WebGLFramebuffer | null, width: number, height: number, isDeep: boolean, time: number, wet: number) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, output);
    gl.viewport(0, 0, width, height);
    gl.useProgram(shadeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target.owners);
    gl.uniform1i(location(shadeProgram, "owners"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, target.data);
    gl.uniform1i(location(shadeProgram, "bubbles"), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, isDeep ? null : belowTexture);
    gl.uniform1i(location(shadeProgram, "below"), 2);
    gl.uniform2f(location(shadeProgram, "frame"), frame.width, frame.height);
    gl.uniform1f(location(shadeProgram, "pixel"), frame.width / width);
    gl.uniform1f(location(shadeProgram, "wet"), wet);
    gl.uniform1f(location(shadeProgram, "time"), time);
    gl.uniform1f(location(shadeProgram, "deep"), isDeep ? 1 : 0);
    gl.uniform1f(location(shadeProgram, "samples"), isDeep ? 1 : 4);
    gl.bindVertexArray(mesh);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const render: LaceRenderer["render"] = (bubbleCount, belowCount, time, wet) => {
    const count = Math.min(bubbleCount, MAX_BUBBLES);
    const deepCount = Math.min(belowCount, MAX_BUBBLES);
    // The deeper foam: its owners, its light at half resolution, then blurred by its mips.
    ownersPass(deep, deepCount, wet * 1.6);
    shadePass(deep, belowTarget, sim.width, sim.height, true, time, wet * 1.6);
    gl.bindTexture(gl.TEXTURE_2D, belowTexture);
    gl.generateMipmap(gl.TEXTURE_2D);
    // The raft over it.
    ownersPass(raft, count, wet);
    shadePass(raft, null, pixels.width, pixels.height, false, time, wet);
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    gl.deleteProgram(splat);
    gl.deleteProgram(shadeProgram);
    for (const target of [raft, deep]) {
      gl.deleteTexture(target.data);
      gl.deleteTexture(target.owners);
      gl.deleteFramebuffer(target.ownerTarget);
      gl.deleteRenderbuffer(target.depth);
    }
    gl.deleteTexture(belowTexture);
    gl.deleteFramebuffer(belowTarget);
    gl.deleteBuffer(square);
    gl.deleteVertexArray(mesh);
  };

  return { bubbles: raft.bubbles, below: deep.bubbles, resize, render, dispose };
}
