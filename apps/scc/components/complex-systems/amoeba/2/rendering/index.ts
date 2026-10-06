import * as THREE from "three";
import { CAPACITY, NEWBORN_RADIUS, type Colony } from "../model/index.ts";
import { createBodies, updateBodies, type Body } from "./bodies.ts";
import {
  OWNER_REACH,
  SUPPORT,
  bodyVertexShader,
  compositeFragment,
  compositeVertex,
  fieldFragment,
  grainFragment,
  ownerFragment,
} from "./shaders.ts";

export type AmoebaRenderer = Readonly<{
  /** `time` and `dt` in seconds; bodies spring toward the colony at `alpha`. */
  render: (colony: Colony, alpha: number, time: number, dt: number) => void;
  resize: (width: number, height: number) => void;
  /** Internal resolution scale (≤ 1) chosen by frame pacing. */
  setQuality: (scale: number) => void;
  /** CSS pixel → zone coordinates (half-height 1, y up). */
  toWorld: (x: number, y: number) => readonly [number, number];
  dispose: () => void;
}>;

const MAX_CANVAS_PIXELS = 3_000_000;
const DATA_WIDTH = 64;
// Three texel rows per body: (x, y, heading, radius), (cyst, lineage, seed, phase), (split).
const DATA_HEIGHT = (CAPACITY / DATA_WIDTH) * 3;
const GRAIN_WIDTH = 1536;

