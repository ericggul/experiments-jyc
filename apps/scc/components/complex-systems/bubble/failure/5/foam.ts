// A foam computed site by site on the GPU (WebGL2). Nothing is placed by the
// CPU after the first frame: walls, junctions, T1 swaps, vanishing bubbles
// and divisions all come out of the lattice. See potts.ts for the physics
// and its CPU replica, and docs/experiments/complex-systems/bubble/5.md.
//
// Per frame (sim running), at SCALE of the CSS resolution:
//   1. scatter  – one point per lattice site, additively blended into the
//                 texel of its bubble: area, centroid and second moments,
//                 wall pairs, and the gas it loses across its walls.
//   2. state    – per bubble (128 × 32 texels): gas after exchange and
//                 renormalisation, centroid, long axis; whether it divides or
//                 buds into its partner slot this frame (see partnerOf).
//   3. totals   – one point per bubble into one texel: total gas, count.
//   4. division – sites beyond a dividing bubble's chord (or inside a
//                 blown disc) take the child's id.
//   5. sweeps   – Metropolis copy attempts, nine sublattice passes a sweep.
// Then, for display only:
//   6. labels   – per site the two strongest bubble ids in a Gaussian
//                 window, their weights eased over time (calm walls).
//   7. surface  – per site the distance to its bubble's wall (chamfer,
//                 relaxed every frame) and the film's thickness, a GPU memory
//                 that swirls with its bubble, drains, and is renewed at the
//                 walls.
//   8. film     – at device resolution: the labels and distance read through
//                 a quadratic B-spline, so walls are smooth curves; soap film
//                 with tempered thin-film interference over a shallow cap,
//                 Plateau borders as liquid where three or more bubbles meet.

import {
  BLOW_RADIUS,
  classOrder,
  CONFINEMENT,
  COVERAGE,
  MEDIUM_TENSION,
  COPY_OFFSETS,
  FLUX_OFFSETS,
  LEAST_TARGET,
  MAX_IDS,
  NUCLEUS_RADIUS,
  ROW,
  rotationFor,
  SCALE,
  SLOTS,
  VANISH_TARGET,
  WALL_OFFSETS,
  type FoamParameters,
  type Lattice,
} from "./potts.ts";

const ROWS = MAX_IDS / ROW;
/**
 * The scatter adds into this many interleaved copies of the per-bubble
 * texture (a site picks its copy by position), so few points blend into any
 * one texel; a gather pass then sums the copies. With one copy, 280k points
 * blending into 2,048 texels cost about 30 ms a frame (measured).
 */
const COPIES = 32;
/** The foam steps once per this many frames (30 Hz at 60 fps). */
const SIM_EVERY = 2;
/** Lattice passes cover ρ < RAFT_REACH of the bowl; bubbles beyond ρ ≈ 0.8 are not seen in practice. */
const RAFT_REACH = 1;
/** Display easing (seconds): label weights and wall distance follow the lattice with these time constants. */
const LABEL_SECONDS = 0.45;
const DISTANCE_SECONDS = 0.35;
/** Display window of the labels pass (sites from the centre; 21 samples). */
const LABEL_REACH = 3;
/** Gaussian width of the labels (sites). */
const LABEL_SIGMA = 2;
/** Speed (sites/s) of the transfer film across a wall at the default diffusion. */
const TRANSFER_SPEED = 14;

const glslOffsets = (offsets: readonly (readonly [number, number])[]) => offsets.map(([x, y]) => `ivec2(${x}, ${y})`).join(", ");
const float = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);

const HEADER = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;

const COMMON = /* glsl */ `
const int ROW = ${ROW};
const int ROWS = ${ROWS};
const int SLOTS = ${SLOTS};
const float LEAST_TARGET = ${float(LEAST_TARGET)};
const float VANISH_TARGET = ${float(VANISH_TARGET)};
const float MEDIUM_TENSION = ${float(MEDIUM_TENSION)};
const float CONFINEMENT = ${float(CONFINEMENT)};

uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float random3(uint x, uint y, uint z) {
  return float(pcg(x ^ pcg(y ^ pcg(z))) >> 8u) / 16777216.0;
}
// Line tension between two ids; id 0 is air.
float tension(float a, float b) {
  if (a == b) return 0.0;
  return a < 0.5 || b < 0.5 ? MEDIUM_TENSION : 1.0;
}
// The bowl that holds the raft: ρ² with two slow lobes (potts.ts confinementAt).
float bowl(vec2 site, vec2 extent, float time) {
  vec2 uv = (site + 0.5 - extent * 0.5) / (0.6 * extent.y);
  float r2 = dot(uv, uv);
  if (r2 < 1e-8) return 0.0;
  float angle = atan(uv.y, uv.x);
  float lobes = 1.0 + 0.22 * sin(2.0 * angle + 0.031 * time + 1.3) + 0.14 * sin(3.0 * angle - 0.047 * time + 0.4);
  return r2 / lobes;
}
ivec2 slotOf(float id) {
  int i = int(id + 0.5);
  return ivec2(i % ROW, i / ROW);
}
`;

const LATTICE_ACCESS = /* glsl */ `
uniform sampler2D lattice;
uniform ivec2 size;
// Beyond the screen is air (id 0).
float idAt(ivec2 p) {
  if (p.x < 0 || p.y < 0 || p.x >= size.x || p.y >= size.y) return 0.0;
  return texelFetch(lattice, p, 0).r;
}
// The bubble a request at a point (sites) belongs to: the one there or, on air,
// the nearest along 16 rays within 12 sites (potts.ts ownerNear).
float ownerNear(vec2 at) {
  float here = idAt(ivec2(floor(at)));
  if (here > 0.5) return here;
  for (int step = 1; step <= 6; step += 1) {
    float radius = float(step * 2);
    for (int ray = 0; ray < 16; ray += 1) {
      float angle = float(ray) / 16.0 * 6.2831853;
      float id = idAt(ivec2(floor(at + vec2(cos(angle), sin(angle)) * radius)));
      if (id > 0.5) return id;
    }
  }
  return 0.0;
}
`;

