/**
 * Pass A (field): each body adds a soft kernel into a half-resolution float
 * field; the colony surface is one threshold of that sum, so contacts fuse and
 * division necks part without any switch between shapes.
 * Pass B (owner): the nearest body per pixel, used only for interior detail
 * (nucleus, granules, creases) that fades out before owners can change.
 * Composite: the field's height lights a gel that refracts and absorbs the lawn.
 */

/** Kernel support in body radii; the membrane sits at radius 1. */
export const SUPPORT = 1.35;
/** Field value on the membrane of an isolated body. */
export const THRESHOLD = Math.pow(1 - 1 / (SUPPORT * SUPPORT), 3);
/** Owner pass reach in body radii: interior detail ends inside this. */
export const OWNER_REACH = 1.2;

/**
 * Per-body shape terms are constant over a body, so the vertex shader computes
 * them once per instance; fragments only evaluate dot products.
 */
export const bodyVertexShader = /* glsl */ `
precision highp float;
in vec3 position;
in vec4 aBody;   // x, y, radius, heading
in vec4 aShape;  // phase, cyst, presence, seed
in vec4 aMotion; // age, index, unused, unused
uniform vec2 uScale;
uniform float uTime;
uniform float uReach;
out vec2 vLocal;          // heading frame, body radii
flat out vec4 vLead;      // leading lobe direction, amplitude, wobble
flat out vec4 vSideA;     // lobe 1 direction, amplitude, lobe amount
flat out vec4 vSideB;     // lobe 2 direction, amplitude, breathing
flat out vec4 vSideC;     // lobe 3 direction, amplitude, division phase
flat out float vSlot;

vec2 direction(float angle) {
  return vec2(cos(angle), sin(angle));
}

void main() {
  float phase = aShape.x;
  float cyst = aShape.y;
  float seed = aShape.w;
  float age = aMotion.x;
  float t = uTime;

  float lobeAmount = (1.0 - cyst) * smoothstep(0.0, 0.8, age) * (1.0 - smoothstep(0.0, 0.35, phase));
  float wobble = exp(-age * 3.0) * sin(age * 14.0) * 0.28;
  float lead = 0.3 * (0.7 + 0.3 * sin(t * 0.9 + seed * 2.1));
  vLead = vec4(direction(0.4 * sin(t * 0.5 + seed)), lead, wobble);
  float amp0 = 0.17 * (0.5 + 0.5 * sin(t * 0.6 + seed * 1.7));
  float amp1 = 0.17 * (0.5 + 0.5 * sin(t * 0.6 + seed * 1.7 + 2.3));
  float amp2 = 0.17 * (0.5 + 0.5 * sin(t * 0.6 + seed * 1.7 + 4.6));
  vSideA = vec4(direction(seed * 3.1 + 0.7 * sin(t * 0.3 + seed)), amp0, lobeAmount);
  vSideB = vec4(direction(seed * 3.1 + 2.1 + 0.7 * sin(t * 0.3 + seed + 1.0)), amp1, 0.02 * sin(t * 2.1 + seed * 5.0));
  vSideC = vec4(direction(seed * 3.1 + 4.2 + 0.7 * sin(t * 0.3 + seed + 2.0)), amp2, phase);
  vSlot = aMotion.y;

  // The quad only covers how far this body can actually reach right now.
  float stretch = (1.0 + lobeAmount * (lead + amp0 + amp1 + amp2) + 0.02) * (1.0 + abs(wobble));
  float extent = uReach * stretch + 0.64 * smoothstep(0.0, 1.0, phase);
  vec2 corner = position.xy * extent;
  float h = aBody.w;
  vLocal = mat2(cos(h), -sin(h), sin(h), cos(h)) * corner;
  float size = aBody.z * mix(1.0, 0.82, cyst) * mix(0.35, 1.0, aShape.z);
  gl_Position = vec4((aBody.xy + corner * size) * uScale, 0.0, 1.0);
}
`;

