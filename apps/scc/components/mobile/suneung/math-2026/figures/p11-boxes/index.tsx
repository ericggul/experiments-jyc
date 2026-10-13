import { Ellipse, Label, Segment, type Point } from "../../../paper/draw";

const K = 4.003; // reference px per sheet px
const P = (x: number, y: number): Point => [x / K, y / K];
const W = 0.6;
const PITCH = 159.4;

const HEAP = [
  [85.5, 51.5], [139.5, 51.5], [192, 51.5], [244, 51.5],
  [64.5, 92.5], [118.5, 92.5], [171.5, 92.5], [224.5, 92.5],
  [44, 134.5], [97.5, 134.5], [150.5, 134.5], [203.5, 134.5],
  [23.5, 175.5], [76.5, 175.5], [129.5, 175.5], [183.5, 175.5],
] as const;

const BALL = "radial-gradient(circle at 38% 32%, #ebebeb 0%, #cfcfcf 55%, #a8a8a8 100%)";

// Edges of one box in reference px, relative to the front-left edge x = 0.
const EDGES: readonly [number, number, number, number, "dashed"?][] = [
  [0, 118, 97, 118],
  [97, 118, 97, 221.5],
  [97, 221.5, 0, 221.5],
  [0, 221.5, 0, 118],
  [0, 118, 56.5, 6],
  [56.5, 6, 153, 6],
  [153, 6, 97, 118],
  [153, 6, 153, 108],
  [153, 108, 97, 221.5],
  [56.5, 6, 56.5, 108],
  [56.5, 108, 101, 108],
  [51, 118, 56.5, 108],
];

export default function Figure() {
  const boxes = [1, 2, 3, 4, 5, 6].map((n) => ({ n, x0: 264 + (n - 1) * PITCH }));
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {HEAP.map(([x, y]) => (
        <Ellipse key={`${x}-${y}`} cx={x / K} cy={y / K} rx={4.45} ry={4.45} width={0.6} fill={BALL} />
      ))}
      {boxes.map(({ n, x0 }) => (
        <div key={`box-${n}`}>
          {EDGES.map(([a, b, c, d], i) => (
            <Segment key={i} from={P(x0 + a, b)} to={P(x0 + c, d)} width={W} />
          ))}
          <Label x={(x0 + 48.5) / K - 2.6} y={184 / K} size={10.6} font="e">
            {n}
          </Label>
        </div>
      ))}
    </div>
  );
}
