export type Vector = { x: number; y: number; z: number };
export type Reach = { joint: Vector; end: Vector };

const add = (a: Vector, b: Vector, scale = 1): Vector => ({ x: a.x + b.x * scale, y: a.y + b.y * scale, z: a.z + b.z * scale });
const dot = (a: Vector, b: Vector) => a.x * b.x + a.y * b.y + a.z * b.z;
const length = (a: Vector) => Math.sqrt(dot(a, a));

// A rigid two-segment limb reaching from root toward target in 3D: the end stops short when the target is out of
// reach, and the middle joint bends toward the pole direction (projected off the root-to-target line).
export function reachLimb(root: Vector, target: Vector, upper: number, lower: number, pole: Vector): Reach {
  const toward = { x: target.x - root.x, y: target.y - root.y, z: target.z - root.z };
  const span = length(toward);
  const axis = span > 1e-6 ? { x: toward.x / span, y: toward.y / span, z: toward.z / span } : { x: 0, y: -1, z: 0 };
  const distance = Math.max(Math.abs(upper - lower) + 1e-3, Math.min(upper + lower - 1e-3, span));
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const across = Math.sqrt(Math.max(0, upper * upper - along * along));
  let side = add(pole, axis, -dot(pole, axis));
  if (length(side) < 1e-6) side = Math.abs(axis.z) < 0.9 ? { x: -axis.y, y: axis.x, z: 0 } : { x: 1, y: 0, z: 0 };
  const sideLength = length(side);
  return {
    joint: add(add(root, axis, along), side, across / sideLength),
    end: add(root, axis, distance),
  };
}
