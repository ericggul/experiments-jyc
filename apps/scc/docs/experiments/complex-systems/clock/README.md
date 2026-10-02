# Recursive clock experiment

Route: `/clock/1`, owned by the filesystem-only `complex-systems` group.

Date: 2026-08-28.

## Interface premise

1. **Participant situation:** one person encounters an uninterrupted field of
   analogue clocks, each held at the tip of an earlier clock hand.
2. **Primary parameters:** child-clock radius ratio, initially `0.60`, and
   descendant depth, initially `4`.
3. **Perceptual job:** follow how the three distinct hour, minute, and second
   rotations branch into increasingly small, overlapping clock paths.
4. **Interaction job:** open the lower control bar, adjust scale or depth, and
   anticipate whether the recursive field opens or contracts. Trace may be
   enabled to record the actual moving centers of descendant clocks.
5. **Wrapper justification:** a clock face, its hands, and the attachment point
   are the model's literal geometry. The field has no title, legend, dashboard,
   timer, or artificial presentation motion.
6. **System family:** no prior complex-systems visual grammar is inherited. The
   warm hand colours are functional: gold identifies hour hands, ivory minute
   hands, and rust second hands—the three possible holding relations.
7. **Removal test:** clock rims, hand colours, centers, the compact expandable
   control bar, and trace remain. Numerals, metadata, pause/reset controls, charts,
   and decorative backgrounds do not improve the recursive relation.

## Model card — clock/1

- **System object and boundary:** a deliberately synthetic, deterministic
  kinematic tree of analogue clocks. This is a composition of rotations that
  references the visual accumulation of a pendulum chain; it makes no claim to
  be a double-pendulum or mechanical clock simulation. There are no masses,
  joints, torques, gravity, energy transfer, or chaos calculation.
- **Entity state and local action:** every clock stores a stable lineage ID,
  depth, center, radius, local phase, and rate. It exposes an hour, minute, and
  second hand at conventional clockwise periods. Each hand places one child
  clock exactly at its own tip. A child inherits a fixed phase increment and a
  modest rate multiplier from the hand holding it (`0.86`, `1.00`, or `1.14`),
  preventing the tree from collapsing into three synchronized copies while
  preserving the internal hour/minute/second relation of each clock.
- **Shared state:** the tree is a pure geometric derivation of elapsed time,
  child-radius ratio, and recursion depth. It has no hidden random state. The
  optional trace is a renderer-side record of the derived clock centers, never
  an input to the clock geometry.
- **Macro observable:** the outer envelope and the density of crossings emerge
  from repeated hand-tip attachment; they can change only when the defined
  rotations and radius relation are changed.
- **Participant intervention and contrast:** the expandable control bar changes
  the actual radius multiplier, clamped to `0.42–0.62`, and the descendant
  depth from `1` through `6`. The default is four descendant generations
  beneath the root (121 clocks total); higher depths are explicit rather than
  silently added. The root begins at the browser's current local clock time.
- **Causal checks:** pure-model tests assert the complete three-way tree count,
  exact child-to-parent hand-tip attachment, conventional hand orientation, and
  a root-clock diameter equal to `0.8 × min(viewport width, viewport height)`.
  Descendant clocks may intentionally extend past the viewport at that scale.

## Bounded trial

- **Baseline:** a new field-first recursive-rotation study; no previous SCC
  visual route is treated as its design baseline.
- **Changed variables:** child-radius ratio and explicit descendant depth; trace
  records, but does not alter, the same geometric state.
- **Retained invariants:** every clock has all three hands, every hand carries a
  child until the selected depth, the root is centered with a diameter of
  `0.8 × min(viewport width, viewport height)`, and child centers equal their
  parent hand tips.
- **Observed result:** pending an explicit browser-verification request.
- **Unresolved question:** should a later, separate route vary the branching
  rule itself (for example, only minute-hand inheritance) while preserving this
  four-generation baseline?

## clock/2 — finger-skated clock grid

Route: `/clock/2`. Date: 2026-10-02.

- **Tested relation:** whether a running clock can record a finger-skating
  gesture. The hour hand records where the gesture went; the minute hand shows
  where the finger is now.
- **Baseline:** clock/1 provides the face: the rim, 12 ticks with longer
  quarter ticks, and `0.72` face opacity. It also provides the gold hour /
  ivory minute palette and the centre dot. `mobile/finger-skating/1` provides
  captured multi-pointer input, coalesced samples, and a state that persists
  after release. This is a standalone fork that imports neither.
