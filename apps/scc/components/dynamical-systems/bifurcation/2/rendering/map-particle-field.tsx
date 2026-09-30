import { extend, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { code, instanceIndex, instancedArray, uniform, uv, wgslFn } from "three/tsl";
import type { MapSystem } from "../model/maps";

extend(THREE as never);

export const PARTICLE_COUNT = 48_000;
// One application of the map per tick. Between ticks each particle glides
// from its previous state to its new one, so a settled particle rests, a
// period-two particle hops back and forth, and a chaotic particle never lands
// in the same place twice.
const TICK_SECONDS = 0.2;
const LIFETIME_MIN_TICKS = 180;
const LIFETIME_SPAN_TICKS = 360;
const SETTLE_TICKS = 24;
const HALF_WIDTH = 2.3;
// Fraction of the current tick that has elapsed. One field is mounted at a
// time, so a single module-level uniform is shared by whichever map is shown.
const tickPhase = uniform(0);
const HALF_HEIGHT = 1.35;

declare module "@react-three/fiber" {
  interface ThreeElements {
    spriteNodeMaterial: import("@react-three/fiber").ThreeElement<
      typeof THREE.SpriteNodeMaterial
    >;
  }
}

type MapParticleFieldProps = Readonly<{
  system: MapSystem;
}>;

function wgslFloat(value: number) {
  return value.toFixed(6);
}

function MapParticleFieldCore({ system }: MapParticleFieldProps) {
  const { gl: canvasRenderer } = useThree();
  const gl = canvasRenderer as unknown as THREE.WebGPURenderer;
  const isInitialised = useRef(false);
  const tickClock = useRef(0);

  const { nodes } = useMemo(() => {
    // spawn = (r, lifetime, unused) is fixed per particle; orbit holds the
    // three latest map states (x[n], x[n - 1], x[n - 2]); life = (age, births).
    const spawnStates = instancedArray(PARTICLE_COUNT, "vec3");
    const orbitStates = instancedArray(PARTICLE_COUNT, "vec3");
    const lifeStates = instancedArray(PARTICLE_COUNT, "vec3");

    const [parameterMin, parameterMax] = system.parameterRange;
    const [stateMin, stateMax] = system.stateRange;
    const [seedMin, seedMax] = system.seedRange;
    const stateSpan = stateMax - stateMin;

    const hash = code(`
      fn hash(index: u32) -> f32 {
        let state = index * 747796405u + 2891336453u;
        let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
        return f32((word >> 22u) ^ word) / 4294967295.0;
      }
    `);
    const mapNext = code(system.mapWgsl);

    const initialise = wgslFn(
      `
        fn initialiseMapField(
          spawnStates: ptr<storage, array<vec3f>, read_write>,
          orbitStates: ptr<storage, array<vec3f>, read_write>,
          lifeStates: ptr<storage, array<vec3f>, read_write>,
          index: u32
        ) -> void {
          let stratum = (f32(index) + hash(index * 3u + 1u)) / f32(${PARTICLE_COUNT}u);
          let r = ${wgslFloat(parameterMin)} + stratum * ${wgslFloat(parameterMax - parameterMin)};
          let lifetime = ${LIFETIME_MIN_TICKS}.0 + hash(index * 3u + 2u) * ${LIFETIME_SPAN_TICKS}.0;
          let x = ${wgslFloat(seedMin)} + hash(index * 3u + 3u) * ${wgslFloat(seedMax - seedMin)};

          spawnStates[index] = vec3f(r, lifetime, 0.0);
          orbitStates[index] = vec3f(x, x, x);
          lifeStates[index] = vec3f(0.0, 0.0, 0.0);
        }
      `,
      [hash],
    );

    const update = wgslFn(
      `
        fn advanceMapField(
          spawnStates: ptr<storage, array<vec3f>, read_write>,
          orbitStates: ptr<storage, array<vec3f>, read_write>,
          lifeStates: ptr<storage, array<vec3f>, read_write>,
          index: u32
        ) -> void {
          let spawn = spawnStates[index];
          let orbit = orbitStates[index];
          let life = lifeStates[index];
          let next = mapNext(orbit.x, spawn.x);
          let escaped = !(next >= ${wgslFloat(stateMin - stateSpan)}
            && next <= ${wgslFloat(stateMax + stateSpan)});

          if (life.x + 1.0 >= spawn.y || escaped) {
            let births = life.y + 1.0;
            let salt = index * 7919u + u32(births) * 104729u;
            let x = ${wgslFloat(seedMin)} + hash(salt) * ${wgslFloat(seedMax - seedMin)};
            orbitStates[index] = vec3f(x, x, x);
            lifeStates[index] = vec3f(0.0, births, 0.0);
          } else {
            orbitStates[index] = vec3f(next, orbit.x, orbit.y);
            lifeStates[index] = vec3f(life.x + 1.0, life.y, 0.0);
          }
        }
      `,
      [hash, mapNext],
    );

    const buffers = {
      spawnStates,
      orbitStates,
      lifeStates,
      index: instanceIndex,
    };
    const initialiseNode = initialise(buffers).compute(PARTICLE_COUNT);
    const updateNode = update(buffers).compute(PARTICLE_COUNT);

    const spawnState = spawnStates.element(instanceIndex);
    const orbitState = orbitStates.element(instanceIndex);
    const lifeState = lifeStates.element(instanceIndex);

    // Horizontal: the particle's own r. Vertical: its current state x[n].
    // Depth: the state it just left, x[n - 1]. Seen from the front this is
    // the bifurcation diagram; turned sideways it is the map's own graph.
    const positionNode = wgslFn(`
      fn delayPosition(spawn: vec3f, orbit: vec3f, phase: f32) -> vec3f {
        let glide = smoothstep(0.0, 0.4, phase);
        let current = mix(orbit.y, orbit.x, glide);
        let previous = mix(orbit.z, orbit.y, glide);
        let horizontal = (spawn.x - ${wgslFloat(parameterMin)})
          / ${wgslFloat(parameterMax - parameterMin)};
        return vec3f(
          (horizontal * 2.0 - 1.0) * ${wgslFloat(HALF_WIDTH)},
          ((current - ${wgslFloat(stateMin)}) / ${wgslFloat(stateSpan)} * 2.0 - 1.0)
            * ${wgslFloat(HALF_HEIGHT)},
          ((previous - ${wgslFloat(stateMin)}) / ${wgslFloat(stateSpan)} * 2.0 - 1.0)
            * ${wgslFloat(HALF_HEIGHT)}
        );
      }
    `)({ spawn: spawnState, orbit: orbitState, phase: tickPhase });

    const scaleNode = wgslFn(
      `
        fn particleScale(index: u32) -> f32 {
          return 0.007 + hash(index * 5u + 11u) * 0.015;
        }
      `,
      [hash],
    )({ index: instanceIndex });

    // Warm particles are standing still; cool particles are jumping. Freshly
    // dropped particles stay faint until the map has pulled them in.
    const colorNode = wgslFn(`
      fn hopColor(orbit: vec3f, life: vec3f, uvCoord: vec2f) -> vec4f {
        let hop = abs(orbit.x - orbit.y) / ${wgslFloat(stateSpan)};
        let still = vec3f(0.97, 0.7, 0.45);
        let moving = vec3f(0.24, 0.43, 0.96);
        let tint = mix(still, moving, smoothstep(0.0, 0.32, hop));
        let settled = mix(0.14, 0.62, smoothstep(0.0, ${SETTLE_TICKS}.0, life.x));
        let strength = distance(uvCoord, vec2f(0.5));
        let fillMask = max(1.0 - strength * 2.0, 0.0);
        let circle = smoothstep(0.5, 0.49, strength);
        return vec4f(tint * fillMask * circle * settled, 1.0);
      }
    `)({ orbit: orbitState, life: lifeState, uvCoord: uv() });

    return {
      nodes: { colorNode, initialiseNode, positionNode, scaleNode, updateNode },
    };
  }, [system]);

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
    tickClock.current = 0;
    tickPhase.value = 0;
    void initialise();
  }, [initialise]);

  useFrame((state, delta) => {
    if (!isInitialised.current) return;
    tickClock.current += Math.min(delta, TICK_SECONDS);
    if (tickClock.current >= TICK_SECONDS) {
      tickClock.current -= TICK_SECONDS;
      const renderer = state.gl as unknown as THREE.WebGPURenderer;
      renderer.compute(nodes.updateNode);
    }
    tickPhase.value = tickClock.current / TICK_SECONDS;
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

export function MapParticleField({ system }: MapParticleFieldProps) {
  return <MapParticleFieldCore key={system.id} system={system} />;
}
