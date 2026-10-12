# Substitution — /mobile/transform/substitution/[experiment]/[clone]

Experimental, 2026-09-25. The baseline is each preserved `clone/1`–`clone/14` mobile surface. Both variants reuse the same DOM and pointer-transparent canvas renderer; clone layout, scrolling, and event handlers remain in place. The bottom-right filter is excluded from the transform.

| Route | Initial mode | Filter modes |
| --- | --- | --- |
| `substitution/1` — Form | Object outlines | Original, outlines, representative color |
| `substitution/2` — Imperative | Complete replacement, discipline | Original; complete replacement, overlay, pointer reveal; consumption, discipline, attention |

The outline reference is LinkedIn `/sns/linkedin/5`'s `line layout` mode. In `/1`, the renderer traces visible nested elements, images, icons, controls, and actual rendered text-line bounds with straight 1px black borders, clipped to scroll containers. Representative color adds each element's CSS background or foreground, or the mean of a 12×12 image sample where canvas sampling is permitted. In `/2`, **one unit means one actionable target or coherent content surface**: a clickable control/card, search field, media surface, heading or copy block, or transient dialog. Decorative wrappers, icon internals, and individual text lines do not become units. Each drawn unit has one uppercase command; a larger surface is painted before smaller controls that sit over it, and occluded controls are omitted. The `/2` filter sits above bottom navigation at narrow mobile widths. Unit selection lives in `functional-units.ts`; command interpretation remains in `semantic.ts`. It reads layout geometry rather than screenshotting the page. Scroll, resize, and DOM changes schedule one drawing pass per animation frame.

`/2` has two independent controls: presentation and vocabulary. Complete replacement hides the clone visually and shows white command cells. Overlay keeps the clone visible beneath translucent command cells. Pointer reveal keeps the original visible until hover or finger movement enters a functional unit; only that unit switches to an opaque command cell, and touch release clears it. The compact mobile filter trigger avoids covering the clone's caption controls. The canvas does not intercept clone pointer events.

## Geometry correction — 2026-10-11

The user found `/2` cells sized differently from the interface they replace, and scrolling made cells change size, appear, disappear and lag. Substitution keeps the original layout and replaces only what is drawn there. Three causes were found in the code and confirmed in Chrome at 390 px on `/2/2` and `/2/11`:

- **Box.** A cell used the raw element box. On `/2` the search cell was the bare 15 px `<input>` inside a 47 px grey field. Block headings spanned the full column width, and 44 px hit areas surrounded 24 px icons. A cell is now the box the unit is seen as: its own painted box (fill, border or shadow), the painted wrapper of an unpainted field when that wrapper holds no other unit, or the union of its text runs, graphics and painted children. Painting is read with the clone's own styles shown: collection lifts the hiding attribute for that read.
- **Scroll.** Label size and position came from the visible, clipped part of a cell. Cells under 18×15 px of visible area were dropped, and an `elementFromPoint` test at the visible centre dropped cells passing under headers and tab bars. Labels are now sized and centred on the whole cell and only clipped. Cells are no longer dropped at edges. Stacking follows the page instead: each fixed, sticky, full-size absolute or dialog ancestor lifts a cell one level, so headers, tab bars and sheets (including X's absolutely positioned sheets) stay above what scrolls. Within a layer, larger surfaces sit under the controls on them. In complete replacement, the painted surfaces of fixed chrome that are not units themselves are drawn as blank white, so content hides under a header or the floating Instagram tab pill as it does in the original.
- **Cost.** Any attribute mutation, such as a scroll-driven header or a playing video, re-ran the full collection inside every frame. Each frame also re-read computed styles for clipping. Collection is now limited to four times a second. Clip ancestors are found at collection, and label fits are cached. Frames were timed with a MessageChannel animation-frame shim, scrolling `/2/11` 0–6000 px in 40 px steps. The previous code measured 117 ms median and 135 ms p95 per frame (about 8 fps). The new code measured 3.8 ms median and 4.8 ms p95; 0–1200 px measured 1.7 ms median.

Units smaller than 18×15 px are now drawn too. Their label is omitted below 12×9 px. Variant `/1` is unchanged.

Scoped use (2026-10-11): `CommandRenderer`'s optional `scope` element limits reading, hiding and drawing to one host-page phone (`/mobiles/2`), which is marked `data-substitution-command-scope`. Without it the renderer behaves as before.

## Command interpretation

The source grammar is the black-and-white billboard revelation in *They Live* (`OBEY`, `CONSUME`, and related imperatives), combined with the user's description of Luke Strickler's “information is awesome” reel. The exact reel sequence was not independently retrieved. These terms are an authored reading of each clone's affordances, not evidence of its maker's intent. `semantic.ts` owns the three editable vocabularies (12–13 words each), action-to-command mapping, and the prominent-media override for each clone.

| Clones | Observed actions used in the reading | Emphasis |
| --- | --- | --- |
| 1 design shop, 6 fashion resale | Browse, filter, save, bag, checkout | Desire, conformity, watching |
| 2 meal order, 7 food delivery | Search, customize, order, pay | Consumption, compliance, watching |
| 3 stays, 8 rail, 9 fitness classes | Select date/seat/class, reserve, cancel | Reservation, scheduling, return |
| 4 team work | Plan, edit, check off, report | Accumulation, planning, return |
| 5 secondhand, 10 marketplace | Search, price, offer, chat, save | Pricing, verification, watching |
| 11 Instagram, 12 TikTok, 13 X | Feed, scroll, like, follow, reply, repost, publish | Performance, repetition, attention |
| 14 YouTube | Watch, scroll, subscribe, like, save | Consumption, repetition, watching |

Prior outline checks: Chrome `/mobile/transform/div-outline/2` and `/11` (historical), then `/3` and `/11`, then moved route `substitution/1/11`. Prior color checks: former `substitution/2/3` and `/11`, including scrolling and an Instagram Like toggle. On the earlier dense `/2` version, Chrome checks covered `/11` discipline/attention/original and `/2` command rendering, restaurant entry, and scrolling. The functional-unit revision was visually checked on `/2/12` feed and search, `/2/11` feed, and `/2/2` meal search/cards. The three presentation modes were checked in desktop Chrome on `/2/12`; pointer reveal changed from the video cell to the Like cell while the Like toggle remained functional. Overlay was also checked on `/2/2`. The panel, compact trigger and Like reveal were checked at 390×844. Finger input and other mobile browser engines have not been checked.
