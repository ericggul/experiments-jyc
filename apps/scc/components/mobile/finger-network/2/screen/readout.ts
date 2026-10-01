import { toWorld, type Anchor, type Frame, type Point, type Pose } from "../model/rig";
import { breathAt, eyesOpenAt } from "./renderer";

const degrees = (radians: number) => (radians * 180) / Math.PI;
const wrap = (radians: number) => Math.atan2(Math.sin(radians), Math.cos(radians));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const whole = (value: number, width: number) => Math.round(value).toString().padStart(width);
const signed = (value: number, digits: number, width: number) => `${value < 0 ? "-" : "+"}${Math.abs(value).toFixed(digits)}`.padStart(width);

function bend(a: Point, joint: Point, b: Point) {
  return degrees(Math.abs(wrap(Math.atan2(a.y - joint.y, a.x - joint.x) - Math.atan2(b.y - joint.y, b.x - joint.x))));
}

export function describeBody(frame: Frame, pose: Pose, held: readonly Anchor[], time: number, opacity: number) {
  const center = toWorld(frame, pose.pelvis);
  const lean = wrap(Math.atan2(pose.neck.x - pose.pelvis.x, pose.pelvis.y - pose.neck.y) + frame.angle);
  const feet = { x: (pose.leftFoot.x + pose.rightFoot.x) / 2, y: (pose.leftFoot.y + pose.rightFoot.y) / 2 };
  const holds = (["head", "leftHand", "rightHand", "leftFoot", "rightFoot"] as const)
    .map((role) => (held.includes(role) || (role.endsWith("Foot") && held.includes("feet")) ? "1" : "0"))
    .join("");
  return [
    `n=${held.length} dof=${held.length * 2} hold=${holds} x=${whole(center.x, 4)} y=${whole(center.y, 4)}`,
    `rot=${signed(degrees(lean), 1, 6)}° s=${(frame.scale * pose.scale).toFixed(2)} h=${whole(distance(pose.head, feet) * frame.scale, 4)} span=${whole(distance(pose.leftHand, pose.rightHand) * frame.scale, 4)} stance=${whole(distance(pose.leftFoot, pose.rightFoot) * frame.scale, 4)}`,
    `elb=${whole(bend(pose.leftShoulder, pose.leftElbow, pose.leftHand), 3)}/${whole(bend(pose.rightShoulder, pose.rightElbow, pose.rightHand), 3)} knee=${whole(bend(pose.leftHip, pose.leftKnee, pose.leftFoot), 3)}/${whole(bend(pose.rightHip, pose.rightKnee, pose.rightFoot), 3)} breath=${signed(breathAt(time), 2, 5)} eye=${eyesOpenAt(time) ? 1 : 0} a=${opacity.toFixed(2)}`,
  ].join("\n");
}
