/** `compact` pieces (shapes, images) may be shrunk into a grid; text keeps its reading size. */
export type LayoutPiece = { id: string; width: number; height: number; compact?: boolean };
export type LayoutBin = { key: string; pieces: readonly LayoutPiece[] };
export type Placement = { x: number; y: number; scale: number };
export type LayoutOptions = {
  width: number;
  /** Space between neighbouring pieces, within and across categories. */
  gap?: number;
  /** A category of compact pieces whose median area is at least this is set as a grid of up to three columns. */
  surface?: number;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/**
 * One continuous flow, like words in a paragraph: categories follow each other
 * in first-appearance order and their atoms in document order, all on the same
 * line until the width runs out. Only the order shows where a category ends.
 */
export function layoutBins(bins: readonly LayoutBin[], { width, gap = 4, surface = 12000 }: LayoutOptions) {
  const placements = new Map<string, Placement>();
  let x = 0;
  let y = 0;
  let rowHeight = 0;

  for (const bin of bins) {
    const grid = bin.pieces.length > 1 && bin.pieces.every((piece) => piece.compact) &&
      median(bin.pieces.map((piece) => piece.width * piece.height)) >= surface;
    const columns = grid ? Math.min(bin.pieces.length, 3) : 1;
    const cell = (width - gap * (columns - 1)) / columns;

    for (const piece of bin.pieces) {
      const scale = piece.width > 0 ? Math.min(1, cell / piece.width) : 1;
      const pieceWidth = piece.width * scale;
      if (x > 0 && x + pieceWidth > width + 0.5) {
        y += rowHeight + gap;
        x = 0;
        rowHeight = 0;
      }
      placements.set(piece.id, { x, y, scale });
      x += pieceWidth + gap;
      rowHeight = Math.max(rowHeight, piece.height * scale);
    }
  }

  return { placements, height: y + rowHeight };
}
