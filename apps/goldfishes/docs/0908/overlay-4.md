# Overlay-4 — recorded underwater approach sound

Experimental: `/screen/0908/overlay-4`, alias `/0908/overlay-4`. Independent overlay-3 copy; visual defaults, fish behavior and separate session key remain. **Field-recording trial rejected by user; sound defaults OFF.** Code and audio assets retained; manual activation remains available. No further redesign requested.

## Current direction and source

User superseded the platform/Daft Punk synthesis direction with subtle, hyperreal fish/water sound grounded in actual references. Do not reintroduce a melodic notification, robotic oscillator or cartoon bubble effect.

Source used: [Ornamental Fish Pond with Hydrophone — naturenotesuk / David](https://freesound.org/people/naturenotesuk/sounds/746957/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Author describes Shubunkin fish, pump switched off, feeding particularly from 55 seconds; Aquarian H2a hydrophone / Zoom F6. This is an actual pond recording, **not isolated goldfish vocalization or a verified recording of fin friction**. Attribution also ships beside the asset.

Local asset: `public/assets/goldfishes/audio/overlay-4/pond-feeding.wav`. Derived from the openly served HQ MP3 preview, not the original 96kHz WAV: extract 55–79s, high-pass 110Hz / low-pass 4.2kHz, mono 48kHz PCM. Upsampling does not restore original detail. The original WAV requires login; no account or access restrictions were bypassed.

Reference considered but not used: [Fish Splashing Pond.wav — kylecutsfilms](https://freesound.org/people/kylecutsfilms/sounds/443380/), CC0. Its described surface splashing was a poor fit for the requested unobtrusive underwater proximity.

## Implementation contract

- `model/approach-events.ts`: selected-target entry at radius +24 CSS px, independent of visible rings; 4px hysteresis / 0.8s per-fish cooldown; silent initial priming. Existing detector supports IDs 0–999.
- `audio/approach-samples.ts`: one fetch/decode; up to 32 short 240–290ms fragments. Remove DC, bound normalization, skip high-crest isolated impacts; 25ms raised-cosine entrance / 75ms exit soften cuts. These are mechanical selections, not individually auditioned editorial choices.
- `audio/approach-sound.ts`: cycle the same source material at original pitch/speed. Approach speed changes level; target position gives narrow stereo placement; dense entries attenuate. No note bank, extra effects, continuous water loop or synthesized fallback.
- Eight fixed gain/panner slots and master/compressor; at most eight transient buffer sources, disconnected on completion. 75ms global / 160ms per-target admission gaps; overload omitted, never queued. Unlike former oscillator pooling, this allocates one short-lived source per admitted event; memory is bounded but actual browser cost is unmeasured.
- Default OFF / volume 35; only explicit activation initializes audio and loads samples. Hidden tab suspends; explicit OFF is respected; unmount aborts fetch, stops sources and closes context. Failed loading reports an error instead of substituting a rejected beep.

## Failure ledger — preserve these reasons

| Rejected trial | User objection / failure mechanism |
| --- | --- |
| Initial FM and harmony | Awkward/artificial, too concerned with pleasant musical effects; not the artwork's context. |
| Literal C-val triangle triplet | Reference was copied rather than interpreted. Different work, different density and meaning. |
| Proposed click/data/news palette | User named alternative qualities, not a collection to mix. Broke one-family identity. |
| Fixed 640Hz pulse | Same timbre was wrongly reduced to same pitch; raw, monotonous computer beep. |
| Five-note D/E/G/A field + octave sheen | User heard kitsch. Arbitrary target hash selected notes; 0.65 concentration threshold jumped register. Overlap was labelled implicit harmony without listening evidence; near-sine decay risked a toy/chime character. |
| Rolled pulse + two robot formants | User rejected this too and replaced the direction with actual fish/water references. Another synthesis recipe did not establish the requested material realism. No listening acceptance obtained. |
| Actual pond recording fragments | User explicitly rejected the result and ended sound development. Authentic source material did not establish an appropriate sonic result; automatic fragment selection was not listening-led sound design. Exact perceptual objection beyond rejection was not specified. Preserve implementation/assets, default OFF; do not describe this trial as successful. |

Cross-trial causes: responding to the latest complaint in isolation; moving between fixed beeps and musical decoration; attributing quality to parameter names/comments; replacing timbral judgement with scale design; treating overlapping effects as sufficient ambient design. Do not call any of these solved solely because code runs.

## Evidence and remaining limits

Prior typechecks and 720,000 mocked audio calls applied to retired oscillator designs. They were not DSP/ear tests and do not validate this sampler. Removed the obsolete profile and its implementation-specific audio mock test; retained geometry detector tests. User explicitly requested no repeated token-heavy testing.

Current asset duration/header and TypeScript are the bounded checks; no new long-run simulation, browser soak or listening approval. Sample selection and dense playback still need hearing before calling the result refined/hyperreal. Fish feeding is a source description, not a claim that all extracted transients are biologically identified.

Local conceptual sources previously read: `2026/diep-goldfishes-latex/main.tex` and `Documents/EMERGENCE/Goldfishes_작품_및_텍스트_참조목록.md` (attention, media hype, collective following). Drive searches found no relevant project document. This context does not override the user's latest fish/water direction.
