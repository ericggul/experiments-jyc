import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { techEye3DStudies } from "../model/tech-eye-3d";

// A single WebGL context serves the five studies. The DOM canvases only present
// its live renders, retaining the field's existing clipping/scaling/stack order.
const MAX_STUDIES = 6; // Five field models plus one on-demand inspection view.
const MAX_RENDER_SIZE = 256;
const FRAME_MS = 1000 / 24;
const IRIS_RADIUS = Math.sin(0.55);
const IRIS_Z = Math.cos(0.55);

function scleraTexture(seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  let state = seed;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
  const wash = ctx.createLinearGradient(0, 0, 0, 512);
  wash.addColorStop(0, "#d7cdc1"); wash.addColorStop(0.18, "#e5d9cc");
  wash.addColorStop(0.55, "#d9b8ad"); wash.addColorStop(1, "#b7807a");
  ctx.fillStyle = wash; ctx.fillRect(0, 0, 1024, 512);
  // Sparse conjunctival branching, fading toward the corneal limbus.
  for (let n = 0; n < 72; n++) {
    let x = random() * 1024;
    let y = 65 + random() * 370;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let segment = 0; segment < 10; segment++) {
      const nx = x + (random() - 0.5) * 45;
      const ny = y - 7 - random() * 14;
      ctx.quadraticCurveTo(x + (random() - 0.5) * 24, (y + ny) / 2, nx, ny);
      x = nx; y = ny;
    }
    ctx.strokeStyle = `rgba(139,49,57,${0.13 + random() * 0.16})`;
    ctx.lineWidth = 0.5 + random() * 1.1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 6, y - 5, x + 18, y - 6, x + 22, y - 18);
    ctx.lineWidth *= 0.48; ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function irisGeometry(tile: number) {
  const geometry = new THREE.RingGeometry(0.142, IRIS_RADIUS, 96, 16);
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const column = tile % 3, row = Math.floor(tile / 3);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i);
    const radius = Math.hypot(x, y);
    const t = (radius - 0.142) / (IRIS_RADIUS - 0.142);
    // Actual concave iris tissue; the pupil is an opening with a dark cavity.
    position.setZ(i, IRIS_Z - 0.075 * (1 - t) + 0.015 * Math.sin(t * Math.PI));
    uv.setXY(i, (column + 0.5 + x / IRIS_RADIUS * 0.465) / 3,
      (1 - row + 0.5 + y / IRIS_RADIUS * 0.465) / 2);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function corneaMaterial() {
  return new THREE.MeshPhysicalMaterial({
    transmission: 1, thickness: 0.12, ior: 1.376,
    roughness: 0.035, metalness: 0, envMapIntensity: 0.8,
    clearcoat: 1, clearcoatRoughness: 0.025,
  });
}

type Entry = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  scene: THREE.Scene;
  eye: THREE.Group;
  active: boolean;
  dirty: boolean;
  seed: number;
  clock: number;
  textures: THREE.Texture[];
  inspect: boolean;
};

export class TechEyeRenderer {
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  private entries = new Map<HTMLCanvasElement, Entry>();
  private environment: THREE.WebGLRenderTarget;
  private atlas: THREE.Texture;
  private timer: number | undefined;
  private pointer = { x: 0, y: 0, valid: false };
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private disposed = false;
  private ready = false;
  private failed = false;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor("#07090b", 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    this.renderer.transmissionResolutionScale = 1;
    this.camera.position.set(0, 0, 4.25);
    this.camera.lookAt(0, 0, 0);
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(room, 0.03, 0.1, 100, { size: 128 });
    room.dispose(); pmrem.dispose();
    this.atlas = new THREE.TextureLoader().load("/images/0922/blink-auto/iris-atlas.png", () => {
      if (this.disposed) return;
      this.ready = true; this.invalidate();
    }, undefined, () => this.fail());
    this.atlas.colorSpace = THREE.SRGBColorSpace;
    this.atlas.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    document.addEventListener("pointerleave", this.onPointerLeave);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.addEventListener("change", this.invalidate);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
  }

