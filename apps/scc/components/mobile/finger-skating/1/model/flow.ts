export type Point = Readonly<{ x: number; y: number }>;

function gridForViewport(width: number, height: number) {
  const spacing = Math.min(52, Math.max(12, Math.sqrt(width * height / 1200)));
  const columns = Math.max(1, Math.floor(width / spacing));
  const rows = Math.max(1, Math.floor(height / spacing));
  return {
    columns, rows, spacing,
    left: (width - (columns - 1) * spacing) / 2,
    top: (height - (rows - 1) * spacing) / 2,
  };
}

function influenceRadiusForViewport(width: number, height: number) {
  return 2.4 * Math.min(40, Math.max(24, Math.sqrt(width * height / 360)));
}

// The finger deposits a compact streamfunction dipole. Taking its perpendicular
// gradient gives a forward current on the path and returning, curved flow beside it.
// This is a designed 2D flow impulse, not an electromagnetic or Navier-Stokes solver.
const baseline = 0.42;
const maximumSpeed = 2.8;
const impulsePerRadius = 4.8;
const spring = 150;
const damping = 17;

export type FlowField = {
  width: number;
  height: number;
  grid: ReturnType<typeof gridForViewport>;
  radius: number;
  target: Float32Array;
  vectors: Float32Array;
  motion: Float32Array;
  active: Set<number>;
};

export function createFlowField(width: number, height: number): FlowField {
  const grid = gridForViewport(width, height);
  const target = new Float32Array(grid.columns * grid.rows * 2);
  const vectors = new Float32Array(target.length);
  for (let index = 0; index < target.length; index += 2) {
    target[index] = baseline;
    vectors[index] = baseline;
  }
  return {
    width, height, grid,
    radius: influenceRadiusForViewport(width, height) * 1.35,
    target, vectors, motion: new Float32Array(target.length), active: new Set(),
  };
}

export function injectFlow(field: FlowField, from: Point, to: Point): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.5) return;
  const tangentX = dx / distance;
  const tangentY = dy / distance;
  const normalX = -tangentY;
  const normalY = tangentX;
  const { grid, radius, target, active } = field;
  const radiusSquared = radius * radius;
  const samples = Math.ceil(distance / Math.min(grid.spacing * 0.75, radius * 0.12));
  const stepLength = distance / samples;
  const amplitude = impulsePerRadius * stepLength / radius;

  for (let sample = 0; sample < samples; sample += 1) {
    const alongPath = (sample + 0.5) / samples;
    const sourceX = from.x + dx * alongPath;
    const sourceY = from.y + dy * alongPath;
    const firstRow = Math.max(0, Math.ceil((sourceY - radius - grid.top) / grid.spacing));
    const lastRow = Math.min(grid.rows - 1, Math.floor((sourceY + radius - grid.top) / grid.spacing));
    const firstColumn = Math.max(0, Math.ceil((sourceX - radius - grid.left) / grid.spacing));
    const lastColumn = Math.min(grid.columns - 1, Math.floor((sourceX + radius - grid.left) / grid.spacing));

    for (let row = firstRow; row <= lastRow; row += 1) {
      const y = grid.top + row * grid.spacing;
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const x = grid.left + column * grid.spacing;
        const relativeX = x - sourceX;
        const relativeY = y - sourceY;
        const q = (relativeX * relativeX + relativeY * relativeY) / radiusSquared;
        if (q >= 1) continue;
        const along = relativeX * tangentX + relativeY * tangentY;
        const across = relativeX * normalX + relativeY * normalY;
        const envelope = (1 - q) ** 3;
        const forward = amplitude * envelope * (1 - q - 8 * across * across / radiusSquared);
        const lateral = amplitude * envelope * 8 * along * across / radiusSquared;
        const index = (row * grid.columns + column) * 2;
        const nextX = target[index]! + tangentX * forward + normalX * lateral;
        const nextY = target[index + 1]! + tangentY * forward + normalY * lateral;
        const length = Math.hypot(nextX, nextY);
        const scale = length > maximumSpeed ? maximumSpeed / length : 1;
        target[index] = nextX * scale;
        target[index + 1] = nextY * scale;
        active.add(index / 2);
      }
    }
  }
}

export function stepFlow(field: FlowField, elapsedSeconds: number, dirtyCells: Set<number>): boolean {
  const dt = Math.min(0.032, Math.max(0, elapsedSeconds));
  if (dt === 0) return field.active.size > 0;
  const { active, target, vectors, motion } = field;
  for (const cell of active) {
    const index = cell * 2;
    let moving = false;
    for (let axis = 0; axis < 2; axis += 1) {
      const position = index + axis;
      const difference = target[position]! - vectors[position]!;
      const velocity = (motion[position]! + (spring * difference - damping * motion[position]!) * dt);
      const next = vectors[position]! + velocity * dt;
      if (Math.abs(difference) > 0.0008 || Math.abs(velocity) > 0.008) {
        vectors[position] = next;
        motion[position] = velocity;
        moving = true;
      } else {
        vectors[position] = target[position]!;
        motion[position] = 0;
      }
    }
    dirtyCells.add(cell);
    if (!moving) active.delete(cell);
  }
  return active.size > 0;
}

export function resizeFlowField(previous: FlowField, width: number, height: number): FlowField {
  const next = createFlowField(width, height);
  const oldGrid = previous.grid;
  const sample = (array: Float32Array, column: number, row: number, axis: number) => (
    array[(row * oldGrid.columns + column) * 2 + axis]!
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
      const index = (row * next.grid.columns + column) * 2;
      for (let axis = 0; axis < 2; axis += 1) {
        const top = sample(previous.target, column0, row0, axis) * (1 - tx)
          + sample(previous.target, column1, row0, axis) * tx;
        const bottom = sample(previous.target, column0, row1, axis) * (1 - tx)
          + sample(previous.target, column1, row1, axis) * tx;
        next.target[index + axis] = top * (1 - ty) + bottom * ty;
        next.vectors[index + axis] = next.target[index + axis]!;
      }
    }
  }
  return next;
}
