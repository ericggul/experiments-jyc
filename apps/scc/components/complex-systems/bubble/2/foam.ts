// Copied from bubble/1 (2026-10-08). The same renderer, with its main visual
// constants opened as uniforms (`Look`); the defaults reproduce bubble/1 exactly.
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
/** Bubble data and neighbour lists are kept in textures this many bubbles wide. */
const ROW = 128;
/** Each bubble lists up to this many neighbours it overlaps (4 per texel), most deeply pressed first. */
const NEIGHBOUR_TEXELS = 4;
const NEIGHBOURS = NEIGHBOUR_TEXELS * 4;
/**
 * A bubble is drawn this far (CSS px) past its own radius: enough for its
 * anti-aliased edge (walls come from the neighbour lists, not from here).
 */
const MARGIN = 2;

const SPLAT_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 bubble;  // x, y, radius, seed
uniform vec2 frame;
out vec2 local;
flat out vec4 disc;
void main() {
  float extent = bubble.z + ${MARGIN}.0;
  local = (corner * 2.0 - 1.0) * extent;
  // Its index (from 1) travels with it, so the film can look up its data.
  disc = vec4(bubble.xyz, float(gl_InstanceID) + 1.0);
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
uniform float cssPerPixel;            // one device pixel, in CSS px
uniform float filmThickness;          // thickest film, nm (bubble/1: 900)
uniform float colourAmount;           // share of interference colour kept (bubble/1: .3)
uniform float flowSpeed;              // pace of the film's currents (bubble/1: 1)
uniform float swirl;                  // strength of the folding currents (bubble/1: 1)
uniform float domeDepth;              // cap depth as a share of the radius (bubble/1: .45)
uniform float fresnelGain;            // light at grazing angles (bubble/1: .9)
uniform float wallGain;               // light where a wall is seen edge-on (bubble/1: .45)
uniform float windowGain;             // the window's reflection (bubble/1: .85)
uniform float ambient;                // light everywhere on the film (bubble/1: .07)
uniform float exposure;               // overall (bubble/1: 1)
uniform float envMode;                // what the films reflect: 0 window (bubble/1), 1 overcast sky, 2 studio, 3 city at night, 4 dappled leaves, 5 water light, 6 an image
uniform vec3 lightColour;             // colour of the light the films reflect (bubble/1: white)
uniform vec3 filmTint;                // colour of the film itself (bubble/1: white)
uniform vec3 background;              // what lies behind the raft (bubble/1: black)
uniform float sphere;                 // 0: /1's shallow cap; 1: a full sphere that holds the whole surroundings
uniform float reflectionTint;         // 0: reflection laid over the film; 1: reflection coloured by the film's interference
uniform float envContrast;            // 0: soft surroundings; 1: crisp, high-range surroundings
uniform float backReflection;         // the far inside face mirroring the surroundings, inverted
uniform sampler2D envImage;           // an image to reflect (envMode 6), as a panorama
uniform highp sampler2D bubbleData;   // per bubble: x, y, radius, seed
uniform highp sampler2D neighbours;   // per bubble: indices (from 1) of the bubbles it overlaps
out vec4 pixel;

vec4 bubbleAt(float index) {
  int i = int(index) - 1;
  return texelFetch(bubbleData, ivec2(i % ${ROW}, i / ${ROW}), 0);
}

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
// Two octaves: enough for the slow currents that fold the film.
float fbm2(vec3 x) {
  return 0.5 * noise(x) + 0.25 * noise(x * 2.03 + vec3(1.7, 9.2, 3.1));
}
float fbm(vec3 x) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i += 1) {
    sum += amplitude * noise(x);
    x = x * 2.03 + vec3(1.7, 9.2, 3.1);
    amplitude *= 0.5;
  }
  return sum;
}

