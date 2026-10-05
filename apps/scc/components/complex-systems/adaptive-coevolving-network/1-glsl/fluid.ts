// One continuous tissue instead of discs and lines. Every voter and every tie
// adds a smooth, compactly supported density splat into an offscreen field:
// voters as round kernels, ties as capsules that are thick where they leave a
// voter and thin where the two halves meet. Because densities add, a tie
// swells into each voter it touches as a fillet, so voters read as cell bodies
// sprouting processes toward their neighbours. A second pass thresholds the
// field into a membrane and shades it from the density gradient.
//
// Two draw calls fill the field (tie capsules, voter kernels; at most 8,192
// splats together) and one full-screen pass composites it.

export type Rgb = readonly [number, number, number];

/** A tie (or a stub of one) drawn from `a` toward `b`, reaching `reach` of the way. */
export type TieSplat = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  reach: number;
  colourA: Rgb;
  colourB: Rgb;
  middle: Rgb;
  /** Half-width of the visible process where it leaves a voter. */
  endWidth: number;
  /** Half-width where the two halves meet. */
  midWidth: number;
  /** Relative swelling carried along the tie by the peristaltic wave. */
  wobble: number;
  /** Wave speed in radians per second. */
  pace: number;
  phase: number;
  strength: number;
};

export type VoterSplat = { x: number; y: number; radius: number; colour: Rgb };

export type Brush = { x: number; y: number; radius: number; colour: Rgb };

export const MAX_SPLATS = 8_192;
/** Field density at which the membrane is drawn. */
const THRESHOLD = 0.5;
/** Visible radius ÷ kernel support for (1 − q²)³ cut at THRESHOLD. */
const VISIBLE_SHARE = Math.sqrt(1 - Math.cbrt(THRESHOLD));

const TIE_FLOATS = 20;
const VOTER_FLOATS = 8;

const KERNEL = /* glsl */ `
float kernel(float q) {
  q = clamp(q, 0.0, 1.0);
  float u = 1.0 - q * q;
  return u * u * u;
}
`;

const TIE_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 ends;
layout(location = 2) in vec4 colourA;
layout(location = 3) in vec4 colourB;
layout(location = 4) in vec4 middle;
layout(location = 5) in vec4 shape;
uniform vec2 frame;
uniform float share;
out vec2 local;
out float fullLength;
out float reachLength;
out vec3 startColour;
out vec3 endColour;
out vec3 middleColour;
out vec4 profile;
out float phase;
out float strength;

