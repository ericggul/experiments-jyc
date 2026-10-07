import type { Liquid } from "./liquid";

const vertexSource = `#version 300 es
in vec2 aPosition;
in vec2 aRest;
in float aLift;
uniform vec2 uSize;
out vec2 vUv;
void main() {
  vUv = aRest / uSize;
  vec2 clip = aPosition / uSize * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 1.0 - min(aLift, 9999.0) * 0.0001, 1.0);
}`;

const fragmentSource = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uPage;
out vec4 color;
void main() {
  color = texture(uPage, vUv);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

/**
 * Draws the captured page on the liquid's mesh: each vertex at its carried
 * position, sampling the page at its rest position. Positions stream to the
 * GPU each frame; rest positions and triangles are uploaded once per mesh.
 */
export function createLiquidRenderer(gl: WebGL2RenderingContext) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "program");
  const uSize = gl.getUniformLocation(program, "uSize");
  const uPage = gl.getUniformLocation(program, "uPage");
  const vao = gl.createVertexArray();
  const positionBuffer = gl.createBuffer();
  const restBuffer = gl.createBuffer();
  const liftBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  const texture = gl.createTexture();
  let count = 0;
  let mesh: Liquid | null = null;
  let ground: [number, number, number] = [1, 1, 1];

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const aPosition = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, restBuffer);
  const aRest = gl.getAttribLocation(program, "aRest");
  gl.enableVertexAttribArray(aRest);
  gl.vertexAttribPointer(aRest, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, liftBuffer);
  const aLift = gl.getAttribLocation(program, "aLift");
  gl.enableVertexAttribArray(aLift);
  gl.vertexAttribPointer(aLift, 1, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  let liftVersion = -1;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return {
    setMesh(liquid: Liquid) {
      mesh = liquid;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, restBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, liquid.rest, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, liquid.position, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, liftBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, liquid.lift, gl.DYNAMIC_DRAW);
      liftVersion = -1;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, liquid.indices, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      count = liquid.indices.length;
    },
    setPage(page: TexImageSource, color: [number, number, number]) {
      ground = color;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, page);
    },
    /** `liftVersion` changes only when a new piece is taken hold of, so stacking is uploaded rarely. */
    draw(version = 0) {
      if (!mesh) return;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      // Where the sheet is pulled away, the page's own ground shows.
      gl.clearColor(ground[0], ground[1], ground[2], 1);
      gl.clearDepth(1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uSize, mesh.width, mesh.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uPage, 0);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.position);
      if (version !== liftVersion) {
        gl.bindBuffer(gl.ARRAY_BUFFER, liftBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.lift);
        liftVersion = version;
      }
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
      gl.bindVertexArray(null);
    },
    destroy() {
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(restBuffer);
      gl.deleteBuffer(liftBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteTexture(texture);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  };
}
