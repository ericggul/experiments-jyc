// The foam drawn from its own network (bubble/3). The material is bubble/1's
// (= 7-glsl-6's) soap film; the geometry is the model's: every wall on screen
// is a link of the model, every free face an arc of the bubble's own circle.
//
// One pass at device resolution. Each edge of each cell (wall or free-face
// arc) is an instance: a fan wedge from the cell's centroid to the edge's
// arc (SEGMENTS triangles), placed by the vertex shader from the cell and
// edge textures. Neighbouring cells share their vertices, so the wedges tile
// the raft with no overdraw; outside the raft nothing is drawn (black).
//
// Per pixel the fragment knows its cell and measures the exact distance to
// each of its arcs, rounded at the corners by the Plateau-border radius. The
// shading is bubble/1's FILM_FRAGMENT read closely: a nearly transparent film
// (near-black inside), light from the Fresnel rim of a shallow cap over the
// bubble's own disc (shading it from the walls instead made every short
// straight wall of a hub a facet), the film seen edge-on along walls and free
// faces with a soft glow along long walls, faint drainage bands tempered to
// grey (a little colour only where thick), one small window highlight (large
// bubbles only: in small ones it blinks) and its faint mirror. No grey fill.
//
// The network's transfers: the model keeps the gas flowing through every wall
// (von Neumann–Mullins, down the pressure difference). Each wall carrying
// enough of it sends a small portion of film-bounded gas through itself on its
// own period (2.6–5 s, from the pair), from the giver into the receiver,
// sized by the gas carried per period; it grows from nothing inside the giver,
// crosses the wall and shrinks into the receiver. Small, few-sided bubbles
// visibly feed their many-sided neighbours.
//
// Calm. Geometry moves < .5 px per frame (model tests). At a wall both
// cells fade to one shared edge-on colour, so the raster edge between them is
// never seen; at a free face the colour fades to black over a pixel and a
// half, so the raft's outline is anti-aliased by its own profile.

import { FREE, MAX_CELLS, MAX_SIDES, type Foam } from "./model.ts";
import { wallCurvature } from "./measure.ts";

const SEGMENTS = 6;
/** Cells per row of the cell texture (three texels each). */
const CELL_ROW = 128;
/** Edges per row of the edge texture (two texels each). */
const EDGE_ROW = 512;
const EDGE_ROWS = 64;
const MAX_EDGES = EDGE_ROW * EDGE_ROWS;
const MAX_INSTANCES = 40_000;
const NOISE_SIZE = 256;
const CELL_ROWS = Math.ceil(MAX_CELLS / CELL_ROW);
/** Plateau borders are at least this wide even in a dry foam (CSS px). */
const DRY_BORDER = 0.6;

const VERTEX = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
layout(location = 0) in vec4 wedge;    // per instance: 0, 0, cell, edge
layout(location = 1) in float ordinal; // per vertex: 0 to 3 * SEGMENTS - 1
// cells: per cell (centroid x, y, first edge, edges), (sqrt(area/pi), age, seed, 0), (site - centroid, disc radius, 0)
// edges: per edge (start vertex relative to the centroid, curvature, free), (portion centre, radius, 0)
uniform highp sampler2D cells;
uniform highp sampler2D edges;
uniform vec2 frame;
flat out int cell;

vec4 edgeAt(int index) {
  return texelFetch(edges, ivec2((index % ${EDGE_ROW}) * 2, index / ${EDGE_ROW}), 0);
}

// A point at t in [0, 1] along the arc from a to b with curvature k
// (positive: bulging out of the cell, which is wound counter-clockwise).
vec2 arcPoint(vec2 a, vec2 b, float k, float t) {
  vec2 chord = b - a;
  float span = length(chord);
  if (span < 1e-6) return a;
  vec2 dir = chord / span;
  vec2 outward = vec2(dir.y, -dir.x);
  float c = 0.5 * span;
  float x = span * (t - 0.5);
  float h = k * (c * c - x * x) / (sqrt(max(1.0 - k * k * x * x, 0.0)) + sqrt(max(1.0 - k * k * c * c, 0.0)) + 1e-9);
  return mix(a, b, t) + outward * h;
}

