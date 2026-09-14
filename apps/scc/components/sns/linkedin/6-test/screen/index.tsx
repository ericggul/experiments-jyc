"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import html2canvas from "html2canvas";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import LinkedinTwo from "../../2";
import { writeCylinderSurfacePositions } from "../model/cylinder-layout";
import styles from "./linkedin-rotation.module.css";

type Vector3 = [number, number, number];

type Surface = {
  element: HTMLElement;
  height: number;
  heightPx: number;
  id: string;
  position: Vector3;
  width: number;
  widthPx: number;
};

const DOM_WORLD_SCALE = 0.008;
const FULL_CYLINDER_ARC = Math.PI * 2;
const RADIAL_SEGMENTS = 128;
const VERTICAL_SEGMENTS = 28;
const WORLD_TOP_OF_GRID = 3.15;
let captureQueue = Promise.resolve();
let captureGate: Promise<void> | null = null;
let releaseCaptureGate: (() => void) | null = null;

function pauseCaptures() {
  if (captureGate) return;
  captureGate = new Promise<void>((resolve) => {
    releaseCaptureGate = resolve;
  });
}

function resumeCaptures() {
  releaseCaptureGate?.();
  releaseCaptureGate = null;
  captureGate = null;
}

function queueCapture<T>(capture: () => Promise<T>) {
  const run = async () => {
    if (captureGate) await captureGate;
    return capture();
  };
  const next = captureQueue.then(run, run);
  captureQueue = next.then(() => undefined, () => undefined);
  return next;
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function directChildren(element: Element | null | undefined) {
  return element ? Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement) : [];
}

function childWithText(elements: HTMLElement[], text: string) {
  return elements.find((element) => element.textContent?.includes(text));
}

function sourceSurfaces(root: HTMLElement): Surface[] {
  const shell = root.querySelector<HTMLElement>("main");
  if (!shell) return [];
  const shellChildren = directChildren(shell);
  const topbar = shellChildren.find((element) => element.tagName === "HEADER");
  const grid = shellChildren.find((element) => directChildren(element).filter((child) => child.tagName === "ASIDE").length === 2);
  if (!grid) return [];
  const gridRect = grid.getBoundingClientRect();
  const gridChildren = directChildren(grid);
  const left = gridChildren.find((element) => element.tagName === "ASIDE");
  const right = [...gridChildren].reverse().find((element) => element.tagName === "ASIDE");
  const feed = gridChildren.find((element) => element.tagName === "SECTION");
  const dock = shellChildren.find((element) => element !== grid && element.tagName === "SECTION" && element.textContent?.includes("Messaging"));
  const surfaces: Surface[] = [];
  const add = (id: string, element: HTMLElement | undefined, z = 0) => {
    if (!element) return;
    element.dataset.linkedinSurface = id;
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    surfaces.push({
      element,
      height: rect.height * DOM_WORLD_SCALE,
      heightPx: rect.height,
      id,
      position: [
        (rect.left + rect.width / 2 - (gridRect.left + gridRect.width / 2)) * DOM_WORLD_SCALE,
        WORLD_TOP_OF_GRID - (rect.top + rect.height / 2 - gridRect.top) * DOM_WORLD_SCALE,
        z,
      ],
      width: rect.width * DOM_WORLD_SCALE,
      widthPx: rect.width,
    });
  };

  add("topbar", topbar, -0.12);
  directChildren(left).forEach((element, index) => add(`left-${index}`, element, -0.08 - index * 0.025));
  const feedChildren = directChildren(feed);
  add("composer", childWithText(feedChildren, "Start a post"), 0.08);
  add("sort", childWithText(feedChildren, "Sort by:"), 0.04);
  feedChildren.filter((element) => element.tagName === "ARTICLE").forEach((element, index) => add(`post-${index}`, element, 0.1 + (index % 2) * 0.02));
  directChildren(right).forEach((element, index) => add(`right-${index}`, element, -0.06 - index * 0.025));
  add("messaging", dock, 0.12);
  return surfaces;
}

function interactiveTarget(surface: Surface, x: number, y: number) {
  const rootRect = surface.element.getBoundingClientRect();
  const candidates = Array.from(surface.element.querySelectorAll<HTMLElement>("button, a, input, textarea, select, [role='button']"));
  return candidates
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return x >= rect.left - rootRect.left && x <= rect.right - rootRect.left && y >= rect.top - rootRect.top && y <= rect.bottom - rootRect.top;
    })
    .sort((a, b) => {
      const first = a.getBoundingClientRect();
      const second = b.getBoundingClientRect();
      return first.width * first.height - second.width * second.height;
    })[0];
}

function replayInteraction(surface: Surface, uv: { x: number; y: number }) {
  const x = uv.x * surface.widthPx;
  const y = (1 - uv.y) * surface.heightPx;
  if (x < 0 || x > surface.widthPx || y < 0 || y > surface.heightPx) return;
  const target = interactiveTarget(surface, x, y);
  if (!target) return;
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) target.focus({ preventScroll: true });
}

function eagerSurface(id: string) {
  if (id.startsWith("post-")) return Number(id.slice(5)) < 4;
  return id === "topbar" || id === "left-0" || id === "composer" || id === "sort" || id === "right-0" || id === "messaging";
}

