import type { Point, Pose } from "../model/rig";

const TAU = Math.PI * 2;

export const breathAt = (time: number) => Math.sin(time * 0.0023);
export const eyesOpenAt = (time: number) => {
  const blinkPhase = time % 3900;
  return blinkPhase <= 3150 || blinkPhase >= 3320;
};

function oval(context: CanvasRenderingContext2D, point: Point, rx: number, ry: number, rotation = 0) {
  context.beginPath();
  context.ellipse(point.x, point.y, rx, ry, rotation, 0, TAU);
}

// Glow only reads at the silhouette; interior details skip the costly shadow blur.
function interior(context: CanvasRenderingContext2D, draw: () => void) {
  const blur = context.shadowBlur;
  context.shadowBlur = 0;
  draw();
  context.shadowBlur = blur;
}

function fleshGradient(context: CanvasRenderingContext2D, x: number, width: number) {
  const gradient = context.createLinearGradient(x - width, 0, x + width, 0);
  gradient.addColorStop(0, "#343233");
  gradient.addColorStop(0.19, "#8e8b86");
  gradient.addColorStop(0.43, "#e3dfd7");
  gradient.addColorStop(0.68, "#b9b5ae");
  gradient.addColorStop(1, "#29292b");
  return gradient;
}

function skinDetail(context: CanvasRenderingContext2D, texture: CanvasPattern | null, x: number, y: number, width: number, height: number) {
  if (!texture) return;
  context.save();
  context.clip();
  context.shadowBlur = 0;
  context.globalAlpha *= 0.12;
  context.fillStyle = texture;
  context.fillRect(x, y, width, height);
  context.restore();
}

function limb(context: CanvasRenderingContext2D, a: Point, b: Point, startWidth: number, endWidth: number, texture: CanvasPattern | null) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / length;
  const ny = dx / length;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const leftA = { x: a.x + nx * startWidth / 2, y: a.y + ny * startWidth / 2 };
  const leftB = { x: b.x + nx * endWidth / 2, y: b.y + ny * endWidth / 2 };
  const rightB = { x: b.x - nx * endWidth / 2, y: b.y - ny * endWidth / 2 };
  const rightA = { x: a.x - nx * startWidth / 2, y: a.y - ny * startWidth / 2 };
  const radius = Math.max(startWidth, endWidth) * 0.68;
  const gradient = context.createLinearGradient(mx - nx * radius, my - ny * radius, mx + nx * radius, my + ny * radius);
  gradient.addColorStop(0, "#363538");
  gradient.addColorStop(0.22, "#aba8a2");
  gradient.addColorStop(0.52, "#e7e2d9");
  gradient.addColorStop(0.78, "#8b8884");
  gradient.addColorStop(1, "#28282a");

  context.beginPath();
  context.moveTo(leftA.x, leftA.y);
  context.quadraticCurveTo(mx + nx * (startWidth + endWidth) * 0.28, my + ny * (startWidth + endWidth) * 0.28, leftB.x, leftB.y);
  context.quadraticCurveTo(b.x + dx / length * endWidth * 0.22, b.y + dy / length * endWidth * 0.22, rightB.x, rightB.y);
  context.quadraticCurveTo(mx - nx * (startWidth + endWidth) * 0.28, my - ny * (startWidth + endWidth) * 0.28, rightA.x, rightA.y);
  context.closePath();
  context.fillStyle = gradient;
  context.fill();
  skinDetail(context, texture, Math.min(a.x, b.x) - radius, Math.min(a.y, b.y) - radius, Math.abs(dx) + radius * 2, Math.abs(dy) + radius * 2);

  interior(context, () => {
    context.beginPath();
    context.moveTo(a.x - nx * startWidth * 0.17, a.y - ny * startWidth * 0.17);
    context.quadraticCurveTo(mx - nx * (startWidth + endWidth) * 0.12, my - ny * (startWidth + endWidth) * 0.12, b.x - nx * endWidth * 0.15, b.y - ny * endWidth * 0.15);
    context.strokeStyle = "rgba(255, 255, 250, 0.3)";
    context.lineWidth = Math.max(1, Math.min(startWidth, endWidth) * 0.075);
    context.stroke();
  });
}

