"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { KeyboardEvent, MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  CYLINDER_VIEW_YAW_RADIANS,
  GITHUB_SURFACE_SEGMENTS_X,
  GITHUB_SURFACE_SEGMENTS_Y,
  SURFACE_MORPH_END,
  TORUS_VIEW_TILT_RADIANS,
  TORUS_VIEW_YAW_RADIANS,
  surfaceMorphProgress,
  surfaceTargets,
  type SurfaceTarget,
  writeSurfacePositions,
} from "../model/cylinder-morph";
import styles from "./github-cylinder-morph.module.css";

const MAX_TEXTURE_PIXEL_RATIO = 2;
const POSITION_UPDATE_EPSILON = 0.0001;
const WHEEL_PROGRESS_PIXELS = 900;
const TOUCH_PROGRESS_PIXELS = 520;
const KEYBOARD_PROGRESS_STEP = 0.1;

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.closePath();
}

function drawMark(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.save();
  context.translate(x, y);
  context.fillStyle = "#f5f7ff";
  context.beginPath();
  context.arc(0, 0, size / 2, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#0b103e";
  context.lineWidth = Math.max(1.4, size * 0.075);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-size * 0.18, -size * 0.12);
  context.lineTo(-size * 0.02, 0);
  context.lineTo(-size * 0.18, size * 0.12);
  context.moveTo(size * 0.04, size * 0.13);
  context.lineTo(size * 0.22, size * 0.13);
  context.stroke();
  context.restore();
}

