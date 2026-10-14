# Substitution — /mobile/transform/substitution/[experiment]/[clone]

Experimental, 2026-09-25. The baseline is each preserved `clone/1`–`clone/14` mobile surface. Both variants reuse the same DOM and pointer-transparent canvas renderer; clone layout, scrolling, and event handlers remain in place. The bottom-right filter is excluded from the transform.

| Route | Initial mode | Filter modes |
| --- | --- | --- |
| `substitution/1` — Form | Object outlines | Original, outlines, representative color |
| `substitution/2` — Imperative | Complete replacement, discipline | Original; complete replacement, overlay, pointer reveal; consumption, discipline, attention |
| `substitution/3` — In place (11–14 only) | Replacement, discipline, grotesque, 1 px frame, light | Original, replacement, dark; consumption, discipline, attention; six typefaces; frame 0–6 px |

The outline reference is LinkedIn `/sns/linkedin/5`'s `line layout` mode. In `/1`, the renderer traces visible nested elements, images, icons, controls, and actual rendered text-line bounds with straight 1px black borders, clipped to scroll containers. Representative color adds each element's CSS background or foreground, or the mean of a 12×12 image sample where canvas sampling is permitted. In `/2`, **one unit means one actionable target or coherent content surface**: a clickable control/card, search field, media surface, heading or copy block, or transient dialog. Decorative wrappers, icon internals, and individual text lines do not become units. Each drawn unit has one uppercase command; a larger surface is painted before smaller controls that sit over it, and occluded controls are omitted. The `/2` filter sits above bottom navigation at narrow mobile widths. Unit selection lives in `functional-units.ts`; command interpretation remains in `semantic.ts`. It reads layout geometry rather than screenshotting the page. Scroll, resize, and DOM changes schedule one drawing pass per animation frame.

`/2` has two independent controls: presentation and vocabulary. Complete replacement hides the clone visually and shows white command cells. Overlay keeps the clone visible beneath translucent command cells. Pointer reveal keeps the original visible until hover or finger movement enters a functional unit; only that unit switches to an opaque command cell, and touch release clears it. The compact mobile filter trigger avoids covering the clone's caption controls. The canvas does not intercept clone pointer events.

## Geometry correction — 2026-10-11

The user found `/2` cells sized differently from the interface they replace, and scrolling made cells change size, appear, disappear and lag. Substitution keeps the original layout and replaces only what is drawn there. Three causes were found in the code and confirmed in Chrome at 390 px on `/2/2` and `/2/11`:

