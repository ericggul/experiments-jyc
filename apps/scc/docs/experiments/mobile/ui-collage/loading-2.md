# Mobile ui-collage/loading/2 — historic progress bars set by finger skating

- **Route:** `/mobile/ui-collage/loading/2`
- **Date:** 2026-10-03
- **Baseline:** [`loading/1`](loading-1.md): its bursty load model, captured-pointer skating, sleeping frame loop, and bottom-right option control.
- **Changed variable:** the indicator. A grid of circular loaders becomes a stack of full-width horizontal progress bars, cloned from interfaces old to new.

Full-width bars are stacked in rows inside a 16 px side gutter plus safe-area insets, centred vertically. The gap is 0.6× the thickness (at least 6 px). Thickness is 8, 16, 24 (default), or 40 px; a 390 × 844 phone holds 21 rows at 24 px and 13 at 40 px. Each bar fills 0→100% by itself, then holds there. A finger crossing a bar's band (the bar plus half the gap above and below) sets that bar to the horizontal position of the crossing: through the middle is 50%, near the right end almost 100%. Unlike loading/1, skating does not restart a bar at 0%. The position is the finger's current point when it lies in the band; otherwise it is where the segment crosses the row's centre line. A vertical swipe therefore leaves a column of equal values, a diagonal leaves a ramp, and dragging along one bar scrubs it. After a seek the bar pauses for 0.15–0.65 s, then carries on loading from there. Each pair of coalesced pointer samples is segment-tested against every band rectangle (Liang–Barsky), with multi-touch support.

## Loads

The model is copied from loading/1 with one load per row. Each row's mean duration is 4–14 s. It advances in bursts of 0.25–1.45 s: a fifth of them stall, and the rest run at 0.35–1.65× the mean pace. A row waits 0.15–0.65 s before its first progress. Resizing at the same thickness keeps rows by index. A new thickness starts a new stack at 0%. Changing the look or the percent toggle keeps progress. Code: `components/mobile/ui-collage/loading/2/model/bars.ts`.

## Looks (`screen/looks.ts`), oldest first

Every bar of every look starts and ends on the same two vertical lines (the gutter edges). No frame, bevel, cap, or scrubber head draws outside them. Desktop-era bars fill the row's thickness. Thin native bars (Holo, iOS, YouTube, Material, Win 11, Wavy) keep their own height share, centred in the row.

- **MS-DOS** — MS-DOS 6 Setup: a text-mode row on blue `#0000AA` covered in `░` light-shade dots, filling with yellow `█` blocks one character cell (half the thickness) at a time.
- **System 7** — classic Mac OS Finder copy: a 1 px black frame filling solid black.
- **Win 3.1** — Setup gauge: black frame, white box, navy `#000080` fill, bold centred percent that is navy over the box and white over the fill (clipped second pass).
- **Win 95** — a 1 px sunken edge (`#808080` top-left, white bottom-right) round a button-face `#C0C0C0` well with discrete navy blocks about ⅔ as wide as tall. Only whole blocks are drawn, except at 100%.
- **Mac OS 9** — Platinum: dark frame, recessed grey trough gradient, lavender-blue cylindrical fill ending on a darker edge.
- **Java Metal** — Swing `JProgressBar`, Steel theme: etched `#666666`/white edge, `#CCCCCC` well, `#9999CC` fill with a `#CCCCFF` highlight and `#666699` shadow, painted string centred and inverted.
- **Win XP** — Luna: rounded `#686868` frame, white trough, glossy green chunks (light–saturated–light) with 2 px gaps.
- **Aqua** — Mac OS X: recessed pill trough, glossy blue pill with a top gloss and white diagonal barber-pole stripes that drift along the bar.
- **Win 7** — Vista/7 Aero: grey rounded trough, glossy two-tone continuous green, and a white highlight sweeping along the fill every 2.6 s (each row offset).
- **Ubuntu** — GTK Ambiance: inset grey trough, orange gradient fill with a darker rim, centred text that inverts to white over the fill.
- **Holo** — Android 4: a flat Holo-blue `#33B5E5` line over a flat grey track, square ends, ¼ of the thickness.
- **Bootstrap** — `.progress-bar-striped.progress-bar-animated`: `#E9ECEF` track, `#0D6EFD` bar, 45° white 15% stripes moving one tile per second, white label centred in the filled part once it fits.
- **iOS** — `UIProgressView`: a thin (0.3×) fully rounded `#E3E3E8` track and `#007AFF` progress.
- **Win 10** — Windows 8/10 flat: `#E6E6E6` trough in a 1 px `#BCBCBC` frame, flat `#06B025` fill.
- **YouTube** — the player bar: grey track, a lighter buffered span ahead, the red played span, and a red scrubber head kept inside the bar ends.
- **Material** — Material 3 linear: a 4 dp-proportioned rounded `#6750A4` indicator, a gap, the remaining `#E8DEF8` track, and a stop dot.
- **Win 11** — Fluent: a 1 px `#8A8A8A` track under a 3 px-proportioned rounded `#005FB8` indicator.
- **Wavy** — Material 3 Expressive wavy linear: the active stroke rides a travelling sine that flattens below 10% and above 95%, followed by a gap, a flat track, and a stop dot.
- **섞기** (default) — the eighteen looks cycle by row.

