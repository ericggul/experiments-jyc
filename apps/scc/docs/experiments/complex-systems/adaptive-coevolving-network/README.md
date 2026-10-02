# Adaptive coevolving networks

The shared question is whether `node state → relation update → future exposure` is visible as one process. These are synthetic, finite browser models—not empirical social or electoral claims.

## Routes

| Route | Model | Participant action | Important boundary |
| --- | --- | --- | --- |
| `/adaptive-coevolving-network/1` (2026-10-01) | Coevolving voter model, fixed population of 240, 480 ties, six opinions. A voter picks one tie; if it disagrees, it rewires that tie to a random like-minded non-neighbour with probability φ, else adopts the neighbour's opinion. Agreeing ties are inert; drift `.0015` per update gives a random new opinion. | Drag along the slider from adopt (φ=0) to rewire (φ=1), default `.5`; press/drag the field to plant the least-held opinion in a brush of ~1.1 ideal tie lengths; Enter plants at the centre. | Position is only a force layout of the current ties, computed in the browser, so rewiring is what moves voters. Two updates per voter per second; the rates have no empirical unit. |
| `/adaptive-coevolving-network/2` | Seeded open N/S/R recruitment graph. Nodes enter/leave; entrants receive two ties; S becomes R from recruiter exposure; recruiters rewire `R–N` to `R–S`. | Press makes nearby N nodes S; sliders set browser rates. | Event chance is `1-exp(-rΔt)`; rates have no empirical unit and population cap is rendering-only. |
| `/adaptive-coevolving-network/3` | Same event family on fixed candidate centres. | Activate a candidate or change an active N to S. | `N×N` immutable grid, default 32 and adjustable 16–50; entry/departure toggles a site rather than creating it. |
| `/adaptive-coevolving-network/polling-ecology` | Synchronous faction/topic/conviction/age field with reproduction, switching, attrition. | Seed a patch. | Explicitly synthetic ecology, not polling evidence. |

The open-route basis is Shkarayev, Schwartz, and Shaw’s [recruitment model](https://doi.org/10.1088/1751-8113/46/24/245003) ([preprint](https://arxiv.org/abs/1111.0964)); [Gross and Blasius](https://doi.org/10.1098/rsif.2007.1229) supplies the broader adaptive-network framing.

## Route 1: the closed loop

Routes 2 and 3 change state and ties, but fixed coordinates hide the topology, so a rewire never changes what the eye sees. Polling ecology has no network: it is a lattice CA. Route 1 tests the missing relation, `opinion → which ties survive → layout → who can influence whom → opinion`, using the Holme–Newman model ([2006](https://doi.org/10.1103/PhysRevE.74.056108)) with discordant-only updates (Vazquez, Eguíluz and San Miguel, [2008](https://doi.org/10.1103/PhysRevLett.100.108702); rewire-to-same as in Durrett et al., [2012](https://doi.org/10.1073/pnas.1200709109)).

- **Encoding:** hue is opinion; ties between agreeing voters are thin and in their shared hue. Ink ties are disagreements, the only places where the next event can happen. A rewire draws the new tie from the voter and leaves a dashed trace to the abandoned neighbour. Adoption, drift and planting show as a ring in the new hue. Node area grows with degree. White field; no title, counters or legend; the hint disappears after the first plant.
- **Measured pure-model behaviour** (seed `0x51c0e7a3`, drift on, 2026-10-01): with φ ≤ .2 there is one component and opinions coarsen toward consensus. With φ ≥ .5 the graph splits within about 30 s into islands that each hold one opinion (largest component ≈ .2–.45). Around φ ≈ .35–.45 the outcome depends on the run.
- **Hysteresis:** after fragmenting at φ = .8, returning to φ ≤ .2 reconnects the islands within about 30–60 s, but only through drift, because a disagreement that crosses an island boundary must first be created. Without drift, fragmentation is absorbing.
- **Layout:** O(n²) repulsion, springs and gravity proportional to aspect ratio, kept above an 88 px band reserved for the slider. Pure timing was ≈ .07 ms per frame in Node; this has not been profiled in a browser.
- **Unresolved:** whether the participant can read the phase change without a numeric order parameter, and whether 240 voters is enough to see islands on a phone.

## Visible and testable contract (routes 2–3)

Filled grey, outlined blue, and ringed rust nodes mean N, S, and R. Rust links mean current R–S opportunities; entry rings and endpoint dashes must be caused by real model events. Compact readouts may show N/S/R, `|V|/|E|`, components, and event totals. Do not add a legend, cards, fake-live status, or force-layout motion.

Route 1 tests cover deterministic replay, tie conservation and simplicity, pure-adopt/pure-rewire separation, fragmentation at high φ, connectivity at low φ, and planting bounds. Route 2–3 tests cover deterministic replay, valid endpoints after death, turnover, rewiring endpoint changes, and bounded local intervention. The lattice also asserts exact `N²` candidates and immutable coordinates. A Gillespie queue or measured distance kernel would be a new calibration trial, not an implicit property of these routes.
