import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { PoleSpec } from "../model/arrangement";
import { armLayout, HEAD_LAMPS, type HeadCount, type HeadKind, type SignalLamp } from "../model/signal-cycle";
import { ARM_TILT, armRadiusAt, createPole, POLE_BOTTOM, POLE_HEIGHT, poleRadiusAt, type PolePart } from "./pole";
import {
  ARM_HOUSING_OFFSET, armHeadReach, createArmClampGeometry, createPoleClampGeometry, headLength, lampCentres,
  type HeadKit, type Orientation,
} from "./signal-head";

/** The pole stands right of centre; its arm reaches left over the street. */
export const POLE_X = 3.2;
/** Auxiliary pole heads use 200 mm lamps: the 300 mm head at two-thirds scale. */
const POLE_HEAD_SCALE = 2 / 3;
/** Bottom of the pole head: the manual's 2.5 m minimum for side-pole vertical heads. */
const POLE_HEAD_BOTTOM = 2.5;

export type SignalConfig = {
  headCount: HeadCount;
  /** The outermost arm head (and the pole head) become four-colour with a left-turn arrow. */
  leftTurn: boolean;
  /** One head clamped back to back with the outermost arm head, for the opposing approach. */
  backHead: boolean;
  /** A vertical auxiliary head on the pole for this approach. */
  poleHead: boolean;
};

/** Poles along the road. */
export const POLE_COUNT = 50;

export type Approach = "front" | "back";

/** The arm ends just past the outermost head's outer clamp band. */
export function armLengthFor({ headCount, leftTurn }: SignalConfig) {
  const { kinds, positions } = armLayout(headCount, leftTurn);
  return positions[positions.length - 1] + armHeadReach(kinds[kinds.length - 1]) + 0.07;
}

/** Horizontal middle of the pole and its arm, used to frame and light them. */
export const frameCentre = (config: SignalConfig) => POLE_X - armLengthFor(config) / 2 + 0.4;

type HeadPlacement = { kind: HeadKind; orientation: Orientation; matrix: THREE.Matrix4; approach: Approach; part: PolePart };

/** The part a mesh belongs to: its own tag or its nearest tagged ancestor's, else base. */
function partOf(node: THREE.Object3D): PolePart {
  for (let current: THREE.Object3D | null = node; current; current = current.parent) {
    if (current.userData.part) return current.userData.part as PolePart;
  }
  return "base";
}

/** All meshes of one part and material merged into one, in the pole's frame. */
function mergeByMaterial(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const byMaterial = new Map<string, { part: PolePart; material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const flat = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
    flat.applyMatrix4(node.matrixWorld);
    for (const name of Object.keys(flat.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") flat.deleteAttribute(name);
    }
    flat.clearGroups();
    const part = partOf(node);
    const material = node.material as THREE.Material;
    const key = `${part}:${material.uuid}`;
    const entry = byMaterial.get(key) ?? { part, material, geometries: [] as THREE.BufferGeometry[] };
    entry.geometries.push(flat);
    byMaterial.set(key, entry);
    node.geometry.dispose();
  });
  return [...byMaterial.values()].map(({ part, material, geometries }) => {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error("Pole geometry could not be merged");
    const indexed = mergeVertices(merged, 1e-5);
    merged.dispose();
    return { geometry: indexed, material, part };
  });
}

const scratch = new THREE.Matrix4();

/**
 * The transform of one part of a pole. The base stands at the pole's spot and
 * heading; the shaft stretches about its foot to reach its arm (or the highest
 * arm on a shared trunk); the top (and everything on the arm) is lifted by the rise.
 */
function partFrame(target: THREE.Matrix4, spec: PoleSpec, part: PolePart) {
  // A pole sharing another's trunk draws only its top; the rest collapses to nothing.
  if (spec.trunk === false && part !== "top") return target.makeScale(0, 0, 0);
  // The model's pole foot stands at x = POLE_X in its frame; the spec moves it by (x, z) and turns it about the foot.
  target.makeTranslation(POLE_X + spec.x, 0, spec.z)
    .multiply(scratch.makeRotationY(spec.heading))
    .multiply(scratch.makeTranslation(-POLE_X, 0, 0));
  if (part === "top") target.multiply(scratch.makeTranslation(0, spec.rise, 0));
  if (part === "shaft") {
    const stretch = (POLE_HEIGHT + (spec.shaft ?? spec.rise)) / POLE_HEIGHT;
    target.multiply(scratch.makeTranslation(0, POLE_BOTTOM, 0))
      .multiply(scratch.makeScale(1, stretch, 1))
      .multiply(scratch.makeTranslation(0, -POLE_BOTTOM, 0));
  }
  return target;
}

