"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three/webgpu";
import { SWEEP_FROM } from "../model/sweep";
import {
  DuffingSweepField,
  currentDriveAmplitude,
} from "../rendering/duffing-sweep-field";
import styles from "../duffing-sweep.module.css";

const READOUT_INTERVAL_MS = 120;

export default function DuffingSweepScreen() {
  const [driveAmplitude, setDriveAmplitude] = useState(SWEEP_FROM);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDriveAmplitude(currentDriveAmplitude());
    }, READOUT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={styles.field} aria-label="GPU forced double-well particle field with a drifting drive">
      <Canvas
        className={styles.canvas}
        camera={{ fov: 40, position: [0, 2.9, 7.4] }}
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer(
            props as unknown as THREE.WebGPURendererParameters,
          );
          await renderer.init();
          return renderer;
        }}
      >
        <Suspense>
          <color attach="background" args={["#000000"]} />
          <OrbitControls />
          <DuffingSweepField />
        </Suspense>
      </Canvas>
      <div className={styles.systems}>
        <output className={styles.parameter}>γ {driveAmplitude.toFixed(3)}</output>
      </div>
    </section>
  );
}
