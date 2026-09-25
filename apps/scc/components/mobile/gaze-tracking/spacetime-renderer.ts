import type { EyeRatios } from "./model/gaze";
import { createSpacetimeMesh, type SpacetimeMesh } from "./model/spacetime-mesh";

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_uv;
uniform vec2 u_resolution;
uniform vec2 u_left;
uniform vec2 u_right;
uniform float u_radius;
uniform float u_strength;
uniform float u_time;
out vec2 v_uv;

float influence(vec2 point, vec2 center) {
  float q = length(point - center) / max(u_radius, 1.0);
  if (q >= 1.0) return 0.0;
  float envelope = 1.0 - q * q;
  return envelope * envelope * envelope;
}

vec2 localCurl(vec2 point, vec2 center, float direction, float pulse) {
  vec2 delta = point - center;
  float angle = direction * u_strength * 0.9 * influence(point, center) * pulse;
  float cosine = cos(angle);
  float sine = sin(angle);
  return center + vec2(
    cosine * delta.x - sine * delta.y,
    sine * delta.x + cosine * delta.y
  );
}

void main() {
  v_uv = a_uv;
  vec2 original = vec2((a_position.x + 1.0) * 0.5, (1.0 - a_position.y) * 0.5) * u_resolution;
  vec2 bridge = u_right - u_left;
  vec2 axis = length(bridge) < 1.0 ? vec2(1.0, 0.0) : normalize(bridge);
  vec2 normal = vec2(-axis.y, axis.x);
  vec2 middle = (u_left + u_right) * 0.5;
  vec2 relative = original - middle;
  float along = dot(relative, axis) / max(u_radius, 1.0);
  float across = dot(relative, normal) / max(u_radius, 1.0);
  float overlap = sqrt(influence(original, u_left) * influence(original, u_right));
  float bridgeBand = exp(-2.0 * along * along - 2.0 * across * across);
  float pulse = 1.0 + 0.14 * sin(u_time * 1.3);

  vec2 point = localCurl(original, u_left, 1.0, pulse);
  point = localCurl(point, u_right, -1.0, pulse);
  float shear = sin(along * 3.5 - u_time * 1.1) * 0.16;
  float compression = -along * 0.13;
  point += (normal * shear + axis * compression) * u_radius * u_strength * overlap * bridgeBand;
  gl_Position = vec4(point.x / u_resolution.x * 2.0 - 1.0, 1.0 - point.y / u_resolution.y * 2.0, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_interface;
uniform float u_grid;
out vec4 outputColor;
void main() {
  vec4 interfaceColor = texture(u_interface, v_uv);
  outputColor = u_grid > 0.5
    ? vec4(1.0 - interfaceColor.rgb, 0.38)
    : interfaceColor;
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create spacetime shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Spacetime shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

export function createSpacetimeRenderer(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create spacetime program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Spacetime program link failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  const vertices = gl.createBuffer();
  const triangles = gl.createBuffer();
  const gridLines = gl.createBuffer();
  const texture = gl.createTexture();
  if (!vertices || !triangles || !gridLines || !texture) {
    if (vertices) gl.deleteBuffer(vertices);
    if (triangles) gl.deleteBuffer(triangles);
    if (gridLines) gl.deleteBuffer(gridLines);
    if (texture) gl.deleteTexture(texture);
    gl.deleteProgram(program);
    throw new Error("Unable to allocate spacetime mesh");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const uvLocation = gl.getAttribLocation(program, "a_uv");
  const gridLocation = gl.getUniformLocation(program, "u_grid");
  const textureLocation = gl.getUniformLocation(program, "u_interface");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const leftLocation = gl.getUniformLocation(program, "u_left");
  const rightLocation = gl.getUniformLocation(program, "u_right");
  const radiusLocation = gl.getUniformLocation(program, "u_radius");
  const strengthLocation = gl.getUniformLocation(program, "u_strength");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  let mesh: SpacetimeMesh | null = null;

  return {
    resize(width: number, height: number) {
      gl.canvas.width = width;
      gl.canvas.height = height;
      gl.viewport(0, 0, width, height);
      mesh = createSpacetimeMesh(width, height);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangles);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.triangles, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridLines);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.gridLines, gl.STATIC_DRAW);
    },
    updateTexture(source: HTMLCanvasElement) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    },
    draw(seconds: number, gaze: EyeRatios, radiusPixels: number, strengthAmount: number, showGrid = true) {
      if (!mesh) return;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(uvLocation);
      gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 16, 8);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(textureLocation, 0);
      gl.uniform2f(resolutionLocation, mesh.width, mesh.height);
      gl.uniform2f(leftLocation, gaze.left.x * mesh.width, gaze.left.y * mesh.height);
      gl.uniform2f(rightLocation, gaze.right.x * mesh.width, gaze.right.y * mesh.height);
      gl.uniform1f(radiusLocation, radiusPixels);
      gl.uniform1f(strengthLocation, strengthAmount);
      gl.uniform1f(timeLocation, seconds);
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.BLEND);
      gl.uniform1f(gridLocation, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangles);
      gl.drawElements(gl.TRIANGLES, mesh.triangles.length, gl.UNSIGNED_SHORT, 0);
      if (showGrid) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(gridLocation, 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridLines);
        gl.drawElements(gl.LINES, mesh.gridLines.length, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.BLEND);
      }
    },
    destroy() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(vertices);
      gl.deleteBuffer(triangles);
      gl.deleteBuffer(gridLines);
      gl.deleteProgram(program);
      mesh = null;
    },
  };
}