Revised the same day after the user rejected the first set. The first set had fourteen looks and right-aligned percent labels at the row end for most of them. The user found about half the looks below standard and the side labels wrong, and the first skate merely restarted bars. That first set's weak entries were replaced: a `[####....] 45%` ASCII DOS bar, iOS / Material / Win 11 / Wavy drawn at full row thickness, and a Win 95 face grey that spilled past the bar ends. MS-DOS Setup, System 7, Java Metal, Holo, and YouTube were added.

`% 표시` (on by default) only affects the styles that print a number inside the bar natively: Win 3.1, Java Metal, and Ubuntu (centred, inverting over the fill) and Bootstrap (inside the fill). Below 14 px thickness no number is drawn. No look prints a number beside the bar. The bottom-right `옵션 · <look> <thickness>` trigger opens a panel with a two-column look grid, a thickness row, and the toggle. The colours and proportions come from platform specifications and common screenshots. They are not traced from native renders.

## Rendering

One 2D canvas with DPR capped at 2. On every layout, look, or toggle change, rows are grouped by look and each look is prepared once. Static chrome (frames, bevels, troughs, Win 11 hairlines) is painted into one cached layer canvas. Fill paints are cached as patterns with a tile one row pitch tall, anchored at the stack's top, so one `fill()` covers every row of a look. Animated stripes only update the pattern's transform matrix. A frame is one `drawImage` of the layer, then about one to three batched `Path2D` fills or strokes per look, plus the inside labels from cached percent strings. Win 7's sweep is the only per-row draw. The loop sleeps once every bar holds at 100%, so stripes, sweeps, and waves freeze until a finger moves a bar.

## Checks

- `node --test components/mobile/ui-collage/loading/2/model/bars.test.mjs` checks: centred rows that fit (≥ 10 rows at every thickness, 15–30 at 24 px), monotone 0→100% hold, varied pace, segment–rectangle test, skating that sets crossed rows to the crossing position (vertical swipe at mid-screen → 50%, diagonal ramp, scrub along a bar, tap) and then resumes loading, and resize by index.
- A mock-canvas smoke run prepared and drew all eighteen looks × four thicknesses × toggle at 0, 37, 99.9 and 100% without exceptions or non-finite coordinates.

Unmeasured: no runtime or browser verification has been done. Frame timing on phones (especially Wavy at 8 px with about 4 rows per look in 섞기, or all Wavy rows at 8 px), text metrics of the fallback fonts, pattern alignment at fractional device pixel ratios, and the feel of the skate under a real finger are all pending explicit runtime authorization.
