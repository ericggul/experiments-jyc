import { ECHO_DELAYS, FEATURE_COUNT } from "./feature-atlas";
import { GRADE_OFFSET } from "./grade";

// face-voronoi/3's face-gradient 3, fed by live eye and mouth tiles. A dense
// lattice of moving sites first agrees on one shared tile coordinate; every
// tile is then sampled at that coordinate and mixed in linear light. The three
// tracked features join the lattice as anchor sites at their true place and
// size, so the clear cutouts rise out of their own continuation.
const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const COLUMNS = `${FEATURE_COUNT}.0`;
const ROWS = `${ECHO_DELAYS.length}.0`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scale;
uniform float u_mouth;
uniform vec2 u_drift;
uniform vec2 u_lens;
uniform vec3 u_anchors[3];
uniform float u_anchorAngle;
uniform float u_presence;
uniform vec3 u_grade[3];
uniform sampler2D u_atlas;

out vec4 outputColor;

const float TAU = 6.28318530718;

vec2 random2(vec2 point) {
  return fract(sin(vec2(
    dot(point, vec2(127.1, 311.7)),
    dot(point, vec2(269.5, 183.3))
  )) * 43758.5453);
}

float random1(vec2 point) {
  return fract(sin(dot(point, vec2(19.27, 43.17))) * 43758.5453);
}

// Each cell owns one feature and one echo; eyes outnumber mouths two to one.
vec2 tileOf(vec2 cellId) {
  float feature = floor(random1(cellId + vec2(53.17, 19.71)) * 2.999);
  float echo = random1(cellId + vec2(7.31, 91.13));
  float slot = echo < 0.4 ? 0.0 : echo < 0.65 ? 1.0 : echo < 0.85 ? 2.0 : 3.0;
  return vec2(feature, slot);
}

vec3 tileAt(vec2 tile, vec2 uv) {
  vec2 bounded = clamp(uv, vec2(0.02), vec2(0.98));
  vec2 cell = vec2(tile.x, ${ROWS} - 1.0 - tile.y);
  return texture(u_atlas, (cell + bounded) / vec2(${COLUMNS}, ${ROWS})).rgb;
}