/** `halfWidth` is the zone's fixed half-width; the screen covers the zone. */
export function createAmoebaRenderer(canvas: HTMLCanvasElement, halfWidth: number): AmoebaRenderer {
  const grainHeight = Math.max(1, Math.round(GRAIN_WIDTH / halfWidth));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  renderer.autoClear = false;
  const camera = new THREE.OrthographicCamera();
  const bodies = createBodies();
  let cssWidth = 1;
  let cssHeight = 1;
  let quality = 1;

  // Pass A: summed soft kernels at half resolution.
  const fieldTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    generateMipmaps: false,
  });
  // Pass B: nearest body per pixel, also at half resolution (interior detail only).
  const ownerTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    generateMipmaps: false,
  });

  const bodyArray = new Float32Array(CAPACITY * 4);
  const shapeArray = new Float32Array(CAPACITY * 4);
  const motionArray = new Float32Array(CAPACITY * 4);
  const attributes = [
    ["aBody", new THREE.InstancedBufferAttribute(bodyArray, 4)],
    ["aShape", new THREE.InstancedBufferAttribute(shapeArray, 4)],
    ["aMotion", new THREE.InstancedBufferAttribute(motionArray, 4)],
  ] as const;
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  for (const [name, attribute] of attributes) {
    attribute.setUsage(THREE.DynamicDrawUsage);
    quad.setAttribute(name, attribute);
  }

  const scale = { value: new THREE.Vector2(1, 1) };
  const time = { value: 0 };
  const fieldUniforms = { uScale: scale, uTime: time, uReach: { value: SUPPORT } };
  const ownerUniforms = { uScale: scale, uTime: time, uReach: { value: OWNER_REACH } };
  const fieldMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: bodyVertexShader,
    fragmentShader: fieldFragment,
    uniforms: fieldUniforms,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    depthTest: false,
    depthWrite: false,
  });
  const ownerMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: bodyVertexShader,
    fragmentShader: ownerFragment,
    uniforms: ownerUniforms,
    depthTest: true,
    depthWrite: true,
  });
  const fieldMesh = new THREE.Mesh(quad, fieldMaterial);
  const ownerMesh = new THREE.Mesh(quad, ownerMaterial);
  fieldMesh.frustumCulled = ownerMesh.frustumCulled = false;
  const fieldScene = new THREE.Scene().add(fieldMesh);
  const ownerScene = new THREE.Scene().add(ownerMesh);

  const data = new Float32Array(DATA_WIDTH * DATA_HEIGHT * 4);
  const dataTexture = new THREE.DataTexture(data, DATA_WIDTH, DATA_HEIGHT, THREE.RGBAFormat, THREE.FloatType);
  dataTexture.minFilter = dataTexture.magFilter = THREE.NearestFilter;
  let foodTexture: THREE.DataTexture | null = null;
  let foodBytes: Uint8Array<ArrayBuffer> | null = null;
  let foodLevels: Float32Array | null = null;

  // Static lawn grain, drawn once in dish space instead of per pixel per frame.
  const grainTarget = new THREE.WebGLRenderTarget(GRAIN_WIDTH, grainHeight, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    generateMipmaps: false,
  });

  const compositeUniforms = {
    uField: { value: fieldTarget.texture },
    uOwner: { value: ownerTarget.texture },
    uData: { value: dataTexture },
    uFood: { value: null as THREE.Texture | null },
    uGrain: { value: grainTarget.texture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uUnit: { value: 1 },
    uHalfWidth: { value: halfWidth },
    uBaseRadius: { value: NEWBORN_RADIUS },
    uDataWidth: { value: DATA_WIDTH },
  };
  const triangle = new THREE.BufferGeometry();
  triangle.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const compositeMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: compositeVertex,
    fragmentShader: compositeFragment,
    uniforms: compositeUniforms,
    depthTest: false,
    depthWrite: false,
  });
  const composite = new THREE.Mesh(triangle, compositeMaterial);
  composite.frustumCulled = false;
  const compositeScene = new THREE.Scene().add(composite);

  const grainMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: compositeVertex,
    fragmentShader: grainFragment,
    uniforms: { uSize: { value: new THREE.Vector2(GRAIN_WIDTH, grainHeight) }, uHalfWidth: { value: halfWidth } },
    depthTest: false,
    depthWrite: false,
  });
  const grainMesh = new THREE.Mesh(triangle, grainMaterial);
  grainMesh.frustumCulled = false;
  renderer.setRenderTarget(grainTarget);
  renderer.render(new THREE.Scene().add(grainMesh), camera);
  renderer.setRenderTarget(null);

  let uploadedTick = -1;

  function uploadFood(colony: Colony) {
    // Food only changes on model ticks; frames between ticks reuse the texture.
    if (colony.tick === uploadedTick && foodTexture) return;
    uploadedTick = colony.tick;
    const { food } = colony;
    if (!foodTexture || !foodBytes) {
      foodBytes = new Uint8Array(food.level.length);
      foodTexture = new THREE.DataTexture(foodBytes, food.columns, food.rows, THREE.RedFormat, THREE.UnsignedByteType);
      foodTexture.unpackAlignment = 1;
      foodTexture.minFilter = foodTexture.magFilter = THREE.LinearFilter;
      compositeUniforms.uFood.value = foodTexture;
    }
    // Normalize, then blur 3×3 on the CPU so the shader needs one tap.
    const n = food.columns;
    const rows = food.rows;
    foodLevels ??= new Float32Array(n * rows);
    for (let i = 0; i < foodLevels.length; i += 1) {
      const capacity = food.capacity[i];
      foodLevels[i] = capacity > 0 ? food.level[i] / capacity : 0;
    }
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < n; column += 1) {
        let sum = 0;
        let weight = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          const r = row + dy;
          if (r < 0 || r >= rows) continue;
          for (let dx = -1; dx <= 1; dx += 1) {
            const c = column + dx;
            if (c < 0 || c >= n) continue;
            const w = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
            sum += foodLevels[r * n + c] * w;
            weight += w;
          }
        }
        foodBytes[row * n + column] = Math.round((sum / weight) * 255);
      }
    }
    foodTexture.needsUpdate = true;
  }

  function uploadBodies(list: readonly Body[]) {
    const count = Math.min(list.length, CAPACITY);
    for (let i = 0; i < count; i += 1) {
      const body = list[i];
      const k = i * 4;
      bodyArray[k] = body.x;
      bodyArray[k + 1] = body.y;
      bodyArray[k + 2] = body.radius;
      bodyArray[k + 3] = body.heading;
      shapeArray[k] = body.phase;
      shapeArray[k + 1] = body.cyst;
      shapeArray[k + 2] = body.presence;
      shapeArray[k + 3] = body.seed;
      motionArray[k] = body.age;
      motionArray[k + 1] = i;
      motionArray[k + 2] = body.split;
      const first = (Math.floor(i / DATA_WIDTH) * 3 * DATA_WIDTH + (i % DATA_WIDTH)) * 4;
      const second = first + DATA_WIDTH * 4;
      const third = second + DATA_WIDTH * 4;
      data[first] = body.x;
      data[first + 1] = body.y;
      data[first + 2] = body.heading;
      data[first + 3] = body.radius * (1 - 0.18 * body.cyst);
      data[second] = body.cyst;
      data[second + 1] = body.lineage;
      data[second + 2] = body.seed;
      data[second + 3] = body.phase;
      data[third] = body.split;
    }
    quad.instanceCount = count;
    for (const [, attribute] of attributes) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, Math.max(count, 1) * 4);
      attribute.needsUpdate = true;
    }
    dataTexture.needsUpdate = true;
    return count;
  }

  return {
    render(colony, alpha, clock, dt) {
      updateBodies(bodies, colony, alpha, dt);
      time.value = clock;
      uploadFood(colony);
      const count = uploadBodies(bodies.list);
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(fieldTarget);
      renderer.clear(true, false, false);
      if (count > 0) renderer.render(fieldScene, camera);
      renderer.setRenderTarget(ownerTarget);
      renderer.clear(true, true, false);
      if (count > 0) renderer.render(ownerScene, camera);
      renderer.setRenderTarget(null);
      renderer.render(compositeScene, camera);
    },
    resize(width, height) {
      cssWidth = Math.max(1, width);
      cssHeight = Math.max(1, height);
      const ratio = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (cssWidth * cssHeight))) * quality;
      renderer.setPixelRatio(ratio);
      renderer.setSize(cssWidth, cssHeight, false);
      const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
      fieldTarget.setSize(Math.ceil(buffer.x / 2), Math.ceil(buffer.y / 2));
      ownerTarget.setSize(Math.ceil(buffer.x / 2), Math.ceil(buffer.y / 2));
      // Cover: the zone always fills the screen; a later aspect change crops it.
      const unit = Math.max(buffer.x / (2 * halfWidth), buffer.y / 2);
      scale.value.set(unit / (buffer.x / 2), unit / (buffer.y / 2));
      compositeUniforms.uResolution.value.copy(buffer);
      compositeUniforms.uUnit.value = unit;
    },
    setQuality(scale) {
      if (scale === quality) return;
      quality = scale;
      this.resize(cssWidth, cssHeight);
    },
    toWorld(x, y) {
      const unit = Math.max(cssWidth / (2 * halfWidth), cssHeight / 2);
      return [(x - cssWidth / 2) / unit, (cssHeight / 2 - y) / unit];
    },
    dispose() {
      quad.dispose();
      triangle.dispose();
      fieldMaterial.dispose();
      ownerMaterial.dispose();
      compositeMaterial.dispose();
      grainMaterial.dispose();
      grainTarget.dispose();
      dataTexture.dispose();
      foodTexture?.dispose();
      fieldTarget.dispose();
      ownerTarget.dispose();
      renderer.dispose();
    },
  };
}
