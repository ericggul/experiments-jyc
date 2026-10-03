# Goldfishes working contract

Start with the target route's document and modules plus `components/experiments.ts`; follow only relevant links. For a new or substantial experiment, also read root `AGENTS.md` and the SCC [tinkering](../../../docs/foundations/tinkering.md) guidance; use [design](../../../docs/foundations/design-guidelines.md) for a new/materially redesigned UI and [history](./research-and-rendering-history.md) only when its rendering or historical decisions apply.

## Method

Goldfishes tests one change in the relation between a school, its attention field, participant input, and viewpoint. Keep a recognizable working parent; change one operative material, geometry, topology, temporal rule, or input relation; compare the result directly. A new directory is a standalone copy, not a candidate for shared abstraction. Public image URLs are allowed, but data lists selecting them remain local; company logos are the sole shared immutable collection.

Before coding, write:

```text
question: what relation is tested?
baseline: closest complete parent
mutation: exact changed behavior/material/geometry/input
invariants: every unrequested visual and interaction contract
evidence: observable or measurable result
```

Unmentioned properties are invariants. A geometry change does not authorize new locomotion, camera, palette, controls, layout, or media scheduling. A prompt saying “same as” calls for local reproduction unless it explicitly asks for shared architecture.

## Visual and technical floor

- The changed relation must read without labels, metrics, scenery, water decoration, badges, panels, or technical chrome. Leva is collapsed authoring UI, never the artwork's wrapper.
- Geometry, hit areas, targets, projections, and resize behavior must share coordinates. 3D must be perceptible in the relevant view, not merely use 3D primitives.
- Preserve legible fish anatomy, heading, tail motion, gathering, and collision behavior. Materials must not stretch, seam, flip, crop unintentionally, or flicker identity.
- Stable identities stay stable across redraw, resize, and theme changes unless the experiment explicitly resamples them. Keep workload bounded; distinguish an architectural bound from an FPS result.

## Archive workflow

1. Inspect status, the registry, target date folder, and untracked files. Treat all concurrent work as owned.
2. Copy the closest complete experiment to the next serial of its family, `components/<area>/<family>/<n+1>` (serials rise with creation date; start a new family at `1`), and register its ISO date; make changes inside it only.
3. Register one date, route, and concrete phrase in `experiments.ts`; add the matching concise document. A dated route is permanent. Promotion deliberately replaces `default` while retaining the dated origin.
4. Record implementation facts, observation conditions, failed alternatives, and unresolved questions. Do not turn an inference into evidence.
5. Re-open shared registry/index files immediately before patching. Do not reorder, normalize, adopt, delete, or report other work.

Completion means one intelligible question, a standalone implementation, preserved invariants, a resolved visible relation, and an honest record of result and uncertainty.
