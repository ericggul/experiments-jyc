"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import * as THREE from "three/webgpu";
import { DUFFING_REGIMES, type DuffingRegimeId } from "../model/regimes";
import { DuffingParticleField } from "../rendering/duffing-particle-field";
import styles from "../duffing-field.module.css";

export default function DuffingFieldScreen() {
  const [activeRegimeId, setActiveRegimeId] = useState<DuffingRegimeId>("gamma-050");
  const activeRegime = DUFFING_REGIMES.find(
    (regime) => regime.id === activeRegimeId,
  ) ?? DUFFING_REGIMES[0];

  return (
    <section className={styles.field} aria-label="GPU forced double-well particle field">
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
          <DuffingParticleField regime={activeRegime} />
        </Suspense>
      </Canvas>
      <nav className={styles.systems} aria-label="Drive strengths">
        {DUFFING_REGIMES.map((regime) => (
          <button
            key={regime.id}
            aria-pressed={regime.id === activeRegime.id}
            className={styles.systemButton}
            onClick={() => setActiveRegimeId(regime.id)}
            type="button"
          >
            {regime.label}
          </button>
        ))}
      </nav>
    </section>
  );
}
