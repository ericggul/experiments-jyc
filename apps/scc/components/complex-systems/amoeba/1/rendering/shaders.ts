/**
 * Pass 1 draws each cell as a soft body (crawling pseudopods, a pinching
 * dumbbell while dividing, a damped wobble after birth). It writes normalized
 * distance as depth so the nearest body owns a pixel, and stores slot + 1 (RG)
 * and a 16-bit body height (BA).
 * Pass 2 lights that height field as a translucent gel over the lawn.
 */

/** Quad extent in cell radii; room for lobes, wobble and dividing halves. */
export const QUAD_EXTENT = 2.0;

export const cellVertex = /* glsl */ `
precision highp float;
in vec3 position;
in vec4 aBody;    // x, y, radius, heading
in vec4 aState;   // state, phase, slot, seed
in vec2 aMotion;  // seconds since birth, mass
uniform vec2 uScale;
out vec2 vLocal;
flat out vec4 vBody;
flat out vec4 vState;
flat out vec2 vMotion;
void main() {
  vLocal = position.xy * ${QUAD_EXTENT.toFixed(1)};
  vBody = aBody;
  vState = aState;
  vMotion = aMotion;
  gl_Position = vec4((aBody.xy + vLocal * aBody.z) * uScale, 0.0, 1.0);
}
`;

