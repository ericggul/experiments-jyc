# Overlay-4 — recorded underwater approach sound

Experimental archive date: 2026-09-08. Route: `/screen/0908/overlay-4`, alias `/0908/overlay-4`. Independent overlay-3 copy; visual defaults, fish behavior and separate session key remain. Later trial dates are recorded below. **Field-recording trial rejected by user; sound defaults OFF.** Code and audio assets retained; manual activation remains available.

## Bubble-scale trial — 2026-09-13

Each story appearance receives one deterministic scale in the inclusive 0.5–1.5 range (mean 1.0, so the former 50px default remains the average). Its `new`, `viewing`, and `leaving` durations use the same multiplier. The grid slots, surface treatment, story propagation, and goldfish force coefficients remain fixed. The school now reads each bubble's rendered radius for approach, contact, target rings, and obstacle resolution, so a fish is kept clear of the actual circle edge while longer-lived, larger bubbles remain available to attract it.

The surface controls also include `hieroglyphs`, with right-side `default` / `tech` selection. Default preserves the Egyptian-hieroglyph sequence used by LinkedIn/4. Tech contains 36 original SVG compositions using profile figures, seated/kneeling poses, hands and subordinate technology signs. These are invented contemporary signs, not historical translations. The rejected modern icon paths were replaced; generated raster trials are not used. SVG ink bounds determine horizontal and vertical centering at every bubble size. Visual review covered the 36-sign SVG contact sheet; stylistic acceptance remains with the user.

The `eyes` surface contains two internal types. `human` preserves the 75 existing photographic human-eye collage assets unchanged. `big tech` reuses the 80-person technology-power sequence but shows a single eye cropped from each portrait. The crops are generated locally with macOS Vision face landmarks by `source/crop-tech-power-eyes.swift`; each crop is a derived fragment of its corresponding attributed Wikimedia portrait rather than a new external source. Keeping this under `eyes`, rather than `face`, makes the selectable category follow the perceived unit (one eye versus a whole face). Existing appearance timing, per-occurrence scale, rings, propagation and fish-target geometry remain unchanged.

The `apps` surface is an editorial set of 80 commonly encountered apps, platforms and digital services, including ChatGPT. Social and messaging, AI and productivity, media, commerce and mobility, and payment, map and browser services are interleaved so adjacent circles do not form category blocks. It is not presented as a strict numerical popularity ranking. The selection is informed by [DataReportal's Digital 2026 overview](https://datareportal.com/reports/digital-2026-global-overview-report) and [Sensor Tower's State of Mobile 2026](https://sensortower.com/report/state-of-mobile-2026). Brand marks use the already-installed CC0 Simple Icons package, plus the archive's existing local OpenAI and Amazon SVGs; no remote image request is introduced. Existing story timing, scale, rings, propagation and fish-target geometry remain unchanged.

The `face` surface preserves `politician`, with its existing 60-image set and colour treatment, and provides three treatments of the same separate 80-person 2026 technology-power set: `big tech colour`, `big tech original`, and `big tech monochrome`. Original shows the source photograph without an overlay, while monochrome applies only grayscale with restrained contrast. `Big tech colour` is deliberately separate from the politician red/blue scale: each portrait receives an editorial gradient derived from the colours of that person's primary company or a recognisable key service. Multi-company and research affiliations use the listed primary institution or a restrained hybrid palette. These are brand-informed visual associations, not an assertion of official brand compliance. The big-tech set spans platform and infrastructure executives, AI lab leaders and researchers, founders, investors and other people with material institutional influence; inclusion is not praise, endorsement, or a claim that every person holds equivalent power. The repeated, rapidly propagating face field supplies the critical relation; the interface adds no accusatory caption or unsupported intent claim.

The 80 local portraits were retrieved from Wikimedia Commons on 2026-09-15. `public/images/0908/tech-power-faces/attribution.json` records each name, working affiliation, Wikipedia page, Commons source, creator/credit and license. The reproducible collector and candidate ledger live at `source/collect-tech-power-faces.mjs`; the runtime list is generated into `model/tech-power-faces.generated.ts`. The selection was checked against current company leadership material and 2026 influence reporting, including [Anthropic's leadership page](https://www.anthropic.com/company/leadership), [Microsoft's 2026 AI leadership update](https://blogs.microsoft.com/blog/2026/03/17/announcing-copilot-leadership-update/), and contemporary reporting on the people shaping AI and large technology institutions. It is an editorial field, not a ranked or exhaustive census.

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
