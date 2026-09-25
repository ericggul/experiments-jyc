import type { EyeRatios } from "./model/gaze";

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_interface;
uniform vec2 u_resolution;
uniform vec2 u_left;
uniform vec2 u_right;
uniform float u_time;
uniform float u_radius;
uniform float u_strength;
out vec4 outputColor;

vec2 liquidOffset(vec2 pixel, vec2 center, float phase, float rotation, out float influence) {
  vec2 delta = pixel - center;
  float distanceFromEye = length(delta);
  influence = exp(-2.7 * pow(distanceFromEye / max(u_radius, 1.0), 2.0));
  vec2 tangent = vec2(-delta.y, delta.x);
  // Texture sampling moves opposite the visible flow: positive sampling rotation appears clockwise.
  vec2 swirl = tangent * rotation * 0.22 * influence * (0.78 + 0.22 * sin(u_time * 1.15 + phase));
  vec2 ripple = delta / max(distanceFromEye, 1.0)
    * sin(distanceFromEye * 0.055 - u_time * 2.2 + phase) * 10.0 * influence;
  vec2 drift = vec2(
    sin(u_time * 1.3 + delta.y * 0.026 + phase),
    cos(u_time * 1.1 + delta.x * 0.022 + phase)
  ) * 5.0 * influence;
  return swirl + ripple + drift;
}

void main() {
  vec2 pixel = gl_FragCoord.xy;
  vec2 leftCenter = vec2(u_left.x, 1.0 - u_left.y) * u_resolution;
  vec2 rightCenter = vec2(u_right.x, 1.0 - u_right.y) * u_resolution;
  float leftInfluence;
  float rightInfluence;
  vec2 leftFlow = liquidOffset(pixel, leftCenter, 0.0, 1.0, leftInfluence);
  vec2 rightFlow = liquidOffset(pixel, rightCenter, 2.3, -1.0, rightInfluence);

  vec2 bridge = rightCenter - leftCenter;
  float separation = length(bridge);
  vec2 bridgeAxis = normalize(vec2(abs(bridge.x) + u_radius * 0.15, bridge.y));
  vec2 crossAxis = vec2(-bridgeAxis.y, bridgeAxis.x);
  vec2 fromMiddle = pixel - (leftCenter + rightCenter) * 0.5;
  float along = dot(fromMiddle, bridgeAxis);
  float across = dot(fromMiddle, crossAxis);
  float shared = sqrt(leftInfluence * rightInfluence);
  float bridgeBand = exp(-pow(along / max(separation * 0.6, u_radius * 0.4), 2.0));
  float crossBand = exp(-pow(across / max(u_radius * 0.55, 1.0), 2.0));
  float pressure = shared * bridgeBand * crossBand;
  vec2 collision = crossAxis * sin(across / max(u_radius * 0.14, 1.0) - u_time * 1.7) * 14.0
    + bridgeAxis * sin(along / max(u_radius * 0.16, 1.0) + u_time * 1.1) * 8.0;
  vec2 displacement = (leftFlow + rightFlow + collision * pressure) * u_strength;
  vec2 uv = clamp((pixel + displacement) / u_resolution, vec2(0.001), vec2(0.999));
  outputColor = texture(u_interface, uv);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create liquid shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Liquid shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

export function createLiquidRenderer(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create liquid program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Liquid program link failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!buffer || !texture) {
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
    gl.deleteProgram(program);
    throw new Error("Unable to allocate liquid geometry or texture");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const position = gl.getAttribLocation(program, "a_position");
  const resolution = gl.getUniformLocation(program, "u_resolution");
  const left = gl.getUniformLocation(program, "u_left");
  const right = gl.getUniformLocation(program, "u_right");
  const time = gl.getUniformLocation(program, "u_time");
  const radius = gl.getUniformLocation(program, "u_radius");
  const strength = gl.getUniformLocation(program, "u_strength");
  const interfaceTexture = gl.getUniformLocation(program, "u_interface");

  return {
    resize(width: number, height: number) {
      gl.canvas.width = width;
      gl.canvas.height = height;
      gl.viewport(0, 0, width, height);
    },
    updateTexture(source: HTMLCanvasElement) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    },
    draw(seconds: number, gaze: EyeRatios, radiusPixels: number, strengthAmount: number, _showGrid?: boolean) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolution, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(left, gaze.left.x, gaze.left.y);
      gl.uniform2f(right, gaze.right.x, gaze.right.y);
      gl.uniform1f(time, seconds);
      gl.uniform1f(radius, radiusPixels);
      gl.uniform1f(strength, strengthAmount);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(interfaceTexture, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
