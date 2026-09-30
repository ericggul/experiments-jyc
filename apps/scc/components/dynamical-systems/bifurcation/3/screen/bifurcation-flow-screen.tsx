"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three/webgpu";
import { BIFURCATING_FLOWS, type BifurcatingFlowId } from "../model/flows";
import {
  FlowParticleField,
  currentDriftingParameter,
} from "../rendering/flow-particle-field";
import styles from "../bifurcation-flow.module.css";

const READOUT_INTERVAL_MS = 120;

export default function BifurcationFlowScreen() {
  const [activeFlowId, setActiveFlowId] = useState<BifurcatingFlowId>("thomas");
  const activeFlow = BIFURCATING_FLOWS.find(
    (flow) => flow.id === activeFlowId,
  ) ?? BIFURCATING_FLOWS[0];
  const [parameter, setParameter] = useState<number>(activeFlow.from);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setParameter(currentDriftingParameter());
    }, READOUT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const digits = Math.abs(activeFlow.to - activeFlow.from) > 5 ? 2 : 3;

  return (
    <section className={styles.field} aria-label="GPU bifurcating flow particle field">
      <Canvas
        className={styles.canvas}
        camera={{ position: [-4, 3, 4] }}
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
          <FlowParticleField flow={activeFlow} />
        </Suspense>
      </Canvas>
      <nav className={styles.systems} aria-label="Bifurcating flows">
        {BIFURCATING_FLOWS.map((flow) => (
          <button
            key={flow.id}
            aria-pressed={flow.id === activeFlow.id}
            className={styles.systemButton}
            onClick={() => setActiveFlowId(flow.id)}
            type="button"
          >
            {flow.label}
          </button>
        ))}
        <output className={styles.parameter} aria-live="off">
          {activeFlow.symbol} {parameter.toFixed(digits)}
        </output>
      </nav>
    </section>
  );
}