function useLiveCanvasTexture(surface: Surface, enabled: boolean) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    let frame = 0;
    let liveTexture: THREE.CanvasTexture | null = null;
    const paint = async () => {
      frame = 0;
      const canvas = await queueCapture(() => html2canvas(surface.element, {
        allowTaint: false,
        backgroundColor: null,
        ignoreElements: (element) => element instanceof HTMLElement
          && Boolean(element.dataset.linkedinSurface)
          && element.dataset.linkedinSurface !== surface.id,
        logging: false,
        onclone: (documentClone) => {
          const source = documentClone.querySelector<HTMLElement>("[data-live-linkedin-source]");
          if (!source) return;
          source.style.setProperty("opacity", "1", "important");
          source.style.setProperty("position", "relative", "important");
          source.style.setProperty("left", "0", "important");
          source.style.setProperty("top", "0", "important");
          for (const fixed of Array.from(source.querySelectorAll<HTMLElement>("*"))) {
            if (documentClone.defaultView?.getComputedStyle(fixed).position !== "fixed") continue;
            fixed.style.setProperty("position", "absolute", "important");
          }
        },
        removeContainer: true,
        scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
        useCORS: true,
      }));
      if (captureGate) await captureGate;
      if (!active) return;
      liveTexture?.dispose();
      const next = new THREE.CanvasTexture(canvas);
      next.colorSpace = THREE.SRGBColorSpace;
      next.anisotropy = 4;
      next.generateMipmaps = true;
      next.minFilter = THREE.LinearMipmapLinearFilter;
      next.magFilter = THREE.LinearFilter;
      next.needsUpdate = true;
      liveTexture = next;
      setTexture(next);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => void paint());
    };
    const observer = new MutationObserver(schedule);
    observer.observe(surface.element, { attributes: true, characterData: true, childList: true, subtree: true });
    surface.element.addEventListener("input", schedule, true);
    surface.element.addEventListener("change", schedule, true);
    void paint();
    return () => {
      active = false;
      observer.disconnect();
      surface.element.removeEventListener("input", schedule, true);
      surface.element.removeEventListener("change", schedule, true);
      if (frame) cancelAnimationFrame(frame);
      liveTexture?.dispose();
    };
  }, [enabled, surface.element, surface.heightPx, surface.widthPx]);
  return texture;
}

function useCylinderSurfaceGeometry(surface: Surface) {
  const geometry = useMemo(() => {
    const next = new THREE.PlaneGeometry(surface.width, surface.height, RADIAL_SEGMENTS, VERTICAL_SEGMENTS);
    const position = next.getAttribute("position") as THREE.BufferAttribute;
    const source = new Float32Array(position.array as Float32Array);
    writeCylinderSurfacePositions(source, position.array as Float32Array, surface.width, FULL_CYLINDER_ARC);
    position.needsUpdate = true;
    return next;
  }, [surface.height, surface.width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function LiveCylinderSurface({ surface }: { surface: Surface }) {
  const mesh = useRef<THREE.Mesh>(null);
  const projectedPoint = useRef(new THREE.Vector3());
  const [enabled, setEnabled] = useState(() => eagerSurface(surface.id));
  const texture = useLiveCanvasTexture(surface, enabled);
  const geometry = useCylinderSurfaceGeometry(surface);
  useFrame(({ camera }) => {
    if (enabled || !mesh.current) return;
    const point = mesh.current.getWorldPosition(projectedPoint.current).project(camera);
    if (Math.abs(point.x) < 1.2 && Math.abs(point.y) < 1.2 && point.z > -1 && point.z < 1) setEnabled(true);
  });
  return (
    <mesh
      geometry={geometry}
      position={surface.position}
      ref={mesh}
      visible={Boolean(texture)}
      onClick={(event) => {
        if (event.uv) replayInteraction(surface, event.uv);
      }}
    >
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

function SpatialScene({ autoRotate, surfaces }: { autoRotate: boolean; surfaces: Surface[] }) {
  const resumeTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
  }, []);
  return (
    <>
      <color attach="background" args={["#f3f2ef"]} />
      {surfaces.map((surface) => <LiveCylinderSurface key={surface.id} surface={surface} />)}
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={0.1}
        dampingFactor={0.08}
        enableDamping
        enablePan
        enableRotate
        enableZoom
        maxDistance={90}
        minDistance={4}
        onEnd={() => {
          if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
          resumeTimer.current = window.setTimeout(resumeCaptures, 180);
        }}
        onStart={() => {
          if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
          pauseCaptures();
        }}
        target={[0, 1.2, 0]}
      />
    </>
  );
}

export default function LinkedinSixScreen() {
  const referenceRoot = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [surfaces, setSurfaces] = useState<Surface[]>([]);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const root = referenceRoot.current;
    if (!root) return undefined;
    let frame = 0;
    const sync = () => {
      frame = 0;
      setSurfaces(sourceSurfaces(root));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    const observer = new MutationObserver(schedule);
    const resize = new ResizeObserver(schedule);
    observer.observe(root, { attributes: true, characterData: true, childList: true, subtree: true });
    resize.observe(root);
    void nextFrame().then(() => nextFrame()).then(schedule);
    return () => {
      observer.disconnect();
      resize.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className={styles.experiment}>
      <Canvas
        aria-label="Three-dimensional LinkedIn feed. Drag to orbit, scroll or pinch to zoom, and right-drag to pan."
        camera={{ fov: 42, near: 0.1, far: 120, position: [0, 1.45, 17] }}
        className={styles.canvas}
        dpr={[1, 1.5]}
        frameloop="always"
        gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      >
        <SpatialScene autoRotate={!reducedMotion} surfaces={surfaces} />
      </Canvas>
      <div aria-hidden="true" className={styles.captureSource} data-live-linkedin-source ref={referenceRoot}>
        <LinkedinTwo />
      </div>
    </main>
  );
}
