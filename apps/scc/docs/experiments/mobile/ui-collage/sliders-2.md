# Mobile ui-collage/sliders/2 — SLIDER as the slider

- **Route:** `/mobile/ui-collage/sliders/2`
- **Date:** 2026-10-13
- **Baseline:** [`sliders/1`](sliders-1.md): skating sets each crossed slider to the finger's height, with its pentatonic sound (sound and pitch copied, not imported).
- **Grammar:** the semantic substitution of [`loading/3`](loading-3.md), turned upright. Its random faces, 다국어 cast, gliding seek, and option control are copied.
- **Changed variable:** the indicator. The slider is replaced by the word it stands for.

## Columns

Each column is one line of its word repeated (`SLIDER SLIDER …`, fourteen times by default, single spaces), turned 90° counter-clockwise. It reads upward from the bottom, and the glyph tops face left. At 100% its ink fills exactly the column's rectangle: ink height equals the column width, the first glyph sits on the bottom edge of the screen, and the last on the top.

The value is how far that line is stretched along the column from the bottom edge, from scaleY(0) to scaleY(1). Every column is always in full black and always holds all of its words; a low value only condenses them toward the bottom. The column's width never changes.

This is 펼침, the default. The first version on the same day stays available as 농담: every line at full length, at full ink below the value and at opacity 0.1 above, like loading/3. The options panel switches between them.

The columns fill the whole viewport with no margin at all: no gutter and no safe-area inset. As many columns as fit with a gap of at least ⅛ of the width (≥ 2 px) are placed, and the leftover width is shared between the gaps. Values start at a flat 50%, as in sliders/1.

## Input

Each pointer is captured, and every segment between coalesced samples is tested against each column's band: the column plus half the gap on each side, full height. A crossed column takes the finger's height. If the segment ends in the band, the end point sets the value; otherwise the height where the segment crosses the column's centre line does. The bottom edge is 0% and the top edge 100%; beyond them the value clamps. There is no thumb, so there is no travel inset. A sweep draws the finger's curve like a graphic equaliser, and a tap or vertical drag sets one column. Several fingers act independently.

How the drawn column follows its value is an option. 부드럽게 is loading/3's critically damped spring, with a 0.06 s smoothing time. 용수철 (default) is an underdamped spring at 3.5 Hz with a damping ratio of 0.25. A jump overshoots the finger's height by about 44%, then bounces two or three times and settles. It is integrated in fixed 1/240 s substeps, so it moves identically at any frame rate. In 펼침 an overshoot past the top or bottom stops at the screen edge. The loop runs only while a column glides. When skating moves a column to a different scale step, that step's note sounds, as in sliders/1: C major pentatonic from C4 at the bottom to C7 at the top, sweeps spaced into a 28 ms arpeggio, Tone.js loaded lazily, and audio unlocked at the end of a gesture.

Relayout (column width or viewport) keeps values in place on screen: each new column takes the value of the old column nearest its centre. Model: `model/columns.ts`.

## Options (bottom-right ⋯)

- **Mode:** 펼침 (default) or 농담.
- **Follow:** 부드럽게 or 용수철 (default since the user's request, same day).
- **Language:** English (`SLIDER`, default) or 다국어. 다국어 draws a random language per column from 23 entries in `screen/words.ts`, for example CURSEUR, SCHIEBEREGLER, ПОЛЗУНОК, 슬라이더, スライダー, 滑块, شريط التمرير, מחוון, and แถบเลื่อน.
- **Column width:** 12, 16 (default), 20, or 28.
- **Words per column:** a slider from ×10 to ×30 (default ×14; it was ×20 at first). At 100%, a column is about twice as long as a loading/3 row, so ×20 would squeeze the type about as hard as loading/3's ×10.
- **소리:** on by default.

Faces are drawn uniformly at random, without replacement, from loading/3's category-balanced pools: ten each of sans-serif, serif, display, handwriting, and monospace for Latin, plus per-script pools. They load at runtime from the Google Fonts CSS API, subset with `text=`.

## Rendering

On layout or option change every column's full-length line is rasterised once into a layer. A frame is a white fill, then one `drawImage` per column. In 펼침, the column's full-height strip is squeezed into `value × height` above the bottom edge. In 농담, the whole layer is drawn at 0.1 first, and each column's strip below its value at full ink.

## Checks

- `node --test components/mobile/ui-collage/sliders/2/model/columns.test.mjs components/mobile/ui-collage/sliders/2/model/pitch.test.mjs` passes. It covers:
  - edge-to-edge layout at every width;
  - value and height inversion and clamping;
  - a tap, a diagonal ramp, and a vertical drag;
  - the glide settling without overshoot and then sleeping;
  - 용수철 peaking at the expected overshoot, crossing the target at least three times, settling, and matching at 30 and 60 fps;
  - relayout keeping values in place;
  - the copied scale tests.
- Browser check on 2026-10-13 at a 390 px-wide field (desktop Chrome, hidden tab under an rAF shim):
  - columns of rotated SLIDER fill the field;
  - a synthetic diagonal skate stretches the columns into a ramp, from squashed to full length, each keeping all its words;
  - 다국어 draws every script.
- Not checked: sound in the browser, a real phone, the feel under a real finger, or legibility at width 12.
