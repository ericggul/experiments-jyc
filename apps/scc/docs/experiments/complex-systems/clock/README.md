# Clock experiments

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

## clock/1 option — skate

Added 2026-10-02. This was briefly a separate `/clock/4` route, removed the same
day at the user's request. In the archive, a variant becomes an option on its
existing experiment rather than a new numbered route.

- **Default unchanged:** `skate off` is the default. The canvas ignores input,
  and with every offset at zero the flat layout reproduces `createClockTree`
  exactly. A model test checks every clock's ID, center, radius, and hand
  angles. Faces are drawn in clock/1's order with the same styles. Rims,
  ticks, hands, and dots are stroked separately as before; only the
  non-overlapping ticks of one face share a stroke.
- **Option:** `expand → skate on` turns on clock/2's finger-skating rule for
  every clock in the tree. Each clock shows its clock/1 time plus a skated
  offset, and its hour and minute hands are geared from that sum.
  - **Hour hand:** when a stroke leaves a rim, the hour hand goes nearest the
    exit direction while the minute hand points at the finger.
  - **Minute hand:** while a finger is down, every minute hand turns each frame
    toward the nearest finger.
  - **Second hand:** keeps clock/1's time.
  - **Subtrees:** because children sit on hand tips, skating a clock swings its
    whole subtree. The exit test uses the last laid-out frame's positions.
  - **Turning it off:** `skate off` springs every clock back to its clock/1
    time.
  - **Depth changes:** offsets are kept by lineage key.
  - **Reduced motion:** simulated time stays frozen, but skating still animates
    while a finger or spring is active.
- **Performance:**
  - The tree is stored in flat pre-order typed arrays (`model/skating.ts`)
    with no per-frame clock objects.
  - Each clock uses 7 draw calls instead of the earlier 17.
  - The model's worst-case cost (finger down, every spring active, 4 stroke
    samples per frame) was measured in Node 26 on the development Mac: 0.009 ms
    per frame at depth 4 (121 clocks), 0.017 ms at depth 5 (364), and 0.048 ms
    at depth 6 (1,093).
  - Appending `?perf=1` shows the measured device fps and the median/p95
    per-frame work. It is hidden otherwise.
- **Checks:** model tests cover the equivalence with `createClockTree`, the
  121/1,093 tree counts, hand-tip attachment under offsets, a geared root exit
  (minute hand sweeping more than 1,000° with the hour hand within 15° of the
  exit), the second hand ignoring the offset, nearest-finger aim with
  settling, and lineage-preserving depth changes.
- **Observed result:** pending an explicit browser-verification request.
- **Unresolved question:** should skating a parent carry its offset down to its
  subtree?

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
- **Changed variable:** two tiers. Every grid clock (the parent) carries a
  child clock at each of its three hand tips: hour, minute, and second. A child is a
  full clock with its own time offset, and the skating rule applies to it
  independently.
- **Size:** the parent cell is `3 ×` clock/2's
  `clamp(min(w, h) / 14, 50, 72)` px cell, rounded to fill the viewport. A
  parent's radius is `2 ×` its children's. That gives 3 × 6 = 18 parents
  (radius 57 px, children 29 px) on 390 × 844, and 7 × 5 = 35 parents
  (radius 79 px, children 40 px) at 1440 × 900. The children deliberately
  spill past their parent's rim and over neighbouring clocks. Earlier same-day
  drafts, each adjusted at the user's request:
  - 4× parents with contained children were too large and too few.
  - 1.5× parents (55 on a phone) were too small.
  - At this parent size, children at a third of the parent radius were too
    small. Two-thirds was tried next and reverted to half at the user's
    request.
- **Second hand:** every parent and child has clock/1's rust second hand
  (`0.9 ×` radius). It shows real local seconds only, ignoring the clock's
  offset, so a geared time jump never spins it. At each whole second it eases
  in-out from the previous mark to the new one over 0.35 s. The first,
  instant-tick draft was too abrupt. Frames run only during that easing (or
  while a finger or spring is active), and the idle wake-up is aligned to the
  second boundary. The second-hand child rides this eased real-time hand, so all
  third children swing together each second.
- **Motion coupling:** a child moves whenever its parent's hand turns, so the
  exit test uses each child's center at the time of the stroke. The search
  around a stroke reaches `0.9 × parent radius + child radius`. Parent and
  child minute hands each aim at their own nearest finger every frame while a
  finger is down.
- **Rendering:** parent faces use clock/1's face, drawn once per resize. Child
  faces (with ticks) and all hands are redrawn each frame. Both tiers use
  clock/2's hand widths, so parent hands stay heavier than children's. DPR is
  capped at 2. At 1440 × 900 a frame draws 35 + 105 clocks with 2D canvas
  paths.
- **Checks:** pure-model tests cover edge-to-edge parents at 2× their
  children, the eased real-time-only second hand and its child, children on the parent hand tips, a child-only
  exit leaving the parent unchanged, the 2:30 → about 5:30 parent sweep, parent
  and child nearest-finger aim, settling, and resize retention. Typecheck and
  lint pass.
- **Observed result:** pending an explicit browser-verification request.
- **Unresolved question:** should a child's time inherit its parent's, as with
  clock/1's phase inheritance, rather than staying independent?
