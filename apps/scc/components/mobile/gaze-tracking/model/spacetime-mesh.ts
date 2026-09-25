export type SpacetimeMesh = {
  width: number;
  height: number;
  columns: number;
  rows: number;
  vertices: Float32Array;
  triangles: Uint16Array;
  gridLines: Uint16Array;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function createSpacetimeMesh(width: number, height: number): SpacetimeMesh {
  // Three subdivisions for every interval in the original ~38px grid.
  const columns = clamp(Math.round(width / 38) * 3 + 1, 10, 120);
  const rows = clamp(Math.round(height / 38) * 3 + 1, 10, 120);
  const vertices = new Float32Array(columns * rows * 4);
  const triangles: number[] = [];
  const gridLines: number[] = [];
  const at = (column: number, row: number) => row * columns + column;

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const u = column / (columns - 1);
      const v = row / (rows - 1);
      const offset = at(column, row) * 4;
      vertices[offset] = u * 2 - 1;
      vertices[offset + 1] = 1 - v * 2;
      vertices[offset + 2] = u;
      vertices[offset + 3] = 1 - v;

      const current = at(column, row);
      if (column < columns - 1) gridLines.push(current, at(column + 1, row));
      if (row < rows - 1) gridLines.push(current, at(column, row + 1));
      if (column === columns - 1 || row === rows - 1) continue;
      const right = at(column + 1, row);
      const below = at(column, row + 1);
      const diagonal = at(column + 1, row + 1);
      if ((column + row) % 2 === 0) {
        triangles.push(current, right, diagonal, current, diagonal, below);
      } else {
        triangles.push(current, right, below, right, diagonal, below);
      }
    }
  }

  return {
    width,
    height,
    columns,
    rows,
    vertices,
    triangles: new Uint16Array(triangles),
    gridLines: new Uint16Array(gridLines),
  };
}