void main() {
  vec2 a = ends.xy;
  vec2 span = ends.zw - a;
  fullLength = max(length(span), 1e-3);
  vec2 direction = span / fullLength;
  vec2 normal = vec2(-direction.y, direction.x);
  reachLength = fullLength * middle.a;
  float support = shape.x * (1.0 + shape.z) / share;
  float along = mix(-support, reachLength + support, corner.x * 0.5 + 0.5);
  float across = corner.y * support;
  vec2 point = a + direction * along + normal * across;
  local = vec2(along, across);
  startColour = colourA.rgb;
  endColour = colourB.rgb;
  middleColour = middle.rgb;
  profile = shape;
  phase = colourA.a;
  strength = colourB.a;
  vec2 clip = point / frame * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const TIE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
in float fullLength;
in float reachLength;
in vec3 startColour;
in vec3 endColour;
in vec3 middleColour;
in vec4 profile;
in float phase;
in float strength;
uniform float time;
uniform float share;
uniform float scale;
out vec4 density;
${KERNEL}
void main() {
  float along = clamp(local.x, 0.0, reachLength);
  float distance = length(vec2(local.x - along, local.y));
  float t = along / fullLength;
  float taper = pow(abs(2.0 * t - 1.0), 2.5);
  float wave = 0.5 + 0.5 * sin(along * 0.32 - time * profile.w + phase);
  float width = mix(profile.y, profile.x, taper) * (1.0 + profile.z * wave);
  float value = kernel(distance * share / width) * strength;
  float bridge = pow(sin(3.14159265 * t), 1.5);
  vec3 colour = mix(mix(startColour, endColour, t), middleColour, bridge);
  density = vec4(colour * value, value) * scale;
}
`;

const VOTER_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 body;
layout(location = 2) in vec4 tint;
uniform vec2 frame;
uniform float share;
out vec2 local;
out float support;
out vec3 colour;

void main() {
  support = body.z / share;
  local = corner * support;
  colour = tint.rgb;
  vec2 clip = (body.xy + local) / frame * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const VOTER_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
in float support;
in vec3 colour;
uniform float scale;
out vec4 density;
${KERNEL}
void main() {
  float value = kernel(length(local) / support);
  density = vec4(colour * value, value) * scale;
}
`;

const COMPOSITE_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
out vec2 uv;
void main() {
  uv = corner * 0.5 + 0.5;
  gl_Position = vec4(corner, 0.0, 1.0);
}
`;

const COMPOSITE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D field;
uniform vec2 texel;
uniform vec2 frame;
uniform float scale;
uniform float threshold;
uniform vec4 brush;
uniform vec3 brushColour;
out vec4 pixel;

void main() {
  vec4 sample0 = texture(field, uv) / scale;
  float level = sample0.a;
  float soft = fwidth(level) * 0.8 + 1e-4;
  float cover = smoothstep(threshold - soft, threshold + soft, level);
  vec3 colour = level > 1e-4 ? sample0.rgb / level : vec3(1.0);

  float dx = texture(field, uv + vec2(texel.x, 0.0)).a - texture(field, uv - vec2(texel.x, 0.0)).a;
  float dy = texture(field, uv + vec2(0.0, texel.y)).a - texture(field, uv - vec2(0.0, texel.y)).a;
  vec3 normal = normalize(vec3(-dx, -dy, 0.4 * scale));
  vec3 light = normalize(vec3(-0.45, 0.6, 0.66));
  float diffuse = max(dot(normal, light), 0.0);
  float rim = 1.0 - smoothstep(threshold, threshold + 0.6, level);
  vec3 body = colour * (0.8 + 0.28 * diffuse) * (1.0 - 0.18 * rim);
  float gloss = pow(max(reflect(-light, normal).z, 0.0), 24.0);
  body += 0.2 * gloss * (1.0 - rim);

  vec3 result = mix(vec3(1.0), clamp(body, 0.0, 1.0), cover);
  vec2 point = vec2(uv.x, 1.0 - uv.y) * frame;
  float ring = abs(length(point - brush.xy) - brush.z);
  result = mix(result, brushColour, brush.w * 0.8 * (1.0 - smoothstep(0.75, 1.5, ring)));
  pixel = vec4(result, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram();
  const shaders = [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const;
  for (const [kind, source] of shaders) {
    const shader = gl.createShader(kind)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? "shader failed to compile");
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program failed to link");
  }
  return program;
}

function instanced(
  gl: WebGL2RenderingContext,
  corners: WebGLBuffer,
  data: Float32Array,
  attributes: number,
) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  for (let index = 0; index < attributes; index += 1) {
    gl.enableVertexAttribArray(index + 1);
    gl.vertexAttribPointer(index + 1, 4, gl.FLOAT, false, attributes * 16, index * 16);
    gl.vertexAttribDivisor(index + 1, 1);
  }
  gl.bindVertexArray(null);
  return { vao, buffer };
}

export type FluidRenderer = {
  resize(width: number, height: number, ratio: number): void;
  render(ties: readonly TieSplat[], voters: readonly VoterSplat[], time: number, brush: Brush | null): void;
  dispose(): void;
};

export function createFluidRenderer(canvas: HTMLCanvasElement): FluidRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;
  // Half-float targets keep the summed density unclamped; without them the
  // field is stored at a quarter of its value in eight bits.
  const floatField = gl.getExtension("EXT_color_buffer_float") !== null;
  const scale = floatField ? 1 : 0.25;

  const tieProgram = compile(gl, TIE_VERTEX, TIE_FRAGMENT);
  const voterProgram = compile(gl, VOTER_VERTEX, VOTER_FRAGMENT);
  const compositeProgram = compile(gl, COMPOSITE_VERTEX, COMPOSITE_FRAGMENT);

  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const tieData = new Float32Array(MAX_SPLATS * TIE_FLOATS);
  const voterData = new Float32Array(MAX_SPLATS * VOTER_FLOATS);
  const tieMesh = instanced(gl, corners, tieData, 5);
  const voterMesh = instanced(gl, corners, voterData, 2);
  const screen = gl.createVertexArray();
  gl.bindVertexArray(screen);
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const texture = gl.createTexture();
  const target = gl.createFramebuffer();
  let frame = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };

  const uniform = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);
  const tieUniforms = {
    frame: uniform(tieProgram, "frame"),
    share: uniform(tieProgram, "share"),
    time: uniform(tieProgram, "time"),
    scale: uniform(tieProgram, "scale"),
  };
  const voterUniforms = {
    frame: uniform(voterProgram, "frame"),
    share: uniform(voterProgram, "share"),
    scale: uniform(voterProgram, "scale"),
  };
  const compositeUniforms = {
    field: uniform(compositeProgram, "field"),
    texel: uniform(compositeProgram, "texel"),
    frame: uniform(compositeProgram, "frame"),
    scale: uniform(compositeProgram, "scale"),
    threshold: uniform(compositeProgram, "threshold"),
    brush: uniform(compositeProgram, "brush"),
    brushColour: uniform(compositeProgram, "brushColour"),
  };

  const resize = (width: number, height: number, ratio: number) => {
    frame = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
    };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (floatField) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, pixels.width, pixels.height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, pixels.width, pixels.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const render: FluidRenderer["render"] = (ties, voters, time, brush) => {
    const voterCount = Math.min(voters.length, MAX_SPLATS);
    const tieCount = Math.min(ties.length, MAX_SPLATS - voterCount);
    for (let index = 0; index < tieCount; index += 1) {
      const tie = ties[index]!;
      let offset = index * TIE_FLOATS;
      const write = (...values: readonly number[]) => {
        for (const value of values) tieData[offset++] = value;
      };
      write(tie.ax, tie.ay, tie.bx, tie.by);
      write(tie.colourA[0], tie.colourA[1], tie.colourA[2], tie.phase);
      write(tie.colourB[0], tie.colourB[1], tie.colourB[2], tie.strength);
      write(tie.middle[0], tie.middle[1], tie.middle[2], tie.reach);
      write(tie.endWidth, tie.midWidth, tie.wobble, tie.pace);
    }
    for (let index = 0; index < voterCount; index += 1) {
      const voter = voters[index]!;
      const offset = index * VOTER_FLOATS;
      voterData[offset] = voter.x;
      voterData[offset + 1] = voter.y;
      voterData[offset + 2] = voter.radius;
      voterData[offset + 4] = voter.colour[0];
      voterData[offset + 5] = voter.colour[1];
      voterData[offset + 6] = voter.colour[2];
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(tieProgram);
    gl.uniform2f(tieUniforms.frame, frame.width, frame.height);
    gl.uniform1f(tieUniforms.share, VISIBLE_SHARE);
    gl.uniform1f(tieUniforms.time, time);
    gl.uniform1f(tieUniforms.scale, scale);
    gl.bindVertexArray(tieMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, tieMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, tieData, 0, tieCount * TIE_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, tieCount);

    gl.useProgram(voterProgram);
    gl.uniform2f(voterUniforms.frame, frame.width, frame.height);
    gl.uniform1f(voterUniforms.share, VISIBLE_SHARE);
    gl.uniform1f(voterUniforms.scale, scale);
    gl.bindVertexArray(voterMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, voterMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, voterData, 0, voterCount * VOTER_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, voterCount);

    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.useProgram(compositeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(compositeUniforms.field, 0);
    gl.uniform2f(compositeUniforms.texel, 1 / pixels.width, 1 / pixels.height);
    gl.uniform2f(compositeUniforms.frame, frame.width, frame.height);
    gl.uniform1f(compositeUniforms.scale, scale);
    gl.uniform1f(compositeUniforms.threshold, THRESHOLD);
    gl.uniform4f(compositeUniforms.brush, brush?.x ?? 0, brush?.y ?? 0, brush?.radius ?? 0, brush ? 1 : 0);
    gl.uniform3f(compositeUniforms.brushColour, ...(brush?.colour ?? ([0, 0, 0] as const)));
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };

  const dispose = () => {
    gl.deleteProgram(tieProgram);
    gl.deleteProgram(voterProgram);
    gl.deleteProgram(compositeProgram);
    gl.deleteBuffer(corners);
    gl.deleteBuffer(tieMesh.buffer);
    gl.deleteBuffer(voterMesh.buffer);
    gl.deleteVertexArray(tieMesh.vao);
    gl.deleteVertexArray(voterMesh.vao);
    gl.deleteVertexArray(screen);
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(target);
  };

  return { resize, render, dispose };
}
