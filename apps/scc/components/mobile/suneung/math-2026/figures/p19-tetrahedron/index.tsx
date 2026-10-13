import { Ellipse, Label, Polyline, Segment, type Point } from "../../../paper/draw";

const q = (x: number, y: number): Point => [x / 4, y / 4];

const A = q(395, 60);
const B = q(47, 550);
const C = q(656, 823);
const D = q(830, 460);
const H = q(741, 640);
const G = q(393, 418);

const solid = [
  { id: "ab", from: A, to: B, width: 0.75 },
  { id: "ac", from: A, to: C, width: 0.85 },
  { id: "ad", from: A, to: D, width: 0.75 },
  { id: "bc", from: B, to: C, width: 0.75 },
  { id: "cd", from: C, to: D, width: 0.75 },
  { id: "ah", from: A, to: H, width: 0.5 },
];
const dashed = [
  { id: "bd", from: B, to: D },
  { id: "bh", from: B, to: H },
];

const unit = (from: Point, to: Point): Point => {
  const l = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return [(to[0] - from[0]) / l, (to[1] - from[1]) / l];
};
const u = unit(H, A);
const v = unit(H, D);
const m = 5;
const mark: Point[] = [
  [H[0] + u[0] * m, H[1] + u[1] * m],
  [H[0] + (u[0] + v[0]) * m, H[1] + (u[1] + v[1]) * m],
  [H[0] + v[0] * m, H[1] + v[1] * m],
];

const labels = [
  { id: "A", x: 381, y: 45 },
  { id: "B", x: 6, y: 575 },
  { id: "C", x: 647, y: 870 },
  { id: "D", x: 843, y: 477 },
  { id: "G", x: 410, y: 432 },
  { id: "H", x: 762, y: 668 },
];

export default function P19Tetrahedron() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Ellipse
        cx={G[0]}
        cy={G[1]}
        rx={208 / 4}
        ry={208 / 4}
        width={0.6}
        style={{ background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #f3f3f3 35%, #d4d4d4 85%, #c4c4c4 100%)" }}
      />
      {solid.map((e) => (
        <Segment key={e.id} from={e.from} to={e.to} width={e.width} />
      ))}
      {dashed.map((e) => (
        <Segment key={e.id} from={e.from} to={e.to} width={0.5} dash="dashed" />
      ))}
      <Polyline points={mark} width={0.5} />
      <Ellipse cx={G[0]} cy={G[1]} rx={1.6} ry={1.6} width={0} fill="#000" />
      {labels.map((l) => (
        <Label key={l.id} x={l.x / 4} y={l.y / 4} size={10.5}>
          {l.id}
        </Label>
      ))}
    </div>
  );
}
