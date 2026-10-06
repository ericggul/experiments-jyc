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
import { buildStructure, frameCentre, type SignalConfig } from "./structure";
import { createArrowLedTexture, createConcreteTexture, createGalvanisedRoughness, createLedTexture } from "./textures";

export type { SignalConfig };

// Similar perceived luminance per colour: red has the least luminance per unit.
const LED_INTENSITY: Record<SignalLamp, number> = { red: 11, yellow: 6.5, arrow: 5, green: 5 };
const LENS_GLOW = 0.55;
const SKY = { zenith: "#5f84b4", horizon: "#e6e0d6", ground: "#6d6a65" };
const MIN_CAMERA_HEIGHT = 0.35;

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
  return new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), material);
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
  const { headCount, leftTurn, backHead, poleHead } = config;

  useEffect(() => {
    applyLit.current(front, back);
  }, [front, back]);

  useEffect(() => {
    applyConfig.current({ headCount, leftTurn, backHead, poleHead });
  }, [headCount, leftTurn, backHead, poleHead]);

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
    renderer.domElement.setAttribute("aria-label", "Korean vehicle traffic signals on a galvanised cantilever pole. Drag to look around them and scroll to move closer.");
    mount.appendChild(renderer.domElement);
    const anisotropy = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    const sky = createSkyDome();
    scene.add(sky);
    scene.fog = new THREE.Fog(SKY.horizon, 45, 190);

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
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -16;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 45;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 3;
    scene.add(sun, sun.target);

    const textures: LedTextures = { disc: createLedTexture(anisotropy), arrow: createArrowLedTexture(anisotropy) };
    const galvanisedRoughness = createGalvanisedRoughness(anisotropy);
    galvanisedRoughness.repeat.set(1, 5);
    const footingConcrete = createConcreteTexture(anisotropy, 3, 0.64);
    const pavement = createConcreteTexture(anisotropy, 9, 0.47);
    pavement.repeat.set(140, 140);

    const groundMaterial = new THREE.MeshStandardMaterial({ map: pavement, roughness: 0.96 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), groundMaterial);
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
      structure = buildStructure({ config, kit, galvanisedRoughness, concrete: footingConcrete });
      structure.light(lit);
      scene.add(structure.group);
      const centre = frameCentre(config);
      sun.target.position.set(centre, 2.5, 0);
      sun.position.set(centre - 9.5, 11, 9);
      renderer.shadowMap.needsUpdate = true;
    };
    build();

    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 600);
    const target = new THREE.Vector3(frameCentre(config), 3.3, 0);
    // A pedestrian's view from the kerb, square to the arm so the lamp row reads level;
    // pulled back on narrow screens to keep the arm in frame.
    const reach = Math.max(1, 1.2 / (width / height));
    camera.position.set(0, -1.65, 12.2).multiplyScalar(reach).add(target);
    camera.position.y = Math.max(camera.position.y, 1.65);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 1.6;
    controls.maxDistance = 26;
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
        && next.backHead === config.backHead && next.poleHead === config.poleHead) return;
      // Keep the same view of the structure while its middle moves with the arm.
      const shift = frameCentre(next) - frameCentre(config);
      config = next;
      build();
      controls.target.x += shift;
      camera.position.x += shift;
      controls.update();
      render();
    };
    render();

    let clamping = false;
    const onControlsChange = () => {
      if (!clamping && camera.position.y < MIN_CAMERA_HEIGHT) {
        clamping = true;
        camera.position.y = MIN_CAMERA_HEIGHT;
        controls.update();
        clamping = false;
      }
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
