import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { assignFingers, inferWrist, type Finger } from "../model/hand";
import { reachLimb } from "../model/limb";
import { toWorld, type Frame, type Point, type Pose } from "../model/rig";

// The 2D rig's rest body spans 470 units from head center to feet; the model's head-to-ankle span is matched to it.
const restBodyHeight = 470;
const boneNames = ["hips", "neck", "head", "upperArm_L", "forearm_L", "hand_L", "upperArm_R", "forearm_R", "hand_R", "thigh_L", "shin_L", "foot_L", "thigh_R", "shin_R", "foot_R"] as const;
export type BoneName = (typeof boneNames)[number];
// The figure faces the viewer, so the screen-left limbs are the model's right limbs.
const limbs = [
  { root: "upperArm_R", middle: "forearm_R", end: "hand_R", joint: "leftElbow", target: "leftHand" },
  { root: "upperArm_L", middle: "forearm_L", end: "hand_L", joint: "rightElbow", target: "rightHand" },
  { root: "thigh_R", middle: "shin_R", end: "foot_R", joint: "leftKnee", target: "leftFoot" },
  { root: "thigh_L", middle: "shin_L", end: "foot_L", joint: "rightKnee", target: "rightFoot" },
] as const satisfies readonly { root: BoneName; middle: BoneName; end: BoneName; joint: keyof Pose; target: keyof Pose }[];

// `contacts` are the raw touches by identifier; `time` is the frame time in milliseconds.
export type Poser = { place: (frame: Frame, pose: Pose, contacts: ReadonlyMap<number, Point>, time: number) => void };