void main() {
  cell = int(wedge.z);
  int edge = int(wedge.w);
  vec4 data = texelFetch(cells, ivec2((cell % ${CELL_ROW}) * 3, cell / ${CELL_ROW}), 0);
  int start = int(data.z);
  int sides = int(data.w);
  vec4 a = edgeAt(start + edge);
  vec4 b = edgeAt(start + (edge + 1) % sides);
  int slot = int(ordinal + 0.5);
  int triangle = slot / 3;
  int corner = slot - triangle * 3;
  vec2 p = corner == 0 ? vec2(0.0) : arcPoint(a.xy, b.xy, a.z, float(triangle + corner - 1) / ${SEGMENTS}.0);
  vec2 clip = (data.xy + p) / frame * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
flat in int cell;
uniform vec2 frame;
uniform highp sampler2D cells;
uniform highp sampler2D edges;
uniform sampler2D noise;
uniform float border;        // Plateau-border radius, CSS px
uniform float cssPerPixel;
uniform float time;
out vec4 pixel;

vec4 edgeAt(int index) {
  return texelFetch(edges, ivec2((index % ${EDGE_ROW}) * 2, index / ${EDGE_ROW}), 0);
}
vec4 edgeMore(int index) {
  return texelFetch(edges, ivec2((index % ${EDGE_ROW}) * 2 + 1, index / ${EDGE_ROW}), 0);
}

// Distance from p to the arc a->b of curvature k, and its gradient (away from the arc).
vec3 arcDistance(vec2 p, vec2 a, vec2 b, float k) {
  vec2 chord = b - a;
  float span = length(chord);
  vec2 q;
  if (span < 1e-4 || abs(k) * span < 2e-3) {
    float t = clamp(dot(p - a, chord) / max(span * span, 1e-8), 0.0, 1.0);
    q = a + chord * t;
  } else {
    vec2 dir = chord / span;
    vec2 outward = vec2(dir.y, -dir.x);
    float radius = 1.0 / abs(k);
    float c = 0.5 * span;
    vec2 centre = 0.5 * (a + b) - outward * sign(k) * sqrt(max(radius * radius - c * c, 0.0));
    vec2 v = p - centre;
    vec2 va = a - centre;
    vec2 vb = b - centre;
    float turn = va.x * vb.y - va.y * vb.x;
    float s1 = va.x * v.y - va.y * v.x;
    float s2 = v.x * vb.y - v.y * vb.x;
    bool within = turn >= 0.0 ? (s1 >= 0.0 && s2 >= 0.0) : (s1 <= 0.0 && s2 <= 0.0);
    float lv = length(v);
    if (within && lv > 1e-5) q = centre + v * (radius / lv);
    else q = dot(p - a, p - a) < dot(p - b, p - b) ? a : b;
  }
  vec2 d = p - q;
  float len = length(d);
  return vec3(len, len > 1e-6 ? d / len : vec2(0.0));
}

// Reflectance of a soap film (n = 1.33) of thickness t (nm) at internal
// cosine c, per wavelength: two-beam interference with the half-wave shift
// at the front face, 2 sin^2(2 pi n t c / lambda).
vec3 interference(float t, float c) {
  vec3 phase = 6.2831853 * 1.33 * t * c / vec3(650.0, 532.0, 450.0);
  vec3 s = sin(phase);
  return 2.0 * s * s;
}

void main() {
  vec4 data = texelFetch(cells, ivec2((cell % ${CELL_ROW}) * 3, cell / ${CELL_ROW}), 0);
  vec4 more = texelFetch(cells, ivec2((cell % ${CELL_ROW}) * 3 + 1, cell / ${CELL_ROW}), 0);
  vec4 disc = texelFetch(cells, ivec2((cell % ${CELL_ROW}) * 3 + 2, cell / ${CELL_ROW}), 0);   // site relative to the centroid, radius
  int start = int(data.z);
  int sides = int(data.w);
  float size = max(more.x, 1.0);   // sqrt(area / pi), CSS px
  float age = more.y;
  float seed = more.z;
  float r = border;
  // The pixel's position, exactly (not interpolated across the wedge).
  vec2 local = vec2(gl_FragCoord.x, frame.y / cssPerPixel - gl_FragCoord.y) * cssPerPixel - data.xy;

  // Slow currents in the bubble's own frame (two lookups, uniform control
  // flow): large, soft folds only.
  vec2 q = local / size;
  vec2 base = q * 0.16 + vec2(seed * 37.0, seed * 91.0);
  vec4 current = texture(noise, base + time * vec2(0.0022, 0.0013));
  vec4 folded = texture(noise, base * 1.4 + (current.xy - 0.5) * 0.5 - time * vec2(0.0016, -0.0025));

  // Exact distances to the cell's arcs (rounded by the border radius), the
  // nearest free face on its own, and the portions crossing this cell's walls.
  float nearest = 1e6;
  vec2 nearestGradient = vec2(0.0);
  float sum = 0.0;
  vec2 gradient = vec2(0.0);
  float toFree = 1e6;
  float toVertex = 1e6;
  float portion = 1e6;      // signed distance to the nearest portion's outline (negative inside)
  vec2 portionCentre = vec2(0.0);
  float portionRadius = 0.0;
  vec4 first = edgeAt(start);
  vec4 a = first;
  for (int e = 0; e < ${MAX_SIDES}; e += 1) {
    if (e >= sides) break;
    vec4 b = e + 1 < sides ? edgeAt(start + e + 1) : first;
    bool isFree = a.w > 0.5;
    toVertex = min(toVertex, length(local - a.xy));
    // A lower bound on the distance to this arc: skip it when it cannot
    // change the nearest distance, the rounding or the nearest free face.
    vec2 chord = b.xy - a.xy;
    float c = 0.5 * length(chord);
    float bound = length(local - 0.5 * (a.xy + b.xy)) - c - abs(a.z) * c * c;
    if (bound < max(nearest, r) || (isFree && bound < toFree)) {
      vec3 d = arcDistance(local, a.xy, b.xy, a.z);
      if (d.x < nearest) {
        nearest = d.x;
        nearestGradient = d.yz;
      }
      float over = max(r - d.x, 0.0);
      sum += over * over;
      gradient += over * d.yz;
      if (isFree) toFree = min(toFree, d.x);
    }
    if (!isFree) {
      // The portion of gas crossing this wall now (placed on the CPU).
      vec4 m = edgeMore(start + e);
      if (m.z > 0.0) {
        float distance = length(local - m.xy) - m.z;
        if (distance < portion) {
          portion = distance;
          portionCentre = m.xy;
          portionRadius = m.z;
        }
      }
    }
    a = b;
  }
  float s;
  vec2 grad;
  if (sum > 0.0) {
    float root = sqrt(sum);
    s = r - root;
    grad = gradient / root;
  } else {
    s = nearest;
    grad = nearestGradient;
  }
  // Which way the edge faces comes from the bubble's own disc: its free
  // faces lie on that circle and its walls, radical lines of overlapping
  // discs, near it. Taking it from the nearest wall instead showed every
  // short straight wall of a hub as a facet.
  vec2 fromCentre = local - disc.xy;
  float radial = length(fromCentre);
  vec2 smoothGradient = radial > 1e-4 ? -fromCentre / radial : vec2(0.0);
  float edgeWidth = max(0.8, 1.5 * cssPerPixel);
  // Fade to black at the raft's outline, over a pixel and a half.
  float coverage = smoothstep(0.0, 1.5 * cssPerPixel + 0.25, toFree);
  float centreSize = size;
  vec2 own = q;
  // Inside a portion: it is a small bubble of its own.
  if (portion < 0.0) {
    s = -portion;
    grad = normalize(portionCentre - local + vec2(1e-5));
    centreSize = max(portionRadius, 1.0);
    own = (local - portionCentre) / centreSize;
    age = 0.0;
    smoothGradient = grad;
  } else {
    // The portion's outline is a boundary of the bubble around it.
    if (portion < s) {
      s = portion;
      grad = normalize(local - portionCentre + vec2(1e-5));
    }
  }

  // The film drains toward black at the top of each bubble and thickens
  // below; older bubbles drain further; slow currents fold it. Sparse bands:
  // the thickness spans about one and a half interference orders.
  // (A portion is shaded alike from both cells it straddles: no currents.)
  bool inPortion = portion < 0.0;
  vec2 warp = inPortion ? vec2(0.0) : (vec2(current.z, folded.x) - 0.5) * 0.6;
  float swirl = inPortion ? 0.5 : folded.z;
  float drain = smoothstep(-0.9, 0.95, own.y + 0.5 * (warp.y + warp.x));
  float aged = 0.6 + 0.4 * exp(-age / 40.0);
  // Small bubbles and portions are young, thick film: no black band
  // squeezed across them.
  float thinnest = inPortion ? 260.0 : mix(150.0, 20.0, smoothstep(10.0, 40.0, centreSize));
  float thickness = mix(thinnest, 400.0 * aged + (inPortion ? 250.0 : 0.0), drain * drain) * (0.8 + 0.4 * swirl);
  vec3 film = interference(thickness, 1.0);
  // Pale on dark ground: colour only where the film is thick.
  float grey = dot(film, vec3(0.3333));
  film = mix(vec3(grey), film, 0.35 * smoothstep(220.0, 400.0, thickness));

  // Light, as in bubble/1: almost none inside (the film is nearly
  // transparent on black); a thin Fresnel rim along every wall and free
  // face; the wall itself seen edge-on; one window, mirrored faintly. The
  // window's side comes from the bubble's own disc, its width from the
  // exact distance to the edge, so it hugs walls and faces without shading
  // the bubble as a ball.
  vec2 outward = -smoothGradient;
  vec2 light = normalize(vec2(-0.55, -0.7));
  float facingWindow = max(dot(outward, light), 0.0);
  float mirror = inPortion ? 1.0 : smoothstep(6.0, 40.0, centreSize);
  // Lines are crisp: a thin core with a short falloff (no halo), brighter at
  // junctions and where the edge faces the window, dimmer elsewhere.
  float junction = exp(-toVertex / (0.08 * centreSize + 2.0));
  float rimWidth = clamp(0.008 * centreSize, 0.45, 1.0) + 0.35 * cssPerPixel;
  float rim = exp(-max(s, 0.0) / rimWidth) * (0.35 + 0.65 * max(junction, pow(facingWindow, 2.0)));
  float windowWidth = clamp(0.02 * centreSize, 0.9, 2.6);
  float nearEdge = exp(-max(s, 0.0) / windowWidth);
  float windowLight = nearEdge * pow(facingWindow, 6.0) * mirror;
  float mirrored = nearEdge * pow(max(dot(outward, -light), 0.0), 8.0) * mirror * 0.2;
  // A portion is a small fresh bubble: thicker, brighter film, a point of
  // the window inside its upper left.
  float fresh = inPortion ? 0.14 : 0.065;
  float spot = inPortion ? exp(-dot(own + vec2(0.38, 0.45), own + vec2(0.38, 0.45)) / 0.05) * 0.5 : 0.0;
  vec3 colour = film * (fresh + 0.6 * rim) + vec3(0.9 * windowLight + mirrored + spot);
  // The wall seen edge-on: one shared colour from both bubbles (its
  // brightness from what both share: the junctions and the wall's own
  // direction), a thin line, never the raster edge.
  float wallFacing = abs(dot(nearestGradient, light));
  float lineGain = 0.45 + 0.35 * exp(-toVertex / 6.0) + 0.3 * wallFacing;
  float shared = exp(-max(s, 0.0) / (0.45 * edgeWidth));
  colour = mix(colour, vec3(0.34, 0.345, 0.355) * lineGain, shared * clamp((toFree - max(s, 0.0)) / edgeWidth, 0.0, 1.0));
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
      throw new Error(`bubble/3 shader: ${log}`);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`bubble/3 program: ${gl.getProgramInfoLog(program)}`);
  return program;
}

