# six-sigma experiments

The first dated experiment is [`/screen/0923/hello-world`](./0923/hello-world.md):
a minimal page and an isolated Socket.IO handshake through the shared local
relay. The navigation at `/`, `/screen`, and `/screen/0923` lists registered
experiments.

New variants belong in `components/<family>/MMDD/<variant>/`; register them in
`components/experiments.ts` and keep their routes thin. Socket handlers belong
in `socket/experiments/` with experiment-specific events and rooms. Record each
new variant in this app's docs without changing the `0923/hello-world` baseline.
