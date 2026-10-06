"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { SignalLamp } from "../model/signal-cycle";
import { createHeadKit, type LedTextures } from "./signal-head";
import type { PoleSpec } from "../model/arrangement";
import { LAMP_FACES } from "../model/lamp-faces";
import { signalAt, type SignalPhase } from "../model/signal-cycle";
import { buildStructure, frameCentre, type SignalConfig } from "./structure";
import {
  createArrowLedTexture, createConcreteTexture, createGalvanisedRoughness, createImageLedTexture, createLedTexture,
} from "./textures";

export type { SignalConfig };

// Similar perceived luminance per colour: red has the least luminance per unit.
const LED_INTENSITY: Record<SignalLamp, number> = { red: 11, yellow: 6.5, arrow: 5, green: 5 };
const LENS_GLOW = 0.55;
const SKY = { zenith: "#5f84b4", horizon: "#e6e0d6", ground: "#6d6a65" };
const MIN_CAMERA_HEIGHT = 0.35;
/** Shortest wait between signal updates: off-sync poles change often, so updates batch at 30 Hz. */
const MIN_SIGNAL_TICK_MS = 1000 / 30;
/** Sky and ground reach past the far end of the longest row. */
const WORLD_RADIUS = 4000;
/** Half-width of the sun's shadow box, which follows the view along the row. */
const SHADOW_REACH = 30;