/** Four channels of tileable value noise (three octaves each), 0–255. */
export function noiseTexels(size = NOISE_SIZE, seed = 0x51ed27) {
  let state = seed >>> 0 || 1;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4_294_967_296;
  };
  const out = new Uint8Array(size * size * 4);
  for (let channel = 0; channel < 4; channel += 1) {
    const field = new Float32Array(size * size);
    let amplitude = 0.55;
    let norm = 0;
    for (let lattice = 8; lattice <= 32; lattice *= 2) {
      const grid = new Float32Array(lattice * lattice);
      for (let at = 0; at < grid.length; at += 1) grid[at] = random();
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const fx = (x / size) * lattice;
          const fy = (y / size) * lattice;
          const ix = Math.floor(fx);
          const iy = Math.floor(fy);
          let tx = fx - ix;
          let ty = fy - iy;
          tx = tx * tx * (3 - 2 * tx);
          ty = ty * ty * (3 - 2 * ty);
          const x1 = (ix + 1) % lattice;
          const y1 = (iy + 1) % lattice;
          const top = grid[iy * lattice + ix]! + (grid[iy * lattice + x1]! - grid[iy * lattice + ix]!) * tx;
          const bottom = grid[y1 * lattice + ix]! + (grid[y1 * lattice + x1]! - grid[y1 * lattice + ix]!) * tx;
          field[y * size + x] = field[y * size + x]! + amplitude * (top + (bottom - top) * ty);
        }
      }
      norm += amplitude;
      amplitude *= 0.5;
    }
    for (let at = 0; at < field.length; at += 1) out[at * 4 + channel] = Math.round((field[at]! / norm) * 255);
  }
  return out;
}


