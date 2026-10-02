# Mobile finger-skating/2 — a skated curve read back as a formula

- **Route:** `/mobile/finger-skating/2`
- **Date:** 2026-10-02
- **Baseline:** `finger-skating/1`'s paper and ink palette, captured-pointer and coalesced-sample discipline. The plane is new.

## Interface premise

The participant finger-skates (or mouse-drags) one curve across an empty Cartesian plane. The perceptual task is to compare one's own gesture with the function that best explains it. The screen therefore holds only what that comparison needs: centred axes with unit ticks and sparse numerals; the stroke as a soft grey trace; the fitted function in one accent colour, extended across the whole plane so its extrapolation is visible; and the formula in the same accent at the top. The origin is the viewport centre, and the short side spans 10 units (±5 on a phone, roughly ±8 × ±5 at 1440 × 900). A new stroke replaces the previous one. While the finger is down, the formula and curve update at most every 140 ms; release triggers the final fit. One faint line, “draw a curve”, is shown until the first stroke. The stroke is stored in plane units, so it keeps its meaning through a resize.

## Model card (`model/fit.ts`, `model/formula.ts`)

1. **Stroke:** resampled by arc length (at most 110 points) so dwell and finger speed do not weight the fit. Pixel jitter `σ` = 1.5 px in plane units.
2. **Function or relation:** the stroke is a graph of `x` unless its middle (the first and last 7% are ignored, because landing and lifting hook) travels back against its overall x direction by more than a tenth of its width, or it is nearly vertical. Graphs are offered `y = f(x)` families. Strokes that turn back are offered `x = g(y)` (degree 0–3) and a circle.
3. **Families:** polynomials of degree 0–5; `A sin(bx + φ) + d`; `a e^(bx) + c`; `a|x − h| + k`; `a/(x − h) + k`; and, for relations, a circle. Linear coefficients come from weighted least squares: QR for the polynomials, and small normal equations inside the one-dimensional scan of each family's nonlinear parameter (grid search, then golden-section refinement). Three reweighting passes with `w = 1/(1 + f′²)` turn vertical residuals into first-order orthogonal distances. The circle uses a Kåsa estimate refined by Gauss–Newton.
4. **Selection:** every candidate is measured by orthogonal distance from the stroke to the curve, ignoring the worst 6% of samples (hooks). The score is `ln(MSE / size² + 0.02²) + 0.5 k`, where `size` is the stroke's bounding diagonal and `k` the parameter count.
5. **Readable coefficients:** each coefficient in turn takes the coarsest step (1, ½, 0.1, 0.05, 0.01, …) that keeps the orthogonal RMS within `max(1.25 × RMS, RMS + 1.5% of size)`. Unit coefficients and zero terms are dropped; minus is U+2212; variables are italic and exponents raised.

### First version failed (2026-10-02)

The first selection used BIC over all resampled points with an absolute 1.5 px noise floor. On the participant's device it was wrong almost every time. Hand strokes deviate systematically by a few percent of their size, so their 160 samples are not independent observations: BIC let every extra coefficient chase the wobble (quintics everywhere). The strict graph test also sent ordinary end hooks to the circle and `x = g(y)` branch. Reproduced offline with simulated hand strokes (slow 2–8% wobble, end hooks, pixel quantisation), the first version recognised about 1 in 10. The current scale-relative score was tuned on 360 randomized strokes across ten families. Recognition is about 99.5% at 1% wobble, 98.5% at 3%, 96.5% at 5% and 88.5% at 8%. Most remaining confusions are a single hyperbola branch versus a decaying exponential (genuinely similar shapes) and weak cubics read as lines. A fit takes about 12 ms on the development machine.

Tests (`model/fit.test.mjs`) recover clean synthetic strokes of every family, plus seeded hand-drawn strokes that must read exactly `y = x²`, `y = 0.5x² − 2`, `y = 2x + 1`, `y = −x + 1`, `y = 2sin(x)` and `y = |x|`, and an exponential family for `e^x`.

## Unresolved

- Families outside the set (logarithm, tangent, piecewise curves) are approximated by the nearest member, usually a polynomial, rather than recognised. A single branch of `1/x` and a decaying exponential remain hard to tell apart.
- Whether the live update rate feels responsive on a phone, and whether `σ = 1.5 px` matches real finger jitter. The tuning uses simulated strokes; confirming it against real finger strokes on the device is still open.
