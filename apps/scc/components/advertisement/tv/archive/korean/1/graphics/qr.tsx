import { memo } from "react";

// A QR-shaped pattern (finder squares + seeded modules). It encodes nothing:
// the clone keeps the on-screen form without pointing viewers anywhere.
const SIZE = 25;

function modules(seed: number) {
  const cells: [number, number][] = [];
  let state = seed;
  const next = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= SIZE - 8 && y < 8) || (x < 8 && y >= SIZE - 8);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (inFinder(x, y)) continue;
      if (y === 6 || x === 6) {
        if ((x + y) % 2 === 0) cells.push([x, y]);
        continue;
      }
      if (next() > 0.52) cells.push([x, y]);
    }
  }
  return cells;
}

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={7} height={7} fill="#000" />
      <rect x={1} y={1} width={5} height={5} fill="#fff" />
      <rect x={2} y={2} width={3} height={3} fill="#000" />
    </g>
  );
}

export const QrPattern = memo(function QrPattern({ size, seed = 7 }: { size: number; seed?: number }) {
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`} shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={SIZE + 2} height={SIZE + 2} fill="#fff" />
      {modules(seed).map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" />
      ))}
      <Finder x={0} y={0} />
      <Finder x={SIZE - 7} y={0} />
      <Finder x={0} y={SIZE - 7} />
    </svg>
  );
});
