import { extend, useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three/webgpu";
import { code, instanceIndex, instancedArray, uv, vec3, wgslFn } from "three/tsl";
import {
  MASS_RATIO,
  MATCHED_PERIOD_RATIOS,
  PARTICLE_COUNT,
  PLANET_SOFTENING,
  createResonanceSeeds,
  type ResonancePreset,
} from "../model/resonances";

extend(THREE as never);

// Four RK4 steps of 0.0105 per frame: one planet orbit in roughly 2.5 s.
const STEP = 0.0105;
const STEPS_PER_FRAME = 4;
const ESCAPE_RADIUS = 3.2;
const STAR_CAPTURE_RADIUS = 0.05;

declare module "@react-three/fiber" {
  interface ThreeElements {
    spriteNodeMaterial: import("@react-three/fiber").ThreeElement<
      typeof THREE.SpriteNodeMaterial
    >;
  }
}

type ResonanceParticleFieldProps = Readonly<{
  preset: ResonancePreset;
}>;

function wgslFloat(value: number) {
  return value.toFixed(8);
}

const bodyDisc = wgslFn(`
  fn bodyDisc(uvCoord: vec2f, tint: vec3f) -> vec4f {
    let strength = distance(uvCoord, vec2f(0.5));
    let circle = smoothstep(0.5, 0.44, strength);
    return vec4f(tint * circle, circle);
  }
`);

// The star and the planet are the two bodies in the equations: the planet is
// stationary in this frame, and so is the star.
function Body({
  position,
  scale,
  tint,
}: Readonly<{
  position: readonly [number, number, number];
  scale: number;
  tint: readonly [number, number, number];
}>) {
  const colorNode = useMemo(
    () => bodyDisc({ uvCoord: uv(), tint: vec3(...tint) }),
    [tint],
  );
  return (
    <sprite position={position as never} scale={scale}>
      <spriteNodeMaterial colorNode={colorNode as never} depthWrite={false} transparent />
    </sprite>
  );
}

const STAR_TINT = [1, 0.86, 0.66] as const;
const PLANET_TINT = [0.92, 0.94, 1] as const;

function ResonanceParticleFieldCore({ preset }: ResonanceParticleFieldProps) {
  const { nodes } = useMemo(() => {
    const seeds = createResonanceSeeds(preset);
    const positions = instancedArray(PARTICLE_COUNT, "vec3");
    const velocities = instancedArray(PARTICLE_COUNT, "vec3");
    const spawnPositions = instancedArray(PARTICLE_COUNT, "vec3");
    const spawnVelocities = instancedArray(PARTICLE_COUNT, "vec3");
    // Initial states come from the Kepler seeding in the model and are
    // uploaded once; from then on the GPU owns the state.
    positions.value.array.set(seeds.positions);
    velocities.value.array.set(seeds.velocities);
    spawnPositions.value.array.set(seeds.positions);
    spawnVelocities.value.array.set(seeds.velocities);

    const mu = wgslFloat(MASS_RATIO);
    const acceleration = code(`
      fn rotatingAcceleration(p: vec3f, v: vec3f) -> vec3f {
        let toStar = p - vec3f(-${mu}, 0.0, 0.0);
        let toPlanet = p - vec3f(1.0 - ${mu}, 0.0, 0.0);
        let starDistance = length(toStar);
        let planetDistanceSquared = dot(toPlanet, toPlanet)
          + ${wgslFloat(PLANET_SOFTENING ** 2)};
        let planetCube = planetDistanceSquared * sqrt(planetDistanceSquared);
        let gravity = -(1.0 - ${mu}) * toStar / (starDistance * starDistance * starDistance)
          - ${mu} * toPlanet / planetCube;
        return vec3f(2.0 * v.y + p.x, -2.0 * v.x + p.y, 0.0) + gravity;
      }
    `);

    const update = wgslFn(
      `
        fn advanceResonanceField(
          positions: ptr<storage, array<vec3f>, read_write>,
          velocities: ptr<storage, array<vec3f>, read_write>,
          spawnPositions: ptr<storage, array<vec3f>, read_write>,
          spawnVelocities: ptr<storage, array<vec3f>, read_write>,
          index: u32
        ) -> void {
          var p = positions[index];
          var v = velocities[index];
          let h = ${wgslFloat(STEP)};

          for (var step = 0u; step < ${STEPS_PER_FRAME}u; step = step + 1u) {
            let a1 = rotatingAcceleration(p, v);
            let p2 = p + v * h * 0.5;
            let v2 = v + a1 * h * 0.5;
            let a2 = rotatingAcceleration(p2, v2);
            let p3 = p + v2 * h * 0.5;
            let v3 = v + a2 * h * 0.5;
            let a3 = rotatingAcceleration(p3, v3);
            let p4 = p + v3 * h;
            let v4 = v + a3 * h;
            let a4 = rotatingAcceleration(p4, v4);
            p = p + h * (v + 2.0 * v2 + 2.0 * v3 + v4) / 6.0;
            v = v + h * (a1 + 2.0 * a2 + 2.0 * a3 + a4) / 6.0;
          }

          let starDistance = length(p - vec3f(-${mu}, 0.0, 0.0));
          let lost = !(length(p) < ${wgslFloat(ESCAPE_RADIUS)})
            || starDistance < ${wgslFloat(STAR_CAPTURE_RADIUS)};
          if (lost) {
            positions[index] = spawnPositions[index];
            velocities[index] = spawnVelocities[index];
          } else {
            positions[index] = p;
            velocities[index] = v;
          }
        }
      `,
      [acceleration],
    );

    const updateNode = update({
      positions,
      velocities,
      spawnPositions,
      spawnVelocities,
      index: instanceIndex,
    }).compute(PARTICLE_COUNT);

    const position = positions.element(instanceIndex);
    const velocity = velocities.element(instanceIndex);

    // The disc lies in the planet's orbital plane; three.js is y-up, so the
    // simulation's (x, y, z) is drawn as (x, z, -y).
    const positionNode = wgslFn(`
      fn discPosition(p: vec3f) -> vec3f {
        return vec3f(p.x, p.z, -p.y);
      }
    `)({ p: position });

    const scaleNode = wgslFn(`
      fn particleScale(index: u32) -> f32 {
        let jitter = fract(sin(f32(index % 4096u) * 12.9898) * 43758.5453);
        return 0.006 + jitter * 0.012;
      }
    `)({ index: instanceIndex });

    // Warm: the particle's own period currently matches the planet's by a
    // whole-number ratio. Cool: it does not, and its figure keeps turning.
    const matchedRatios = MATCHED_PERIOD_RATIOS
      .map((ratio) => `abs(ratio / ${wgslFloat(ratio)} - 1.0)`)
      .reduce((expression, term) => `min(${expression}, ${term})`);
    const colorNode = wgslFn(`
      fn matchColor(p: vec3f, v: vec3f, uvCoord: vec2f) -> vec4f {
        let relative = p + vec3f(${mu}, 0.0, 0.0);
        let relativeVelocity = vec3f(v.x - p.y, v.y + p.x + ${mu}, v.z);
        let inverseAxis = 2.0 / length(relative)
          - dot(relativeVelocity, relativeVelocity) / (1.0 - ${mu});
        let axis = 1.0 / max(inverseAxis, 0.0001);
        let ratio = sqrt(axis * axis * axis / (1.0 - ${mu}));
        let mismatch = ${matchedRatios};

        let matched = vec3f(0.97, 0.7, 0.45);
        let drifting = vec3f(0.24, 0.43, 0.96);
        let tint = mix(matched, drifting, smoothstep(0.004, 0.035, mismatch));
        let strength = distance(uvCoord, vec2f(0.5));
        let fillMask = max(1.0 - strength * 2.0, 0.0);
        let circle = smoothstep(0.5, 0.49, strength);
        return vec4f(tint * fillMask * circle * 0.85, 1.0);
      }
    `)({ p: position, v: velocity, uvCoord: uv() });

    return {
      nodes: { colorNode, positionNode, scaleNode, updateNode },
    };
  }, [preset]);

  useFrame((state) => {
    const renderer = state.gl as unknown as THREE.WebGPURenderer;
    renderer.compute(nodes.updateNode);
  });

  return (
    <>
      <Body position={[-MASS_RATIO, 0, 0]} scale={0.085} tint={STAR_TINT} />
      <Body position={[1 - MASS_RATIO, 0, 0]} scale={0.04} tint={PLANET_TINT} />
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

export function ResonanceParticleField({ preset }: ResonanceParticleFieldProps) {
  return <ResonanceParticleFieldCore key={preset.id} preset={preset} />;
}
