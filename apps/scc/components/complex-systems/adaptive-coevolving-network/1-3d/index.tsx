"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./coevolving-voter-3d.module.css";
import { DEFAULT_PARAMETERS } from "./model";
import NetworkScene, { type SceneApi } from "./network-scene";

/** Pointer travel beyond which a press is an orbit, not a tap. */
const DRAG_THRESHOLD = 6;

function deviceCoordinates(event: PointerEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    y: -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
  };
}

export default function CoevolvingVoterThreeDimensional() {
  const [rewiring, setRewiring] = useState(DEFAULT_PARAMETERS.rewiring);
  const [touched, setTouched] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const rewiringRef = useRef(DEFAULT_PARAMETERS.rewiring);
  const apiRef = useRef<SceneApi | null>(null);
  const pressRef = useRef<{ x: number; y: number; dragging: boolean } | null>(null);

  useEffect(() => {
    rewiringRef.current = rewiring;
  }, [rewiring]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <main className={styles.page}>
      <div
        className={styles.stage}
        role="application"
        tabIndex={0}
        aria-label="Coevolving voter network in three dimensions. Each voter disagreeing with a tie either adopts that neighbour's view or cuts the tie and reconnects to someone who already agrees. Drag to turn the volume; tap a voter to plant the least-held view around it; tap empty space to add a voter holding that view, tied to the two nearest voters. Press N to add a voter at the centre, Enter to plant at the centre."
        // Every drag orbits; only a press that stays put acts on the network.
        onPointerDown={(event) => {
          pressRef.current = { x: event.clientX, y: event.clientY, dragging: false };
        }}
        onPointerMove={(event) => {
          const press = pressRef.current;
          if (!press || press.dragging) return;
          if (Math.hypot(event.clientX - press.x, event.clientY - press.y) >= DRAG_THRESHOLD) {
            press.dragging = true;
          }
        }}
        onPointerUp={(event) => {
          const press = pressRef.current;
          pressRef.current = null;
          if (!press || press.dragging) return;
          const point = deviceCoordinates(event);
          const voter = apiRef.current?.pick(point.x, point.y) ?? null;
          if (voter !== null) apiRef.current?.plantAround(voter);
          else apiRef.current?.addAt(point.x, point.y);
        }}
        onPointerCancel={() => {
          pressRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "n" || event.key === "N") {
            apiRef.current?.addAtCentre();
            return;
          }
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          apiRef.current?.plantAtCentre();
        }}
      >
        <Canvas
          className={styles.canvas}
          camera={{ position: [-4, 3, 4] }}
          dpr={[1, 2]}
          frameloop="demand"
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <color attach="background" args={["#000000"]} />
          <NetworkScene
            apiRef={apiRef}
            onTouched={() => setTouched(true)}
            reduceMotion={reduceMotion}
            rewiringRef={rewiringRef}
          />
          <OrbitControls
            dampingFactor={0.08}
            enableDamping
            enablePan={false}
            rotateSpeed={0.9}
            maxDistance={14}
            minDistance={1.5}
          />
        </Canvas>
      </div>

      <div className={styles.control}>
        <p className={styles.hint} data-hidden={touched}>
          drag to turn, tap a voter to plant a view, tap space to add one
        </p>
        <label className={styles.balance}>
          <span>adopt</span>
          <input
            aria-label="When voters disagree: adopt the neighbour's view, or rewire to someone like-minded"
            aria-valuetext={`${Math.round(rewiring * 100)}% rewire, ${Math.round((1 - rewiring) * 100)}% adopt`}
            max="1"
            min="0"
            step="0.01"
            type="range"
            value={rewiring}
            onChange={(event) => setRewiring(Number(event.target.value))}
          />
          <span>rewire</span>
        </label>
      </div>
    </main>
  );
}
