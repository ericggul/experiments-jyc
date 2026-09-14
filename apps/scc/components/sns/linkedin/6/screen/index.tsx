"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import html2canvas from "html2canvas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const RADIAL_SEGMENTS = 160;
const WORLD_TOP_OF_GRID = 3.15;
const INITIAL_IDS = new Set([
  "topbar", "left-0", "left-1", "composer", "sort", "post-0", "post-1", "right-0", "messaging",
]);

let captureQueue = Promise.resolve();
let captureGate: Promise<void> | null = null;
let releaseCaptureGate: (() => void) | null = null;

function pauseCaptures() {
  if (!captureGate) captureGate = new Promise<void>((resolve) => { releaseCaptureGate = resolve; });
}

function resumeCaptures() {
  releaseCaptureGate?.();
  releaseCaptureGate = null;
  captureGate = null;
}

function queueCapture<T>(task: () => Promise<T>) {
  const run = async () => {
    if (captureGate) await captureGate;
    return task();
  };
  const next = captureQueue.then(run, run);
  captureQueue = next.then(() => undefined, () => undefined);
  return next;
}

function children(element: Element | null | undefined) {
  return element ? Array.from(element.children).filter((node): node is HTMLElement => node instanceof HTMLElement) : [];
}

function withText(elements: HTMLElement[], text: string) {
  return elements.find((element) => element.textContent?.includes(text));
}

function sourceSurfaces(root: HTMLElement): Surface[] {
  const shell = root.querySelector<HTMLElement>("main");
  if (!shell) return [];
  const shellChildren = children(shell);
  const topbar = shellChildren.find((element) => element.tagName === "HEADER");
  const grid = shellChildren.find((element) => children(element).filter((child) => child.tagName === "ASIDE").length === 2);
  if (!grid) return [];

  const rootRect = shell.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const gridChildren = children(grid);
  const left = gridChildren.find((element) => element.tagName === "ASIDE");
  const right = [...gridChildren].reverse().find((element) => element.tagName === "ASIDE");
  const feed = gridChildren.find((element) => element.tagName === "SECTION");
  const dock = shellChildren.find((element) => (
    element !== grid && element.tagName === "SECTION" && element.textContent?.includes("Messaging")
  ));
  const output: Surface[] = [];
  const add = (id: string, element: HTMLElement | undefined) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const fixed = getComputedStyle(element).position === "fixed";
    const x = fixed ? rect.left : rect.left - rootRect.left;
    const y = fixed ? rootRect.height - (window.innerHeight - rect.top) : rect.top - rootRect.top;
    output.push({
      element,
      height: rect.height * DOM_WORLD_SCALE,
      heightPx: rect.height,
      id,
      position: [
        (x + rect.width / 2 - (gridRect.left - rootRect.left + gridRect.width / 2)) * DOM_WORLD_SCALE,
        WORLD_TOP_OF_GRID - (y + rect.height / 2 - (gridRect.top - rootRect.top)) * DOM_WORLD_SCALE,
        0,
      ],
      width: rect.width * DOM_WORLD_SCALE,
      widthPx: rect.width,
    });
  };

  add("topbar", topbar);
  children(left).forEach((element, index) => add(`left-${index}`, element));
  const feedChildren = children(feed);
  add("composer", withText(feedChildren, "Start a post"));
  add("sort", withText(feedChildren, "Sort by:"));
  feedChildren.filter((element) => element.tagName === "ARTICLE").forEach((element, index) => add(`post-${index}`, element));
  children(right).forEach((element, index) => add(`right-${index}`, element));
  add("messaging", dock);
  return output;
}

function assertOriginClean(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("LinkedIn surface could not acquire a 2D canvas context.");
  context.getImageData(0, 0, 1, 1);
}

function useSurfaceTexture(surface: Surface, enabled: boolean) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    let frame = 0;
    let timer: number | null = null;
    let current: THREE.CanvasTexture | null = null;
    const paint = async () => {
      frame = 0;
      const canvas = await queueCapture(() => html2canvas(surface.element, {
        allowTaint: false,
        backgroundColor: null,
        imageTimeout: 2_500,
        logging: false,
        onclone: (clone) => {
          const source = clone.querySelector<HTMLElement>("[data-live-linkedin-source]");
          if (!source) return;
          source.style.setProperty("opacity", "1", "important");
          source.style.setProperty("position", "relative", "important");
          source.style.setProperty("left", "0", "important");
          source.style.setProperty("top", "0", "important");
          for (const fixed of Array.from(source.querySelectorAll<HTMLElement>("*"))) {
            if (clone.defaultView?.getComputedStyle(fixed).position === "fixed") {
              fixed.style.setProperty("position", "absolute", "important");
            }
          }
        },
        removeContainer: true,
        scale: 1,
        useCORS: true,
      }));
      assertOriginClean(canvas);
      if (captureGate) await captureGate;
      if (!active) return;
      current?.dispose();
      const next = new THREE.CanvasTexture(canvas);
      next.colorSpace = THREE.SRGBColorSpace;
      next.generateMipmaps = false;
      next.minFilter = THREE.LinearFilter;
      next.magFilter = THREE.LinearFilter;
      next.needsUpdate = true;
      current = next;
      setTexture(next);
    };
    const schedule = (now = false) => {
      if (now) {
        if (!frame) frame = requestAnimationFrame(() => void paint().catch(() => undefined));
        return;
      }
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        if (!frame) frame = requestAnimationFrame(() => void paint().catch(() => undefined));
      }, 120);
    };
    const observer = new MutationObserver(() => schedule());
    const scheduleFromInput = () => schedule();
    observer.observe(surface.element, { attributes: true, characterData: true, childList: true, subtree: true });
    surface.element.addEventListener("input", scheduleFromInput, true);
    surface.element.addEventListener("change", scheduleFromInput, true);
    schedule(true);
    return () => {
      active = false;
      observer.disconnect();
      surface.element.removeEventListener("input", scheduleFromInput, true);
      surface.element.removeEventListener("change", scheduleFromInput, true);
      if (frame) cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
      current?.dispose();
    };
  }, [enabled, surface.element, surface.heightPx, surface.widthPx]);
  return texture;
}

