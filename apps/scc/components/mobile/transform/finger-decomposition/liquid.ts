/**
 * The interface as a thin liquid sheet.
 *
 * Two grids share the screen. An Eulerian velocity grid (nodes `cell` px
 * apart) is the liquid's motion: fingers drag it, it carries its own momentum
 * (semi-Lagrangian advection), spreads it (viscosity), is made divergence-free
 * by a pressure projection (so the sheet keeps its area and a stroke sends
 * return currents and eddies round its sides, as in Stam's Stable Fluids), and
 * slows by floor friction. A Lagrangian mesh (vertices `spacing` px apart) is
 * the interface itself: each vertex keeps its rest position (where that bit of
 * the page is drawn in the texture) and is carried by the velocity. Drawing the
 * texture on the carried mesh is a continuous map of the page, never cut into
 * pieces.
 */
export type Liquid = {
  width: number;
  height: number;
  cell: number;
  columns: number;
  rows: number;
  vx: Float32Array;
  vy: Float32Array;
  nextX: Float32Array;
  nextY: Float32Array;
  pressure: Float32Array;
  divergence: Float32Array;
  spacing: number;
  meshColumns: number;
  meshRows: number;
  /** Rest position of every vertex, interleaved x/y, in px. */
  rest: Float32Array;
  /** Current position of every vertex, interleaved x/y, in px. */
  position: Float32Array;
  /** Stacking of every vertex: the part of the sheet held most recently is drawn on top. */
  lift: Float32Array;
  indices: Uint32Array;
};

export type LiquidParameters = {
  /** px²/s. */
  viscosity: number;
  /** 1/s: velocity decays as exp(−friction t). */
  friction: number;
  /** Jacobi iterations of the pressure solve; 0 leaves the liquid compressible. */
  pressureIterations: number;
};

export const liquidParameters: LiquidParameters = { viscosity: 1400, friction: 1.6, pressureIterations: 24 };

export function createLiquid(width: number, height: number, { cell = 14, spacing = 8 } = {}): Liquid {
  const columns = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;
  const nodes = columns * rows;
  const meshColumns = Math.ceil(width / spacing) + 1;
  const meshRows = Math.ceil(height / spacing) + 1;
  const rest = new Float32Array(meshColumns * meshRows * 2);
  for (let row = 0; row < meshRows; row++) {
    for (let column = 0; column < meshColumns; column++) {
      const index = (row * meshColumns + column) * 2;
      rest[index] = Math.min(width, column * spacing);
      rest[index + 1] = Math.min(height, row * spacing);
    }
  }
  const indices = new Uint32Array((meshColumns - 1) * (meshRows - 1) * 6);
  let cursor = 0;
  for (let row = 0; row < meshRows - 1; row++) {
    for (let column = 0; column < meshColumns - 1; column++) {
      const a = row * meshColumns + column;
      const b = a + 1;
      const c = a + meshColumns;
      const d = c + 1;
      indices.set([a, b, c, b, d, c], cursor);
      cursor += 6;
    }
  }
  return {
    width, height, cell, columns, rows,
    vx: new Float32Array(nodes), vy: new Float32Array(nodes),
    nextX: new Float32Array(nodes), nextY: new Float32Array(nodes),
    pressure: new Float32Array(nodes), divergence: new Float32Array(nodes),
    spacing, meshColumns, meshRows, rest, position: rest.slice(), lift: new Float32Array(meshColumns * meshRows), indices,
  };
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

/** Bilinear sample of a node field at (x, y) px; zero outside the screen. */
function sample(liquid: Liquid, field: Float32Array, x: number, y: number) {
  const { cell, columns, rows } = liquid;
  const gx = x / cell;
  const gy = y / cell;
  if (gx < 0 || gy < 0 || gx > columns - 1 || gy > rows - 1) return 0;
  const i = Math.min(columns - 2, Math.floor(gx));
  const j = Math.min(rows - 2, Math.floor(gy));
  const fx = gx - i;
  const fy = gy - j;
  const at = j * columns + i;
  return (field[at] * (1 - fx) + field[at + 1] * fx) * (1 - fy) + (field[at + columns] * (1 - fx) + field[at + columns + 1] * fx) * fy;
}

export const velocityAt = (liquid: Liquid, x: number, y: number): [number, number] => [sample(liquid, liquid.vx, x, y), sample(liquid, liquid.vy, x, y)];

/**
 * A finger moving at `velocity` (px/s) through `at` drags the liquid round it:
 * velocity within a Gaussian of `sigma` is pulled toward the finger's, fully
 * at its centre. Pulling toward (not adding) keeps the liquid no faster than
 * the finger, however often it is sampled.
 */
export function drag(liquid: Liquid, at: { x: number; y: number }, velocity: { x: number; y: number }, sigma: number, strength = 0.9) {
  const { cell, columns, rows, vx, vy } = liquid;
  const reach = sigma * 3;
  const inverse = 1 / (2 * sigma * sigma);
  const i0 = Math.max(0, Math.floor((at.x - reach) / cell));
  const i1 = Math.min(columns - 1, Math.ceil((at.x + reach) / cell));
  const j0 = Math.max(0, Math.floor((at.y - reach) / cell));
  const j1 = Math.min(rows - 1, Math.ceil((at.y + reach) / cell));
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const dx = i * cell - at.x;
      const dy = j * cell - at.y;
      const weight = strength * Math.exp(-(dx * dx + dy * dy) * inverse);
      const index = j * columns + i;
      vx[index] += (velocity.x - vx[index]) * weight;
      vy[index] += (velocity.y - vy[index]) * weight;
    }
  }
}