// Poses a loaded rig in screen pixels (y up) so its body follows the 2D pose; null if any expected bone is missing.
// The head sits on the head finger, the torso leans like the 2D torso, and each limb is a rigid reach whose elbow
// bends back and down and whose knee bends forward, as a real body does, instead of folding flat in the screen.
export function createPoser(root: THREE.Object3D, model: THREE.Object3D): Poser | null {
  const bones = new Map<BoneName, THREE.Bone>();
  model.traverse((node) => {
    if (node instanceof THREE.Bone && (boneNames as readonly string[]).includes(node.name)) bones.set(node.name as BoneName, node);
  });
  if (boneNames.some((name) => !bones.has(name))) return null;
  const bone = (name: BoneName) => bones.get(name)!;
  root.add(model);
  root.updateMatrixWorld(true);
  const rest = [...bones.values()].map((node) => [node, node.quaternion.clone()] as const);
  const worldOf = (name: BoneName) => bone(name).getWorldPosition(new THREE.Vector3());
  const neckRest = worldOf("neck");
  const headRest = worldOf("head");
  // The head bone starts at the jaw; the head finger is the head's center, a little above it.
  const headCenterRest = headRest.clone().add(headRest.clone().sub(neckRest).multiplyScalar(0.8));
  const anklesRest = worldOf("foot_L").add(worldOf("foot_R")).multiplyScalar(0.5);
  const hipsRest = worldOf("hips");
  const restHeight = Math.max(1e-6, headCenterRest.y - anklesRest.y);
  const hipsToHead = headCenterRest.distanceTo(hipsRest);
  const footRest = (["foot_L", "foot_R"] as const).map((name) => [bone(name), bone(name).getWorldQuaternion(new THREE.Quaternion())] as const);

  const position = new THREE.Vector3();
  const childPosition = new THREE.Vector3();
  const current = new THREE.Vector3();
  const wanted = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const world = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const level = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const toVector = (point: Point) => new THREE.Vector3(point.x, -point.y, 0);

  // Turns a bone in world space so the direction to its child becomes the wanted direction.
  const aim = (node: THREE.Bone, child: THREE.Bone, direction: THREE.Vector3) => {
    node.getWorldPosition(position);
    child.getWorldPosition(childPosition);
    current.subVectors(childPosition, position);
    if (current.lengthSq() < 1e-10 || direction.lengthSq() < 1e-10) return;
    turn.setFromUnitVectors(current.normalize(), wanted.copy(direction).normalize());
    node.getWorldQuaternion(world).premultiply(turn);
    node.parent!.getWorldQuaternion(parentWorld);
    node.quaternion.copy(parentWorld.invert().multiply(world));
    node.updateMatrixWorld(true);
  };

  const place = (frame: Frame, pose: Pose) => {
    const at = (point: Point) => toVector(toWorld(frame, point));
    for (const [node, quaternion] of rest) node.quaternion.copy(quaternion);
    const scale = (frame.scale * restBodyHeight) / restHeight;
    root.scale.setScalar(scale);
    const head = at(pose.head);
    const lean = at(pose.neck).sub(at(pose.pelvis)).normalize();
    const hips = head.clone().addScaledVector(lean, -hipsToHead * scale);
    root.position.set(hips.x - hipsRest.x * scale, hips.y - hipsRest.y * scale, -hipsRest.z * scale);
    root.updateMatrixWorld(true);

    aim(bone("hips"), bone("neck"), lean);
    aim(bone("neck"), bone("head"), head.clone().sub(bone("neck").getWorldPosition(position)));
    for (const limb of limbs) {
      const rootBone = bone(limb.root);
      const middle = bone(limb.middle);
      const end = bone(limb.end);
      const shoulder = rootBone.getWorldPosition(new THREE.Vector3());
      const elbow = middle.getWorldPosition(new THREE.Vector3());
      const wrist = end.getWorldPosition(new THREE.Vector3());
      const target = at(pose[limb.target] as Point).setZ(wrist.z);
      // The 2D elbow or knee says which side the limb bows to; depth makes the bend read as a real joint.
      const hint = at(pose[limb.joint] as Point).sub(shoulder.clone().add(target).multiplyScalar(0.5)).setZ(0);
      if (hint.lengthSq() > 1e-6) hint.normalize();
      const leg = limb.end.startsWith("foot");
      const pole = hint.multiplyScalar(leg ? 0.35 : 0.6).add(new THREE.Vector3(0, leg ? 0 : -0.3, leg ? 1 : -1));
      const reach = reachLimb(shoulder, target, shoulder.distanceTo(elbow), elbow.distanceTo(wrist), pole);
      aim(rootBone, middle, new THREE.Vector3(reach.joint.x, reach.joint.y, reach.joint.z).sub(shoulder));
      aim(middle, end, new THREE.Vector3(reach.end.x, reach.end.y, reach.end.z).sub(middle.getWorldPosition(position)));
    }
    // Feet stay level with the body's ground instead of tilting with the shins.
    level.setFromAxisAngle(zAxis, -frame.angle);
    for (const [foot, restWorld] of footRest) {
      foot.parent!.getWorldQuaternion(parentWorld);
      foot.quaternion.copy(parentWorld.invert().multiply(world.copy(level).multiply(restWorld)));
      foot.updateMatrixWorld(true);
    }
  };
  return { place };
}

// A rigged body, or (hand) a rigged WebXR-style hand that the same 2D pose drives finger by finger.
export type ModelSource = { url: string; hand?: boolean };

const fingers: Record<Finger, readonly string[]> = {
  thumb: ["thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip"],
  index: ["index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip"],
  middle: ["middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip"],
  ring: ["ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip"],
  pinky: ["pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip"],
};
const fingerNames = Object.keys(fingers) as Finger[];
// A finger folded into the fist: its three joints and its knuckle flexed this far; the thumb tucks across.
const fistCurl = 1.32;
const fistFlex = 1.45;
const thumbTuck = 0.9;
// Opening and closing fingers, and the hand moving between placements, ease at these rates per second.
const fingerRate = 7;
const handRate = 12;