const bodyFragmentHead = /* glsl */ `
precision highp float;
in vec2 vLocal;
flat in vec4 vLead;
flat in vec4 vSideA;
flat in vec4 vSideB;
flat in vec4 vSideC;
flat in float vSlot;
out vec4 color;

float lobe4(vec2 n, vec2 axis) {
  float c = max(dot(n, axis), 0.0);
  c *= c;
  return c * c;
}

float lobe7(vec2 n, vec2 axis) {
  float c = max(dot(n, axis), 0.0);
  float c2 = c * c;
  return c2 * c2 * c2 * c;
}

// Distance in body radii (1 = membrane) of a crawling body in its heading frame.
float crawling(vec2 q) {
  float wobble = vLead.w;
  q.x /= 1.0 + wobble;
  q.y *= 1.0 + wobble * 0.8;
  float len = length(q);
  vec2 n = q / max(len, 1e-5);
  float lobes = vLead.z * lobe4(n, vLead.xy)
    + vSideA.z * lobe7(n, vSideA.xy) + vSideB.z * lobe7(n, vSideB.xy) + vSideC.z * lobe7(n, vSideC.xy);
  return len / (1.0 + vSideA.w * lobes + vSideB.w);
}

float kernel(float d) {
  float s = 1.0 - d * d / ${(SUPPORT * SUPPORT).toFixed(4)};
  return s > 0.0 ? s * s * s : 0.0;
}
`;

export const fieldFragment = /* glsl */ `${bodyFragmentHead}
void main() {
  float phase = vSideC.w;
  float f;
  if (phase <= 0.0) {
    f = kernel(crawling(vLocal));
  } else {
    // Halves part across the heading; their sum keeps the neck continuous.
    float e = smoothstep(0.0, 1.0, phase);
    vec2 apart = vec2(0.0, 0.64 * e);
    float radius = mix(1.0, 0.707, e);
    f = mix(0.5, 1.0, e) * (kernel(crawling((vLocal - apart) / radius)) + kernel(crawling((vLocal + apart) / radius)));
  }
  if (f <= 0.0) discard;
  color = vec4(f, 0.0, 0.0, 1.0);
}
`;

export const ownerFragment = /* glsl */ `${bodyFragmentHead}
void main() {
  float phase = vSideC.w;
  float nearest;
  if (phase <= 0.0) {
    nearest = crawling(vLocal);
  } else {
    float e = smoothstep(0.0, 1.0, phase);
    vec2 apart = vec2(0.0, 0.64 * e);
    float radius = mix(1.0, 0.707, e);
    nearest = min(crawling((vLocal - apart) / radius), crawling((vLocal + apart) / radius));
  }
  if (nearest > ${OWNER_REACH.toFixed(2)}) discard;
  gl_FragDepth = nearest / ${OWNER_REACH.toFixed(2)};
  float slot = vSlot + 1.0;
  color = vec4(floor(slot / 256.0) / 255.0, mod(slot, 256.0) / 255.0, nearest / ${OWNER_REACH.toFixed(2)}, 1.0);
}
`;

