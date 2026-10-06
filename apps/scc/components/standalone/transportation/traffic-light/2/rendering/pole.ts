import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Galvanised cantilever signal pole (신호등주), in metres.
const FOOTING_TOP = 0.05;
const BASE_PLATE = 0.032;
export const POLE_BOTTOM = FOOTING_TOP + BASE_PLATE;
export const POLE_HEIGHT = 6.1;
/** Arm axis height: a 0.40 m head centred on it has its bottom at 5.0 m, within the manual's 4.5–5 m. */
export const ARM_HEIGHT = 5.2;
// Level arm: a rise put the arm and the level heads visibly out of line.
export const ARM_TILT = 0;

/** Section sizes for a given arm: longer arms need a heavier arm and shaft. */
export function poleSections(armLength: number) {
  const extra = armLength - 6.4;
  return {
    poleBottom: 0.115 + extra * 0.012,
    poleTop: 0.085 + extra * 0.008,
    armRoot: 0.082 + extra * 0.007,
    armTip: 0.054 + extra * 0.002,
  };
}

export const poleRadiusAt = (y: number, armLength: number) => {
  const { poleBottom, poleTop } = poleSections(armLength);
  return poleBottom + (poleTop - poleBottom) * ((y - POLE_BOTTOM) / POLE_HEIGHT);
};

export const armRadiusAt = (x: number, armLength: number) => {
  const { armRoot, armTip } = poleSections(armLength);
  return armRoot + (armTip - armRoot) * (x / armLength);
};

/**
 * Pole at the origin with the arm reaching along local +x and the hand hole on
 * local -z; the caller turns it to face the street.
 */
/**
 * Which part of the pole a mesh belongs to when poles differ in height: the
 * base stays on the ground, the shaft stretches, the top (cap, arm joint, arm)
 * rises with it. Untagged meshes are base.
 */
export type PolePart = "base" | "shaft" | "top";
const tag = (object: THREE.Object3D, part: PolePart) => {
  object.userData.part = part;
  return object;
};

