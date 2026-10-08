// Evolved from bubble/1's foam.ts (= 7-glsl-6), standalone.
//
// A circle packing rendered as a raft of soap bubbles. Bubble i owns the
// points where
//   f_i(p) = (|p − c_i|² − r_i²) / r_i
// is smallest, up to its free face f_i = K r_i + C. With r_i the packing
// radius, both f of two tangent circles vanish at their contact, so every
// wall passes through a contact; and |∇f_a − ∇f_b| = 4 wherever f_a = f_b,
// so walls meet at 120° (Plateau). The walls are the links.
//
// Passes per frame (round 2: the expensive per-pixel searches moved to a
// half-resolution field computed once):
// 1. ownership (½ CSS): every bubble splats a disc with depth f; the
//    nearest bubble's id stays.
// 2. field (½ CSS, two targets): per texel the exact owner (corrected
//    through its wall list), its two nearest walls with their film and
//    flux, and the distance to its nearest edge (wall or free face).
// 3. stream (⅓ CSS): a stream function inside each cell, zero at its walls
//    and free face (slow swirl, drift toward busy walls), and the thickness
//    the film relaxes to.
// 4. film (⅓ CSS, one step): thickness carried by the curl and by the
//    bubble's motion, relaxing over seconds — the film remembers.
// 5. interiors (½ CSS) shaded once and taken as is at device pixels where
//    flagged all round; the composite (device pixels) does the rest near
//    walls and rims: owner among the four surrounding texels'
//    owners. Where all four agree and lie well inside the cell (most of
//    the screen), only the film is shaded; elsewhere walls are only those
//    the four texels name (≤ 6); liquid bands
//    joined at junctions by a smooth minimum; a mostly transparent film:
//    dark inside, light at the rim (Fresnel), along the walls, in faint
//    drainage bands and one small window highlight. Edges are area-filtered
//    by the pixel footprint.

export const ROW = 64;
/** Wall slots per bubble. */
export const SLOTS = 52;
/** Floats per bubble in `bubbles`: x y radius group | vx vy seed settle. group = alias+1 (+0.5 when focused); settle 1 → 0 over a second after a merge. */
export const BUBBLE_FLOATS = 8;
/** Floats per wall slot: neighbour+1 film flux 0. */
export const SLOT_FLOATS = 4;
/** Free face: f_i = K r_i + C (CSS px), i.e. a free radius of about 1.2 r. */
export const FACE_K = 0.45;
export const FACE_C = 2;
const FIELD_SCALE = 0.5;
const FILM_SCALE = 1 / 3;

