# Circular ownership / 1

Route: `/circular-ownership/1`.

## Material and premise

This is a Samsung-shaped **simulacrum**, not a reconstruction. Its 63 node
names are the domestic Samsung-affiliate roster in Samsung Electronics’
public 2024 half-year business report; the six spatial zones retain a
recognizable organisational grain—finance, electronics/materials,
industry/life science, services/research, commerce/brand, and surrounding
companies. The directed holdings, their initial intensities, and every change
in the experiment are invented for this one system.

The historical Samsung C&T–Life–Fire–Electronics–Electro-mechanics loop is
used only as a generative grammar: a few central return paths join several
business clusters, and smaller local paths can reinforce or release them.
There is no copied percentage, transaction, corporate-control claim, date
scrubber, price series, or historical event sequence in the implementation.

Source for names: [Samsung Electronics 2024 half-year business report,
“Domestic Affiliates”](https://images.samsung.com/is/content/samsung/assets/global/ir/docs/2024_Half_Interim_Report.pdf).
The report lists 17 listed and 46 unlisted domestic affiliates (63 total).

## Interface premise

1. **Participant situation:** observe a crowded directed holding field as it
   continuously changes; click a company to add a temporary circulation
   potential there, or vary one return-pressure slider.
2. **Perceptual job:** distinguish a direct virtual holding from a relation
   that currently has a route back to its owner. Line thickness is direct
   virtual stake; rust is a detected return path; dashed lines are dormant
   couplings becoming active.
3. **Interaction job:** perturb one named firm and follow the neighbouring
   relation set rather than read a static ownership chart. Selecting a line
   exposes its two names and current simulated stake in the active semantic
   slot at the bottom.
4. **Wrapper justification:** small name plates and directional threads leave
   the graph as the perceptual object. The six quiet headings locate the real
   organisation-material without turning the system into a finance terminal.
   The slider and reset are the two operations necessary to test the system.
5. **Removal test:** remove the headings, slider, company plates, directional
   strokes, current relation readout, or direct perturbation and the
   participant loses either orientation, a model parameter, or the ability to
   make an intervention. No market chart, KPI, simulated price, dated record,
   or corporate-brand dashboard is present.

## Dynamical model

`W_ij(t)` is the virtual direct holding from affiliate `i` to `j`; it is the
state, not a playback record. Each company also has a bounded circulation
potential `c_i(t)`. At each short step the model updates potential from the
inbound weighted holdings and a deterministic local oscillation, then updates
each available relation toward a target:

```text
c_i(t + dt) = clip(c_i + dt · 1.1 · (0.42 + 2.1·inbound_i + local_i(t) - c_i))

W_ij(t + dt) = clip(W_ij + dt · response_ij · (target_ij - W_ij))
target_ij = baseline_ij + carrier_ij(t) · f(loopPressure)
            + returnPath(j → i, W) · g(loopPressure)
            + c_i · c_j · coupling_ij
```

`returnPath(j → i, W)` is a bounded five-hop conductance search. Thus an edge
is strengthened not merely because it exists, but because its target can
currently send influence back through the live matrix. Latent couplings begin
below the visible threshold and may cross it; active ones may fall below it.
Tarjan SCCs and return-path conductance are recomputed from the current matrix
to mark circulating relations. All values are clamped (`0 ≤ W ≤ 0.16`,
`0.2 ≤ c ≤ 1`) so the field stays observable rather than exploding.

The initial relation grammar includes six local circuits and eight cross-zone
circuits. It intentionally makes more than the famous six-company fragment
operative: every one of the 63 named affiliates participates in at least one
fictional directed circuit.

## Bounded trial

- **Retained invariant:** a dense, fixed composition of 63 real affiliate
  names, six organisational zones, and a visible directed graph.
- **Changed variable:** `loopPressure` is the only global parameter. It raises
  the gain by which an existing return path reinforces a direct virtual stake.
- **Expected observation:** at high pressure more latent relations cross the
  active threshold, and the recurrent portion of the matrix grows; an
  injection temporarily shifts the nearby circulation.
- **Verification:** deterministic replay, 63-company roster, bounded states,
  threshold crossings, and pressure-sensitive recurrence are covered by the
  co-located model test. TypeScript validation is run separately. Browser
  interaction verification remains pending an explicit request.
- **Open question:** the current spatial composition uses organisational
  domains. A next trial could preserve the same model but replace the six-zone
  layout with a participant-controlled cut through one return path, if that
  makes local causality more legible without reintroducing dashboard chrome.

Removed 2026-10-03: the route, component and registry entry. These notes stay as history.