const FULL_VERTEX = /* glsl */ `${HEADER}
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

// 5. One sublattice pass of copy attempts.
const SWEEP_FRAGMENT = /* glsl */ `${HEADER}${COMMON}${LATTICE_ACCESS}
uniform sampler2D state0;
uniform ivec2 phase;
uniform uint passIndex;
uniform float temperature;
uniform float stiffness;
uniform float time;
out vec4 result;
const ivec2 COPY[8] = ivec2[8](${glslOffsets(COPY_OFFSETS)});
const ivec2 WALL[${WALL_OFFSETS.length}] = ivec2[${WALL_OFFSETS.length}](${glslOffsets(WALL_OFFSETS)});
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  float current = texelFetch(lattice, p, 0).r;
  result = vec4(current, 0.0, 0.0, 1.0);
  if (p.x % 3 != phase.x || p.y % 3 != phase.y) return;
  uint seed = passIndex * 2u;
  int choice = min(int(random3(uint(p.x), uint(p.y), seed) * 8.0), 7);
  float next = idAt(p + COPY[choice]);
  if (next == current) return;
  float wall = 0.0;
  for (int k = 0; k < ${WALL_OFFSETS.length}; k += 1) {
    float other = idAt(p + WALL[k]);
    wall += tension(next, other) - tension(current, other);
  }
  // state0: gas (= target), area. Air has no area term.
  float lose = 0.0;
  float gain = 0.0;
  if (current > 0.5) {
    vec4 a = texelFetch(state0, slotOf(current), 0);
    lose = stiffness / max(a.x, LEAST_TARGET) * (1.0 - 2.0 * (a.y - a.x));
  }
  if (next > 0.5) {
    vec4 b = texelFetch(state0, slotOf(next), 0);
    gain = stiffness / max(b.x, LEAST_TARGET) * (1.0 + 2.0 * (b.y - b.x));
  }
  float held = CONFINEMENT * bowl(vec2(p), vec2(size), time) * (float(next > 0.5) - float(current > 0.5));
  float change = wall + lose + gain + held;
  if (change <= 0.0 || random3(uint(p.x), uint(p.y), seed + 1u) < exp(-change / temperature)) result.r = next;
}
`;

// 1. Scatter: one point per site into its bubble's texel.
const SCATTER_VERTEX = /* glsl */ `${HEADER}${COMMON}${LATTICE_ACCESS}
uniform sampler2D state0;
uniform sampler2D state2;
uniform float stiffness;
uniform float rate;
flat out vec4 sum0;
flat out vec4 sum1;
const ivec2 FLUX[4] = ivec2[4](${glslOffsets(FLUX_OFFSETS)});
float pressureOf(vec4 s) {
  return 2.0 * stiffness / max(s.x, LEAST_TARGET) * (s.x - s.y);
}
float slopeOf(vec4 s) {
  float t = max(s.x, LEAST_TARGET);
  return 2.0 * stiffness * s.y / (t * t);
}
void main() {
  ivec2 p = ivec2(gl_VertexID % size.x, gl_VertexID / size.x);
  float id = texelFetch(lattice, p, 0).r;
  gl_PointSize = 1.0;
  sum0 = vec4(0.0);
  sum1 = vec4(0.0);
  if (id < 0.5) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    return;
  }
  ivec2 slot = slotOf(id);
  vec4 s = texelFetch(state0, slot, 0);
  // Moments about the bubble's last centroid, so sums stay small.
  vec2 d = vec2(p) + 0.5 - s.zw;
  float loss = 0.0;
  float pairs = 0.0;
  if (s.x > 0.0) {
    float pressure = pressureOf(s);
    float stiff = texelFetch(state2, slot, 0).w * slopeOf(s);
    for (int k = 0; k < 4; k += 1) {
      float other = idAt(p + FLUX[k]);
      if (other < 0.5 || other == id) continue;
      ivec2 otherSlot = slotOf(other);
      vec4 o = texelFetch(state0, otherSlot, 0);
      if (o.x <= 0.0) continue;
      float otherStiff = texelFetch(state2, otherSlot, 0).w * slopeOf(o);
      loss += rate * (pressure - pressureOf(o)) / (1.0 + rate * (stiff + otherStiff));
      pairs += 1.0;
    }
  }
  sum0 = vec4(1.0, d, loss);
  sum1 = vec4(d.x * d.x, d.x * d.y, d.y * d.y, pairs);
  int copy = (p.x * 7 + p.y * 13) % ${COPIES};
  vec2 texel = vec2(slot) + vec2(0.0, float(copy * ROWS));
  vec2 clip = (texel + 0.5) / vec2(float(ROW), float(ROWS * ${COPIES})) * 2.0 - 1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
}
`;

const SUM_FRAGMENT = /* glsl */ `${HEADER}
flat in vec4 sum0;
flat in vec4 sum1;
layout(location = 0) out vec4 out0;
layout(location = 1) out vec4 out1;
void main() {
  out0 = sum0;
  out1 = sum1;
}
`;

// 1b. Gather: each bubble's sums over the scatter's copies.
const GATHER_FRAGMENT = /* glsl */ `${HEADER}${COMMON}
uniform sampler2D copies0;
uniform sampler2D copies1;
layout(location = 0) out vec4 out0;
layout(location = 1) out vec4 out1;
void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  vec4 a = vec4(0.0);
  vec4 b = vec4(0.0);
  for (int copy = 0; copy < ${COPIES}; copy += 1) {
    ivec2 at = texel + ivec2(0, copy * ROWS);
    a += texelFetch(copies0, at, 0);
    b += texelFetch(copies1, at, 0);
  }
  out0 = a;
  out1 = b;
}
`;

// 2. Per-bubble state.
//   state0: gas, area, centroid x, y (sites)
//   state1: serial (of the tap that blew it, 0 otherwise), birth time, child id this frame, kind (1 divides, 2 buds)
//   state2: long axis x, y, chord offset, wall pairs
const STATE_FRAGMENT = /* glsl */ `${HEADER}${COMMON}${LATTICE_ACCESS}
uniform sampler2D previous0;
uniform sampler2D previous1;
uniform sampler2D previous2;
uniform sampler2D sums0;
uniform sampler2D sums1;
uniform sampler2D totals;
uniform int rotation;
uniform uint frame;
uniform float time;
uniform float splitArea;
uniform float targetArea;   // COVERAGE of the lattice
uniform vec4 request;   // x, y (sites), radius, serial (0: none)
layout(location = 0) out vec4 next0;
layout(location = 1) out vec4 next1;
layout(location = 2) out vec4 next2;

struct Evolved {
  bool alive;
  float gas;
  float area;
  vec2 centre;
  vec2 axis;
  float cut;
  float share;
  float pairs;
  bool divides;
};

ivec2 texelOf(int id) {
  return ivec2(id % ROW, id / ROW);
}
int partnerOf(int id) {
  return 1 + (id - 1 + rotation) % SLOTS;
}
int parentOf(int id) {
  return 1 + ((id - 1 - rotation) % SLOTS + SLOTS) % SLOTS;
}
float splitFactor(int id, float birth) {
  float u = random3(uint(id), uint(abs(birth) * 60.0 + 7.0), 0x5b1u);
  return 0.5 + 15.0 * u * u * u * u;
}
float childShare(int id) {
  return 0.15 + 0.35 * random3(uint(id), frame, 0xd1eu);
}
float chordOffset(float share) {
  float h = 1.0 - 2.0 * share;
  for (int k = 0; k < 4; k += 1) {
    float root = sqrt(max(1.0 - h * h, 1e-6));
    float value = (acos(h) - h * root) / 3.14159265 - share;
    h = clamp(h + value * 3.14159265 / (2.0 * root), -0.999, 0.999);
  }
  return h;
}

// What this frame makes of bubble id: the same function of the same texels
// wherever it is evaluated, so a parent and the slot it claims agree.
Evolved evolve(int id) {
  Evolved e;
  ivec2 at = texelOf(id);
  vec4 s0 = texelFetch(sums0, at, 0);
  vec4 s1 = texelFetch(sums1, at, 0);
  vec4 before = texelFetch(previous0, at, 0);
  e.alive = s0.x > 0.5;
  e.area = s0.x;
  float n = max(s0.x, 1.0);
  vec2 mean = s0.yz / n;
  e.centre = before.zw + mean;
  float xx = s1.x / n - mean.x * mean.x;
  float xy = s1.y / n - mean.x * mean.y;
  float yy = s1.z / n - mean.y * mean.y;
  float angle = abs(2.0 * xy) + abs(xx - yy) > 1e-6 ? 0.5 * atan(2.0 * xy, xx - yy) : 0.0;
  e.axis = vec2(cos(angle), sin(angle));
  float along = e.axis.x * e.axis.x * xx + 2.0 * e.axis.x * e.axis.y * xy + e.axis.y * e.axis.y * yy;
  e.share = childShare(id);
  e.cut = 2.0 * sqrt(max(along, 0.0)) * chordOffset(e.share);
  e.pairs = s1.w;
  // Gas after the exchange, renormalised by last frame's total so the
  // targets keep summing to the raft's share of the screen.
  float total = texelFetch(totals, ivec2(0), 0).x;
  float renormalise = total > 0.0 ? targetArea / total : 1.0;
  float gas = max(0.0, before.x - s0.w) * renormalise;
  if (!(gas >= VANISH_TARGET) || !e.alive) gas = 0.0;
  e.gas = gas;
  float own = splitArea * splitFactor(id, texelFetch(previous1, at, 0).y);
  e.divides = e.alive && gas > own && e.area > 0.85 * own;
  return e;
}