// What the films reflect, by direction (screen y runs down, so up is −y).
// envContrast narrows every soft edge and widens the range of light, so the
// surroundings read as crisp, bright shapes on dark rather than haze.
vec3 surroundings(vec3 r) {
  float up = -r.y;
  float azimuth = atan(r.x, r.z);
  float soft = mix(1.0, 0.12, envContrast);
  vec3 light;
  if (envMode < 1.5) {
    // Overcast sky: bright above, a pale horizon, soft cloud.
    float cloud = fbm(vec3(azimuth * 1.6, up * 3.0, time * 0.01));
    float sky = smoothstep(-0.1 - 0.15 * soft, -0.1 + 1.0 * soft, up);
    light = vec3(0.12) * (1.0 - envContrast) + vec3(0.9) * sky * (0.75 + 0.5 * cloud);
  } else if (envMode < 2.5) {
    // Studio: two large soft boxes left and right, a dark floor.
    float left = 1.0 - smoothstep(0.3 - 0.1 * soft, 0.3 + 0.05 * soft, max(abs(azimuth + 0.9) * 1.0, abs(up - 0.35) * 1.4));
    float right = 1.0 - smoothstep(0.22 - 0.1 * soft, 0.22 + 0.05 * soft, max(abs(azimuth - 1.1) * 1.6, abs(up - 0.2)));
    light = vec3(0.02) * (1.0 - envContrast) + vec3(2.2) * left + vec3(1.1) * right;
  } else if (envMode < 3.5) {
    // City at night: scattered lights, out of focus unless sharpened.
    vec2 cell = vec2(azimuth * 9.0, up * 9.0);
    vec2 id = floor(cell);
    vec2 at = fract(cell) - 0.5 - (vec2(hash(vec3(id, 1.0)), hash(vec3(id, 2.0))) - 0.5) * 0.6;
    float size = mix(0.22, 0.08, envContrast);
    float lamp = step(0.62, hash(vec3(id, 3.0))) * (1.0 - smoothstep(size * (1.0 - 0.8 * soft), size, length(at)));
    vec3 hue = mix(vec3(1.0, 0.78, 0.5), vec3(0.75, 0.85, 1.0), hash(vec3(id, 4.0)));
    light = vec3(0.01) + hue * lamp * 2.2 * smoothstep(-0.6, 0.2, up);
  } else if (envMode < 4.5) {
    // Dappled light through leaves.
    float leaves = fbm(vec3(azimuth * 2.5, up * 4.0, time * 0.03));
    light = vec3(1.4) * smoothstep(0.52 - 0.1 * soft, 0.52 + 0.1 * soft, leaves) * smoothstep(-0.3, 0.5, up) + vec3(0.04) * (1.0 - envContrast);
  } else if (envMode < 5.5) {
    // Water light: a slowly shifting web of caustics.
    float a = noise(vec3(azimuth * 4.0, up * 6.0, time * 0.08));
    float b = noise(vec3(azimuth * 7.0 + 3.1, up * 11.0, time * 0.06));
    float web = pow(max(1.0 - abs(a - b) * 2.0, 0.0), mix(6.0, 18.0, envContrast));
    light = vec3(0.03) * (1.0 - envContrast) + vec3(1.6) * web;
  } else {
    // An image, wrapped round as a panorama. The derivatives are taken across
    // the seam without its jump, and scaled down to sample it sharper.
    vec2 uvImage = vec2(azimuth / 6.2831853 + 0.5, clamp(0.5 - up * 0.5, 0.0, 1.0));
    vec2 dx = dFdx(uvImage);
    vec2 dy = dFdy(uvImage);
    dx.x -= round(dx.x);
    dy.x -= round(dy.x);
    light = textureGrad(envImage, uvImage, dx * soft, dy * soft).rgb * 1.4;
  }
  // A wider range: highlights climb, shadows sink.
  return pow(light, vec3(1.0 + 1.2 * envContrast)) * (1.0 + 4.0 * envContrast);
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
  // The passes are per texel at a coarser grid; gather every bubble they
  // found around this pixel and decide exactly here, so walls fall where the
  // geometry puts them, not on the texel grid.
  ivec2 centre = ivec2(uv * vec2(textureSize(first, 0)));
  ivec2 limit = textureSize(first, 0) - 1;
  vec4 found[18];
  int count = 0;
  // Nearest bubbles first: where none lies around, this is open ground and
  // the second layer is never read.
  for (int layer = 0; layer < 2; layer += 1) {
    if (layer == 1 && count == 0) break;
    for (int y = -1; y <= 1; y += 1) {
      for (int x = -1; x <= 1; x += 1) {
        ivec2 at = clamp(centre + ivec2(x, y), ivec2(0), limit);
        vec4 c = layer == 0 ? texelFetch(first, at, 0) : texelFetch(second, at, 0);
        // Repeats are harmless (they give the same distances), so they are
        // kept rather than searched for.
        if (c.z <= 0.0) continue;
        found[count] = c;
        count += 1;
      }
    }
  }
  // Open ground: nothing to compute.
  if (count == 0) {
    pixel = vec4(background, 1.0);
    return;
  }
  vec4 a = vec4(0.0);
  float fa = 1e9;
  for (int i = 0; i < 18; i += 1) {
    if (i >= count) break;
    float f = own(found[i], p);
    if (f < fa) {
      fa = f;
      a = found[i];
    }
  }
  // Distances in px, each from f's own gradient: to the free face (f = 0)
  // and to the nearest wall with any neighbour that overlaps here. Taking
  // the nearest over all neighbours keeps the surface whole where the
  // second-nearest bubble changes.
  vec2 da = p - a.xy;
  float rho = max(length(da), 1e-3);
  float slopeA = max(2.0 * rho / max(a.z, 1e-3), 1e-3);
  float toFace = -fa / slopeA;
  // The distance's gradient, exactly (toFace = (r² − ρ²) / 2ρ), and for the
  // nearest wall that of the wall distance.
  vec2 edgeGradient = -(a.z * a.z + rho * rho) / (2.0 * rho * rho) * (da / rho);
  // The nearest wall over every bubble this one overlaps — the same list for
  // all of its pixels, so the surface never changes with the texel grid.
  float toWall = 1e4;
  vec2 wallGradient = vec2(0.0);
  int self = int(a.w) - 1;
  for (int t = 0; t < ${NEIGHBOUR_TEXELS}; t += 1) {
    vec4 ids = texelFetch(neighbours, ivec2((self % ${ROW}) * ${NEIGHBOUR_TEXELS} + t, self / ${ROW}), 0);
    for (int k = 0; k < 4; k += 1) {
    float id = ids[k];
    if (id <= 0.0) continue;
    vec4 c = bubbleAt(id);
    float fc = own(c, p);
    if (fc >= 0.0) continue;
    vec2 dc = p - c.xy;
    vec2 gradient = 2.0 * da / a.z - 2.0 * dc / c.z;
    float g = max(length(gradient), 1e-3);
    float candidate = (fc - fa) / g;
    if (candidate < toWall) {
      toWall = candidate;
      wallGradient = -gradient / g;
    }
    }
  }
  float toEdge = min(toFace, toWall);
  if (toWall < toFace) edgeGradient = wallGradient;
  float coverage = a.z > 0.0 ? smoothstep(-0.7, 0.7, toFace) : 0.0;

  // A shallow cap over the cell: steep at the edge, nearly level inside.
  float r = a.z;
  float rise = clamp(toEdge / (domeDepth * r + 2.0), 0.0, 1.0);
  float h = sqrt(max(1.0 - (1.0 - rise) * (1.0 - rise), 0.0));
  // The same slope the screen-space difference of h over one device pixel
  // gave, (dh/dx, dh/dy) · pixel · depth, now from h's exact gradient at this
  // pixel, so it no longer steps in 2 × 2 blocks. Where h leaves the edge
  // vertically, it is held to what one pixel's difference could reach.
  float depth = domeDepth * r + 2.0;
  float e = cssPerPixel;
  vec2 slope = rise > 0.0 && rise < 1.0 ? e * (1.0 - rise) / max(h, 1e-3) * edgeGradient : vec2(0.0);
  float reach = depth * sqrt(min(1.0, 2.0 * e / depth));
  slope = slope / max(1.0, length(slope) / reach);
  vec3 normal = normalize(vec3(-slope, max(h, 0.05) + 0.6));
  if (sphere > 0.0) {
    // A sphere over the bubble's own disc, held to the cap within a few
    // pixels of a wall so neighbours still meet along their shared wall.
    vec2 out2 = da / max(r, 1e-3);
    vec3 round3 = vec3(out2, sqrt(max(1.0 - dot(out2, out2), 0.0)) + 0.02);
    float atWall = toWall < toFace ? exp(-toWall / 3.0) : 0.0;
    normal = normalize(mix(normal, normalize(round3), sphere * (1.0 - atWall)));
  }
  float facing = clamp(normal.z, 0.0, 1.0);

  // The film drains: towards black film at the top of each bubble, thicker
  // below, and the drainage is carried round in slow, folding currents, so
  // no two bubbles and no two moments share a pattern.
  vec2 q = da / r;
  float flowTime = time * flowSpeed;
  float seed = bubbleAt(a.w).w * 37.0;
  vec3 at = vec3(q * 1.3 + seed, flowTime * 0.06 + seed);
  vec2 warp = (vec2(fbm2(at), fbm2(at + vec3(5.2, 1.3, 2.7))) - 0.375) * (0.9375 / 0.75);
  vec3 folded = vec3(q * 1.7 + warp * 3.2 * swirl + seed, flowTime * 0.045 + seed);
  vec2 warp2 = (vec2(fbm2(folded), fbm2(folded + vec3(3.1, 7.7, 1.9))) - 0.375) * (0.9375 / 0.75);
  float swirl = fbm(vec3(q * 2.0 + warp2 * 2.6 * swirl + seed, flowTime * 0.04));
  float drain = smoothstep(-0.95, 0.9, q.y + 0.55 * (warp.y + warp2.x));
  float thickness = mix(20.0, filmThickness, drain * drain) * (0.4 + 1.2 * swirl);
  float inner = sqrt(max(1.0 - (1.0 - facing * facing) / (1.33 * 1.33), 0.0));
  vec3 film = interference(thickness, inner);
  // Real films are pale on dark ground: most of the colour is tempered,
  // and only thick, swirling film keeps a little of it.
  float grey = dot(film, vec3(0.3333));
  film = mix(vec3(grey), film, colourAmount * smoothstep(150.0, 500.0, thickness));

  // Fresnel weight and a soft window, mirrored faintly by the back face.
  vec3 view = vec3(0.0, 0.0, 1.0);
  float fresnel = 0.05 + 0.95 * pow(1.0 - facing, 5.0);
  vec3 window = normalize(vec3(-0.45, 0.6, 0.66));
  float front = pow(max(dot(normal, normalize(window + view)), 0.0), 90.0);
  vec3 mirrored = normalize(vec3(0.45, -0.6, 0.66));
  float back = pow(max(dot(normal, normalize(mirrored + view)), 0.0), 60.0) * 0.25;
  // Seen edge-on, at a wall or the free face, the film catches more light.
  float edgeOn = exp(-toEdge / 1.4);

  vec3 body = film * filmTint * lightColour * (ambient + fresnelGain * fresnel + wallGain * edgeOn);
  vec3 colour;
  if (envMode < 0.5) {
    // bubble/1: one soft window and its faint mirror.
    colour = body + lightColour * (front * windowGain + back);
  } else {
    // Any other surroundings, reflected by the film's own curvature.
    vec3 reflected = normalize(2.0 * normal.z * normal - view);
    float weight = 0.06 + 0.94 * pow(1.0 - facing, 3.0);
    vec3 tint = mix(vec3(1.0), film * filmTint, reflectionTint);
    vec3 seen = surroundings(reflected) * weight;
    if (backReflection > 0.0) {
      // The far face, seen through the near one, mirrors the scene upside down and faintly.
      seen += surroundings(normalize(vec3(-reflected.xy, reflected.z))) * (0.04 + 0.3 * pow(1.0 - facing, 2.0)) * backReflection;
    }
    colour = body + seen * tint * lightColour * windowGain * 1.6;
    // Highlights roll off instead of clipping when the range is widened.
    colour = mix(colour, 1.0 - exp(-colour * 1.3), envContrast);
  }
  // The films are clear: what lies behind shows through them.
  pixel = vec4(background * (1.0 - 0.12 * coverage) + colour * coverage * exposure, 1.0);
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
      throw new Error(`bubble/2 shader: ${log}`);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`bubble/2 program: ${gl.getProgramInfoLog(program)}`);
  return program;
}

