# Adaptive coevolving networks

The shared question is whether `node state → relation update → future exposure` is visible as one process. These are synthetic, finite browser models—not empirical social, electoral or epidemiological claims. The original routes 2 (open N/S/R recruitment graph) and 3 (the same model on a fixed lattice) were removed on 2026-10-02 at the user's request; see [removals](../rejected-examples.md).

## Routes

| Route | Model | Participant action | Important boundary |
| --- | --- | --- | --- |
| `/adaptive-coevolving-network/1` (2026-10-01) | Coevolving voter model, 500 voters to start (cap 800), mean degree 4, six opinions. A voter picks one tie; if it disagrees, it rewires that tie to a random like-minded non-neighbour with probability φ, else adopts the neighbour's opinion. Agreeing ties are inert; drift `.0015` per update gives a random new opinion. | Drag along the slider from adopt (φ=0) to rewire (φ=1), default `.5`; a tap adds a voter there with the least-held opinion, tied to the two nearest voters (N adds one at the centre); a drag past 6 px plants that opinion in a brush of about 1.1 ideal tie lengths (Enter plants at the centre). | Position is only a force layout of the current ties, computed in the browser, so rewiring is what moves voters. Two updates per voter per second; the rates have no empirical unit. |
| `/adaptive-coevolving-network/1-3d` (2026-10-05) | Route 1's model, copied unchanged. | Orbit by dragging empty space; tap adds a voter; dragging from a voter plants a view; same slider. | Only the layout gains a z axis; it is drawn as particle dust in `/attractor/3`'s style. See [1-3d.md](1-3d.md). |
| `/adaptive-coevolving-network/1-glsl` (2026-10-05) | Route 1's model and 2D layout, copied unchanged. | Route 1's: tap adds, drag plants; a collapsible options panel holds the thin/thick tie switch and the same slider. | Drawing, sizes and palette change: voters and ties become one 2D neon gel (a smooth-union distance field) on black. See [1-glsl.md](1-glsl.md). |
| `/adaptive-coevolving-network/7-glsl` (2026-10-06) | Route 7's ranked-web model, layout and views, copied unchanged. | Route 7's gestures; route 7's options, hint included, inside a collapsible panel. | Only drawing, scale and play area change: pages become soft cells whose links grow out of them, one monochrome gel on black with `1-glsl`'s renderer. See [7-glsl.md](7-glsl.md). |
| `/adaptive-coevolving-network/2` (2026-10-02) | Adaptive SIS epidemic: 300 people to start (cap 600), random graph of mean degree 8, 5% infected. Along each S–I tie, infection at rate `.08`, or avoidance at rate `w`: S cuts the tie and links to a random healthy stranger. Recovery at rate `.25`. Import from outside at `.0004` per healthy person. | A bottom 옵션/닫기 toggle in the finger-network grammar, closed by default. It opens a short Korean description of the model (not of the views), a view selector (네트워크, 분리, 연결 수, 노출) and the avoidance slider 유지–회피 (`w ∈ [0, 1]`, default `.3`). Tap a person to infect them; tap empty space to add a healthy person tied to the nearest two. Enter infects the person nearest the centre. | 1.5 model time units per second, steps of at most `.05`. Position is only a browser force layout of the current ties. |