export type FoamRenderer = {
  resize(width: number, height: number, ratio: number): void;
  /** Draws the foam's current cells; `border` is the Plateau-border radius (CSS px). */
  render(foam: Foam, time: number, border: number): void;
  dispose(): void;
};

/** A stable value in [0, 1) per unordered pair of ids. */
function pairHash(a: number, b: number) {
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  const value = Math.sin(low * 12.9898 + high * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

/** Portion area (px²) per px²/s of gas through a wall, per second of its period. */
const PORTION_SCALE = 0.7;
/** Portions are drawn for about this many of the strongest flows at a time. */
const PORTIONS = 24;
/** Portion radius limits (px). */
const PORTION_RADIUS: readonly [number, number] = [4.5, 11];

/**
 * Where the portion of gas crossing wall `k` of cell `i` (to `j`) is now, in
 * i's frame. Only the strongest flows send portions (`threshold`, px²/s,
 * eased in over half again its value so none pops). Each wall sends one on
 * its own period (4.5–8 s, from the pair), sized by the gas it carries per
 * period: it buds inside the giver, travels across the wall and merges into
 * the receiver. Both cells compute the same point, so the portion is whole.
 */
function placePortion(foam: Foam, i: number, k: number, j: number, time: number, threshold: number, out: Float32Array, at: number) {
  const base = i * MAX_SIDES;
  const sides = foam.sides[i]!;
  const flux = foam.flux[base + k]!;
  const gas = Math.abs(flux);
  if (gas <= threshold) return;
  const hash = pairHash(foam.id[i]!, foam.id[j]!);
  const period = 4.5 + 3.5 * hash;
  const shifted = time / period + ((hash * 7.31) % 1);
  const phase = shifted - Math.floor(shifted);
  const ax = foam.vx[base + k]!;
  const ay = foam.vy[base + k]!;
  const next = base + ((k + 1) % sides);
  const bx = foam.vx[next]!;
  const by = foam.vy[next]!;
  const wall = Math.hypot(bx - ax, by - ay);
  if (wall < 1e-6) return;
  const smaller = Math.sqrt(Math.min(foam.area[i]!, foam.area[j]!) / Math.PI);
  const sized = Math.sqrt((gas * period * PORTION_SCALE) / Math.PI);
  const full = Math.min(Math.max(sized, PORTION_RADIUS[0]), PORTION_RADIUS[1], 0.45 * smaller, 0.5 * wall + 2);
  const ease = Math.min(1, (gas - threshold) / (0.5 * threshold + 1e-6));
  const fade = ease * ease * (3 - 2 * ease);
  const grown = full * Math.sin(Math.PI * phase) ** 0.5 * fade;
  if (grown <= 0.5) return;
  // The arc's midpoint and the chord's outward normal; the portion travels
  // from deep in the giver to deep in the receiver.
  const curvature = wallCurvature(foam, i, k);
  const c = 0.5 * wall;
  const sagitta = (curvature * c * c) / (1 + Math.sqrt(Math.max(0, 1 - curvature * curvature * c * c)));
  const nx = (by - ay) / wall;
  const ny = -(bx - ax) / wall;
  const reach = full + 0.3 * smaller;
  const travel = (2 * phase - 1) * reach * Math.sign(flux) + sagitta;
  out[at] = 0.5 * (ax + bx) + nx * travel;
  out[at + 1] = 0.5 * (ay + by) + ny * travel;
  out[at + 2] = grown;
}

export function createFoamRenderer(canvas: HTMLCanvasElement): FoamRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;
  const program = compile(gl, VERTEX, FRAGMENT);
  const location = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = {
    cells: location("cells"),
    edges: location("edges"),
    noise: location("noise"),
    frame: location("frame"),
    border: location("border"),
    cssPerPixel: location("cssPerPixel"),
    time: location("time"),
  };

  const instances = new Float32Array(MAX_INSTANCES * 4);
  const instanceBuffer = gl.createBuffer();
  const vertexBuffer = gl.createBuffer();
  const mesh = gl.createVertexArray();
  gl.bindVertexArray(mesh);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from({ length: 3 * SEGMENTS }, (_, index) => index), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, instances.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
  gl.vertexAttribDivisor(0, 1);
  gl.bindVertexArray(null);

  const dataTexture = (width: number, height: number) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
  };
  const cellTexture = dataTexture(CELL_ROW * 3, CELL_ROWS);
  const edgeTexture = dataTexture(EDGE_ROW * 2, EDGE_ROWS);
  const cellData = new Float32Array(CELL_ROW * 3 * CELL_ROWS * 4);
  const edgeData = new Float32Array(MAX_EDGES * 8);

  const noiseTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, NOISE_SIZE, NOISE_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseTexels());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);

  let frame = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };

  const resize: FoamRenderer["resize"] = (width, height, ratio) => {
    frame = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
  };

  // The flow a wall must carry to send portions, eased over about a second
  // toward the PORTIONS-th strongest flow.
  let threshold = 0;
  const flows: number[] = [];

  const render: FoamRenderer["render"] = (foam, time, border) => {
    flows.length = 0;
    for (let i = 0; i < foam.count; i += 1) {
      const base = i * MAX_SIDES;
      for (let k = 0; k < foam.sides[i]!; k += 1) if (foam.neighbour[base + k]! >= 0 && foam.flux[base + k]! > 0) flows.push(foam.flux[base + k]!);
    }
    flows.sort((a, b) => b - a);
    const wanted = flows.length > PORTIONS ? flows[PORTIONS]! : 0;
    threshold = threshold === 0 ? wanted : threshold + (wanted - threshold) * 0.02;
    let edgeCount = 0;
    let instanceCount = 0;
    const cellCount = Math.min(foam.count, MAX_CELLS);
    for (let i = 0; i < cellCount; i += 1) {
      const sides = foam.sides[i]!;
      const at = i * 12;
      if (sides < 3 || edgeCount + sides > MAX_EDGES || instanceCount + sides > MAX_INSTANCES) {
        cellData[at + 3] = 0;
        continue;
      }
      cellData[at] = foam.cx[i]!;
      cellData[at + 1] = foam.cy[i]!;
      cellData[at + 2] = edgeCount;
      cellData[at + 3] = sides;
      cellData[at + 4] = Math.sqrt(foam.area[i]! / Math.PI);
      cellData[at + 5] = foam.age[i]!;
      cellData[at + 6] = foam.seed[i]!;
      cellData[at + 7] = 0;
      cellData[at + 8] = foam.ox[i]!;
      cellData[at + 9] = foam.oy[i]!;
      cellData[at + 10] = foam.radius[i]!;
      cellData[at + 11] = 0;
      const base = i * MAX_SIDES;
      for (let k = 0; k < sides; k += 1) {
        const e = (edgeCount + k) * 8;
        const j = foam.neighbour[base + k]!;
        edgeData[e] = foam.vx[base + k]!;
        edgeData[e + 1] = foam.vy[base + k]!;
        edgeData[e + 2] = wallCurvature(foam, i, k);
        edgeData[e + 3] = j === FREE ? 1 : 0;
        edgeData[e + 4] = 0;
        edgeData[e + 5] = 0;
        edgeData[e + 6] = 0;
        edgeData[e + 7] = 0;
        if (j >= 0) placePortion(foam, i, k, j, time, threshold, edgeData, e + 4);
        const v = instanceCount * 4;
        instances[v] = 0;
        instances[v + 1] = 0;
        instances[v + 2] = i;
        instances[v + 3] = k;
        instanceCount += 1;
      }
      edgeCount += sides;
    }

    const cellRowsUsed = Math.max(1, Math.ceil(cellCount / CELL_ROW));
    gl.bindTexture(gl.TEXTURE_2D, cellTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, CELL_ROW * 3, cellRowsUsed, gl.RGBA, gl.FLOAT, cellData, 0);
    const edgeRowsUsed = Math.max(1, Math.ceil(edgeCount / EDGE_ROW));
    gl.bindTexture(gl.TEXTURE_2D, edgeTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, EDGE_ROW * 2, edgeRowsUsed, gl.RGBA, gl.FLOAT, edgeData, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, instances, 0, instanceCount * 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (instanceCount === 0) return;
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cellTexture);
    gl.uniform1i(uniforms.cells, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, edgeTexture);
    gl.uniform1i(uniforms.edges, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.uniform1i(uniforms.noise, 2);
    gl.uniform2f(uniforms.frame, frame.width, frame.height);
    gl.uniform1f(uniforms.border, Math.max(border, DRY_BORDER));
    gl.uniform1f(uniforms.cssPerPixel, frame.width / pixels.width);
    gl.uniform1f(uniforms.time, time);
    gl.bindVertexArray(mesh);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 3 * SEGMENTS, instanceCount);
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    gl.deleteTexture(cellTexture);
    gl.deleteTexture(edgeTexture);
    gl.deleteTexture(noiseTexture);
    gl.deleteBuffer(instanceBuffer);
    gl.deleteBuffer(vertexBuffer);
    gl.deleteVertexArray(mesh);
    gl.deleteProgram(program);
  };

  return { resize, render, dispose };
}
