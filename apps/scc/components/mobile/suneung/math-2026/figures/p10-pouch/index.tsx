import Image from "next/image";
import { Ellipse, Label } from "../../../paper/draw";
import bag from "../../assets/p10-pouch-bag.webp";

const K = 4.0156; // reference px per sheet px (412 / 102.6)
const BALLS = [
  { id: "w2", n: 2, x: 283.5, y: 186.5, dark: false },
  { id: "w3", n: 3, x: 125.5, y: 226.5, dark: false },
  { id: "b5", n: 5, x: 204.5, y: 230, dark: true },
  { id: "w5", n: 5, x: 277.5, y: 274, dark: false },
  { id: "b4", n: 4, x: 358.5, y: 292, dark: true },
  { id: "b6", n: 6, x: 68, y: 294.5, dark: true },
  { id: "b2", n: 2, x: 179, y: 306.5, dark: true },
  { id: "w4", n: 4, x: 115.5, y: 359.5, dark: false },
  { id: "w1", n: 1, x: 306, y: 359.5, dark: false },
  { id: "b3", n: 3, x: 208, y: 387, dark: true },
] as const;

const WHITE = "radial-gradient(circle at 40% 35%, #fff 0%, #fff 70%, #ececec 100%)";
const BLACK = "radial-gradient(circle at 38% 32%, #6a6a6a 0%, #3c3c3c 45%, #1c1c1c 100%)";

export default function Figure() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Image src={bag} alt="" fill unoptimized draggable={false} style={{ objectFit: "fill" }} />
      {BALLS.map((b) => {
        const cx = b.x / K;
        const cy = b.y / K;
        return (
          <div key={b.id}>
            <Ellipse cx={cx} cy={cy} rx={7.6} ry={7.6} width={0.7} fill={b.dark ? BLACK : WHITE} />
            <Label x={cx - 3.2} y={cy + 3.9} size={11.5} font="e">
              <span style={{ color: b.dark ? "#fff" : "#000" }}>{b.n}</span>
            </Label>
          </div>
        );
      })}
    </div>
  );
}
