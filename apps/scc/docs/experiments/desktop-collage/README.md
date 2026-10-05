# desktop-collage

Direction recorded 2026-10-05. Area route: `/desktop-collage`. Implementation:
`components/desktop-collage/`.

## What this area is for

Many interfaces laid over one another. Tabs and windows used as collage
material, at a time when automated AI agents open, read and abandon pages faster
than anyone can attend to them. The work studies what this flood of content, and
the tab/browser/desktop that carries it, does visually, systemically,
affectively and, above all, **as a medium**. It continues collage through
papier collé and the Dada tradition: found, working material is cut, placed and
overlaid, and the joins stay visible. Image, feeling and rhythm are all part of
the result; none is a by-product of the others.

The material is the running computer: real browser windows with their own
loading, chrome, focus and failure. This follows the direction in
[splice/concept](../standalone/splice/concept.md). It is not a webcam or
face-tracking line of work; measurement of the participant is not this area's
subject.

Results here are meant to feed [Goldfishes](../../../../goldfishes/docs/README.md)
later. Proven variants are copied into that app rather than shared across apps.

## How it differs from its references

| | Authored web pieces | Screen recordings | desktop-collage |
| --- | --- | --- | --- |
| The work is | a page the artist made | a fixed video | a process on the actual operating system |
| It acts on | windows it created, with known content | a finished screen | real application state: windows, tabs, loading pages |
| Outcome | replays as authored | replays as recorded | the same score meets real latency, loading, minimum window sizes and errors; these stay in the result |

The references depict a computer; here the computer performs the collage.

## References

- Authored web pieces: [JODI](https://www.moma.org/collection/works/193145)'s
  *My%Desktop* (hundreds of overlapping windows, files opening at speed, error
  dialogs, performed rather than viral) and jodi.org's proliferating black
  windows ([Moving Image Source](https://movingimagesource.us/articles/corroding-the-machine-20120406)).
  [Chia Amisola](https://www.artandmarket.net/fresh-face/2026/08/03/chia-amisola)'s
  "internet ambient" performances such as
  [*my computer never asks me how many computers i had before*](https://grayarea.org/event/chia-amisola-my-computer-never-asks-me-how-many-computers-i-had-before/)
  spread hundreds of windows, the terminal and browser history across the screen,
  and lately synchronise pop-ups across viewers' screens
  ([review](https://jonathangray.org/2026/01/24/chia-amisola)).
  Chris Milk and Arcade Fire's [*The Wilderness Downtown*](https://experiments.withgoogle.com/the-wilderness-downtown)
  (2010) choreographs browser windows to a song. Yung Jake's
  [*E.m-bed.de/d*](https://en.wikipedia.org/wiki/Yung_Jake) (2012) leaves the
  video frame for the whole browser. Olia Lialina's
  [*Summer*](https://rhizome.org/editorial/2013/aug/08/olia-lialina-summer-2013/)
  (2013) lets network infrastructure set the frame rate.
  [Rafaël Rozendaal](https://zkm.de/en/node/1743) makes single-window browser works.
- Screen recordings: Camille Henrot's *Grosse Fatigue* (2013) and Kevin B. Lee's
  *Transformers: The Premake* (2014), the
  [desktop documentary](https://visibleevidence.org/article/desktop-documentaries/);
  Timur Bekmambetov's [screenlife](https://en.wikipedia.org/wiki/Screenlife)
  rules (one screen, real time, sound from the device).
- Webcam self-presentation: Petra Cortright's
  [*VVEBCAM*](https://anthology.rhizome.org/vvebcam) (2007).
- Open: a current Instagram style of webcam lyric videos that open tabs and
  terminals has not been identified yet; add it once a source is known.

## Structure

- `primitives/`: elementary gestures (shape, rhythm, order, material), each
  small enough to judge on its own. [primitives/1](primitives/1.md).
- `foundations/`: the area's shared window machinery, grouped by function so
  later experiments can reuse and extend it. Every surface takes the same plan:
  rectangles in top-left desktop coordinates, a colour or page, and a stacking
  rank. "Clear all" removes everything a page opened.
  - `surfaces/index.ts` (browser-safe): the surfaces in order of preference,
    with what each supports.
    - `chrome-app/`: Chrome `--app` windows in a dedicated, throwaway Chrome
      instance, placed through its local DevTools endpoint. This is the main
      surface.
    - `terminal/`: Terminal windows painted a flat colour.
    - `bare/`: borderless windows held by one JXA host. Kept for other uses
      later.
  - `display/`: measures the desktop's visible frame.
  - `pages/`: self-contained colour pages as data URLs.
  - `jxa/`: runs `osascript -l JavaScript` processes and reads their events.
  - `control/`: `run.ts` sends a plan to the right surface and clears
    everything; `index.ts` is the route-handler control. Admission is the local
    HTTPS dev server on macOS only, one run at a time.