// A rigged hand, back to the viewer, whose rest pose is the middle-finger gesture. Each held touch is a finger:
// two touches are the wrist and the middle fingertip, so the whole gesture moves, turns, and stretches between
// them; every further touch opens one more finger toward itself, and five open the whole hand with its wrist
// below them (model/hand.ts). Fingers that no touch claims fold back into the fist.
function createHandPoser(root: THREE.Object3D, model: THREE.Object3D): Poser | null {
  const named = new Map<string, THREE.Bone>();
  model.traverse((node) => {
    if (node instanceof THREE.Bone) named.set(node.name, node);
  });
  const found = Object.fromEntries(fingerNames.map((finger) => [finger, fingers[finger].map((name) => named.get(name))]));
  const wrist = named.get("wrist");
  if (!wrist || Object.values(found).some((links) => links.some((node) => !node))) return null;
  const chains = found as Record<Finger, THREE.Bone[]>;

  const pivot = new THREE.Group();
  pivot.add(model);
  root.add(pivot);
  root.updateMatrixWorld(true);
  const at = (node: THREE.Bone) => node.getWorldPosition(new THREE.Vector3());
  // Rest axes: along the hand from the wrist to the middle tip, and the palm's normal, which the fingers curl toward.
  const along = at(chains.middle[3]!).sub(at(wrist)).normalize();
  const across = at(chains.index[0]!).sub(at(chains.pinky[0]!)).normalize();
  // The thumb rests in front of the palm, which tells the palm's side.
  const palm = new THREE.Vector3().crossVectors(along, across).normalize();
  if (palm.dot(at(chains.thumb[3]!).sub(at(wrist))) < 0) palm.negate();
  const back = palm.clone().negate();
  // Kept in the wrist's frame, so it follows the hand however the pivot and the body frame turn it.
  const palmInWrist = palm.clone().applyQuaternion(wrist.getWorldQuaternion(new THREE.Quaternion()).invert());
  // Pivot: the hand's length along +y, its back toward the viewer (+z), the wrist at the origin.
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(along, back), along, back);
  pivot.quaternion.setFromRotationMatrix(basis).invert();
  pivot.updateMatrixWorld(true);
  pivot.position.copy(at(wrist).negate());
  pivot.updateMatrixWorld(true);
  const handLength = at(chains.middle[3]!).distanceTo(at(wrist));
  // The WebXR hand's joints are siblings, each placed directly; finger chains are kinematic only in this code.
  const rest = new Map([...named.values()].map((node) => [node, [node.position.clone(), node.quaternion.clone()] as const]));

  const world = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const turn = new THREE.Quaternion();
  const pivotPoint = new THREE.Vector3();
  const offset = new THREE.Vector3();
  // Turns the joints from `from` to the fingertip about the joint at `from`, in world space.
  const rotateChain = (links: THREE.Bone[], from: number, direction: THREE.Vector3, angle: number) => {
    if (angle === 0) return;
    turn.setFromAxisAngle(direction, angle);
    links[from]!.getWorldPosition(pivotPoint);
    for (let index = from; index < links.length; index += 1) {
      const node = links[index]!;
      const parent = node.parent!;
      node.getWorldPosition(offset).sub(pivotPoint).applyQuaternion(turn).add(pivotPoint);
      node.position.copy(parent.worldToLocal(offset));
      node.getWorldQuaternion(world).premultiply(turn);
      parent.getWorldQuaternion(parentWorld);
      node.quaternion.copy(parentWorld.invert().multiply(world));
      node.updateMatrixWorld(true);
    }
  };
  const palmNow = () => palmInWrist.clone().applyQuaternion(wrist.getWorldQuaternion(world));
  const handAxis = () => at(chains.middle[0]!).sub(at(wrist)).normalize();
  const flexAxisOf = (links: THREE.Bone[]) => at(links[1]!).sub(at(links[0]!)).cross(palmNow()).normalize();
  const resetChain = (links: THREE.Bone[]) => {
    for (const node of links) {
      const [position, quaternion] = rest.get(node)!;
      node.position.copy(position);
      node.quaternion.copy(quaternion);
      node.updateMatrixWorld(true);
    }
  };
  // Curls a finger's three joints evenly toward the palm.
  const curl = (links: THREE.Bone[], amount: number) => {
    for (let index = 0; index < 3; index += 1) {
      const direction = at(links[index + 1]!).sub(at(links[index]!));
      rotateChain(links, index, direction.cross(palmNow()).normalize(), amount);
    }
  };
  // The angle turning `from` toward `to` about `around`, both seen in the plane normal to it.
  const signedAngle = (from: THREE.Vector3, to: THREE.Vector3, around: THREE.Vector3) => {
    const a = from.clone().projectOnPlane(around);
    const b = to.clone().projectOnPlane(around);
    if (a.lengthSq() < 1e-12 || b.lengthSq() < 1e-12) return 0;
    return Math.atan2(around.dot(a.clone().cross(b)), a.dot(b));
  };
  // An open finger is straight and points toward its touch, turning at the knuckle within a hand's range.
  const aimAt = (finger: Finger, target: THREE.Vector3) => {
    const links = chains[finger];
    resetChain(links);
    const base = at(links[0]!);
    const flexAxis = flexAxisOf(links);
    const flex = Math.max(-0.25, Math.min(0.6, signedAngle(at(links[3]!).sub(base), target.clone().sub(base), flexAxis)));
    rotateChain(links, 0, flexAxis, flex);
    const limit = finger === "thumb" ? 1.1 : 0.75;
    const spread = Math.max(-limit, Math.min(limit, signedAngle(at(links[3]!).sub(base), target.clone().sub(base), palmNow())));
    return { amount: 0, flex, spread };
  };

  // Eased state: each finger's openness and last target, and the hand's placement.
  const openness = Object.fromEntries(fingerNames.map((finger) => [finger, finger === "middle" ? 1 : 0])) as Record<Finger, number>;
  const targets: Partial<Record<Finger, THREE.Vector3>> = {};
  let placed: { x: number; y: number; angle: number; scale: number } | null = null;
  let lastTime = 0;
  // Roles stay with touch identifiers while the same touches are held, so the hand can turn all the way around;
  // a changed set of touches is reread upright on the screen (the lowest touch is the wrist). Lifted touches
  // leave the last hand.
  let roles: { wrist: number | null; tips: Partial<Record<Finger, number>> } | null = null;
  let roleKey = "";
  let positions = new Map<number, Point>();
  const screenUp = { x: 0, y: -1 };

  return {
    place: (frame, pose, contacts, time) => {
      const seconds = lastTime ? Math.min(0.1, Math.max(0, (time - lastTime) / 1000)) : 0;
      lastTime = time;
      if (contacts.size >= 2) {
        positions = new Map(contacts);
        const key = [...contacts.keys()].sort((a, b) => a - b).join(",");
        if (key !== roleKey || !roles) {
          roleKey = key;
          const hand = assignFingers([...contacts].map(([id, point]) => ({ ...point, id })), screenUp)!;
          roles = {
            wrist: hand.wrist?.id ?? null,
            tips: Object.fromEntries(Object.entries(hand.tips).map(([finger, point]) => [finger, point!.id])),
          };
        }
      } else if (!roles) {
        // Before any two touches, the body frame's head and feet stand in for the gesture.
        positions = new Map([
          [-1, toWorld(frame, pose.head)],
          [-2, toWorld(frame, { x: (pose.leftFoot.x + pose.rightFoot.x) / 2, y: (pose.leftFoot.y + pose.rightFoot.y) / 2 })],
        ]);
        roles = { wrist: -2, tips: { middle: -1 } };
      }
      const tips = Object.fromEntries(Object.entries(roles.tips).map(([finger, id]) => [finger, positions.get(id!)!])) as Partial<Record<Finger, Point>>;
      const wristPoint = roles.wrist !== null ? positions.get(roles.wrist)! : inferWrist(Object.values(tips) as Point[], screenUp);
      const tip = tips.middle ?? { x: wristPoint.x, y: wristPoint.y - 1 };
      const span = Math.max(20, Math.hypot(tip.x - wristPoint.x, tip.y - wristPoint.y));
      const goal = { x: wristPoint.x, y: wristPoint.y, angle: Math.atan2(tip.x - wristPoint.x, wristPoint.y - tip.y), scale: span / handLength };
      if (!placed || seconds === 0) placed = { ...goal };
      else {
        const follow = 1 - Math.exp(-seconds * handRate);
        placed.x += (goal.x - placed.x) * follow;
        placed.y += (goal.y - placed.y) * follow;
        placed.angle += Math.atan2(Math.sin(goal.angle - placed.angle), Math.cos(goal.angle - placed.angle)) * follow;
        placed.scale += (goal.scale - placed.scale) * follow;
      }

      for (const [node, [position, quaternion]] of rest) {
        node.position.copy(position);
        node.quaternion.copy(quaternion);
      }
      root.position.set(placed.x, -placed.y, 0);
      root.rotation.set(0, 0, -placed.angle);
      root.scale.setScalar(placed.scale);
      root.updateMatrixWorld(true);

      const ease = 1 - Math.exp(-seconds * fingerRate);
      for (const finger of fingerNames) {
        const tipPoint = tips[finger];
        if (tipPoint) targets[finger] = new THREE.Vector3(tipPoint.x, -tipPoint.y, 0);
        const wanted = finger === "middle" || tipPoint ? 1 : 0;
        openness[finger] = seconds === 0 ? wanted : openness[finger] + (wanted - openness[finger]) * ease;
        const open = openness[finger];
        const links = chains[finger];
        const shape = open > 0.001 && targets[finger] ? aimAt(finger, targets[finger]!) : { amount: 0, flex: 0, spread: 0 };
        // Blend between the fist and the aimed finger: spread, then the knuckle, then the three joints.
        resetChain(links);
        if (finger === "thumb") rotateChain(links, 0, handAxis(), -thumbTuck * (1 - open));
        rotateChain(links, 0, palmNow(), shape.spread * open);
        rotateChain(links, 0, flexAxisOf(links), shape.flex * open + (finger === "thumb" ? 0 : fistFlex) * (1 - open));
        curl(links, shape.amount * open + (finger === "thumb" ? 0.7 : 1) * fistCurl * (1 - open));
      }
    },
  };
}

