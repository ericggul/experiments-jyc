# Tokyo network experiment

Route: `/tokyo-network/1`, owned by the filesystem-only `complex-systems`
group.

Date: 2026-08-13.

## Interface premise

1. **Participant situation:** one person encounters a changing graph over a
   fixed map of central Tokyo and may introduce a point by pressing the map.
2. **Primary parameter:** the temporary topology of long-range relations between
   fixed geographic positions.
3. **Perceptual job:** distinguish the stable road substrate from the points and
   relations that form, strengthen, and disappear across it.
4. **Interaction job:** press a location and anticipate a newly introduced node
   snapping to the nearest mapped road, then forming temporary distant links;
   adjust tempo, arrival, density, reach, and node/edge lifetimes to alter the
   same process.
5. **Wrapper justification:** the map is not thematic scenery; it makes the
   scale and distance of each otherwise abstract long-range connection visible.
6. **System family:** the complex-systems mineral ground, charcoal structure,
   blue-grey activity, serif title, monospaced action, and full-viewport direct
   interaction.
7. **Removal test:** the road geometry, node/edge lifecycle, one map press,
   pause action, and legal attribution remain. Counts, legends, dashboards,
   synthetic place labels, and procedural map decoration are omitted.

## Bounded trial

- **Baseline:** the single-canvas local simulation grammar used by the living
  topology family.
- **Changed variable:** node positions are sampled from a real Tokyo road
  substrate; new edges must span a meaningful distance across the map instead
  of connecting a free-floating field.
- **Retained invariants:** each node has a stable model ID, roads are static,
  topology is the changing state, direct intervention and parameter changes act
  on the model, and no socket or remote runtime dependency is required.
- **Observable result:** not yet browser-observed in this implementation pass.
- **Unresolved question:** whether edge formation should later be constrained by
  the road graph itself instead of using Euclidean distance across the map.

## Map source

The embedded major-road geometry is a simplified extraction of OpenStreetMap
data for central Tokyo, retrieved through Overpass on 2026-08-13. It retains
the required visible `© OpenStreetMap contributors` attribution and is available
under the Open Database License (ODbL):
<https://www.openstreetmap.org/copyright>.

Removed 2026-10-03: the route, component and registry entry. These notes stay as history.
