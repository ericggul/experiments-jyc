# six-sigma experiments

The mobile family begins with [K6](./0927/K6.md) at `/mobile/0927/K6`:
a responsive white graph on black, with K6 / 36-leaf Fractal K6 opt 1 / 630-edge opt 2 and Static / Flow
options in the bottom-right `edit` panel, plus Fractal K3 opt 2 at depths 3, 4, and 5 with Within/Inter weights.
Every graph can use Straight, Cubic Bezier, or Cubic Bezier directional edges.
[Local optimum](./0927/local-optimum.md) at `/mobile/0927/local-optimum` forks that grammar into six
coupled maps, with 1D (ray, logistic) and 2D (disc, Ikeda) planes in `edit`. Dragging one node outward demands more from it, and past a threshold the other five move.
[Network instability](./0930/network-instability.md) at `/mobile/0930/network-instability`
puts a DebtRank-style network (after Battiston et al. 2012 Fig. 3) under overlapping and
common shocks, and morphs it between twelve placements, a–l, with a shuffle.
Browse `/mobile`, `/mobile/0927`, and `/mobile/0930`.

The first dated experiment is [`/screen/0923/hello-world`](./0923/hello-world.md):
a minimal page and an isolated Socket.IO handshake through the shared local
relay. The navigation at `/`, `/screen`, and `/screen/0923` lists registered
experiments.

New variants belong in `components/<family>/MMDD/<variant>/`; register them in
`components/experiments.ts` and keep their routes thin. Socket handlers belong
in `socket/experiments/` with experiment-specific events and rooms. Record each
new variant in this app's docs without changing the `0923/hello-world` baseline.
