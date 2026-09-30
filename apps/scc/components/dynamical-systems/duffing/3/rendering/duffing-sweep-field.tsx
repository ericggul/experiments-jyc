import { extend, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import {
  code,
  instanceIndex,
  instancedArray,
  positionGeometry,
  uniform,
  uv,
  wgslFn,
} from "three/tsl";
import {
  DUFFING_DAMPING,
  DUFFING_DRIVE_FREQUENCY,
  SWEEP_FROM,
  driveAmplitudeAt,
} from "../model/sweep";

extend(THREE as never);

export const PARTICLE_COUNT = 30_000;
const STEP = 0.02;
const STEPS_PER_FRAME = 4;
const SEED_DISPLACEMENT = 1.9;
const SEED_VELOCITY = 1.2;

// Ring geometry as in duffing/2: angle = drive phase θ, radius =
// displacement x, height = the tilted potential under the particle.
const RING_RADIUS = 2.2;
const DISPLACEMENT_SCALE = 0.62;
const HEIGHT_SCALE = 0.85;
const PROFILE_COUNT = 56;
const PROFILE_SEGMENTS = 96;
const PROFILE_DISPLACEMENT = 1.62;

// One field is mounted at a time; the drifting drive strength is a single
// module-level uniform read by the particles and the landscape alike.
const driveAmplitude = uniform(SWEEP_FROM);

export function currentDriveAmplitude() {
  return driveAmplitude.value as number;
}

declare module "@react-three/fiber" {
  interface ThreeElements {
    spriteNodeMaterial: import("@react-three/fiber").ThreeElement<
      typeof THREE.SpriteNodeMaterial
    >;
  }
}

function wgslFloat(value: number) {
  return value.toFixed(6);
}

const ringPosition = wgslFn(`
  fn ringPosition(s: vec3f, gamma: f32) -> vec3f {
    let radius = ${wgslFloat(RING_RADIUS)} + s.x * ${wgslFloat(DISPLACEMENT_SCALE)};
    let height = -0.5 * s.x * s.x + 0.25 * s.x * s.x * s.x * s.x
      - gamma * cos(s.z) * s.x;
    return vec3f(
      radius * cos(s.z),
      height * ${wgslFloat(HEIGHT_SCALE)},
      radius * sin(s.z)
    );
  }
`);

// Cross-sections of the landscape at evenly spaced drive phases. The geometry
// stores (x, 0, θ); the vertex stage lifts it with the current γ, so the
// valleys deepen and tilt harder as the drive strengthens.
function createLandscape() {
  const positions = new Float32Array(PROFILE_COUNT * PROFILE_SEGMENTS * 6);
  let offset = 0;
  for (let profile = 0; profile < PROFILE_COUNT; profile += 1) {
    const phase = profile / PROFILE_COUNT * Math.PI * 2;
    for (let segment = 0; segment < PROFILE_SEGMENTS; segment += 1) {
      for (const end of [segment, segment + 1]) {
        const displacement = -PROFILE_DISPLACEMENT +
          end / PROFILE_SEGMENTS * PROFILE_DISPLACEMENT * 2;
        positions.set([displacement, 0, phase], offset);
        offset += 3;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicNodeMaterial({
    color: new THREE.Color(0.2, 0.25, 0.4),
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  material.positionNode = ringPosition({ s: positionGeometry, gamma: driveAmplitude });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  return {
    lines,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export function DuffingSweepField() {
  const { gl: canvasRenderer } = useThree();
  const gl = canvasRenderer as unknown as THREE.WebGPURenderer;
  const isInitialised = useRef(false);
  const modelTime = useRef(0);

  const landscape = useMemo(() => createLandscape(), []);
  useEffect(() => () => landscape.dispose(), [landscape]);

  const { nodes } = useMemo(() => {
    // state = (x, v, θ), integrated on the GPU.
    const phaseStates = instancedArray(PARTICLE_COUNT, "vec3");

    const hash = code(`
      fn hash(index: u32) -> f32 {
        let state = index * 747796405u + 2891336453u;
        let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
        return f32((word >> 22u) ^ word) / 4294967295.0;
      }
    `);

    const acceleration = code(`
      fn duffingAcceleration(x: f32, v: f32, theta: f32, gamma: f32) -> f32 {
        return -${wgslFloat(DUFFING_DAMPING)} * v + x - x * x * x + gamma * cos(theta);
      }
    `);

    const initialise = wgslFn(
      `
        fn initialiseDuffingSweep(
          phaseStates: ptr<storage, array<vec3f>, read_write>,
          index: u32
        ) -> void {
          phaseStates[index] = vec3f(
            (hash(index * 3u) * 2.0 - 1.0) * ${wgslFloat(SEED_DISPLACEMENT)},
            (hash(index * 3u + 1u) * 2.0 - 1.0) * ${wgslFloat(SEED_VELOCITY)},
            hash(index * 3u + 2u) * 6.28318530718
          );
        }
      `,
      [hash],
    );

    const update = wgslFn(
      `
        fn advanceDuffingSweep(
          phaseStates: ptr<storage, array<vec3f>, read_write>,
          index: u32,
          gamma: f32
        ) -> void {
          var s = phaseStates[index];
          let h = ${wgslFloat(STEP)};
          let w = ${wgslFloat(DUFFING_DRIVE_FREQUENCY)};
          for (var step = 0u; step < ${STEPS_PER_FRAME}u; step = step + 1u) {
            let a1 = duffingAcceleration(s.x, s.y, s.z, gamma);
            let x2 = s.x + s.y * h * 0.5;
            let v2 = s.y + a1 * h * 0.5;
            let a2 = duffingAcceleration(x2, v2, s.z + w * h * 0.5, gamma);
            let x3 = s.x + v2 * h * 0.5;
            let v3 = s.y + a2 * h * 0.5;
            let a3 = duffingAcceleration(x3, v3, s.z + w * h * 0.5, gamma);
            let x4 = s.x + v3 * h;
            let v4 = s.y + a3 * h;
            let a4 = duffingAcceleration(x4, v4, s.z + w * h, gamma);
            s = vec3f(
              s.x + h * (s.y + 2.0 * v2 + 2.0 * v3 + v4) / 6.0,
              s.y + h * (a1 + 2.0 * a2 + 2.0 * a3 + a4) / 6.0,
              (s.z + w * h) % 6.28318530718
            );
          }
          phaseStates[index] = s;
        }
      `,
      [acceleration],
    );

    const initialiseNode = initialise({ phaseStates, index: instanceIndex })
      .compute(PARTICLE_COUNT);
    const updateNode = update({
      phaseStates,
      index: instanceIndex,
      gamma: driveAmplitude,
    }).compute(PARTICLE_COUNT);

    const phaseState = phaseStates.element(instanceIndex);
    const positionNode = ringPosition({ s: phaseState, gamma: driveAmplitude });

    const scaleNode = wgslFn(
      `
        fn particleScale(index: u32) -> f32 {
          return 0.01 + hash(index * 3u + 4u) * 0.024;
        }
      `,
      [hash],
    )({ index: instanceIndex });

    // Warm: slow (a turning point, or resting low in a well). Cool: fast,
    // through a valley or over the hump.
    const colorNode = wgslFn(`
      fn speedColor(s: vec3f, uvCoord: vec2f) -> vec4f {
        let slow = vec3f(0.97, 0.7, 0.45);
        let fast = vec3f(0.24, 0.43, 0.96);
        let tint = mix(slow, fast, smoothstep(0.05, 1.1, abs(s.y)));
        let strength = distance(uvCoord, vec2f(0.5));
        let fillMask = max(1.0 - strength * 2.0, 0.0);
        let circle = smoothstep(0.5, 0.49, strength);
        return vec4f(tint * fillMask * circle * 0.8, 1.0);
      }
    `)({ s: phaseState, uvCoord: uv() });

    return {
      nodes: { colorNode, initialiseNode, positionNode, scaleNode, updateNode },
    };
  }, []);

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
    driveAmplitude.value = SWEEP_FROM;
    void initialise();
  }, [initialise]);

  useFrame((state) => {
    if (!isInitialised.current) return;
    // γ follows model time, so a slower frame rate slows the drift and the
    // oscillators together.
    driveAmplitude.value = driveAmplitudeAt(modelTime.current);
    const renderer = state.gl as unknown as THREE.WebGPURenderer;
    renderer.compute(nodes.updateNode);
    modelTime.current += STEP * STEPS_PER_FRAME;
  });

  return (
    <>
      <primitive object={landscape.lines} />
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
    </>
  );
}
