# Amoeba / 1

Variant: [amoeba/2](2.md) moves the lawn to a full-screen zone and gives each cell an inherited, widely varying size.

Route: `/amoeba/1`. Deliberately synthetic agent model, added 2026-10-05.
Code: `components/complex-systems/amoeba/1` (`model/` pure and tested,
`rendering/` two WebGL2 passes).

## Model card

- **Object and boundary:** amoeba-like cells grazing a bacterial lawn in a
  closed circular dish. Not calibrated to a species; no claim beyond the rules
  below.
- **Cell state:** position, heading, mass, lineage, state (active, dividing,
  cyst), division phase, dormancy. **Field:** food on a 160² grid.
- **Rules per tick (30 ticks/s):**
  1. Eat a fraction of the food under the cell; mass grows by the same amount.
  2. Pay a fixed metabolic cost.
  3. Compare food at two forward samples, turn toward the richer one, add
     heading noise, move.
  4. Overlapping cells push apart.
  5. At twice newborn mass, divide over 24 ticks into two equal halves; the
     daughter keeps the lineage.
  6. Starve below mass 0.4 into a cyst. A cyst wakes when its food has
     recovered to 60 % and an active cell touches it (rarely, untouched);
     a cyst dormant for 8,000 ticks dissolves.
- Food regrows toward capacity everywhere at a slow fixed rate.
- **Macro observables:** a plaque, which is a dense feeding rim expanding over
  the cleared lawn; separate territories when several founders meet; and,
  after the dish is grazed, repeated blooms that start from a few woken cysts
  and spread through regrown lawn.
- **Intervention:** click free medium (or press Enter) to place a founder of a
  new lineage. Clicks on cells, outside the dish, or at capacity do nothing.

## Evidence (headless, seed 7, no browser)

`model/index.test.ts` asserts:
- determinism;
- mass-equal division within lineage;
- free-medium-only placement;
- a single plaque (more than 300 living cells) reaching beyond radius 0.7 in 900 ticks without hitting
  capacity;
- fewer than 10 % strays between two founders' territories;
- slow movers (speed 0.00036) making a colony less than 40 % as wide;
- at least two blooms in 12,000 ticks without extinction or capacity hits.

The tuning sweeps rendered contact sheets of the model state; the useful
failures were:

| Change | Result |
| --- | --- |
| Food 0.25 per grid square, fast regrowth | Cells could not divide from local food, so they wandered into a uniform gas with no front. |
| Food 1.5 | The plaque hit the 4,096-cell cap and division stalled. |
| Cysts woken only by their own patch's regrowth | The dish flickered in place; no travelling wave. |
| Wake on contact only | Extinction: food regrew around cysts nobody touched. |
| Cysts never dissolve | About 3,500 cysts carpeted the dish and waves dissolved into mud. |
| Regrowth 0.0003–0.0005 | Survivors reached a noisy steady gas instead of distinct blooms. |

The defaults (`model/parameters.ts`) gave blooms roughly every 3 minutes at
30 ticks/s. In one recorded run a single woken cyst seeded a front that swept
the regrown dish.

## Rendering

Cells are drawn at newborn radius 0.029 of the dish, so one body is about 26 px
across on a 900 px dish. The food grid (88²) and speed (0.0011) scale with that
radius, which keeps the 0.016-radius dynamics on a proportionally smaller dish.
Division takes 24 ticks (0.8 s) so the pinch is visible.

Rendering has three layers.

**Bodies** (`rendering/bodies.ts`, CPU). Each cell's drawn body follows the
model through damped springs keyed by stable id: position at 14 rad/s,
radius, and heading capped at 2.5 rad/s. Encysting and waking blend over about
0.4 s; founders grow in and dissolved cysts fade out. When a division
completes, the parent re-anchors onto the half its dividing shape already drew.
In a 25 s run at 24 fps the raw model jumped up to 1.17 radii and 0.79 rad
between frames; the drawn bodies stay under 0.16 radii and 0.104 rad
(`bodies.test.ts`).

**Pass A, field** (half resolution, half-float). Each body adds a soft kernel
(support 1.35 radii); the surface is one threshold of the sum. Contacts fuse,
division necks part, and edges are anti-aliased with `fwidth`.

**Pass B, owner** (half resolution). The nearest body per pixel, used only
for nucleus, granules and creases, which fade out before ownership changes.

Per-body shape terms (lobe directions, amplitudes, wobble) come from the
vertex shader. The body shape:

- **Active:** a slowly flowing leading pseudopod plus three wandering lobes.
- **Since birth:** a damped wobble along the division axis that starts from
  zero (`born` tick).
- **Dividing:** two halves part across the heading while their summed field
  pinches the neck (`phase`).
- **Cyst:** a firm round shell.

**Composite** lights the field as gel over the lawn:

| Visual | Model state |
| --- | --- |
| Lawn seen refracted through the gel, with slight dispersion | Body height |
| Thickness-dependent absorption and milky scatter | Body height |
| Fresnel reflection of a soft area light | Height-field normals |
| Nucleus through the gel; two while dividing | Division phase |
| Fine granules in the thick middle | Body thickness |
| Faint body tint | Lineage |
| Amber, firm, less glossy | Cyst |
| Lawn turbidity, pre-blurred over the 88² grid, with grain baked once | Food level |
| Soft contact shadow | Body height |

**Performance.**

- CPU (model plus bodies): a median of 0.24 ms per frame, at most 1.84 ms,
  with little change on frames with many divisions.
- Body-pass fragments at a 750-body peak on a 1080p screen fell from 7.37 M
  per frame (an owner pass at full resolution writing `gl_FragDepth`, and two
  trig-heavy shapes per fragment) to 2.03 M (reach-sized quads, a
  half-resolution owner pass, one dot-product shape unless dividing).
- Lawn sampling per cell pixel fell from 16 taps plus 36 hashes to 8 taps.

Budget: at most 4,096 instances, DPR ≤ 1 with a 3 MP cap, 24 Hz rendering
(the GPU-safety default; 60 Hz would need an observed device run).

**Rejected visuals (2026-10-05):**

| Version | Why it was rejected |
| --- | --- |
| Pseudo-microscopy (DIC relief, granules, halo, specks) on 7 px cells | Read as fake decoration. |
| Flat lineage discs with hairlines | Too abstract. |
| First gel pass | Opaque, spherical bodies with one hard highlight read as glossy marbles. Absorption was capped and the membrane darkened, which fixed it. |
| Nearest-owner gel (2026-10-06) | The silhouette came from per-pixel ownership without anti-aliasing, and the shape followed raw model headings and pushes, so edges crawled and bodies jumped. Replaced by the spring bodies and the summed field above. |

The 2-component quad positions behind a NaN bounding-sphere warning became
3-component.

**Unverified:** the shaders were checked only against a CPU replica of the same
math, not observed in a browser.

## Related work and limits

- The forager-on-nutrient approach follows
  [Ben-Jacob et al. 1994](https://www.nature.com/articles/368046a0) in kind,
  not in parameters.
- Founder territories resemble the sectoring in
  [Hallatschek et al. 2007](https://doi.org/10.1073/pnas.0710150104), but
  only neutral lineage marks are modelled and sector statistics are not
  measured.
- The gap where colonies meet comes from competition for food alone. The
  sibling-colony inhibition in
  [Be'er et al. 2009](https://chaos.utexas.edu/publications/deadly_competition_between_sibling_bacterial_colonies)
  needs a secreted lethal factor that this model lacks.
- **Open question:** whether the blooms become spiral waves when a click
  breaks a front.
