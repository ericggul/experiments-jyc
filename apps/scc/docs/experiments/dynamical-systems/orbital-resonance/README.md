# Orbital resonance

Route/date: `/orbital-resonance/1`, 2026-09-30. It replaced the deleted
`potential-field/1`, with the `attractor/3` field as its baseline.

## orbital-resonance/1 — matched periods stand still

- **Tested relation:** a participant should see, without labels, that an
  orbit whose period matches the planet's by a whole-number ratio behaves
  differently from one that does not.
- **System:** the circular restricted three-body problem in the frame that
  rotates with the planet (`μ = 0.001`, Jupiter-like; star + planet mass,
  planet distance, and planet angular speed all 1). The planet is softened by
  `ε = 0.01`. GPU RK4 runs 4 × `dt = 0.0105` per frame, about one planet
  orbit every 2.5 s at 60 Hz. A particle beyond radius 3.2 or within 0.05 of
  the star returns to its seed state.
- **Why the rotating frame:** the planet stands still in it, so a matched
  orbit traces a closed figure that also stands still. 2:1 gives two lobes,
  3:2 the Hilda triangle, and 2:3 Plutino loops kept away from the planet.
  Unmatched orbits never close and their figures keep turning.
- **Seeding:** 30 groups × 1,000 particles. Each group is one Kepler orbit
  (period ratio within ±2.5 %, or ±1.2 % for 1:1; eccentricity and
  inclination from the preset). Member `k` is the same orbit time-shifted by
  `τₖ` and rotated with the planet by `τₖ`, spread over one closure time, so
  in the rotating frame the members lie on the group's single figure. After
  seeding, every particle is independently integrated, and the planet's pull
  reshapes the figures. The 3:2 triangle sharpens while unprotected orbits
  are thrown outward within a few planet orbits. 1:1 splits into tadpole and
  horseshoe arcs around L4/L5.
- **Colour:** osculating period ÷ planet period from the particle's own state;
  warm when within ~0.4 % of 1/2, 2/3, 1 or 3/2, cool beyond ~3.5 %.
- **Selector:** `2:1`, `3:2`, `1:1`, `2:3` (particle orbits : planet orbits).
  A mixed "belt" preset (30 orbits spread over period ratios 0.36–2.2) was
  tried and removed: too sparse to show anything but a tangle.
- **Invariants:** no trails, labels, grids, or glow. Star and planet are plain
  discs at their true rotating-frame positions. The attractor/3 selector and
  sprite grammar are kept.
- **Evidence:** `model/resonances.test.ts` checks the seeded period ratios, that
  a matched orbit closes in the rotating frame without the planet (1e-6)
  while a 3 % mismatch does not, that group members share one figure, and
  that all presets seed bound states. 2026-09-30 HTTPS Chrome (hidden tab,
  injected ~60 Hz scheduler): all four presets rendered as described, with no
  console or GPU errors.
- **Budget:** 30,000 sprites plus two body sprites; one compute dispatch per
  frame with four RK4 steps.
- **Open:** Kirkwood-style gaps need thousands of orbits; this field shows
  capture and scattering over tens of orbits, not gap formation.
