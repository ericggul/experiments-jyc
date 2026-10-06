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
import { buildStructure, frameCentre, POLE_COUNT, rowOfPoles, type SignalConfig } from "./structure";
import { createArrowLedTexture, createConcreteTexture, createGalvanisedRoughness, createLedTexture } from "./textures";

export type { SignalConfig };

// Similar perceived luminance per colour: red has the least luminance per unit.
const LED_INTENSITY: Record<SignalLamp, number> = { red: 11, yellow: 6.5, arrow: 5, green: 5 };
const LENS_GLOW = 0.55;
const SKY = { zenith: "#5f84b4", horizon: "#e6e0d6", ground: "#6d6a65" };
const MIN_CAMERA_HEIGHT = 0.35;
/** Sky and ground reach past the far end of the longest row. */
const WORLD_RADIUS = 4000;
/** Half-width of the sun's shadow box, which follows the view along the row. */
const SHADOW_REACH = 30;

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

export default function TrafficLightCanvas({
  front, back, config,
}: {
  /** Lit lamps for this approach (arm front and pole head). */
  front: readonly SignalLamp[];
  /** Lit lamps for the opposing approach (back heads). */
  back: readonly SignalLamp[];
  config: SignalConfig;
}) {
  const host = useRef<HTMLDivElement>(null);
  const applyLit = useRef<(front: readonly SignalLamp[], back: readonly SignalLamp[]) => void>(() => undefined);
  const applyConfig = useRef<(config: SignalConfig) => void>(() => undefined);
  const initial = useRef({ front, back, config });
  const { headCount, leftTurn, backHead, poleHead, spacing } = config;

  useEffect(() => {
    applyLit.current(front, back);
  }, [front, back]);

  useEffect(() => {
    applyConfig.current({ headCount, leftTurn, backHead, poleHead, spacing });
  }, [headCount, leftTurn, backHead, poleHead, spacing]);

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
    renderer.domElement.setAttribute("aria-label", "Fifty identical Korean traffic signal poles in a straight row down one road. Drag to look around and scroll to move along.");
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
    let lit = { front: initial.current.front, back: initial.current.back };
    let config = initial.current.config;
    let structure: ReturnType<typeof buildStructure> | null = null;
    const build = () => {
      if (structure) {
        scene.remove(structure.group);
        structure.dispose();
      }
      structure = buildStructure({
        config, kit, galvanisedRoughness, concrete: footingConcrete, poles: rowOfPoles(POLE_COUNT, config.spacing),
      });
      structure.light(lit);
      scene.add(structure.group);
      // The row fades into the horizon over most of its length.
      fog.far = Math.max(400, POLE_COUNT * config.spacing * 0.85);
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

    applyLit.current = (front, back) => {
      lit = { front, back };
      structure?.light(lit);
      render();
    };
    applyConfig.current = (next) => {
      if (next.headCount === config.headCount && next.leftTurn === config.leftTurn
        && next.backHead === config.backHead && next.poleHead === config.poleHead
        && next.spacing === config.spacing) return;
      // Keep the same view of the structure while its middle moves with the arm.
      const shift = frameCentre(next) - frameCentre(config);
      config = next;
      build();
      controls.target.x += shift;
      camera.position.x += shift;
      controls.update();
      aimShadow();
      render();
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
      applyLit.current = () => undefined;
      applyConfig.current = () => undefined;
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
