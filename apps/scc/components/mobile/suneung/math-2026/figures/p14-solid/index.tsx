import { Area, Label, Polyline, Segment, sample, type Point } from "../../../paper/draw";

// Reference pixels (4x) -> figure px.
const q = (x: number, y: number): Point => [x / 4, y / 4];
const O = [99, 443];
const EX = [248, 37.5];
const EY = [105, -93];
const at = (x: number, y: number): Point => q(O[0] + EX[0] * x + EY[0] * y, O[1] + EX[1] * x + EY[1] * y);

function arrow(tip: Point, dir: Point): Point[][] {
  const len = Math.hypot(dir[0], dir[1]);
  const [ux, uy] = [dir[0] / len, dir[1] / len];
  const a = 0.28;
  const l = 7;
  return [a, -a].map((s) => {
    const c = Math.cos(s);
    const sn = Math.sin(s);
    return [tip, [tip[0] - l * (ux * c - uy * sn), tip[1] - l * (uy * c + ux * sn)] as Point];
  });
}

const curve = sample((x) => Math.sqrt(x + x * Math.log(x)), 1 / Math.E, 2.98, 120, at);
const P1 = q(350, 480);
const Q = q(456, 495);
const P2 = q(595, 518);
const P3 = q(785, 350);
const P4 = q(455, 388);
const R = q(600, 368);
const T1 = q(400, 222);
const T3 = q(528, 135);
const T2 = q(690, 40);
const sizeText = 11;

export default function P14Solid() {
  const yTip = q(555, 45);
  const xTip = q(862, 558);
  const arrows = [...arrow(yTip, [550, -480]), ...arrow(xTip, [850, 130])];
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Area points={[P1, T1, T3, T2, P3, P2, Q]} fill="rgba(0,0,0,.15)" />
      <Area points={[Q, T3, R]} fill="rgba(0,0,0,.2)" />
      <Segment from={q(5, 525)} to={yTip} width={0.5} />
      <Segment from={q(5, 428)} to={xTip} width={0.5} />
      {arrows.map((p, i) => (
        <Segment key={`arrow-${i}`} from={p[0]} to={p[1]} width={0.5} />
      ))}
      <Segment from={q(303, 525)} to={q(785, 95)} width={0.8} />
      <Segment from={q(510, 590)} to={q(1030, 135)} width={0.8} />
      <Polyline points={curve} width={0.8} />
      <Segment from={P1} to={Q} width={1} />
      <Segment from={Q} to={P2} width={1} />
      <Segment from={P1} to={T1} width={1} />
      <Segment from={T1} to={T3} width={1} />
      <Segment from={T3} to={T2} width={1} />
      <Segment from={Q} to={T3} width={1} />
      <Segment from={Q} to={R} width={1} />
      <Segment from={T3} to={R} width={1} />
      <Segment from={P2} to={T2} width={1} />
      <Segment from={T2} to={P3} width={1} />
      <Segment from={P2} to={P3} width={1} />
      <Segment from={T1} to={P4} width={0.6} dash="dashed" />
      <Label x={128} y={12.5} size={sizeText} font="ei">y</Label>
      <Label x={210} y={148.7} size={sizeText} font="ei">x</Label>
      <Label x={25} y={121} size={sizeText} font="e">O</Label>
      <Label x={54} y={147.5} size={sizeText} font="ei">x</Label>
      <Label x={64} y={147.5} size={sizeText} font="e">=</Label>
      <Label x={72.5} y={147.5} size={sizeText} font="e">1</Label>
      <Label x={115.5} y={157.5} size={sizeText} font="ei">x</Label>
      <Label x={125} y={157.5} size={sizeText} font="e">=</Label>
      <Label x={134} y={157.5} size={sizeText} font="e">2</Label>
      <Label x={201.3} y={100} size={sizeText} font="ei">y</Label>
      <Label x={209.5} y={100} size={sizeText} font="e">=</Label>
      <Label x={222.5} y={100} size={sizeText} font="e">√</Label>
      <Segment from={[229, 90]} to={[273, 90]} width={0.6} />
      <Label x={231.5} y={100} size={sizeText} font="ei">x</Label>
      <Label x={240} y={100} size={sizeText} font="e">+</Label>
      <Label x={250} y={100} size={sizeText} font="ei">x</Label>
      <Label x={256} y={100} size={sizeText} font="e">ln</Label>
      <Label x={267.5} y={100} size={sizeText} font="ei">x</Label>
    </div>
  );
}
