"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import * as THREE from "three";
import { CORE_SCALE, linkStrength, sphereRadius } from "../model/field";
import { falloffPerFrame, sharedTime } from "./clock";
import type { Peers } from "./peers";
import * as glsl from "./shaders";
import { place, setOpacity, setUniforms, show, stepEased, type Eased } from "./mutate";
import { NetworkForm } from "./network";

// One window's view onto the shared scene, on the architecture of Bjørn
// Staal's multipleWindow3dScene (main.js): an orthographic camera in screen
// coordinates whose offset eases toward this window's position, objects that
// ease toward their windows' centres, and one clock shared by every window.

const RATE_HZ = 24;
const noIds: number[] = [];

function useDisposable(items: { dispose: () => void }[]) {
  useEffect(() => () => items.forEach((item) => item.dispose()), [items]);
}

function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}

/**
 * Points on a sphere concentrated along vein-like ridges (zero lines of a
 * domain-warped sine field), with a faint haze between them — the membrane
 * of Entangled's clouds.
 */
function veinedSphere(count: number, seed: number, frequency: number) {
  const random = seeded(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count;) {
    const z = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    const f = frequency;
    const field = Math.sin(f * x + 1.7 * Math.sin(f * 0.8 * y + seed)) + Math.sin(f * 1.3 * y + 2.1 * Math.sin(f * 0.6 * z + seed * 1.3)) + Math.sin(f * 1.1 * z + 1.3 * Math.sin(f * 0.9 * x + seed * 0.7));
    // Within budget the membrane reads only if nearly every particle sits on a vein.
    if (Math.abs(field) > 0.12 && random() > 0.05) continue;
    const radius = 1 + (random() - 0.5) * 0.05;
    positions.set([x * radius, y * radius, z * radius], i * 3);
    i++;
  }
  return new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3));
}

/** Sparse particles drifting around a cloud. */
function dust(count: number, seed: number) {
  const random = seeded(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const z = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    const radius = 1.05 + Math.pow(random(), 2) * 0.55;
    positions.set([r * Math.cos(a) * radius, r * Math.sin(a) * radius, z * radius], i * 3);
  }
  return new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3));
}

/** Direction (desktop axes) to the most strongly linked other window, and that link's strength. */
function strongestLink(id: number, peers: Peers, eased: Eased, range: number) {
  const self = eased.centres.get(id);
  let best = { x: 0, y: 0, strength: 0 };
  if (!self) return best;
  for (const other of peers.getIds()) {
    const c = other === id ? undefined : eased.centres.get(other);
    if (!c) continue;
    const distance = Math.hypot(c.x - self.x, c.y - self.y) || 1;
    const strength = linkStrength(distance, range);
    if (strength > best.strength) best = { x: (c.x - self.x) / distance, y: (c.y - self.y) / distance, strength };
  }
  return best;
}

function bridgeGeometry(count: number) {
  const random = seeded(11);
  const attribute = (make: (i: number) => number) => new THREE.BufferAttribute(Float32Array.from({ length: count }, (_, i) => make(i)), 1);
  return new THREE.BufferGeometry()
    .setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    .setAttribute("aOffset", attribute(() => random()))
    .setAttribute("aSpeed", attribute(() => 0.6 + random() * 0.8))
    .setAttribute("aTheta", attribute(() => random() * Math.PI * 2))
    .setAttribute("aStream", attribute((i) => i % 2))
    .setAttribute("aCore", attribute((i) => (i % 10 < 3 ? 1 : 0)));
}

function points(geometry: THREE.BufferGeometry, vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const object = new THREE.Points(geometry, material);
  object.frustumCulled = false;
  return { object, material };
}

/**
 * Re-reads window positions at most 24 times a second, eases the camera offset
 * and every centre toward their targets (main.js falloff), and redraws.
 */
