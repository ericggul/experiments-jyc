# Bubble

Family: `/bubble/[experiment]`, code in `components/complex-systems/bubble/<n>`, created 2026-10-07.
Each route is a standalone copy; routes share no imports.

## First principle (user, 2026-10-08) — every route and every agent

The subject is **an evolving network (graph) represented as bubbles**, not bubbles made pretty. Start from complex
systems and network science — what the graph is, how it grows and rewires, what flows along its links, which nodes
become hubs — and let the bubbles carry that. Never start from a mathematical construction (packings, lattices,
tessellations) or from a rendering trick. Work on top of `/1`'s proven substrate and change one relation at a time.

| Route | What it is | Record |
| --- | --- | --- |
| `/1` | 7-glsl-6 copied: route 7's PageRank web as a soap-bubble raft | [1.md](1.md) |
| `/2` | `/1` copied, with a network panel and a visual-parameter panel (bottom-right) for adjusting both | [2.md](2.md) |
| `/failure/2`–`/failure/5` | rejected builds (2026-10-07/08), kept as recorded failures | [failure/](failure/2.md) |

## Goal (reset 2026-10-08)

Many visual experiments in which **bubbles represent a network's relations** — who is linked to whom, hubs,
what flows along links, how the graph grows and changes — not a visualisation of bubbles for their own sake.
`/1` (a copy of `adaptive-coevolving-network/7-glsl-6`) is the baseline and the **minimum** quality.
`/2`–`/5` must each be **better than `/1` and in a different direction from it**: hyperreal, sophisticated, natural,
ecological, self-evolving, and genuinely surprising — never comic, never 2D-graphic, never clumps.
Copying `/1`'s renderer or look into a new route is not an answer.

## User requirements (collected from the user's requests, 2026-10-07/08)

1. The network must be legible as relations between particular bubbles (as `/1` shows rank budding from page
   to page). Bubbles merely diffusing, packing or coarsening is not a network.
2. One method per route, each developed to its best:
   `/2` random Apollonian network — bubbles born where three meet, walls as links (to be redone completely);
   `/3` the foam as its own network — coarsening, T1, T2 (generation logic possibly worth keeping; look rejected);
   `/4` a planar network circle-packed so contacts are links, with films that remember (first look acceptable,
   performance not);
   `/5` a GPU cellular-Potts foam whose contacts are the network (composition acceptable, texture rejected).
3. Hyperreal, natural, ecological, self-evolving; surprising. Not comic, not 2D, not clumps, not wallpaper,
   not artificial texture.
4. Image quality at least `/1`'s at device resolution; no blur, no jagged or serrated edges.
5. Performance: 60 fps at DPR 2 on the user's Mac, including a full-screen window (2940 × 1912 device px).
6. Calm: no flicker or blinking; dynamic but not jittery.
7. Inherited rules from 7-glsl-6: form computed in GLSL; node and link one substance; nothing drawn over
   anything; no lines, channels or connectors; every node visible; transfers continuous, each at its own pace,
   no global beat; bubbles occupy area/volume, irregular and natural, never uniform circles.
8. Before reporting, the lead looks at every route in the browser beside `/1`, and measures it.
9. Replies to the user in Korean.

## Measurement method

Local HTTPS dev server, Chrome, viewport 1470 × 706 CSS, DPR 2 (canvas 2940 × 1412). The automation tab is
hidden, so frames are driven by a MessageChannel shim installed before a client-side navigation to the route.
**Cost** is one frame's work with the GPU synchronised by a 1-pixel `readPixels`; **flicker** is the mean absolute
luminance change (0–255) of a 240 × 120 downsample per 0.1 s; **blinks** are downsampled pixels changing by more than
48/255 per 0.1 s. Numbers taken while other agents were measuring on the same machine are marked "under load".

