# ar/chemical-decomposition

## /1 — 2026-10-13

Route `/ar/chemical-decomposition/1`; code `components/ar/chemical-decomposition/1`.

**Tested relation.** The phone's camera view is written over with what each visible thing is made of: every region is lettered with its material's constituent formulas, drawn in proportion to their mass shares. The participant points the phone at a scene and reads it as chemistry. A lake reads H₂O, sky reads N₂ · O₂ · Ar, a leafy tree reads mostly H₂O with (C₆H₁₀O₅)ₙ and an occasional C₅₅H₇₂O₅N₄Mg. There is no surface tracking: lettering is fixed to the screen, and regions reveal it.

**Recognition (on device, in a Web Worker).**
- [SegFormer-B0 ADE20K](https://huggingface.co/Xenova/segformer-b0-finetuned-ade-512-512) parses the scene into ADE20K's 150 indoor, urban and landscape classes. It gets about 200k input pixels on WebGPU and 90k on WebAssembly; the output map is a quarter of each side.
- [D-FINE-N COCO](https://huggingface.co/onnx-community/dfine_n_coco-ONNX) at 640² adds COCO's 80 objects (phone, laptop, keyboard, cup, cutlery, food…), stamped as inscribed ellipses over the scene map.
- [MobileCLIP-S0](https://huggingface.co/Xenova/mobileclip_s0) vision chooses each region's material among that class's phrases (`model/catalog.ts`, 668 phrases, about 610 thing×material identities). Text embeddings are precomputed: rerun `node components/ar/chemical-decomposition/1/scripts/embed-phrases.mjs` after editing the catalogue. The worker refuses stale embeddings and falls back to each class's first candidate. Crops are square around the region, and pixels outside it fade 65% toward grey. Material beliefs follow regions across frames (`inference/tracks.ts`, name + IoU) and blend 0.45 per look; WebGPU makes 4 looks per frame, WebAssembly 2.
- Precision: fp16 on WebGPU with `shader-f16`, else fp32. On WebAssembly: SegFormer q8, D-FINE and MobileCLIP fp32. Measured offline in Node: int8 D-FINE aborts onnxruntime, and int8 MobileCLIP misnames most materials (lake → muddy water, white wall → brick). fp16 matched fp32 on all six test photos.

**Compositions.** `model/materials.ts`: about 120 materials by mass share, normalised per material. Polymers use repeat units (`(C₂H₄)ₙ`), minerals ideal end-members, and mixtures without one formula (lignin, protein, bitumen, humus) use named typical molecules (monolignols, amino acids, C₂₅H₅₂/pyrene, Steelink's humic acid). Trace constituents keep their real share, so they appear rarely.

**Lettering.** `render/tape.ts`: each text row holds an endless, deterministic tape of formulas per material. A region shows only the part of its material's tape inside it, so formulas inside an unchanged region never move, and a moving edge hides or reveals whole formulas. New analyses cross-fade in over 280 ms. Two views (options control copied from bubble/3): *카메라 위에* puts white lettering over the camera dimmed to 50%, and *화학식만* leaves only the lettering, tinted per frame by the live camera, with a 20% white floor. Type sizes are 10 / 13 / 18 px. Tapping a region lights every region of the same thing and material, and opens its top eight constituents with mass %.

**iPhone crash and phone budget (2026-10-13).** On iOS Safari (iPhone), the first version loaded to 100%, showed lettering briefly, then the page closed. It was running all three models at up to ~7 Hz with fresh input arrays every cycle. The cause was not measured on the device; memory pressure is the working assumption. Following the GPU safety rule, touch devices (`pointer: coarse` or several touch points) now run only the scene parser: 64k input pixels (~29k on WebAssembly), at most 2 Hz, with each class's first catalogue material. `?recognise=objects,materials` (either or both) adds D-FINE at 416² and MobileCLIP at one look per frame, for a staged on-device check. On every device, models load one at a time before the first frame, because loading D-FINE while SegFormer ran stalled WebGPU on desktop Chromium. Input tensors reuse one buffer each, and material crops run at batch 1, so shapes never change. Desktop keeps 200k pixels, D-FINE 640² and 4 looks; it measured ~340 ms per cycle with laptop and keyboard detected. Scene-only with the phone budget measured ~45 ms per cycle on the Mac. Neither has been observed on a phone yet.

**Second iPhone report and runtime change (2026-10-13).** With the scene parser alone on WebGPU at 2 Hz, the iPhone reloaded the page after 10–20 s, and the user found it "unstable and poor". Without an iOS simulator, Mac Safari (same WebKit) stood in. Footprint was measured with `footprint` on fresh Safari processes, using the phone budget and the authoring parameters `?budget=phone&measure&device=…&source=<image>`.
- Route not started: WebContent 110 MB (Next dev page).
- transformers.js + SegFormer: WebContent ~415 MB on both backends; Safari's GPU process 101 MB with WebGPU, 31 MB without.
- Bare onnxruntime-web plain WebAssembly build, no page: ~217 MB.
- Neither backend grew over 3 minutes (270–360 analyses), so no steady leak showed on the Mac. The phone-side cause remains unconfirmed; the camera path was not reproduced.
- Change: the worker now uses onnxruntime-web 1.30.0 directly (`inference/runtime.ts`), and phones load only the plain WebAssembly build. Models are cached in Cache Storage and the CPU memory arena is off. `?device=webgpu` brings back the GPU on phones. Camera dimming became an overlay instead of a CSS filter on the live video.
- Result: WebContent ~301 MB at ~55 ms per analysis on the Mac (30 s observed before the window closed). Not observed on an iPhone.

**Budget.** The canvas runs at DPR 1.0, 24 Hz cap. "Over" view repaints only on a new analysis; "decomposed" view does 4 full-canvas composites per frame. Frames go to the worker one at a time (back-pressure), at 720 px long side. With all three models, first load downloads ~40 MB (WebGPU fp16) or ~65 MB (WebAssembly) from Hugging Face; the scene parser alone is 4–8 MB. The browser caches them. Not cross-origin isolated, so WebAssembly runs single-threaded.

**Observed (2026-10-13).**
- Offline Node checks on six photos (lake, city, office, kitchen, living room, desk) gave correct classes and plausible materials. Alpine lake → fresh water, white walls → plasterboard, kitchen hob → glass-ceramic, laptop and keyboard detected.
- Desktop Chromium on the Mac webcam, WebGPU: about 7 analyses/s, 190–270 ms per cycle. A person read as H₂O, amino acids, triglycerides, hydroxyapatite; the window behind as soda-lime oxides; its frame as painted steel. Both views rendered.
- iPhone (iOS Safari), all three models: the page closed right after the first analyses (see above).
- **Phone budget not yet observed on a phone.** WebGPU-in-worker availability on iOS and the fallback path are unverified. DPR 1 text is softer than native on 3× screens; raising it waits for an on-device check (GPU budget in `docs/harness/webgpu-tsl-particles.md`).

**Open questions.**
- Lettering is screen-fixed, so panning slides the scene under the formulas instead of carrying them with it.
- ADE20K's "sea" often takes calm lakes; the catalogue lets MobileCLIP pick fresh water for it.
