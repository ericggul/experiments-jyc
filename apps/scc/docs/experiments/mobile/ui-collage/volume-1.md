# Mobile ui-collage/volume/1 — the lyric as a spectrum visualiser

- **Route:** `/mobile/ui-collage/volume/1`
- **Date:** 2026-10-13
- **Origin:** the user saw [`sliders/2`](sliders-2.md)'s 펼침 columns as an mp3 player's volume and spectrum display, and asked for that display to be built with the words of a song.
- **Song:** U2, *You're the Best Thing About Me*. The song data comes from parametric-interface (`components/parametric-interface/model/songs`): the real audio file and an absolute onset for every word ([audio notes](../../parametric-interface/audio.md)). The component imports `activeParametricSong` rather than copying the timings, so a song switched there switches here too; it also takes an optional `song` prop.

## Columns

sliders/2's 펼침 grammar: full-viewport columns with no margin, at least ⅛ of the width apart, the leftover width shared between the gaps. Each column is one word repeated (×8 by default) and turned 90° counter-clockwise to read upward. It is always full black and always holds every repetition. Its level stretches the line up from the bottom edge, from scaleY(0) to scaleY(1).

- **Lyric:** every column shows the same word, the one being sung, upper-cased. The moment the next word is sung, every column changes to it at once, each in its own face. Before the song all columns show the first word; after it, the last. The cursor reads the audio element's real `currentTime` every frame, with no wall-clock interval (parametric-interface's rule). Model: `model/lyrics.ts`.
- **Sync:** the user found the change slightly late. Three things were checked (2026-10-13):
  - *Timing data:* each word onset was compared with the nearest rise in vocal-band (300–3400 Hz) energy in the mp3, within ±250 ms. Across the 178 words with a clear rise, the median difference was −15 ms (quartiles −170 / −20 / +110 ms; noisy because of the band). So the data is not systematically late.
  - *Rasterising:* the first version redrew every column in the frame that showed the new word. Timed in desktop Chrome, a new word's first rasterisation across 24 columns took about 41 ms (cold glyph cache); a phone is slower.
  - *Display:* a drawn frame reaches the screen about one refresh later.

  Fix: the lines are double-buffered. The next word is rasterised into a back layer right after each change, outside the frame loop (`setTimeout` 0), so the change itself is a layer swap. Only a jump (seek, relayout, or a words-per-column change) rasterises in place. The word also changes one refresh (16 ms) before its onset. Audio output latency (sound reaches the speaker after `currentTime`) was not compensated, because it would delay the words further. The first version on the same day wrapped the lyric across the columns instead: word k went into column k mod count, so the screen held the latest run of words. The user asked for every word to change at once.
- **Level:** column i is a band of the playing audio's spectrum, bass on the left and treble on the right. The bands are log-spaced from 40 Hz to 16 kHz, so each spans the same musical interval. An `AnalyserNode` (FFT 4096, smoothing 0.55) on a `MediaElementSource` gives decibels per bin. A band averages its bins' power, tilts it up 3 dB per octave around 1 kHz (music falls off about that much, so the treble stays alive), and maps −78…−22 dB to 0–1. How a column follows its band is an option. 부드럽게 (default) is a critically damped spring toward the band level (0.15 s smoothing time), so rises are eased too. 즉각 rises at once and falls at 1.6 levels per second, like a hardware meter's release. Model: `model/bands.ts`.
- **Faces:** each column draws one face at random, without replacement, from the 50-face category-balanced Latin pool of loading/3 (ten each of sans-serif, serif, display, handwriting, and monospace). It keeps that face for every word that passes through it. Each face is loaded once from the Google Fonts CSS API, subset to the characters of the whole lyric, so a new word draws the moment it is sung.

## States

- **Before PLAY:** the columns stand at full height, every one showing the first word ("WHEN") in its own face. The round PLAY button (parametric-interface's control) is the only start action. It builds the audio graph inside the gesture, declares `navigator.audioSession.type = "playback"` for iOS, and starts the song from 0.
- **Playing:** the levels follow the music, and the lyric is written in as it is sung.
- **Paused:** a tap on the screen pauses or resumes. Paused, the columns hold their last levels and the loop sleeps.
- **Ended:** the columns rise back to full height with the last word, and PLAY returns.

## Options (bottom-right ⋯)

- **Mode:** 펼침 (default) or 농담, as in sliders/2. In 펼침 the level stretches the line up from the bottom edge. In 농담 the line stays full length: full ink below the level, 0.1 above.
- **Response:** 부드럽게 (default) or 즉각.
- **Column width:** 12, 16 (default), 20, or 28.
- **Words per column:** a slider from ×4 to ×20 (default ×8). Words differ in length, so ×8 already condenses long words hard.

## Rendering

One 2D canvas, DPR capped at 2. Lines are rasterised into two layers (front on screen, back holding the next word). A frame is a white fill, the dim front layer in 농담, and one `drawImage` per column. The loop runs while the song plays (and once while the poster rises), and sleeps otherwise.

## Checks

- `node --test components/mobile/ui-collage/volume/1/model/model.test.mjs` passes. It covers:
  - edge-to-edge layout;
  - band edges increasing and covering every column;
  - decibel mapping and the meter's instant rise and slow fall;
  - the word lookup and the shown word (first before the song, the sung one during it, last after it, one refresh early);
  - 부드럽게 easing without overshoot and then resting.
- Browser check on 2026-10-13 (desktop Chrome, hidden automation tab at a 390 px field):
  - before PLAY, every column shows "WHEN" in its own face;
  - in the first (wrapping) version, a real click on PLAY started playback, and seeking to 50.5 s rewrote the columns to the lyric at that point.
- **Unverified:** the levels moving with the music. In the hidden tab Chrome deferred loading the audio (`readyState` 0, nothing buffered; the file itself serves 200 `audio/mpeg`), so no audio reached the analyser. The −78…−22 dB range and the 3 dB/octave tilt are first estimates to tune on a real device.