- **Box.** A cell used the raw element box. On `/2` the search cell was the bare 15 px `<input>` inside a 47 px grey field. Block headings spanned the full column width, and 44 px hit areas surrounded 24 px icons. A cell is now the box the unit is seen as: its own painted box (fill, border or shadow), the painted wrapper of an unpainted field when that wrapper holds no other unit, or the union of its text runs, graphics and painted children. Painting is read with the clone's own styles shown: collection lifts the hiding attribute for that read.
- **Scroll.** Label size and position came from the visible, clipped part of a cell. Cells under 18×15 px of visible area were dropped, and an `elementFromPoint` test at the visible centre dropped cells passing under headers and tab bars. Labels are now sized and centred on the whole cell and only clipped. Cells are no longer dropped at edges. Stacking follows the page instead: each fixed, sticky, full-size absolute or dialog ancestor lifts a cell one level, so headers, tab bars and sheets (including X's absolutely positioned sheets) stay above what scrolls. Within a layer, larger surfaces sit under the controls on them. In complete replacement, the painted surfaces of fixed chrome that are not units themselves are drawn as blank white, so content hides under a header or the floating Instagram tab pill as it does in the original.
- **Cost.** Any attribute mutation, such as a scroll-driven header or a playing video, re-ran the full collection inside every frame. Each frame also re-read computed styles for clipping. Collection is now limited to four times a second. Clip ancestors are found at collection, and label fits are cached. Frames were timed with a MessageChannel animation-frame shim, scrolling `/2/11` 0–6000 px in 40 px steps. The previous code measured 117 ms median and 135 ms p95 per frame (about 8 fps). The new code measured 3.8 ms median and 4.8 ms p95; 0–1200 px measured 1.7 ms median.

Units smaller than 18×15 px are now drawn too. Their label is omitted below 12×9 px. Variant `/1` is unchanged.

Scoped use (2026-10-11): `CommandRenderer`'s optional `scope` element limits reading, hiding and drawing to one host-page phone, which is marked `data-substitution-command-scope`. Without it the renderer behaves as before. Since 2026-10-14 `/mobiles/2` uses `/3`'s `PixelRenderer` instead, whose `scope` works the same way (`data-substitution-pixel-scope`; the phone's box counts as the screen, and scoped phones take turns re-reading, one per frame).

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

## /3 — in place, 2026-10-13

Baseline: `/2`'s complete replacement, which the user found broken on a phone with `/2/13` (X). Three faults were reported. Cells drifted away from the interface after scrolling. Round profile pictures were covered by square cells. A name, its @handle and the minutes since posting shared one cell and one command. The user also asked that words fill their cells top to bottom and side to side, like the lettering in a Koolhaas diagram, rather than float mid-cell. `/3` runs on Instagram, TikTok, X and YouTube only (`substitutionClones` in `experiments.ts`). The other clones stay with `/1`–`/2`.

**Why `/2` drifted.** `/2` paints a fixed canvas from geometry it reads at most four times a second. X and Instagram scroll an inner container on the compositor, so the canvas trails the content by up to a quarter second. On a phone that reads as cells lying anywhere.

**Method.** Nothing is drawn over the page. Each cell is written into the CSS background of the element that already occupies that place. So the browser scrolls, clips, sticks, transforms and rounds it exactly as it does the original, with no frame of lag.
- The hiding sheet makes every element paint nothing: fills, borders, shadows, glyphs, image and video frames (`object-position` off-box) and SVG strokes. It never changes a box.
- A picture, video, icon (`svg`), field or photo background becomes an element cell: its own background is white, a 1 px inset shadow frames it, and the word is an SVG image at `100% 100%`. Corners round with the element, or with a same-sized clipping parent, and letters keep clear of the curve.
- A box with borders gets its own border sides back in black, so a divider stays one line. A filled box (from a 3 % tint up) is filled white and framed. Fixed chrome stays opaque, so content scrolling under a header is hidden as in the original.
- Text has no element of its own, so a text part is one background layer of the nearest block holding it. The layer is positioned at the part's line boxes relative to that block. These offsets do not change when anything scrolls.
  - Adjacent text nodes form one run: React renders `@{handle} · {time}` as several nodes.
  - A run is split at `·`, `•` and `|`, and around in-copy #tags and @mentions (`tokens.ts`).
  - Each part's role comes from its form first: handle, time, count, tag. Then from its place: title, name, control label, copy. Within each vocabulary the words for name, handle, time, count and copy differ (`semantic.ts`).
- Every cell is an SVG at its exact CSS-pixel size (`cell-image.ts`). Its capitals are set with `textLength` and `lengthAdjust="spacingAndGlyphs"`, and their cap height equals the cell height less a 1–1.5 px inset, so the word fills the cell both ways.
- Cells are written as non-inherited registered custom properties on each element (`@property`, `inherits: false`), so writing one restyles only that element.

**Reading cost.**
- The first version lifted the hiding from the whole document to read original fills. Each lift cost two full style passes, about 24 + 29 ms on `/13`'s 5,224 elements. Rewriting one large stylesheet of cells cost more.
- Now each element's original fill, background image, borders and shadow are read once, while only that element is marked raw, and cached. A class or style change on an element marks its subtree for re-reading.
- Only parts within one screen of view are written. Boxes up to three screens tall that lie wholly away from it (posts, rows) are skipped without being entered.
- DOM changes re-read in the next frame, and scrolling alone re-reads every 100 ms.
- Measured on `/13`, scrolling 0–6,000 px in 60 px steps with a MessageChannel frame shim in a hidden tab, so frame rate and paint cost are unmeasured. Reads went from a 38 ms median (142 ms worst) to 7.3 ms median (11 ms worst), about 1.5 ms per frame on average.

**Checks (2026-10-13, Chrome).**
- Layout invariance: on `/3/11`–`/3/14`, every element box and text-node box was measured with the substitution on and off. Not one of 10,481 boxes or 2,262 text runs moved.
- On `/13` and `/11`, zoomed screenshots of the same region with the substitution on and off matched part for part, before and after scrolling the inner feed.
- An Instagram comment sheet opened with its own cells. TikTok playing video caused no re-reads over 2 s.
- The control's 원본 removed every cell and property, and switching vocabulary rewrote the words.
- `tokens.test.mjs` covers splitting and roles.
- Fixed during the checks:
  - count cells whose line box was taller than their button lost their top and bottom frame lines, so cells are now clamped to the box that holds them;
  - Instagram usernames inside buttons read as control labels;
  - "3 hours ago" was not recognised as a time;
  - YouTube's 5 % light chips were not boxes;
  - a browser extension's cursor overlay (z-index ≥ 2147483000) was being substituted.

**Options (same day).** The user asked for typefaces, a single continuous control that removes, restores and thickens the frames, and a dark mode.
- **Typefaces.** A data-URI SVG cannot load web fonts, so there are six system faces present on iOS and macOS, each with fallbacks: grotesque (Helvetica Neue), condensed (Avenir Next Condensed), geometric (Futura), serif (Didot), typewriter (American Typewriter) and mono (Menlo). Each face's cap height is stored, so its capitals still fill the cell.
- **Frame slider, 0–6.**
  - At 0 there are no frames and no dividers.
  - Between 0 and 1 the hairline fades in.
  - Above 1 the frames thicken. Element frames are inset shadows at the chosen width, and text-cell frames are drawn inside the SVG. An original border side keeps its own width and is thickened inward by an inset shadow on that side, so no box changes size.
  - Letters keep clear of the frame.
- **Dark mode.** The ground and fills turn black and the ink and frames white.
- Changing any of these rewrites the cells from the facts already cached and does not read the page again.
- Checked on `/3/13` in Chrome: condensed at 3 px in dark mode, and serif at 0 in light mode.
- The panel follows bubble/3's grammar: groups 화면, 명령어, 글꼴 (each typeface named in itself) and 바탕; a 테두리 slider showing 없음 or its px; and 기본값으로.

**Unverified.**
- Real phones, iOS Safari's support for SVG backgrounds on inline `svg` elements, and `@property`.
- Hover and press states that change a fill without a DOM change.
- Text in a block that scrolls itself (positioned with `background-attachment: local`).
- Pseudo-element icons, which are hidden and not substituted.