/** Free-slip walls at the screen edges: no flow through them. */
function walls(liquid: Liquid) {
  const { columns, rows, vx, vy } = liquid;
  for (let j = 0; j < rows; j++) {
    vx[j * columns] = 0;
    vx[j * columns + columns - 1] = 0;
  }
  for (let i = 0; i < columns; i++) {
    vy[i] = 0;
    vy[(rows - 1) * columns + i] = 0;
  }
}

function advectVelocity(liquid: Liquid, dt: number) {
  const { cell, columns, rows, vx, vy, nextX, nextY } = liquid;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const index = j * columns + i;
      const x = clamp(i * cell - vx[index] * dt, 0, liquid.width);
      const y = clamp(j * cell - vy[index] * dt, 0, liquid.height);
      nextX[index] = sample(liquid, vx, x, y);
      nextY[index] = sample(liquid, vy, x, y);
    }
  }
  vx.set(nextX);
  vy.set(nextY);
}

function diffuse(liquid: Liquid, dt: number, viscosity: number) {
  const { cell, columns, rows, vx, vy, nextX, nextY } = liquid;
  // Explicit diffusion, kept stable by capping the blend.
  const blend = Math.min(0.24, (viscosity * dt) / (cell * cell));
  if (!blend) return;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const index = j * columns + i;
      const left = i > 0 ? index - 1 : index;
      const right = i < columns - 1 ? index + 1 : index;
      const up = j > 0 ? index - columns : index;
      const down = j < rows - 1 ? index + columns : index;
      nextX[index] = vx[index] + blend * (vx[left] + vx[right] + vx[up] + vx[down] - 4 * vx[index]);
      nextY[index] = vy[index] + blend * (vy[left] + vy[right] + vy[up] + vy[down] - 4 * vy[index]);
    }
  }
  vx.set(nextX);
  vy.set(nextY);
}

/** Removes the divergent part of the velocity, so the sheet keeps its area. */
function project(liquid: Liquid, iterations: number) {
  const { cell, columns, rows, vx, vy, pressure, divergence } = liquid;
  if (!iterations) return;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const index = j * columns + i;
      const right = i < columns - 1 ? vx[index + 1] : -vx[index];
      const left = i > 0 ? vx[index - 1] : -vx[index];
      const down = j < rows - 1 ? vy[index + columns] : -vy[index];
      const up = j > 0 ? vy[index - columns] : -vy[index];
      divergence[index] = ((right - left) + (down - up)) * 0.5 * cell;
    }
  }
  pressure.fill(0);
  for (let iteration = 0; iteration < iterations; iteration++) {
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < columns; i++) {
        const index = j * columns + i;
        const left = i > 0 ? pressure[index - 1] : pressure[index];
        const right = i < columns - 1 ? pressure[index + 1] : pressure[index];
        const up = j > 0 ? pressure[index - columns] : pressure[index];
        const down = j < rows - 1 ? pressure[index + columns] : pressure[index];
        pressure[index] = (left + right + up + down - divergence[index]) * 0.25;
      }
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const index = j * columns + i;
      const left = i > 0 ? pressure[index - 1] : pressure[index];
      const right = i < columns - 1 ? pressure[index + 1] : pressure[index];
      const up = j > 0 ? pressure[index - columns] : pressure[index];
      const down = j < rows - 1 ? pressure[index + columns] : pressure[index];
      vx[index] -= (right - left) / (2 * cell);
      vy[index] -= (down - up) / (2 * cell);
    }
  }
}

