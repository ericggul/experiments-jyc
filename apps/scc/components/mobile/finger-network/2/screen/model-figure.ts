import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
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

export type Poser = { place: (frame: Frame, pose: Pose) => void; bone: (name: BoneName) => THREE.Bone };

// Poses a loaded rig in screen pixels (y up) so its body follows the 2D pose; null if any expected bone is missing.
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
  const head = bone("head").getWorldPosition(new THREE.Vector3());
  const ankles = bone("foot_L").getWorldPosition(new THREE.Vector3()).add(bone("foot_R").getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
  const restHeight = Math.max(1e-6, head.y - ankles.y);
  const restHips = bone("hips").getWorldPosition(new THREE.Vector3());

  const position = new THREE.Vector3();
  const childPosition = new THREE.Vector3();
  const current = new THREE.Vector3();
  const wanted = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const world = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const screenOf = (node: THREE.Bone): Point => {
    node.getWorldPosition(position);
    return { x: position.x, y: -position.y };
  };

  // Turns a bone in world space so the direction to its child points at a screen target, keeping its twist from rest.
  const aim = (node: THREE.Bone, child: THREE.Bone, target: Point) => {
    node.getWorldPosition(position);
    child.getWorldPosition(childPosition);
    current.subVectors(childPosition, position).setZ(0);
    wanted.set(target.x - position.x, -target.y - position.y, 0);
    if (current.lengthSq() < 1e-10 || wanted.lengthSq() < 1e-10) return;
    turn.setFromUnitVectors(current.normalize(), wanted.normalize());
    node.getWorldQuaternion(world).premultiply(turn);
    node.parent!.getWorldQuaternion(parentWorld);
    node.quaternion.copy(parentWorld.invert().multiply(world));
    node.updateMatrixWorld(true);
  };

  const place = (frame: Frame, pose: Pose) => {
    const at = (point: Point) => toWorld(frame, point);
    for (const [node, quaternion] of rest) node.quaternion.copy(quaternion);
    const scale = (frame.scale * restBodyHeight) / restHeight;
    root.scale.setScalar(scale);
    const pelvis = at(pose.pelvis);
    root.position.set(pelvis.x - restHips.x * scale, -pelvis.y - restHips.y * scale, 0);
    root.updateMatrixWorld(true);

    // The torso leans from the pelvis to the neck, the head from the neck to the head; then the limbs reach.
    aim(bone("hips"), bone("neck"), at(pose.neck));
    aim(bone("neck"), bone("head"), at(pose.head));
    for (const limb of limbs) {
      const shoulder = screenOf(bone(limb.root));
      const elbow = screenOf(bone(limb.middle));
      const wrist = screenOf(bone(limb.end));
      const upper = Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y);
      const lower = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);
      const reach = reachLimb(shoulder, at(pose[limb.target] as Point), upper, lower, at(pose[limb.joint] as Point));
      aim(bone(limb.root), bone(limb.middle), reach.joint);
      aim(bone(limb.middle), bone(limb.end), reach.end);
    }
  };
  return { place, bone };
}

export type ModelFigure = {
  draw: (frame: Frame, pose: Pose, opacity: number) => void;
  hide: () => void;
  resize: (width: number, height: number, ratio: number) => void;
  dispose: () => void;
};

// A rigged, realistic body on its own transparent WebGL canvas over the 2D field. It renders only when drawn.
export function createModelFigure(canvas: HTMLCanvasElement, url: string, onReady: () => void, onError: () => void): ModelFigure {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  // Screen pixels with y up: a screen point (x, y) sits at (x, -y).
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  camera.position.z = 2000;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf2efe8, 0x26252a, 1.1));
  const key = new THREE.DirectionalLight(0xfff6ea, 2.4);
  key.position.set(-0.6, 0.9, 1);
  const rim = new THREE.DirectionalLight(0xdfe6ff, 1.6);
  rim.position.set(0.8, 0.4, -1);
  scene.add(key, rim);
  const root = new THREE.Group();
  scene.add(root);
  let poser: Poser | null = null;
  let disposed = false;
  let visible = false;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(url, (gltf) => {
    if (disposed) return;
    gltf.scene.traverse((node) => {
      if (node instanceof THREE.Mesh) node.frustumCulled = false;
    });
    poser = createPoser(root, gltf.scene);
    if (!poser) {
      onError();
      return;
    }
    onReady();
  }, undefined, () => {
    if (!disposed) onError();
  });

  const draw = (frame: Frame, pose: Pose, opacity: number) => {
    if (!poser) return;
    poser.place(frame, pose);
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
