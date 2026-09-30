import { extend, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import {
  code,
  instanceIndex,
  instancedArray,
  uniform,
  uv,
  wgslFn,
} from "three/tsl";
import { parameterAt, type BifurcatingFlow } from "../model/flows";

extend(THREE as never);

export const PARTICLE_COUNT = 30_000;

// One field is mounted at a time, so the drifting parameter and the noise
// seed are single module-level uniforms shared by whichever flow is shown.
const driftingParameter = uniform(0);
const noiseSeed = uniform(0);

export function currentDriftingParameter() {
  return driftingParameter.value as number;
}

declare module "@react-three/fiber" {
  interface ThreeElements {
    spriteNodeMaterial: import("@react-three/fiber").ThreeElement<
      typeof THREE.SpriteNodeMaterial
    >;
  }
}

type FlowParticleFieldProps = Readonly<{
  flow: BifurcatingFlow;
}>;

function wgslFloat(value: number) {
  return value.toFixed(8);
}

function FlowParticleFieldCore({ flow }: FlowParticleFieldProps) {
  const { gl: canvasRenderer } = useThree();
  const gl = canvasRenderer as unknown as THREE.WebGPURenderer;
  const isInitialised = useRef(false);
  const modelTime = useRef(0);

  const { nodes } = useMemo(() => {
    const positions = instancedArray(PARTICLE_COUNT, "vec3");
    const position = positions.element(instanceIndex);
    const [seedX, seedY, seedZ] = flow.seedCenter;
    const [viewX, viewY, viewZ] = flow.viewCenter;

    const hash = code(`
      fn hash(index: u32) -> f32 {
        let state = index * 747796405u + 2891336453u;
        let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
        return f32((word >> 22u) ^ word) / 4294967295.0;
      }
    `);
    const derivative = code(flow.derivativeWgsl);

    const initialise = wgslFn(
      `
        fn initialiseFlowField(
          positions: ptr<storage, array<vec3f>, read_write>,
          index: u32
        ) -> void {
          let distance = sqrt(hash(index * 3u)) * ${wgslFloat(flow.seedRadius)};
          let theta = hash(index * 3u + 1u) * 6.28318530718;
          let phi = acos(hash(index * 3u + 2u) * 2.0 - 1.0);
          positions[index] = vec3f(${wgslFloat(seedX)}, ${wgslFloat(seedY)}, ${wgslFloat(seedZ)})
            + distance * vec3f(sin(phi) * cos(theta), sin(phi) * sin(theta), cos(phi));
        }
      `,
      [hash],
    );

    const update = wgslFn(
      `
        fn advanceFlowField(
          positions: ptr<storage, array<vec3f>, read_write>,
          index: u32,
          parameter: f32,
          seed: f32
        ) -> void {
          var p = positions[index];
          let h = ${wgslFloat(flow.step)};
          let kick = ${wgslFloat(flow.noise * Math.sqrt(flow.step) * 2)};
          let salt = index * 9u + u32(seed) * 2654435761u;

          for (var step = 0u; step < ${flow.stepsPerFrame}u; step = step + 1u) {
            let k1 = flow(p, parameter);
            let k2 = flow(p + k1 * h * 0.5, parameter);
            let k3 = flow(p + k2 * h * 0.5, parameter);
            let k4 = flow(p + k3 * h, parameter);
            let noise = vec3f(
              hash(salt + step * 3u),
              hash(salt + step * 3u + 1u),
              hash(salt + step * 3u + 2u)
            ) - vec3f(0.5);
            p = p + h * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0 + noise * kick;
          }

          positions[index] = p;
        }
      `,
      [hash, derivative],
    );

    const initialiseNode = initialise({ positions, index: instanceIndex })
      .compute(PARTICLE_COUNT);
    const updateNode = update({
      positions,
      index: instanceIndex,
      parameter: driftingParameter,
      seed: noiseSeed,
    }).compute(PARTICLE_COUNT);

    const positionNode = wgslFn(`
      fn viewPosition(p: vec3f) -> vec3f {
        return (p - vec3f(${wgslFloat(viewX)}, ${wgslFloat(viewY)}, ${wgslFloat(viewZ)}))
          / ${wgslFloat(flow.viewScale)};
      }
    `)({ p: position });

    const scaleNode = wgslFn(
      `
        fn particleScale(index: u32) -> f32 {
          return 0.01 + hash(index * 3u + 7u) * 0.03;
        }
      `,
      [hash],
    )({ index: instanceIndex });

    // Warm particles are resting (an equilibrium holds them); cool particles
    // are being carried round a loop or through chaos.
    const colorNode = wgslFn(
      `
        fn speedColor(p: vec3f, parameter: f32, uvCoord: vec2f) -> vec4f {
          let speed = length(flow(p, parameter));
          let resting = vec3f(0.97, 0.7, 0.45);
          let moving = vec3f(0.24, 0.43, 0.96);
          let tint = mix(resting, moving, smoothstep(0.0, ${wgslFloat(flow.speedScale)}, speed));
          let strength = distance(uvCoord, vec2f(0.5));
          let fillMask = max(1.0 - strength * 2.0, 0.0);
          let circle = smoothstep(0.5, 0.49, strength);
          return vec4f(tint * fillMask * circle * 0.65, 1.0);
        }
      `,
      [derivative],
    )({ p: position, parameter: driftingParameter, uvCoord: uv() });

    return {
      nodes: { colorNode, initialiseNode, positionNode, scaleNode, updateNode },
    };
  }, [flow]);

  const initialise = useCallback(async () => {
    try {
      await gl.computeAsync(nodes.initialiseNode);
      isInitialised.current = true;
    } catch (error) {
      console.error(error);
    }
  }, [gl, nodes.initialiseNode]);

  useEffect(() => {
    isInitialised.current = false;
    modelTime.current = 0;
    driftingParameter.value = flow.from;
    void initialise();
  }, [flow, initialise]);

  useFrame((state) => {
    if (!isInitialised.current) return;
    // The drift is tied to model time, not wall time, so a slower frame rate
    // slows the sweep and the flow together and never outruns the dynamics.
    driftingParameter.value = parameterAt(flow, modelTime.current);
    noiseSeed.value = (noiseSeed.value + 1) % 16_777_216;
    const renderer = state.gl as unknown as THREE.WebGPURenderer;
    renderer.compute(nodes.updateNode);
    modelTime.current += flow.step * flow.stepsPerFrame;
  });

  return (
    <sprite count={PARTICLE_COUNT}>
      <spriteNodeMaterial
        blending={THREE.AdditiveBlending}
        colorNode={nodes.colorNode as never}
        depthWrite={false}
        positionNode={nodes.positionNode as never}
        scaleNode={nodes.scaleNode as never}
        transparent
      />
    </sprite>
  );
}

export function FlowParticleField({ flow }: FlowParticleFieldProps) {
  return <FlowParticleFieldCore key={flow.id} flow={flow} />;
}