export type Colour = readonly [number, number, number];

/** The renderer's main visual parameters; LOOK_DEFAULTS reproduce bubble/1. */
export type Look = {
  /** 0 window (bubble/1), 1 overcast sky, 2 studio, 3 city at night, 4 dappled leaves, 5 water light, 6 an uploaded image. */
  envMode: number;
  lightColour: Colour;
  filmTint: Colour;
  background: Colour;
  sphere: number;
  reflectionTint: number;
  envContrast: number;
  backReflection: number;
  filmThickness: number;
  colourAmount: number;
  flowSpeed: number;
  swirl: number;
  domeDepth: number;
  fresnelGain: number;
  wallGain: number;
  windowGain: number;
  ambient: number;
  exposure: number;
};

export const LOOK_DEFAULTS: Look = {
  envMode: 0,
  lightColour: [1, 1, 1],
  filmTint: [1, 1, 1],
  background: [0, 0, 0],
  sphere: 0,
  reflectionTint: 0,
  envContrast: 0,
  backReflection: 0,
  filmThickness: 900,
  colourAmount: 0.3,
  flowSpeed: 1,
  swirl: 1,
  domeDepth: 0.45,
  fresnelGain: 0.9,
  wallGain: 0.45,
  windowGain: 0.85,
  ambient: 0.07,
  exposure: 1,
};