void main() {
  vec2 screen = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 view = vec2(screen.x * aspect, screen.y);

  // The face replaces the reference's pointer: it swirls the lattice nearby
  // and drags it as the head moves. Anchors stay in unwarped screen space.
  vec2 fromLens = view - vec2(u_lens.x * aspect, u_lens.y);
  float lens = exp(-length(fromLens) * 6.0) * u_presence;
  vec2 point = view + 0.65 * lens * vec2(fromLens.y, -fromLens.x) * 0.35;

  // The open mouth pushes the lattice out of itself and loosens it nearby:
  // sampling closer to the mouth magnifies the cells outward, and the local
  // falloff softens so they melt as they leave. Closing pulls both back.
  vec2 mouth = vec2(u_anchors[2].x * aspect, u_anchors[2].y);
  vec2 fromMouth = view - mouth;
  float mouthReach = max(u_anchors[2].z * 2.4, 0.08);
  float mouthField = u_mouth * u_presence * exp(-dot(fromMouth, fromMouth) / (mouthReach * mouthReach));
  point -= fromMouth * 0.62 * mouthField;
  // Cell size follows the short side, so a portrait phone gets a full column
  // of cells rather than two oversized ones.
  float shortSide = min(u_resolution.x, u_resolution.y);
  point = point * u_scale * (u_resolution.y / shortSide) + u_drift;

  vec2 cell = floor(point);
  vec2 local = fract(point);
  float coreFalloff = mix(3.25, 9.5, 0.8 - 0.7 * mouthField);
  vec2 coordinateSum = vec2(0.0);
  float totalWeight = 0.0;

  for (int row = -2; row <= 2; row++) {
    for (int column = -2; column <= 2; column++) {
      vec2 offset = vec2(float(column), float(row));
      vec2 feature = random2(cell + offset);
      feature = 0.5 + 0.5 * sin(u_time + TAU * feature);
      vec2 featureVector = offset + feature - local;
      float weight = exp(-coreFalloff * dot(featureVector, featureVector));
      coordinateSum += (0.5 - featureVector * 0.86) * weight;
      totalWeight += weight;
    }
  }

  float turnCos = cos(-u_anchorAngle);
  float turnSin = sin(-u_anchorAngle);
  float anchorWeights[3];
  for (int i = 0; i < 3; i++) {
    vec2 anchor = vec2(u_anchors[i].x * aspect, u_anchors[i].y);
    vec2 away = (view - anchor) / max(u_anchors[i].z, 0.001);
    vec2 upright = vec2(
      turnCos * away.x - turnSin * away.y,
      turnSin * away.x + turnCos * away.y
    );
    float weight = u_presence * 5.0 * exp(-7.0 * dot(upright, upright));
    anchorWeights[i] = weight;
    coordinateSum += (0.5 + upright) * weight;
    totalWeight += weight;
  }

  vec2 sharedCoordinate = clamp(
    coordinateSum / max(totalWeight, 0.0001),
    vec2(0.04),
    vec2(0.96)
  );
  vec3 linearMaterial = vec3(0.0);

  for (int row = -2; row <= 2; row++) {
    for (int column = -2; column <= 2; column++) {
      vec2 offset = vec2(float(column), float(row));
      vec2 cellId = cell + offset;
      vec2 feature = random2(cellId);
      feature = 0.5 + 0.5 * sin(u_time + TAU * feature);
      vec2 featureVector = offset + feature - local;
      float weight = exp(-coreFalloff * dot(featureVector, featureVector));
      linearMaterial += pow(tileAt(tileOf(cellId), sharedCoordinate), vec3(2.2)) * weight;
    }
  }

  for (int i = 0; i < 3; i++) {
    linearMaterial += pow(tileAt(vec2(float(i), 0.0), sharedCoordinate), vec3(2.2)) * anchorWeights[i];
  }

  vec3 material = pow(linearMaterial / max(totalWeight, 0.0001), vec3(1.0 / 2.2));
  vec3 graded = vec3(
    dot(u_grade[0], material),
    dot(u_grade[1], material),
    dot(u_grade[2], material)
  ) + ${GRADE_OFFSET.toFixed(4)};
  outputColor = vec4(clamp(graded, 0.0, 1.0), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create face trace shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Face trace shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

export type FieldState = {
  time: number;
  drift: Float32Array;
  lens: Float32Array;
  anchors: Float32Array;
  anchorAngle: number;
  presence: number;
  mouth: number;
  grade: Float32Array;
};

export function createMaterialField(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create face trace program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Face trace program linking failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!buffer || !texture) {
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
    gl.deleteProgram(program);
    throw new Error("Could not allocate face trace field");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const position = gl.getAttribLocation(program, "a_position");
  const resolution = gl.getUniformLocation(program, "u_resolution");
  const time = gl.getUniformLocation(program, "u_time");
  const scale = gl.getUniformLocation(program, "u_scale");
  const mouth = gl.getUniformLocation(program, "u_mouth");
  const drift = gl.getUniformLocation(program, "u_drift");
  const lens = gl.getUniformLocation(program, "u_lens");
  const anchors = gl.getUniformLocation(program, "u_anchors[0]");
  const anchorAngle = gl.getUniformLocation(program, "u_anchorAngle");
  const presence = gl.getUniformLocation(program, "u_presence");
  const grade = gl.getUniformLocation(program, "u_grade[0]");
  const atlas = gl.getUniformLocation(program, "u_atlas");

  return {
    // Full device resolution up to 2×; quality below 1 is the frame-time
    // fallback, never a fixed pixel cap.
    resize(width: number, height: number, quality: number) {
      const density = Math.min(window.devicePixelRatio || 1, 2) * quality;
      const pixelWidth = Math.max(1, Math.round(width * density));
      const pixelHeight = Math.max(1, Math.round(height * density));
      if (gl.canvas.width !== pixelWidth || gl.canvas.height !== pixelHeight) {
        gl.canvas.width = pixelWidth;
        gl.canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    },
    updateTexture(source: HTMLCanvasElement) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    },
    draw(state: FieldState) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolution, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(time, state.time);
      // Five cells across the short side: eyes stay legible on a phone while
      // each tile is magnified less.
      gl.uniform1f(scale, 5.0);
      gl.uniform1f(mouth, state.mouth);
      gl.uniform2fv(drift, state.drift);
      gl.uniform2fv(lens, state.lens);
      gl.uniform3fv(anchors, state.anchors);
      gl.uniform1f(anchorAngle, state.anchorAngle);
      gl.uniform1f(presence, state.presence);
      gl.uniform3fv(grade, state.grade);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(atlas, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
