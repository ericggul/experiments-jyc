import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { armLayout, HEAD_LAMPS, type HeadCount, type HeadKind, type SignalLamp } from "../model/signal-cycle";
import { ARM_TILT, armRadiusAt, createPole, poleRadiusAt } from "./pole";
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

export type Approach = "front" | "back";

/** The arm ends just past the outermost head's outer clamp band. */
export function armLengthFor({ headCount, leftTurn }: SignalConfig) {
  const { kinds, positions } = armLayout(headCount, leftTurn);
  return positions[positions.length - 1] + armHeadReach(kinds[kinds.length - 1]) + 0.07;
}

/** Horizontal middle of the pole and its arm, used to frame and light them. */
export const frameCentre = (config: SignalConfig) => POLE_X - armLengthFor(config) / 2 + 0.4;

type HeadPlacement = { kind: HeadKind; orientation: Orientation; matrix: THREE.Matrix4; approach: Approach };

/** All meshes of one material merged into one, in world space. */
function mergeByMaterial(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const flat = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
    flat.applyMatrix4(node.matrixWorld);
    for (const name of Object.keys(flat.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") flat.deleteAttribute(name);
    }
    flat.clearGroups();
    const list = byMaterial.get(node.material) ?? [];
    list.push(flat);
    byMaterial.set(node.material, list);
    node.geometry.dispose();
  });
  return [...byMaterial].map(([material, geometries]) => {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error("Pole geometry could not be merged");
    return { geometry: merged, material };
  });
}

/**
 * Builds the pole, arm and heads for one configuration. Static steel is merged
 * per material; heads are instanced per housing kind and per lamp colour, so
 * draw calls stay constant however many heads there are.
 */
export function buildStructure({
  config, kit, galvanisedRoughness, concrete,
}: { config: SignalConfig; kit: HeadKit; galvanisedRoughness: THREE.Texture; concrete: THREE.Texture }) {
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
  const clamps: THREE.BufferGeometry[] = [];
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
    placements.push({ kind: kinds[index], orientation: "horizontal", matrix: mount.matrixWorld.clone().multiply(housing), approach });
    const clamp = createArmClampGeometry(kinds[index], armRadiusAt(positions[index], armLength));
    clamp.applyMatrix4(mount.matrixWorld);
    clamps.push(clamp);
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
    clamps.push(geometry);
    placements.push({ kind, orientation: "vertical", matrix: mount.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, housingOffset)), approach: "front" });
  }

  // Static steel: pole, arm and fasteners merged per material, plus every clamp bracket.
  for (const { geometry, material } of mergeByMaterial(pole)) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    ownedGeometries.push(geometry);
    ownedMaterials.add(material);
  }
  const clampGeometry = mergeGeometries(clamps, false);
  clamps.forEach((geometry) => geometry.dispose());
  if (clampGeometry) {
    const mesh = new THREE.Mesh(clampGeometry, kit.hardware);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    ownedGeometries.push(clampGeometry);
  }

  // Housings: one instanced mesh per kind and orientation.
  const instanced: THREE.InstancedMesh[] = [];
  const housingGroups = new Map<string, HeadPlacement[]>();
  for (const placement of placements) {
    const key = `${placement.kind}:${placement.orientation}`;
    housingGroups.set(key, [...(housingGroups.get(key) ?? []), placement]);
  }
  for (const list of housingGroups.values()) {
    const mesh = new THREE.InstancedMesh(kit.housing(list[0].kind, list[0].orientation), kit.powderCoat, list.length);
    list.forEach((placement, index) => mesh.setMatrixAt(index, placement.matrix));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    instanced.push(mesh);
  }

  // Lamps: one board and one lens instanced mesh per colour, switched per instance.
  const lamps: { lamp: SignalLamp; approaches: Approach[]; switches: THREE.InstancedBufferAttribute[] }[] = [];
  const lampOffset = new THREE.Matrix4();
  for (const lamp of Object.keys(kit.boards) as SignalLamp[]) {
    const matrices: THREE.Matrix4[] = [];
    const approaches: Approach[] = [];
    for (const placement of placements) {
      const order: readonly SignalLamp[] = HEAD_LAMPS[placement.kind];
      const index = order.indexOf(lamp);
      if (index < 0) continue;
      const centre = lampCentres(placement.kind, placement.orientation)[index];
      matrices.push(placement.matrix.clone().multiply(lampOffset.makeTranslation(centre)));
      approaches.push(placement.approach);
    }
    if (!matrices.length) continue;
    const switches: THREE.InstancedBufferAttribute[] = [];
    for (const [geometry, material, shadows] of [[kit.board, kit.boards[lamp], true], [kit.lens, kit.lenses[lamp], false]] as const) {
      // Each mesh owns a small copy so its lampOn attribute and disposal stay independent.
      const view = geometry.clone();
      const lampOn = new THREE.InstancedBufferAttribute(new Float32Array(matrices.length), 1);
      lampOn.setUsage(THREE.DynamicDrawUsage);
      view.setAttribute("lampOn", lampOn);
      const mesh = new THREE.InstancedMesh(view, material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      if (!shadows) mesh.renderOrder = 1;
      mesh.computeBoundingSphere();
      group.add(mesh);
      instanced.push(mesh);
      ownedGeometries.push(view);
      switches.push(lampOn);
    }
    lamps.push({ lamp, approaches, switches });
  }

  return {
    group,
    /** Lights each instance whose approach shows its colour. */
    light(lit: Record<Approach, readonly SignalLamp[]>) {
      for (const { lamp, approaches, switches } of lamps) {
        for (const lampOn of switches) {
          approaches.forEach((approach, index) => lampOn.setX(index, lit[approach].includes(lamp) ? 1 : 0));
          lampOn.needsUpdate = true;
        }
      }
    },
    dispose() {
      instanced.forEach((mesh) => mesh.dispose());
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
    },
  };
}
