export type Point = { x: number; y: number };
export type Role = "head" | "leftHand" | "rightHand" | "leftFoot" | "rightFoot";
export type RoleIds = Record<Role, number>;
export type Endpoints = Record<Role, Point>;

export type Pose = Endpoints & {
  neck: Point;
  leftShoulder: Point;
  rightShoulder: Point;
  leftElbow: Point;
  rightElbow: Point;
  leftHip: Point;
  rightHip: Point;
  leftKnee: Point;
  rightKnee: Point;
  chest: Point;
  pelvis: Point;
  scale: number;
};

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

export function assignRoles(contacts: ReadonlyMap<number, Point>): RoleIds | null {
  if (contacts.size !== 5) return null;
  const ranked = [...contacts.entries()].sort((a, b) => a[1].y - b[1].y || a[1].x - b[1].x);
  const head = ranked[0]!;
  const arms = ranked.slice(1, 3).sort((a, b) => a[1].x - b[1].x);
  const legs = ranked.slice(3, 5).sort((a, b) => a[1].x - b[1].x);
  return {
    head: head[0],
    leftHand: arms[0]![0],
    rightHand: arms[1]![0],
    leftFoot: legs[0]![0],
    rightFoot: legs[1]![0],
  };
}

export function endpointsFor(contacts: ReadonlyMap<number, Point>, ids: RoleIds): Endpoints | null {
  const head = contacts.get(ids.head);
  const leftHand = contacts.get(ids.leftHand);
  const rightHand = contacts.get(ids.rightHand);
  const leftFoot = contacts.get(ids.leftFoot);
  const rightFoot = contacts.get(ids.rightFoot);
  if (!head || !leftHand || !rightHand || !leftFoot || !rightFoot) return null;
  return { head, leftHand, rightHand, leftFoot, rightFoot };
}

export function buildPose(endpoints: Endpoints): Pose {
  const { head, leftHand, rightHand, leftFoot, rightFoot } = endpoints;
  const handMid = midpoint(leftHand, rightHand);
  const footMid = midpoint(leftFoot, rightFoot);
  const height = clamp(footMid.y - head.y, 170, 700);
  const scale = clamp(height / 470, 0.62, 1.4);
  const axisX = head.x * 0.48 + handMid.x * 0.2 + footMid.x * 0.32;
  const shoulderX = mix(head.x, axisX, 0.42);
  const hipX = mix(axisX, footMid.x, 0.3);
  const shoulderY = head.y + height * 0.28;
  const hipY = Math.min(head.y + height * 0.62, Math.max(shoulderY + 46 * scale, footMid.y - 45 * scale));
  const shoulderHalf = clamp((rightHand.x - leftHand.x) * 0.11, 24 * scale, 53 * scale);
  const hipHalf = shoulderHalf * 0.54;
  const leftShoulder = { x: shoulderX - shoulderHalf, y: shoulderY };
  const rightShoulder = { x: shoulderX + shoulderHalf, y: shoulderY };
  const leftHip = { x: hipX - hipHalf, y: hipY };
  const rightHip = { x: hipX + hipHalf, y: hipY };

  return {
    ...endpoints,
    neck: { x: mix(head.x, shoulderX, 0.4), y: head.y + 38 * scale },
    leftShoulder,
    rightShoulder,
    leftElbow: { x: mix(leftShoulder.x, leftHand.x, 0.56) - 9 * scale, y: mix(leftShoulder.y, leftHand.y, 0.54) + 6 * scale },
    rightElbow: { x: mix(rightShoulder.x, rightHand.x, 0.56) + 9 * scale, y: mix(rightShoulder.y, rightHand.y, 0.54) + 6 * scale },
    leftHip,
    rightHip,
    leftKnee: { x: mix(leftHip.x, leftFoot.x, 0.53) - 7 * scale, y: mix(leftHip.y, leftFoot.y, 0.54) },
    rightKnee: { x: mix(rightHip.x, rightFoot.x, 0.53) + 7 * scale, y: mix(rightHip.y, rightFoot.y, 0.54) },
    chest: { x: shoulderX, y: shoulderY + height * 0.13 },
    pelvis: { x: hipX, y: hipY },
    scale,
  };
}
