export const mobilesConfig = {
  phoneCount: 90,
  minimumRows: 5,
  /** Outer frame size in pt; the glass inside is 390 × 844. */
  phoneWidth: 404,
  phoneHeight: 858,
  gapRatio: 0.035,
  outerMarginRatio: 0.025,
} as const;

/** Largest uniform phone size whose grid fits the viewport. */
export function fitPhoneGrid(width: number, height: number, count: number = mobilesConfig.phoneCount) {
  const aspect = mobilesConfig.phoneWidth / mobilesConfig.phoneHeight;
  const margin = Math.min(width, height) * mobilesConfig.outerMarginRatio;
  const availableWidth = Math.max(0, width - margin * 2);
  const availableHeight = Math.max(0, height - margin * 2);
  let best = { columns: 1, width: 0, height: 0, gap: 0 };
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.max(mobilesConfig.minimumRows, Math.ceil(count / columns));
    const phoneWidth = Math.min(
      availableWidth / (columns + (columns - 1) * mobilesConfig.gapRatio),
      availableHeight / (rows / aspect + (rows - 1) * mobilesConfig.gapRatio),
    );
    if (phoneWidth > best.width) {
      best = { columns, width: phoneWidth, height: phoneWidth / aspect, gap: phoneWidth * mobilesConfig.gapRatio };
    }
  }
  return best;
}
