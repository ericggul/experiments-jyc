"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import * as THREE from "three/webgpu";
import { MAP_SYSTEMS, type MapSystemId } from "../model/maps";
import { MapParticleField } from "../rendering/map-particle-field";
import styles from "../bifurcation-field.module.css";

export default function BifurcationFieldScreen() {
  const [activeSystemId, setActiveSystemId] = useState<MapSystemId>("logistic");
  const activeSystem = MAP_SYSTEMS.find(
    (system) => system.id === activeSystemId,
  ) ?? MAP_SYSTEMS[0];

  return (
    <section className={styles.field} aria-label="GPU bifurcation particle field">
      <Canvas
        className={styles.canvas}
        camera={{ fov: 40, position: [1.1, 0.55, 6.9] }}
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
          <MapParticleField system={activeSystem} />
        </Suspense>
      </Canvas>
      <nav className={styles.systems} aria-label="Bifurcating maps">
        {MAP_SYSTEMS.map((system) => (
          <button
            key={system.id}
            aria-pressed={system.id === activeSystem.id}
            className={styles.systemButton}
            onClick={() => setActiveSystemId(system.id)}
            type="button"
          >
            {system.label}
          </button>
        ))}
      </nav>
    </section>
  );
}