export type ModelFigure = {
  draw: (frame: Frame, pose: Pose, opacity: number, contacts: ReadonlyMap<number, Point>, time: number) => void;
  hide: () => void;
  resize: (width: number, height: number, ratio: number) => void;
  dispose: () => void;
};

// A rigged, realistic body on its own transparent WebGL canvas over the 2D field. It renders only when drawn.
export function createModelFigure(canvas: HTMLCanvasElement, source: ModelSource, onReady: () => void, onError: () => void): ModelFigure {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  // Screen pixels with y up: a screen point (x, y) sits at (x, -y).
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  camera.position.z = 2000;
  const scene = new THREE.Scene();
  // The texture is photographs with their light already in them; the scene light only adds form, half-strength.
  scene.add(new THREE.HemisphereLight(0xf2efe8, 0x6a6764, 0.7));
  const key = new THREE.DirectionalLight(0xfff6ea, 1.1);
  key.position.set(-0.6, 0.9, 1);
  const rim = new THREE.DirectionalLight(0xdfe6ff, 1.2);
  rim.position.set(0.8, 0.4, -1);
  scene.add(key, rim);
  const root = new THREE.Group();
  scene.add(root);
  let poser: Poser | null = null;
  let disposed = false;
  let visible = false;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(source.url, (gltf) => {
    if (disposed) return;
    gltf.scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.frustumCulled = false;
      if (source.hand) {
        // The hand has no texture; it takes the 2D body's pale sculptural tone.
        node.material = new THREE.MeshStandardMaterial({ color: 0xd8d3ca, roughness: 0.55, metalness: 0 });
        return;
      }
      if (node.material instanceof THREE.MeshStandardMaterial && node.material.map) {
        const skin = node.material;
        skin.emissive.set(0xffffff);
        skin.emissiveMap = skin.map;
        skin.emissiveIntensity = 0.55;
        skin.roughness = 0.9;
        skin.metalness = 0;
      }
    });
    poser = source.hand ? createHandPoser(root, gltf.scene) : createPoser(root, gltf.scene);
    if (!poser) {
      onError();
      return;
    }
    onReady();
  }, undefined, () => {
    if (!disposed) onError();
  });

  const draw = (frame: Frame, pose: Pose, opacity: number, contacts: ReadonlyMap<number, Point>, time: number) => {
    if (!poser) return;
    poser.place(frame, pose, contacts, time);
    const alpha = opacity.toFixed(3);
    if (canvas.style.opacity !== alpha) canvas.style.opacity = alpha;
    visible = true;
    renderer.render(scene, camera);
  };

  return {
    draw,
    hide: () => {
      if (!visible) return;
      visible = false;
      renderer.clear();
    },
    resize: (width, height, ratio) => {
      camera.right = width;
      camera.bottom = -height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
    },
    dispose: () => {
      disposed = true;
      root.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry.dispose();
        for (const material of [node.material].flat() as THREE.MeshStandardMaterial[]) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      });
      renderer.dispose();
    },
  };
}
