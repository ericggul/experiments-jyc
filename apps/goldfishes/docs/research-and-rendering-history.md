# Goldfishes research and rendering history

This is the durable cross-route record; route documents hold their own mutations. Current routes and ownership are in the [archive](./README.md).

## Family contract

Click/drag creates attention cells; Enter/Space adds the centre cell; Escape clears them. The promoted 3D baseline has 100 fish (range 0–250), scale 2 (range 1–4), perimeter targeting, collision, protected cells, top orthographic reset, full orbit, bounded zoom, and a collapsed Leva authoring panel. Every experiment owns its model, renderer, styles, atlas, and media ledgers; shared company logos are public assets only.

The exact-top view preserves comparison; orbit must reveal real height, volume, heading, and tail motion. Wheel zoom is bounded to 28–300% of fitted distance. Do not add labels, scenery, bubbles, panels, or decorative water. The 2D branch remains Canvas-based (200 agents by default): Cursor, Goldfish 1/2, Circle eye, and Rectangle eye; stable seeded assignment maps agents to its two 75-SVG eye sets, and media cells use a separate canvas/1024² atlas rather than per-cell `<img>` elements. The listed primary-grid routes each locally set `GOLDFISHES_PRIMARY_GRID_SCALE` to 2, changing cell geometry only.

## Field and media facts

`attraction-targets/1` uses a 2026-08-04 local TfL snapshot of all 11 line route sequences. The same projected station coordinates draw and attract; 100 stable targets are selected by farthest-point ordering across 272 stations. The 46 schematic route branches use 50-unit per-line height layers and interchange connectors, making orbit operational. A review of 76 Wikimedia Tube-map images retained sparse coloured routes/high-contrast nodes and rejected labels; there is no runtime API, tile, official map copy, or transit chrome.

`pillars/1` stores one extent per selected cell (0–1,080 above and below; 0–2,160 total) until that cell is removed. Top view retains the default footprint; orbit reveals the vertical relation. Its field, frustum, pointer mapping, fish scale, and model coordinates remain baseline; current camera-distance and vertical-extent multipliers are both 6. Media occupies top and sides through a shared atlas sampler, not per-cell materials.

The 3D selector includes `WHITE`, `COMPANY`, `CAT`, `KISS`, and `POLITICIAN`; White is default except Pillars/Side View start Cat. The July 2026 company atlas holds 64 technology-company SVG marks (including OpenAI, Anthropic, and SK hynix) in a local 8×8 atlas. Cat/KISS/Politician use local sets of 20/62/60 images (about 0.6/1.9/2.6 MB). Atlases decode up to four sources concurrently, are lazy, 1024²/8×8, and are cached; each RGBA atlas is about 4 MiB (5.33 MiB with mipmaps), or roughly 16 MiB for all used photo atlases. This avoids `/grid/2`'s 80 DOM images and potential 1,920 `src` changes/s. One instanced media mesh adds one draw call; White hides it. Playback is hard-cut, independently staggered, defaults to 24, spans 0–40 changes/s (0 freezes each cell), and uses bounded scheduling: 2D caps combined draws at 960/s. These are workload bounds, not FPS claims.

## Evidence ledger

At HTTPS 1470×695 with two selected cells, collision off, and three warm two-second windows, 3D White/KISS both held the browser's fixed 30 FPS cadence: 200 fish 2.377/2.310 ms CPU and 13/14 draw calls; 500 fish 5.091/4.364 ms and 13/14 calls. The one-call increase was observed; no surface speed advantage or hardware guarantee follows.

Historical Node 22.3.0 isolated model steps (1920×1080, one cell; not current Node 26.5.1/Node 24 deployment runtime) measured protected collision off/on: 200 fish 0.122/0.495 ms, 500 0.420/1.289 ms, 1,000 1.149/2.488 ms. A later 1536×900 run found protected/open perimeter: 200 0.139/0.119 ms; 500 0.464/0.447 ms, and confirmed identical open/protected state away from a cell but changed protected state inside it. These exclude rendering, React, media, and browser scheduling.

Natural/minimal-model comparison at 100 fish, scale 2 recorded 13 calls, two textures, 224,002 triangles, and a 60 FPS browser cadence for both toggle states. It shows no additional renderer structure, not universal performance. `attraction-targets/3` has its separate verification record.

## Decisions, sources, and failures

Use Three.js WebGL/instancing and the existing CPU spatial hash for the current field; do not infer that WebGPU, workers, LOD, GPU simulation, external models, or a particular final FPS is required. LUMA's *Living Landscape* is an installation-relation reference, not evidence for engine choice. Sources: [LUMA](https://luma.org/en/arles/whats-on/drift-living-landscape), [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html), [WebGPURenderer](https://threejs.org/manual/en/webgpurenderer), [MeshPhysicalMaterial cost note](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).

Do not repeat these failures: silently changing locomotion for a visual variation; decorative/anatomically overbuilt or unreadably reduced fish; nominal 3D whose top view, parallel fish, flat backdrop, and tiny depth range hide spatial evidence; or attention changes that produce projected head-butting, diffuse interior targets, or release-on-passage and thereby lose gathering. The intentional open perimeter remains behind local `AttentionZoneBehavior`; capacity-limited and inspection-slot attention variants were rejected as unintuitive. New assignment or attention modes require an explicit request.
