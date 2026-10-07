export type Point = Readonly<{ x: number; y: number }>;
export type GestureMemory = Map<number, { baseX: number; baseY: number; influence: number }>;

export const fieldParameters = {
  influenceRadiusInCells: 2.4,
  influenceReferenceArrows: 360,
  influenceReferenceMaximumSpacing: 40,
  influenceReferenceMinimumSpacing: 24,
  targetMobileArrows: 1200,
  maximumSpacing: 52,
  minimumSpacing: 12,
} as const;

export type SampledField = {
  width: number;
  height: number;
  grid: ReturnType<typeof gridForViewport>;
  radius: number;
  vectors: Float32Array;
};

export function influenceRadiusForViewport(width: number, height: number): number {
  const previousSpacing = Math.min(
    fieldParameters.influenceReferenceMaximumSpacing,
    Math.max(
      fieldParameters.influenceReferenceMinimumSpacing,
      Math.sqrt(width * height / fieldParameters.influenceReferenceArrows),
    ),
  );
  return previousSpacing * fieldParameters.influenceRadiusInCells;
}

export function gridForViewport(width: number, height: number) {
  const spacing = Math.min(
    fieldParameters.maximumSpacing,
    Math.max(fieldParameters.minimumSpacing, Math.sqrt(width * height / fieldParameters.targetMobileArrows)),
  );
  const columns = Math.max(1, Math.floor(width / spacing));
  const rows = Math.max(1, Math.floor(height / spacing));
  return {
    columns,
    rows,
    spacing,
    left: (width - (columns - 1) * spacing) / 2,
    top: (height - (rows - 1) * spacing) / 2,
  };
}

export function createSampledField(width: number, height: number): SampledField {
  const grid = gridForViewport(width, height);
  const vectors = new Float32Array(grid.columns * grid.rows * 2);
  for (let index = 0; index < vectors.length; index += 2) vectors[index] = 1;
  return { width, height, grid, radius: influenceRadiusForViewport(width, height), vectors };
}

// Each cell responds to its closest approach to this path during one gesture.
// Repeated pointer samples cannot build a flat, fully aligned disk around it.
export function alignSegment(
  field: SampledField,
  from: Point,
  to: Point,
  gesture: GestureMemory,
  dirtyCells?: Set<number>,
): void {
  const segmentX = to.x - from.x;
  const segmentY = to.y - from.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared < 0.25) return;
  const targetAngle = Math.atan2(segmentY, segmentX);
  const { grid, radius, vectors } = field;
  const firstRow = Math.max(0, Math.ceil((Math.min(from.y, to.y) - radius - grid.top) / grid.spacing));
  const lastRow = Math.min(grid.rows - 1, Math.floor((Math.max(from.y, to.y) + radius - grid.top) / grid.spacing));
  const firstColumn = Math.max(0, Math.ceil((Math.min(from.x, to.x) - radius - grid.left) / grid.spacing));
  const lastColumn = Math.min(grid.columns - 1, Math.floor((Math.max(from.x, to.x) + radius - grid.left) / grid.spacing));
  const inverseRadiusSquared = 1 / (radius * radius);

  for (let row = firstRow; row <= lastRow; row += 1) {
    const y = grid.top + row * grid.spacing;
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const x = grid.left + column * grid.spacing;
      const along = Math.max(0, Math.min(1,
        ((x - from.x) * segmentX + (y - from.y) * segmentY) / lengthSquared,
      ));
      const dx = x - (from.x + along * segmentX);
      const dy = y - (from.y + along * segmentY);
      const distanceSquared = (dx * dx + dy * dy) * inverseRadiusSquared;
      if (distanceSquared >= 1) continue;
      const influence = (1 - distanceSquared) ** 3;
      const cell = row * grid.columns + column;
      const index = cell * 2;
      const previous = gesture.get(cell);
      if (previous && influence < previous.influence - 0.000001) continue;
      const baseX = previous?.baseX ?? vectors[index]!;
      const baseY = previous?.baseY ?? vectors[index + 1]!;
      const baseAngle = Math.atan2(baseY, baseX);
      const turn = Math.atan2(Math.sin(targetAngle - baseAngle), Math.cos(targetAngle - baseAngle));
      const angle = baseAngle + influence * turn;
      const nextX = Math.cos(angle);
      const nextY = Math.sin(angle);
      gesture.set(cell, { baseX, baseY, influence });
      if (Math.abs(nextX - vectors[index]!) + Math.abs(nextY - vectors[index + 1]!) < 0.000001) continue;
      vectors[index] = nextX;
      vectors[index + 1] = nextY;
      dirtyCells?.add(cell);
    }
  }
}

export function resizeField(previous: SampledField, width: number, height: number): SampledField {
  const next = createSampledField(width, height);
  const oldGrid = previous.grid;
  const sample = (column: number, row: number, axis: 0 | 1) => (
    previous.vectors[(row * oldGrid.columns + column) * 2 + axis]!
  );

  for (let row = 0; row < next.grid.rows; row += 1) {
    const y = (next.grid.top + row * next.grid.spacing) / height * previous.height;
    const oldRow = Math.max(0, Math.min(oldGrid.rows - 1, (y - oldGrid.top) / oldGrid.spacing));
    const row0 = Math.floor(oldRow);
    const row1 = Math.min(oldGrid.rows - 1, row0 + 1);
    const ty = oldRow - row0;
    for (let column = 0; column < next.grid.columns; column += 1) {
      const x = (next.grid.left + column * next.grid.spacing) / width * previous.width;
      const oldColumn = Math.max(0, Math.min(oldGrid.columns - 1, (x - oldGrid.left) / oldGrid.spacing));
      const column0 = Math.floor(oldColumn);
      const column1 = Math.min(oldGrid.columns - 1, column0 + 1);
      const tx = oldColumn - column0;
      const component = (axis: 0 | 1) => {
        const top = sample(column0, row0, axis) * (1 - tx) + sample(column1, row0, axis) * tx;
        const bottom = sample(column0, row1, axis) * (1 - tx) + sample(column1, row1, axis) * tx;
        return top * (1 - ty) + bottom * ty;
      };
      const vx = component(0);
      const vy = component(1);
      const length = Math.hypot(vx, vy) || 1;
      const index = (row * next.grid.columns + column) * 2;
      next.vectors[index] = vx / length;
      next.vectors[index + 1] = vy / length;
    }
  }
  return next;
}
