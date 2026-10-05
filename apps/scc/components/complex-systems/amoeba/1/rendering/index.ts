import * as THREE from "three";
import { CAPACITY, NEWBORN_RADIUS, TICKS_PER_SECOND, radiusOf, type Colony } from "../model/index.ts";
import { cellFragment, cellVertex, compositeFragment, compositeVertex } from "./shaders.ts";

export type AmoebaRenderer = Readonly<{
  /** `time` in seconds drives the crawling motion of pseudopods. */
  render: (colony: Colony, alpha: number, time: number) => void;
  resize: (width: number, height: number) => void;
  /** CSS pixel → dish coordinates (unit disc, y up). */
  toWorld: (x: number, y: number) => readonly [number, number];
  dispose: () => void;
}>;

const MAX_CANVAS_PIXELS = 3_000_000;
const DISH_FILL = 0.47;
const DATA_WIDTH = 64;
const DATA_HEIGHT = (CAPACITY / DATA_WIDTH) * 2;

export function createAmoebaRenderer(canvas: HTMLCanvasElement): AmoebaRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  renderer.autoClear = false;
  const camera = new THREE.OrthographicCamera();
  let cssWidth = 1;
  let cssHeight = 1;

  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    generateMipmaps: false,
  });

  // Pass 1: one instanced quad per cell.
  const body = new Float32Array(CAPACITY * 4);
  const state = new Float32Array(CAPACITY * 4);
  const motion = new Float32Array(CAPACITY * 2);
  const bodyAttribute = new THREE.InstancedBufferAttribute(body, 4).setUsage(THREE.DynamicDrawUsage);
  const stateAttribute = new THREE.InstancedBufferAttribute(state, 4).setUsage(THREE.DynamicDrawUsage);
  const motionAttribute = new THREE.InstancedBufferAttribute(motion, 2).setUsage(THREE.DynamicDrawUsage);
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  quad.setAttribute("aBody", bodyAttribute);
  quad.setAttribute("aState", stateAttribute);
  quad.setAttribute("aMotion", motionAttribute);
  const cellUniforms = { uScale: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 } };
  const cellMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: cellVertex,
    fragmentShader: cellFragment,
    uniforms: cellUniforms,
    depthTest: true,
    depthWrite: true,
  });
  const cells = new THREE.Mesh(quad, cellMaterial);
  cells.frustumCulled = false;
  const cellScene = new THREE.Scene().add(cells);

  // Pass 2: model data the shading reads.
  const data = new Float32Array(DATA_WIDTH * DATA_HEIGHT * 4);
  const dataTexture = new THREE.DataTexture(data, DATA_WIDTH, DATA_HEIGHT, THREE.RGBAFormat, THREE.FloatType);
  dataTexture.minFilter = dataTexture.magFilter = THREE.NearestFilter;
  let foodTexture: THREE.DataTexture | null = null;
  let foodBytes: Uint8Array<ArrayBuffer> | null = null;

  const compositeUniforms = {
    uCells: { value: target.texture },
    uData: { value: dataTexture },
    uFood: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uRadius: { value: 1 },
    uCellPx: { value: 1 },
    uDataWidth: { value: DATA_WIDTH },
  };
  const triangle = new THREE.BufferGeometry();
  triangle.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const composite = new THREE.Mesh(
    triangle,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: compositeVertex,
      fragmentShader: compositeFragment,
      uniforms: compositeUniforms,
      depthTest: false,
      depthWrite: false,
    }),
  );
  composite.frustumCulled = false;
  const compositeScene = new THREE.Scene().add(composite);

  function uploadFood(colony: Colony) {
    const { food } = colony;
    if (!foodTexture || !foodBytes) {
      foodBytes = new Uint8Array(food.level.length);
      foodTexture = new THREE.DataTexture(foodBytes, food.resolution, food.resolution, THREE.RedFormat, THREE.UnsignedByteType);
      foodTexture.minFilter = foodTexture.magFilter = THREE.LinearFilter;
      compositeUniforms.uFood.value = foodTexture;
    }
    for (let i = 0; i < foodBytes.length; i += 1) {
      const capacity = food.capacity[i];
      foodBytes[i] = capacity > 0 ? Math.round((food.level[i] / capacity) * 255) : 0;
    }
    foodTexture.needsUpdate = true;
  }

  function uploadCells(colony: Colony, alpha: number) {
    const count = colony.count;
    for (let i = 0; i < count; i += 1) {
      const x = colony.previousX[i] + (colony.x[i] - colony.previousX[i]) * alpha;
      const y = colony.previousY[i] + (colony.y[i] - colony.previousY[i]) * alpha;
      const k = i * 4;
      const radius = radiusOf(colony.mass[i]);
      const seed = colony.id[i] % 997;
      body[k] = x;
      body[k + 1] = y;
      body[k + 2] = radius;
      body[k + 3] = colony.heading[i];
      state[k] = colony.state[i];
      state[k + 1] = colony.phase[i];
      state[k + 2] = i;
      state[k + 3] = seed;
      motion[i * 2] = (colony.tick - colony.born[i] + alpha) / TICKS_PER_SECOND;
      motion[i * 2 + 1] = colony.mass[i];
      const row = Math.floor(i / DATA_WIDTH) * 2;
      const first = (row * DATA_WIDTH + (i % DATA_WIDTH)) * 4;
      const second = first + DATA_WIDTH * 4;
      data[first] = x;
      data[first + 1] = y;
      data[first + 2] = colony.heading[i];
      data[first + 3] = radius;
      data[second] = colony.state[i];
      data[second + 1] = colony.lineage[i];
      data[second + 2] = seed;
      data[second + 3] = colony.phase[i];
    }
    quad.instanceCount = count;
    for (const attribute of [bodyAttribute, stateAttribute, motionAttribute]) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, Math.max(count, 1) * attribute.itemSize);
      attribute.needsUpdate = true;
    }
    dataTexture.needsUpdate = true;
  }

  return {
    render(colony, alpha, time) {
      cellUniforms.uTime.value = time;
      uploadFood(colony);
      uploadCells(colony, alpha);
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, false);
      if (colony.count > 0) renderer.render(cellScene, camera);
      renderer.setRenderTarget(null);
      renderer.render(compositeScene, camera);
    },
    resize(width, height) {
      cssWidth = Math.max(1, width);
      cssHeight = Math.max(1, height);
      const ratio = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (cssWidth * cssHeight)));
      renderer.setPixelRatio(ratio);
      renderer.setSize(cssWidth, cssHeight, false);
      const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
      target.setSize(buffer.x, buffer.y);
      const radius = Math.min(buffer.x, buffer.y) * DISH_FILL;
      cellUniforms.uScale.value.set(radius / (buffer.x / 2), radius / (buffer.y / 2));
      compositeUniforms.uResolution.value.copy(buffer);
      compositeUniforms.uRadius.value = radius;
      compositeUniforms.uCellPx.value = NEWBORN_RADIUS * radius;
    },
    toWorld(x, y) {
      const radius = Math.min(cssWidth, cssHeight) * DISH_FILL;
      return [(x - cssWidth / 2) / radius, (cssHeight / 2 - y) / radius];
    },
    dispose() {
      quad.dispose();
      triangle.dispose();
      cellMaterial.dispose();
      composite.material.dispose();
      dataTexture.dispose();
      foodTexture?.dispose();
      target.dispose();
      renderer.dispose();
    },
  };
}
