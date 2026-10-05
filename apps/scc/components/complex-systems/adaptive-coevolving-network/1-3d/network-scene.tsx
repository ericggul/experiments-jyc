"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  bodiesWithin,
  createBodies,
  nearestBodies,
  relaxBodies,
  type Body,
  type Point,
} from "./layout";
import {
  addVoter,
  createCoevolvingNetwork,
  DEFAULT_PARAMETERS,
  MAX_VOTERS,
  plantOpinion,
  rarestOpinion,
  stepCoevolvingNetwork,
  type CoevolvingNetwork,
} from "./model";

// The network is drawn in the particle grammar of /attractor/3: a dust of tiny
// additive sprites with a linear radial falloff, warm at the centre of the
// volume and cooler toward its edge. Voters are single bright motes; every tie
// is a stream of fine particles flowing between its ends.

// The reference's gradient: warm at the centre, blue toward the edge. Every
// mote takes it first; opinion only tints it, so the field stays one material
// and an island of agreement reads as one shade of it.
const WARM = [0.97, 0.7, 0.45] as const;
const COOL = [0.24, 0.43, 0.96] as const;
const OPINION_COLOURS = [
  [0.55, 0.82, 1.0],
  [0.24, 0.4, 1.0],
  [0.62, 0.46, 1.0],
  [0.3, 0.9, 0.86],
  [1.0, 0.68, 0.42],
  [1.0, 0.5, 0.66],
] as const;
const OPINION_TINT = 0.5;
/** Disagreeing ties run white-hot: the only places where the next event can happen. */
const DISCORD = [1.0, 0.95, 0.88] as const;

const UPDATES_PER_VOTER_PER_SECOND = 2;
const NEWCOMER_TIES = 2;
/** Brush radius in ideal tie lengths, as in route 1. */
const BRUSH_RADIUS = 1.1;
/** RMS radius of the cloud in world units; the layout itself is unitless. */
const VIEW_SPREAD = 1.7;
/** Slow turn of the whole volume so depth reads through parallax (rad/s). */
const TURN_RATE = 0.03;
/** Screen distance (CSS px) within which a press lands on a voter. */
const PICK_RADIUS = 10;
/** Sprite budget for the whole route (GPU safety: at most 8,192). */
const SPRITE_BUDGET = 8_192;
const MAX_STREAM = SPRITE_BUDGET - MAX_VOTERS;
const MAX_PER_TIE = 7;
const FLASH_LIFETIME = 0.9;
const MAX_TIES = 4_096;
/** Tie line widths in CSS pixels: agreeing ties are hairlines, disagreements heavier. */
const AGREE_WIDTH = 0.8;
const DISCORD_WIDTH = 0.9;
/** Tie brightness. Ties add up where they cross, so they stay far below the dust. */
const AGREE_GAIN = 0.1;
const DISCORD_GAIN = 0.14;
/** A rewired tie streams out from its voter over this many seconds. */
const REACH_TIME = 0.35;

export type SceneApi = {
  /** Voter under the pointer (normalized device coordinates), or null. */
  pick: (x: number, y: number) => number | null;
  /** Plant the least-held view in a brush around a voter. */
  plantAround: (voter: number) => void;
  addAt: (x: number, y: number) => void;
  addAtCentre: () => void;
  plantAtCentre: () => void;
};

const dustMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 600 } },
    vertexShader: /* glsl */ `
      uniform float uScale;
      attribute float aSize;
      attribute vec3 aColor;
      varying vec3 vColor;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vColor = aColor;
        gl_PointSize = max(1.0, aSize * uScale / -view.z);
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        // The reference sprite: a disc whose brightness falls linearly to its rim.
        float strength = distance(gl_PointCoord, vec2(0.5));
        float fillMask = 1.0 - strength * 2.0;
        if (fillMask <= 0.0) discard;
        gl_FragColor = vec4(vColor * fillMask, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

// Every tie is a screen-facing quad of constant pixel width, so ties stay
// legible at any DPR (WebGL lines are fixed at one device pixel).
const tieMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uResolution: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform vec2 uResolution;
      uniform float uDpr;
      attribute vec2 aSide;
      attribute vec3 iStart;
      attribute vec3 iEnd;
      attribute vec3 iColorA;
      attribute vec3 iColorB;
      attribute float iWidth;
      varying vec3 vColor;
      varying float vEdge;
      void main() {
        vec4 a = projectionMatrix * modelViewMatrix * vec4(iStart, 1.0);
        vec4 b = projectionMatrix * modelViewMatrix * vec4(iEnd, 1.0);
        vec2 screenA = a.xy / a.w * uResolution;
        vec2 screenB = b.xy / b.w * uResolution;
        vec2 direction = screenB - screenA;
        direction = length(direction) < 1e-4 ? vec2(1.0, 0.0) : normalize(direction);
        vec2 normal = vec2(-direction.y, direction.x);
        vec4 point = mix(a, b, aSide.x);
        point.xy += normal * aSide.y * iWidth * uDpr / uResolution * point.w;
        vColor = mix(iColorA, iColorB, aSide.x);
        vEdge = aSide.y;
        gl_Position = point;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vEdge;
      void main() {
        float body = 1.0 - smoothstep(0.35, 1.0, abs(vEdge));
        gl_FragColor = vec4(vColor * body, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

function instanced(count: number, size: number) {
  const attribute = new THREE.InstancedBufferAttribute(new Float32Array(count * size), size);
  attribute.setUsage(THREE.DynamicDrawUsage);
  return attribute;
}

function createTies() {
  const geometry = new THREE.InstancedBufferGeometry();
  // Two triangles; aSide.x runs along the tie, aSide.y across it.
  const side = [0, -1, 1, -1, 1, 1, 0, -1, 1, 1, 0, 1];
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(18).fill(0), 3));
  geometry.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 2));
  geometry.setAttribute("iStart", instanced(MAX_TIES, 3));
  geometry.setAttribute("iEnd", instanced(MAX_TIES, 3));
  geometry.setAttribute("iColorA", instanced(MAX_TIES, 3));
  geometry.setAttribute("iColorB", instanced(MAX_TIES, 3));
  geometry.setAttribute("iWidth", instanced(MAX_TIES, 1));
  geometry.instanceCount = 0;
  const mesh = new THREE.Mesh(geometry, tieMaterial());
  mesh.frustumCulled = false;
  return mesh;
}

function buffer(count: number, size: number) {
  const attribute = new THREE.BufferAttribute(new Float32Array(count * size), size);
  attribute.setUsage(THREE.DynamicDrawUsage);
  return attribute;
}

function hash(index: number) {
  const value = Math.sin(index * 12.9898) * 43_758.5453;
  return value - Math.floor(value);
}

function createDust(count: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", buffer(count, 3));
  geometry.setAttribute("aColor", buffer(count, 3));
  geometry.setAttribute("aSize", buffer(count, 1));
  const points = new THREE.Points(geometry, dustMaterial());
  points.frustumCulled = false;
  return points;
}

function createObjects() {
  const ties = createTies();
  const stream = createDust(MAX_STREAM);
  const voters = createDust(MAX_VOTERS);
  ties.renderOrder = 0;
  stream.renderOrder = 1;
  voters.renderOrder = 2;
  return { ties, stream, voters };
}

type Objects = ReturnType<typeof createObjects>;

/** Uploads only the used prefix of each attribute and draws only that. */
function touch(points: THREE.Points, count: number) {
  const geometry = points.geometry;
  for (const name of Object.keys(geometry.attributes)) {
    const attribute = geometry.getAttribute(name) as THREE.BufferAttribute;
    attribute.clearUpdateRanges();
    attribute.addUpdateRange(0, Math.max(1, count) * attribute.itemSize);
    attribute.needsUpdate = true;
  }
  geometry.setDrawRange(0, count);
}

function array(object: THREE.Points | THREE.Mesh, name: string) {
  return object.geometry.getAttribute(name).array as Float32Array;
}

function touchTies(mesh: THREE.Mesh, count: number) {
  const geometry = mesh.geometry as THREE.InstancedBufferGeometry;
  for (const name of ["iStart", "iEnd", "iColorA", "iColorB", "iWidth"]) {
    const attribute = geometry.getAttribute(name) as THREE.InstancedBufferAttribute;
    attribute.clearUpdateRanges();
    attribute.addUpdateRange(0, Math.max(1, count) * attribute.itemSize);
    attribute.needsUpdate = true;
  }
  geometry.instanceCount = count;
}

type Timeline = {
  /** Last time each voter changed opinion or arrived. */
  flash: Float64Array;
  /** Last time each tie was rewired, by tie id. */
  rewired: Map<number, number>;
};

function writeTint(
  target: Float32Array,
  index: number,
  rgb: readonly number[],
  cool: number,
  gain: number,
  tint = OPINION_TINT,
) {
  for (let channel = 0; channel < 3; channel += 1) {
    const field = WARM[channel]! + (COOL[channel]! - WARM[channel]!) * cool;
    target[index * 3 + channel] = (field + (rgb[channel]! - field) * tint) * gain;
  }
}

function writeFrame(
  objects: Objects,
  network: CoevolvingNetwork,
  bodies: readonly Body[],
  centre: THREE.Vector3,
  radius: number,
  timeline: Timeline,
  time: number,
) {
  const { opinions } = network;
  // The reference tints by distance from the centre; here that distance is
  // measured in cloud radii so the tint follows the network as it opens.
  const coolness = (x: number, y: number, z: number) =>
    Math.min(1, (Math.hypot(x - centre.x, y - centre.y, z - centre.z) / radius) * 0.75);

  const voterPositions = array(objects.voters, "position");
  const voterColours = array(objects.voters, "aColor");
  const voterSizes = array(objects.voters, "aSize");
  for (let voter = 0; voter < network.size; voter += 1) {
    const body = bodies[voter]!;
    voterPositions[voter * 3] = body.x;
    voterPositions[voter * 3 + 1] = body.y;
    voterPositions[voter * 3 + 2] = body.z;
    const since = time - timeline.flash[voter]!;
    const flash = since < FLASH_LIFETIME ? 1 - since / FLASH_LIFETIME : 0;
    writeTint(
      voterColours,
      voter,
      OPINION_COLOURS[opinions[voter]!]!,
      coolness(body.x, body.y, body.z),
      1.15 + flash * 1.2,
    );
    // Voters stand out from the tie dust; degree adds to the mote size.
    const degree = network.incident[voter]!.length;
    voterSizes[voter] = 0.065 + Math.min(4, Math.sqrt(degree)) * 0.012;
  }
  touch(objects.voters, network.size);

  const tieStarts = array(objects.ties, "iStart");
  const tieEnds = array(objects.ties, "iEnd");
  const tieColoursA = array(objects.ties, "iColorA");
  const tieColoursB = array(objects.ties, "iColorB");
  const tieWidths = array(objects.ties, "iWidth");
  const tieCount = Math.min(MAX_TIES, network.ties.length);
  for (let index = 0; index < tieCount; index += 1) {
    const tie = network.ties[index]!;
    const a = bodies[tie.a]!;
    const b = bodies[tie.b]!;
    const agree = opinions[tie.a] === opinions[tie.b];
    const rewiredAt = timeline.rewired.get(tie.id);
    const reach = rewiredAt === undefined ? 1 : Math.min(1, (time - rewiredAt) / REACH_TIME);
    const ex = a.x + (b.x - a.x) * reach;
    const ey = a.y + (b.y - a.y) * reach;
    const ez = a.z + (b.z - a.z) * reach;
    tieStarts[index * 3] = a.x;
    tieStarts[index * 3 + 1] = a.y;
    tieStarts[index * 3 + 2] = a.z;
    tieEnds[index * 3] = ex;
    tieEnds[index * 3 + 1] = ey;
    tieEnds[index * 3 + 2] = ez;
    // Each end takes its own voter's tint, so a disagreement shades from one
    // view to the other; agreeing ties are one quiet shade.
    if (agree) {
      const rgb = OPINION_COLOURS[opinions[tie.a]!]!;
      writeTint(tieColoursA, index, rgb, coolness(a.x, a.y, a.z), AGREE_GAIN);
      writeTint(tieColoursB, index, rgb, coolness(ex, ey, ez), AGREE_GAIN);
    } else {
      writeTint(tieColoursA, index, DISCORD, coolness(a.x, a.y, a.z), DISCORD_GAIN, 0.4);
      writeTint(tieColoursB, index, DISCORD, coolness(ex, ey, ez), DISCORD_GAIN, 0.4);
    }
    tieWidths[index] = agree ? AGREE_WIDTH : DISCORD_WIDTH;
  }
  touchTies(objects.ties, tieCount);

  const streamPositions = array(objects.stream, "position");
  const streamColours = array(objects.stream, "aColor");
  const streamSizes = array(objects.stream, "aSize");
  const perTie = Math.max(
    2,
    Math.min(MAX_PER_TIE, Math.floor(MAX_STREAM / Math.max(1, network.ties.length))),
  );
  let particle = 0;
  for (const tie of network.ties) {
    if (particle + perTie > MAX_STREAM) break;
    const a = bodies[tie.a]!;
    const b = bodies[tie.b]!;
    const agree = opinions[tie.a] === opinions[tie.b];
    const rgb = agree ? OPINION_COLOURS[opinions[tie.a]!]! : DISCORD;
    const gain = agree ? 0.8 : 1;
    // Disagreements flow faster; agreeing ties drift.
    const speed = agree ? 0.06 : 0.22;
    const rewiredAt = timeline.rewired.get(tie.id);
    const reach = rewiredAt === undefined ? 1 : Math.min(1, (time - rewiredAt) / REACH_TIME);
    for (let k = 0; k < perTie; k += 1) {
      const seed = tie.id * MAX_PER_TIE + k;
      const t = ((k + hash(seed)) / perTie + time * speed * (0.6 + hash(seed + 7) * 0.8)) % 1;
      const along = t * reach;
      const x = a.x + (b.x - a.x) * along;
      const y = a.y + (b.y - a.y) * along;
      const z = a.z + (b.z - a.z) * along;
      streamPositions[particle * 3] = x;
      streamPositions[particle * 3 + 1] = y;
      streamPositions[particle * 3 + 2] = z;
      writeTint(streamColours, particle, rgb, coolness(x, y, z), gain, agree ? OPINION_TINT : 0.7);
      streamSizes[particle] = 0.01 + hash(seed + 3) * 0.03;
      particle += 1;
    }
  }
  touch(objects.stream, particle);
}

function setUniforms(
  objects: Objects,
  pixelScale: number,
  width: number,
  height: number,
  dpr: number,
) {
  for (const object of [objects.stream, objects.voters]) {
    (object.material as THREE.ShaderMaterial).uniforms.uScale!.value = pixelScale;
  }
  const tieUniforms = (objects.ties.material as THREE.ShaderMaterial).uniforms;
  (tieUniforms.uResolution!.value as THREE.Vector2).set((width * dpr) / 2, (height * dpr) / 2);
  tieUniforms.uDpr!.value = dpr;
}

type NetworkSceneProps = Readonly<{
  rewiringRef: MutableRefObject<number>;
  apiRef: MutableRefObject<SceneApi | null>;
  reduceMotion: boolean;
  onTouched: () => void;
}>;

export default function NetworkScene({
  rewiringRef,
  apiRef,
  reduceMotion,
  onTouched,
}: NetworkSceneProps) {
  const { camera, size, invalidate } = useThree();
  const network = useMemo(() => createCoevolvingNetwork(), []);
  const bodies = useMemo(() => createBodies(network.size), [network]);
  const objects = useMemo(() => createObjects(), []);
  const timelineRef = useRef<Timeline>({
    flash: new Float64Array(MAX_VOTERS).fill(-Infinity),
    rewired: new Map(),
  });
  const scratch = useMemo(
    () => ({ centroid: new THREE.Vector3(), projected: new THREE.Vector3() }),
    [],
  );
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const centreRef = useRef(new THREE.Vector3());
  const radiusRef = useRef(5);
  const timeRef = useRef(0);
  const pendingRef = useRef(0);
  const onTouchedRef = useRef(onTouched);
  useEffect(() => {
    onTouchedRef.current = onTouched;
  }, [onTouched]);

  useEffect(
    () => () => {
      for (const object of Object.values(objects)) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    },
    [objects],
  );

  // Autonomous motion is clocked at 24 Hz; orbiting renders on demand.
  useEffect(() => {
    const timer = window.setInterval(() => invalidate(), 1_000 / 24);
    return () => window.clearInterval(timer);
  }, [invalidate]);

  useEffect(() => {
    const timeline = timelineRef.current;
    // Layout coordinates are the inner group's local space.
    const group = () => innerRef.current;
    const toWorld = (body: Point) =>
      group()!.localToWorld(new THREE.Vector3(body.x, body.y, body.z));
    const toLayout = (world: THREE.Vector3): Point => {
      const local = group()!.worldToLocal(world.clone());
      return { x: local.x, y: local.y, z: local.z };
    };
    // A point on the pointer ray at the depth of a reference voter (or the centre).
    const onRay = (x: number, y: number, reference: number | null) => {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const ray = raycaster.ray;
      const anchor = reference === null
        ? toWorld(centreRef.current)
        : toWorld(bodies[reference]!);
      const depth = anchor.sub(ray.origin).dot(ray.direction);
      return toLayout(ray.at(Math.max(0.1, depth), new THREE.Vector3()));
    };
    const screenNearest = (x: number, y: number) => {
      let best: number | null = null;
      let bestDistance = Infinity;
      for (let voter = 0; voter < network.size; voter += 1) {
        const body = bodies[voter]!;
        const projected = group()!
          .localToWorld(scratch.projected.set(body.x, body.y, body.z))
          .project(camera);
        if (projected.z > 1) continue;
        const dx = ((projected.x - x) * size.width) / 2;
        const dy = ((projected.y - y) * size.height) / 2;
        const distance = Math.hypot(dx, dy);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = voter;
        }
      }
      return { voter: best, distance: bestDistance };
    };
    const plant = (point: Point, opinion: number) => {
      const changed = plantOpinion(network, bodiesWithin(bodies, point, BRUSH_RADIUS), opinion);
      for (const voter of changed) timeline.flash[voter] = timeRef.current;
      if (changed.length > 0) onTouchedRef.current();
      invalidate();
    };
    // A newcomer holds the least-held view and ties to its two nearest voters.
    const add = (point: Point) => {
      const nearest = nearestBodies(bodies.slice(0, network.size), point, NEWCOMER_TIES);
      const opinion = rarestOpinion(network);
      const voter = addVoter(network, opinion, nearest);
      if (voter === null) return;
      bodies[voter] = { ...point, vx: 0, vy: 0, vz: 0 };
      timeline.flash[voter] = timeRef.current;
      for (const tieId of network.incident[voter]!) timeline.rewired.set(tieId, timeRef.current);
      onTouchedRef.current();
      invalidate();
    };

    apiRef.current = {
      pick: (x, y) => {
        if (!group()) return null;
        const { voter, distance } = screenNearest(x, y);
        return distance <= PICK_RADIUS ? voter : null;
      },
      plantAround: (voter) => {
        const body = bodies[voter];
        if (body) plant({ x: body.x, y: body.y, z: body.z }, rarestOpinion(network));
      },
      addAt: (x, y) => {
        if (!group()) return;
        add(onRay(x, y, screenNearest(x, y).voter));
      },
      addAtCentre: () => {
        if (!group()) return;
        const centre = centreRef.current;
        add({ x: centre.x, y: centre.y, z: centre.z });
      },
      plantAtCentre: () => {
        if (!group()) return;
        const centre = centreRef.current;
        plant({ x: centre.x, y: centre.y, z: centre.z }, rarestOpinion(network));
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, bodies, camera, invalidate, network, scratch, size]);

  useFrame((state, frameDelta) => {
    const group = groupRef.current;
    const inner = innerRef.current;
    if (!group || !inner) return;
    const delta = Math.min(frameDelta, 0.05);
    const tempo = reduceMotion ? 0.3 : 1;
    timeRef.current += delta * tempo;
    const time = timeRef.current;
    const timeline = timelineRef.current;

    pendingRef.current += delta * tempo * network.size * UPDATES_PER_VOTER_PER_SECOND;
    const count = Math.floor(pendingRef.current);
    pendingRef.current -= count;
    const events = stepCoevolvingNetwork(network, count, {
      ...DEFAULT_PARAMETERS,
      rewiring: rewiringRef.current,
    });
    if (!reduceMotion) {
      for (const event of events) {
        if (event.kind === "rewire") timeline.rewired.set(event.tie, time);
        else timeline.flash[event.voter] = time;
      }
    }
    for (const [tie, at] of timeline.rewired) {
      if (time - at > REACH_TIME) timeline.rewired.delete(tie);
    }

    relaxBodies(bodies, network.ties, delta * tempo);

    // Fit the cloud to the view: follow its centroid and RMS radius smoothly,
    // so islands drifting apart read as the volume opening, not as a zoom jump.
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const body of bodies) {
      cx += body.x;
      cy += body.y;
      cz += body.z;
    }
    cx /= bodies.length;
    cy /= bodies.length;
    cz /= bodies.length;
    let squared = 0;
    for (const body of bodies) {
      squared += (body.x - cx) ** 2 + (body.y - cy) ** 2 + (body.z - cz) ** 2;
    }
    const radius = Math.max(1, Math.sqrt(squared / bodies.length));
    const follow = 1 - Math.exp(-delta * 1.2);
    const centre = centreRef.current;
    centre.lerp(scratch.centroid.set(cx, cy, cz), follow);
    radiusRef.current = THREE.MathUtils.lerp(radiusRef.current, radius, follow);
    group.scale.setScalar(VIEW_SPREAD / radiusRef.current);
    if (!reduceMotion) group.rotation.y += delta * TURN_RATE;
    // The inner offset keeps the centroid on the orbit target.
    inner.position.set(-centre.x, -centre.y, -centre.z);

    // Sprite sizes are world units, as in the reference: projected size is
    // size × (device pixels per world unit at unit depth) / view depth.
    const pixelScale =
      (size.height * state.viewport.dpr) /
      (2 * Math.tan(THREE.MathUtils.degToRad((state.camera as THREE.PerspectiveCamera).fov) / 2));
    setUniforms(objects, pixelScale, size.width, size.height, state.viewport.dpr);

    writeFrame(objects, network, bodies, centre, radiusRef.current, timeline, time);
  });

  return (
    <group ref={groupRef} scale={VIEW_SPREAD / 5}>
      <group ref={innerRef}>
        <primitive object={objects.ties} />
        <primitive object={objects.stream} />
        <primitive object={objects.voters} />
      </group>
    </group>
  );
}
