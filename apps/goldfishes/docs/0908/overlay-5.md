# Overlay 5

- Route: `/screen/0908/overlay-5` (legacy alias: `/0908/overlay-5`)
- Dated family: 2026-09-08
- Fork created: 2026-09-17
- Baseline: [`overlay-4`](./overlay-4.md), copied as an independent experiment

## Tested relation

This fork preserves overlay-4's current social-story propagation, adaptive
attention, surfaces, controls, rendering, and audio behavior while changing
only its initial spatial and temporal presentation.

## Default changes

- Overall activity speed: `×0.5`
- Story icon size: `60px`
- Story margin: `36px`
- Goldfish size: `×0.7`
- Approach rings: off

All controls retain the same ranges and remain adjustable. The experiment has
its own session-storage key, component copy, source scripts, and audio asset so
changes made here do not alter overlay-4.

## Invariants

The propagation algorithm, adaptive behavior, bubble timing relationships,
surface defaults, school count, interaction controls, and visual styling are
unchanged from the copied overlay-4 baseline.

## 2026-09-18 refinement

- Removed the `white` and `numbers` surfaces, including their render branches
  and number-specific styling.
- Approach-ring WebGL resources are now created only when that optional layer
  is first enabled. With its default off state, the screen uses one WebGL
  context instead of two.
- Reused the nearby-target search buffer, cached surface presentation data, and
  moved invariant fish scale work outside the per-fish frame loop.
- Reduced hidden/reduced-motion scheduler polling without changing the visible
  24 Hz school update.
- Removed unused surface-era CSS and an unused app-count export.

The social propagation rules, attention scoring, fish motion values, event
timing, control ranges, and all remaining surface behavior are unchanged.
