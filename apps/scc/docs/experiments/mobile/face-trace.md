# Face trace — /mobile/face-trace/1

2026-09-30. Experimental. The front camera and MediaPipe Face Landmarker run locally; no images are saved or sent. Camera access starts on a tap. Hiding or leaving the page stops the tracks, and returning restarts them once access has been granted. The output is mirrored like a front-camera preview.

## Contract

- Foreground: the camera's actual pixels inside the outer contours of both eyes and the mouth. Pose (position, eye span, tilt) is smoothed, adjacent frames are briefly blended, and the set enlarges up to 2× near the viewport centre. Tracking gaps of up to 1.2 seconds keep the last cutouts.
- Field: `face-voronoi/3`'s `face-gradient 3`, whose only material is the live eyes and mouth. A dense lattice of moving sites, weighted over a 5×5 neighbourhood, agrees on one shared tile coordinate. Every site's tile is then sampled at that coordinate and mixed in linear light. The chrome-like creases come from that coordinate folding between sites, not from painted edges.
- Material: the atlas is 3 features × 4 echo rows of 256-pixel tiles. Each tile is centred on one eye or the mouth, sized from its width along the eye line (1.45× for eyes, 1.3× for the mouth), mirrored, and rotated upright. The echo rows are 0, 3, 8 and 16 detection frames old. Each lattice cell holds one feature (a third each) and one echo (40/25/20/15%).
- Anchors: the three tracked features are also sites, at the cutout's mirrored position, enlarged size, and tilt, with weight `5·exp(-7|q|²)`. The field under each cutout is therefore that same live feature, and the lattice begins close outside it. Anchors ease away when the face is lost; the lattice keeps flowing from its last tiles until the camera stops.
- Mouth → local swell: opening is the inner-lip gap (landmarks 13–14) over mouth width (61–291). It is independent of distance and face size: about 0.02 closed, 0.15 in speech, 0.5 wide open. It is mapped linearly from 0.04 to 0.44 and eased at 70 ms opening and 150 ms closing. Around the mouth anchor, a Gaussian with reach 2.4× the mouth tile side does two things. It pulls lattice sampling toward the mouth by up to 62%, so cells swell outward from it. It also lowers face core locally from 0.8 to 0.1, so cells melt as they leave. Beyond the reach, the lattice keeps crisp cells. Closing pulls both back.
- Motion: time moves the sites as in the reference. The face centre replaces the reference pointer lens (warp 0.65) and drags the lattice by up to 0.8 cells. Reduced motion holds time.
- Colour: `grade.ts` reads the mean colour of the eye-and-mouth region from a 16×16 probe each detection. It lifts exposure toward 0.5 luma (never darkening, at most 1.8×) and pulls green and blue ratios 60% of the way toward skin (0.82 and 0.72 of red, each gain 0.82–1.22 and luma-preserving). It then applies contrast 1.16 and saturation 1.14. One sRGB matrix, eased at 0.12 per detection, grades the field in the shader and only the cutout bounding boxes of the foreground on the CPU, so both layers match.
- Budgets: the camera requests 1920×1080 at 30 fps. Landmarks run about 15 times per second on a 640-wide copy. The WebGL field renders at full device pixel ratio (at most 2×) and about 30 draws per second. After 20 draws slower than 50 ms, it steps resolution down by 0.85 (to at least 0.5×), and steps back up after 240 draws faster than 38 ms. The foreground renders at up to 2× and 5 million pixels, about 24 draws per second. Cell size is 5 per viewport short side.

## History and useful failures

The family was reset on 2026-09-30. Six earlier routes (`/1`–`/6`, 2026-09-28) were removed, and the lattice route, briefly `/7`, became `/1`. Viewed in Chrome, the removed routes looked like this:

- `/2` smeared brown skin into a sine swirl.
- `/3` stacked oval stickers of the features at ten scales.
- `/4` showed the blurred camera face under a vignette.
- `/5` split the screen into hard radial sectors.
- `/6` repeated feature copies on sixteen rings.

Each treated the three tracked features as the only sites and used the surrounding skin as material, so none produced a cellular field. The lesson that carried over: keep the features as material, and let a dense moving lattice, not the three features, provide the geometry.

The first lattice version was low-resolution, dull, and dark:

- The camera track was 640×480 (eyes about 35 source pixels, magnified roughly sevenfold).
- The WebGL cap of 600,000 pixels rendered a desktop at about 0.7×.
- A backlit room left the face dim and grey-violet.

The budgets and grade above are the correction.

The second lattice version still looked soft, and its mouth mapping felt unrelated to the mouth:

- The field's 1.4-million-pixel cap drew a 1525×773 retina viewport at about 1.07× instead of 2×.
- Mouth opening lowered face core uniformly across the whole screen, behind a dead zone and 420 ms of easing, so the change read as the whole screen blurring rather than something the mouth did.

The field and foreground now render at 3050×1546 in that viewport. Tiles are resampled at high quality, cells are smaller (5 per short side), and the mouth acts locally and proportionally.

## Evidence

2026-09-30, Chrome at the HTTPS origin. The automation tab reported `document.hidden`, so visibility was shimmed in the page for inspection. Portraits from `public/images/face-voronoi/portraits/` were fed in through a canvas stream as a stand-in camera; a live backlit camera was also viewed.

- Observed: shader compilation, anchor alignment, and a 1920×1080 track. With the grade, the field was sharper and the violet cast gone.
- Mouth test (local swell): switching the stand-in from a closed mouth (`030.jpg`) to an open mouth (`031.jpg`) made the lattice swell and melt outward from the mouth, while the screen edges kept crisp cells. Closing returned it within a few frames, with open-mouth echoes briefly in some cells. Both canvases held 3050×1546. No console errors.
- Unverified: a live mouth opening on a phone, phone GPU cost at full resolution and whether the fallback engages there, and the grade under other lighting.