/** The row fades into the horizon over most of its length. */
const fogFar = (poles: readonly PoleSpec[]) => {
  const reach = Math.max(...poles.map(({ x, z }) => Math.hypot(x - poles[0].x, z - poles[0].z)));
  return Math.max(400, reach * 0.85);
};

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      geometries.add(node.geometry);
      for (const material of [node.material].flat()) materials.add(material);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function createSkyDome() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      zenith: { value: new THREE.Color(SKY.zenith) },
      horizon: { value: new THREE.Color(SKY.horizon) },
      ground: { value: new THREE.Color(SKY.ground) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 zenith;
      uniform vec3 horizon;
      uniform vec3 ground;
      varying vec3 vDirection;
      void main() {
        float y = vDirection.y;
        vec3 sky = mix(horizon, zenith, pow(smoothstep(0.0, 1.0, y), 0.55));
        vec3 below = mix(horizon, ground, smoothstep(0.0, 0.08, -y));
        gl_FragColor = vec4(y >= 0.0 ? sky : below, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(WORLD_RADIUS, 48, 24), material);
  // Drawn first and behind everything, so poles beyond its radius still show.
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  return dome;
}

export type SignalPlan = { phases: readonly SignalPhase[]; opposingOffset: number };

export default function TrafficLightCanvas({
  plan, config, poles, lampFace,
}: {
  /** The timing plan every pole runs on its own clock (rate and phase from its spec). */
  plan: SignalPlan;
  config: SignalConfig;
  /** Where each pole stands and how it differs; the count stays fixed. */
  poles: readonly PoleSpec[];
  /** Id of the face shown on the round lamps (`LAMP_FACES`). */
  lampFace: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const applyConfig = useRef<(config: SignalConfig) => void>(() => undefined);
  const applyPoles = useRef<(poles: readonly PoleSpec[]) => void>(() => undefined);
  const applyFace = useRef<(face: string) => void>(() => undefined);
  const initial = useRef({ plan, config, poles, lampFace });
  const { headCount, leftTurn, backHead, poleHead } = config;

  useEffect(() => {
    applyConfig.current({ headCount, leftTurn, backHead, poleHead });
  }, [headCount, leftTurn, backHead, poleHead]);

  useEffect(() => {
    applyPoles.current(poles);
  }, [poles]);

  useEffect(() => {
    applyFace.current(lampFace);
  }, [lampFace]);

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // The scene is static between signal changes: one shadow pass is enough.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "Fifty identical Korean traffic signal poles, arranged in a line or a circle, at even or scattered heights. Drag to look around and scroll to move closer.");
    mount.appendChild(renderer.domElement);
    const anisotropy = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    const sky = createSkyDome();
    scene.add(sky);
    const fog = new THREE.Fog(SKY.horizon, 60, 400);
    scene.fog = fog;

    // Image-based light from the same sky, so metal reflects the visible horizon.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const skyScene = new THREE.Scene();
    skyScene.add(createSkyDome());
    const environment = pmrem.fromScene(skyScene, 0.02);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.85;
    skyScene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        (node.material as THREE.Material).dispose();
      }
    });
    pmrem.dispose();

    const sun = new THREE.DirectionalLight("#fff0dc", 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.left = -SHADOW_REACH;
    sun.shadow.camera.right = SHADOW_REACH;
    sun.shadow.camera.top = SHADOW_REACH;
    sun.shadow.camera.bottom = -SHADOW_REACH;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 3;
    scene.add(sun, sun.target);

    const textures: LedTextures = { disc: createLedTexture(anisotropy), arrow: createArrowLedTexture(anisotropy) };
    const galvanisedRoughness = createGalvanisedRoughness(anisotropy);
    galvanisedRoughness.repeat.set(1, 5);
    const footingConcrete = createConcreteTexture(anisotropy, 3, 0.64);
    const pavement = createConcreteTexture(anisotropy, 9, 0.47);
    pavement.repeat.set(WORLD_RADIUS / 1.75, WORLD_RADIUS / 1.75);

    const groundMaterial = new THREE.MeshStandardMaterial({ map: pavement, roughness: 0.96 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_RADIUS * 2, WORLD_RADIUS * 2), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const kit = createHeadKit(textures, LED_INTENSITY, LENS_GLOW);
    let disposed = false;
    let config = initial.current.config;
    let poles = initial.current.poles;
    let structure: ReturnType<typeof buildStructure> | null = null;
    const build = () => {
      if (structure) {
        scene.remove(structure.group);
        structure.dispose();
      }
      structure = buildStructure({
        config, kit, galvanisedRoughness, concrete: footingConcrete, poles,
      });
      scene.add(structure.group);
      fog.far = fogFar(poles);
      renderer.shadowMap.needsUpdate = true;
    };
    build();

    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, WORLD_RADIUS * 1.5);
    // Looking down the road from the kerb behind the first pole, the row receding toward the horizon.
    const target = new THREE.Vector3(frameCentre(config), 4, -30);
    // A pedestrian's view from the kerb, square to the arm so the lamp row reads level;
    // pulled back on narrow screens to keep the arm in frame.
    const reach = Math.max(1, 1.2 / (width / height));
    camera.position.set(-1.5, -2.35, 42).multiplyScalar(reach).add(target);
    camera.position.y = Math.max(camera.position.y, 1.65);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 1.6;
    controls.maxDistance = 300;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.target.copy(target);
    controls.update();

    const renderTarget = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, renderTarget);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.62, 0.48, 1.15);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    let frame = 0;
    const render = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        composer.render();
      });
    };

    // Each pole runs the plan on its own clock: local time = elapsed × rate + phase × cycle.
    // The next wake is the soonest change on any pole; synchronised poles all change together.
    const { phases, opposingOffset } = initial.current.plan;
    const cycle = phases.reduce((sum, phase) => sum + phase.seconds, 0);
    const clockStart = performance.now();
    let lit: { front: readonly SignalLamp[]; back: readonly SignalLamp[] }[] = [];
    let signalTimer = 0;
    const tick = () => {
      window.clearTimeout(signalTimer);
      const elapsed = (performance.now() - clockStart) / 1000;
      let soonest = Infinity;
      lit = poles.map(({ rate = 1, phase = 0 }) => {
        const local = elapsed * rate + phase * cycle;
        const front = signalAt(phases, local);
        const back = signalAt(phases, local + opposingOffset);
        soonest = Math.min(soonest, front.remaining / rate, back.remaining / rate);
        return { front: front.lit, back: back.lit };
      });
      structure?.light((pole, approach) => lit[pole][approach]);
      render();
      signalTimer = window.setTimeout(tick, Math.max(MIN_SIGNAL_TICK_MS, soonest * 1000 + 5));
    };
    tick();
    // Image faces load once and stay cached; a later choice wins over a slower earlier load.
    const faceTextures = new Map<string, Partial<Record<SignalLamp, THREE.Texture>>>();
    let wantedFace = initial.current.lampFace;
    const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
    applyFace.current = async (id) => {
      wantedFace = id;
      const face = LAMP_FACES.find((entry) => entry.id === id);
      if (!face?.images) {
        kit.setFaces(null);
        render();
        return;
      }
      let faces = faceTextures.get(id);
      if (!faces) {
        const loaded: Partial<Record<SignalLamp, THREE.Texture>> = {};
        try {
          await Promise.all(Object.entries(face.images).map(async ([lamp, { url, mask }]) => {
            loaded[lamp as SignalLamp] = createImageLedTexture(await loadImage(url), mask, anisotropy);
          }));
        } catch {
          return;
        }
        faces = loaded;
        faceTextures.set(id, faces);
      }
      if (wantedFace !== id || disposed) return;
      kit.setFaces(faces);
      render();
    };
    applyFace.current(wantedFace);

    applyPoles.current = (next) => {
      if (next === poles) return;
      const sameCount = next.length === poles.length;
      poles = next;
      // Same number of poles moved, turned or stretched: rewrite instance matrices, keep every geometry.
      // A different number (another layout, or the grid's size) rebuilds the instance buffers once.
      if (sameCount) {
        structure?.place(poles);
        fog.far = fogFar(poles);
        renderer.shadowMap.needsUpdate = true;
      } else {
        build();
      }
      // New clocks or new poles: relight from the current time.
      tick();
    };
    applyConfig.current = (next) => {
      if (next.headCount === config.headCount && next.leftTurn === config.leftTurn
        && next.backHead === config.backHead && next.poleHead === config.poleHead) return;
      // Keep the same view of the structure while its middle moves with the arm.
      const shift = frameCentre(next) - frameCentre(config);
      config = next;
      build();
      controls.target.x += shift;
      camera.position.x += shift;
      controls.update();
      aimShadow();
      tick();
    };
    render();

    // One shadow box cannot cover a kilometre-long row at useful resolution; it sits on
    // the ground just ahead of the camera, where shadows are legible, and moves with the view.
    const shadowCentre = new THREE.Vector3();
    const aimShadow = () => {
      camera.getWorldDirection(shadowCentre);
      shadowCentre.y = 0;
      if (shadowCentre.lengthSq() < 1e-6) shadowCentre.set(0, 0, -1);
      shadowCentre.normalize().multiplyScalar(SHADOW_REACH * 0.6).add(camera.position);
      shadowCentre.y = 2.5;
      sun.target.position.copy(shadowCentre);
      sun.position.copy(shadowCentre).add(new THREE.Vector3(-9.5, 8.5, 9));
      renderer.shadowMap.needsUpdate = true;
    };
    aimShadow();

    let clamping = false;
    const onControlsChange = () => {
      if (!clamping && camera.position.y < MIN_CAMERA_HEIGHT) {
        clamping = true;
        camera.position.y = MIN_CAMERA_HEIGHT;
        controls.update();
        clamping = false;
      }
      aimShadow();
      render();
    };
    controls.addEventListener("change", onControlsChange);

    const resize = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(1, entry.contentRect.width);
      const nextHeight = Math.max(1, entry.contentRect.height);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight, false);
      composer.setSize(nextWidth, nextHeight);
      render();
    });
    resize.observe(mount);

    return () => {
      window.clearTimeout(signalTimer);
      applyConfig.current = () => undefined;
      applyPoles.current = () => undefined;
      applyFace.current = () => undefined;
      disposed = true;
      faceTextures.forEach((faces) => Object.values(faces).forEach((texture) => texture?.dispose()));
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.removeEventListener("change", onControlsChange);
      controls.dispose();
      if (structure) {
        scene.remove(structure.group);
        structure.dispose();
      }
      kit.dispose();
      disposeObject(scene);
      [textures.disc, textures.arrow, galvanisedRoughness, footingConcrete, pavement].forEach((texture) => texture.dispose());
      environment.dispose();
      sun.shadow.dispose();
      composer.dispose();
      renderTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="traffic-light-canvas" />;
}
