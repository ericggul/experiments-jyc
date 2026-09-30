# Network instability — 2026-09-30

Mobile surface at `/mobile/0930/network-instability`, owned by
`components/mobile/0930/network-instability`. Standalone; imports nothing from `0927/`.

## Goal

Replay Bardoscia et al. 2017, Fig. 3 as a working network. A shock should fade
in a–b–d–e and circulate until banks default in c. The figure's point is that
rewiring alone, with no change in leverage, moves λmax across 1 and back.
Distress is shown per bank, after DebtRank (Battiston et al. 2012, Fig. 3).
The style is taken from K6 only: black field, white hairlines, bottom-right
`edit`. Not K6's topology.

## Source figures

Both figures were downloaded and inspected on 2026-09-30:

- [Bardoscia et al., *Pathways towards instability in financial networks*, Nat. Commun. 2017, Fig. 3](https://www.nature.com/articles/ncomms14416#Fig3)
  - Transcribed link by link in `model/configurations.ts`: eight banks, weights
    ω, 2ω/3, ω/2, panels a–e.
  - New links (blue in the figure) and reweighted links (red) are derived by
    comparing each panel with the previous one. A test checks them against the
    figure.
  - The recomputed spectral radii reproduce the printed λmax (0, 0.8165,
    1.1242, 0.8907, 0.8927 ω) to 5 × 10⁻⁴.
- [Battiston et al., *DebtRank*, Sci. Rep. 2012, Fig. 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC3412322/figure/f3/)
  - Taken: distress per institution as node weight.
  - Here each ring fills with area ∝ h, and a full disc means default.

## Surface

- **Graph:** nodes keep the figure's places, made exactly mirror-symmetric.
  - A reciprocal pair (1↔3, 3↔4) is two lanes. Each bends to the right of its
    own travel, so the pair mirrors across the chord.
  - A single link bows away from the centre. A link on a line through the
    centre bows toward the vertical axis. These rules commute with the layout's
    mirrors (tested).
  - Midpoint chevrons. Weight labels sit on each curve's outer side.
  - New and reweighted links are at full opacity, the rest at 0.38.
  - Changing panel draws links in and out over 0.9 s.
- **Axis:** panel f.
  - Every configuration's λmax, with a dashed 1. Letters spread apart with
    leaders where d and e collide.
  - Tap a letter, or use the arrow keys, to select that configuration. λmax is
    absolute, so ω moves the marks.
- **Dynamics:** `model/distress.ts`.
  - New distress passes on each round, scaled by ω · weight, and h is capped at 1.
  - When the network is quiet, banks recover and a shock of 0.08 arrives at 5 or
    6, alternating. Tapping a bank shocks it.
  - At ω = 1, a, b, d and e stay at or below 0.4. In c, banks 3 and 4 reach default.
- **edit:** ω 0.6–1.4 (initial 1); tempo 1–8 rounds/s (initial 3).
- **Restyle:** colours, opacities and fonts are CSS variables at the top of
  `style/network-instability.module.css`. New and reweighted links have their
  own variables (`--link-added` / `--link-changed`), which can take the
  figure's blue and red later. Sizes are in `style/tokens.ts`.

## Verification boundary

Five pure tests cover:

- λmax reproduction
- blue/red link sets
- stable vs. unstable propagation
- lens mirroring
- mirror equivariance

six-sigma typecheck and scoped ESLint pass. Static renders of a–e were
compared with the figure. Browser animation, transitions, tapping and device
layout have not been checked.