function drawGithubSurface(
  context: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
) {
  const compact = cssWidth < 700;
  const headerHeight = compact ? 64 : 72;
  const pad = compact ? 20 : 32;
  const headlineSize = compact
    ? Math.min(42, cssWidth * 0.108)
    : Math.min(64, cssWidth * 0.0445);
  const heroTop = compact ? cssHeight * 0.21 : cssHeight * 0.262;
  const actionWidth = compact ? Math.min(342, cssWidth - 48) : 459;
  const center = cssWidth / 2;

  context.clearRect(0, 0, cssWidth, cssHeight);
  context.fillStyle = "#070b36";
  context.fillRect(0, 0, cssWidth, cssHeight);

  const glow = context.createRadialGradient(
    center,
    cssHeight * 0.82,
    0,
    center,
    cssHeight * 0.82,
    Math.max(cssWidth, cssHeight) * 0.47,
  );
  glow.addColorStop(0, "rgba(137, 94, 255, .94)");
  glow.addColorStop(0.29, "rgba(100, 84, 239, .46)");
  glow.addColorStop(0.72, "rgba(31, 25, 113, .08)");
  glow.addColorStop(1, "rgba(7, 11, 54, 0)");
  context.fillStyle = glow;
  context.fillRect(0, headerHeight, cssWidth, cssHeight - headerHeight);

  drawMark(context, compact ? center : pad + 16, 36, 32);
  context.fillStyle = "#f5f7ff";
  context.font = "500 16px Mona Sans, Arial, sans-serif";
  context.textBaseline = "middle";
  if (compact) {
    context.lineWidth = 1.8;
    context.strokeStyle = "#f5f7ff";
    [-7, 0, 7].forEach((offset) => {
      context.beginPath();
      context.moveTo(20, 32 + offset);
      context.lineTo(40, 32 + offset);
      context.stroke();
    });
    drawRoundedRect(context, cssWidth - 88, 17, 68, 32, 6);
    context.strokeStyle = "rgba(255,255,255,.22)";
    context.stroke();
    context.fillText("Sign in", cssWidth - 74, 33);
  } else {
    const navigation = ["Platform", "Solutions", "Resources", "Open Source", "Enterprise", "Pricing"];
    let cursor = pad + 56;
    for (const label of navigation) {
      context.fillText(label, cursor, 36);
      cursor += context.measureText(label).width + (label === "Pricing" ? 0 : 28);
    }
    const searchWidth = 200;
    const searchX = cssWidth - pad - 200 - 8 - 72 - 8 - 76;
    drawRoundedRect(context, searchX, 20, searchWidth, 32, 6);
    context.strokeStyle = "rgba(255,255,255,.15)";
    context.stroke();
    context.fillText("Search", searchX + 12, 36);
    context.font = "500 12px Mona Sans, Arial, sans-serif";
    context.fillStyle = "#dce2f1";
    context.fillText("/", searchX + searchWidth - 24, 36);
    context.font = "600 14px Mona Sans, Arial, sans-serif";
    context.fillStyle = "#f5f7ff";
    drawRoundedRect(context, searchX + searchWidth + 8, 20, 72, 32, 6);
    context.strokeStyle = "rgba(255,255,255,.15)";
    context.stroke();
    context.fillText("Sign in", searchX + searchWidth + 20, 36);
    drawRoundedRect(context, searchX + searchWidth + 88, 20, 76, 32, 6);
    context.fillStyle = "#282754";
    context.fill();
    context.fillStyle = "#f5f7ff";
    context.fillText("Sign up", searchX + searchWidth + 100, 36);
  }

  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = `425 ${headlineSize}px Mona Sans, Arial, sans-serif`;
  context.textBaseline = "alphabetic";
  const headlineLine = headlineSize * 1.08;
  context.fillText("The future of building", center, heroTop);
  context.fillText("happens together", center, heroTop + headlineLine);

  const bodyTop = heroTop + headlineLine + (compact ? 60 : 74);
  context.font = "400 18px Mona Sans, Arial, sans-serif";
  context.fillStyle = "#f8f9fc";
  if (compact) {
    const lines = [
      "Tools and trends evolve, but",
      "collaboration endures. With GitHub,",
      "developers, agents, and code come",
      "together on one platform.",
    ];
    lines.forEach((line, index) => context.fillText(line, center, bodyTop + index * 27));
  } else {
    context.fillText("Tools and trends evolve, but collaboration endures. With GitHub,", center, bodyTop);
    context.fillText("developers, agents, and code come together on one platform.", center, bodyTop + 27);
  }

  const formTop = compact ? bodyTop + 66 + 32 : bodyTop + 59 + 32;
  const formX = center - actionWidth / 2;
  context.textAlign = "left";
  if (compact) {
    drawRoundedRect(context, formX, formTop, actionWidth, 103, 8);
    context.fillStyle = "#f4f3f6";
    context.fill();
    context.font = "400 16px Mona Sans, Arial, sans-serif";
    context.fillStyle = "#5b5d63";
    context.fillText("Enter your email", formX + 18, formTop + 32);
    drawRoundedRect(context, formX + 4, formTop + 51, actionWidth - 8, 48, 5);
    context.fillStyle = "#08872b";
    context.fill();
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.font = "600 14px Mona Sans, Arial, sans-serif";
    context.fillText("Sign up for GitHub", center, formTop + 81);
    drawRoundedRect(context, formX, formTop + 119, actionWidth, 56, 6);
    context.strokeStyle = "#ffffff";
    context.stroke();
    context.fillStyle = "#a2daff";
    context.fillText("Download GitHub Copilot app", center, formTop + 153);
  } else {
    drawRoundedRect(context, formX, formTop, actionWidth, 56, 8);
    context.fillStyle = "#f4f3f6";
    context.fill();
    context.font = "400 16px Mona Sans, Arial, sans-serif";
    context.fillStyle = "#5b5d63";
    context.fillText("Enter your email", formX + 18, formTop + 34);
    drawRoundedRect(context, formX + actionWidth - 189, formTop + 4, 185, 48, 5);
    context.fillStyle = "#08872b";
    context.fill();
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.font = "600 14px Mona Sans, Arial, sans-serif";
    context.fillText("Sign up for GitHub", formX + actionWidth - 96, formTop + 33);
    const secondaryX = formX + actionWidth + 16;
    drawRoundedRect(context, secondaryX, formTop, 272, 56, 6);
    context.strokeStyle = "#ffffff";
    context.stroke();
    context.fillStyle = "#a2daff";
    context.fillText("Download GitHub Copilot app", secondaryX + 136, formTop + 34);
  }

  const sparkleY = Math.min(cssHeight * 0.84, formTop + (compact ? 250 : 200));
  context.fillStyle = "rgba(255,255,255,.78)";
  for (const [x, y, radius] of [
    [center - 250, sparkleY + 66, 1], [center - 174, sparkleY + 10, 1.5],
    [center - 94, sparkleY + 92, 1], [center - 15, sparkleY + 42, 2],
    [center + 76, sparkleY + 100, 1], [center + 155, sparkleY + 22, 1.5],
    [center + 236, sparkleY + 82, 1],
  ]) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "#d989f1";
  context.beginPath();
  context.ellipse(center + (compact ? 72 : 140), sparkleY + 62, 30, 24, -0.28, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#8060ed";
  context.beginPath();
  context.ellipse(center - (compact ? 72 : 125), sparkleY + 124, 38, 28, 0.36, 0, Math.PI * 2);
  context.fill();
}

function useGithubSurfaceTexture() {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return undefined;

    const nextTexture = new THREE.CanvasTexture(canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.generateMipmaps = false;
    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;

    const repaint = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_TEXTURE_PIXEL_RATIO);
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawGithubSurface(context, width, height);
      nextTexture.needsUpdate = true;
    };

    repaint();
    window.addEventListener("resize", repaint);
    const textureFrame = window.requestAnimationFrame(() => setTexture(nextTexture));
    return () => {
      window.removeEventListener("resize", repaint);
      window.cancelAnimationFrame(textureFrame);
      nextTexture.dispose();
    };
  }, []);

  return texture;
}

