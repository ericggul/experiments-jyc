import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { techFace3DStudies } from "../model/face-3d";

// One bounded off-DOM WebGL canvas is rendered sequentially into 2D output
// canvases. It deliberately never becomes an 80-column GPU atlas.
const TILE = 144;
const INSPECT_TILE = 320;
const WIDTH = INSPECT_TILE;
const HEIGHT = INSPECT_TILE;
const FRAME_MS = 1000 / 18;

type FaceEntry = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  index: number;
  inspect: boolean;
  active: boolean;
};

type FaceAsset = {
  root: THREE.Group;
  material: THREE.MeshPhysicalMaterial;
  coreMaterial: THREE.MeshPhysicalMaterial;
  texture?: THREE.Texture;
  loaded: boolean;
  failed: boolean;
};

function deformFaceGeometry(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute("position");
  for (let point = 0; point < positions.count; point++) {
    const y = positions.getY(point);
    // Oval temples and a subtly pinched chin: recognizably a face, but not a
    // naturalistic head scan. The portrait remains a photograph on its surface.
    positions.setX(point, positions.getX(point) * (0.94 - Math.max(0, -y) * 0.13));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createFaceGeometry() {
  return deformFaceGeometry(new THREE.SphereGeometry(1, 64, 48));
}

function createPhotoGeometry() {
  // A projected window spans only the frontal 115 degrees. The matte ovoid
  // below supplies the sides/back, so a portrait never wraps through a front
  // cylindrical seam when the form turns.
  const geometry = deformFaceGeometry(new THREE.SphereGeometry(1, 64, 48, Math.PI * 0.18, Math.PI * 0.64));
  const positions = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const halfWidth = Math.sin(Math.PI * 0.32);
  for (let point = 0; point < positions.count; point++) {
    // Three's canvas texture convention places v=1 at the top of this mesh.
    uv.setXY(point, 0.5 + positions.getX(point) / (2 * halfWidth), 0.5 + positions.getY(point) / 2);
  }
  uv.needsUpdate = true;
  return geometry;
}

export class Face3DAtlasRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(27, 1, 0.1, 20);
  private readonly environment: THREE.WebGLRenderTarget;
  private readonly geometry = createFaceGeometry();
  private readonly photoGeometry = createPhotoGeometry();
  private readonly assets: FaceAsset[] = [];
  private readonly entries = new Map<HTMLCanvasElement, FaceEntry>();
  private readonly rotation = techFace3DStudies.map((study) => ({ x: study.restingTurn[0], y: study.restingTurn[1] }));
  private readonly requested = new Set<number>();
  private readonly pending = new Map<number, HTMLImageElement>();
  private timer: number | undefined;
  private lastFrame = 0;
  private dirty = true;
  private disposed = false;
  private failed = false;
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power", premultipliedAlpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(WIDTH, HEIGHT, false);
    this.renderer.setClearColor("#000000", 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.88;
    this.renderer.setScissorTest(true);
    this.camera.position.set(0, 0.02, 5.1);

    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 128 });
    room.dispose(); pmrem.dispose();
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.44;
    this.scene.add(new THREE.HemisphereLight("#fff3e6", "#18233a", 0.82));
    const key = new THREE.DirectionalLight("#fff1d8", 1.52);
    key.position.set(-3.8, 4.5, 5.8); this.scene.add(key);
    const fill = new THREE.DirectionalLight("#a8cfff", 0.46);
    fill.position.set(4, -1.5, 3.5); this.scene.add(fill);
    const rim = new THREE.DirectionalLight("#f5a77d", 0.72);
    rim.position.set(-4, 0.5, -3); this.scene.add(rim);

    techFace3DStudies.forEach((study) => {
      const material = new THREE.MeshPhysicalMaterial({
        roughness: 0.56, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.28,
        envMapIntensity: 0.42, reflectivity: 0.22, specularIntensity: 0.2,
        transparent: true, depthWrite: false,
      });
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
          // The photograph is a frontal observation, not a panorama. A broad
          // lateral feather lets the observed face dissolve into the material
          // ovoid instead of ending as a pasted vertical strip.
          float photoFeather = smoothstep(0.055, 0.235, vMapUv.x)
            * (1.0 - smoothstep(0.765, 0.945, vMapUv.x));
          diffuseColor.a *= photoFeather;`);
      };
      material.customProgramCacheKey = () => "face-3d-frontal-feather-v1";
      const coreMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(0.07 + study.ovoid[2] * 0.025, 0.18, 0.31),
        roughness: study.finish[0], metalness: 0.04, clearcoat: study.finish[1], clearcoatRoughness: 0.18, envMapIntensity: 0.76,
      });
      const core = new THREE.Mesh(this.geometry, coreMaterial);
      const photograph = new THREE.Mesh(this.photoGeometry, material);
      core.scale.set(...study.ovoid); photograph.scale.set(...study.ovoid).multiplyScalar(1.003);
      const root = new THREE.Group(); root.add(core, photograph); root.visible = false;
      this.assets.push({ root, material, coreMaterial, loaded: false, failed: false });
      this.scene.add(root);
    });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.addEventListener("change", this.invalidate);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
  }

  private onVisibility = () => {
    window.clearTimeout(this.timer); this.timer = undefined;
    if (!document.hidden) this.invalidate();
  };
  private onContextLost = (event: Event) => {
    event.preventDefault(); this.failed = true;
    window.clearTimeout(this.timer); this.timer = undefined;
    this.entries.forEach(({ canvas }) => { canvas.style.visibility = "hidden"; canvas.dataset.face3dStatus = "fallback"; });
  };
  private invalidate = () => { this.dirty = true; this.schedule(); };
  private schedule() {
    if (this.timer !== undefined || this.disposed || this.failed || document.hidden) return;
    this.timer = window.setTimeout(this.frame, Math.max(0, this.lastFrame + FRAME_MS - performance.now()));
  }

  private request(index: number) {
    if (this.requested.has(index)) return;
    this.requested.add(index);
    const source = new Image();
    source.decoding = "async";
    this.pending.set(index, source);
    source.onload = () => {
      this.pending.delete(index);
      if (this.disposed) return;
      const asset = this.assets[index]!;
      const [left, top, width, height] = techFace3DStudies[index]!.faceWindow;
      const crop = document.createElement("canvas");
      crop.width = 512; crop.height = 640;
      const context = crop.getContext("2d");
      if (!context) return;
      context.drawImage(source, source.naturalWidth * left, source.naturalHeight * top,
        source.naturalWidth * width, source.naturalHeight * height, 0, 0, crop.width, crop.height);
      const texture = new THREE.CanvasTexture(crop);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      texture.needsUpdate = true;
      asset.texture = texture; asset.material.map = texture; asset.material.needsUpdate = true; asset.loaded = true;
      this.invalidate();
    };
    source.onerror = () => {
      this.pending.delete(index);
      const asset = this.assets[index];
      if (asset) asset.failed = true;
      this.entries.forEach((entry) => { if (entry.index === index) { entry.canvas.dataset.face3dStatus = "fallback"; this.setFallback(entry.canvas, true); } });
    };
    source.src = techFace3DStudies[index]!.sourceImage;
  }

  private release(index: number) {
    if ([...this.entries.values()].some((entry) => entry.index === index && (entry.active || entry.inspect))) return;
    const pending = this.pending.get(index);
    if (pending) {
      pending.onload = null; pending.onerror = null; pending.src = "";
      this.pending.delete(index);
    }
    const asset = this.assets[index];
    if (!asset) return;
    asset.texture?.dispose(); asset.texture = undefined;
    asset.material.map = null; asset.material.needsUpdate = true;
    asset.loaded = false; this.requested.delete(index);
  }

  private frame = () => {
    const now = performance.now();
    this.lastFrame = now; this.timer = undefined;
    if (this.disposed || this.failed || document.hidden) return;
    // Inspection is event-driven. Only field forms may retain the 18 Hz loop.
    const needsMotion = !this.reducedMotion.matches && [...this.entries.values()].some((entry) => entry.active && !entry.inspect);
    if (!this.dirty && !needsMotion) return;
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor("#000000", 0);
    this.renderer.clear(true, true, true);
    this.entries.forEach((entry) => {
      const asset = this.assets[entry.index]!;
      if (!asset.loaded) return;
      const study = techFace3DStudies[entry.index]!;
      const pose = this.rotation[entry.index]!;
      if (entry.active && !entry.inspect && !this.reducedMotion.matches) {
        pose.y = study.restingTurn[1] + Math.sin(now * 0.00042 + entry.index * 1.9) * 0.15;
        pose.x = study.restingTurn[0] + Math.sin(now * 0.00029 + entry.index) * 0.045;
      }
      asset.root.rotation.set(pose.x, pose.y, 0);
      const squash = entry.active && !entry.inspect && !this.reducedMotion.matches
        ? Math.sin(now * 0.00057 + entry.index * 2.17) * study.wobble[0]
        : 0;
      asset.root.scale.set(1 + squash, 1 - squash * study.wobble[1], 1 + squash * 0.35);
      asset.root.visible = true;
      const size = entry.inspect ? INSPECT_TILE : TILE;
      const bottom = HEIGHT - size;
      this.renderer.setViewport(0, bottom, size, size);
      this.renderer.setScissor(0, bottom, size, size);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.camera);
      asset.root.visible = false;
      entry.context.clearRect(0, 0, size, size);
      entry.context.drawImage(this.renderer.domElement, 0, 0, size, size, 0, 0, size, size);
      entry.canvas.style.visibility = "visible";
      entry.canvas.dataset.face3dStatus = "ready";
      entry.canvas.dataset.face3dSource = study.id;
      this.setFallback(entry.canvas, false);
    });
    this.dirty = false;
    if (needsMotion) this.schedule();
  };

  attach(canvas: HTMLCanvasElement, index: number, active: boolean, inspect = false) {
    if (!techFace3DStudies[index] || (inspect && [...this.entries.values()].some((entry) => entry.inspect))) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const size = inspect ? INSPECT_TILE : TILE;
    canvas.width = size; canvas.height = size;
    this.entries.set(canvas, { canvas, context, index, active, inspect });
    if (active || inspect) this.request(index);
    this.invalidate();
  }
  private setFallback(canvas: HTMLCanvasElement, visible: boolean) {
    const fallback = canvas.parentElement?.querySelector<HTMLElement>("[data-face3d-fallback]");
    if (fallback) fallback.style.visibility = visible ? "visible" : "hidden";
  }
  update(canvas: HTMLCanvasElement, active: boolean) {
    const entry = this.entries.get(canvas);
    if (entry) {
      entry.active = active;
      if (active) this.request(entry.index); else this.release(entry.index);
      this.invalidate();
    }
  }
  turn(canvas: HTMLCanvasElement, yaw: number, pitch: number) {
    const entry = this.entries.get(canvas);
    if (!entry?.inspect) return;
    const pose = this.rotation[entry.index]!;
    pose.y += yaw; pose.x = THREE.MathUtils.clamp(pose.x + pitch, -0.72, 0.72);
    this.invalidate();
  }
  detach(canvas: HTMLCanvasElement) {
    const entry = this.entries.get(canvas);
    this.entries.delete(canvas);
    if (entry) this.release(entry.index);
    this.invalidate();
  }
  dispose() {
    this.disposed = true; window.clearTimeout(this.timer);
    this.pending.forEach((image) => { image.onload = null; image.onerror = null; image.src = ""; });
    this.pending.clear(); this.entries.clear();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.removeEventListener("change", this.invalidate);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.assets.forEach((asset) => { asset.texture?.dispose(); asset.material.dispose(); asset.coreMaterial.dispose(); });
    this.geometry.dispose(); this.photoGeometry.dispose(); this.environment.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}