function Rig({ peers, selfId, eased, reducedMotion }: { peers: Peers; selfId: number; eased: Eased; reducedMotion: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.OrthographicCamera;
  const invalidate = useThree((state) => state.invalidate);

  // Heartbeat and redraw requests at 24 Hz; the easing itself runs per frame.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      peers.tick(performance.now());
      // Reduced motion: no autonomous change; redraw only when a window moved.
      if (peers.takeDirty() || !reducedMotion) invalidate();
    }, 1000 / RATE_HZ);
    return () => clearInterval(timer);
  }, [peers, reducedMotion, invalidate]);

  // Runs first each frame: window positions are re-read and the camera and
  // centres ease toward them with main.js's falloff, corrected for frame time,
  // so motion is continuous at any frame rate.
  useFrame((_, delta) => {
    peers.tick(performance.now());
    stepEased(eased, peers, selfId, falloffPerFrame(delta), reducedMotion ? null : sharedTime());
    const me = peers.get(selfId);
    if (!me || !eased.offset) return;
    const { x, y } = eased.offset;
    Object.assign(camera, { left: x, right: x + me.content.width, top: -y, bottom: -(y + me.content.height) });
    camera.updateProjectionMatrix();
  }, -1);
  return null;
}

/** multipleWindow3dScene's object: a wireframe cube per window, sized and coloured by its index. */
function Cube({ id, index, peers, eased }: { id: number; index: number; peers: Peers; eased: Eased }) {
  const [mesh, parts] = useMemo(() => {
    const size = cubeSize(index);
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(index * 0.1, 1, 0.5), wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    return [mesh, [geometry, material]] as const;
  }, [index]);
  useDisposable(parts as unknown as { dispose: () => void }[]);

  useFrame(() => {
    const c = eased.centres.get(id);
    show([mesh], !!c && !!peers.get(id));
    if (c) place(mesh, c.x, c.y, eased.time * 0.5, eased.time * 0.3);
  });
  return <primitive object={mesh} />;
}

const corners = [-0.5, 0.5].flatMap((x) => [-0.5, 0.5].flatMap((y) => [-0.5, 0.5].map((z) => new THREE.Vector3(x, y, z))));
const GHOSTS = [0.25, 0.5, 0.75];
const cubeSize = (index: number) => 100 + index * 50;

/** Writes the 8 corner-to-corner segments between two rotated cubes. */
function writeTunnel(attribute: THREE.BufferAttribute, a: { x: number; y: number; size: number }, b: { x: number; y: number; size: number }, euler: THREE.Euler) {
  const corner = new THREE.Vector3();
  corners.forEach((unit, i) => {
    corner.copy(unit).multiplyScalar(a.size).applyEuler(euler);
    attribute.setXYZ(i * 2, a.x + corner.x, -a.y + corner.y, corner.z);
    corner.copy(unit).multiplyScalar(b.size).applyEuler(euler);
    attribute.setXYZ(i * 2 + 1, b.x + corner.x, -b.y + corner.y, corner.z);
  });
  attribute.needsUpdate = true;
}

/**
 * The connection in the cubes form: the source's cubes share one clock, so
 * their corners correspond; lines join each pair of corners and interpolated
 * wireframe cubes fill the passage between the windows.
 */