function interactiveTarget(surface: Surface, x: number, y: number) {
  const rootRect = surface.element.getBoundingClientRect();
  return Array.from(surface.element.querySelectorAll<HTMLElement>("button, a, input, textarea, select, [role='button']"))
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return x >= rect.left - rootRect.left && x <= rect.right - rootRect.left
        && y >= rect.top - rootRect.top && y <= rect.bottom - rootRect.top;
    })
    .sort((first, second) => {
      const a = first.getBoundingClientRect();
      const b = second.getBoundingClientRect();
      return a.width * a.height - b.width * b.height;
    })[0];
}

function SurfaceMesh({ enabled, surface }: { enabled: boolean; surface: Surface }) {
  const texture = useSurfaceTexture(surface, enabled);
  const geometry = useMemo(() => {
    const next = new THREE.PlaneGeometry(surface.width, surface.height, RADIAL_SEGMENTS, 1);
    const position = next.getAttribute("position") as THREE.BufferAttribute;
    writeCylinderSurfacePositions(
      new Float32Array(position.array as Float32Array),
      position.array as Float32Array,
      surface.width,
      FULL_CYLINDER_ARC,
    );
    position.needsUpdate = true;
    return next;
  }, [surface.height, surface.width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      position={surface.position}
      visible={Boolean(texture)}
      onClick={(event) => {
        if (!event.uv) return;
        const target = interactiveTarget(surface, event.uv.x * surface.widthPx, (1 - event.uv.y) * surface.heightPx);
        target?.click();
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
          target.focus({ preventScroll: true });
        }
      }}
    >
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

function Scene({ autoRotate, surfaces }: { autoRotate: boolean; surfaces: Surface[] }) {
  const { camera } = useThree();
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(INITIAL_IDS));
  const point = useRef(new THREE.Vector3());
  const resumeTimer = useRef<number | null>(null);
  const revealVisible = useCallback(() => {
    camera.updateMatrixWorld();
    setEnabled((current) => {
      const next = new Set(current);
      surfaces.forEach((surface) => {
        point.current.set(...surface.position).project(camera);
        if (Math.abs(point.current.x) <= 1.22 && Math.abs(point.current.y) <= 1.22 && point.current.z > -1) next.add(surface.id);
      });
      return next;
    });
  }, [camera, surfaces]);
  useEffect(() => { revealVisible(); }, [revealVisible]);
  useEffect(() => () => { if (resumeTimer.current) window.clearTimeout(resumeTimer.current); }, []);
  return (
    <>
      <color attach="background" args={["#f3f2ef"]} />
      {surfaces.map((surface) => <SurfaceMesh enabled={enabled.has(surface.id)} key={surface.id} surface={surface} />)}
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={0.1}
        dampingFactor={0.08}
        enableDamping
        enablePan
        enableRotate
        enableZoom
        maxDistance={180}
        minDistance={4}
        target={[0, 1.2, 0]}
        onStart={() => {
          if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
          pauseCaptures();
        }}
        onEnd={() => {
          revealVisible();
          if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
          resumeTimer.current = window.setTimeout(resumeCaptures, 180);
        }}
      />
    </>
  );
}

export default function LinkedinSixScreen() {
  const source = useRef<HTMLDivElement>(null);
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const root = source.current;
    if (!root) return undefined;
    let frame = 0;
    const sync = () => { frame = 0; setSurfaces(sourceSurfaces(root)); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
    const mutation = new MutationObserver(schedule);
    const resize = new ResizeObserver(schedule);
    mutation.observe(root, { attributes: true, characterData: true, childList: true, subtree: true });
    resize.observe(root);
    requestAnimationFrame(() => requestAnimationFrame(schedule));
    return () => {
      mutation.disconnect();
      resize.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <main className={styles.experiment}>
      <Canvas
        aria-label="Three-dimensional LinkedIn feed. Drag to orbit, scroll or pinch to zoom, and right-drag to pan."
        camera={{ fov: 42, near: 0.1, far: 240, position: [0, 1.45, 17] }}
        className={styles.canvas}
        dpr={[1, 1.5]}
        frameloop="always"
        gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      >
        <Scene autoRotate={!reducedMotion} surfaces={surfaces} />
      </Canvas>
      <div aria-hidden="true" className={styles.captureSource} data-live-linkedin-source ref={source}>
        <LinkedinTwo />
      </div>
    </main>
  );
}
