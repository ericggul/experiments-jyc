import { Ellipse, Label, Polyline, Segment, type Point } from "../../../paper/draw";

// Measured on the 4x reference (px = image / 4). Origin O = (170.5, 105.75).
const OX = 170.5;
const OY = 105.75;
const H: Point = [85.5, 50];
const A: Point = [180.5, 50];
const B: Point = [238.75, OY];

// Parabola branch with vertex O, opening right, focus F near the ellipse's right vertex.
const branch: Point[] = Array.from({ length: 101 }, (_, i) => {
  const dy = -95.5 + (191 * i) / 100; // y from 10.25 to 201.25
  return [OX + 0.00312 * dy * dy, OY + dy] as Point;
});

const arrow = (tip: Point, angle: number, key: string) => {
  const len = 7;
  const half = 2.4;
  const back: Point = [tip[0] - len * Math.cos(angle), tip[1] - len * Math.sin(angle)];
  const nx = -Math.sin(angle) * half;
  const ny = Math.cos(angle) * half;
  return [
    { id: `${key}a`, from: tip, to: [back[0] + nx, back[1] + ny] as Point },
    { id: `${key}b`, from: tip, to: [back[0] - nx, back[1] - ny] as Point },
  ];
};

export default function Figure() {
  const arrows = [...arrow([275, OY], 0, "x"), ...arrow([OX, 7], -Math.PI / 2, "y")];
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Ellipse cx={132.6} cy={106} rx={123.1} ry={61} width={0.8} />
      <Segment from={[1.5, OY]} to={[274, OY]} width={0.5} />
      <Segment from={[OX, 7]} to={[OX, 202.5]} width={0.5} />
      {arrows.map((s) => (
        <Segment key={s.id} from={s.from} to={s.to} width={0.7} />
      ))}
      <Segment from={[85.5, 10.5]} to={[85.5, 197.5]} width={0.8} />
      <Polyline points={branch} width={0.8} />

      <Segment from={H} to={A} width={0.9} />
      <Segment from={H} to={B} width={0.8} />
      <Segment from={A} to={B} width={0.8} />
      <Segment from={[85.5, 44.5]} to={[91.25, 44.5]} width={0.5} />
      <Segment from={[91.25, 44.5]} to={[91.25, 49.8]} width={0.5} />

      <Label x={74.5} y={48.8} size={11}>H</Label>
      <Label x={186} y={47.5} size={11}>A</Label>
      <Label x={162} y={116.3} size={11}>O</Label>
      <Label x={236.2} y={116.3} size={11}>B</Label>
      <Label x={257.5} y={116.3} size={11}>F</Label>
      <Label x={269.5} y={115.5} size={11} font="ei">x</Label>
      <Label x={163.8} y={12.5} size={11} font="ei">y</Label>

      <Label x={68.5} y={207.5} size={11} font="ei">x</Label>
      <Label x={74.5} y={207.5} size={11}>=−</Label>
      <Label x={93.5} y={207.5} size={11} font="ei">p</Label>
    </div>
  );
}