/** Carries every vertex not in `pinned` by the velocity (midpoint rule). */
function advectMesh(liquid: Liquid, dt: number, pinned: Uint8Array | null) {
  const { position } = liquid;
  for (let vertex = 0; vertex < position.length / 2; vertex++) {
    if (pinned?.[vertex]) continue;
    const x = position[vertex * 2];
    const y = position[vertex * 2 + 1];
    const [ux, uy] = velocityAt(liquid, x, y);
    if (!ux && !uy) continue;
    const [mx, my] = velocityAt(liquid, x + ux * dt * 0.5, y + uy * dt * 0.5);
    position[vertex * 2] = x + mx * dt;
    position[vertex * 2 + 1] = y + my * dt;
  }
}

/** One time step of `dt` s. Returns the fastest node speed (px/s) afterwards. */
export function stepLiquid(liquid: Liquid, dt: number, pinned: Uint8Array | null = null, parameters = liquidParameters) {
  advectVelocity(liquid, dt);
  diffuse(liquid, dt, parameters.viscosity);
  walls(liquid);
  project(liquid, parameters.pressureIterations);
  walls(liquid);
  const decay = Math.exp(-parameters.friction * dt);
  let fastest = 0;
  const { vx, vy } = liquid;
  for (let index = 0; index < vx.length; index++) {
    vx[index] *= decay;
    vy[index] *= decay;
    const speed = Math.abs(vx[index]) + Math.abs(vy[index]);
    if (speed > fastest) fastest = speed;
  }
  advectMesh(liquid, dt, pinned);
  return fastest;
}

export function stillLiquid(liquid: Liquid) {
  liquid.vx.fill(0);
  liquid.vy.fill(0);
}

/** Moves the given vertices rigidly by (dx, dy): the piece held under a finger. */
export function moveVertices(liquid: Liquid, vertices: ArrayLike<number>, dx: number, dy: number) {
  for (let index = 0; index < vertices.length; index++) {
    const vertex = vertices[index];
    liquid.position[vertex * 2] += dx;
    liquid.position[vertex * 2 + 1] += dy;
  }
}

/** Vertices whose rest position lies in a rectangle of the page. */
export function verticesIn(liquid: Liquid, left: number, top: number, right: number, bottom: number) {
  const { rest, spacing, meshColumns, meshRows } = liquid;
  const found: number[] = [];
  const c0 = Math.max(0, Math.ceil(left / spacing));
  const c1 = Math.min(meshColumns - 1, Math.floor(right / spacing));
  const r0 = Math.max(0, Math.ceil(top / spacing));
  const r1 = Math.min(meshRows - 1, Math.floor(bottom / spacing));
  for (let row = r0; row <= r1; row++) {
    for (let column = c0; column <= c1; column++) {
      const vertex = row * meshColumns + column;
      const x = rest[vertex * 2];
      const y = rest[vertex * 2 + 1];
      if (x >= left && x <= right && y >= top && y <= bottom) found.push(vertex);
    }
  }
  return found;
}

/**
 * Inverse of the current map: which point of the page is drawn at (x, y) on
 * screen, or null where the sheet has been pulled away. When folds overlap the
 * point, the last drawn triangle (the one on top) wins.
 */
export function restPointAt(liquid: Liquid, x: number, y: number) {
  const { position, rest, indices } = liquid;
  let found: { x: number; y: number } | null = null;
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index] * 2;
    const b = indices[index + 1] * 2;
    const c = indices[index + 2] * 2;
    const ax = position[a], ay = position[a + 1];
    const bx = position[b], by = position[b + 1];
    const cx = position[c], cy = position[c + 1];
    if (x < Math.min(ax, bx, cx) || x > Math.max(ax, bx, cx) || y < Math.min(ay, by, cy) || y > Math.max(ay, by, cy)) continue;
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (!det) continue;
    const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det;
    const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det;
    const w = 1 - u - v;
    if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
    found = {
      x: rest[a] * u + rest[b] * v + rest[c] * w,
      y: rest[a + 1] * u + rest[b + 1] * v + rest[c + 1] * w,
    };
  }
  return found;
}
