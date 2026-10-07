# `/adaptive-coevolving-network/7-glsl-6` — ranked web as a raft of soap bubbles (2026-10-07, in progress)

- **Question (user, 2026-10-07):** PageRank as *bubbles* — natural, organic, attached to each other and generated, each bubble occupying area and volume, rank in transit moving continuously along every link at its own speed, with no explicit connection at all.
- **Baseline:** route 7's model, gestures and options; 7-glsl-3's presence-weighted layout copy; `iteration.ts` (power iteration of a displayed distribution; tests in `iteration.test.ts`). The renderer is the variable.
- **Standing rules from the user's feedback (apply to every attempt):**
  1. GLSL computes the form; never flat.
  2. Abstract and minimal, yet organic: self-sustaining, proliferating, generated rather than drawn. No background texture, nothing cheesy, kitsch or "AI slop".
  3. Node and link are one substance; nothing drawn over anything; no explicit or cheesy connection (no lines, dotted lines, channels, processes).
  4. Every page visible (small ones may be smaller and cluster); rich-get-richer legible without adding pages.
  5. Calm (no flicker) without killing dynamism; no accumulating traces; fill the screen; 60 fps.
  6. Transfers continuous, each link at its own speed — no global beat.
  7. Bubbles occupy area/volume; they are attached to each other and generated; irregular and natural, never uniform circles, never 2D-graphic.
  8. Earlier routes (3, 5 are the best) are references, not templates: do not copy their material or mechanism.
  9. Look at the route in the browser before reporting.
- **Failed attempts (all rejected by the user, 2026-10-07):**
  1. Pulses of light along filaments (subagent build): not organic; node and link apart.
  2. 7-glsl-2's gel with a travelling bolus: a copy of 7-glsl-2.
  3. Cell tissue (weighted Voronoi by jump flooding) with processes along links: processes shredded the tissue into cracks; then grey bevelled tiles with swelling waves — flat, "cobblestone", links invisible.
  4. Metaball mass (pools that neck off portions on a global beat): cream blobs, synchronized, discrete.
  5. Same with per-link rhythm and lobed pools: still unnatural.
  6. Transparent sphere-shaded metaball bubbles: "artificial, 2D-graphic bubbles".
  7. Depth-peeled sphere foam (separate round bubbles, later packed): "uniformly round, AI-slop bubbles".
  8. Gray–Scott froth (Munafo's soap-bubble regime, F .062 k .061, measured in Node) with rank cores: a copy of 7-glsl-3's mechanism and material, and rings with empty interiors — "not bubbles".
  9. Packed foam cells filled as solid domes: "ugly, solid, odd boundaries, chunky; motion organic but form not; does not use GLSL".
- **Lessons:** each attempt fixed the last complaint and broke an earlier rule; shapes placed by the CPU and merely shaded by the GPU read as artificial; outlines read as empty, solids as rock.
  10. Over-correction after the soap-bubble version (below): weaker gravity and springs, a mass-weighted rigid contact, no contact floor and a velocity correction made the bubbles move fast, contract and look rigid — "less organic, harder, more discontinuous". Reverted at the user's request to the behaviour they had seen at the request to check 830 pages, keeping only changes that compute the same thing faster.

## Current version (soap bubbles)

- **References (searched 2026-10-07):** planar soap-bubble geometry after [LittleBadger/bubbles](https://github.com/LittleBadger/bubbles) — bubble *i* owns the points where `|p − cᵢ|²/rᵢ − rᵢ` is smallest and negative, so walls are circular arcs bowing by pressure and meet at 120° at the contact distance `√(r₁² + r₂² − r₁r₂)`; film colour from two-beam thin-film interference ([Zucconi](https://www.alanzucconi.com/2017/10/27/carpaint-shader-thin-film-interference/)); film drainage and swirl as in ["Bubbles on still soap"](https://gist.github.com/robksawyer/68972177f4d997c15b1eda30eb98414d) and the parameters of the [Iridescent Shader Pack](https://hot-spud-lab.itch.io/iridescent-shader-pack) (thickness, flow, noise).
- **Renderer (`foam.ts`):** two depth-peeled passes at .75 CSS resolution keep each texel's nearest and next bubble by that function; the composite gathers the 3 × 3 texels' candidates and decides exactly per pixel (walls off the texel grid), takes the distance to the nearest wall over all overlapping neighbours, and shades every bubble as a film filling its whole cell: a shallow cap, film thickness 20–900 nm draining toward the top and folded by slow domain-warped noise, interference at 650/532/450 nm with the colour mostly tempered to grey, Fresnel weight, one window highlight and its faint mirror from the back face. Empty ground is skipped.
- **Layout (`layout.ts`, this route's copy):** springs, repulsion between every pair, gravity .6 as before; contacts at the Plateau distance (at least the larger radius plus a quarter of the smaller); much larger bubbles (3×) never yield to small ones; a last pass settles small against large; capillary attraction is a gentle force once per step. Contact pairs are found by sweep and prune (the same pairs as before, cheaper). Springs .4 (was 1.6) and six contact passes so small bubbles are not dragged into their hubs.
- **Flow:** the displayed distribution relaxes continuously toward one power-iteration step (no beat); every link sends a portion on its own period (1.3–3.2 s) and phase, budding from the source and merging into the target, with mass conserved at every moment.
- **Found and fixed:** bubbles on the same point had no direction to part and stayed stacked (680 at one pixel); capillary pulls applied in every contact pass summed over a crowd and collapsed small bubbles onto single points (5,848 coincident pairs in Node). Both fixed.
- **Measured (Node, 30 s of the model and layout):** bubbles owning their own centre — 109 / 109 at 100 pages, 822 / 839 at 830 pages (before: 52 / 109 and 29 / 839). Layout step at 830 pages 4.1 ms (was 20–29 ms).
- **Measured (browser, hidden tab with frame shim, GPU synchronised, DPR 2, 2940 × 1412):** 830 pages: frame median 15.1 ms, p95 19.9 ms (was 47.6 / 61.1). 112 pages, 40 s after load while the raft was still settling: frame median 19.2 ms and p95 27.7 ms with the measurement's own read-backs; frame difference 20.3/255 per .1 s and many blinks, from thin bright walls moving — not yet acceptable.
- **Unresolved:** motion and flicker while the raft settles; dark notches along some walls where three or more bubbles overlap; GPU cost at DPR 2; whether this reads as natural bubbles to the user.
