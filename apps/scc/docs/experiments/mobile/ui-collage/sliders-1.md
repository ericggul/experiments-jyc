# Mobile ui-collage/sliders/1 — vertical sliders set by finger skating

- **Route:** `/mobile/ui-collage/sliders/1`
- **Date:** 2026-10-03
- **Baseline:** `ui-collage/loading/1`'s grid, captured-pointer skating and bottom-right option control. The changed variable: skating writes a value into each crossed control instead of restarting it.

The screen is tiled with columns of narrow vertical sliders. The columns are centred horizontally inside a 16 px + safe-area gutter. The width option (16, 20 default, 28 px) sets the column at normal density, with a gap of 35% of the width (at least 4 px). The `밀도` option narrows both the column and the gap, keeping widths even so every column centre sits on a whole pixel:

| Width | 보통 | 1.5× | 2× |
| --- | --- | --- | --- |
| 16 | 16 + 6 gap | 10 + 4 (1.57×) | 8 + 3 (2.0×) |
| 20 | 20 + 7 | 12 + 5 (1.59×) | 10 + 4 (1.93×) |
| 28 | 28 + 10 | 18 + 7 (1.52×) | 14 + 5 (2.0×) |

At width 20, a 390 px viewport holds 13 / 21 / 25 columns. The default is width 20 at 1.5×. It reads as a dense equaliser while every look keeps its thumb, bevel and colour. The length option stacks 1 (default), 2 or 4 rows. The rows fill the height between the gutters, with a gap of 1.2× the column width (at least 16 px) between rows.

## Shared ends

Every slider in a row has the same whole-pixel top and bottom. Every look draws its visible track, trough, slot, frame or pill from exactly that top to exactly that bottom. Strokes are inset half a pixel, so their outer edge lands on the line, and round caps end at the line. This holds in mixed columns and in every stacked row. `model/looks.ts` gives each look a `reach`: how far its thumb, including any baked shadow, extends along the track, as a share of the width. The renderers size their thumb sprites and circles from it. The layout's single travel inset is `ceil(max reach × width + 1)`, so no thumb crosses either end, even after rounding and device-pixel snapping. Because the inset is shared, the same value puts every look's thumb centre on the same y.

## Input

Each pointer is captured, and every segment between coalesced samples is tested against each slider's hit area: its column plus half the gaps around it. Outer columns and rows reach the screen edge. A crossed slider takes the finger's height. If the segment ends on that slider, the end point sets the value; otherwise the height where the segment crosses the column centre does. Sweeping across the screen draws the finger's curve into the sliders like a graphic equaliser, and a tap or vertical drag sets one slider. Several fingers act independently. The thumb's travel stops 0.6× the width short of each end, and heights beyond the travel clamp to 0% or 100%. Values start at a flat 50%, which reads as an untouched equaliser. They persist through look changes. Through width, density, length and viewport changes they stay at their place on screen: each new column takes the old column nearest its centre, and a new lower row copies the old bottom row. A thumb glides to a new value over 100 ms with a cubic ease-out, and a new crossing restarts the glide from where the thumb is. The model is `model/sliders.ts`, tested in `model/sliders.test.mjs`. The tests cover the centred layout and stack fit, value/position inversion and clamping, a tap setting only its slider, a sweep reproducing the path's heights, a sweep through one stacked row leaving the others, the ease settling within 100 ms and then sleeping, and relayout keeping values. They also cover density ratios, and the alignment invariant: across viewports, widths, densities and stacks, the layout edges are whole pixels, each row shares one top, and every look's reach stays inside the ends at 0% and 100%.

## Looks (`screen/looks.ts`), oldest to newest

Geometry is designed at a 20 px column and scales with the width. Rails, slots and wells use even widths, sprites are whole-pixel sized, and tick marks sit on whole pixels. The Windows 4 px channels drop to 2 px below a 15 px column (the 2× density at widths 16 and 20). Thumbs are positioned to device pixels.

