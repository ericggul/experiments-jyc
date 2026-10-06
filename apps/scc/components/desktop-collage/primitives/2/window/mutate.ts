import type * as THREE from "three";
import { center } from "../model/field";
import type { Peers } from "./peers";

/** Eased positions, shared by the camera and every object in this window. */
export type Eased = { offset: { x: number; y: number } | null; centres: Map<number, { x: number; y: number }>; time: number };

// three.js objects are mutable scene state updated every frame, outside React's
// render; these helpers are the only places that write to them.
export function show(objects: THREE.Object3D[], visible: boolean) {
  for (const object of objects) object.visible = visible;
}
export function setUniforms(material: THREE.ShaderMaterial, values: Record<string, number>) {
  for (const [name, value] of Object.entries(values)) material.uniforms[name].value = value;
}
export function setOpacity(material: THREE.Material, opacity: number) {
  material.opacity = opacity;
}
export function place(object: THREE.Object3D, x: number, y: number, rotationX = 0, rotationY = 0) {
  object.position.set(x, -y, 0);
  object.rotation.set(rotationX, rotationY, 0);
}

function ease(current: { x: number; y: number } | undefined, x: number, y: number, follow: number) {
  if (!current) return { x, y };
  current.x += (x - current.x) * follow;
  current.y += (y - current.y) * follow;
  return current;
}

/**
 * Advances the eased camera offset and every window's eased centre by one
 * frame (`follow` already corrected for the frame's duration), in place.
 */
export function stepEased(eased: Eased, peers: Peers, selfId: number, follow: number, time: number | null) {
  const me = peers.get(selfId);
  if (me) eased.offset = ease(eased.offset ?? undefined, me.content.x, me.content.y, follow);
  for (const id of peers.getIds()) {
    const peer = peers.get(id);
    if (!peer) continue;
    const c = center(peer.content);
    eased.centres.set(id, ease(eased.centres.get(id), c.x, c.y, follow));
  }
  for (const id of eased.centres.keys()) if (!peers.get(id)) eased.centres.delete(id);
  if (time !== null) eased.time = time;
}
