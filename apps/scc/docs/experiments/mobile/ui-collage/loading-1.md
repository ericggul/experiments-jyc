# Mobile ui-collage/loading/1 — loaders restarted by finger skating

- **Route:** `/mobile/ui-collage/loading/1` (first built at `/mobile/loading/1` on the same day and moved before it was committed)
- **Date:** 2026-10-03
- **Baseline:** `finger-skating/default`'s captured-pointer path and bottom-right option control, on a grid of familiar loading indicators instead of arrows.

The whole viewport is a grid of circular loading indicators, centred on both axes, with a gutter of a third of the indicator size (at least 8 px). Every indicator starts at 0% and fills to 100% by itself, then holds there. A finger skating across the grid restarts every indicator whose cell its path crosses (within half a pitch of the cell centre) at 0%. Multiple fingers and coalesced pointer samples are segment-tested, so a fast swipe does not skip cells.

## Loads

Each load has its own mean duration of 4–14 s and advances in bursts of 0.25–1.45 s: a fifth of the bursts stall; the rest run at 0.35–1.65× the mean pace. After a restart a load first waits 0.15–0.65 s for its "request" before progress appears. Once every load holds at 100%, the frame loop stops until a finger restarts one. Resizing with the same indicator size keeps each load at the same row and column; a new size starts a new grid at 0%. The model is `model/loads.ts` and is tested in `model/loads.test.mjs` (centred grid, monotone 0→100% hold, varied pace, restart only along the path, resize).

## Indicators (`screen/indicators.ts`)

Determinate clones of twelve common circular loaders, in their own colours on white:

- **iOS** — `UIActivityIndicatorView` (iOS 13+): eight rounded system-grey spokes stepping one spoke per 1/8 s.
- **iOS 6** — the earlier twelve-spoke grey indicator, with finer progress steps.
- **Material** — Material 3 determinate `CircularProgressIndicator`: 48 dp container, 40 dp ring, 4 dp rounded stroke, primary `#6750A4` arc, a 4 dp gap, `#E8DEF8` track.
- **Wavy** — Material 3 Expressive `CircularWavyProgressIndicator`: the active arc rides a travelling sine (about 15 dp wavelength, 1.6 dp amplitude) that flattens near 0% and 100%.
- **App Store** — the download button: a spinning grey "waiting" arc before the first byte, then a thin grey ring, the blue progress arc, and the blue rounded stop square.
- **Pie** — the iOS pie (Files, AirDrop, attachments): an outline ring and an inset wedge.
- **Telegram** — media upload: a translucent black disc, a white arc that also turns, and a cancel cross.
- **Watch** — Apple Watch activity ring: a thick round-capped `#FA114F` ring over its dim track.
- **Windows 11** — WinUI 3 `ProgressRing`: 4 px accent `#005FB8` stroke on a 32 px ring.
- **Gauge** — a 270° green arc open at the bottom, as in storage and battery-care screens.
- **Ticks** — a watch-face ring of thirty radial ticks lit clockwise.
- **Liquid** — a circle whose water level rises with a small travelling wave.
- **섞기** — the twelve looks cycle by cell index.

**Progress legibility (iOS).** In the first version the stepping shimmer also dimmed reached spokes to 0.3, which made them hard to tell from the faint unreached ones; the user could not read 0→100%. Reached spokes now keep the shimmer but never fall below half opacity, and unreached spokes stay at about 0.08. A partly reached spoke fades in proportionally. At 100% every spoke is solid and still.

**Percentage.** `% 숫자` shows the integer percentage at each indicator's centre in that platform's type (SF/system for Apple looks, Roboto for Material, Segoe for Windows), at least 7 px. It replaces the App Store stop square and the Telegram cross. On the pie it is drawn white in `difference` mode, so it reads dark on the page and light on the wedge.

Sizes are 32, 48 (default), 64, and 100 px; a 390 × 844 viewport holds 6 × 13 cells at 48 px and 9 × 19 at 32 px. The bottom-right `옵션` control opens a panel with the look list (two columns), a size row, and the `% 숫자` toggle. The look defaults to Gauge (iOS until the user changed it, 2026-10-03) with the percentage off. Changing the look or the percentage keeps each load's progress.

## Performance

Each frame clears the canvas and redraws every cell, but every cell adds its geometry to shared `Path2D` layers (one per colour, width, and opacity). The whole grid is then 2–13 stroke/fill calls instead of up to eight per indicator. iOS spoke opacity is quantised into 12 steps for this. Cell centres are precomputed per grid, and percentage strings are cached. In Node with a mocked canvas at 32 px (171 cells), building one frame takes 0.02–0.09 ms of JavaScript (Wavy and Ticks are the highest). With `% 숫자` on, there are about 170 `fillText` calls. Canvas DPR is capped at 2 because the strokes are fine.

The geometry is reproduced from the platform specifications and common screenshots, not traced from native renders. GPU/raster time on a phone, and the feel of the skate under a real finger, are unmeasured pending explicit runtime authorization.