export function createPole({
  galvanisedRoughness, concrete, armLength,
}: { galvanisedRoughness: THREE.Texture; concrete: THREE.Texture; armLength: number }) {
  const { poleBottom, poleTop, armRoot, armTip } = poleSections(armLength);
  const joint = armRoot / 0.082;
  const base = poleBottom / 0.115;
  const pole = new THREE.Group();
  const galvanised = new THREE.MeshStandardMaterial({
    color: "#b9bcbb", metalness: 0.9, roughness: 1, roughnessMap: galvanisedRoughness,
  });
  const fastener = new THREE.MeshStandardMaterial({ color: "#8e9190", metalness: 0.92, roughness: 0.48 });
  const footingMaterial = new THREE.MeshStandardMaterial({ color: "#d8d4cc", map: concrete, roughness: 0.94 });

  const footing = new THREE.Mesh(new RoundedBoxGeometry(1.1 * base, 0.25, 1.1 * base, 3, 0.012), footingMaterial);
  footing.position.y = FOOTING_TOP - 0.125;
  pole.add(footing);

  const basePlate = new THREE.Mesh(new RoundedBoxGeometry(0.5 * base, BASE_PLATE, 0.5 * base, 2, 0.008), galvanised);
  basePlate.position.y = FOOTING_TOP + BASE_PLATE / 2;
  pole.add(basePlate);

  // Anchor bolts: threaded stud, washer, double nut.
  const stud = new THREE.CylinderGeometry(0.0135, 0.0135, 0.09, 16);
  const washer = new THREE.CylinderGeometry(0.03, 0.03, 0.005, 24);
  const nut = new THREE.CylinderGeometry(0.025, 0.025, 0.021, 6);
  for (const x of [-0.19 * base, 0.19 * base]) {
    for (const z of [-0.19 * base, 0.19 * base]) {
      const parts: [THREE.BufferGeometry, number][] = [[stud, 0.045], [washer, 0.0025], [nut, 0.016], [nut, 0.038]];
      for (const [geometry, y] of parts) {
        const mesh = new THREE.Mesh(geometry, fastener);
        mesh.position.set(x, POLE_BOTTOM + y, z);
        mesh.rotation.y = (x * 7 + z * 3) % 1;
        pole.add(mesh);
      }
    }
  }

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(poleTop, poleBottom, POLE_HEIGHT, 72, 1), galvanised);
  shaft.position.y = POLE_BOTTOM + POLE_HEIGHT / 2;
  pole.add(tag(shaft, "shaft"));

  const weld = new THREE.Mesh(new THREE.TorusGeometry(poleBottom + 0.002, 0.007, 8, 72), galvanised);
  weld.rotation.x = Math.PI / 2;
  weld.position.y = POLE_BOTTOM + 0.004;
  pole.add(weld);

  // Base gussets between the anchor bolts.
  const gussetShape = new THREE.Shape();
  gussetShape.moveTo(0, 0);
  gussetShape.lineTo(0.12 * base, 0);
  gussetShape.lineTo(0.12 * base, 0.025);
  gussetShape.lineTo(0, 0.22 * base);
  gussetShape.closePath();
  const gussetGeometry = new THREE.ExtrudeGeometry(gussetShape, {
    depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1,
  });
  gussetGeometry.translate(0, 0, -0.006);
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2;
    const gusset = new THREE.Mesh(gussetGeometry, galvanised);
    gusset.position.set(Math.cos(angle) * (poleBottom - 0.004), POLE_BOTTOM, Math.sin(angle) * (poleBottom - 0.004));
    gusset.rotation.y = -angle;
    pole.add(gusset);
  }

  // Hand-hole cover facing the street, curved to the shaft, with two screws.
  const handHoleY = 0.78;
  const handHoleRadius = poleRadiusAt(handHoleY, armLength) + 0.004;
  const handHole = new THREE.Mesh(new THREE.CylinderGeometry(handHoleRadius, handHoleRadius, 0.25, 16, 1, false, Math.PI - 0.52, 1.04), galvanised);
  handHole.position.y = handHoleY;
  pole.add(handHole);
  for (const y of [-0.1, 0.1]) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 12), fastener);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(0, handHoleY + y, -handHoleRadius - 0.002);
    pole.add(screw);
  }

  const cap = new THREE.Mesh(new THREE.SphereGeometry(poleTop + 0.006, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2), galvanised);
  cap.scale.y = 0.42;
  cap.position.y = POLE_BOTTOM + POLE_HEIGHT;
  pole.add(tag(cap, "top"));
  const capRim = new THREE.Mesh(new THREE.CylinderGeometry(poleTop + 0.006, poleTop + 0.006, 0.03, 48), galvanised);
  capRim.position.y = POLE_BOTTOM + POLE_HEIGHT - 0.012;
  pole.add(tag(capRim, "top"));

  // Arm joint: welded bracket box on the shaft, two bolted flange plates.
  const jointRadius = poleRadiusAt(ARM_HEIGHT, armLength);
  const bracketDepth = 0.11;
  const bracketStart = jointRadius * 0.55;
  const bracket = new THREE.Mesh(new RoundedBoxGeometry(bracketDepth, 0.4 * joint, 0.18 * joint, 2, 0.008), galvanised);
  bracket.position.set(bracketStart + bracketDepth / 2, ARM_HEIGHT, 0);
  pole.add(tag(bracket, "top"));
  const flangeThickness = 0.022;
  const flangeGeometry = new RoundedBoxGeometry(flangeThickness, 0.34 * joint, 0.3 * joint, 2, 0.006);
  const poleFlange = new THREE.Mesh(flangeGeometry, galvanised);
  poleFlange.position.set(bracketStart + bracketDepth + flangeThickness / 2, ARM_HEIGHT, 0);
  pole.add(tag(poleFlange, "top"));

  const arm = new THREE.Group();
  arm.position.set(bracketStart + bracketDepth + flangeThickness, ARM_HEIGHT, 0);
  arm.rotation.z = ARM_TILT;
  pole.add(tag(arm, "top"));

  const armFlange = new THREE.Mesh(flangeGeometry, galvanised);
  armFlange.position.x = flangeThickness / 2;
  arm.add(armFlange);
  const boltHead = new THREE.CylinderGeometry(0.017, 0.017, 0.016, 6);
  const boltShank = new THREE.CylinderGeometry(0.01, 0.01, 0.075, 12);
  for (const y of [-0.125 * joint, 0.125 * joint]) {
    for (const z of [-0.105 * joint, 0.105 * joint]) {
      const head = new THREE.Mesh(boltHead, fastener);
      head.rotation.z = Math.PI / 2;
      head.position.set(flangeThickness + 0.008, y, z);
      arm.add(head);
      const nutBehind = new THREE.Mesh(boltHead, fastener);
      nutBehind.rotation.z = Math.PI / 2;
      nutBehind.position.set(-flangeThickness - 0.008, y, z);
      arm.add(nutBehind);
      const shank = new THREE.Mesh(boltShank, fastener);
      shank.rotation.z = Math.PI / 2;
      shank.position.set(0, y, z);
      arm.add(shank);
    }
  }

  const armTube = new THREE.CylinderGeometry(armTip, armRoot, armLength, 64, 1);
  armTube.rotateZ(-Math.PI / 2);
  armTube.translate(armLength / 2 + flangeThickness, 0, 0);
  arm.add(new THREE.Mesh(armTube, galvanised));
  const armWeld = new THREE.Mesh(new THREE.TorusGeometry(armRoot + 0.002, 0.006, 8, 64), galvanised);
  armWeld.rotation.y = Math.PI / 2;
  armWeld.position.x = flangeThickness + 0.003;
  arm.add(armWeld);
  // Stiffening ribs above and below the arm root.
  const ribShape = new THREE.Shape();
  ribShape.moveTo(0, 0);
  ribShape.lineTo(0.2 * joint, 0);
  ribShape.lineTo(0, 0.1 * joint);
  ribShape.closePath();
  const ribGeometry = new THREE.ExtrudeGeometry(ribShape, { depth: 0.01, bevelEnabled: false });
  ribGeometry.translate(0, 0, -0.005);
  for (const sign of [1, -1]) {
    const rib = new THREE.Mesh(ribGeometry, galvanised);
    rib.scale.y = sign;
    rib.position.set(flangeThickness, sign * (armRoot - 0.004), 0);
    arm.add(rib);
  }
  const armCap = new THREE.Mesh(new THREE.SphereGeometry(armTip + 0.003, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2), galvanised);
  armCap.rotation.z = -Math.PI / 2;
  armCap.scale.y = 0.4;
  armCap.position.x = armLength + flangeThickness;
  arm.add(armCap);

  pole.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = node !== footing;
      node.receiveShadow = true;
    }
  });

  return { pole, arm, galvanised };
}
