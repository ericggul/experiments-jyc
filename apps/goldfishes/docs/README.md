# Goldfishes archive

Browser collage: `/maximalist-collage` → `/maximalist-collage/0915` → `/maximalist-collage/0915/1`. Implementation: `components/maximalist-collage/0915/1/`; linked in the shared navigation header and registry. [Family index](./maximalist-collage/README.md) · [art references](./maximalist-collage/references.md).

Local macOS control: `/desktop` → `/desktop/0915` → independent versions [1](./desktop/0915/1.md), [2](./desktop/0915/2.md), [3](./desktop/0915/3.md). Implementation: `components/desktop/0915/{1,2,3}/`; all appear in the shared experiment registry and home navigation. [Original fixed-score history](./pc/0915-desktop-a.md).

Code: `apps/goldfishes/components/screen` and `apps/goldfishes/components/pc`; registry: `components/experiments.ts`. The registry is authoritative for routable experiments and archive navigation. `screen/default` is the promoted baseline; dated routes are archival and must not be repurposed.

For a route change, read its document, the specific modules being changed, and the registry. Read [onboarding](./agent-onboarding.md) when creating or substantially changing a Goldfishes experiment; consult [history](./research-and-rendering-history.md) only for a relevant rendering, measurement, or historical-decision question.

| Route | Date | Proposition |
| --- | --- | --- |
| `/maximalist-collage/0915/1` | 2026-09-15 | Initial interface cut-up trial; visual result rejected by user. [doc](./maximalist-collage/0915/1.md) |
| `/desktop/0915/1` | 2026-09-15 | Preserved configurable native-app baseline. [doc](./desktop/0915/1.md) |
| `/desktop/0915/2` | 2026-09-15 | Accumulating native windows, unequal sizes and continuous drift. [doc](./desktop/0915/2.md) |
| `/desktop/0915/3` | 2026-09-15 | New pages mixed with random tab revisits; bounded turnover and scrolling. [doc](./desktop/0915/3.md) |
| `/screen/default` | current | Orthographic 3D attention field. [doc](./default.md) |
| `/screen/2d/1` | retained | Glyph swarm and media cells. [doc](./2d/1.md) |
| `/screen/0804/tube` | 2026-08-04 | Stations are fixed attraction targets. [doc](./0804/tube.md) |
| `/screen/0804/html` | 2026-08-04 | Live HTML forms enter the attention loop. [doc](./0804/html.md) |
| `/screen/0804/node-edge` | 2026-08-04 | A revealed 3D topology is the field. [doc](./0804/node-edge.md) |
| `/screen/0804/pillars` | 2026-08-04 | Selected cells become symmetric pillars. [doc](./0804/pillars.md) |
| `/screen/0806/side-view` | 2026-08-06 | Pillars begin side-on. [doc](./0806/side-view.md) |
| `/screen/0806/compositional-grid` | 2026-08-06 | Selections seed local 2×2 media structures. [doc](./0806/compositional-grid.md) |
| `/screen/0806/duration` | 2026-08-06 | Clicks accumulate downward duration. [doc](./0806/duration.md) |
| `/screen/0806/temporal-decay` | 2026-08-06 | Traces freeze after a lifetime. [doc](./0806/temporal-decay.md) |
| `/screen/0908/aggregated` | 2026-09-08 | A 3D school attends the spreading Instagram/4 keyword field. [doc](./0908/aggregated.md) |
| `/screen/0908/dots` | 2026-09-08 | Instagram/4 copied unchanged as an independent experiment. [doc](./0908/dots.md) |
| `/screen/0908/overlay` | 2026-09-08 | Original DOM/SVG field with a transparent 3D school. [doc](./0908/overlay.md) |
| `/screen/0908/overlay-2` | 2026-09-08 | Original 3D goldfish school with configurable keyword surfaces. [doc](./0908/overlay-2.md) |
| `/screen/0908/overlay-3` | 2026-09-08 | Original 3D goldfish school with switchable technology typefaces. [doc](./0908/overlay-3.md) |
| `/screen/0908/overlay-4` | 2026-09-08 | Recorded underwater textures from fish arrivals. [doc](./0908/overlay-4.md) |
| `/screen/0908/overlay-5` | 2026-09-08 | Overlay-4 at half speed with larger, roomier icons and smaller fish. [doc](./0908/overlay-5.md) |
| `/screen/0908/overlay-2d` | 2026-09-08 | Original field with the Canvas2D goldfish glyph from 2d/1. [doc](./0908/overlay-2d.md) |
| `/screen/0908/overlay-2d-2` | 2026-09-08 | Persistent individual goldfish trails replace influence edges. [doc](./0908/overlay-2d-2.md) |
| `/screen/0908/overlay-2d-3` | 2026-09-08 | Local attention, habituation and trail feedback reshape the keyword field. [doc](./0908/overlay-2d-3.md) |
| `/screen/0908/overlay-2d-4` | 2026-09-08 | Explicit selected targets, attention contact and keyword propagation. [doc](./0908/overlay-2d-4.md) |
| `/screen/0908/attention-print` | 2026-09-08 | Serial technology signs, vermilion fish and accumulated ink. [doc](./0908/attention-print.md) |
| `/pc/0908/default` | 2026-09-08 | Independent keyword-driven news phones, one per goldfish. [doc](./pc/0908/default.md) |
| `/pc/0908/variations` | 2026-09-08 | Mobile colour and keyword surface variations. [doc](./pc/0908/variations.md) |
| `/pc/0910/image-search` | 2026-09-10 | Desktop image-search grammar under subsecond technology-query replacement. [doc](./pc/0910/image-search.md) |

Each experiment is a complete local copy: no cross-experiment implementation or ledger imports. Existing public images may be addressed by URL; only immutable company logos are a shared collection (`public/assets/goldfishes/assets/company-logos`). Asset URLs must exist inside this independently deployed app; after changing a collection, run `pnpm audit:goldfishes-assets`.

To add a trial, copy the nearest complete directory into `components/{screen,pc}/MMDD/short-name`, mutate only that copy, register its ISO date and concise proposition, and record the essential decision and open question. Re-open the registry and this index immediately before a surgical patch: parallel work is expected.

Legacy URLs remain available as aliases: `/default`, `/2d/1`, and dated routes resolve to their `/screen/...` counterparts; `/3d/1` → `/screen/default`; `/3d/2`, `/0804/1` → `/screen/0804/tube`; `/3d/3`, `/0804/2` → `/screen/0804/pillars`. Goldfishes has no client Socket.IO protocol; add one only for a concrete experiment under `socket/experiments/<experiment>/` with its own prefix and room.
