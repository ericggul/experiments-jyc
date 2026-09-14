export type Grid = {
  cellSize: number;
  originX: number;
  originY: number;
  columns: number;
  rows: number;
};

export type CellAnchor = {
  xRatio: number;
  yRatio: number;
};

export type TemporalAnchor = CellAnchor & {
  createdAt: number;
  id?: string;
};

export type TemporalCompositionAnchor = TemporalAnchor & {
  columnOffset: number;
  rowOffset: number;
};

export type SelectedCell = {
  column: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type TemporalCell = SelectedCell & {
  createdAt: number;
  id: string;
};

export const CAMERA_MONOLITH_GRID_SETTINGS = {
  cellMin: 20,
  cellMax: 30,
  cellDivisor: 30,
} as const;

export const CAMERA_MONOLITH_GRID_SCALE = 2;

export function createGrid(width: number, height: number): Grid {
  const settings = CAMERA_MONOLITH_GRID_SETTINGS;
  const baseCellSize = Math.max(
    settings.cellMin,
    Math.min(
      settings.cellMax,
      Math.round(Math.min(width, height) / settings.cellDivisor),
    ),
  );
  const cellSize = baseCellSize * CAMERA_MONOLITH_GRID_SCALE;
  const columns = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;

  return {
    cellSize,
    originX: (width - columns * cellSize) / 2,
    originY: (height - rows * cellSize) / 2,
    columns,
    rows,
  };
}

export function getCellAtPoint(x: number, y: number, grid: Grid): SelectedCell {
  const column = Math.min(
    grid.columns - 1,
    Math.max(0, Math.floor((x - grid.originX) / grid.cellSize)),
  );
  const row = Math.min(
    grid.rows - 1,
    Math.max(0, Math.floor((y - grid.originY) / grid.cellSize)),
  );
  const cellX = grid.originX + column * grid.cellSize;
  const cellY = grid.originY + row * grid.cellSize;

  return {
    column,
    row,
    x: cellX,
    y: cellY,
    width: grid.cellSize,
    height: grid.cellSize,
    centerX: cellX + grid.cellSize / 2,
    centerY: cellY + grid.cellSize / 2,
  };
}

export function getAnchoredCells(
  anchors: readonly CellAnchor[],
  grid: Grid,
  width: number,
  height: number,
) {
  return anchors.map((anchor) =>
    getCellAtPoint(anchor.xRatio * width, anchor.yRatio * height, grid),
  );
}

function getTemporalAnchorId(anchor: TemporalAnchor) {
  return (
    anchor.id ??
    `${anchor.xRatio.toFixed(6)}:${anchor.yRatio.toFixed(6)}:${anchor.createdAt.toFixed(6)}`
  );
}

export function getTemporalCells(
  anchors: readonly TemporalAnchor[],
  grid: Grid,
  width: number,
  height: number,
) {
  return anchors.map((anchor) => ({
    ...getCellAtPoint(anchor.xRatio * width, anchor.yRatio * height, grid),
    createdAt: anchor.createdAt,
    id: `base:${getTemporalAnchorId(anchor)}`,
  }));
}

export function createTemporalCompositionAnchor(
  anchor: TemporalAnchor,
  cell: SelectedCell,
): TemporalCompositionAnchor {
  const seed =
    (Math.imul(cell.column + 1, 0x45d9f3b) ^
      Math.imul(cell.row + 1, 0x119de1f3) ^
      Math.floor(anchor.createdAt * 1000)) >>>
    0;

  return {
    ...anchor,
    columnOffset: seed & 1,
    rowOffset: (seed >>> 1) & 1,
  };
}

export function getTemporalCompositionCells(
  anchors: readonly TemporalCompositionAnchor[],
  grid: Grid,
  width: number,
  height: number,
) {
  const columnSpan = Math.min(2, grid.columns);
  const rowSpan = Math.min(2, grid.rows);

  return anchors.map((anchor) => {
    const selectedCell = getCellAtPoint(
      anchor.xRatio * width,
      anchor.yRatio * height,
      grid,
    );
    const column = Math.min(
      grid.columns - columnSpan,
      Math.max(0, selectedCell.column - anchor.columnOffset),
    );
    const row = Math.min(
      grid.rows - rowSpan,
      Math.max(0, selectedCell.row - anchor.rowOffset),
    );

    return {
      column,
      row,
      x: grid.originX + column * grid.cellSize,
      y: grid.originY + row * grid.cellSize,
      width: grid.cellSize * columnSpan,
      height: grid.cellSize * rowSpan,
      centerX: grid.originX + (column + columnSpan / 2) * grid.cellSize,
      centerY: grid.originY + (row + rowSpan / 2) * grid.cellSize,
      createdAt: anchor.createdAt,
      id: `composition:${getTemporalAnchorId(anchor)}`,
    } satisfies TemporalCell;
  });
}
