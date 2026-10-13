/** The area the columns fill: the whole viewport. */
export type Bounds = { left: number; top: number; right: number; bottom: number };

export type Layout = {
  /** Column width. */
  width: number;
  gap: number;
  /** width + gap (fractional: the columns are stretched to fill the bounds). */
  pitch: number;
  count: number;
  left: number;
  /** Every column stands on `bottom` and reaches `top` at full level. */
  top: number;
  bottom: number;
};

// Columns of type stand almost solid and fill the bounds edge to edge: as many as fit with a gap of at least ⅛
// the width (≥ 2 px, the painter pads each column by 1 px), then the leftover width is shared out between them.
export function layoutFor(bounds: Bounds, width: number): Layout {
  const minimumGap = Math.max(2, Math.round(width / 8));
  const available = Math.max(0, bounds.right - bounds.left);
  const count = Math.max(1, Math.floor((available + minimumGap) / (width + minimumGap)));
  const gap = count > 1 ? (available - count * width) / (count - 1) : 0;
  return { width, gap, pitch: width + gap, count, left: bounds.left, top: bounds.top, bottom: bounds.bottom };
}

export function columnLeft(layout: Layout, column: number) {
  return layout.left + column * layout.pitch;
}