function CubeTunnel({ a, b, indexA, indexB, peers, eased, range }: { a: number; b: number; indexA: number; indexB: number; peers: Peers; eased: Eased; range: number }) {
  const parts = useMemo(() => {
    const colorA = new THREE.Color().setHSL(indexA * 0.1, 1, 0.5);
    const colorB = new THREE.Color().setHSL(indexB * 0.1, 1, 0.5);
    const geometry = new THREE.BufferGeometry()
      .setAttribute("position", new THREE.BufferAttribute(new Float32Array(16 * 3), 3).setUsage(THREE.DynamicDrawUsage))
      .setAttribute("aSide", new THREE.BufferAttribute(Float32Array.from({ length: 16 }, (_, i) => i % 2), 1));
    const material = new THREE.ShaderMaterial({ vertexShader: glsl.tunnelVertex, fragmentShader: glsl.tunnelFragment, uniforms: { uColorA: { value: colorA }, uColorB: { value: colorB }, uStrength: { value: 1 } }, transparent: true, depthTest: false, blending: THREE.AdditiveBlending });
    const lines = new THREE.LineSegments(geometry, material);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const ghosts = GHOSTS.map((t) => {
      const ghostMaterial = new THREE.MeshBasicMaterial({ color: colorA.clone().lerp(colorB, t), wireframe: true, transparent: true, depthTest: false, blending: THREE.AdditiveBlending });
      return { t, mesh: new THREE.Mesh(box, ghostMaterial), material: ghostMaterial };
    });
    [lines, ...ghosts.map((ghost) => ghost.mesh)].forEach((object) => { object.frustumCulled = false; });
    return { lines, geometry, material, box, ghosts };
  }, [indexA, indexB]);
  useDisposable(useMemo(() => [parts.geometry, parts.material, parts.box, ...parts.ghosts.map((ghost) => ghost.material)], [parts]));
  const euler = useMemo(() => new THREE.Euler(), []);

  useFrame(() => {
    const ca = eased.centres.get(a);
    const cb = eased.centres.get(b);
    const strength = ca && cb && peers.get(a) && peers.get(b) ? linkStrength(Math.hypot(ca.x - cb.x, ca.y - cb.y), range) : 0;
    show([parts.lines, ...parts.ghosts.map((ghost) => ghost.mesh)], strength > 0.001);
    if (!ca || !cb || strength <= 0.001) return;
    euler.set(eased.time * 0.5, eased.time * 0.3, 0);
    const sa = cubeSize(indexA);
    const sb = cubeSize(indexB);
    writeTunnel(parts.geometry.attributes.position as THREE.BufferAttribute, { ...ca, size: sa }, { ...cb, size: sb }, euler);
    setUniforms(parts.material, { uStrength: strength });
    for (const ghost of parts.ghosts) {
      const size = sa + (sb - sa) * ghost.t;
      place(ghost.mesh, ca.x + (cb.x - ca.x) * ghost.t, ca.y + (cb.y - ca.y) * ghost.t, eased.time * 0.5, eased.time * 0.3);
      ghost.mesh.scale.setScalar(size);
      setOpacity(ghost.material, 0.45 * strength);
    }
  });
  return (
    <>
      <primitive object={parts.lines} />
      {parts.ghosts.map((ghost) => <primitive key={ghost.t} object={ghost.mesh} />)}
    </>
  );
}

/** Entangled's cloud: veined shell in the window's colour, core in its partner's, dust around. */
function Cloud({ id, color, partner, peers, eased, range, budget }: { id: number; color: string; partner: string; peers: Peers; eased: Eased; range: number; budget: { shell: number; core: number; dust: number } }) {
  const layers = useMemo(() => {
    const layer = (geometry: THREE.BufferGeometry, hex: string, size: number, alpha: number, seed: number) =>
      points(geometry, glsl.cloudVertex, glsl.cloudFragment, { uCenter: { value: new THREE.Vector2() }, uRadius: { value: 0 }, uTime: { value: 0 }, uSeed: { value: seed }, uSize: { value: size }, uColor: { value: new THREE.Color(hex) }, uAlpha: { value: alpha }, uToward: { value: new THREE.Vector2() }, uPull: { value: 0 } });
    return [
      { ...layer(veinedSphere(budget.shell, id * 7 + 1, 3.2), color, 2.8, 0.9, id * 1.3), scale: 1 },
      { ...layer(veinedSphere(budget.core, id * 7 + 3, 4.6), partner, 2.6, 0.95, id * 1.3 + 2.1), scale: CORE_SCALE },
      { ...layer(dust(budget.dust, id * 7 + 5), color, 1.6, 0.45, id * 1.3), scale: 1 },
    ];
  }, [id, color, partner, budget.shell, budget.core, budget.dust]);
  useDisposable(useMemo(() => layers.flatMap((layer) => [layer.material, layer.object.geometry]), [layers]));

  useFrame(() => {
    const c = eased.centres.get(id);
    const peer = peers.get(id);
    show(layers.map((layer) => layer.object), !!c && !!peer);
    if (!c || !peer) return;
    const radius = sphereRadius(peer.content);
    const link = strongestLink(id, peers, eased, range);
    for (const [index, layer] of layers.entries()) {
      (layer.material.uniforms.uCenter.value as THREE.Vector2).set(c.x, -c.y);
      (layer.material.uniforms.uToward.value as THREE.Vector2).set(link.x, link.y);
      // The shell opens into the bridge; the core leans less; dust follows loosely.
      setUniforms(layer.material, { uRadius: radius * layer.scale, uTime: eased.time, uPull: link.strength * [1, 0.6, 0.8][index] });
    }
  });
  return <>{layers.map((layer, i) => <primitive key={i} object={layer.object} />)}</>;
}

