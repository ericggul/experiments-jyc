import { Ellipse, Label, Segment, type Point } from "../../../paper/draw";

const CX = 71.5;
const RX = 70;
const RY = 39.8;
const TOP = 55.1;
const BOT = 160;

const D: Point = [68.75, 15.5];
const C: Point = [137.75, 42];
const A: Point = [15, 137];
const B: Point = [128.25, 182.5];
const H: Point = [69.25, 120.75];
const s = 10.5;

export default function P19Cylinder() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Segment from={[CX - RX, TOP]} to={[CX - RX, BOT]} width={0.8} />
      <Segment from={[CX + RX, TOP]} to={[CX + RX, BOT]} width={0.8} />
      <Ellipse cx={CX} cy={TOP} rx={RX} ry={RY} width={0.8} />
      <Ellipse cx={CX} cy={BOT} rx={RX} ry={RY} width={0.6} dash="dashed" style={{ clipPath: "inset(0 0 50% 0)" }} />
      <Ellipse cx={CX} cy={BOT} rx={RX} ry={RY} width={0.8} style={{ clipPath: "inset(50% 0 0 0)" }} />
      <Segment from={D} to={H} width={0.5} dash="dashed" />
      <Segment from={D} to={A} width={0.8} />
      <Segment from={D} to={C} width={0.8} />
      <Segment from={C} to={B} width={0.8} />
      <Segment from={A} to={B} width={0.8} />
      <Segment from={A} to={H} width={0.8} />
      <Segment from={H} to={B} width={0.8} />
      <Label x={65.5} y={11.5} size={s} font="e">D</Label>
      <Label x={138.7} y={41.5} size={s} font="e">C</Label>
      <Label x={72.5} y={117.5} size={s} font="e">H</Label>
      <Label x={5} y={136} size={s} font="e">A</Label>
      <Label x={128.8} y={194.5} size={s} font="e">B</Label>
      <Label x={6.3} y={23.8} size={s} font="ei">C</Label>
      <Label x={14.5} y={27.5} size={7} font="e">2</Label>
      <Label x={6.3} y={197.5} size={s} font="ei">C</Label>
      <Label x={14.8} y={200.5} size={7} font="e">1</Label>
    </div>
  );
}