  private onPointer = (event: PointerEvent) => {
    this.pointer = { x: event.clientX, y: event.clientY, valid: true };
  };
  private onPointerLeave = () => { this.pointer.valid = false; };
  private onContextLost = (event: Event) => { event.preventDefault(); this.fail(); };
  private fail() {
    this.failed = true;
    window.clearTimeout(this.timer); this.timer = undefined;
    for (const entry of this.entries.values()) {
      entry.canvas.style.visibility = "hidden";
      entry.canvas.dataset.eye3dStatus = "fallback";
    }
  }
  private onVisibility = () => {
    window.clearTimeout(this.timer); this.timer = undefined;
    if (!document.hidden) this.invalidate();
  };
  private invalidate = () => {
    for (const entry of this.entries.values()) entry.dirty = true;
    this.schedule();
  };
  private schedule() {
    if (this.timer !== undefined || this.disposed || this.failed || document.hidden || !this.ready) return;
    this.timer = window.setTimeout(this.frame, FRAME_MS);
  }
  private frame = () => {
    this.timer = undefined;
    if (this.disposed || this.failed || document.hidden) return;
    let continueAnimation = false;
    for (const entry of this.entries.values()) {
      const animate = entry.active && !entry.inspect && !this.reducedMotion.matches;
      if (!entry.dirty && !animate) continue;
      const rect = entry.canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1 || rect.bottom < 0 || rect.top > window.innerHeight) continue;
      const size = Math.min(MAX_RENDER_SIZE, Math.max(32, Math.ceil(rect.width)));
      if (entry.canvas.width !== size) { entry.canvas.width = size; entry.canvas.height = size; }
      if (animate) {
        entry.clock += FRAME_MS / 1000;
        const t = entry.clock, phase = entry.seed * 0.71;
        let x = Math.sin(t * 0.43 + phase) * 0.21;
        let y = Math.sin(t * 0.31 + phase * 2) * 0.10;
        if (this.pointer.valid) {
          x += THREE.MathUtils.clamp((this.pointer.x - rect.x - rect.width / 2) / 900, -0.28, 0.28);
          y -= THREE.MathUtils.clamp((this.pointer.y - rect.y - rect.height / 2) / 900, -0.19, 0.19);
        }
        entry.eye.rotation.y += (x - entry.eye.rotation.y) * 0.13;
        entry.eye.rotation.x += (y - entry.eye.rotation.x) * 0.13;
      }
      this.renderer.setSize(size, size, false);
      this.renderer.render(entry.scene, this.camera);
      entry.context.clearRect(0, 0, size, size);
      entry.context.drawImage(this.renderer.domElement, 0, 0);
      entry.canvas.style.visibility = "visible";
      entry.canvas.dataset.eye3dStatus = "ready";
      entry.dirty = false;
      continueAnimation ||= animate;
    }
    if (continueAnimation) this.schedule();
  };

  attach(canvas: HTMLCanvasElement, index: number, active: boolean, inspect = false) {
    if (this.entries.size >= MAX_STUDIES) return;
    const study = techEye3DStudies.find((item) => item.index === index);
    const context = canvas.getContext("2d", { alpha: false });
    if (!study || !context) return;
    const scene = new THREE.Scene();
    scene.environment = this.environment.texture;
    scene.environmentIntensity = 0.4;
    scene.add(new THREE.HemisphereLight("#fff5e8", "#4a3035", 0.6));
    const key = new THREE.DirectionalLight("#fff0dc", 1.8);
    key.position.set(-3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight("#b7d4ef", 0.6);
    fill.position.set(4, -1, 2); scene.add(fill);
    const eye = new THREE.Group();
    eye.rotation.set(-0.055, 0.08 * (index % 2 ? -1 : 1), 0);
    scene.add(eye);
    const scleraMap = scleraTexture(study.seed);
    const sclera = new THREE.SphereGeometry(1, 80, 48, 0, Math.PI * 2, 0.55, Math.PI - 0.55);
    sclera.rotateX(Math.PI / 2);
    eye.add(new THREE.Mesh(sclera, new THREE.MeshPhysicalMaterial({
      map: scleraMap, bumpMap: scleraMap, bumpScale: 0.004,
      roughness: 0.4, metalness: 0, clearcoat: 0.7,
      clearcoatRoughness: 0.15, ior: 1.376, envMapIntensity: 0.35,
    })));
    eye.add(new THREE.Mesh(irisGeometry(study.atlas), new THREE.MeshPhysicalMaterial({
      map: this.atlas, bumpMap: this.atlas, bumpScale: 0.012,
      roughness: 0.68, metalness: 0, envMapIntensity: 0.20,
    })));
    const cavity = new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 24), new THREE.MeshBasicMaterial({ color: "#010101" }));
    cavity.position.z = IRIS_Z - 0.24;
    eye.add(cavity);
    const corneaRadius = 0.64;
    const cap = new THREE.SphereGeometry(corneaRadius, 64, 32, 0, Math.PI * 2, 0, Math.asin(IRIS_RADIUS / corneaRadius));
    cap.rotateX(Math.PI / 2);
    cap.translate(0, 0, IRIS_Z - Math.sqrt(corneaRadius ** 2 - IRIS_RADIUS ** 2));
    eye.add(new THREE.Mesh(cap, corneaMaterial()));
    this.entries.set(canvas, { canvas, context, scene, eye, active, dirty: true, seed: study.seed, clock: 0, textures: [scleraMap], inspect });
    this.schedule();
  }

  update(canvas: HTMLCanvasElement, active: boolean) {
    const entry = this.entries.get(canvas);
    if (entry) { entry.active = active; entry.dirty = true; this.schedule(); }
  }

  turn(canvas: HTMLCanvasElement, x: number, y: number) {
    const entry = this.entries.get(canvas);
    if (!entry?.inspect) return;
    entry.eye.rotation.x = THREE.MathUtils.clamp(entry.eye.rotation.x + y, -1.4, 1.4);
    entry.eye.rotation.y += x;
    entry.dirty = true;
    this.schedule();
  }

  detach(canvas: HTMLCanvasElement) {
    const entry = this.entries.get(canvas);
    if (!entry) return;
    entry.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    entry.textures.forEach((texture) => texture.dispose());
    this.entries.delete(canvas);
  }

  dispose() {
    this.disposed = true;
    window.clearTimeout(this.timer);
    for (const canvas of this.entries.keys()) this.detach(canvas);
    window.removeEventListener("pointermove", this.onPointer);
    document.removeEventListener("pointerleave", this.onPointerLeave);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.removeEventListener("change", this.invalidate);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.atlas.dispose(); this.environment.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}
