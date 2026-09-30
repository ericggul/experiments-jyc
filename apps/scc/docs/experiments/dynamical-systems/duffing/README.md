# Duffing

This is a bounded, direct observation of the declared Duffing dynamics. Preserve its explicit parameters, integrator/state separation, stable entities, direct view/parameter interaction and field-first visual contract. A rendering change cannot alter the equation or imply physical measurement. Keep finite/bounded model checks; omit generic controls, metrics and dashboard treatment.

## duffing/2 — balls in a shaken double valley

Route/date: `/duffing/2`, 2026-09-30. `/1` is preserved unchanged.

- **Tested relation:** `/1` showed a coloured phase-plane cloud beneath an
  editor and did not say what a Duffing oscillator is. `/2` shows the
  physical situation: balls with friction in a double valley whose floor is
  tilted back and forth by the drive.
- **System:** `x' = v`, `v' = −0.3v + x − x³ + γ cos θ`, `θ' = 1.2` (fixed
  δ, ω). The drive phase `θ` is a third state coordinate, so every particle is
  an autonomous 3D state integrated by RK4 on the GPU (3 × `dt = 0.02` per
  frame).
- **Space:** angle = `θ`; radius = `2.2 + 0.62x` (the two wells become an
  inner and an outer valley); height = the tilted potential
  `−x²/2 + x⁴/4 − γx cos θ` that the ball is on. Once round the ring is one
  drive cycle. Faint lines are that potential's cross-sections at 56 phases,
  i.e. the landscape itself. Velocity is not spatial; colour carries it
  (warm = slow, cool = fast).
- **Reading:** the number of strands around the ring is the response period.
  γ 0.20: two separate rings, one per well (bistability). 0.28 → 2,
  0.29 → 4, 0.37 → 5, 0.50 → a chaotic band, 0.65 → 2 swinging across the
  hump. These are the classic values for δ = 0.3, ω = 1.2.
- **Population:** 30,000 particles seeded in `|x| ≤ 1.9`, `|v| ≤ 1.2`,
  uniform `θ`, and re-seeded after 14–44 drive cycles (faint for 1.5 cycles).
- **Evidence:** `model/regimes.test.ts` checks every regime's stroboscopic
  period from three seeds and the two separate wells at γ 0.20. 2026-09-30
  HTTPS Chrome (hidden tab, injected ~60 Hz scheduler as in bifurcation/2):
  γ 0.20, 0.28, 0.50, and 0.65 rendered as described, with no console or GPU
  errors.
- **Budget:** 30,000 sprites plus one 10,752-vertex line set, one compute
  dispatch per frame.

## duffing/3 — the same ring under a drifting drive

Route/date: `/duffing/3`, 2026-09-30. Baseline: `/2`, reviewed by the user as
relatively good but missing the trend between regimes.

- **Changed variable:** γ is no longer picked from six presets. It drifts
  continuously from 0.18 to 0.70 and back (rest 8 %, drift 42 %, rest 8 %,
  drift back 42 % of a 650 model-time cycle, about 135 s at 60 Hz). One
  ensemble lives through the whole route: two separate wells, period 2, 4, 5,
  chaos, and the large period-2 swing.
- **Kept from `/2`:** equation, ring geometry, speed colour, camera. The
  landscape lines are now lifted in the vertex stage from the same γ uniform,
  so the valleys tilt harder as the drive strengthens. Particles are no longer
  re-seeded; the drift itself keeps moving them to new attractors.
- **Slowness:** the steepest drift changes γ by under 0.02 per settling time
  (≈ 7 units at δ = 0.3), tested in `model/sweep.test.ts` with the full
  period route. Narrow windows such as period 4 (0.28–0.29) still pass
  quickly and may show as a blur of strands.
- **Evidence:** 2026-09-30 HTTPS Chrome (hidden tab, injected ~60 Hz
  scheduler): two separate rings at γ 0.186; the inner ring pulled over the
  hump by 0.337; a chaotic band at 0.394–0.447. No console or GPU errors.
- **Budget:** 30,000 sprites, one 10,752-vertex line set, one compute
  dispatch per frame with four RK4 steps.