export type FoamRenderer = {
  /** Per bubble: x y radius seed (CSS px; seed in [0, 1)). */
  readonly bubbles: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  render(bubbleCount: number, time: number, look?: Look): void;
  /** An image the films reflect when envMode is 6. */
  setEnvironmentImage(image: TexImageSource): void;
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

  const dataTexture = (width: number, height: number) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
  };
  const bubbleData = dataTexture(ROW, MAX_BUBBLES / ROW);
  const neighbourData = dataTexture(ROW * NEIGHBOUR_TEXELS, MAX_BUBBLES / ROW);
  // The image the films reflect in envMode 6 (a grey placeholder until one is given).
  const environment = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, environment);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([90, 90, 90, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  const neighbourIds = new Float32Array(MAX_BUBBLES * NEIGHBOURS);
  const neighbourDepths = new Float32Array(MAX_BUBBLES * NEIGHBOURS);
  // Bubbles sorted by their left edge, reused between frames.
  const order = new Int32Array(MAX_BUBBLES);
  const lefts = new Float32Array(MAX_BUBBLES);

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

  const render: FoamRenderer["render"] = (bubbleCount, time, look = LOOK_DEFAULTS) => {
    const count = Math.min(bubbleCount, MAX_BUBBLES);
    gl.bindBuffer(gl.ARRAY_BUFFER, bubbleBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, bubbles, 0, count * BUBBLE_FLOATS);
    // Per bubble, the bubbles it overlaps (sweep and prune along x), most
    // deeply pressed first.
    const rows = Math.max(1, Math.ceil(count / ROW));
    neighbourIds.fill(0, 0, rows * ROW * NEIGHBOURS);
    neighbourDepths.fill(0, 0, count * NEIGHBOURS);
    // Kept in place: a bubble's slots hold its deepest overlaps so far.
    const keep = (index: number, other: number, depth: number) => {
      const base = index * NEIGHBOURS;
      let slot = -1;
      let shallowest = Infinity;
      for (let at = 0; at < NEIGHBOURS; at += 1) {
        if (neighbourIds[base + at] === 0) {
          slot = at;
          break;
        }
        if (neighbourDepths[base + at]! < shallowest) {
          shallowest = neighbourDepths[base + at]!;
          slot = at;
        }
      }
      if (neighbourIds[base + slot] !== 0 && depth <= shallowest) return;
      neighbourIds[base + slot] = other + 1;
      neighbourDepths[base + slot] = depth;
    };
    for (let index = 0; index < count; index += 1) {
      order[index] = index;
      lefts[index] = bubbles[index * 4]! - bubbles[index * 4 + 2]!;
    }
    const sorted = order.subarray(0, count).sort((a, b) => lefts[a]! - lefts[b]!);
    for (let at = 0; at < count; at += 1) {
      const a = sorted[at]!;
      const ax = bubbles[a * 4]!;
      const ay = bubbles[a * 4 + 1]!;
      const ar = bubbles[a * 4 + 2]!;
      for (let next = at + 1; next < count; next += 1) {
        const b = sorted[next]!;
        const br = bubbles[b * 4 + 2]!;
        if (bubbles[b * 4]! - br > ax + ar) break;
        const dx = bubbles[b * 4]! - ax;
        const dy = bubbles[b * 4 + 1]! - ay;
        const reach = ar + br;
        if (Math.abs(dy) >= reach || dx * dx + dy * dy >= reach * reach) continue;
        const depth = reach - Math.hypot(dx, dy);
        keep(a, b, depth);
        keep(b, a, depth);
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, bubbleData);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW, rows, gl.RGBA, gl.FLOAT, bubbles, 0);
    gl.bindTexture(gl.TEXTURE_2D, neighbourData);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW * NEIGHBOUR_TEXELS, rows, gl.RGBA, gl.FLOAT, neighbourIds, 0);
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
    gl.uniform1f(location(filmProgram, "cssPerPixel"), frame.width / pixels.width);
    for (const [name, value] of Object.entries(look)) {
      if (typeof value === "number") gl.uniform1f(location(filmProgram, name), value);
      else gl.uniform3f(location(filmProgram, name), value[0], value[1], value[2]);
    }
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, environment);
    gl.uniform1i(location(filmProgram, "envImage"), 4);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, bubbleData);
    gl.uniform1i(location(filmProgram, "bubbleData"), 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, neighbourData);
    gl.uniform1i(location(filmProgram, "neighbours"), 3);
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const setEnvironmentImage: FoamRenderer["setEnvironmentImage"] = (image) => {
    gl.bindTexture(gl.TEXTURE_2D, environment);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
  };

  const dispose = () => {
    gl.deleteTexture(environment);
    gl.deleteTexture(bubbleData);
    gl.deleteTexture(neighbourData);
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

  return { bubbles, resize, render, setEnvironmentImage, dispose };
}