function joint(context: CanvasRenderingContext2D, point: Point, radius: number) {
  const gradient = context.createRadialGradient(point.x - radius * 0.32, point.y - radius * 0.34, radius * 0.1, point.x, point.y, radius);
  gradient.addColorStop(0, "#f1eee7");
  gradient.addColorStop(0.56, "#b3afa9");
  gradient.addColorStop(1, "#4a4949");
  oval(context, point, radius, radius * 0.94);
  context.fillStyle = gradient;
  context.fill();
}

function torso(context: CanvasRenderingContext2D, pose: Pose, time: number, texture: CanvasPattern | null) {
  const s = pose.scale;
  const breath = breathAt(time) * 2.1 * s;
  const { leftShoulder: ls, rightShoulder: rs, leftHip: lh, rightHip: rh, chest, pelvis } = pose;
  const gradient = fleshGradient(context, chest.x, (rs.x - ls.x) * 0.8);
  context.beginPath();
  context.moveTo(ls.x - 8 * s, ls.y - 7 * s);
  context.bezierCurveTo(ls.x - 21 * s - breath, ls.y + 18 * s, chest.x - 26 * s, chest.y + 15 * s, lh.x - 9 * s, lh.y - 10 * s);
  context.quadraticCurveTo(pelvis.x, pelvis.y + 16 * s, rh.x + 9 * s, rh.y - 10 * s);
  context.bezierCurveTo(chest.x + 26 * s, chest.y + 15 * s, rs.x + 21 * s + breath, rs.y + 18 * s, rs.x + 8 * s, rs.y - 7 * s);
  context.quadraticCurveTo(chest.x, ls.y - 18 * s - breath, ls.x - 8 * s, ls.y - 7 * s);
  context.closePath();
  context.fillStyle = gradient;
  context.fill();
  skinDetail(context, texture, Math.min(ls.x, lh.x) - 26 * s, ls.y - 30 * s, Math.max(rs.x, rh.x) - Math.min(ls.x, lh.x) + 52 * s, pelvis.y - ls.y + 56 * s);

  const blur = context.shadowBlur;
  context.shadowBlur = 0;
  context.globalAlpha *= 0.34;
  const pectoral = context.createRadialGradient(chest.x, chest.y - 13 * s, 2 * s, chest.x, chest.y, 42 * s);
  pectoral.addColorStop(0, "#fffdf5");
  pectoral.addColorStop(1, "#8b8884");
  oval(context, { x: chest.x - 17 * s, y: chest.y - 16 * s }, 25 * s + breath, 17 * s);
  context.fillStyle = pectoral;
  context.fill();
  oval(context, { x: chest.x + 17 * s, y: chest.y - 16 * s }, 25 * s + breath, 17 * s);
  context.fill();
  context.globalAlpha /= 0.34;

  context.beginPath();
  context.moveTo(chest.x, chest.y + 4 * s);
  context.quadraticCurveTo(chest.x - 2 * s, pelvis.y - 24 * s, pelvis.x, pelvis.y - 6 * s);
  context.strokeStyle = "rgba(40, 39, 40, 0.28)";
  context.lineWidth = 1.7 * s;
  context.stroke();
  for (let row = 0; row < 2; row += 1) {
    const y = chest.y + (25 + row * 21) * s;
    context.beginPath();
    context.moveTo(chest.x - 19 * s, y);
    context.quadraticCurveTo(chest.x, y + 5 * s, chest.x + 19 * s, y);
    context.strokeStyle = "rgba(54, 52, 53, 0.14)";
    context.stroke();
  }
  context.shadowBlur = blur;
}