| Route (round) | Cost median / p95 (ms) | Flicker | Blinks | Mean luminance |
| --- | --- | --- | --- | --- |
| `/1` | 6.4 / 14.6 | 3.66 | 638 | 6.8 |
| `/2` (1) | 7.4 / 10.3 | 0.52 | 5.7 | 104.6 |
| `/3` (1) | 7.7 / 15.4 | 8.55 | 739 | 58.7 |
| `/3` (3, under load) | GPU 3.8 / 6.8 | 0.40 | 31–39 | ≈ 6.8 |
| `/4` (1) | 6.5 / 12.1 (GPU 4.6 / 11.2, CPU 1.4 / 3.7) | 3.43 | 151 | 41.1 |
| `/4` (2, under load) | GPU ≈ 3.8 by timer query; harness 8.9–17.1 | 1.63–2.13 | 162–229 | — |
| `/5` (1) | 13.2 / 14.9 | 3.18 | 71 | 43.7 |

## Failure record (all rejected by the user, 2026-10-08)

### Process failures (lead)

- Four agents built `/2`–`/5` in parallel without seeing the screen; the lead reported their results without
  looking. The first look the user saw was therefore untested.
- The lead's briefs said "fill the screen edge to edge" (a misreading of 7-glsl-6's rule), which produced wallpaper
  in every route.
- The lead's round-2/3 feedback was itself wrong: "walls as thin lines of light" turned `/4` into a white wireframe
  diagram; "black interiors, light at rims" turned `/3` into neon-outlined cartoon blobs. Feedback written as
  one-line visual recipes replaced the user's direction with the lead's.
- When `/2` was to be redone, the lead began copying `/1`'s renderer into it — the opposite of the requirement for a
  different, more sophisticated direction. Stopped and reverted.
- Replies were written in English.

### `/2` — random Apollonian network (round 1)

- **Technical:** torus vertex model with straight walls (no Laplace bowing); a pixel finds its owner and then walks
  up to about 60 walls of a hub; area ∝ (links − 2)^1.6; film shaded as grey interference across the whole interior.
- **Visual:** opaque grey polygonal plates with iridescent contour bands and faceted highlights, walls straight,
  shapes odd; reads as plates or tiles, not bubbles, and not as a network (user: "worst, hopeless; redo completely").
- **Performance:** 7.4 / 10.3 ms; acceptable, irrelevant given the look.

### `/3` — foam as its own network

- **Round 1, technical:** exact power diagram on a torus, about 1,000 cells; each wall drawn as a wedge; per pixel
  the distance to the arcs builds a dome (`rimSlope` 1.15) and a noise-texture film. Physics was sound (von Neumann
  slope 0.986, mean sides 6.000, Aboav–Weaire 1.24).
- **Round 1, visual:** a full-screen wallpaper of bevelled dark pebbles with noise speckle — "rock".
- **Round 1, performance:** 7.7 / 15.4 ms; flicker 8.55 and 739 blinks (worse than `/1`), from the speckle film and
  about 138 T1 swaps per second.
- **Rounds 2–3, technical:** a raft of power cells clipped by their own discs, `/1`-like film, transfers as small
  budding bubbles. **Visual:** first grey spheres on a bed of small bubbles; then large flat-dark discs with a soft
  4–6 px white halo on every outline, transfer bubbles as hollow rings, population collapsing to about six giants;
  interiors hazy and low-contrast, walls soft-focus. User: comic, 2D, clumps, poor image quality, not hyperreal or
  self-evolving. Flicker numbers were excellent, which did not matter.

### `/4` — circle-packed planar network

- **Round 1, technical:** Collins–Stephenson packing (contacts = links exactly, verified 775/775); two full-resolution
  passes each run an owner search (4 texels + 2 correction passes over 24 slots) and a 24-slot loop with `exp`.
- **Round 1, visual:** dark films with soft drainage, the best look of the four (user: "not bad"); but wallpaper and
  dark stretched giants cut by the screen edge.
- **Round 1, performance:** GPU-bound, GPU 4.6 / 11.2 ms at 2940 × 1412; a full-screen window has about 35% more
  pixels, so frames drop (user: "unacceptable").
- **Round 2:** owner and nearest walls at half resolution, film at ⅓ (GPU ≈ 3.8 ms); visual regressed: grey
  3–4 px wall bands like bubble wrap, dome caps, smoky texture during coalescence.
