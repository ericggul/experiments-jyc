# Splice / 1 — audio collage instrument

Experimental, 2026-09-16. Route: `/splice/1`; family index: `/splice`. Implementation: `components/standalone/splice/1/`. Listed in SCC's experiment catalog. [Concept and relation to the later native application collage](concept.md).

Question: can a small, directly playable two-source audio instrument teach the selection, recurrence, transformation and interruption needed for the user's later collage of real applications?

Baseline: the gesture-initiated Web Audio and separation of source/timing/presentation in `dj/2–3`, without importing their song, socket clock or distributed gating. This is a separate single-device family. Existing DJ, Goldfishes desktop and rejected browser-collage trials remain intact. No dependencies or servers were added.

## Playing

- **Load practice pair** supplies newly synthesized drum/chord phrases at 120 BPM. **Play both** starts the stopped decks against the same audio clock. Each deck also accepts a dropped or chosen local audio file.
- The waveform is calculated from the decoded sound. Click/drag or use its keyboard range control to seek. **Start** returns to the beginning. **Reverse** changes source direction.
- Four hot cues per deck: an empty cue stores the current position; a set cue jumps and plays. Shift + press replaces it.
- **In / Out** set loop boundaries in source time; the loop toggle, halve and double controls change recurrence. There is no beat quantization. The highlighted waveform region shows the actual loop range.
- **Speed / pitch** couples rate and pitch (0.5–2×). **Source BPM** is manual metadata for imported sounds. **Match tempo** matches the other deck's effective BPM within that rate range; it does not detect tempo or align beat phase.
- Each deck has a low/high-pass filter and level. The crossfader uses equal-power gains; its A/B buttons cut directly to a side. Master level controls the mixed output.
- **Record mix → Finish take → Save take** records that output, including silent intervals, to the browser-supported audio format. The UI finishes a take at ten minutes. Leaving/reloading the page loses unsaved material.
- Keyboard: Q/P play/pause A/B; 1–4 and 7–0 trigger their cues; Shift stores; Space toggles both; Esc stops sound; brackets move the crossfader and backslash centers it. Shortcuts other than Esc pause while typing in a field; Space retains a focused button's native behavior. The help dialog contains the same instructions.

Cues are audible through the main mix. No separate headphone output, beat detector, pitch lock, file upload, persistence, microphone, native automation or AI is implemented. The browser is the audio instrument's current host, not the medium proposed for the final application collage.

## Implementation and bounds

The `audio/` engine owns decoded buffers, playback anchors, graph nodes, import generations and recording. `model/` contains source-time/reverse/loop/crossfade math. `screen/` owns controls and renders true waveform peaks. The audio graph is source → short retrigger envelope → low/high-pass filters → channel gain → crossfader gain → master → compressor → speakers and recording stream. The compressor is headroom management, not a claimed brick-wall limiter. A new buffer source is created for seeks/direction changes; [Web Audio buffer sources are single-use](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode).

Two decks, one 44.1 kHz audio context, 256 waveform bins per deck, one optional reversed buffer per loaded sound. Files are limited to 40 MiB before decoding. Decoded files must be mono/stereo, six minutes or less and no larger than 128 MiB of PCM; these post-decode checks limit retained buffers, not the decoder's transient memory. Format support depends on the browser decoder. Stale decoding results cannot replace a newer source. A failed import retains the previous sound. Changing files clears that deck's loop/cues. Loading a practice pair replaces both decks. Playback begins only from a user gesture. Unmount disposes sources, recording and the audio context; saved-take object URLs are revoked when replaced/unmounted.

Playback position is derived from the audio clock. Playhead DOM updates run only while a deck plays; time labels update at roughly 12 Hz. The waveform geometry is computed when the audio changes. The screen uses two channels side by side at wide widths and stacks them on narrow screens, with normal document scrolling when needed. Color identifies the same source through its waveform and controls; no decorative gauges, fake transport states or window replicas.

All practice samples originate in the local deterministic synthesizer; no music is fetched or bundled. [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) support and MIME negotiation determine recording availability/format. The ten-minute recording finish uses a browser timer and can be delayed by background throttling. Arbitrary loop boundaries are not crossfaded and can make an audible seam. Audio scheduling, output-device latency, codec availability, waveform scrubbing feel and the musical result require actual listening.

## Verification

Scoped ESLint and SCC TypeScript checks pass. Pure tests cover transport rate, reverse-loop coordinates and equal-power crossfade endpoints. Browser, audio, recording and responsive visual behavior have not been exercised in this session. The experiment remains unverified as a played instrument; source/static checks do not establish perceptual quality.