void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  int id = texel.y * ROW + texel.x;
  next0 = vec4(0.0);
  next1 = vec4(0.0);
  next2 = vec4(0.0);
  if (id == 0) return;
  bool asked = request.w > 0.0;
  float owner = asked ? ownerNear(request.xy) : 0.0;
  Evolved self = evolve(id);
  if (self.alive) {
    vec4 before1 = texelFetch(previous1, texel, 0);
    int child = partnerOf(id);
    bool free = texelFetch(sums0, texelOf(child), 0).x < 0.5;
    bool buds = asked && float(id) == owner && before1.x != request.w;
    float kind = 0.0;
    float gas = self.gas;
    float area = self.area;
    if (free && buds) {
      kind = 2.0;
    } else if (free && self.divides) {
      kind = 1.0;
      gas *= 1.0 - self.share;
      area *= 1.0 - self.share;
    }
    next0 = vec4(gas, area, self.centre);
    next1 = vec4(before1.x, before1.y, kind > 0.0 ? float(child) : 0.0, kind);
    next2 = vec4(self.axis, self.cut, self.pairs);
    return;
  }
  // A free slot: is it claimed this frame by its parent?
  int parent = parentOf(id);
  if (texelFetch(sums0, texelOf(parent), 0).x < 0.5) return;
  vec4 parent1 = texelFetch(previous1, texelOf(parent), 0);
  if (asked && float(parent) == owner && parent1.x != request.w) {
    float area = 3.14159265 * request.z * request.z;
    next0 = vec4(area, area, request.xy);
    next1 = vec4(request.w, time, 0.0, 0.0);
    next2 = vec4(1.0, 0.0, 0.0, 4.5 * sqrt(area));
    return;
  }
  Evolved p = evolve(parent);
  if (!p.divides) return;
  float area = p.area * p.share;
  next0 = vec4(p.gas * p.share, area, p.centre + p.axis * (p.cut + sqrt(area)));
  next1 = vec4(0.0, time, 0.0, 0.0);
  next2 = vec4(p.axis, 0.0, 4.5 * sqrt(area));
}
`;

// 3. Totals: every bubble's gas into one texel.
const TOTALS_VERTEX = /* glsl */ `${HEADER}${COMMON}
uniform sampler2D state0;
flat out vec4 sum0;
flat out vec4 sum1;
void main() {
  vec4 s = texelFetch(state0, ivec2(gl_VertexID % ROW, gl_VertexID / ROW), 0);
  bool alive = s.y > 0.0;
  sum0 = alive ? vec4(s.x, 1.0, s.y * s.y, s.y) : vec4(0.0);
  sum1 = vec4(0.0);
  gl_PointSize = 1.0;
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

// 4. Division and blowing.
const DIVISION_FRAGMENT = /* glsl */ `${HEADER}${COMMON}${LATTICE_ACCESS}
uniform sampler2D state0;
uniform sampler2D state1;
uniform sampler2D state2;
uniform vec4 request;
out vec4 result;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  float id = texelFetch(lattice, p, 0).r;
  result = vec4(id, 0.0, 0.0, 1.0);
  vec2 centre = vec2(p) + 0.5;
  if (request.w > 0.0 && distance(centre, request.xy) < request.z) {
    float owner = ownerNear(request.xy);
    if (owner > 0.5) {
      vec4 o = texelFetch(state1, slotOf(owner), 0);
      if (o.w == 2.0) {
        result.r = o.z;
        return;
      }
    }
  }
  if (id < 0.5) return;
  vec4 s1 = texelFetch(state1, slotOf(id), 0);
  if (s1.w != 1.0) return;
  vec4 s0 = texelFetch(state0, slotOf(id), 0);
  vec4 s2 = texelFetch(state2, slotOf(id), 0);
  if (dot(centre - s0.zw, s2.xy) > s2.z) result.r = s1.z;
}
`;

// 6. Soft labels: the two strongest ids around each site, eased in time.
// A label is id + 1: 0 is empty, 1 is air. Half floats hold every label
// exactly (ids < 2048).
const LABEL_FRAGMENT = /* glsl */ `${HEADER}${COMMON}
uniform sampler2D lattice;
uniform sampler2D previous;
uniform ivec2 size;
uniform float blend;
uniform float sigma;
out vec4 result;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  float ids[6];
  float weights[6];
  int count = 0;
  float total = 0.0;
  float spread = 0.5 / (sigma * sigma);
  for (int dy = -${LABEL_REACH}; dy <= ${LABEL_REACH}; dy += 1) {
    for (int dx = -${LABEL_REACH}; dx <= ${LABEL_REACH}; dx += 1) {
      float r2 = float(dx * dx + dy * dy);
      if (r2 > ${float(LABEL_REACH * LABEL_REACH + 1)}) continue;
      float w = exp(-r2 * spread);
      ivec2 q = clamp(p + ivec2(dx, dy), ivec2(0), size - 1);
      float id = texelFetch(lattice, q, 0).r + 1.0;
      total += w;
      int k = 0;
      for (; k < count; k += 1) {
        if (ids[k] == id) break;
      }
      if (k == count) {
        if (count == 6) continue;
        ids[k] = id;
        weights[k] = 0.0;
        count += 1;
      }
      weights[k] += w;
    }
  }
  vec4 before = texelFetch(previous, p, 0);
  float weightOfA = 0.0;
  float weightOfB = 0.0;
  float topId = 0.0;
  float topWeight = -1.0;
  float secondId = 0.0;
  float secondWeight = -1.0;
  for (int k = 0; k < 6; k += 1) {
    if (k >= count) break;
    float w = weights[k] / total;
    if (ids[k] == before.x) weightOfA = w;
    if (ids[k] == before.z) weightOfB = w;
    if (w > topWeight) {
      secondId = topId;
      secondWeight = topWeight;
      topId = ids[k];
      topWeight = w;
    } else if (w > secondWeight) {
      secondId = ids[k];
      secondWeight = w;
    }
  }
  float candidateId[4];
  float candidateWeight[4];
  candidateId[0] = before.x;
  candidateWeight[0] = before.x > 0.5 ? mix(before.y, weightOfA, blend) : -1.0;
  candidateId[1] = before.z;
  candidateWeight[1] = before.z > 0.5 && before.z != before.x ? mix(before.w, weightOfB, blend) : -1.0;
  candidateId[2] = topId;
  candidateWeight[2] = topId != before.x && topId != before.z ? topWeight * blend : -1.0;
  candidateId[3] = secondId;
  candidateWeight[3] = secondWeight > 0.0 && secondId != before.x && secondId != before.z ? secondWeight * blend : -1.0;
  float aId = 0.0;
  float aWeight = -1.0;
  float bId = 0.0;
  float bWeight = -1.0;
  for (int k = 0; k < 4; k += 1) {
    float w = candidateWeight[k];
    if (w <= 0.0) continue;
    if (w > aWeight) {
      bId = aId;
      bWeight = aWeight;
      aId = candidateId[k];
      aWeight = w;
    } else if (w > bWeight) {
      bId = candidateId[k];
      bWeight = w;
    }
  }
  result = vec4(aId, max(aWeight, 0.0), bId, max(bWeight, 0.0));
}
`;

// 7. Surface, per site:
//   r – distance to the bubble's wall (chamfer, relaxed in place),
//   g – transfer film: portions of thick film carried across each wall from
//       the bubble at higher Laplace pressure (smaller) into the larger one,
//   b – the distance eased in time (what is drawn),
//   a – the film's drainage thickness (/1100 nm), bubble/1's film at lattice
//       resolution: black film at the top, thick below, folded by slow currents.
const SURFACE_FRAGMENT = /* glsl */ `${HEADER}${COMMON}${LATTICE_ACCESS}
uniform sampler2D previous;
uniform sampler2D labels;
uniform sampler2D state0;
uniform sampler2D state1;
uniform float seconds;
uniform float time;
uniform float smoothing;
uniform float transfer;     // speed of the transfer film, sites/s
layout(location = 0) out vec4 result;
layout(location = 1) out vec4 region;
const ivec2 NEAR[8] = ivec2[8](${glslOffsets(COPY_OFFSETS)});
const ivec2 CHAMFER[16] = ivec2[16](${glslOffsets([
  ...COPY_OFFSETS,
  [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1],
])});

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
float shownAt(ivec2 q) {
  return texelFetch(previous, clamp(q, ivec2(0), size - 1), 0).b;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  float id = texelFetch(lattice, p, 0).r;
  vec4 before = texelFetch(previous, p, 0);
  bool edge = false;
  for (int k = 0; k < 8; k += 1) {
    if (idAt(p + NEAR[k]) != id) edge = true;
  }
  float d = 0.5;
  if (!edge) {
    d = 64.0;
    for (int k = 0; k < 16; k += 1) {
      ivec2 q = p + CHAMFER[k];
      if (idAt(q) != id) continue;
      d = min(d, texelFetch(previous, q, 0).r + length(vec2(CHAMFER[k])));
    }
  }
  float shown = mix(before.b, d, smoothing);
  // Region for the composite: the label shared by the whole 3 × 3
  // neighbourhood (1 air, k + 1 bubble k), or 0 where labels differ.
  vec4 middle = texelFetch(labels, p, 0);
  float agreed = middle.x;
  for (int j = -1; j <= 1; j += 1) {
    for (int i = -1; i <= 1; i += 1) {
      vec4 l = texelFetch(labels, clamp(p + ivec2(i, j), ivec2(0), size - 1), 0);
      if (l.x != middle.x || l.y < 0.995) agreed = 0.0;
    }
  }
  region = vec4(agreed, 0.0, 0.0, 1.0);
  if (id < 0.5) {
    result = vec4(d, 0.0, shown, 0.0);
    return;
  }
  ivec2 slot = slotOf(id);
  vec4 s0 = texelFetch(state0, slot, 0);
  vec4 s1 = texelFetch(state1, slot, 0);
  float radius = sqrt(max(s0.y, 1.0) / 3.14159265);
  float seed = random3(uint(id), uint(abs(s1.y) * 60.0 + 7.0), 31u) * 37.0;
  vec2 x = vec2(p) + 0.5;

  // Drainage, as bubble/1's film.
  vec2 q = (x - s0.zw) / radius;
  vec3 at = vec3(q * 1.3 + seed, time * 0.06 + seed);
  vec2 warp = (vec2(fbm2(at), fbm2(at + vec3(5.2, 1.3, 2.7))) - 0.375) * 1.25;
  vec3 folded = vec3(q * 1.7 + warp * 3.2 + seed, time * 0.045 + seed);
  vec2 warp2 = (vec2(fbm2(folded), fbm2(folded + vec3(3.1, 7.7, 1.9))) - 0.375) * 1.25;
  float swirl = fbm(vec3(q * 2.0 + warp2 * 2.6 + seed, time * 0.04));
  float drain = smoothstep(-0.95, 0.9, q.y + 0.55 * (warp.y + warp2.x));
  // Small bubbles have drained further: their bands are fainter.
  float thickness = mix(20.0, 900.0, drain * drain) * (0.4 + 1.2 * swirl) * mix(0.3, 1.0, smoothstep(6.0, 30.0, radius));

  // Transfer: across the wall with the neighbour in this site's labels, the
  // film moves from the smaller bubble (higher Laplace pressure, 1/r) to the
  // larger, at a pace set by their difference; the smaller sheds it in
  // portions just inside the wall, the larger takes them in.
  vec4 label = texelFetch(labels, p, 0);
  float other = (label.x - 1.0 == id ? label.z : label.x) - 1.0;
  float otherWeight = label.x - 1.0 == id ? label.w : label.y;
  float drive = 0.0;
  if (other > 0.5 && otherWeight > 0.02) {
    vec4 o = texelFetch(state0, slotOf(other), 0);
    float otherRadius = sqrt(max(o.y, 1.0) / 3.14159265);
    drive = clamp((1.0 / radius - 1.0 / otherRadius) * 14.0, -1.0, 1.0);
  }
  vec2 slope = vec2(shownAt(p + ivec2(1, 0)) - shownAt(p - ivec2(1, 0)), shownAt(p + ivec2(0, 1)) - shownAt(p - ivec2(0, 1)));
  vec2 toward = -slope / max(length(slope), 1e-3);
  vec2 velocity = drive * transfer * toward;
  // Film already taken in keeps streaming toward the receiver's middle.
  if (drive == 0.0 && before.g > 0.02) velocity = -0.3 * transfer * toward;
  float carried = texture(previous, (x - velocity * seconds) / vec2(size)).g;
  // Received film spreads a little and fades over a couple of seconds.
  float around = 0.25 * (texture(previous, (x + vec2(1.0, 0.0)) / vec2(size)).g + texture(previous, (x - vec2(1.0, 0.0)) / vec2(size)).g
    + texture(previous, (x + vec2(0.0, 1.0)) / vec2(size)).g + texture(previous, (x - vec2(0.0, 1.0)) / vec2(size)).g);
  float film = mix(carried, around, 1.0 - exp(-seconds / 0.5)) * exp(-seconds / 1.6);
  if (drive > 0.0) {
    float portion = smoothstep(0.62, 0.85, noise(vec3(x * 0.3, time * 0.7 + seed)));
    film = mix(film, 1.0, drive * portion * smoothstep(3.5, 1.0, shown) * (1.0 - exp(-seconds / 0.45)));
  }
  result = vec4(d, clamp(film, 0.0, 1.0), shown, thickness / 1100.0);
}
`;

// 8. The film, at device resolution, after bubble/1: mostly transparent,
// near-black films with tempered drainage bands, light at the Fresnel rim
// and on the walls seen edge-on, one window highlight per bubble.
const FILM_FRAGMENT = /* glsl */ `${HEADER}${COMMON}
uniform sampler2D labels;
uniform sampler2D surface;
uniform sampler2D regions;
uniform sampler2D state0;
uniform sampler2D state1;
uniform ivec2 size;
uniform vec2 pixels;
uniform float sitePixels;   // device px per site
uniform float wet;          // liquid threshold on the leading share
out vec4 pixel;

vec3 interference(float t, float c) {
  vec3 lambda = vec3(650.0, 532.0, 450.0);
  vec3 phase = 6.2831853 * 1.33 * t * c / lambda;
  vec3 s = sin(phase);
  return 2.0 * s * s;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 t = vec2(frag.x, pixels.y - frag.y) / pixels * vec2(size);
  ivec2 base = ivec2(floor(t));
  float cssPerSite = ${float(1 / SCALE)};
  // Region of this site: 1 open air, k + 1 inside bubble k (its whole 3 × 3
  // neighbourhood agrees), 0 near a wall, a face or a junction.
  float region = texelFetch(regions, base, 0).r;
  if (region > 0.5 && region < 1.5) {
    pixel = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float owner;
  float toEdge;
  vec2 inward;
  float coverage = 1.0;
  vec2 film;
  vec4 s0;
  float r;
  if (region > 1.5) {
    // Inside one bubble: bilinear reads suffice.
    owner = region - 1.0;
    vec2 uv = t / vec2(size);
    vec2 nudge = vec2(0.75) / vec2(size);
    vec4 here = texture(surface, uv);
    float east = texture(surface, uv + vec2(nudge.x, 0.0)).b;
    float south = texture(surface, uv + vec2(0.0, nudge.y)).b;
    toEdge = here.b * cssPerSite;
    inward = vec2(east - here.b, south - here.b);
    inward /= max(length(inward), 1e-4);
    film = here.ga;
    s0 = texelFetch(state0, slotOf(owner), 0);
    r = sqrt(max(s0.y, 1.0) / 3.14159265) * cssPerSite;
  } else {
    vec2 f = t - vec2(base) - 0.5;
    vec3 wx = vec3(0.5 * (0.5 - f.x) * (0.5 - f.x), 0.75 - f.x * f.x, 0.5 * (0.5 + f.x) * (0.5 + f.x));
    vec3 wy = vec3(0.5 * (0.5 - f.y) * (0.5 - f.y), 0.75 - f.y * f.y, 0.5 * (0.5 + f.y) * (0.5 + f.y));
    vec3 dx = vec3(f.x - 0.5, -2.0 * f.x, 0.5 + f.x);
    vec3 dy = vec3(f.y - 0.5, -2.0 * f.y, 0.5 + f.y);

    vec4 L[9];
    vec4 S[9];
    for (int j = 0; j < 3; j += 1) {
      for (int i = 0; i < 3; i += 1) {
        ivec2 q = clamp(base + ivec2(i - 1, j - 1), ivec2(0), size - 1);
        L[j * 3 + i] = texelFetch(labels, q, 0);
      }
    }
    for (int j = 0; j < 3; j += 1) {
      for (int i = 0; i < 3; i += 1) {
        S[j * 3 + i] = texelFetch(surface, clamp(base + ivec2(i - 1, j - 1), ivec2(0), size - 1), 0);
      }
    }
    // Up to three candidate labels, kept in fixed slots.
    float c0 = L[4].x;
    float c1 = L[4].w > 0.0 ? L[4].z : 0.0;
    float c2 = 0.0;
    for (int k = 0; k < 9; k += 1) {
      for (int side = 0; side < 2; side += 1) {
        float id = side == 0 ? L[k].x : L[k].z;
        float w = side == 0 ? L[k].y : L[k].w;
        if (id < 0.5 || w <= 0.0 || id == c0 || id == c1 || id == c2) continue;
        if (c1 < 0.5) c1 = id;
        else if (c2 < 0.5) c2 = id;
      }
    }
    vec3 chi = vec3(0.0);
    vec2 g0 = vec2(0.0);
    vec2 g1 = vec2(0.0);
    vec2 g2 = vec2(0.0);
    float distance0 = 0.0;
    vec2 distanceGrad = vec2(0.0);
    for (int j = 0; j < 3; j += 1) {
      for (int i = 0; i < 3; i += 1) {
        vec4 l = L[j * 3 + i];
        float w = wx[i] * wy[j];
        vec2 g = vec2(dx[i] * wy[j], wx[i] * dy[j]);
        vec3 own = vec3(
          (l.x == c0 ? l.y : 0.0) + (l.z == c0 ? l.w : 0.0),
          (l.x == c1 ? l.y : 0.0) + (l.z == c1 ? l.w : 0.0),
          (l.x == c2 ? l.y : 0.0) + (l.z == c2 ? l.w : 0.0));
        chi += own * w;
        g0 += own.x * g;
        g1 += own.y * g;
        g2 += own.z * g;
        distance0 += S[j * 3 + i].b * w;
        distanceGrad += S[j * 3 + i].b * g;
      }
    }
    // Leading label a and runner-up b.
    float la = c0;
    float lb = c1;
    float xa = chi.x;
    float xb = chi.y;
    vec2 ga = g0;
    vec2 gb = g1;
    if (chi.y > chi.x) { la = c1; lb = c0; xa = chi.y; xb = chi.x; ga = g1; gb = g0; }
    if (chi.z > xb) {
      if (chi.z > xa) { lb = la; xb = xa; gb = ga; la = c2; xa = chi.z; ga = g2; }
      else { lb = c2; xb = chi.z; gb = g2; }
    }
    float sum = chi.x + chi.y + chi.z;
    // Signed distance (CSS px) to the boundary between a and b.
    float boundary = lb > 0.5 ? (xa - xb) / max(length(ga - gb), 1e-4) * cssPerSite : 1e4;
    // On air beside a bubble, draw that bubble's free face from outside.
    bool air = la < 1.5;
    owner = (air ? lb : la) - 1.0;
    if (owner < 0.5) {
      pixel = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    bool face = air || lb < 1.5;
    float edgeCss = air ? -boundary : boundary;
    // Plateau borders: where three bubbles (or two and the air) meet and no
    // bubble leads clearly, the liquid gathers; it is drawn as an opening to
    // the black, its edge a free face, so the bubbles round off at junctions.
    float share = sum > 0.0 ? xa / sum : 1.0;
    vec2 shareGrad = sum > 0.0 ? (ga * sum - xa * (g0 + g1 + g2)) / (sum * sum) : vec2(0.0);
    float toLiquid = (share - wet) / max(length(shareGrad), 1e-4) * cssPerSite;
    if (!air && toLiquid < edgeCss) {
      edgeCss = toLiquid;
      face = true;
    }

    s0 = texelFetch(state0, slotOf(owner), 0);
    r = sqrt(max(s0.y, 1.0) / 3.14159265) * cssPerSite;
    // Distance to the bubble's edge: exact near it, the relaxed chamfer inside.
    float inside = distance0 * cssPerSite;
    toEdge = air ? edgeCss : mix(edgeCss, inside, smoothstep(2.0, 5.0, edgeCss));
    inward = air ? (gb - ga) : (toLiquid <= boundary ? shareGrad : ga - gb);
    inward = mix(inward, distanceGrad, air ? 0.0 : smoothstep(2.0, 5.0, edgeCss));
    inward /= max(length(inward), 1e-4);
    coverage = face ? smoothstep(-0.7, 0.7, toEdge) : 1.0;

    // Film: drainage thickness plus the transfer film arriving or leaving,
    // read from this bubble's own sites only, so the films of two bubbles
    // never meet on the lattice's staircase at a wall.
    film = vec2(0.0);
    float filmWeight = 0.0;
    for (int j = 0; j < 3; j += 1) {
      for (int i = 0; i < 3; i += 1) {
        float w = wx[i] * wy[j] * (L[j * 3 + i].x == owner + 1.0 ? 1.0 : 0.0);
        film += S[j * 3 + i].ga * w;
        filmWeight += w;
      }
    }
    film = filmWeight > 1e-4 ? film / filmWeight : vec2(0.0, 0.2);
  }

  // A shallow cap: steep at the edge, nearly level inside (bubble/1).
  float e = cssPerSite / sitePixels;   // one device px in CSS px
  float depth = 0.45 * r + 2.0;
  float rise = clamp(toEdge / depth, 0.0, 1.0);
  float h = sqrt(max(1.0 - (1.0 - rise) * (1.0 - rise), 0.0));
  vec2 slope = rise > 0.0 && rise < 1.0 ? e * (1.0 - rise) / max(h, 1e-3) * inward : vec2(0.0);
  float reach = depth * sqrt(min(1.0, 2.0 * e / depth));
  slope = slope / max(1.0, length(slope) / reach);
  vec3 normal = normalize(vec3(-slope, max(h, 0.05) + 0.6));
  float facing = clamp(normal.z, 0.0, 1.0);

  float transferred = film.x;
  float thickness = film.y * 1100.0 + 520.0 * transferred;
  float innerCos = sqrt(max(1.0 - (1.0 - facing * facing) / (1.33 * 1.33), 0.0));
  vec3 colour = interference(thickness, innerCos);
  float grey = dot(colour, vec3(0.3333));
  colour = mix(vec3(grey), colour, 0.3 * smoothstep(150.0, 500.0, thickness));

  // Light: Fresnel at the rim, the film edge-on at walls and faces, and one
  // window highlight where the cap faces the window (and its faint mirror).
  vec3 view = vec3(0.0, 0.0, 1.0);
  float fresnel = 0.05 + 0.95 * pow(1.0 - facing, 5.0);
  vec3 window = normalize(vec3(-0.45, -0.6, 0.66));
  vec2 fromCentre = (t - s0.zw) * cssPerSite;
  float aim = dot(fromCentre / max(length(fromCentre), 1e-3), normalize(window.xy));
  // The window's reflection: one soft spot per bubble, toward the window.
  vec2 spot = fromCentre - normalize(window.xy) * 0.8 * r;
  float front = pow(max(dot(normal, normalize(window + view)), 0.0), 60.0) * exp(-dot(spot, spot) / (0.06 * r * r + 4.0)) * smoothstep(8.0, 22.0, r);
  vec3 mirrored = normalize(vec3(0.45, 0.6, 0.66));
  float back = pow(max(dot(normal, normalize(mirrored + view)), 0.0), 60.0) * 0.25 * smoothstep(0.6, 0.95, -aim);
  float edgeOn = exp(-max(toEdge, 0.0) / 1.8);
  vec3 shade = colour * (0.045 + 0.85 * fresnel + 0.45 * edgeOn + 0.35 * transferred) + vec3(0.04 * transferred) + vec3(1.0) * (front * 0.7 + back);

  float dither = (random3(uint(frag.x), uint(frag.y), 3u) - 0.5) / 255.0;
  pixel = vec4(shade * coverage + dither, 1.0);
}
`;

/** Every shader source, for validation outside the browser (validate-shaders.ts). */
export const SHADERS = {
  fullVertex: FULL_VERTEX,
  sweep: SWEEP_FRAGMENT,
  scatterVertex: SCATTER_VERTEX,
  sum: SUM_FRAGMENT,
  gather: GATHER_FRAGMENT,
  state: STATE_FRAGMENT,
  totalsVertex: TOTALS_VERTEX,
  division: DIVISION_FRAGMENT,
  label: LABEL_FRAGMENT,
  surface: SURFACE_FRAGMENT,
  film: FILM_FRAGMENT,
} as const;

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
      gl.deleteProgram(program);
      throw new Error(`bubble/5 shader: ${log}`);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`bubble/5 program: ${log}`);
  }
  return program;
}

