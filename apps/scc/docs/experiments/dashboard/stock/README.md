# Stock experiments

Documentation for `components/ui/dashboard/stock` and the public `/stock` routes.
Agents changing the `stock/1` data model or device behavior must first read its
[preservation contract](./1.md).

Routes:

- `/stock`
- `/stock/default`
- `/stock/1/mobile`
- `/stock/1/screen`
- `/stock/2`
- `/stock/3`
- `/stock/4`

## Structure

- `app/(dashboard)/stock/page.tsx` is the minimal experiment index.
- `app/(dashboard)/stock/[experiment]/page.tsx` owns direct/default routing.
- `app/(dashboard)/stock/[experiment]/mobile/page.tsx` and
  `screen/page.tsx` own the multi-device role routes.
- `components/ui/dashboard/stock/experiments.ts` is the route registry.
- `apps/scc/socket/experiments/stock/index.mjs` owns the isolated `stock:*` room and events.

## Variant documents

- [default](./default.md): preserved original stock-card dashboard.
- [stock/1](./1.md): mobile-axis signal model and UI-preservation contract.
- [stock/2](./2.md): compact command-driven terminal.
- [stock/3](./3.md): accepted Bloomberg workstation reconstruction and
  preservation record.
- [stock/4](./4.md): hover-decomposition variant inherited from `stock/3`.
- [shared Bloomberg Terminal research](./research.md).