[Gross and Blasius](https://doi.org/10.1098/rsif.2007.1229) supplies the broader adaptive-network framing.

## Route 1: the closed loop

The former routes 2 and 3 changed state and ties, but fixed coordinates hid the topology, so a rewire never changed what the eye saw. Route 1 tests the missing relation, `opinion → which ties survive → layout → who can influence whom → opinion`, using the Holme–Newman model ([2006](https://doi.org/10.1103/PhysRevE.74.056108)) with discordant-only updates (Vazquez, Eguíluz and San Miguel, [2008](https://doi.org/10.1103/PhysRevLett.100.108702); rewire-to-same as in Durrett et al., [2012](https://doi.org/10.1073/pnas.1200709109)).

- **Encoding:** hue is opinion; ties between agreeing voters are thin and in their shared hue. Ink ties are disagreements, the only places where the next event can happen. A rewire draws the new tie from the voter and leaves a dashed trace to the abandoned neighbour. Adoption, drift and planting show as a ring in the new hue. Node area grows with degree. White field; no title, counters or legend; the hint disappears after the first plant.
- **2026-10-02 change:** the default rose from 240 to 500 voters, and voters can now be added by tapping. Pair keys use a fixed stride so the population can grow. Pure-model cost in Node at 500 voters was about .24 ms per frame (worst about 2 ms); at 800 it was under 1 ms on average, with occasional spikes near 20 ms. At 500 voters and φ = .5, the largest component was .55 after 60 s; at 800 and φ = .8 the graph was still mostly connected at 60 s, so fragmentation is slower in larger populations.
- **Measured pure-model behaviour** (240 voters, seed `0x51c0e7a3`, drift on, 2026-10-01): with φ ≤ .2 there is one component and opinions coarsen toward consensus. With φ ≥ .5 the graph splits within about 30 s into islands that each hold one opinion (largest component ≈ .2–.45). Around φ ≈ .35–.45 the outcome depends on the run.
- **Hysteresis:** after fragmenting at φ = .8, returning to φ ≤ .2 reconnects the islands within about 30–60 s, but only through drift, because a disagreement that crosses an island boundary must first be created. Without drift, fragmentation is absorbing.
- **Layout:** O(n²) repulsion, springs and gravity proportional to aspect ratio, kept above an 88 px band reserved for the slider. Pure timing was ≈ .07 ms per frame in Node; this has not been profiled in a browser.
- **Unresolved:** whether the participant can read the phase change without a numeric order parameter, and whether 240 voters is enough to see islands on a phone.

## Tests

Route 1 tests cover deterministic replay, tie conservation and simplicity, pure-adopt/pure-rewire separation, fragmentation at high φ, connectivity at low φ, planting bounds, newcomer ties, and the population cap.

## Route 2: avoidance during an epidemic

The model is Gross, D'Lima and Blasius, ["Epidemic dynamics on an adaptive network"](https://doi.org/10.1103/PhysRevLett.96.208701), *PRL* 96, 208701 (2006). It deliberately has the fewest parts that still close the loop: two states, one contagion rule, one rewiring rule. `health → which ties survive → who can be reached → health`.

- **Encoding:** healthy people are ink and infected people red. Healthy–healthy ties are faint ink and infected–infected ties faint red. Healthy–infected ties are strong red, because they are the only ties along which infection or avoidance can happen. Avoidance leaves a dashed red trace to the abandoned contact while the new healthy tie draws out; infections ring. Person area grows with ties. White field, no counters; the infected share and the mean ties of each group are exposed only to screen readers.
- **Measured, pure model only** (300 people, seed `0x1b873593`, 2026-10-02):
  - `w ≤ .15`: endemic, with about 50–57% infected.
  - `w = .3`: endemic once established, but a 2% outbreak can idle near 1% for about 40 time units before it takes off.
  - `w = .45`: bistable. A 2% outbreak dies out; a 50% outbreak persists around 25% for more than 100 units before it fades.
  - `w ≥ .6`: extinction.
  - Whenever avoidance acts, infected people end up with fewer ties than healthy people (about 5–6 against 8).
- **Views (2026-10-02):** each view maps the same model state to target points; the model never sees them.
  - *네트워크:* the force layout, the default and the original screen. It keeps running in every view so a return is continuous.
  - *분리:* healthy and infected people in two discs (side by side when wide, stacked when tall). Disc area follows each group's share, and each person keeps a fixed sunflower spot by id, so infection or recovery glides them to the same relative spot in the other disc. Healthy–infected ties become the bridges between the discs. A physics version with group anchors was tried first and left 35–50% of infected people on the wrong side, because infections end before people can cross.
  - *연결 수:* radial. Distance from the centre falls with ties (20 or more at the centre), and the angle is fixed by id. Since avoidance strips ties from the infected, red drifts outward.
  - *노출:* infected neighbours (0–8) across, ties (0–20) up, with a fixed per-person jitter of ±.3. This shows who is currently exposed and whether exposed people keep or lose ties.
  - Standing ties fade in the metric views, healthy–infected ties never below 30%. A view switch eases every point from its old position to its live target over .9 s (cubic in-out) and cross-fades the view's labels. After that, points follow their targets at rate 12/s.
- **Cost:** model plus layout about .1 ms per frame in Node; this has not been profiled in a browser.
- **History:** the same day, an adaptive Kuramoto oscillator version of route 2 (phases with plastic coupling weights, polar field plus coupling matrix) was built and removed at the user's request for being too elaborate.
- **Tests:** deterministic replay; avoidance moves only S–I ties to healthy strangers and keeps the graph simple; endemic without avoidance and extinction with strong avoidance; outcome depends on outbreak size at `w = .45`; infected people keep fewer ties; infection and growth bounds; the 분리 view never mixes groups; every view stays inside the frame; the 연결 수 view orders people by ties.
- **Unresolved:** the oscillations of the original model need a large population (`10⁵` nodes there) and may be masked by noise at 300; whether the healthy core visibly densifies before the next outbreak.

## Routes 3–7 (2026-10-02/03)

Each was built from the cited model, prototyped numerically, and recorded with exact rules, measured regimes, tests and open questions in its own file. A Physarum transport-network route was built at `/4` the same day and removed on 2026-10-03 as a wrong example (see [removals](../rejected-examples.md)); later routes moved down by one. On 2026-10-03 structural balance and bounded confidence (then `/4` and `/5`) were also removed as not useful, and the rest moved down by two. The Jain–Krishna autocatalytic ecosystem (then `/5`) was removed the same day, and the last three moved down by one. The Axelrod culture route (then `/6`) was removed later that day, after reworks first as culture colours and then as named fictional nations; awareness–epidemic moved to `/6`. All share route 2's grammar: a white field, event marks only for real model events, and a bottom 옵션/닫기 panel with a Korean model description, sliders and, where useful, eased alternative views.

| Route | Model | Measured contrast | Record |
| --- | --- | --- | --- |
| `/adaptive-coevolving-network/3` adaptive cooperation | Prisoner's dilemma; players copy richer neighbours and leave defectors for the defector's contact (Zimmermann–Eguíluz–San Miguel 2004/05; Santos–Pacheco–Lenaerts 2006 rule) | Without partner switching cooperation dies (.02 by 35 s); with it cooperators become hubs and reach .93–.99 | [3.md](3.md) |
| `/adaptive-coevolving-network/4` echo chambers | Activity-driven homophilic contacts, `dx/dt = −x + K Σ tanh(αx_j)` (Baumann et al. 2020) | Consensus, one-sided radicalization, and polarized echo chambers by α and β | [4.md](4.md) |
| `/adaptive-coevolving-network/5` self-organized criticality | Boolean threshold network; frozen nodes gain an input, active nodes lose one (Bornholdt–Rohlf 2000) | Sparse and dense starts converge to K ≈ 2.6–3.2 at N = 120 | [5.md](5.md) |
| `/adaptive-coevolving-network/6` awareness and epidemic | UAU–SIS multiplex plus this route's own rule that aware susceptibles rewire away from the infected (Granell–Gómez–Arenas 2013) | With avoidance, λ ≥ .2 eliminates the default outbreak; news outruns the disease | [6.md](6.md) |
| `/adaptive-coevolving-network/7` ranked web (2026-10-03) | Continuous-time weighted PageRank; attention weights relax toward appeal (PR + floor/N)·e^q while quality q drifts (Brin–Page 1998; Fortunato–Flammini–Menczer 2006) | Leader changes about every 8 s at the defaults; rank moves smoothly, at most .3 points per frame | [7.md](7.md) |
