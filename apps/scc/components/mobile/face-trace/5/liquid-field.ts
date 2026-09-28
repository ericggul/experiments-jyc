// The live feature patches form a three-site material field. Its nearest-site
// and contact warp follow the geometry of face-voronoi/3, using camera pixels.
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
uniform sampler2D u_features;
out vec4 outputColor;

vec2 fluxAt(vec2 point, float aspect) {
  vec2 field = vec2(0.0);
  for (int i = 0; i < 3; i++) {
    vec2 site = vec2(u_sites[i].x * aspect, 1.0 - u_sites[i].y);
    vec2 radius = vec2(u_radii[i].x * aspect, u_radii[i].y);
    vec2 delta = point - site;
    float core = max(length(radius), 0.025);
    // Superposition makes the flow turn around the cancellation zones where
    // two sources meet. The core keeps it finite inside each feature.
    field += delta * core / (dot(delta, delta) + core * core);
  }
  return field;
}

void main() {
  vec2 screen = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 point = vec2(screen.x * aspect, screen.y);
  vec2 trace = point;
  // Deform coordinates before evaluating sites, as in face-voronoi/3. The
  // summed sources bend a path where the eye and mouth fields meet.
  for (int step = 0; step < 4; step++) {
    vec2 flow = fluxAt(trace, aspect);
    trace -= flow / max(length(flow), 0.001) * 0.03;
  }
  float firstDistance = 100.0;
  float secondDistance = 100.0;
  int first = 0;
  int second = 1;
  for (int i = 0; i < 3; i++) {
    vec2 site = vec2(u_sites[i].x * aspect, 1.0 - u_sites[i].y);
    vec2 delta = trace - site;
    float distanceSquared = dot(delta, delta);
    if (distanceSquared < firstDistance) {
      secondDistance = firstDistance;
      second = first;
      firstDistance = distanceSquared;
      first = i;
    } else if (distanceSquared < secondDistance) {
      secondDistance = distanceSquared;
      second = i;
    }
  }
  vec2 site = vec2(u_sites[first].x * aspect, 1.0 - u_sites[first].y);
  vec2 other = vec2(u_sites[second].x * aspect, 1.0 - u_sites[second].y);
  vec2 radius = max(vec2(u_radii[first].x * aspect, u_radii[first].y), vec2(0.004));
  vec2 join = other - site;
  float separation = max(length(join), 0.001);
  vec2 joinAxis = join / separation;
  vec2 crossAxis = vec2(-joinAxis.y, joinAxis.x);
  // The difference of squared distances gives the actual Voronoi bisector
  // distance. Contact changes coordinates, rather than painting a seam.
  float borderDistance = (secondDistance - firstDistance) / (2.0 * separation);
  float contact = 1.0 - smoothstep(0.01, 0.13, borderDistance);
  vec2 localWorld = trace - site;
  float across = dot(trace - 0.5 * (site + other), crossAxis);
  float side = across / sqrt(across * across + 0.0025);
  localWorld -= joinAxis * dot(localWorld, joinAxis) * contact * 0.48;
  localWorld += crossAxis * side * contact * 0.035;

  // A compressed two-dimensional camera coordinate keeps image detail in the
  // extension. A one-pixel perimeter sample would collapse it into flat rays.
  vec2 local = localWorld / radius;
  float reach = length(local);
  float sourceRadius = 0.176 * min(reach, 1.0)
    - 0.085 * (1.0 - exp(-max(reach - 1.0, 0.0) * 0.35));
  vec2 direction = local / max(reach, 0.001);
  float shape = clamp(radius.y / radius.x, 0.12, 1.0);
  vec2 featureUv = 0.5 + vec2(direction.x, direction.y * shape) * sourceRadius;
  vec2 atlasUv = vec2((float(first) + featureUv.x) / 3.0, featureUv.y);
  // The three stretched bodies form one soft union, following the solid
  // portrait mesh in the reference. Black remains the negative space.
  float unionWeight = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 center = vec2(u_sites[i].x * aspect, 1.0 - u_sites[i].y);
    vec2 extent = max(
      vec2(u_radii[i].x * aspect, u_radii[i].y) * 6.0,
      vec2(0.19, 0.27)
    );
    vec2 body = (trace - center) / extent;
    float support = max(1.0 - dot(body, body), 0.0);
    unionWeight += support * support;
  }
  float solid = smoothstep(0.015, 0.06, unionWeight);
  outputColor = vec4(texture(u_features, atlasUv).rgb * solid, 1.0);
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
  const features = gl.getUniformLocation(program, "u_features");

  return {
    resize(width: number, height: number) {
      const density = Math.min(1, Math.sqrt(320_000 / Math.max(1, width * height)));
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
      gl.uniform2fv(radii, featureRadii);
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
