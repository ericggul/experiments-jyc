# Mobile ui-collage/loading/3 — LOADING as the progress bar

- **Route:** `/mobile/ui-collage/loading/3`
- **Date:** 2026-10-13
- **Baseline:** [`loading/2`](loading-2.md): its bursty load model and seek-by-skating (copied, not imported).
- **Changed variable:** the indicator. It is the first step of a *semantic substitution* (의미론적 치환): the bar is replaced by the word it stands for.

Each row is one line of its word repeated (`LOADING LOADING …`, ten times by default, single spaces). Its ink is squeezed or stretched to exactly the bar's rectangle. Ink height equals the row thickness, the first glyph sits on the left edge of the screen, and the last on the right. The unfilled part draws at opacity 0.1. The filled span (0 → progress, a hard vertical cut through the letters) draws at opacity 1. Every row fills left to right, including Arabic and Hebrew. The stack fills the whole viewport with no margin at all: no gutter and no safe-area inset. As many rows as fit with a gap of at least ⅛ of the thickness (≥ 2 px) are placed, and the leftover height is shared between the gaps, so the first row touches the top edge and the last touches the bottom. Loading is unchanged from loading/2. A finger crossing a row sets its load to the crossing position, and the drawn row glides there (see Seek glide), pauses, then carries on.

## Options (bottom-right ⋯)

One round symbol opens a panel of three rows:

- **Language:** English (default) or 다국어.
- **Thickness:** 8, 16 (default), 24, or 40.
- **Words per row:** a slider from ×5 to ×15 in steps of 1 (default ×10).

## Random faces (`screen/fonts.ts`, `screen/cast.ts`)

Each visit draws a fresh seed. Every row draws its face uniformly at random from its script's pool without replacement: a Fisher–Yates shuffled deck, reshuffled when it runs out. In 다국어, each row first draws a language the same way, from 23 entries (`screen/words.ts`): English, French, Spanish, German, Italian, Portuguese, Turkish, Polish, Czech, Swedish, Finnish, Indonesian, Vietnamese, Russian, Ukrainian, Greek, Korean, Japanese, Chinese, Arabic, Hebrew, Hindi, and Thai. Draws are sequential, so a longer stack (thinner rows) keeps its first rows' faces.

The Latin pool takes ten faces from each of Google Fonts' five categories, so each category is equally likely:

- **sans-serif:** Inter, Montserrat, Poppins, Work Sans, …
- **serif:** Playfair Display, EB Garamond, Roboto Slab, …
- **display:** Bungee, Monoton, Six Caps, UnifrakturMaguntia, …
- **handwriting:** Caveat, Pacifico, Rock Salt, …
- **monospace:** Space Mono, VT323, Press Start 2P, …

Weights also vary, from 100 to 900. The other scripts have smaller pools of faces that carry them: 5–12 each for Cyrillic, Greek, Hangul, Japanese, Han, Arabic, Hebrew, Devanagari, and Thai.

Faces load at runtime from the Google Fonts CSS API with `text=` set to the row's characters. Each face and text pair is one small file, registered as a `FontFace` under its own alias. Rows stay blank until the first cast loads. After that, a changed option keeps the old lines until the new ones are ready. A face that fails falls back to the system face.

History, all on 2026-10-13:

- A 흑백/컬러 option (every row `hsl(h 100% 50%)`, hues stepped by the golden angle) was added, then removed at the user's request.
- Words per row began as buttons ×1, ×2, ×5, ×10, ×20 and became the ×5–×15 slider.

- The first set was 27 condensed grotesques (Anton, Oswald, League Gothic, …). Once squeezed into the same box they read as one family.
- The second was a hand-picked one-per-genre list in a fixed order, which leaned toward serif. The user asked for diversity and randomness in the plain sense, hence the balanced pool and random draws.
- That set was loaded with roughly 85 `next/font/google` loaders, CJK families included. The running Turbopack dev server failed to resolve their downloads ("Can't resolve '@vercel/turbopack-next/internal/font/google/font'"), Latin fonts too, so loading moved to the runtime CSS API.

## Seek glide

`followLoads` (`model/bars.ts`, shared by loading/2) is a critically damped spring: the SmoothDamp update from *Game Programming Gems 4*, with a 0.06 s smoothing time (0.2 s at first, then 0.12 s; the user asked twice for a more immediate response). It moves each drawn value toward its load. A seek glides there without overshoot, and the motion does not depend on the frame rate. The load itself still jumps at once, so skating logic is unchanged. Plain exponential smoothing (`shown += (target − shown) · k`) was considered and rejected: it lurches fastest on the first frame and its feel depends on the frame rate.

## Rendering

One 2D canvas, DPR capped at 2. On a layout or option change every row's line is rasterised once into a layer canvas, fitted from `measureText` ink bounds. Clamped source rects keep the edge rows drawing in Safari. A frame is a white fill, the layer at alpha 0.1, then one source-rect `drawImage` per row for its filled span. The loop sleeps once every row is full and has caught up.

## Checks

- `node --test components/mobile/ui-collage/loading/3/model/bars.test.mjs` passes: rows, loads, skating, resize, and the glide (monotone, no overshoot, settles, similar at 30 and 60 fps).
- Every family and weight in the pools returns a font from the CSS API (104 requests).
- Browser check on 2026-10-13 at a 390 px-wide field (desktop Chrome, hidden tab under an rAF shim):
  - English shows mixed sans, serif, display, handwriting, and mono rows.
  - 다국어 draws Korean, Japanese, Chinese, Arabic, Hebrew, Thai, Hindi, Greek, and Cyrillic rows in script faces.
  - A synthetic vertical skate glides rows back to about 30%.
  - The panel and ⋯ trigger render.
  - The stack runs edge to edge.
- Not checked: a real phone, the feel under a real finger, or 8 px legibility.