const COMMON = /* glsl */ `
uniform highp sampler2D bubbles;
uniform vec2 frameU;      // CSS px
uniform float fieldScale; // field texels per CSS px

vec4 bubbleAt(int i) { return texelFetch(bubbles, ivec2((i % ${ROW}) * 2, i / ${ROW}), 0); }
vec4 motionAt(int i) { return texelFetch(bubbles, ivec2((i % ${ROW}) * 2 + 1, i / ${ROW}), 0); }
float own(vec4 b, vec2 u) {
  if (b.z <= 0.0) return 1e9;
  vec2 d = u - b.xy;
  return (dot(d, d) - b.z * b.z) / b.z;
}
int groupOf(int i, vec4 b) { return b.w >= 1.0 ? int(floor(b.w)) - 1 : i; }
float focusOf(vec4 b) { return fract(b.w) > 0.25 ? 1.0 : 0.0; }
float faceOf(vec4 b) { return ${FACE_K} * b.z + ${FACE_C}.0; }
// The film's brightness seen face-on: nearly black, as a real film on a dark ground.
const float FACE_ON = 0.055;
uniform float liquid;     // 0 dry … 1 wet
// Half-width of a wall's bright core (CSS px) and the smooth-min softness
// that rounds the junctions into small liquid fillets.
float wallWidth() { return mix(0.25, 1.8, liquid); }
float wallSoftness() { return mix(0.45, 5.0, liquid * liquid); }
// Each wall glows a little round its core over this length (CSS px).
const float GLOW = 1.5;
// Beyond this distance from every edge a pixel is plain interior film.
float plainFrom(float r) { return wallWidth() + 1.1 * wallSoftness() + 6.0 * GLOW + 1.5; }

// Two-beam reflectance of a soap film (n = 1.33) at thickness t (nm), seen
// face-on, tempered nearly to grey.
vec3 filmColour(float t) {
  vec3 s = sin(6.2831853 * 1.33 * t / vec3(650.0, 532.0, 450.0));
  vec3 film = 2.0 * s * s;
  float grey = dot(film, vec3(0.3333));
  return mix(vec3(grey), film, 0.13 * smoothstep(120.0, 600.0, t));
}
// The film inside a cell: nearly black, faint drainage bands, and on large
// bubbles only one small window highlight.
vec3 plainFilm(float thick, vec2 u, vec4 A) {
  float r = A.z;
  vec2 q = (u - A.xy) / max(sqrt(r * r + r * faceOf(A)), 1.0);
  vec3 halfway = normalize(normalize(vec3(-0.42, 0.62, 0.66)) + vec3(0.0, 0.0, 1.0));
  vec3 dome = normalize(vec3(-q * 0.55, 1.0));
  float spot = pow(max(dot(dome, halfway), 0.0), 380.0) * 0.5 * smoothstep(35.0, 80.0, r);
  return filmColour(12.0 + 1050.0 * thick) * FACE_ON * (1.0 + 0.35 * focusOf(A)) + vec3(spot);
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
`;

