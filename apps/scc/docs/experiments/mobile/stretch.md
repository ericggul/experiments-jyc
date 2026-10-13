# Stretch — /mobile/transform/stretch/[clone]

2026-10-13. Baseline: each preserved `clone/1`–`clone/14` component, unedited. Changed variable: the height of every photograph, multiplied by one factor (×0.3 to ×12, logarithmic slider, ×3.0 on entry) while width stays. A round icon-only button at the lower right (above the bottom tab bar at 640px and narrower) opens the slider and its value.

Invariants: no clone code is edited, no capture or canvas is used, and the clone stays interactive on the live DOM. The control is marked `data-stretch-control` and excluded.

Method (`components/mobile/transform/stretch/stretch.ts`): photos are `img`, `video`, and elements with a `url()` background image (not SVG), skipping anything under 32px on both sides. Each pass restores all previous inline values, measures at ×1, then sets explicit `height`, `min-height`, `max-height`, `aspect-ratio: auto` on the photo and on its frames, pins the photo width, and sets `object-fit: fill` (or `background-size: 100% 100%`). Styles are written with `important` and the prior inline values are stored and restored on unmount or at ×1. A MutationObserver, image `load` events, and resize schedule a new pass; scroll offsets are preserved across it.

Frames (same day, after the user asked that everything stretch proportionally). The first pass grew only ancestors exactly as tall as the photo, so in `/11` the story rings and the post-header ring (3 px padding) stayed at their old height and clipped or spilled the stretched avatars. A frame is now any ancestor at most 24 px taller than the photo (an aspect box, a ring, a padded header). It takes the photo's change in height, not the factor, so its padding stays. Growth stops at the first box that holds more than the photo, scrolls, is fixed, or is at least 90 % of the screen's height. That last rule is for TikTok's full-screen video page: when that page grew too, the caption and side actions anchored to its bottom left the screen. Now the video stretches inside the page and the controls stay where they are.

Checks (2026-10-13, Chrome, hidden automation tab with a MessageChannel frame shim, 1217 × 703 window, clones at their centred desktop width):
- `/11` at ×3 and ×12: story rings, labels, the post-header ring and the feed photos grew together, with no photo clipped by its frame.
- `/12`: the video stretched inside the screen, and the creator avatar column grew upwards with the avatar.
- Earlier, before the frame rule, ×0.3, ×3 and ×12 were stepped on `/11`–`/14` with the slider.

- `/13` after the frame rule: avatars went from 40 to 120 px and the post rows grew with them; post photos were 744 px.
- `/14` after the frame rule: the hero thumbnail stretched and pushed the feed down.

The shared dev server showed an unrelated `mobile/suneung` font build error over these pages; the pages themselves rendered underneath it. Unverified: real devices, frame cost on long feeds, and wrappers whose height is set by a sibling (a shrunken factor can clip text there).

**Content only, and live (2026-10-13, later).**
- **Content only.** The user asked that only content pictures stretch, not pictures that are part of the interface. A picture now stretches only if it is at least 64 × 48 px and is not cut into a circle, whether by its own radius or by a same-width frame within three levels. So profile pictures in story rings, post headers, comment rows, tab bars and channel rows keep their size. Post photos, videos, thumbnails and Shorts stretch.
  - Checked on `/11`–`/14`: only the content pictures stretched. Avatars of 79, 86, 45 and 36 px kept their size. `/13`'s 40 px avatars have their own inline size from the clone and stayed 40 × 40.
- **Live.** The engine now plans once and then only writes. It measures at ×1 when the page changes, and applying a factor only writes heights, so the factor can change every frame.
  - The panel's 움직임 group switches between 고정 and **실시간으로 출렁임**, live motion (`motion.ts`). The factor follows a sum of four sines (centres 0.035, 0.11, 0.27 and 0.6 Hz), read on a log scale between ×0.3 and ×12.
  - Each frequency wanders by an Ornstein–Uhlenbeck process. Phase integrates frequency, so no sine jumps. Each weight is a noise-kicked damped spring, so the mix also changes smoothly.
  - The curve is therefore continuous but turns unpredictably and never repeats. `motion.test.mjs` checks the bounds, that one frame moves the factor by under 12 % in log terms, and that two seeds differ.
  - Touching the slider stops live mode at the current value.
  - Checked on `/11` (hidden tab with a frame shim): over 5 s, sampled every 0.25 s, the factor ran ×4.0 → ×8.3 → ×2.0 → ×0.4. The median frame cost was 6.9 ms; the one 120 ms frame was a re-plan.

**Panels redesigned (same day).** The user could not tell from the earlier compact panels what each control did. Both panels now follow bubble/3's grammar: a heading, a faint label over each group, grey chips that turn black when chosen, slider rows that show their value, and 기본값으로 at the foot. The open trigger turns white. stretch says in one line what is stretched and what is not. substitution/3 names each typeface in itself, and shows the frame weight as 없음 or in px.