- **Round 3 (stopped mid-edit):** thin white lines on near-black cells — a wireframe diagram (user: "childish").

### `/5` — GPU cellular Potts foam

- **Round 1, technical:** 735 × 381 lattice (0.5 × CSS), 20-neighbour wall energy, 2 sweeps per frame in nine
  sublattice passes, scatter-add reductions, smoothed walls read through a B-spline; 25 draw calls, about 14 MB.
- **Round 1, visual:** full-screen dark wrinkled plastic: swirl bands over every interior, a hard specular smear on
  each cell, pencil-line walls (user: "obviously artificial; redo the texture").
- **Round 1, performance:** 13.2 / 14.9 ms — too slow.
- **Round 2 (stopped):** a raft, but every wall jagged and serrated — the lattice shows through the upsampled wall
  field — crumpled polygonal bubbles, harsh crinkled white walls, low apparent resolution (user: "crumpled,
  unreadable, slow, low resolution, unnatural"). The lattice is the cause; a texture pass cannot fix it.

## What the failures share

1. **No network.** Every route showed a material (foam, packing, lattice) and not relations between particular
   bubbles: no visible who-feeds-whom, no growth of structure the eye can follow.
2. **Flat shading of a 2D partition.** All four drew a planar partition and shaded each cell from a 2D distance field
   (domes, bevels, rims, outlines). Real bubbles are thin transparent 3D films: their look comes from refraction of
   what lies behind, reflection of the surroundings, interference that flows, and overlap in depth. A 2D cell shade
   reads as pebble, plastic, wireframe or cartoon whatever its parameters.
3. **No life.** Nothing evolves on its own in a way that is surprising: no ecology of birth, competition and death.

## What the accepted work shares (lead's reading, 2026-10-08)

The user accepted `/1` (7-glsl-6) and called 7-glsl-3 (Turing tissue) and 7-glsl-5 (surfer colony) the best of the
ranked-web series. All three are near-monochrome (grey-white on black, colour only as a faint tint), their texture is
intricate and comes out of a computation (reaction–diffusion, agent trails, draining film), and their shapes are
irregular. Every rejected bubble build broke at least one of these: saturated interference colour, smooth or flat
fills, perfect circles, studio or photographic staging, 3D scenes.

## Verdict: `/2`–`/5` are failures (user, 2026-10-08)

After about fifteen builds the user ruled all four routes failures and asked for a different approach. Their code stays as
recorded failures; their records hold the details. The lead's root-cause analysis:

1. **Rebuilt the substrate every time instead of varying one relation.** "A different direction from `/1`" was read as
   "replace everything": geometry, layout, light and film were re-invented from zero in each round (3D clusters, rafts on
   liquid, simulated films, ray-traced spheres, Apollonian discs, lace shading). The tinkering method says to start from the
   closest working baseline and vary one coherent relation; `/1`'s substrate (physical layout, power-diagram walls, flowing
   film field, restrained grey) is what makes it read as natural, and each rebuild threw it away.
2. **Form came from mathematical constructions, not from a process.** Apollonian discs, circle packings and Potts lattices
   are exact and regular; drawn as they are, they read as graphics. What the user accepts (`/1`, 7-glsl-3, 7-glsl-5) is form
   that evolves out of a physical or agent process.
3. **Realism was faked locally, per complaint.** Each round patched the last named symptom (lines, colour, glow, overlap,
   resolution) with a new shading trick — a stamped window, a scatter term, a smooth-min fillet, a tint, a room — and each
   trick introduced the next artificial cue. This is the failure pattern already written in the 7-glsl-6 record, repeated.
4. **No stable visual standard or check.** The lead judged with its own reading of small screenshots from a hidden tab,
   swung between references (stock macro photography, foam photographs, studio lighting) and showed builds without a
   side-by-side comparison against `/1`. The user's standard is `/1`'s quality and naturalness, not imitation of
   photographic staging.
5. **Process damage.** Parallel agents built blind; feedback was given as one-line visual recipes; English replies;
   unverified builds were shown (broken aspect, overlaps, missing walls, reserved-word compile errors).