const SCREEN_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
out vec2 uv;
void main() {
  uv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

const SPLAT_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 bubble;  // x, y, radius
uniform vec2 frameU;
out vec2 local;
flat out vec2 info;  // radius, id + 1
void main() {
  float extent = bubble.z * 1.35 + 4.0;
  local = (corner * 2.0 - 1.0) * extent;
  info = vec2(bubble.z, float(gl_InstanceID) + 1.0);
  vec2 clip = (bubble.xy + local) / frameU * 2.0 - 1.0;
  gl_Position = bubble.z > 0.0 ? vec4(clip.x, -clip.y, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const SPLAT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in vec2 info;
out vec4 result;
void main() {
  float reach = info.x * 1.35 + 4.0;
  float d2 = dot(local, local);
  if (d2 > reach * reach) discard;
  float f = (d2 - info.x * info.x) / info.x;
  gl_FragDepth = clamp(0.5 + f / 8192.0, 0.0, 1.0);
  result = vec4(info.y, 0.0, 0.0, 1.0);
}
`;

// Owner and two nearest walls per half-resolution texel.
const FIELD_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
${COMMON}
uniform highp sampler2D slots;
uniform highp sampler2D owners;
layout(location = 0) out vec4 ids;
layout(location = 1) out vec4 attrs;
vec4 slotAt(int i, int s) { return texelFetch(slots, ivec2((i % ${ROW}) * ${SLOTS} + s, i / ${ROW}), 0); }
void main() {
  ivec2 at = ivec2(gl_FragCoord.xy);
  vec2 u = vec2(gl_FragCoord.x, float(textureSize(owners, 0).y) - gl_FragCoord.y) / fieldScale;
  int a = int(texelFetch(owners, at, 0).r) - 1;
  ids = vec4(0.0);
  attrs = vec4(1.0);
  if (a < 0) return;
  vec4 A = bubbleAt(a);
  float fA = own(A, u);
  // Exact owner through the wall list (the splat is coarse near walls).
  for (int pass = 0; pass < 1; pass += 1) {
    int better = -1;
    float fb = fA;
    for (int s = 0; s < ${SLOTS}; s += 1) {
      vec4 slot = slotAt(a, s);
      if (slot.x <= 0.0) break;
      int j = int(slot.x) - 1;
      float f = own(bubbleAt(j), u);
      if (f < fb) { fb = f; better = j; }
    }
    if (better < 0) break;
    a = better;
    fA = fb;
    A = bubbleAt(a);
  }
  int groupA = groupOf(a, A);
  vec2 ga = 2.0 * (u - A.xy) / A.z;
  float d1 = 1e4;
  float d2 = 1e4;
  vec3 w1 = vec3(0.0, 1.0, 1.0);
  vec3 w2 = vec3(0.0, 1.0, 1.0);
  for (int s = 0; s < ${SLOTS}; s += 1) {
    vec4 slot = slotAt(a, s);
    if (slot.x <= 0.0) break;
    int j = int(slot.x) - 1;
    vec4 B = bubbleAt(j);
    if (B.z <= 0.0 || groupOf(j, B) == groupA) continue;
    vec2 dg = 2.0 * (u - B.xy) / B.z - ga;
    float d = (own(B, u) - fA) / max(length(dg), 1e-3);
    if (d < d1) { d2 = d1; w2 = w1; d1 = d; w1 = slot.xyz; }
    else if (d < d2) { d2 = d; w2 = slot.xyz; }
  }
  if (d1 > 80.0) w1.x = 0.0;
  if (d2 > 80.0) w2.x = 0.0;
  float face = (faceOf(A) - fA) / max(length(ga), 1e-3);
  // Well beyond its free face a texel belongs to no bubble.
  if (face < -6.0) { ids = vec4(0.0, 0.0, 0.0, 1e4); return; }
  ids = vec4(float(a + 1), w1.x, w2.x, min(d1, face));
  attrs = vec4(w1.yz, w2.yz);
}
`;

const STREAM_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
${COMMON}
uniform highp sampler2D fieldIds;
uniform highp sampler2D fieldAttrs;
uniform float time;
uniform float traffic;
out vec4 result;
void main() {
  vec2 u = vec2(uv.x, 1.0 - uv.y) * frameU;
  ivec2 at = clamp(ivec2(vec2(u.x, frameU.y - u.y) * fieldScale), ivec2(0), textureSize(fieldIds, 0) - 1);
  vec4 ids = texelFetch(fieldIds, at, 0);
  vec4 attrs = texelFetch(fieldAttrs, at, 0);
  int a = int(ids.x) - 1;
  if (a < 0) { result = vec4(0.0, 0.3, 0.0, 0.0); return; }
  vec4 A = bubbleAt(a);
  float fA = own(A, u);
  vec2 ga = 2.0 * (u - A.xy) / A.z;
  // A burst bubble's film already belongs to the bubble it merged with: the
  // same frame, seed and motion, so the merged film is one sheet (no shear
  // along the old wall).
  int g = groupOf(a, A);
  vec4 G = g == a ? A : bubbleAt(g);
  vec4 motion = motionAt(g);
  float seed = motion.z * 61.0;
  vec2 q = (u - G.xy) / max(G.z, 1.0);
  // Just after a merge the film settles (no stirring) and relaxes fast.
  float settle = max(motion.w, motionAt(a).w);
  float toWall = (faceOf(A) - fA) / max(length(ga), 1e-3);
  float thinning = 0.0;
  vec2 drift = vec2(0.0);
  for (int k = 0; k < 2; k += 1) {
    int j = int(k == 0 ? ids.y : ids.z) - 1;
    if (j < 0) continue;
    vec4 B = bubbleAt(j);
    if (B.z <= 0.0) continue;
    vec2 dg = 2.0 * (u - B.xy) / B.z - ga;
    float d = (own(B, u) - fA) / max(length(dg), 1e-3);
    toWall = min(toWall, d);
    vec2 wall = k == 0 ? attrs.xy : attrs.zw;  // film, flux
    float busy = traffic * clamp(wall.y - 0.9, 0.0, 2.5);
    vec2 toward = B.xy - A.xy;
    drift += busy * toward / max(length(toward), 1e-3);
    thinning += busy * (1.0 - 0.6 * wall.x) * exp(-d / (8.0 + 0.12 * A.z));
  }
  // Zero at walls and free face, so the film flows along them and never across.
  float window = smoothstep(0.0, 1.0, max(toWall, 0.0) / (0.3 * A.z + 4.0));
  float swirl = noise(vec3(q * 1.7 + seed, time * 0.05 + seed)) + 0.5 * noise(vec3(q * 3.4 - seed, time * 0.08));
  // Stirring scales with the bubble but is capped, so giants drift as gently as the rest.
  float scale = min(G.z, 45.0);
  drift /= max(1.0, length(drift));
  float psi = (1.0 - settle) * window * (5.5 * scale * (swirl - 0.75) + 6.0 * scale * (drift.x * q.y - drift.y * q.x));
  // Equilibrium thickness: drains toward the top, fed by the borders, black beside busy walls.
  float drain = smoothstep(-1.1, 1.0, q.y + 0.35 * (swirl - 0.75));
  float rest = 0.1 + 0.55 * drain * drain + 0.35 * exp(-max(toWall, 0.0) / 5.0) - 0.75 * thinning;
  rest += 0.22 * (noise(vec3(q * 1.2 - seed * 1.3, time * 0.03)) - 0.5);
  // A settling texel says so by adding 2 to its rest thickness.
  result = vec4(psi, clamp(rest, 0.0, 1.0) + (settle > 0.05 ? 2.0 : 0.0), motion.xy);
}
`;

const FILM_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform highp sampler2D thickness;
uniform highp sampler2D stream;
uniform vec2 frameU;
uniform float uPerTexel;
uniform float seconds;
uniform float relax;
out vec4 result;
void main() {
  vec2 texel = 1.0 / vec2(textureSize(stream, 0));
  vec4 here = texture(stream, uv);
  float right = texture(stream, uv + vec2(texel.x, 0.0)).x;
  float left = texture(stream, uv - vec2(texel.x, 0.0)).x;
  float up = texture(stream, uv + vec2(0.0, texel.y)).x;
  float down = texture(stream, uv - vec2(0.0, texel.y)).x;
  float dPsiDx = (right - left) / (2.0 * uPerTexel);
  float dPsiDy = (down - up) / (2.0 * uPerTexel);
  vec2 velocity = vec2(dPsiDy, -dPsiDx) + here.zw;
  vec2 from = uv - vec2(velocity.x, -velocity.y) * seconds / frameU;
  float carried = texture(thickness, from).r;
  float rest = here.y;
  float rate = relax;
  if (rest > 1.5) {
    rest -= 2.0;
    rate = max(rate, 1.0 - exp(-seconds / 0.3));
  }
  result = vec4(clamp(carried + (rest - carried) * rate, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;

const COMPOSITE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
${COMMON}
uniform highp sampler2D fieldIds;
uniform highp sampler2D fieldAttrs;
uniform highp sampler2D thickness;
uniform highp sampler2D interior;
uniform float uPerPixel;  // one device pixel in CSS px
uniform float traffic;
out vec4 pixel;


void main() {
  vec2 u = vec2(uv.x, 1.0 - uv.y) * frameU;
  // Plain interiors (and the black outside) were shaded at field resolution.
  vec4 shaded = texture(interior, vec2(u.x, frameU.y - u.y) * fieldScale / vec2(textureSize(interior, 0)));
  if (shaded.a > 0.999) { pixel = vec4(shaded.rgb, 1.0); return; }
  vec2 t = vec2(u.x, frameU.y - u.y) * fieldScale - 0.5;
  ivec2 base = ivec2(floor(t));
  ivec2 limit = textureSize(fieldIds, 0) - 1;
  vec4 ids[4];
  vec4 owners[4];
  int a = -1;
  int ka = 0;
  float fA = 1e9;
  vec4 A = vec4(0.0);
  bool same = true;
  float clear = 1e4;
  for (int k = 0; k < 4; k += 1) {
    ids[k] = texelFetch(fieldIds, clamp(base + ivec2(k % 2, k / 2), ivec2(0), limit), 0);
    clear = min(clear, ids[k].w);
    if (k > 0 && ids[k].x != ids[0].x) same = false;
    int id = int(ids[k].x) - 1;
    owners[k] = id >= 0 ? bubbleAt(id) : vec4(0.0);
    float f = id >= 0 ? own(owners[k], u) : 1e9;
    if (f < fA) { fA = f; a = id; A = owners[k]; ka = k; }
  }
  if (a < 0) { pixel = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float focusA = focusOf(A);
  float r = A.z;
  float thick = texture(thickness, vec2(u.x, frameU.y - u.y) / frameU).r;
  vec3 plain = plainFilm(thick, u, A);
  if (same && clear > plainFrom(r)) { pixel = vec4(plain, 1.0); return; }
  // Candidate walls: the two the owner's texel names (with their film and
  // flux), and the owners of the other texels (across a wall from a).
  ivec2 atA = clamp(base + ivec2(ka % 2, ka / 2), ivec2(0), limit);
  vec4 attrA = texelFetch(fieldAttrs, atA, 0);
  int cand[6];
  vec2 cattr[6];
  cand[0] = int(ids[ka].y) - 1;
  cattr[0] = attrA.xy;
  cand[1] = int(ids[ka].z) - 1;
  cattr[1] = attrA.zw;
  for (int k = 0; k < 4; k += 1) {
    int owner = int(ids[k].x) - 1;
    cand[2 + k] = owner == a ? -1 : owner;
    cattr[2 + k] = vec2(1.0);
  }
  vec2 ga = 2.0 * (u - A.xy) / A.z;
  int groupA = groupOf(a, A);
  float widthBase = wallWidth();
  float k = wallSoftness();
  float sum = 0.0;
  float shine = 0.0;
  for (int n = 0; n < 6; n += 1) {
    int j = cand[n];
    if (j < 0) continue;
    bool seen = false;
    for (int m = 0; m < 6; m += 1) if (m < n && cand[m] == j) seen = true;
    if (seen) continue;
    vec4 B = n >= 2 ? owners[max(n - 2, 0)] : bubbleAt(j);
    if (B.z <= 0.0 || groupOf(j, B) == groupA) continue;
    vec2 dg = 2.0 * (u - B.xy) / B.z - ga;
    float len = max(length(dg), 1e-3);
    float d = (own(B, u) - fA) / len;
    float film = mix(1.0, cattr[n].x, traffic);
    float focused = max(focusA, focusOf(B));
    float w = widthBase * (0.55 + 0.45 * film) * (1.0 + 0.25 * focused);
    float weight = exp(-(d - w) / k);
    sum += weight;
    shine += weight * (0.35 + 0.65 * film) * (1.0 + 1.4 * focused);
  }
  float wallEdge = sum > 0.0 ? -k * log(sum) : 1e4;  // < 0 in the core
  shine = sum > 0.0 ? shine / sum : 1.0;
  float face = (faceOf(A) - fA) / max(length(ga), 1e-3);  // inside the free face, CSS px

  // Walls are light: a thin core (area-filtered by the pixel footprint)
  // with a soft glow, brightest where they reach a free face.
  float footprint = uPerPixel;
  float core = clamp(0.5 - wallEdge / footprint, 0.0, 1.0);
  float glow = 0.24 * exp(-max(wallEdge, 0.0) / GLOW);
  float wallLight = 0.62 * shine * (1.0 + 1.2 * exp(-max(face, 0.0) / 5.0));
  // The free face seen edge-on: a thin bright rim with a little glow inside.
  float rim = 0.45 * exp(-max(face, 0.0) / 1.0) + 0.12 * exp(-max(face, 0.0) / 4.0);
  float covered = clamp(0.5 + face / footprint, 0.0, 1.0);
  // Junction fillets may fill a gap between free faces, but stop just past them.
  float wetCovered = clamp(0.5 + (face + 1.5 * widthBase) / footprint, 0.0, 1.0);
  vec3 colour = (plain + vec3(rim)) * covered;
  colour += vec3(wallLight) * (core + glow * (1.0 - core)) * wetCovered;
  pixel = vec4(colour, 1.0);
}
`;

// Cell interiors (and the black outside the raft) at field resolution: the
// film seen face-on and the one window highlight; flagged (alpha 1) where
// the texel's whole 3 × 3 neighbourhood is that same interior, so the
// device-pixel pass can take it as is.
const INTERIOR_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
${COMMON}
uniform highp sampler2D fieldIds;
uniform highp sampler2D thickness;
out vec4 result;
void main() {
  ivec2 at = ivec2(gl_FragCoord.xy);
  ivec2 limit = textureSize(fieldIds, 0) - 1;
  vec4 here = texelFetch(fieldIds, at, 0);
  float clear = here.w;
  bool same = true;
  for (int k = 0; k < 9; k += 1) {
    vec4 n = texelFetch(fieldIds, clamp(at + ivec2(k % 3 - 1, k / 3 - 1), ivec2(0), limit), 0);
    if (n.x != here.x) same = false;
    clear = min(clear, n.w);
  }
  if (!same) { result = vec4(0.0); return; }
  int a = int(here.x) - 1;
  if (a < 0) { result = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec4 A = bubbleAt(a);
  if (clear <= plainFrom(A.z)) { result = vec4(0.0); return; }
  vec2 u = vec2(gl_FragCoord.x, float(limit.y + 1) - gl_FragCoord.y) / fieldScale;
  float thick = texture(thickness, vec2(u.x, frameU.y - u.y) / frameU).r;
  result = vec4(plainFilm(thick, u, A), 1.0);
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
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`bubble/4 shader: ${log}`);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`bubble/4 program: ${gl.getProgramInfoLog(program)}`);
  return program;
}

export type FoamFrame = {
  /** Bubble slots in use (ids < count). */
  count: number;
  time: number;
  /** Seconds the film advances this frame (0 holds it). */
  seconds: number;
  /** Seconds over which the film forgets (0 = no memory). */
  memory: number;
  liquid: number;
  traffic: number;
  /** Whether the wall lists changed since the last frame (they are uploaded only then). */
  slotsChanged: boolean;
};

export type FoamRenderer = {
  readonly bubbles: Float32Array;
  readonly slots: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  render(frame: FoamFrame): void;
  dispose(): void;
};

export function createFoamRenderer(canvas: HTMLCanvasElement, capacity: number): FoamRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;

  let programs: WebGLProgram[];
  try {
    programs = [
      compile(gl, SPLAT_VERTEX, SPLAT_FRAGMENT),
      compile(gl, SCREEN_VERTEX, FIELD_FRAGMENT),
      compile(gl, SCREEN_VERTEX, STREAM_FRAGMENT),
      compile(gl, SCREEN_VERTEX, FILM_FRAGMENT),
      compile(gl, SCREEN_VERTEX, COMPOSITE_FRAGMENT),
      compile(gl, SCREEN_VERTEX, INTERIOR_FRAGMENT),
    ];
  } catch (error) {
    console.error(error);
    return null;
  }
  const [splatProgram, fieldProgram, streamProgram, filmProgram, compositeProgram, interiorProgram] = programs as [
    WebGLProgram,
    WebGLProgram,
    WebGLProgram,
    WebGLProgram,
    WebGLProgram,
    WebGLProgram,
  ];
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  const location = (program: WebGLProgram, name: string) => {
    const key = `${programs.indexOf(program)}:${name}`;
    if (!uniforms.has(key)) uniforms.set(key, gl.getUniformLocation(program, name));
    return uniforms.get(key)!;
  };

  const rows = Math.ceil(capacity / ROW);
  const bubbles = new Float32Array(rows * ROW * BUBBLE_FLOATS);
  const slots = new Float32Array(rows * ROW * SLOTS * SLOT_FLOATS);
  const splatData = new Float32Array(capacity * 4);

  const square = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const screen = gl.createVertexArray();
  gl.bindVertexArray(screen);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const splatBuffer = gl.createBuffer();
  const splatMesh = gl.createVertexArray();
  gl.bindVertexArray(splatMesh);
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, splatBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, splatData.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.bindVertexArray(null);

  const texture = (width: number, height: number, internal: number, format: number, type: number, filter: number) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const bubbleTexture = texture(ROW * 2, rows, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST);
  const slotTexture = texture(ROW * SLOTS, rows, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST);

  type Target = { framebuffer: WebGLFramebuffer; textures: WebGLTexture[] };
  const target = (textures: WebGLTexture[], depth?: WebGLRenderbuffer): Target => {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    textures.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
    if (depth) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    return { framebuffer, textures };
  };
  type Fields = {
    owners: Target;
    depth: WebGLRenderbuffer;
    field: Target;
    interior: Target;
    stream: Target;
    film: [Target, Target];
    size: { width: number; height: number };
    filmSize: { width: number; height: number };
  };
  let fields: Fields | null = null;
  let uploadedRows = 0;
  let filmFresh = true;
  let css = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };

  const release = () => {
    if (!fields) return;
    for (const item of [fields.owners, fields.field, fields.interior, fields.stream, ...fields.film]) {
      for (const t of item.textures) gl.deleteTexture(t);
      gl.deleteFramebuffer(item.framebuffer);
    }
    gl.deleteRenderbuffer(fields.depth);
    fields = null;
  };

  const resize: FoamRenderer["resize"] = (width, height, ratio) => {
    css = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    release();
    const size = { width: Math.max(1, Math.round(css.width * FIELD_SCALE)), height: Math.max(1, Math.round(css.height * FIELD_SCALE)) };
    const filmSize = { width: Math.max(1, Math.round(css.width * FILM_SCALE)), height: Math.max(1, Math.round(css.height * FILM_SCALE)) };
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, size.width, size.height);
    const half = (internal: number, format: number, type: number, filter: number) => texture(size.width, size.height, internal, format, type, filter);
    const quarter = () => texture(filmSize.width, filmSize.height, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR);
    fields = {
      owners: target([half(gl.R32F, gl.RED, gl.FLOAT, gl.NEAREST)], depth),
      depth,
      field: target([half(gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST), half(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.NEAREST)]),
      interior: target([half(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR)]),
      stream: target([quarter()]),
      film: [target([quarter()]), target([quarter()])],
      size,
      filmSize,
    };
    filmFresh = true;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const bindTextures = (program: WebGLProgram, list: readonly (readonly [string, WebGLTexture])[]) => {
    list.forEach(([name, t], unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(location(program, name), unit);
    });
  };

  const draw = () => {
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const shared = (program: WebGLProgram) => {
    gl.uniform2f(location(program, "frameU"), css.width, css.height);
    gl.uniform1f(location(program, "fieldScale"), fields!.size.width / css.width);
  };

  const render: FoamRenderer["render"] = (frame) => {
    if (!fields) return;
    const f = fields;
    const count = Math.min(frame.count, capacity);
    const usedRows = Math.max(1, Math.ceil(count / ROW));
    for (let i = 0; i < count; i += 1) {
      splatData[i * 4] = bubbles[i * BUBBLE_FLOATS]!;
      splatData[i * 4 + 1] = bubbles[i * BUBBLE_FLOATS + 1]!;
      splatData[i * 4 + 2] = bubbles[i * BUBBLE_FLOATS + 2]!;
    }
    gl.bindTexture(gl.TEXTURE_2D, bubbleTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW * 2, usedRows, gl.RGBA, gl.FLOAT, bubbles, 0);
    if (frame.slotsChanged || usedRows > uploadedRows) {
      gl.bindTexture(gl.TEXTURE_2D, slotTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW * SLOTS, usedRows, gl.RGBA, gl.FLOAT, slots, 0);
      uploadedRows = usedRows;
    }

    // 1. Ownership.
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.owners.framebuffer);
    gl.viewport(0, 0, f.size.width, f.size.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.useProgram(splatProgram);
    gl.uniform2f(location(splatProgram, "frameU"), css.width, css.height);
    gl.bindVertexArray(splatMesh);
    gl.bindBuffer(gl.ARRAY_BUFFER, splatBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, splatData, 0, count * 4);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.disable(gl.DEPTH_TEST);

    // 2. Field: owner and nearest walls.
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.field.framebuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.useProgram(fieldProgram);
    bindTextures(fieldProgram, [["bubbles", bubbleTexture], ["slots", slotTexture], ["owners", f.owners.textures[0]!]]);
    shared(fieldProgram);
    draw();

    // 3–4. The film.
    if (frame.seconds > 0 || filmFresh) {
      gl.viewport(0, 0, f.filmSize.width, f.filmSize.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.stream.framebuffer);
      gl.useProgram(streamProgram);
      bindTextures(streamProgram, [["bubbles", bubbleTexture], ["fieldIds", f.field.textures[0]!], ["fieldAttrs", f.field.textures[1]!]]);
      shared(streamProgram);
      gl.uniform1f(location(streamProgram, "time"), frame.time);
      gl.uniform1f(location(streamProgram, "traffic"), frame.traffic);
      draw();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.film[1].framebuffer);
      gl.useProgram(filmProgram);
      bindTextures(filmProgram, [["thickness", f.film[0].textures[0]!], ["stream", f.stream.textures[0]!]]);
      gl.uniform2f(location(filmProgram, "frameU"), css.width, css.height);
      gl.uniform1f(location(filmProgram, "uPerTexel"), css.width / f.filmSize.width);
      gl.uniform1f(location(filmProgram, "seconds"), frame.seconds);
      gl.uniform1f(location(filmProgram, "relax"), filmFresh || frame.memory <= 0 ? 1 : 1 - Math.exp(-frame.seconds / frame.memory));
      draw();
      f.film.reverse();
      filmFresh = false;
    }

    // 5. Interiors at field resolution, taken as is where flagged; the
    //    full composite only for the rest.
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.interior.framebuffer);
    gl.viewport(0, 0, f.size.width, f.size.height);
    gl.useProgram(interiorProgram);
    bindTextures(interiorProgram, [["bubbles", bubbleTexture], ["fieldIds", f.field.textures[0]!], ["thickness", f.film[0].textures[0]!]]);
    shared(interiorProgram);
    gl.uniform1f(location(interiorProgram, "liquid"), frame.liquid);
    draw();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.useProgram(compositeProgram);
    bindTextures(compositeProgram, [
      ["bubbles", bubbleTexture],
      ["fieldIds", f.field.textures[0]!],
      ["fieldAttrs", f.field.textures[1]!],
      ["thickness", f.film[0].textures[0]!],
      ["interior", f.interior.textures[0]!],
    ]);
    shared(compositeProgram);
    gl.uniform1f(location(compositeProgram, "uPerPixel"), css.width / pixels.width);
    gl.uniform1f(location(compositeProgram, "liquid"), frame.liquid);
    gl.uniform1f(location(compositeProgram, "traffic"), frame.traffic);
    draw();
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    release();
    gl.deleteTexture(bubbleTexture);
    gl.deleteTexture(slotTexture);
    for (const buffer of [square, splatBuffer]) gl.deleteBuffer(buffer);
    for (const vao of [screen, splatMesh]) gl.deleteVertexArray(vao);
    for (const program of programs) gl.deleteProgram(program);
  };

  return { bubbles, slots, resize, render, dispose };
}