/** The hourglass of two streams between entangled clouds. */
function Bridge({ a, b, peers, eased, range, geometry }: { a: number; b: number; peers: Peers; eased: Eased; range: number; geometry: THREE.BufferGeometry }) {
  const colorA = peers.get(a)?.color ?? "#ffffff";
  const colorB = peers.get(b)?.color ?? "#ffffff";
  const { object, material } = useMemo(() => points(geometry, glsl.bridgeVertex, glsl.bridgeFragment, {
    uA: { value: new THREE.Vector2() }, uB: { value: new THREE.Vector2() }, uRadiusA: { value: 0 }, uRadiusB: { value: 0 },
    uStrength: { value: 0 }, uTime: { value: 0 }, uSize: { value: 2.8 }, uAlpha: { value: 1 },
    uColorA: { value: new THREE.Color(colorA) }, uColorB: { value: new THREE.Color(colorB) },
  }), [geometry, colorA, colorB]);
  useDisposable(useMemo(() => [material], [material]));

  useFrame(() => {
    const ca = eased.centres.get(a);
    const cb = eased.centres.get(b);
    const pa = peers.get(a);
    const pb = peers.get(b);
    const strength = ca && cb ? linkStrength(Math.hypot(ca.x - cb.x, ca.y - cb.y), range) : 0;
    show([object], !!pa && !!pb && strength > 0.001);
    if (!ca || !cb || !pa || !pb || strength <= 0.001) return;
    (material.uniforms.uA.value as THREE.Vector2).set(ca.x, -ca.y);
    (material.uniforms.uB.value as THREE.Vector2).set(cb.x, -cb.y);
    setUniforms(material, { uRadiusA: sphereRadius(pa.content), uRadiusB: sphereRadius(pb.content), uStrength: strength, uTime: eased.time });
  });
  return <primitive object={object} />;
}

export type Budget = { shell: number; core: number; dust: number; bridge: number };

export function Scene({ form, peers, selfId, range, turnover, budget, reducedMotion }: { form: "clouds" | "cubes" | "network"; peers: Peers; selfId: number; range: number; turnover: number; budget: Budget; reducedMotion: boolean }) {
  const ids = useSyncExternalStore(peers.subscribe, peers.getIds, () => noIds);
  const eased = useMemo<Eased>(() => ({ offset: null, centres: new Map(), time: sharedTime() }), []);
  const bridge = useMemo(() => bridgeGeometry(budget.bridge), [budget.bridge]);
  useDisposable(useMemo(() => [bridge], [bridge]));
  const pairs = ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b] as const));

  return (
    <>
      <color attach="background" args={[form === "cubes" ? "#000000" : "#05040c"]} />
      <Rig peers={peers} selfId={selfId} eased={eased} reducedMotion={reducedMotion} />
      {form === "network" ? <NetworkForm peers={peers} selfId={selfId} eased={eased} range={range} turnover={turnover} reducedMotion={reducedMotion} /> : null}
      {form === "network" ? null : form === "cubes"
        ? (
          <>
            {pairs.map(([a, b]) => <CubeTunnel key={`${a}-${b}`} a={a} b={b} indexA={ids.indexOf(a)} indexB={ids.indexOf(b)} peers={peers} eased={eased} range={range} />)}
            {ids.map((id, index) => <Cube key={id} id={id} index={index} peers={peers} eased={eased} />)}
          </>
        )
        : (
          <>
            {pairs.map(([a, b]) => <Bridge key={`${a}-${b}`} a={a} b={b} peers={peers} eased={eased} range={range} geometry={bridge} />)}
            {ids.map((id) => <Cloud key={id} id={id} color={peers.get(id)?.color ?? "#ffffff"} partner={peers.get(id)?.partner ?? "#ffffff"} peers={peers} eased={eased} range={range} budget={budget} />)}
          </>
        )}
    </>
  );
}
