# DJ Experiment

Routes:

- `/dj`
- `/dj/1/controller`
- `/dj/1/screen/1`
- `/dj/1/screen/2`
- `/dj/1/screen/3`
- `/dj/1/screen/4`
- `/dj/1/screen/whole`
- `/dj/2/controller`
- `/dj/2/screen`
- `/dj/3/controller`
- `/dj/3/screen`

Files:

- `app/dj/page.tsx`
- `app/dj/[experiment]/controller/page.tsx`
- `app/dj/[experiment]/screen/page.tsx`
- `app/dj/[experiment]/screen/[screen]/page.tsx`
- `components/dj/experiments.ts`
- `components/dj/1/graph.ts`
- `components/dj/1/controller.tsx`
- `components/dj/1/screen.tsx`
- `components/dj/1/use-dj-socket.ts`
- `apps/scc/socket/experiments/dj/index.mjs`
- `components/dj/2/track.ts`
- `components/dj/2/use-track-audio.ts`
- `components/dj/2/use-dj-2-socket.ts`
- `components/dj/2/controller.tsx`
- `components/dj/2/screen.tsx`
- `apps/scc/socket/experiments/dj/2/index.mjs`
- `components/dj/3/model/track.ts`
- `components/dj/3/tracks/`
- `components/dj/3/media/use-distributed-video.ts`
- `components/dj/3/transport/use-dj-three-socket.ts`
- `components/dj/3/controller.tsx`
- `components/dj/3/screen.tsx`
- `apps/scc/socket/experiments/dj/3/index.mjs`

Intent:

`dj/1` is a K4 graph-based multi-device Socket.IO experiment. The controller sends node or edge gestures. A node targets one screen. An edge targets the paired endpoint screens.

`/dj/1/screen/whole` is only a performative wrapper for experiment logistics. It renders the same modular screen panes in a 2x2 layout with one shared socket bridge, not iframes and not separate per-pane socket clients.

Socket contract:

- Room: `experiment:dj:1`
- Events:
  - `dj:join`
  - `dj:hello`
  - `dj:presence`
  - `dj:signal:in`
  - `dj:signal:out`
- `dj/1` controller payloads describe graph intent with `source`, `nodeId` or `edgeId`, and pointer coordinates.
- The server resolves `targetScreenIds`; screens filter client-side.

Rule:

`dj` state and events must not be shared with `finger-skating` or future socket experiments.

## dj/2 — distributed lyric channels

Route/date: `/dj/2`, 2026-09-14.

Tested relation: one song is reconstructed across physically separate browsers. Each screen always retains the full Korean initial consonant set (or, for an English track, a–z) and may toggle any number of channels without navigating to another state. The first selection unlocks audio. During playback that screen is audible only for words beginning with any of its selected channels. The controller is the complement: it is audible only where no timed lyric word exists, including the intro and instrumental gaps.

The relay owns only the transport clock and active `trackId`; it has no song duration, language, lyric, or channel rules. Clients estimate their offset with five round-trip clock probes and keep the lowest-latency sample. The relay then schedules play/restart 1.2 seconds ahead, broadcasts the shared `startedAt`, and retains pause position for late or reconnecting clients. Browsers load the same local source file, derive sound from the track's word intervals, and make bounded playback-rate corrections when their media clocks drift.

The song is replaceable through the `DjTrack` contract in `components/dj/2/track.ts`: `language`, `audioUrl`, `duration`, and canonical word-level `start`/`end` timings. Channel extraction and both role algorithms are track-independent. The first installed dataset is `반포자이즘-1`; its canonical words are paired to the source project's Whisper word timestamps, with known recognition errors corrected textually and the short 64.38–65.62 ad-lib divided across its four spoken words.

Socket contract:

- Room: `experiment:dj:2`
- Events: `dj:2:join`, `dj:2:hello`, `dj:2:presence`, `dj:2:clock`, `dj:2:channels`, `dj:2:command`, `dj:2:state`
- State: `status`, `position`, future `startedAt`, monotonically increasing `revision`, and `serverTime`

Visual invariant: controller and screen use a plain black field with monochromatic system text. All content remains in one centered functional group; there are no corner labels, accent colors, decorative timelines, word displays, state transitions, or navigation after selection. Every participant enters through the same `/dj/2/screen` route and the complete channel set remains editable throughout playback. There are no numbered or `whole` routes because the current selection set—not a URL slot—is the screen's identity.

Unresolved: the source alignment has reliable word anchors but has not been calibrated against the exact output latency of the final loudspeakers. Acoustic phase and hardware latency remain installation-level variables rather than server state.

## dj/3 — distributed word video

Route/date: `/dj/3`, 2026-09-14.

Tested relation: every participant enters the same `/dj/3/screen` route and may select any number of letters from the permanently mounted a–z field. The shared source video keeps running behind that interface. Whenever a spoken word begins with a selected letter, the exact source-video interval appears full-screen over the letter field and its audio opens; in every other interval the overlay is transparent and the unchanged selection field is visible. Letter choices remain editable before, during, and after playback.

The source image and current word appear over the letter field from 0.1 seconds before each selected word until 0.1 seconds after it. The leading and trailing context use matching linear audio/video fades; overlapping contexts merge instead of pumping. The current routing letter is inverted inside the word. There is no caption block, status chrome, or accent color. The controller retains the `/dj/2` complement rule and is audible outside the queued spoken-word windows.

Performance contract: each track builds immutable per-letter word queues once. A live selection merges only those queues, cancels the old gain schedule at the current media time, and swaps in a 1.5-second Web Audio look-ahead without seeking or restarting the video. The visual cursor uses binary lookup and direct compositor/text-node updates; playback does not drive React renders. Clock correction is checked once per second and only seeks beyond 200 ms drift—`playbackRate` is never rewritten per frame.

Media-specific data is isolated from the playback algorithm. `model/track.ts` defines the reusable `DistributedVideoTrack` contract; `tracks/index.ts` selects the installed manifest; each track module supplies only metadata, a local media URL, duration, source record, and canonical word intervals. Replacing the speech therefore requires adding another track module and local video, then changing `activeDjThreeTrack`; screen, media, transport, socket, and route code remain unchanged.

The first manifest is Ronald Reagan's January 28, 1986 Challenger address, White House Television Office tape 242, National Archives identifier 6014714. The local H.264/AAC derivative at `public/video/dj/3/reagan-challenger-address.mp4` preserves the 4:18.928 source timeline. Its 653 spoken tokens use MLX Whisper large-v3-turbo word anchors biased by the official Reagan Library transcript. Text substitutions were corrected against that transcript; short re-analysis supplied boundaries for omitted or merged words (`For`, `it is`, `sometimes`, `and tell them`, and the spoken expansion of `390`), and the audible closing `Thank you` was retained.

Socket contract:

- Room: `experiment:dj:3`
- Events: `dj:3:join`, `dj:3:hello`, `dj:3:presence`, `dj:3:clock`, `dj:3:channels`, `dj:3:command`, `dj:3:state`
- State: transport status, position, future `startedAt`, active `trackId`, revision, and `serverTime`; the relay contains no media-specific timing or channel logic

Unresolved: word anchors are tied to the encoded source timeline, but final speaker latency and display decode latency still require installation calibration across the actual devices.
