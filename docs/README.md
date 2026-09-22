# SCC documentation index

Read [AGENTS.md](../AGENTS.md) for operational policy, then the target app's
index and relevant contract. This is a lookup map, not a reading checklist.

| App | Status | Entry point |
| --- | --- | --- |
| SCC | Experimental archive | [SCC docs](../apps/scc/docs/README.md) |
| Goldfishes | Experimental archive | [Goldfishes docs](../apps/goldfishes/docs/README.md) |
| C-VAL | Finished; maintenance | [C-VAL docs](../apps/c-val/docs/README.md) |
| ddong-meong | Finished; maintenance | [ddong-meong docs](../apps/ddong-meong/docs/README.md) |

Root `harness/` owns engineering procedures; `foundations/` owns theory.
App docs retain feature contracts and historical evidence. Consult theory and
history when their subject affects the task, not for every code change.

## Harness and foundations

- [Harness overview](./harness/overview.md)
- [Documentation writing policy](./harness/documentation.md)
- [2026-09-08 harness review](./harness/2026-09-08-harness-review.md)
- [Monorepo apps and Vercel setup](./harness/monorepo.md)
- [Experiment and component structure](./harness/experiments.md)
- [Next.js notes](./harness/nextjs.md)
- [HTTPS and sockets](./harness/https-and-sockets.md)
- [반포자이즘 EC2와 SCC socket 공동 운영 결정](./harness/banpo-ec2-scc-cohosting.md)
- [SCC relay deployment](./harness/scc-relay-deployment.md)
- [Local image collections](./harness/local-image-collections.md)
- [Visual rendering research](./harness/visual-rendering-research.md)
- [WebGPU/TSL particle source-clone protocol](./harness/webgpu-tsl-particles.md)
- [Tinkering as the SCC working method](./foundations/tinkering.md)
- [Common visual design guidelines](./foundations/design-guidelines.md)
- [Multi-Device Web Artwork](./foundations/mdwa.md)
- [Parametric détournement research](./foundations/parametric-detournement.md)

## Experiment map

- [SNS mobile services 1–10](../apps/scc/docs/experiments/sns/mobile/README.md): independent Korean and US/UK mobile service interfaces.

- [Goldfishes maximalist collage](../apps/goldfishes/docs/maximalist-collage/README.md): independent browser interface cut-ups and accumulated prints.
- [Splice](../apps/scc/docs/experiments/standalone/splice/README.md): two-deck audio collage practice; a separate instrument for the later native application collage direction.

- [Aerodynamics](../apps/scc/docs/experiments/standalone/aerodynamics/README.md): standalone 3D ABC Euler flow, variants `1`–`2`.

