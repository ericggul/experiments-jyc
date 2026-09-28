const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_sites[3];
uniform vec2 u_patchRadii[3];
uniform sampler2D u_featureAtlas;
out vec4 outputColor;

void main() {
  vec2 point = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 coordinateSum = vec2(0.0);
  float total = 0.0;
  float strongest = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 site = vec2(u_sites[i].x, 1.0 - u_sites[i].y);
    vec2 delta = vec2((point.x - site.x) * aspect, point.y - site.y);
    vec2 radius = max(vec2(u_patchRadii[i].x * aspect, u_patchRadii[i].y), vec2(0.008));
    vec2 local = delta / radius;
    float weight = exp(-1.2 * dot(local, local));
    coordinateSum += vec2(0.5 - 0.5 * local.x, 0.5 + 0.5 * local.y) * weight;
    total += weight;
    strongest = max(strongest, weight);
  }

  // Align neighboring photographic patches where their fields meet. The
  // original local coordinate stays intact at each eye and the mouth.
  vec2 sharedCoordinate = clamp(coordinateSum / max(total, 0.0001), vec2(0.02), vec2(0.98));
  float overlap = clamp((total - strongest) / max(total, 0.0001) * 2.0, 0.0, 1.0);
  vec3 linearMaterial = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    vec2 site = vec2(u_sites[i].x, 1.0 - u_sites[i].y);
    vec2 delta = vec2((point.x - site.x) * aspect, point.y - site.y);
    vec2 radius = max(vec2(u_patchRadii[i].x * aspect, u_patchRadii[i].y), vec2(0.008));
    vec2 local = delta / radius;
    float weight = exp(-1.2 * dot(local, local));
    vec2 localCoordinate = vec2(0.5 - 0.5 * local.x, 0.5 + 0.5 * local.y);
    vec2 alignedCoordinate = clamp(mix(localCoordinate, sharedCoordinate, overlap * 0.45), vec2(0.02), vec2(0.98));
    vec2 atlasUv = vec2((float(i) + alignedCoordinate.x) / 3.0, alignedCoordinate.y);
    linearMaterial += pow(texture(u_featureAtlas, atlasUv).rgb, vec3(2.2)) * weight;
  }
  vec3 material = pow(linearMaterial / max(total, 0.0001), vec3(1.0 / 2.2));
  float presence = smoothstep(0.015, 0.5, total);
  outputColor = vec4(material * presence, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create face gradient shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Face gradient shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

export function createGradientField(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create face gradient program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Face gradient program linking failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!buffer || !texture) {
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
    gl.deleteProgram(program);
    throw new Error("Could not allocate face gradient field");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

  const position = gl.getAttribLocation(program, "a_position");
  const resolution = gl.getUniformLocation(program, "u_resolution");
  const sites = gl.getUniformLocation(program, "u_sites[0]");
  const patchRadii = gl.getUniformLocation(program, "u_patchRadii[0]");
  const featureAtlas = gl.getUniformLocation(program, "u_featureAtlas");

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
    draw(featureSites: Float32Array, featureRadii: Float32Array) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolution, gl.canvas.width, gl.canvas.height);
      gl.uniform2fv(sites, featureSites);
      gl.uniform2fv(patchRadii, featureRadii);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(featureAtlas, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
