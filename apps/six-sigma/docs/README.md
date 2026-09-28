# six-sigma experiments

The mobile family begins with [K6](./0927/K6.md) at `/mobile/0927/K6`:
a responsive white graph on black, with K6 / 36-leaf Fractal K6 opt 1 / 630-edge opt 2 and Static / Flow
options in the bottom-right `edit` panel, plus Fractal K3 opt 2 at depths 3, 4, and 5 with Within/Inter weights.
Every graph can use Straight, Cubic Bezier, or Cubic Bezier directional edges.
Browse `/mobile` and `/mobile/0927`.

The first dated experiment is [`/screen/0923/hello-world`](./0923/hello-world.md):
a minimal page and an isolated Socket.IO handshake through the shared local
relay. The navigation at `/`, `/screen`, and `/screen/0923` lists registered
experiments.

New variants belong in `components/<family>/MMDD/<variant>/`; register them in
`components/experiments.ts` and keep their routes thin. Socket handlers belong
in `socket/experiments/` with experiment-specific events and rooms. Record each
new variant in this app's docs without changing the `0923/hello-world` baseline.
