import { Ellipse, Label, Polyline, Segment, type Point } from "../../../paper/draw";

const q = (x: number, y: number): Point => [x / 4, y / 4];

const A = q(309, 725);
const B = q(594, 725);
const C = q(594, 345);
const F = q(120, 725);
const G = q(189, 575);
const H = q(72, 120);

const W = 0.75;
const edges = [
  { id: "hc", from: H, to: C },
  { id: "hg", from: H, to: G },
  { id: "gc", from: G, to: C },
  { id: "ac", from: A, to: C },
  { id: "fb", from: F, to: B },
  { id: "cb", from: C, to: B },
];

function arc(center: Point, r: number, a0: number, a1: number): Point[] {
  return Array.from({ length: 17 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / 16;
    return [center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)] as Point;
  });
}

const angleAC = Math.atan2(C[1] - A[1], C[0] - A[0]);
const angleCH = Math.atan2(H[1] - C[1], H[0] - C[0]);
const angleCG = Math.atan2(G[1] - C[1], G[0] - C[0]);
const s = 5.5;

const labels = [
  { id: "H", x: 32, y: 116 },
  { id: "C", x: 606, y: 362 },
  { id: "G", x: 192, y: 622 },
  { id: "E", x: 415, y: 622 },
  { id: "F", x: 82, y: 742 },
  { id: "A", x: 294, y: 745 },
  { id: "D", x: 505, y: 745 },
  { id: "B", x: 606, y: 745 },
];

export default function P5Circles() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Ellipse cx={302 / 4} cy={301 / 4} rx={295 / 4} ry={295 / 4} width={W} />
      <Ellipse cx={A[0]} cy={A[1]} rx={189 / 4} ry={189 / 4} width={W} />
      {edges.map((e) => (
        <Segment key={e.id} from={e.from} to={e.to} width={W} />
      ))}
      <Polyline points={arc(A, 9.5, angleAC, 0)} width={0.5} />
      <Polyline points={arc(C, 9, angleCG, angleCH + 2 * Math.PI)} width={0.5} />
      <Polyline points={[[B[0] - s, B[1]], [B[0] - s, B[1] - s], [B[0], B[1] - s]]} width={0.5} />
      {labels.map((l) => (
        <Label key={l.id} x={l.x / 4} y={l.y / 4} size={10.5}>
          {l.id}
        </Label>
      ))}
    </div>
  );
}