export const compositeVertex = /* glsl */ `
precision highp float;
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const compositeFragment = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform sampler2D uField;   // pass A, half resolution, linear
uniform sampler2D uOwner;   // pass B, full resolution, nearest
uniform sampler2D uData;    // per body: (x, y, heading, radius), (cyst, lineage, seed, phase)
uniform sampler2D uFood;    // food / capacity, pre-blurred
uniform sampler2D uGrain;   // baked lawn grain: film (R), fine (G)
uniform vec2 uResolution;
uniform float uRadius;      // dish radius in pixels
uniform float uCellPx;      // newborn radius in pixels
uniform float uCellWorld;   // newborn radius in dish units
uniform float uDataWidth;
out vec4 color;

const float THRESHOLD = ${THRESHOLD.toFixed(5)};
const vec3 PAGE = vec3(0.900, 0.896, 0.882);
const vec3 CLEARED = vec3(0.905, 0.902, 0.872);
const vec3 LAWN = vec3(0.735, 0.722, 0.655);
const vec3 LIGHT = vec3(-0.42, 0.55, 0.72);

vec3 lineageTint(float lineage) {
  int i = int(mod(lineage, 6.0));
  if (i == 0) return vec3(0.86, 0.66, 0.58);
  if (i == 1) return vec3(0.64, 0.72, 0.84);
  if (i == 2) return vec3(0.68, 0.79, 0.66);
  if (i == 3) return vec3(0.86, 0.78, 0.58);
  if (i == 4) return vec3(0.76, 0.68, 0.82);
  return vec3(0.62, 0.78, 0.78);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Food arrives pre-blurred; grain is baked once in dish space (see grainFragment).
vec3 lawnAt(vec2 world) {
  vec2 uv = world * 0.5 + 0.5;
  float food = texture(uFood, uv).r;
  vec2 grain = texture(uGrain, uv).rg;
  vec3 base = mix(CLEARED, LAWN, food);
  return base * (1.0 - 0.07 * food * (grain.r - 0.5) - 0.035 * food * (grain.g - 0.5));
}

float fieldAt(vec2 frag) {
  return texture(uField, frag / uResolution).r;
}

vec4 bodyData(float slot, float row) {
  return texelFetch(uData, ivec2(int(mod(slot, uDataWidth)), int(floor(slot / uDataWidth) * 2.0 + row)), 0);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 world = (frag - 0.5 * uResolution) / uRadius;
  float r = length(world);
  if (r > 1.0 + 1.0 / uRadius) {
    color = vec4(PAGE, 1.0);
    return;
  }

  float field = fieldAt(frag);
  vec3 light = normalize(LIGHT);

  // Agar with a soft shadow and a faint contact darkening around bodies.
  vec2 toward = normalize(light.xy) * uCellPx;
  float caster = max(fieldAt(frag + toward * 0.3), fieldAt(frag + toward * 0.65) * 0.8);
  vec3 ground = lawnAt(world);
  ground *= 1.0 - 0.18 * smoothstep(THRESHOLD * 0.25, THRESHOLD * 1.6, caster);
  ground *= 1.0 - 0.07 * smoothstep(0.0, THRESHOLD, field);

  float width = max(fwidth(field), 1e-4) * 0.8;
  float coverage = smoothstep(THRESHOLD - width, THRESHOLD + width, field);
  vec3 shade = ground;

  if (coverage > 0.0) {
    // Height from the field: a plump dome with a steep, refracting rim.
    float u = clamp((field - THRESHOLD) / (1.0 - THRESHOLD), 0.0, 1.0);
    float h = 0.7 * sqrt(u);
    float slope = 0.35 / max(sqrt(u), 0.14) / (1.0 - THRESHOLD);
    float gx = fieldAt(frag + vec2(1.0, 0.0)) - fieldAt(frag - vec2(1.0, 0.0));
    float gy = fieldAt(frag + vec2(0.0, 1.0)) - fieldAt(frag - vec2(0.0, 1.0));
    vec3 normal = normalize(vec3(-gx * slope * uCellPx * 0.5, -gy * slope * uCellPx * 0.5, 1.0));

    // Interior detail from the nearest body, faded well before its border.
    vec4 owner = texture(uOwner, frag / uResolution);
    float slot = floor(owner.r * 255.0 + 0.5) * 256.0 + floor(owner.g * 255.0 + 0.5) - 1.0;
    float nearest = owner.b * 1.2;
    float cyst = 0.0;
    float nucleus = 0.0;
    float grains = 0.0;
    vec3 tint = vec3(0.86, 0.84, 0.80);
    float crease = 0.0;
    if (slot >= 0.0) {
      vec4 a = bodyData(slot, 0.0);
      vec4 b = bodyData(slot, 1.0);
      cyst = b.x;
      tint = mix(vec3(0.88, 0.86, 0.82), lineageTint(b.y), 0.35);
      vec2 local = (world - a.xy) / a.w;
      local = mat2(cos(a.z), -sin(a.z), sin(a.z), cos(a.z)) * local;
      float inner = 1.0 - smoothstep(0.5, 0.8, nearest);
      float apart = 0.64 * smoothstep(0.0, 1.0, b.w);
      float split = smoothstep(0.0, 0.25, b.w);
      vec2 n1 = mix(vec2(-0.22, 0.0), vec2(0.0, apart), split);
      vec2 n2 = mix(vec2(-0.22, 0.0), vec2(0.0, -apart), split);
      float ns = mix(1.0, 0.75, b.w);
      nucleus = max(1.0 - smoothstep(0.2 * ns, 0.29 * ns, length(local - n1)), 1.0 - smoothstep(0.2 * ns, 0.29 * ns, length(local - n2)));
      nucleus *= inner * (1.0 - cyst);
      vec2 grid = local * 15.0 + b.z * 7.0;
      vec2 cell = floor(grid);
      vec2 spot = cell + 0.3 + 0.4 * vec2(hash(cell), hash(cell + 17.0));
      grains = (1.0 - smoothstep(0.07, 0.17, length(grid - spot))) * step(0.4, hash(cell + 5.0)) * inner * (1.0 - nucleus);
      crease = smoothstep(0.86, 1.08, nearest);
    }

    // Light through the gel: refracted lawn, absorbed with depth, milky scatter.
    float refraction = uCellWorld * 0.9 * h;
    vec3 seen = vec3(
      lawnAt(world + normal.xy * refraction * 0.94).r,
      lawnAt(world + normal.xy * refraction).g,
      lawnAt(world + normal.xy * refraction * 1.06).b
    );
    vec3 sigma = mix(vec3(0.55, 0.7, 1.0), vec3(1.5, 2.1, 3.0), cyst) * (1.0 + 1.2 * nucleus + 0.9 * grains);
    vec3 transmit = exp(-sigma * h * 1.4);
    float scatter = (1.0 - transmit.g) * (0.5 + 0.2 * cyst);
    vec3 milk = mix(tint, vec3(0.72, 0.58, 0.40), cyst) * (0.78 + 0.22 * dot(normal, light));
    vec3 gel = seen * transmit + milk * scatter;
    gel *= 1.0 - 0.22 * crease * (1.0 - cyst);

    // Wet surface: fresnel reflection of a soft area light over a pale room.
    vec3 reflected = reflect(vec3(0.0, 0.0, -1.0), normal);
    float facing = max(dot(reflected, light), 0.0);
    float fresnel = 0.03 + 0.97 * pow(1.0 - normal.z, 5.0);
    float softbox = smoothstep(0.86, 0.975, facing);
    vec3 room = mix(vec3(0.78, 0.77, 0.74), vec3(0.97, 0.96, 0.94), reflected.z * 0.5 + 0.5);
    gel = mix(gel, room, fresnel * 0.55);
    gel += (softbox * 0.42 + pow(facing, 10.0) * 0.06) * (1.0 - 0.6 * cyst);

    shade = mix(ground, gel, coverage);
  }

  // The dish wall: a narrow meniscus.
  float wall = 1.0 - smoothstep(0.0, 2.0, abs(r - 1.0) * uRadius);
  shade = mix(shade, shade * 0.84, wall);
  color = vec4(shade, 1.0);
}
`;

/** Draws the static lawn grain once into dish-space texture coordinates. */
export const grainFragment = /* glsl */ `
precision highp float;
uniform vec2 uSize;
out vec4 color;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}

void main() {
  vec2 world = gl_FragCoord.xy / uSize * 2.0 - 1.0;
  float film = noise(world * 75.0) * 0.6 + noise(world * 21.0) * 0.4;
  color = vec4(film, noise(world * 260.0), 0.0, 1.0);
}
`;
