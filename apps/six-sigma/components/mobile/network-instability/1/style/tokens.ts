/**
 * Geometry-level style. Colours, type, and opacities are CSS custom properties
 * in `network-instability.module.css`; a restyle edits these two files only.
 */
export const tokens = {
  node: { stroke: 1 },
  link: { stroke: 0.8, bendRatio: 0.16, maxBend: 26, arrow: 3, clearance: 4 },
  pulse: { length: 0.14, minWidth: 0.8, maxWidth: 3, clearance: 2 },
  axis: { stroke: 0.7, tick: 4, dash: "2 3" },
} as const;