function face(context: CanvasRenderingContext2D, pose: Pose, time: number, texture: CanvasPattern | null) {
  const s = pose.scale;
  const { head } = pose;
  const rx = 30 * s;
  const ry = 39 * s;
  joint(context, { x: head.x - rx * 0.96, y: head.y + 3 * s }, 7 * s);
  joint(context, { x: head.x + rx * 0.96, y: head.y + 3 * s }, 7 * s);

  const skin = context.createRadialGradient(head.x - 9 * s, head.y - 12 * s, 3 * s, head.x + 3 * s, head.y + 3 * s, 46 * s);
  skin.addColorStop(0, "#f7f3e9");
  skin.addColorStop(0.48, "#d4d0c8");
  skin.addColorStop(0.83, "#898783");
  skin.addColorStop(1, "#343537");
  oval(context, head, rx, ry);
  context.fillStyle = skin;
  context.fill();
  skinDetail(context, texture, head.x - rx, head.y - ry, rx * 2, ry * 2);

  context.beginPath();
  context.ellipse(head.x, head.y - 16 * s, rx + 2 * s, 25 * s, 0, Math.PI, TAU);
  context.bezierCurveTo(head.x + 20 * s, head.y - 12 * s, head.x + 9 * s, head.y - 21 * s, head.x + 3 * s, head.y - 17 * s);
  context.bezierCurveTo(head.x - 8 * s, head.y - 8 * s, head.x - 15 * s, head.y - 14 * s, head.x - rx, head.y - 10 * s);
  context.closePath();
  context.fillStyle = "#26272a";
  context.fill();
  context.strokeStyle = "rgba(250, 248, 241, 0.27)";
  context.lineWidth = 1.2 * s;
  context.stroke();

  const blur = context.shadowBlur;
  context.shadowBlur = 0;
  const eyeHeight = (eyesOpenAt(time) ? 3.4 : 0.7) * s;
  for (const side of [-1, 1]) {
    const ex = head.x + side * 11.2 * s;
    context.beginPath();
    context.moveTo(ex - 6 * s, head.y - 4 * s);
    context.quadraticCurveTo(ex, head.y - 7 * s - eyeHeight, ex + 6 * s, head.y - 4 * s);
    context.quadraticCurveTo(ex, head.y - 4 * s + eyeHeight, ex - 6 * s, head.y - 4 * s);
    context.fillStyle = "#dedbd5";
    context.fill();
    if (eyeHeight > 1 * s) {
      oval(context, { x: ex, y: head.y - 4 * s }, 2.6 * s, 3 * s);
      context.fillStyle = "#27282b";
      context.fill();
    }
    context.beginPath();
    context.moveTo(ex - 7 * s, head.y - 11 * s);
    context.quadraticCurveTo(ex, head.y - 15 * s, ex + 7 * s, head.y - 10 * s);
    context.strokeStyle = "#565350";
    context.lineWidth = 2.5 * s;
    context.stroke();
  }
  context.beginPath();
  context.moveTo(head.x - 1 * s, head.y - 3 * s);
  context.quadraticCurveTo(head.x - 4 * s, head.y + 8 * s, head.x - 5 * s, head.y + 11 * s);
  context.quadraticCurveTo(head.x, head.y + 15 * s, head.x + 5 * s, head.y + 11 * s);
  context.strokeStyle = "rgba(54, 51, 50, 0.45)";
  context.lineWidth = 1.6 * s;
  context.stroke();
  context.beginPath();
  context.moveTo(head.x - 9 * s, head.y + 22 * s);
  context.quadraticCurveTo(head.x, head.y + 25 * s, head.x + 9 * s, head.y + 22 * s);
  context.strokeStyle = "#655856";
  context.lineWidth = 2 * s;
  context.stroke();
  oval(context, { x: head.x - 11 * s, y: head.y - 10 * s }, 1.5 * s, 1 * s);
  context.fillStyle = "rgba(255, 255, 255, 0.8)";
  context.fill();
  context.shadowBlur = blur;
}

function hand(context: CanvasRenderingContext2D, palm: Point, elbow: Point, scale: number) {
  const angle = Math.atan2(palm.y - elbow.y, palm.x - elbow.x) - Math.PI / 2;
  context.save();
  context.translate(palm.x, palm.y);
  context.rotate(angle);
  const gradient = context.createLinearGradient(-10 * scale, 0, 10 * scale, 0);
  gradient.addColorStop(0, "#4c4b4c");
  gradient.addColorStop(0.5, "#e9e5dc");
  gradient.addColorStop(1, "#807d79");
  oval(context, { x: 0, y: 0 }, 11 * scale, 14 * scale);
  context.fillStyle = gradient;
  context.fill();
  for (let finger = 0; finger < 4; finger += 1) {
    const x = (finger - 1.5) * 5.2 * scale;
    context.beginPath();
    context.moveTo(x, -7 * scale);
    context.lineTo(x + (finger - 1.5) * 0.7 * scale, -(24 - Math.abs(finger - 1.5) * 3) * scale);
    context.strokeStyle = finger === 1 ? "#ddd9d2" : "#b5b1ab";
    context.lineWidth = 3.1 * scale;
    context.lineCap = "round";
    context.stroke();
  }
  context.restore();
}