export const cellFragment = /* glsl */ `
precision highp float;
in vec2 vLocal;
flat in vec4 vBody;
flat in vec4 vState;
flat in vec2 vMotion;
uniform float uTime;
out vec4 color;

float smin(float a, float b, float k) {
  if (k <= 0.0) return min(a, b);
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Crawling body in its own frame (x = heading), distance in radii.
float crawling(vec2 q, float seed, float age) {
  // Damped jelly wobble after birth, stretched along the division axis.
  float wobble = exp(-age * 3.2) * cos(age * 15.0) * 0.3;
  q.x /= 1.0 + wobble;
  q.y *= 1.0 + wobble * 0.8;
  float a = atan(q.y, q.x);
  float t = uTime;
  float lobes = 0.34 * pow(max(cos(a - 0.4 * sin(t * 0.5 + seed)), 0.0), 4.0) * (0.7 + 0.3 * sin(t * 0.9 + seed * 2.1));
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float angle = seed * 3.1 + fk * 2.1 + 0.7 * sin(t * 0.3 + seed + fk);
    float amp = 0.2 * (0.5 + 0.5 * sin(t * 0.6 + seed * 1.7 + fk * 2.3));
    lobes += amp * pow(max(cos(a - angle), 0.0), 7.0);
  }
  float breathe = 0.025 * sin(t * 2.1 + seed * 5.0);
  return length(q) / (1.0 + lobes + breathe);
}

// Dividing: the halves part across the heading, a neck pinches and closes.
float dividing(vec2 q, float phase) {
  float e = smoothstep(0.0, 1.0, phase);
  float apart = 0.64 * e;
  float radius = mix(1.0, 0.707, e);
  float a = length(q - vec2(0.0, apart)) / radius;
  float b = length(q + vec2(0.0, apart)) / radius;
  float d = smin(a, b, 0.4 * (1.0 - smoothstep(0.5, 0.9, phase)));
  float pinch = 0.55 * smoothstep(0.25, 0.95, phase);
  return d + pinch * exp(-q.y * q.y / 0.035) * smoothstep(0.2, 0.6, length(q));
}

void main() {
  float state = vState.x;
  float heading = vBody.w;
  vec2 q = mat2(cos(heading), -sin(heading), sin(heading), cos(heading)) * vLocal;
  float d;
  float h;
  float thick = 0.55 + 0.25 * clamp(vMotion.y / 2.0, 0.0, 1.0);
  if (state > 1.5) {
    d = length(q) / 0.8;
    h = 0.9 * smoothstep(1.0, 0.72, d) * (0.85 + 0.15 * (1.0 - d * d));
  } else {
    d = state > 0.5 ? dividing(q, vState.y) : crawling(q, vState.w, vMotion.x);
    h = thick * pow(max(1.0 - d * d, 0.0), 0.65);
  }
  if (d > 1.0) discard;
  gl_FragDepth = d;
  float slot = vState.z + 1.0;
  float height = floor(clamp(h, 0.0, 0.999) * 65535.0);
  color = vec4(floor(slot / 256.0) / 255.0, mod(slot, 256.0) / 255.0, floor(height / 256.0) / 255.0, mod(height, 256.0) / 255.0);
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
uniform sampler2D uCells;   // pass 1
uniform sampler2D uData;    // per slot: (x, y, heading, radius), (state, lineage, seed, phase)
uniform sampler2D uFood;    // food / capacity
uniform vec2 uResolution;
uniform float uRadius;      // dish radius in pixels
uniform float uCellPx;      // newborn radius in pixels
uniform float uDataWidth;
out vec4 color;

const vec3 PAGE = vec3(0.905, 0.900, 0.885);
const vec3 EATEN = vec3(0.925, 0.918, 0.892);
const vec3 LAWN = vec3(0.760, 0.748, 0.690);
const vec3 GEL = vec3(0.700, 0.690, 0.650);
const vec3 CYST = vec3(0.540, 0.440, 0.320);
const vec3 LIGHT = vec3(-0.45, 0.55, 0.70);

vec3 lineageTint(float lineage) {
  int i = int(mod(lineage, 6.0));
  if (i == 0) return vec3(0.80, 0.45, 0.36);
  if (i == 1) return vec3(0.40, 0.53, 0.72);
  if (i == 2) return vec3(0.48, 0.64, 0.46);
  if (i == 3) return vec3(0.80, 0.64, 0.34);
  if (i == 4) return vec3(0.62, 0.48, 0.68);
  return vec3(0.36, 0.62, 0.62);
}

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

vec4 cellsAt(vec2 frag) {
  return texture(uCells, frag / uResolution);
}

float slotOf(vec4 c) {
  return floor(c.r * 255.0 + 0.5) * 256.0 + floor(c.g * 255.0 + 0.5) - 1.0;
}

float heightOf(vec4 c) {
  return (floor(c.b * 255.0 + 0.5) * 256.0 + floor(c.a * 255.0 + 0.5)) / 65535.0;
}

float heightAt(vec2 frag) {
  return heightOf(cellsAt(frag));
}

vec4 slotData(float slot, float row) {
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

  // Lawn: turbid where bacteria remain, a faint film texture inside it.
  vec2 foodUv = world * 0.5 + 0.5;
  vec2 texel = 0.6 / vec2(textureSize(uFood, 0));
  float food = 0.25 * (texture(uFood, foodUv + texel).r + texture(uFood, foodUv - texel).r
    + texture(uFood, foodUv + vec2(texel.x, -texel.y)).r + texture(uFood, foodUv + vec2(-texel.x, texel.y)).r);
  float film = noise(world * 70.0) * 0.6 + noise(world * 170.0) * 0.4;
  vec3 medium = mix(EATEN, LAWN, food) * (1.0 - 0.05 * food * (film - 0.5));

  // Soft contact shadow cast away from the light.
  vec2 toward = normalize(LIGHT.xy) * uCellPx;
  float occluder = max(heightAt(frag + toward * 0.25), max(heightAt(frag + toward * 0.5) * 0.8, heightAt(frag + toward * 0.8) * 0.55));
  medium *= 1.0 - 0.2 * clamp(occluder * 1.4, 0.0, 1.0);

  vec4 here = cellsAt(frag);
  float slot = slotOf(here);
  vec3 shade = medium;
  if (slot >= 0.0) {
    float h = heightOf(here);
    float dx = heightAt(frag + vec2(1.0, 0.0)) - heightAt(frag - vec2(1.0, 0.0));
    float dy = heightAt(frag + vec2(0.0, 1.0)) - heightAt(frag - vec2(0.0, 1.0));
    vec3 normal = normalize(vec3(-dx * uCellPx * 0.7, -dy * uCellPx * 0.7, 1.0));
    vec3 light = normalize(LIGHT);

    vec4 a = slotData(slot, 0.0);
    vec4 b = slotData(slot, 1.0);
    bool cyst = b.x > 1.5;
    vec2 local = (world - a.xy) / a.w;
    local = mat2(cos(a.z), -sin(a.z), sin(a.z), cos(a.z)) * local;

    vec3 gel = cyst ? CYST : mix(GEL, lineageTint(b.y), 0.32);
    vec3 body = gel * (0.62 + 0.38 * dot(normal, light));

    if (!cyst) {
      // Granular endoplasm thickening toward the middle.
      vec2 grid = local * 13.0 + b.z * 7.0;
      vec2 cell = floor(grid);
      vec2 grain = cell + 0.3 + 0.4 * vec2(hash(cell), hash(cell + 17.0));
      float grains = (1.0 - smoothstep(0.08, 0.2, length(grid - grain))) * step(0.35, hash(cell + 5.0)) * smoothstep(0.3, 0.6, h);
      body = mix(body, body * 0.7, grains * 0.7);
      // Nucleus seen through the gel; two while dividing.
      float apart = 0.64 * smoothstep(0.0, 1.0, b.w);
      float nucleus = b.x > 0.5
        ? max(1.0 - smoothstep(0.2, 0.28, length(local - vec2(0.0, apart))), 1.0 - smoothstep(0.2, 0.28, length(local + vec2(0.0, apart))))
        : 1.0 - smoothstep(0.24, 0.32, length(local + vec2(0.25, 0.0)));
      body = mix(body, body * 0.84 + 0.05, nucleus * 0.7);
    }

    // Thin ectoplasm stays clear; the granular middle is denser.
    float absorb = (cyst ? 0.85 : 0.42) * (1.0 - exp(-2.2 * h)) + (cyst ? 0.0 : 0.3 * smoothstep(0.35, 0.75, h));
    shade = mix(medium, body, absorb);
    // Refractive edge reads as a dark membrane line.
    float tilt = 1.0 - normal.z;
    shade *= 1.0 - (cyst ? 0.45 : 0.32) * smoothstep(0.12, 0.5, tilt);
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float facing = max(dot(normal, halfway), 0.0);
    shade += (pow(facing, 28.0) * 0.16 + pow(facing, 160.0) * 0.28) * (cyst ? 0.4 : 1.0) * smoothstep(0.05, 0.25, h);
  }

  // The dish wall: a narrow meniscus.
  float wall = 1.0 - smoothstep(0.0, 2.0, abs(r - 1.0) * uRadius);
  shade = mix(shade, shade * 0.82, wall);
  color = vec4(shade, 1.0);
}
`;
