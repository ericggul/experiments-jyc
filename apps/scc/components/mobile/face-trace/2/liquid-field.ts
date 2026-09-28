// A screen-wide liquid morph grown from the live camera's two eyes and mouth.
const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_sites[3];
uniform vec2 u_radii[3];
uniform float u_time;
uniform sampler2D u_features;
out vec4 outputColor;

void main() {
  vec2 screen = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 point = vec2(screen.x * aspect, screen.y);

  // Only the field coordinates move. The source images are never tiled.
  vec2 flow = vec2(
    sin(point.y * 7.0 + u_time * 0.57) + 0.4 * sin(point.x * 4.0 - u_time * 0.31),
    cos(point.x * 7.0 - u_time * 0.49) + 0.4 * cos(point.y * 5.0 + u_time * 0.28)
  ) * 0.035;
  for (int i = 0; i < 3; i++) {
    vec2 site = vec2(u_sites[i].x * aspect, 1.0 - u_sites[i].y);
    vec2 delta = point - site;
    float reach = exp(-dot(delta, delta) * 10.0);
    flow += vec2(-delta.y, delta.x) * reach * 0.18;
  }
  vec2 liquid = point + flow;

  float nearest = 100.0;
  for (int i = 0; i < 3; i++) {
    vec2 site = vec2(u_sites[i].x * aspect, 1.0 - u_sites[i].y);
    vec2 delta = liquid - site;
    nearest = min(nearest, dot(delta, delta));
  }
  float total = 0.0;
  vec3 color = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    vec2 site = vec2(u_sites[i].x * aspect, 1.0 - u_sites[i].y);
    vec2 delta = liquid - site;
    float distanceSquared = dot(delta, delta);
    float weight = exp(-22.0 * (distanceSquared - nearest));
    vec2 radius = max(vec2(u_radii[i].x * aspect, u_radii[i].y), vec2(0.004));
    vec2 local = delta / radius;
    float distanceFromFeature = length(local);
    float angle = atan(local.y, local.x) +
      0.14 * sin(distanceFromFeature * 0.19 - u_time * 0.34);
    // Trace a thin, changing band across the feature's own perimeter. Each
    // ray keeps its angle as it extends across the screen, so a whole eye or
    // mouth can only appear once in the separate foreground canvas.
    float fold = sin(distanceFromFeature * 0.34 - u_time * 0.28 +
      1.4 * sin(angle * 3.0 + u_time * 0.12));
    float edge = 0.84 + 0.27 * fold;
    float shape = clamp(radius.y / radius.x, 0.16, 1.0);
    vec2 featureUv = 0.5 + vec2(cos(angle), sin(angle) * shape) * (0.185 * edge);
    vec2 atlasUv = vec2((float(i) + featureUv.x) / 3.0, featureUv.y);
    color += texture(u_features, atlasUv).rgb * weight;
    total += weight;
  }
  outputColor = vec4(color / max(total, 0.0001), 1.0);
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

export function createLiquidField(gl: WebGL2RenderingContext) {
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
  const sites = gl.getUniformLocation(program, "u_sites[0]");
  const radii = gl.getUniformLocation(program, "u_radii[0]");
  const time = gl.getUniformLocation(program, "u_time");
  const features = gl.getUniformLocation(program, "u_features");

  return {
    resize(width: number, height: number) {
      const density = Math.min(1, Math.sqrt(600_000 / Math.max(1, width * height)));
      const pixelWidth = Math.max(1, Math.round(width * density));
      const pixelHeight = Math.max(1, Math.round(height * density));
      if (gl.canvas.width !== pixelWidth || gl.canvas.height !== pixelHeight) {
        gl.canvas.width = pixelWidth;
        gl.canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    },
    updateTexture(atlas: HTMLCanvasElement) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    },
    draw(seconds: number, featureSites: Float32Array, featureRadii: Float32Array) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolution, gl.canvas.width, gl.canvas.height);
      gl.uniform2fv(sites, featureSites);
      gl.uniform2fv(radii, featureRadii);
      gl.uniform1f(time, seconds);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(features, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
