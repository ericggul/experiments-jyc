# `/adaptive-coevolving-network/7-glsl-6` — ranked web as bubbles (2026-10-07, in progress)

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