function foot(context: CanvasRenderingContext2D, point: Point, knee: Point, scale: number) {
  const angle = Math.atan2(point.y - knee.y, point.x - knee.x) - Math.PI / 2;
  context.save();
  context.translate(point.x, point.y);
  context.rotate(angle);
  const gradient = context.createLinearGradient(-13 * scale, 0, 13 * scale, 0);
  gradient.addColorStop(0, "#393a3b");
  gradient.addColorStop(0.4, "#d5d1c9");
  gradient.addColorStop(1, "#777571");
  oval(context, { x: 0, y: 0 }, 13 * scale, 22 * scale);
  context.fillStyle = gradient;
  context.fill();
  context.shadowBlur = 0;
  for (let toe = 0; toe < 4; toe += 1) {
    oval(context, { x: (toe - 1.5) * 5.6 * scale, y: -18 * scale }, (3.2 - toe * 0.28) * scale, 3.8 * scale);
    context.fillStyle = "#c6c2ba";
    context.fill();
  }
  context.restore();
}

export function drawNetwork(context: CanvasRenderingContext2D, points: readonly Point[], time: number, opacity: number) {
  if (opacity <= 0) return;
  context.save();
  context.globalAlpha *= opacity;
  context.strokeStyle = "rgba(255, 255, 255, 0.85)";
  context.lineWidth = 1;
  context.beginPath();
  for (let a = 0; a < points.length; a += 1) {
    for (let b = a + 1; b < points.length; b += 1) {
      context.moveTo(points[a]!.x, points[a]!.y);
      context.lineTo(points[b]!.x, points[b]!.y);
    }
  }
  context.stroke();
  const phase = (time % 1600) / 1600;
  for (const point of points) {
    oval(context, point, 9 + 26 * phase, 9 + 26 * phase);
    context.strokeStyle = `rgba(255, 255, 255, ${0.55 * (1 - phase)})`;
    context.stroke();
    oval(context, point, 8, 8);
    context.strokeStyle = "rgba(255, 255, 255, 0.72)";
    context.stroke();
    oval(context, point, 3, 3);
    context.fillStyle = "#fff";
    context.fill();
  }
  context.restore();
}

export function drawFigure(context: CanvasRenderingContext2D, pose: Pose, time: number, opacity: number, texture: CanvasPattern | null, rings: readonly Point[]) {
  if (opacity <= 0) return;
  const s = pose.scale;
  context.save();
  context.globalAlpha *= opacity;
  context.shadowColor = "rgba(220, 218, 210, 0.22)";
  context.shadowBlur = 12 * s;

  limb(context, pose.leftHip, pose.leftKnee, 28 * s, 19 * s, texture);
  limb(context, pose.leftKnee, pose.leftFoot, 19 * s, 11 * s, texture);
  limb(context, pose.rightHip, pose.rightKnee, 28 * s, 19 * s, texture);
  limb(context, pose.rightKnee, pose.rightFoot, 19 * s, 11 * s, texture);
  interior(context, () => {
    joint(context, pose.leftKnee, 10 * s);
    joint(context, pose.rightKnee, 10 * s);
  });
  foot(context, pose.leftFoot, pose.leftKnee, s);
  foot(context, pose.rightFoot, pose.rightKnee, s);

  torso(context, pose, time, texture);
  limb(context, pose.neck, { x: pose.chest.x, y: pose.leftShoulder.y - 6 * s }, 19 * s, 24 * s, texture);

  limb(context, pose.leftShoulder, pose.leftElbow, 24 * s, 17 * s, texture);
  limb(context, pose.leftElbow, pose.leftHand, 17 * s, 10 * s, texture);
  limb(context, pose.rightShoulder, pose.rightElbow, 24 * s, 17 * s, texture);
  limb(context, pose.rightElbow, pose.rightHand, 17 * s, 10 * s, texture);
  interior(context, () => {
    joint(context, pose.leftShoulder, 12 * s);
    joint(context, pose.rightShoulder, 12 * s);
    joint(context, pose.leftElbow, 9 * s);
    joint(context, pose.rightElbow, 9 * s);
  });
  hand(context, pose.leftHand, pose.leftElbow, s);
  hand(context, pose.rightHand, pose.rightElbow, s);
  face(context, pose, time, texture);

  context.shadowBlur = 0;
  context.strokeStyle = "rgba(255, 255, 255, 0.28)";
  context.lineWidth = 1;
  for (const point of rings) {
    oval(context, point, 17 * s, 17 * s);
    context.stroke();
  }
  context.restore();
}
