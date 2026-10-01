# Network instability — 2026-09-30

Mobile surface at `/mobile/0930/network-instability`, owned by
`components/mobile/0930/network-instability`. Standalone; imports nothing from `0927/`.

## What it shows

A financial network after DebtRank (Battiston et al. 2012, Fig. 3) under many
shocks at once.

- **Institutions and links:** rings are institutions, and ring area is size. A
  link `A → B` means B loses when A is in distress.
- **Shocks overlap:**
  - Idiosyncratic hits land on random institutions: 1.4/s across the system,
    size 0.1–0.3.
  - Every 6–11 s a common shock hits all of them at once: size 0.03–0.11. A
    common shock of 0.10 or more cascades on its own.
  - A tap adds a 0.3 hit to that institution.
- **Propagation:** each round, every institution's *new* distress moves one link
  onward, all at once. Pulses show the round in flight, and rings fill with
  distress h (0–1).
- **Default:** reaching h = 1 releases a further 0.5 onto the defaulter's
  creditors, and the ring's outline thickens. This non-linearity is what lets
  overlapping shocks do more together than apart. Institutions recover with a
  1.8 s half-life.
- **Loop gain:** the paper's impact weights are scaled so the loop gain λmax is
  0.85. Below 1, any single shock fades; close enough to 1 that overlapping
  shocks pile up.

**Bottom strip:**

- Letters a–l choose a placement.
- The shuffle button on the right changes placement every 5 s until pressed again.
- Below them, **system distress** is the value-weighted mean of h over the last
  24 s (0 at the line, 1 = all in default). Ticks under the line mark common shocks.

## Measured on the pure model (10 simulated minutes, `debtrank/stress.ts`)

- Median system distress is 0.32, and the 95th percentile is 0.54.
- 15 cascade episodes (any default), about one every 40 s.
- Only 8 of the 71 common shocks were large enough to cascade alone, so at
  least 7 of the 15 cascades came from overlap.
- Tested: a 0.06 common shock and two 0.3 hits each fade alone, but together
  they cascade.

## Panels a–l: one network, twelve placements

Only positions change. Most panels trade places on shared slots, the same
circle or the same rings, ordered by different quantities. Between ring panels,
nodes slide along the rings. Spring and grid move in straight lines. A change
mid-morph continues from where the nodes are.

| Panel | Placement |
| --- | --- |
| a | circle by number (DebtRank Fig. 3a) |
| b | DebtRank radial: closer to the centre = higher DebtRank; dashed rings at 0, 0.1 … 0.5 (Fig. 3b) |
| c | circle by DebtRank |
| d | circle by size |
| e | circle by impact on others |
| f | circle by exposure to others |
| g | core on an inner ring inside the periphery |
| h | each core member at the mean angle of the peripheral institutions most exposed to it |
| i | circle in spring-layout angular order (neighbours adjacent) |
| j | spring (deterministic Fruchterman–Reingold) |
| k | grid by DebtRank |
| l | three rings by DebtRank tier (5 / 8 / 9) |

**DebtRank** is the share of the system's value that one institution's default
puts into distress. It sets b, c, k and l.

## Model notes

- **Data:** the paper's cross-holding matrix is not published, so
  `debtrank/network.ts` is a synthetic, seeded, unnamed network. It has the
  figure's scale and core–periphery form: 22 institutions, 5 core, 76 links.
- **DebtRank ranking:** `debtrank/debtrank.ts` is the paper's U/D/I DebtRank,
  used only to rank the placements. The live dynamics are in
  `debtrank/stress.ts`.
- **Curves:** `geometry/curves.ts`. A reciprocal pair is two lanes, each bent
  to the right of its travel, so the pair mirrors across the chord. A single
  link bows away from the centre.
- **edit:** tempo, 1–8 rounds/s.
- **Restyle:** colours, opacities and fonts are CSS variables at the top of
  `style/network-instability.module.css`; sizes are in `style/tokens.ts`.

## Verification boundary

Eight pure tests cover:

- DebtRank
- loop-gain scaling
- overlap vs. isolation
- the strong common shock cascading on its own
- twelve panels in bounds without overlap
- ring panels as permutations of the same slots
- ring sliding vs. straight morphs

six-sigma typecheck and ESLint pass. Static renders of all panels and several
morph midpoints were inspected. Browser animation, shuffle timing, tapping and
device layout have not been checked.
