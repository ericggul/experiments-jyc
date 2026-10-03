# six-sigma experiments

The mobile family begins with [K6](./mobile/k6/1.md) at `/mobile/k6/1`:
a responsive white graph on black, with K6 / 36-leaf Fractal K6 opt 1 / 630-edge opt 2 and Static / Flow
options in the bottom-right `edit` panel, plus Fractal K3 opt 2 at depths 3, 4, and 5 with Within/Inter weights.
Every graph can use Straight, Cubic Bezier, or Cubic Bezier directional edges.
[Local optimum](./mobile/k6/2.md) at `/mobile/k6/2` forks that grammar into six
coupled maps, with 1D (ray, logistic) and 2D (disc, Ikeda) planes in `edit`. Dragging one node outward demands more from it, and past a threshold the other five move.
[Network instability](./mobile/network-instability/1.md) at `/mobile/network-instability/1`
puts a DebtRank-style network (after Battiston et al. 2012 Fig. 3) under overlapping and
common shocks, and morphs it between twelve placements, a–l, with a shuffle.
Browse `/mobile`, `/mobile/0927`, and `/mobile/0930`.

The first dated experiment is [`/screen/hello-world/1`](./screen/hello-world/1.md):
a minimal page and an isolated Socket.IO handshake through the shared local
relay. The navigation at `/`, `/screen`, and `/screen/0923` lists registered
experiments.

New variants belong in `components/<area>/<family>/<serial>/`, with the doc at
`docs/<area>/<family>/<serial>.md`. Serials rise with creation date: a later
trial in a family takes the next number. Register the ISO date (and any former
route as `legacyKeys`) in `components/experiments.ts` and keep routes thin;
`/<area>/<MMDD>` archives are derived from those dates. Socket handlers belong
in `socket/experiments/` with experiment-specific events and rooms; the
hello-world events keep their original `six-sigma:0923:hello-world` prefix.
Record each new variant in this app's docs without changing the `hello-world/1`
baseline.

| Route | Date | Former route |
| --- | --- | --- |
| `/screen/hello-world/1` | 2026-09-23 | `/screen/0923/hello-world` |
| `/mobile/k6/1` | 2026-09-27 | `/mobile/0927/K6` |
| `/mobile/k6/2` | 2026-09-27 | `/mobile/0927/local-optimum` |
| `/mobile/network-instability/1` | 2026-09-30 | `/mobile/0930/network-instability` |