| Code family | Registered variants | Documentation |
| --- | --- | --- |
| `apps/ddong-meong/components` | Unversioned finished app | [ddong-meong](../apps/ddong-meong/docs/README.md) · [콘텐츠 확장 매뉴얼](../apps/ddong-meong/docs/content-manual.md) |
| `apps/scc/components/dashboard/github` | `1`, `2` | [github/1](../apps/scc/docs/experiments/dashboard/github/1.md) · [github/2](../apps/scc/docs/experiments/dashboard/github/2.md) |
| `apps/scc/components/dashboard/palantir` | `1` | [palantir/1](../apps/scc/docs/experiments/dashboard/palantir/1.md) |
| `apps/scc/components/dashboard/stock` | `default`, `1`, `2`, `3`, `4` | [stock index](../apps/scc/docs/experiments/dashboard/stock/README.md) |
| `apps/scc/components/realtime/calendar` | `default`, `1` | [calendar](../apps/scc/docs/experiments/realtime/calendar/README.md) |
| `apps/scc/components/complex-systems/barabasi-albert` | `1` | [Barabási–Albert network growth](../apps/scc/docs/experiments/complex-systems/barabasi-albert/README.md) |
| `apps/scc/components/complex-systems/erdos-renyi` | `1` | [Erdős–Rényi random graph](../apps/scc/docs/experiments/complex-systems/erdos-renyi/README.md) |
| `apps/scc/components/complex-systems/financial-network` | `1`–`4` | [financial network / 4](../apps/scc/docs/experiments/complex-systems/financial-network/4.md) |
| `apps/scc/components/complex-systems/living-topology` | `1`–`4` | [living topology](../apps/scc/docs/experiments/complex-systems/living-topology/README.md) |
| `apps/scc/components/dynamical-systems/attractor` | `1`–`3` | [attractor sequence](../apps/scc/docs/experiments/dynamical-systems/attractor/README.md) |
| `apps/scc/components/dynamical-systems/three-body` | `1` | [three body](../apps/scc/docs/experiments/dynamical-systems/three-body/README.md) |
| `apps/scc/components/dynamical-systems/duffing` | `1` | [Duffing oscillator](../apps/scc/docs/experiments/dynamical-systems/duffing/README.md) |
| `apps/scc/components/dynamical-systems/bifurcation` | `1` | [bifurcation field](../apps/scc/docs/experiments/dynamical-systems/bifurcation/README.md) |
| `apps/scc/components/dynamical-systems/potential-field` | `1` | [potential field](../apps/scc/docs/experiments/dynamical-systems/potential-field/README.md) |
| `apps/scc/components/statistical-modelling/normal-distribution` | `1`–`5` | [normal-distribution particle field](../apps/scc/docs/experiments/statistical-modelling/normal-distribution/README.md) |
| `apps/scc/components/complex-systems/void` | `1`–`3` | [void field](../apps/scc/docs/experiments/complex-systems/void/README.md) |
| `apps/scc/components/complex-systems/face-voronoi` | `1`–`3` | [face voronoi](../apps/scc/docs/experiments/complex-systems/face-voronoi/README.md) |
| `apps/scc/components/complex-systems/page-rank` | `1` | [page rank](../apps/scc/docs/experiments/complex-systems/page-rank/README.md) |
| `apps/scc/components/complex-systems/diffusion-graph` | `1` | [diffusion graph](../apps/scc/docs/experiments/complex-systems/diffusion-graph/README.md) |
| `apps/scc/components/complex-systems/cellular-automata` | `colour/1`–`6`, `grid-network/1` | [cellular automata](../apps/scc/docs/experiments/complex-systems/cellular-automata/README.md) |
| `apps/scc/components/complex-systems/adaptive-coevolving-network` | `polling-ecology` | [polling ecology](../apps/scc/docs/experiments/complex-systems/adaptive-coevolving-network/README.md) |
| Complex-systems acceptance standard | — | [removals and simulation standard](../apps/scc/docs/experiments/complex-systems/rejected-examples.md) |
| `apps/scc/components/standalone/barrier` | `default`, `1`, `2` | [barrier](../apps/scc/docs/experiments/standalone/barrier/README.md) |
| `apps/scc/components/standalone/chess` | `1` | [chess](../apps/scc/docs/experiments/standalone/chess/README.md) |
| `apps/scc/components/standalone/bastille-day` | `1`, `2` | [bastille-day](../apps/scc/docs/experiments/standalone/bastille-day/README.md) |
| `apps/scc/components/standalone/cv` | `1`, `2`, `3` | [cv](../apps/scc/docs/experiments/standalone/cv/README.md) |
| `apps/scc/components/standalone/macos` | `1` | [macos](../apps/scc/docs/experiments/standalone/macos/README.md) |
| `apps/scc/components/standalone/moma` | `1`, `2` | [moma](../apps/scc/docs/experiments/standalone/moma/README.md) |
| `apps/scc/components/standalone/swarm` | `1`–`3` | [swarm](../apps/scc/docs/experiments/standalone/swarm/README.md) |
| `apps/scc/components/standalone/spoon-class` | `default`, `1`, `2`, `3` | [spoon-class baseline, module field, human-life fork and dense scaled wall](../apps/scc/docs/experiments/standalone/spoon-class/README.md) |
| `apps/scc/components/standalone/table` | `1`, `2` | [table](../apps/scc/docs/experiments/standalone/table/README.md) |
| `apps/scc/components/standalone/translate` | `1` | [translate](../apps/scc/docs/experiments/standalone/translate/README.md) |
| `apps/scc/components/standalone/grid` | `1`, `2`, `3`, `4`, `5` | [grid](../apps/scc/docs/experiments/standalone/grid/README.md) |
| `apps/scc/components/parametric-interface` | `1`, `2`, `0815/flight`, `0815/stock`, `0815/apollo`, `0815/led-text` | [parametric-interface](../apps/scc/docs/experiments/parametric-interface/README.md) |
| `apps/goldfishes/components/screen` | `default`, `2d/1`, `0804/tube`, `0804/html`, `0804/node-edge`, `0804/pillars`, `0806/side-view`, `0806/compositional-grid`, `0806/duration`, `0806/temporal-decay`, `0908/*` | [archive](../apps/goldfishes/docs/README.md), [agent onboarding](../apps/goldfishes/docs/agent-onboarding.md) |
| `apps/goldfishes/components/pc` | `0908` | [archive](../apps/goldfishes/docs/README.md) |
| `apps/scc/components/dj` | `1` | [dj](../apps/scc/docs/experiments/dj/README.md) |
| `apps/scc/components/finger-skating` | `1`, `2` | [finger-skating](../apps/scc/docs/experiments/finger-skating/README.md) |
| `apps/c-val/components` | Unversioned finished app; numbered records are history | [c-val](../apps/c-val/docs/README.md) |
| `apps/scc/components/network-system` | `default`, `macro-economy`, `cycle`, `population`, `competitive-firms` | [network-system index](../apps/scc/docs/experiments/network-system/README.md) |
| `apps/scc/components/sns` | `feed/1`, `navigation/default`, `navigation/1`, `navigation/2`, `youtube/1`, `youtube/2`, `linkedin/1` | [sns index](../apps/scc/docs/experiments/sns/README.md) |

The registries under `apps/*/components/**/experiments.ts` remain the source of truth
for executable variants. This index describes them; it does not replace those
registries.
