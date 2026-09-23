# 3D face and lips trials, then full-field expansion — 2026-09-23

Route: `/screen/0922/default`. The existing 2D face and lips controls remain
available for direct comparison. Each surface began as a five-source study;
the later full-field option follows the requested visual evaluation.

Question: can the already circulating CEO portraits and lips become perceptibly
volumetric without losing their photographic identity or the field's odd humor?
Baseline: this route's 2D face and lips-v2 image surfaces and its shared fish,
story, and right-panel behavior. Mutation: optional source-textured 3D face
forms and optional sculpted 3D lips. Unchanged: fish model, target geometry,
story movement, field presets, 2D sources, eye modes, and initial selection.

Face test: Sam Altman, Mark Zuckerberg, Jensen Huang, Sundar Pichai, and
Dario Amodei (IDs 001–005). Each uses the same locally held Commons portrait
as its 3D eye study. A centered facial projection covers a rounded volume;
from the front the person should remain recognizable, while rotation reveals
the deliberately strange sphere rather than a photo card. Photo credits and
licenses remain in the [eye source ledger](../../components/screen/0922/default/model/tech-eye-3d-profiles.generated.json).

Lips test: Sam Altman 001, Lisa Su 011, Bill McDermott 035, Arthur Mensch 030,
and Bill Gates 078. Their original `tech-power-lips-v2` crops remain the exact
2D comparator. Since some V2 rasters are as small as 15×5 pixels, the 3D
albedo is extracted from the corresponding higher-resolution original Commons
portrait when possible; the source is never invented by upscaling that tiny
crop. IDs 035 and 030 deliberately test clipped V2 framing. ID 020 was
rejected because its matching original portrait still yielded only a tiny,
unusable mouth region. The material
registers to upper/lower sculpted lip surfaces and a mouth opening, rather
than wrapping a 2D rectangle round a sphere.

Evaluation surface: the existing right panel exposes the optional modes and a
close-up/2D comparison for each identity. The initial five-person comparisons
were retained while the selectors expanded to the full 80-person story.

Rendering budget: one shared WebGL context per mutually exclusive trial mode,
DPR 1, lazy source decoding, bounded meshes and cleanup. Browser observation
checks the exact HTTPS route, visible models, rotation, warnings/errors, and
coexistence with the moving fish before any performance claim.

## Initial five-source result (superseded by the expansion below)

Both optional modes are exposed under `face` and `lips` in the existing right
panel. The default `eyes` surface and both 2D archives are unchanged. Face 3D
uses a source-cropped photographic front, softly blended into a deliberately
ovoid side/back. The five forms use separate crop windows and proportions. Lip
3D uses a per-source Vision crop and five individually tuned upper/lower
fullness, width, Cupid dip, smile, aperture, and teeth profiles. The shapes
are authored interpretations of the photos, not measured facial scans.

The HTTPS route was visually inspected for all five face identities (including
rotation) and all five lip identities. Initial browser review exposed an
off-center full-portrait projection, inverted facial UV, a hard photo-side
edge, culled upper lip, over-large dark mouth disk, and vertically mis-copied
field atlas tiles; these were corrected before presenting the trials. The
3D inspector and field now render in both modes, while selecting photo 2D
restores the untouched originals. A remaining aesthetic question is whether
the isolated, sculpted mouth treatment has enough likeness without its
surrounding face—this is for the requested user evaluation before expansion.

Verification: Goldfishes typecheck, scoped ESLint, asset audit, and diff checks
pass. The asset audit reported 642 references with none missing. Browser logs
showed no warnings/errors during the face/lips review. A timed GPU frame-cost
benchmark has not been taken; the renderer's DPR 1, 24 Hz ceiling, shared
context, and disposal are implementation limits, not a measured FPS claim.

## Full-field expansion

The optional `face 3D · all` and `lips 3D · all` controls now map every story
index to its own source identity. Neither replaces the preserved photo 2D
control or changes the default eyes/blinking-2D surface.

Faces: all 80 local portraits render on individually proportioned, softly
animated ovoids. The earlier trial's untextured core plus a second
photographic shell was rejected: a single sphere mesh now has one opaque
texture baked from that person's own cropped portrait. Colours sampled from
the image's interior extend into its sides/back within the same texture;
there is no layered mesh or underlying 2D story image in 3D mode. The size,
taper, and gentle squash vary per person. Four portraits (016, 020, 058, 075)
remain lower-resolution but still render on the same 3D geometry. One
320×320 DPR-1 WebGL context sequentially draws
visible faces into 2D canvases at at most 18 Hz; off-screen entries do not
allocate a face texture, and inactive textures are released.

Lips: all 80 identities render photographed mouth texture on individually
varied upper/lower 3D forms. The higher-resolution group comprises 45 newly
extracted local crops, two
preserved trial crops (030, 035), and 17 further exact-person, licence-matched
Commons originals recorded in
[`lips-3d-upgrade-batch.json`](../../components/screen/0922/default/source/lips-3d-upgrade-batch.json).
The field form is slightly larger than the five-source trial, with a less
glossy, more skin-like finish. Browser comparison exposed a reversed atlas
row index that had darkened many mouths; correcting it restored each
photographed person's colour and texture. The remaining 16 identities use
their own lower-resolution V2 mouth crop as the texture of the 3D lip mesh,
never as a flat field fallback: 013, 020, 034, 038, 042, 058, 061, 062, 064,
067, 070, 071, 074, 075, 076, 079. Five exact originals remain too small
for a higher-quality crop; the other eleven were unavailable because
Wikimedia rate-limited the source request. Their 3D form is real, but the
photographic detail cannot exceed that source. No substitute person's mouth
or invented photographic detail was introduced. The shared lips renderer uses a 10×10,
1280²-pixel source atlas so all 80 slots fit without evicting a visible mouth.

Live HTTPS browser checks covered mode switching, full-field readiness,
inspector identity changes, the four formerly flat faces, a formerly flat
low-resolution lip, and warnings/errors.
Goldfishes typecheck and asset audit passed (649 references, none missing),
as did diff checks. The renderer has explicit resolution and frame-rate caps;
no device FPS or GPU frame-time claim is made.
