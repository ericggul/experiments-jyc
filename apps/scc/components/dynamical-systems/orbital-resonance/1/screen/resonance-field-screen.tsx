"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import * as THREE from "three/webgpu";
import {
  RESONANCE_PRESETS,
  type ResonancePresetId,
} from "../model/resonances";
import { ResonanceParticleField } from "../rendering/resonance-particle-field";
import styles from "../resonance-field.module.css";

export default function ResonanceFieldScreen() {
  const [activePresetId, setActivePresetId] = useState<ResonancePresetId>("three-two");
  const activePreset = RESONANCE_PRESETS.find(
    (preset) => preset.id === activePresetId,
  ) ?? RESONANCE_PRESETS[0];

  return (
    <section className={styles.field} aria-label="GPU orbital resonance particle field">
      <Canvas
        className={styles.canvas}
        camera={{ fov: 42, position: [0, 3.1, 2.1] }}
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
          <ResonanceParticleField preset={activePreset} />
        </Suspense>
      </Canvas>
      <nav className={styles.systems} aria-label="Period ratios">
        {RESONANCE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            aria-pressed={preset.id === activePreset.id}
            className={styles.systemButton}
            onClick={() => setActivePresetId(preset.id)}
            type="button"
          >
            {preset.label}
          </button>
        ))}
      </nav>
    </section>
  );
}