function SurfaceMesh({
  inputProgress,
  surfaceTarget,
  texture,
}: {
  inputProgress: MutableRefObject<number>;
  surfaceTarget: MutableRefObject<SurfaceTarget>;
  texture: THREE.CanvasTexture;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const previousProgress = useRef(Number.NaN);
  const previousTarget = useRef<SurfaceTarget | null>(null);
  const positionRef = useRef<THREE.BufferAttribute | null>(null);
  const sourcePositionsRef = useRef<Float32Array | null>(null);
  const { viewport } = useThree();
  const surface = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(
      viewport.width,
      viewport.height,
      GITHUB_SURFACE_SEGMENTS_X,
      GITHUB_SURFACE_SEGMENTS_Y,
    );
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    position.setUsage(THREE.DynamicDrawUsage);
    return {
      geometry,
      sourcePositions: new Float32Array(position.array as Float32Array),
      position,
    };
  }, [viewport.height, viewport.width]);

  useEffect(() => {
    positionRef.current = surface.position;
    sourcePositionsRef.current = surface.sourcePositions;
    previousProgress.current = Number.NaN;
    previousTarget.current = null;
    return () => {
      positionRef.current = null;
      sourcePositionsRef.current = null;
      surface.geometry.dispose();
    };
  }, [surface]);

  useFrame(() => {
    const rawProgress = inputProgress.current;
    const nextTarget = surfaceTarget.current;
    if (
      Math.abs(rawProgress - previousProgress.current) < POSITION_UPDATE_EPSILON
      && nextTarget === previousTarget.current
    ) return;

    const position = positionRef.current;
    const sourcePositions = sourcePositionsRef.current;
    if (!position || !sourcePositions) return;

    previousProgress.current = rawProgress;
    previousTarget.current = nextTarget;
    writeSurfacePositions(
      sourcePositions,
      position.array as Float32Array,
      viewport.width,
      viewport.height,
      nextTarget,
      rawProgress,
    );
    position.needsUpdate = true;

    const mesh = meshRef.current;
    if (mesh) {
      const blend = surfaceMorphProgress(rawProgress);
      mesh.rotation.y = blend * (nextTarget === "torus" ? TORUS_VIEW_YAW_RADIANS : CYLINDER_VIEW_YAW_RADIANS);
      mesh.rotation.x = nextTarget === "torus" ? blend * TORUS_VIEW_TILT_RADIANS : 0;
    }
  });

  return (
    <mesh frustumCulled={false} geometry={surface.geometry} ref={meshRef}>
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

function SurfaceOrbitControls({
  enabled,
  resetKey,
}: {
  enabled: boolean;
  resetKey: number;
}) {
  return (
    <OrbitControls
      enabled={enabled}
      enableDamping={false}
      enablePan
      enableRotate
      enableZoom={false}
      key={resetKey}
      maxDistance={16}
      minDistance={1.1}
      panSpeed={0.8}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
    />
  );
}

function MorphScene({
  cameraNavigationActive,
  cameraResetKey,
  onReady,
  inputProgress,
  surfaceTarget,
  texture,
}: {
  cameraNavigationActive: boolean;
  cameraResetKey: number;
  onReady: (invalidate: () => void) => void;
  inputProgress: MutableRefObject<number>;
  surfaceTarget: MutableRefObject<SurfaceTarget>;
  texture: THREE.CanvasTexture;
}) {
  return (
    <Canvas
      className={styles.canvas}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      onCreated={(state) => onReady(state.invalidate)}
    >
      <color attach="background" args={["#000000"]} />
      <SurfaceMesh inputProgress={inputProgress} surfaceTarget={surfaceTarget} texture={texture} />
      <SurfaceOrbitControls enabled={cameraNavigationActive} resetKey={cameraResetKey} />
    </Canvas>
  );
}

export function GitHubCylinderMorph() {
  const experimentRef = useRef<HTMLElement>(null);
  const inputProgress = useRef(0);
  const surfaceTarget = useRef<SurfaceTarget>("torus");
  const cameraNavigationRef = useRef(false);
  const [selectedTarget, setSelectedTarget] = useState<SurfaceTarget>("torus");
  const [cameraNavigationActive, setCameraNavigationActive] = useState(false);
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const invalidateRef = useRef<(() => void) | null>(null);
  const texture = useGithubSurfaceTexture();

  const setMorphProgress = useCallback((nextProgress: number) => {
    const boundedProgress = Math.min(1, Math.max(0, nextProgress));
    const nextCameraNavigationActive = boundedProgress >= SURFACE_MORPH_END;
    inputProgress.current = boundedProgress;
    if (nextCameraNavigationActive !== cameraNavigationRef.current) {
      cameraNavigationRef.current = nextCameraNavigationActive;
      setCameraNavigationActive(nextCameraNavigationActive);
    }
    invalidateRef.current?.();
  }, []);

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const htmlBackground = document.documentElement.style.backgroundColor;
    const bodyBackground = document.body.style.backgroundColor;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.backgroundColor = "#000000";
    document.body.style.backgroundColor = "#000000";
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.backgroundColor = htmlBackground;
      document.body.style.backgroundColor = bodyBackground;
    };
  }, []);

  useEffect(() => {
    const experiment = experimentRef.current;
    if (!experiment) return undefined;

    let touchY: number | null = null;
    const toPixels = (event: WheelEvent) => event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? event.deltaY * 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? event.deltaY * window.innerHeight
        : event.deltaY;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      setMorphProgress(inputProgress.current + toPixels(event) / WHEEL_PROGRESS_PIXELS);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (inputProgress.current >= SURFACE_MORPH_END) return;
      if (event.pointerType !== "touch") return;
      touchY = event.clientY;
      experiment.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (inputProgress.current >= SURFACE_MORPH_END) return;
      if (event.pointerType !== "touch" || touchY === null) return;
      const delta = touchY - event.clientY;
      touchY = event.clientY;
      setMorphProgress(inputProgress.current + delta / TOUCH_PROGRESS_PIXELS);
    };
    const onPointerEnd = () => { touchY = null; };

    experiment.addEventListener("wheel", onWheel, { passive: false });
    experiment.addEventListener("pointerdown", onPointerDown);
    experiment.addEventListener("pointermove", onPointerMove);
    experiment.addEventListener("pointerup", onPointerEnd);
    experiment.addEventListener("pointercancel", onPointerEnd);
    return () => {
      experiment.removeEventListener("wheel", onWheel);
      experiment.removeEventListener("pointerdown", onPointerDown);
      experiment.removeEventListener("pointermove", onPointerMove);
      experiment.removeEventListener("pointerup", onPointerEnd);
      experiment.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [setMorphProgress]);

  const selectTarget = (nextTarget: SurfaceTarget) => {
    surfaceTarget.current = nextTarget;
    setSelectedTarget(nextTarget);
    setCameraResetKey((key) => key + 1);
    setMorphProgress(0);
  };

  const handleKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    const delta = event.key === "ArrowDown" || event.key === "ArrowRight"
      ? KEYBOARD_PROGRESS_STEP
      : event.key === "ArrowUp" || event.key === "ArrowLeft"
        ? -KEYBOARD_PROGRESS_STEP
        : null;
    if (delta !== null) {
      event.preventDefault();
      setMorphProgress(inputProgress.current + delta);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setMorphProgress(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      setMorphProgress(1);
    }
  };

  return (
    <main
      aria-label="GitHub interface plane-to-surface morph"
      className={styles.experiment}
      onKeyDown={handleKeyboard}
      ref={experimentRef}
      tabIndex={0}
    >
      <span className={styles.screenReaderOnly} aria-live="polite">The GitHub plane will morph into a {selectedTarget}. Use the mouse wheel, a vertical touch drag, or arrow keys to change the morph amount.</span>
      <section aria-hidden="true" className={styles.stickyField}>
        {texture ? (
          <MorphScene
            cameraNavigationActive={cameraNavigationActive}
            cameraResetKey={cameraResetKey}
            onReady={(invalidate) => {
              invalidateRef.current = invalidate;
              invalidate();
            }}
            inputProgress={inputProgress}
            surfaceTarget={surfaceTarget}
            texture={texture}
          />
        ) : null}
      </section>
      <section className={styles.controls} aria-label="Surface target">
        <div className={styles.actions}>
          {surfaceTargets.map((target) => (
            <button
              aria-pressed={selectedTarget === target}
              key={target}
              onClick={() => selectTarget(target)}
              type="button"
            >
              {target}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