/**
 * Builds one pole, arm and heads for a configuration in its own frame, then
 * repeats it for every pole in `poles`, each at its own spot, heading and height. Static steel is merged per
 * material and instanced per pole; heads are instanced per housing kind and per
 * lamp colour across all poles, so draw calls stay constant however many poles
 * and heads there are.
 */
export function buildStructure({
  config, kit, galvanisedRoughness, concrete, poles,
}: {
  config: SignalConfig;
  kit: HeadKit;
  galvanisedRoughness: THREE.Texture;
  concrete: THREE.Texture;
  poles: readonly PoleSpec[];
}) {
  const group = new THREE.Group();
  const ownedGeometries: THREE.BufferGeometry[] = [];
  const ownedMaterials = new Set<THREE.Material>();
  const armLength = armLengthFor(config);
  const { kinds, positions } = armLayout(config.headCount, config.leftTurn);

  const { pole, arm } = createPole({ galvanisedRoughness, concrete, armLength });
  // Turned half round: the arm reaches toward -x and the hand hole faces the street.
  pole.position.x = POLE_X;
  pole.rotation.y = Math.PI;

  const placements: HeadPlacement[] = [];
  // Arm clamps rise with the arm; the pole head's clamps stay on the base.
  const clamps: Record<"top" | "base", THREE.BufferGeometry[]> = { top: [], base: [] };
  const armHead = (index: number, approach: Approach) => {
    const mount = new THREE.Object3D();
    mount.position.x = positions[index];
    // Front heads are turned back to face the street (+z); the back head faces the opposing approach.
    mount.rotation.y = approach === "front" ? Math.PI : 0;
    arm.add(mount);
    return { mount, index, approach };
  };
  const armMounts = positions.map((_, index) => armHead(index, "front"));
  if (config.backHead) armMounts.push(armHead(positions.length - 1, "back"));
  pole.updateMatrixWorld(true);
  for (const { mount, index, approach } of armMounts) {
    // The roll cancels the arm's rise in world space for either facing.
    const roll = approach === "front" ? ARM_TILT : -ARM_TILT;
    const housing = new THREE.Matrix4().makeTranslation(0, 0, ARM_HOUSING_OFFSET).multiply(new THREE.Matrix4().makeRotationZ(roll));
    placements.push({ kind: kinds[index], orientation: "horizontal", matrix: mount.matrixWorld.clone().multiply(housing), approach, part: "top" });
    const clamp = createArmClampGeometry(kinds[index], armRadiusAt(positions[index], armLength));
    clamp.applyMatrix4(mount.matrixWorld);
    clamps.top.push(clamp);
  }

  if (config.poleHead) {
    const kind: HeadKind = config.leftTurn ? "four" : "three";
    const height = headLength(kind) * POLE_HEAD_SCALE;
    const centreY = POLE_HEAD_BOTTOM + height / 2;
    const mount = new THREE.Matrix4().compose(
      new THREE.Vector3(POLE_X, centreY, 0), new THREE.Quaternion(), new THREE.Vector3().setScalar(POLE_HEAD_SCALE),
    );
    // Clamp bands are built at the shaft's true radius, before the head's scale.
    const { geometry, housingOffset } = createPoleClampGeometry(kind, poleRadiusAt(centreY, armLength) / POLE_HEAD_SCALE);
    geometry.applyMatrix4(mount);
    clamps.base.push(geometry);
    placements.push({
      kind, orientation: "vertical", approach: "front", part: "base",
      matrix: mount.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, housingOffset)),
    });
  }

  // Every instance is one pole part's transform times a matrix in that pole's frame,
  // so a new arrangement only rewrites instance matrices; nothing is rebuilt.
  type Instance = { pole: number; part: PolePart; local: THREE.Matrix4 };
  const instanced: { mesh: THREE.InstancedMesh; instances: Instance[] }[] = [];
  const addInstanced = (mesh: THREE.InstancedMesh, instances: Instance[]) => {
    group.add(mesh);
    instanced.push({ mesh, instances });
  };
  const everyPole = (local: THREE.Matrix4, part: PolePart) => poles.map((_, pole) => ({ pole, part, local }));
  const perPole = (geometry: THREE.BufferGeometry, material: THREE.Material, part: PolePart) => {
    const mesh = new THREE.InstancedMesh(geometry, material, poles.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    addInstanced(mesh, everyPole(new THREE.Matrix4(), part));
    ownedGeometries.push(geometry);
  };

  // Static steel: pole, arm and fasteners merged per part and material, plus the clamp brackets, one instance per pole.
  for (const { geometry, material, part } of mergeByMaterial(pole)) {
    perPole(geometry, material, part);
    ownedMaterials.add(material);
  }
  for (const part of ["top", "base"] as const) {
    if (!clamps[part].length) continue;
    // Clamp parts arrive indexed; merging indexed with indexed keeps vertices shared.
    const clampGeometry = mergeGeometries(clamps[part], false);
    clamps[part].forEach((geometry) => geometry.dispose());
    if (clampGeometry) perPole(clampGeometry, kit.hardware, part);
  }

  // Housings: one instanced mesh per kind and orientation, across all poles.
  const housingGroups = new Map<string, HeadPlacement[]>();
  for (const placement of placements) {
    const key = `${placement.kind}:${placement.orientation}`;
    housingGroups.set(key, [...(housingGroups.get(key) ?? []), placement]);
  }
  for (const list of housingGroups.values()) {
    const instances = list.flatMap((placement) => everyPole(placement.matrix, placement.part));
    const mesh = new THREE.InstancedMesh(kit.housing(list[0].kind, list[0].orientation), kit.powderCoat, instances.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    addInstanced(mesh, instances);
  }

  // Lamps: one board and one lens instanced mesh per colour, switched per instance.
  const lamps: { lamp: SignalLamp; owners: { pole: number; approach: Approach }[]; switches: THREE.InstancedBufferAttribute[] }[] = [];
  const lampOffset = new THREE.Matrix4();
  for (const lamp of Object.keys(kit.boards) as SignalLamp[]) {
    const instances: Instance[] = [];
    const owners: { pole: number; approach: Approach }[] = [];
    for (const placement of placements) {
      const order: readonly SignalLamp[] = HEAD_LAMPS[placement.kind];
      const index = order.indexOf(lamp);
      if (index < 0) continue;
      const centre = lampCentres(placement.kind, placement.orientation)[index];
      const local = placement.matrix.clone().multiply(lampOffset.makeTranslation(centre));
      for (const instance of everyPole(local, placement.part)) {
        instances.push(instance);
        owners.push({ pole: instance.pole, approach: placement.approach });
      }
    }
    if (!instances.length) continue;
    const switches: THREE.InstancedBufferAttribute[] = [];
    for (const [geometry, material, shadows] of [[kit.board, kit.boards[lamp], true], [kit.lens, kit.lenses[lamp], false]] as const) {
      // Each mesh owns a small copy so its lampOn attribute and disposal stay independent.
      const view = geometry.clone();
      const lampOn = new THREE.InstancedBufferAttribute(new Float32Array(instances.length), 1);
      lampOn.setUsage(THREE.DynamicDrawUsage);
      view.setAttribute("lampOn", lampOn);
      const mesh = new THREE.InstancedMesh(view, material, instances.length);
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      if (!shadows) mesh.renderOrder = 1;
      addInstanced(mesh, instances);
      ownedGeometries.push(view);
      switches.push(lampOn);
    }
    lamps.push({ lamp, owners, switches });
  }

  const frame = new THREE.Matrix4();
  const world = new THREE.Matrix4();
  /** Places every instance on the given poles (same count as built). */
  const place = (next: readonly PoleSpec[]) => {
    for (const { mesh, instances } of instanced) {
      instances.forEach(({ pole, part, local }, index) => {
        mesh.setMatrixAt(index, world.multiplyMatrices(partFrame(frame, next[pole], part), local));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  };
  place(poles);

  return {
    group,
    place,
    /** Lights each lamp whose pole and approach currently show its colour. */
    light(litOf: (pole: number, approach: Approach) => readonly SignalLamp[]) {
      for (const { lamp, owners, switches } of lamps) {
        for (const lampOn of switches) {
          owners.forEach(({ pole, approach }, index) => lampOn.setX(index, litOf(pole, approach).includes(lamp) ? 1 : 0));
          lampOn.needsUpdate = true;
        }
      }
    },
    dispose() {
      instanced.forEach(({ mesh }) => mesh.dispose());
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
    },
  };
}