- **DJ fader** — a black slot between grey scale marks, and a ribbed dark rubber cap with a white index line.
- **Win 95** — the 95/98 trackbar: a 4 px sunken channel (grey/black over light grey/white), black ticks on the right, and a #C0C0C0 thumb with a white/grey/black bevel pointing at the ticks.
- **Platinum** — Mac OS 8/9: a rounded dark-grey well with a black rim, and a light grey beveled thumb with three grip ridges.
- **Winamp** — Winamp 2 equaliser band: a dark slot whose bar is lit by a fixed green → yellow → red gradient up the slot, and a small grey beveled knob with a groove.
- **Aqua** — Mac OS X 10.0–10.4: a grey cylindrical channel, and a blue gel knob with a white top gloss, a pale bottom glow and a soft shadow.
- **XP** — Luna trackbar: a pale 4 px channel with a grey rim, grey ticks, and a white-to-cream pointed thumb with a blue-grey outline and the green edge on its pointer.
- **Win 7** — Aero trackbar: a light 4 px channel and a rectangular thumb with the split glossy grey gradient and a white inner highlight.
- **Holo** — Android 4 seek bar: a thin grey track, #33B5E5 progress, and a blue dot in a translucent halo.
- **iOS 6** — an inset white maximum track, a glossy blue gradient minimum track, and a silver knob with a drop shadow.
- **iOS 7** — a 2 px #B7B7B7 track, #007AFF fill, and a white knob with a soft shadow and a hairline.
- **Control Center** — a full-height pill of light grey that fills white from the bottom, with a hairline rim and no knob. Its fill covers the whole pill height, so near the ends it differs from the finger by up to the travel inset.
- **Material 2** — MDC: a thin track at 24% of #6200EE, a #6200EE active track and a solid circle thumb.
- **Chrome** — the Chrome 83+ `<input type=range>`: a #EFEFEF track with a #B2B2B2 rim, #0075FF fill and a solid #0075FF thumb.
- **Win 11** — Fluent: a 4 px grey rail, #005FB8 fill, and a white thumb with a faint rim and an accent inner dot.
- **Material 3** — the 2024 slider: a thick track split by gaps around a full-width bar handle, #6750A4 active below, #E8DEF8 inactive above (outer corners round, inner corners small), and a stop dot at the inactive end.
- **섞기** — the fifteen looks cycle by column.

The look defaults to `섞기` (changed from iOS 7 at the user's request, 2026-10-03). The bottom-right `옵션 · <look> <width>` control (with ` · 1.5×` or ` · 2×` appended when dense) opens a panel with the look list in two columns, a width row, a density row (`보통`, `1.5×`, `2×`), a length row (`1단`, `2단`, `4단`) and a `소리` toggle (on).

The clones are reproduced from platform specifications and remembered screenshots, not traced from native renders.

## Sound (2026-10-03)

Each slider is a note: its height maps bottom to top onto one C major pentatonic scale from C4 to C7 (16 steps, `model/pitch.ts`). When skating moves a slider to a different step, that note sounds, so a stroke across the sliders plays the curve it draws as a rising and falling line. A pentatonic scale was chosen because no two of its notes form a semitone or a tritone. Any curve, including several fingers at once, stays consonant without chord logic. A slider that stays on its step is silent; a held finger makes no drone.

Notes set off in the same instant (one sweep crossing many columns in a frame) are spaced 28 ms apart into a short arpeggio. Anything more than 0.3 s behind is dropped, so fast scribbles cannot pile up a backlog. The voice is deliberately plain: one Tone.js `PolySynth` of triangle tones (4 ms attack, 0.45 s decay, no sustain, 0.5 s release, at most 16 voices), a 4.2 kHz low-pass, a short room reverb (2.2 s decay, 18% wet), and a −3 dB limiter, with the synth at −4 dB. Higher notes play slightly softer so the range sounds even. Tone.js is imported lazily on mount. Audio is unlocked from window-level `pointerup`, `touchend`, `click` and `keydown` listeners, because touch grants audio permission only at the end of a gesture. Each unlock declares `navigator.audioSession.type = "playback"` where supported, so iOS does not mute Web Audio with the silent switch. The first unlock also starts a one-sample buffer, which older iOS needs. Tests (`model/pitch.test.mjs`) cover the scale range and direction, the absence of semitones and tritones, and the arpeggio spacing and overflow. **First phone report (same day): no sound at all.** The diagnosis was static only (no runtime check). The probable causes were:

- audio unlocking only from `pointerdown`/`pointerup` on the canvas;
- no `audioSession` declaration, so the iOS silent switch muted Web Audio;
- a quiet voice (−14 dB) in a C3–C6 range that phone speakers barely reproduce.

All three were changed as described above. Whether sound now plays, and its latency, are unverified until the user retries.

## Drawing

All sliders share one 2D canvas, with DPR capped at 2. Sliders are grouped by look, and each look draws its whole group at once. Flat parts (tracks, fills, ticks, Material/Chrome/Holo thumbs) are added to one `Path2D` per colour and filled or stroked once. Gradient, bevel and shadow parts (thumbs, caps, the Aqua and iOS 6 tracks) are sprites painted once per look, width and pixel ratio. Tracks of variable length use a three-slice vertical stretch. The Winamp gradient is cached per row and dropped on relayout. A full repaint happens only on resize or an option change. Otherwise only sliders whose value changed, or whose thumb is gliding, are repainted: each one clears its own cell (column plus half the gaps), which every look stays inside. The frame loop runs only while a thumb glides and sleeps otherwise.

## Unmeasured

No runtime verification was authorised. Unmeasured: frame timing on a phone, sprite sharpness at DPR 2 and below, safe-area insets on a real device, how recognisable each look is at the 8–10 px dense columns, the full-height Control Center fill mismatch at the ends, and how a skate feels under a real finger.