type Program = { program: WebGLProgram; uniforms: Map<string, WebGLUniformLocation | null> };
type Target = { textures: WebGLTexture[]; framebuffer: WebGLFramebuffer };

export type FoamStep = {
  /** Seconds since the last step (sim and film). */
  seconds: number;
  parameters: FoamParameters;
  /** Wetness 0 (dry) – 1 (wet). */
  wet: number;
  /** A bubble to blow this frame, in CSS px, or null. */
  request: { x: number; y: number; nucleus: boolean; serial: number } | null;
};

export type FoamCounts = { bubbles: number; area: number; areaSquared: number };

export type FoamRenderer = {
  /** Sizes the canvas; a new lattice size starts a new foam from `seed`. */
  resize(width: number, height: number, ratio: number, seed: (width: number, height: number) => Lattice): void;
  /** Advances the foam and its film by one frame (skip it to hold still). */
  step(input: FoamStep): void;
  /** Draws the film from the current display state. */
  draw(wet: number): void;
  /** Starts a non-blocking read of the bubble count; returns the last completed one. */
  counts(): FoamCounts | null;
  dispose(): void;
};

export function createFoamRenderer(canvas: HTMLCanvasElement): FoamRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  // Float targets and additive blending into them (the per-bubble reductions).
  if (gl.getExtension("EXT_color_buffer_float") === null || gl.getExtension("EXT_float_blend") === null) return null;

  const programs: Program[] = [];
  const build = (vertex: string, fragment: string): Program => {
    const program = compile(gl, vertex, fragment);
    const entry = { program, uniforms: new Map<string, WebGLUniformLocation | null>() };
    programs.push(entry);
    return entry;
  };
  let sweepProgram: Program;
  let scatterProgram: Program;
  let gatherProgram: Program;
  let stateProgram: Program;
  let totalsProgram: Program;
  let divisionProgram: Program;
  let labelProgram: Program;
  let surfaceProgram: Program;
  let filmProgram: Program;
  try {
    sweepProgram = build(FULL_VERTEX, SWEEP_FRAGMENT);
    scatterProgram = build(SCATTER_VERTEX, SUM_FRAGMENT);
    gatherProgram = build(FULL_VERTEX, GATHER_FRAGMENT);
    stateProgram = build(FULL_VERTEX, STATE_FRAGMENT);
    totalsProgram = build(TOTALS_VERTEX, SUM_FRAGMENT);
    divisionProgram = build(FULL_VERTEX, DIVISION_FRAGMENT);
    labelProgram = build(FULL_VERTEX, LABEL_FRAGMENT);
    surfaceProgram = build(FULL_VERTEX, SURFACE_FRAGMENT);
    filmProgram = build(FULL_VERTEX, FILM_FRAGMENT);
  } catch (error) {
    console.error(error);
    for (const { program } of programs) gl.deleteProgram(program);
    return null;
  }

  const uniform = (entry: Program, name: string) => {
    if (!entry.uniforms.has(name)) entry.uniforms.set(name, gl.getUniformLocation(entry.program, name));
    return entry.uniforms.get(name) ?? null;
  };
  /** Binds textures to units 0.. in order, each to the named sampler. */
  const bindTextures = (entry: Program, textures: readonly [string, WebGLTexture][]) => {
    textures.forEach(([name, texture], unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniform(entry, name), unit);
    });
  };
  const unbindTextures = (count: number) => {
    for (let unit = 0; unit < count; unit += 1) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  };

  const empty = gl.createVertexArray();

  const texture = (width: number, height: number, format: "r32f" | "r16f" | "rgba32f" | "rgba16f", linear: boolean, data: Float32Array | null = null) => {
    const created = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, created);
    if (format === "r32f") gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, width, height, 0, gl.RED, gl.FLOAT, data);
    else if (format === "rgba32f") gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, data);
    else if (format === "r16f") gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, width, height, 0, gl.RED, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return created;
  };
  const target = (textures: WebGLTexture[]): Target => {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    textures.forEach((attached, index) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, attached, 0));
    gl.drawBuffers(textures.map((_, index) => gl.COLOR_ATTACHMENT0 + index));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { textures, framebuffer };
  };
  const release = (targets: readonly Target[]) => {
    for (const { textures, framebuffer } of targets) {
      for (const attached of textures) gl.deleteTexture(attached);
      gl.deleteFramebuffer(framebuffer);
    }
  };

  // Per-bubble state (ping-pong), sums and totals: fixed size.
  const stateTargets = [0, 1].map(() => target([0, 1, 2].map(() => texture(ROW, ROWS, "rgba32f", false)))) as [Target, Target];
  const copies = target([texture(ROW, ROWS * COPIES, "rgba32f", false), texture(ROW, ROWS * COPIES, "rgba32f", false)]);
  const sums = target([texture(ROW, ROWS, "rgba32f", false), texture(ROW, ROWS, "rgba32f", false)]);
  const totals = target([texture(1, 1, "rgba32f", false), texture(1, 1, "rgba32f", false)]);

  // Lattice-sized targets, made on resize.
  let lattices: [Target, Target] | null = null;
  let labelTargets: [Target, Target] | null = null;
  let surfaceTargets: [Target, Target] | null = null;
  let size = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };
  let ratio = 1;
  let state: [Target, Target] = stateTargets;
  let frame = 0;
  let sweep = 0;
  let time = 0;
  let tick = 0;
  let pendingSeconds = 0;

  const fullPass = (framebuffer: WebGLFramebuffer | null, width: number, height: number) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, width, height);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  /**
   * A lattice pass over the band the raft can occupy: the bowl keeps every
   * bubble within 0.6 of the screen's height from its middle (ρ < 1), so
   * the air beyond (both ping-pong textures hold air there) is never shaded.
   */
  const latticePass = (framebuffer: WebGLFramebuffer) => {
    const reach = Math.ceil(0.6 * size.height * RAFT_REACH);
    const left = Math.max(0, Math.floor(size.width / 2) - reach);
    const right = Math.min(size.width, Math.ceil(size.width / 2) + reach);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(left, 0, right - left, size.height);
    fullPass(framebuffer, size.width, size.height);
    gl.disable(gl.SCISSOR_TEST);
  };

  const releaseLattice = () => {
    for (const pair of [lattices, labelTargets, surfaceTargets]) if (pair) release(pair);
    lattices = labelTargets = surfaceTargets = null;
  };

  /** Uploads a new foam: its ids, and per bubble its gas = area and centroid. */
  const start = (foam: Lattice) => {
    releaseLattice();
    const { width, height } = foam;
    size = { width, height };
    const ids = Float32Array.from(foam.ids);
    lattices = [target([texture(width, height, "r32f", false, ids)]), target([texture(width, height, "r32f", false)])];
    labelTargets = [target([texture(width, height, "rgba16f", false)]), target([texture(width, height, "rgba16f", false)])];
    surfaceTargets = [
      target([texture(width, height, "rgba16f", true), texture(width, height, "r16f", false)]),
      target([texture(width, height, "rgba16f", true), texture(width, height, "r16f", false)]),
    ];
    const area = new Float64Array(MAX_IDS);
    const sx = new Float64Array(MAX_IDS);
    const sy = new Float64Array(MAX_IDS);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const id = foam.ids[y * width + x]!;
        area[id] = area[id]! + 1;
        sx[id] = sx[id]! + x + 0.5;
        sy[id] = sy[id]! + y + 0.5;
      }
    }
    const s0 = new Float32Array(MAX_IDS * 4);
    const s1 = new Float32Array(MAX_IDS * 4);
    const s2 = new Float32Array(MAX_IDS * 4);
    for (let id = 1; id < MAX_IDS; id += 1) {
      if (area[id] === 0) continue;
      s0.set([area[id]!, area[id]!, sx[id]! / area[id]!, sy[id]! / area[id]!], id * 4);
      // Born long ago: the first foam's films start drained.
      s1.set([0, -100, 0, 0], id * 4);
      s2.set([1, 0, 0, 4.5 * Math.sqrt(area[id]!)], id * 4);
    }
    for (const set of stateTargets) {
      [s0, s1, s2].forEach((data, index) => {
        gl.bindTexture(gl.TEXTURE_2D, set.textures[index]!);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW, ROWS, gl.RGBA, gl.FLOAT, data);
      });
    }
    state = stateTargets;
    gl.bindTexture(gl.TEXTURE_2D, totals.textures[0]!);
    // The totals texel starts with the first foam's gas: its bubbles' area.
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, gl.FLOAT, new Float32Array([width * height - area[0]!, 0, 0, 0]));
    for (const pair of [labelTargets, surfaceTargets]) {
      for (const set of pair) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, set.framebuffer);
        set.textures.forEach((_, index) => gl.clearBufferfv(gl.COLOR, index, [0, 0, 0, 0]));
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    frame = 0;
    // The display starts settled: labels taken whole, distance relaxed.
    for (let pass = 0; pass < 24; pass += 1) display(0, 1, 1, 0);
  };

  const resize: FoamRenderer["resize"] = (width, height, nextRatio, seed) => {
    ratio = nextRatio;
    pixels = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    const latticeWidth = Math.max(8, Math.round(width * SCALE));
    const latticeHeight = Math.max(8, Math.round(height * SCALE));
    if (!lattices || latticeWidth !== size.width || latticeHeight !== size.height) start(seed(latticeWidth, latticeHeight));
  };

  /** Labels and surface from the current lattice (display only). */
  const display = (seconds: number, labelBlend: number, distanceBlend: number, transfer: number) => {
    if (!lattices || !labelTargets || !surfaceTargets) return;
    const lattice = lattices[0].textures[0]!;
    // Labels.
    gl.useProgram(labelProgram.program);
    bindTextures(labelProgram, [["lattice", lattice], ["previous", labelTargets[0].textures[0]!]]);
    gl.uniform2i(uniform(labelProgram, "size"), size.width, size.height);
    gl.uniform1f(uniform(labelProgram, "blend"), labelBlend);
    gl.uniform1f(uniform(labelProgram, "sigma"), LABEL_SIGMA);
    latticePass(labelTargets[1].framebuffer);
    unbindTextures(2);
    labelTargets = [labelTargets[1], labelTargets[0]];
    // Surface.
    gl.useProgram(surfaceProgram.program);
    bindTextures(surfaceProgram, [
      ["lattice", lattice],
      ["previous", surfaceTargets[0].textures[0]!],
      ["labels", labelTargets[0].textures[0]!],
      ["state0", state[0].textures[0]!],
      ["state1", state[0].textures[1]!],
    ]);
    gl.uniform2i(uniform(surfaceProgram, "size"), size.width, size.height);
    gl.uniform1f(uniform(surfaceProgram, "seconds"), seconds);
    gl.uniform1f(uniform(surfaceProgram, "time"), time);
    gl.uniform1f(uniform(surfaceProgram, "smoothing"), distanceBlend);
    gl.uniform1f(uniform(surfaceProgram, "transfer"), transfer);
    latticePass(surfaceTargets[1].framebuffer);
    unbindTextures(5);
    surfaceTargets = [surfaceTargets[1], surfaceTargets[0]];
  };

  const step: FoamRenderer["step"] = ({ seconds: shown, parameters, request }) => {
    if (!lattices) return;
    // The foam itself steps on every other frame (SIM_EVERY), with the time
    // of both; the display eases every frame, so the step rate never shows.
    pendingSeconds += shown;
    tick += 1;
    if (tick % SIM_EVERY !== 0 && !request) {
      display(shown, 1 - Math.exp(-shown / LABEL_SECONDS), 1 - Math.exp(-shown / DISTANCE_SECONDS), TRANSFER_SPEED * Math.sqrt(parameters.diffusion / 0.5));
      return;
    }
    const seconds = Math.min(pendingSeconds, 1 / 15);
    pendingSeconds = 0;
    const skip = (globalThis as unknown as { __b5skip?: number }).__b5skip ?? 0; // TEMP profiling
    const latticeArea = size.width * size.height;
    time += seconds;
    gl.disable(gl.DEPTH_TEST);
    const requestUniform: [number, number, number, number] = request
      ? [request.x * SCALE, request.y * SCALE, request.nucleus ? NUCLEUS_RADIUS : BLOW_RADIUS, request.serial]
      : [0, 0, 0, 0];

    // 1. Scatter.
    if (!(skip & 1)) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, copies.framebuffer);
    gl.viewport(0, 0, ROW, ROWS * COPIES);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
    gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 0]);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(scatterProgram.program);
    bindTextures(scatterProgram, [
      ["lattice", lattices[0].textures[0]!],
      ["state0", state[0].textures[0]!],
      ["state2", state[0].textures[2]!],
    ]);
    gl.uniform2i(uniform(scatterProgram, "size"), size.width, size.height);
    gl.uniform1f(uniform(scatterProgram, "stiffness"), parameters.stiffness);
    gl.uniform1f(uniform(scatterProgram, "rate"), parameters.diffusion * seconds);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.POINTS, 0, latticeArea);
    gl.disable(gl.BLEND);
    unbindTextures(3);
    }
    gl.useProgram(gatherProgram.program);
    bindTextures(gatherProgram, [["copies0", copies.textures[0]!], ["copies1", copies.textures[1]!]]);
    fullPass(sums.framebuffer, ROW, ROWS);
    unbindTextures(2);

    // 2. State.
    const [from, to] = state;
    gl.useProgram(stateProgram.program);
    bindTextures(stateProgram, [
      ["previous0", from.textures[0]!],
      ["previous1", from.textures[1]!],
      ["previous2", from.textures[2]!],
      ["sums0", sums.textures[0]!],
      ["sums1", sums.textures[1]!],
      ["totals", totals.textures[0]!],
      ["lattice", lattices[0].textures[0]!],
    ]);
    gl.uniform2i(uniform(stateProgram, "size"), size.width, size.height);
    gl.uniform1i(uniform(stateProgram, "rotation"), rotationFor(frame));
    gl.uniform1ui(uniform(stateProgram, "frame"), frame);
    gl.uniform1f(uniform(stateProgram, "time"), time);
    gl.uniform1f(uniform(stateProgram, "splitArea"), parameters.splitArea);
    gl.uniform1f(uniform(stateProgram, "targetArea"), COVERAGE * latticeArea);
    gl.uniform4f(uniform(stateProgram, "request"), ...requestUniform);
    fullPass(to.framebuffer, ROW, ROWS);
    unbindTextures(7);
    state = [to, from];

    // 3. Totals.
    gl.bindFramebuffer(gl.FRAMEBUFFER, totals.framebuffer);
    gl.viewport(0, 0, 1, 1);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
    gl.enable(gl.BLEND);
    gl.useProgram(totalsProgram.program);
    bindTextures(totalsProgram, [["state0", state[0].textures[0]!]]);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.POINTS, 0, MAX_IDS);
    gl.disable(gl.BLEND);
    unbindTextures(1);

    // 4. Division.
    gl.useProgram(divisionProgram.program);
    bindTextures(divisionProgram, [
      ["lattice", lattices[0].textures[0]!],
      ["state0", state[0].textures[0]!],
      ["state1", state[0].textures[1]!],
      ["state2", state[0].textures[2]!],
    ]);
    gl.uniform2i(uniform(divisionProgram, "size"), size.width, size.height);
    gl.uniform4f(uniform(divisionProgram, "request"), ...requestUniform);
    latticePass(lattices[1].framebuffer);
    unbindTextures(4);
    lattices = [lattices[1], lattices[0]];

    // 5. Sweeps.
    gl.useProgram(sweepProgram.program);
    gl.uniform2i(uniform(sweepProgram, "size"), size.width, size.height);
    gl.uniform1f(uniform(sweepProgram, "temperature"), parameters.temperature);
    gl.uniform1f(uniform(sweepProgram, "stiffness"), parameters.stiffness);
    gl.uniform1f(uniform(sweepProgram, "time"), time);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, state[0].textures[0]!);
    gl.uniform1i(uniform(sweepProgram, "state0"), 1);
    gl.uniform1i(uniform(sweepProgram, "lattice"), 0);
    for (let index = 0; index < (skip & 2 ? 0 : parameters.sweeps); index += 1) {
      const order = classOrder(sweep);
      for (let pass = 0; pass < 9; pass += 1) {
        const k = order[pass]!;
        gl.uniform2i(uniform(sweepProgram, "phase"), k % 3, Math.floor(k / 3));
        gl.uniform1ui(uniform(sweepProgram, "passIndex"), (sweep * 9 + pass) >>> 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, lattices[0].textures[0]!);
        latticePass(lattices[1].framebuffer);
        gl.bindTexture(gl.TEXTURE_2D, null);
        lattices = [lattices[1], lattices[0]];
      }
      sweep += 1;
    }
    unbindTextures(2);
    frame += 1;

    // 6, 7. Display state.
    // The transfer film moves at a pace set by the gas diffusion.
    if (!(skip & 4)) display(shown, 1 - Math.exp(-shown / LABEL_SECONDS), 1 - Math.exp(-shown / DISTANCE_SECONDS), TRANSFER_SPEED * Math.sqrt(parameters.diffusion / 0.5));
  };

  const draw: FoamRenderer["draw"] = (wet) => {
    if (!labelTargets || !surfaceTargets) return;
    const skipDraw = (globalThis as unknown as { __b5skip?: number }).__b5skip ?? 0; // TEMP profiling
    if (skipDraw & 8) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, pixels.width, pixels.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    gl.useProgram(filmProgram.program);
    bindTextures(filmProgram, [
      ["labels", labelTargets[0].textures[0]!],
      ["surface", surfaceTargets[0].textures[0]!],
      ["regions", surfaceTargets[0].textures[1]!],
      ["state0", state[0].textures[0]!],
      ["state1", state[0].textures[1]!],
    ]);
    gl.uniform2i(uniform(filmProgram, "size"), size.width, size.height);
    gl.uniform2f(uniform(filmProgram, "pixels"), pixels.width, pixels.height);
    gl.uniform1f(uniform(filmProgram, "sitePixels"), pixels.width / size.width);
    gl.uniform1f(uniform(filmProgram, "wet"), thresholdFor(wet));
    // Black everywhere, then the film over the band the raft can occupy.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const reach = Math.ceil(0.6 * size.height * RAFT_REACH * (pixels.width / size.width));
    const left = Math.max(0, Math.floor(pixels.width / 2) - reach);
    const right = Math.min(pixels.width, Math.ceil(pixels.width / 2) + reach);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(left, 0, right - left, pixels.height);
    fullPass(null, pixels.width, pixels.height);
    gl.disable(gl.SCISSOR_TEST);
    unbindTextures(5);
  };

  // Non-blocking read of the totals texel (16 bytes) for the screen-reader summary.
  const readBuffer = gl.createBuffer();
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, readBuffer);
  gl.bufferData(gl.PIXEL_PACK_BUFFER, 16, gl.STREAM_READ);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  let pending: WebGLSync | null = null;
  let latest: FoamCounts | null = null;
  const values = new Float32Array(4);
  const counts: FoamRenderer["counts"] = () => {
    if (pending) {
      const status = gl.clientWaitSync(pending, 0, 0);
      if (status === gl.TIMEOUT_EXPIRED) return latest;
      gl.deleteSync(pending);
      pending = null;
      if (status !== gl.WAIT_FAILED) {
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, readBuffer);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, values);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        latest = { bubbles: Math.round(values[1]!), area: values[3]!, areaSquared: values[2]! };
      }
      return latest;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, totals.framebuffer);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, readBuffer);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    pending = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    return latest;
  };

  const dispose = () => {
    if (pending) gl.deleteSync(pending);
    gl.deleteBuffer(readBuffer);
    releaseLattice();
    release([...stateTargets, copies, sums, totals]);
    gl.deleteVertexArray(empty);
    for (const { program } of programs) gl.deleteProgram(program);
  };

  return { resize, step, draw, counts, dispose };
}

/** Wetness → the leading label's share below which a pixel is liquid (⅓ at a junction, ½ on a wall). */
export function thresholdFor(wet: number) {
  return 0.36 + 0.12 * Math.min(1, Math.max(0, wet));
}
