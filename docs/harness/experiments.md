# Experiment and component structure

Read when changing routes, registries, or component organization. Preserve each
app's independent route, asset, component, socket, and documentation ownership;
filesystem route groups never change public URLs.

| SCC family | Route root | Component root |
| --- | --- | --- |
| Single-device | `app/(standalone)/[group]` | `components/standalone/[group]` |
| Workstations | `app/(dashboard)/[group]` | `components/dashboard/[group]` |
| Mobile experiments | `app/mobile` | `components/mobile` |
| `dj`, `finger-skating`, `network-system`, `sns` | `app/[group]` | `components/[group]` |

Within a family, `page.tsx` renders the shared SCC navigation
(`components/navigation`) scoped to that family; `[experiment]/page.tsx`
selects the variant from the matching `components/.../experiments.ts`. Every
SCC variant also needs an entry with its ISO creation date and one-line phrase
in `components/navigation/experiments.ts`, which drives the home, area and
family indexes (date-grouped, searchable, modelled on Goldfishes); its pure
test flags registry slugs missing from that index. Use dynamic variants, not literal numbered
route directories. Keep implementation in `components/.../[experiment]/`.
SCC route links in the main catalogue, family indexes, and route navigation open
their destination in a new tab so the catalogue stays available. In-screen
state controls remain in the current tab.

Multi-device variants add `[experiment]/mobile/page.tsx` and
`[experiment]/screen/page.tsx`; controller/multi-screen variants use
`controller/page.tsx` and `screen/[screen]/page.tsx`. Role components belong
under their variant. Existing finished-app routes follow their app docs, not
this experimental template.

Layer component families by responsibility: `model/` for domain state,
`transport/` for browser/device boundaries, `screen/` and `mobile/` for
composition, and named capabilities such as `news/`, `media/`, or
`controller/`. Expose folder `index.ts(x)` entrypoints; co-locate pure tests.
Avoid generic `utils/` for feature logic. Apply this organization to new or
materially changed families, not incidental fixes; no compulsory unrelated moves.
`apps/scc/components/network-system/cycle/` is an example.

App socket modules live in `apps/<owner>/socket/experiments/`; root `socket/`
owns only shared registry/server infrastructure. Clients map domain state into
presentation. See [HTTPS/sockets](https-and-sockets.md).

Small variants can share a group README; distinct contracts/evidence need a
matching app document. Update the relevant app index and [map](../README.md)
when adding a family. Registries are authoritative for executable variants.