- **Grid:** square-ish cells of `clamp(min(w, h) / 14, 50, 72)` px. That is
  50 px on phones and about 64 px at 1440 × 900. The column and row counts are
  rounded so the cells fill the viewport edge to edge. The rim radius is
  `0.44 ×` the cell. There is no second hand.
- **One geared time per clock:** each clock shows `local real time + offset`,
  and both hands derive from that single time. Every clock therefore keeps
  running at one minute per minute. Moving the hour hand also sweeps the minute
  hand through its full turns: going from 2:30 to 5:31 turns the minute hand
  1,086°. Gestures change only the offset.
- **Background:** `#0a0a09`, darker than clock/1's `#1c1d1b`, at the user's
  request.
- **Hour hand (exit direction):** each movement segment is tested against the
  rims near it. When a segment crosses a rim outward, the clock is set to the
  time whose minute hand points at the finger and whose hour hand is nearest
  the exit direction. Because the hands are geared, the hour hand lands within
  ±15° of the exit rather than exactly on it. The clock takes the shorter way
  round the 12-hour dial. Fast swipes that pass through a clock between two
  samples are included.
- **Minute hand (current direction):** while any finger is down, each frame
  turns every minute hand the shorter way (at most ±30 minutes) toward its
  nearest finger. The geared hour hand moves one twelfth as far. After release,
  the clocks resume real time from their new offsets.
- **Motion:** each clock's offset follows a slightly underdamped spring
  (k = 70, ζ ≈ 0.72), so large time jumps visibly whirl the minute hand. The
  faces are drawn once per resize on a separate canvas, and each frame draws
  only the hands. Frames run at the display rate while a finger is down or a
  clock is still settling, and once per second otherwise. DPR is capped at 1.5.
  Resize copies each offset from the nearest previous clock.
- **Checks:** pure-model tests cover edge-to-edge 50 px phone cells, the
  exit-point geometry, the geared hand ↔ time round trip, a 2:30 → about 5:30
  exit sweeping the minute hand more than 1,000°, nearest-finger minute aim with
  a bounded hour drift, spring settling, and resize retention. Typecheck and
  lint pass.
- **Observed result:** pending an explicit browser-verification request.
- **Unresolved question:** should the minute hand stay global or fall off
  locally like finger-skating opt 1?

## clock/3 — two-tier fractal, finger-skated

Route: `/clock/3`. Date: 2026-10-02.

- **Tested relation:** whether clock/2's skating rule still reads when each
  clock carries clocks inside it.
- **Baseline:** clock/2, which keeps the skating policy, geared time, real-time
  ticking, motion spring, and `#0a0a09` background. clock/1 provides the
  hand-tip attachment and the per-generation fade (face `0.72 → 0.62`, hands
  `0.96 → 0.86`). This is a standalone fork that imports neither.
- **Changed variable:** two tiers. Every grid clock (the parent) carries one
  child clock at its hour-hand tip and one at its minute-hand tip. A child is a
  full clock with its own time offset, and the skating rule applies to it
  independently.
- **Size:** the children keep clock/2's size, a `clamp(min(w, h) / 14, 50, 72)`
  px cell with a 0.44 rim radius, so a parent cell is `4 ×` that (child radius
  `0.25 ×` parent). The child radius is capped at `0.26 ×` the parent radius,
  so the minute-tip child stays inside the parent rim. On 390 × 844 that gives
  2 × 4 parents with children exactly the size of clock/2's clocks. At
  1440 × 900 it gives 6 × 3 parents with 27.5 px children (clock/2's would be
  28.2 px).
- **Motion coupling:** a child moves whenever its parent's hand turns, so the
  exit test uses each child's center at the time of the stroke. Parent and
  child minute hands each aim at their own nearest finger every frame while a
  finger is down.
- **Rendering:** parent faces use clock/1's face, drawn once per resize. Child
  faces (with ticks), parent hands (clock/1's widths), and child hands
  (clock/2's widths) are redrawn each frame. Clock counts are small (16
  children on a phone), so DPR is capped at 2.
- **Checks:** pure-model tests cover edge-to-edge parents with clock/2-sized
  children, children on the parent hand tips and inside the rim, a child-only
  exit leaving the parent unchanged, the 2:30 → about 5:30 parent sweep, parent
  and child nearest-finger aim, settling, and resize retention. Typecheck and
  lint pass.
- **Observed result:** pending an explicit browser-verification request.
- **Unresolved question:** should a child's time inherit its parent's, as with
  clock/1's phase inheritance, rather than staying independent?
