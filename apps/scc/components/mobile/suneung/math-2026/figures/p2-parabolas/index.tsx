import { Area, Label, Polyline, Segment, sample, type Point } from "../../../paper/draw";

// Measured on the 4x reference (px = image / 4): origin (121.75, 206.75), 20.15 px per unit.
const OX = 121.75;
const OY = 206.75;
const U = 20.15;
const toSheet = (x: number, y: number): Point => [OX + U * x, OY - U * y];

const upper = (x: number) => x * x + 3;
const lower = (x: number) => -x * x / 5 + 3;

const upperCurve = sample(upper, -2.59, 2.59, 120, toSheet);
const lowerCurve = sample(lower, -4.42, 4.42, 120, toSheet);
const shade = [...sample(upper, 0, 2, 60, toSheet), ...sample(lower, 2, 0, 60, toSheet)];

const arrow = (tip: Point, angle: number) => {
  const len = 7;
  const half = 2.4;
  const back: Point = [tip[0] - len * Math.cos(angle), tip[1] - len * Math.sin(angle)];
  const nx = -Math.sin(angle) * half;
  const ny = Math.cos(angle) * half;
  return [
    { id: "a", from: tip, to: [back[0] + nx, back[1] + ny] as Point },
    { id: "b", from: tip, to: [back[0] - nx, back[1] - ny] as Point },
  ];
};

export default function Figure() {
  const arrows = [
    ...arrow([242, OY], 0).map((s) => ({ ...s, id: `x${s.id}` })),
    ...arrow([OX, 7], -Math.PI / 2).map((s) => ({ ...s, id: `y${s.id}` })),
  ];
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Area points={shade} fill="#d9d9d9" />
      <Segment from={[1.5, OY]} to={[241, OY]} width={0.5} />
      <Segment from={[OX, 7]} to={[OX, 230]} width={0.5} />
      {arrows.map((s) => (
        <Segment key={s.id} from={s.from} to={s.to} width={0.7} />
      ))}
      <Segment from={[161.9, 11]} to={[161.9, 225]} width={0.8} />
      <Polyline points={upperCurve} width={0.8} />
      <Polyline points={lowerCurve} width={0.8} />

      <Label x={114} y={217} size={11}>O</Label>
      <Label x={234} y={215.5} size={11} font="ei">x</Label>
      <Label x={113.5} y={13} size={11} font="ei">y</Label>

      <Label x={150} y={234.5} size={11} font="ei">x</Label>
      <Label x={156} y={234.5} size={11}>=2</Label>

      <Label x={19.5} y={23} size={11} font="ei">y</Label>
      <Label x={27} y={23} size={11}>=</Label>
      <Label x={39.5} y={23} size={11} font="ei">x</Label>
      <Label x={45.5} y={19.5} size={7.5}>2</Label>
      <Label x={50} y={23} size={11}>+3</Label>

      <Label x={9.5} y={163.5} size={11} font="ei">y</Label>
      <Label x={17} y={163.5} size={11}>=−</Label>
      <Label x={42} y={159.5} size={8.5}>1</Label>
      <Segment from={[39.5, 162.5]} to={[46.5, 162.5]} width={0.5} />
      <Label x={42} y={172.5} size={8.5}>5</Label>
      <Label x={48} y={163.5} size={11} font="ei">x</Label>
      <Label x={54.5} y={160} size={7.5}>2</Label>
      <Label x={58.5} y={163.5} size={11}>+3</Label>
    </div>
  );
}
