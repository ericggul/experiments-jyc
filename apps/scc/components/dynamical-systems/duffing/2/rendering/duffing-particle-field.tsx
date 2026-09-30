import { extend, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { code, instanceIndex, instancedArray, uv, wgslFn } from "three/tsl";
import {
  DUFFING_DAMPING,
  DUFFING_DRIVE_FREQUENCY,
  tiltedPotential,
  type DuffingRegime,
} from "../model/regimes";

extend(THREE as never);

export const PARTICLE_COUNT = 30_000;
const STEP = 0.02;
const STEPS_PER_FRAME = 3;
// Lifetimes are measured in drive cycles, then converted to model time.
const LIFETIME_MIN_CYCLES = 14;
const LIFETIME_SPAN_CYCLES = 30;
const DRIVE_PERIOD = Math.PI * 2 / DUFFING_DRIVE_FREQUENCY;
const SEED_DISPLACEMENT = 1.9;
const SEED_VELOCITY = 1.2;

// Ring geometry: angle = drive phase θ, radius = displacement x, height =
// the tilted potential the particle is sitting on.
const RING_RADIUS = 2.2;
const DISPLACEMENT_SCALE = 0.62;
const HEIGHT_SCALE = 0.85;
const PROFILE_COUNT = 56;
const PROFILE_SEGMENTS = 96;
const PROFILE_DISPLACEMENT = 1.62;

declare module "@react-three/fiber" {
  interface ThreeElements {
    spriteNodeMaterial: import("@react-three/fiber").ThreeElement<
      typeof THREE.SpriteNodeMaterial
    >;
  }
}

type DuffingParticleFieldProps = Readonly<{
  regime: DuffingRegime;
}>;

function wgslFloat(value: number) {
  return value.toFixed(6);
}

function ringPoint(displacement: number, phase: number, driveAmplitude: number) {
  const radius = RING_RADIUS + displacement * DISPLACEMENT_SCALE;
  return [
    radius * Math.cos(phase),
    tiltedPotential(displacement, phase, driveAmplitude) * HEIGHT_SCALE,
    radius * Math.sin(phase),
  ] as const;
}

// Cross-sections of the landscape at evenly spaced drive phases. Each one is
// the double well as tilted at that moment of the drive cycle.
function createLandscape(driveAmplitude: number) {
  const positions = new Float32Array(PROFILE_COUNT * PROFILE_SEGMENTS * 6);
  let offset = 0;
  for (let profile = 0; profile < PROFILE_COUNT; profile += 1) {
    const phase = profile / PROFILE_COUNT * Math.PI * 2;
    for (let segment = 0; segment < PROFILE_SEGMENTS; segment += 1) {
      for (const end of [segment, segment + 1]) {
        const displacement = -PROFILE_DISPLACEMENT +
          end / PROFILE_SEGMENTS * PROFILE_DISPLACEMENT * 2;
        positions.set(ringPoint(displacement, phase, driveAmplitude), offset);
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

function DuffingParticleFieldCore({ regime }: DuffingParticleFieldProps) {
  const { gl: canvasRenderer } = useThree();
  const gl = canvasRenderer as unknown as THREE.WebGPURenderer;
  const isInitialised = useRef(false);
  const gamma = regime.driveAmplitude;

  const landscape = useMemo(() => createLandscape(gamma), [gamma]);
  useEffect(() => () => landscape.dispose(), [landscape]);

  const { nodes } = useMemo(() => {
    // state = (x, v, θ) is integrated on the GPU; life = (age, lifetime, births).
    const phaseStates = instancedArray(PARTICLE_COUNT, "vec3");
    const lifeStates = instancedArray(PARTICLE_COUNT, "vec3");

    const hash = code(`
      fn hash(index: u32) -> f32 {
        let state = index * 747796405u + 2891336453u;
        let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
        return f32((word >> 22u) ^ word) / 4294967295.0;
      }
    `);

    const seedState = code(
      `
        fn seedState(salt: u32) -> vec3f {
          return vec3f(
            (hash(salt) * 2.0 - 1.0) * ${wgslFloat(SEED_DISPLACEMENT)},
            (hash(salt + 1u) * 2.0 - 1.0) * ${wgslFloat(SEED_VELOCITY)},
            hash(salt + 2u) * 6.28318530718
          );
        }
      `,
      [hash],
    );

    const acceleration = code(`
      fn duffingAcceleration(x: f32, v: f32, theta: f32) -> f32 {
        return -${wgslFloat(DUFFING_DAMPING)} * v + x - x * x * x
          + ${wgslFloat(gamma)} * cos(theta);
      }
    `);

    const initialise = wgslFn(
      `
        fn initialiseDuffingField(
          phaseStates: ptr<storage, array<vec3f>, read_write>,
          lifeStates: ptr<storage, array<vec3f>, read_write>,
          index: u32
        ) -> void {
          let lifetime = (${LIFETIME_MIN_CYCLES}.0
            + hash(index * 5u + 3u) * ${LIFETIME_SPAN_CYCLES}.0) * ${wgslFloat(DRIVE_PERIOD)};
          phaseStates[index] = seedState(index * 5u);
          lifeStates[index] = vec3f(0.0, lifetime, 0.0);
        }
      `,
      [hash, seedState],
    );

    const update = wgslFn(
      `
        fn advanceDuffingField(
          phaseStates: ptr<storage, array<vec3f>, read_write>,
          lifeStates: ptr<storage, array<vec3f>, read_write>,
          index: u32
        ) -> void {
          let life = lifeStates[index];
          if (life.x >= life.y) {
            let births = life.z + 1.0;
            phaseStates[index] = seedState(index * 5u + u32(births) * 150001u);
            lifeStates[index] = vec3f(0.0, life.y, births);
            return;
          }

          var s = phaseStates[index];
          let h = ${wgslFloat(STEP)};
          let w = ${wgslFloat(DUFFING_DRIVE_FREQUENCY)};
          for (var step = 0u; step < ${STEPS_PER_FRAME}u; step = step + 1u) {
            let a1 = duffingAcceleration(s.x, s.y, s.z);
            let x2 = s.x + s.y * h * 0.5;
            let v2 = s.y + a1 * h * 0.5;
            let a2 = duffingAcceleration(x2, v2, s.z + w * h * 0.5);
            let x3 = s.x + v2 * h * 0.5;
            let v3 = s.y + a2 * h * 0.5;
            let a3 = duffingAcceleration(x3, v3, s.z + w * h * 0.5);
            let x4 = s.x + v3 * h;
            let v4 = s.y + a3 * h;
            let a4 = duffingAcceleration(x4, v4, s.z + w * h);
            s = vec3f(
              s.x + h * (s.y + 2.0 * v2 + 2.0 * v3 + v4) / 6.0,
              s.y + h * (a1 + 2.0 * a2 + 2.0 * a3 + a4) / 6.0,
              (s.z + w * h) % 6.28318530718
            );
          }

          phaseStates[index] = s;
          lifeStates[index] = vec3f(life.x + h * ${STEPS_PER_FRAME}.0, life.y, life.z);
        }
      `,
      [acceleration, seedState],
    );

    const buffers = { phaseStates, lifeStates, index: instanceIndex };
    const initialiseNode = initialise(buffers).compute(PARTICLE_COUNT);
    const updateNode = update(buffers).compute(PARTICLE_COUNT);

    const phaseState = phaseStates.element(instanceIndex);
    const lifeState = lifeStates.element(instanceIndex);

    const positionNode = wgslFn(`
      fn ringPosition(s: vec3f) -> vec3f {
        let radius = ${wgslFloat(RING_RADIUS)} + s.x * ${wgslFloat(DISPLACEMENT_SCALE)};
        let height = -0.5 * s.x * s.x + 0.25 * s.x * s.x * s.x * s.x
          - ${wgslFloat(gamma)} * cos(s.z) * s.x;
        return vec3f(
          radius * cos(s.z),
          height * ${wgslFloat(HEIGHT_SCALE)},
          radius * sin(s.z)
        );
      }
    `)({ s: phaseState });

    const scaleNode = wgslFn(
      `
        fn particleScale(index: u32) -> f32 {
          return 0.01 + hash(index * 5u + 4u) * 0.024;
        }
      `,
      [hash],
    )({ index: instanceIndex });

    // Warm particles are slow (at a turning point or resting in a well);
    // cool particles are moving fast through a valley or over the hump.
    const colorNode = wgslFn(`
      fn speedColor(s: vec3f, life: vec3f, uvCoord: vec2f) -> vec4f {
        let slow = vec3f(0.97, 0.7, 0.45);
        let fast = vec3f(0.24, 0.43, 0.96);
        let tint = mix(slow, fast, smoothstep(0.05, 1.1, abs(s.y)));
        let settled = mix(0.12, 0.8, smoothstep(0.0, ${wgslFloat(DRIVE_PERIOD * 1.5)}, life.x));
        let strength = distance(uvCoord, vec2f(0.5));
        let fillMask = max(1.0 - strength * 2.0, 0.0);
        let circle = smoothstep(0.5, 0.49, strength);
        return vec4f(tint * fillMask * circle * settled, 1.0);
      }
    `)({ s: phaseState, life: lifeState, uvCoord: uv() });

    return {
      nodes: { colorNode, initialiseNode, positionNode, scaleNode, updateNode },
    };
  }, [gamma]);

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
    void initialise();
  }, [initialise]);

  useFrame((state) => {
    if (!isInitialised.current) return;
    const renderer = state.gl as unknown as THREE.WebGPURenderer;
    renderer.compute(nodes.updateNode);
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

export function DuffingParticleField({ regime }: DuffingParticleFieldProps) {
  return <DuffingParticleFieldCore key={regime.id} regime={regime} />;
}
