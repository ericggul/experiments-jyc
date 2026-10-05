# Stock default

Route: `/stock/default`

The default variant preserves the original standalone stock-card dashboard and
its historical records. It is independent from the device-driven `stock/1`
experiment and must remain unchanged when another stock variant changes its
data model or visual contract.

Primary files:

- `components/ui/dashboard/stock/default/dashboard.tsx`
- `components/ui/dashboard/stock/default/historical-data.ts`
- `components/ui/dashboard/stock/default/index.tsx`
