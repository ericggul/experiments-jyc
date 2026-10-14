# Mobiles

Experimental group of desktop fields made of many phones. `/mobiles` lists the variants. Components live in `components/mobiles/`, routes in `app/mobiles/`.

`/mobiles/1`, added 2026-10-03 as 90 empty phone frames, the same day became a weekday field. Every phone is one New Yorker's stochastic weekday, and all phones read one simulated clock. The clock runs at 10 simulated minutes per real second (`timeConfig.minutesPerSecond`), so one day lasts 2.4 minutes.

**Model.** `model/` is pure, seeded and tested.
- `model/personas.ts` is the hand-tunable table of 12 archetypes.
- `planDay` turns a person and a day into contiguous scenes covering the day, plus the day's pushes.
- Global events land at the same minute on every phone.
- Awake, the phone is almost always in hand. `plan/fill.ts` refills dark gaps between waking and bedtime with pickups suited to the context (work surfaces with the persona's distraction share at work; feeds and messages otherwise) until the screen is on for `screen on` of awake time (default 85%). It leaves short dark breaks of about 3 simulated minutes. Shift workers' phones stay in the locker during work. A 2026-10-03 profile puts 64–79 of 90 screens on between 10:00 and 23:00.
- No screen goes black. A phone nobody holds shows the always-on lock screen by day.
- At night it shows a per-person sleep surface (`model/rest.ts`): Sleep Focus, a red StandBy clock, a Drift sleep-sounds or wind-down session that dims into the lock screen, or the baby monitor for new parents.
- A push brightens an always-on screen to its full lock screen, except during Sleep Focus.
- The battery drains as the screen is used and charges overnight.

**Clones.** Each of the 29 catalogue apps (`model/catalogue.ts`) has a pure clone in `apps/<app>/`, built from shared iOS primitives in `ios/`. The route `/mobiles/1/<app>` plays that clone's fixtures at native 390 × 844 pt. The grid uses the same `PhoneView`. The options row along the bottom is always present. It offers:
- time and day;
- speed;
- phone count and arrangement;
- sameness, notification rate and synchrony;
- seed.

**Day profile.** A day-2, seed-1 profile at 30-minute samples shows how many of the 90 screens are lit:

| Time | Screens lit | What is happening |
| --- | --- | --- |
| 03:00–05:00 | 0–1 | night |
| 07:00–07:30 | 25–41 | alarm wave, 11 alarm or lock screens |
| 08:00 | 46 | commute band |
| 13:00 | 46 | lunch, mostly feeds |
| 17:30 | 54 | commute home |
| 23:30 | 38 | doomscroll, 33 of them feeds |
| 01:00 | 26 | doomscroll fading |

**Hands-on phone (2026-10-04).** `/mobiles/1/mobile-testing` is the OS used by hand. On a phone the page is the screen: no frame, and no drawn status bar, island or home indicator, because the device draws its own.
- **Full screen.** Added to the Home Screen (`appleWebApp`, `black-translucent`), it runs full screen under the real status bar.
- **Lock and home.** `os/lock.tsx` and `os/home.tsx` are hands-on-only screens at iOS spacing: large clock, frosted notification cards, torch and camera, a 4-column grid of gradient icons (`os/icon.tsx`), search pill and frosted dock. They sit on the visible screen, offset by the device's real safe-area insets.
- **Apps.** Clones run unchanged on their 390 × 844 glass. The glass is placed so its drawn-bar bands (54 pt top, 34 pt bottom) fall past the real screen edges.
- **Navigation.** `Storyboard` reads `InteractionContext` and uses `InteractiveBoard`: the script's tap points open their pages with the script's transitions, other taps follow the next scripted step, and pages scroll natively.
- **System gestures.** The left edge (or ←) goes back, a swipe up from the bottom edge (or Esc) closes the app into its icon, and Enter unlocks on a desktop.
- **Isolation.** The desktop field is unchanged: all 114 fixture renders keep the same DOM, a 35,168-node total.
- **Checks.** `tools/bench-interactive.mjs` reports 0 errors and 0 duplicate keys. Device rendering and touch are unverified.

**Sessions in simulated time (2026-10-03).**
- Every clone view builds a `Session`: panels (pages of the app) and shots (navigation, scroll flicks, taps). `ios/storyboard.tsx` plays the session with the Web Animations API on a timeline of simulated minutes, with `playbackRate` equal to the speed. A ten-minute scene at 10 min/s is a one-second burst of use, and doubling the speed doubles its tempo.
- React builds a session once per scene. Per-tick values (ETAs, timers, countdowns, meters) render through the storyboard's `live` prop, inside their panel, so they move with its transitions.
- Sheets keep their page visible beneath them.
- Interactive views take a shot at least every 2.5 simulated minutes. Long scenes are split into parts with fresh content.
- Content is combinatorial from the seed: at least 40 items per app.
- The grid fits rows and columns to the phone count and the screen: on 1512 × 900, 60 phones are 15 × 4 and 12 phones are 6 × 2. The default is 60 phones.
- All motion is authored in simulated minutes: screen transitions, holds, banners and in-app transitions. `transition` and `hold` are options in minutes. A contract test forbids fixed real-time durations in clones.
- Static checks live in `components/mobiles/1/tools/` (bench build, screens, keys, field). At 2026-10-03 the largest of 114 fixture renders was 642 DOM nodes. Browser frame rate is unmeasured.

**Transitions (2026-10-03).**
- Every change of screen animates, one at a time (`phone/stage.tsx`).
  - Default `zoom`, after market-economy: the old screen snaps away in the first 40% of `transition`; the new one then lands from 0.86 scale.
  - `ios` uses launch, close, swipe-between-apps, push and fade motions instead.
- Each screen holds for `transition + hold` (default 360 ms + 400 ms). Scenes that arrive meanwhile are skipped to the latest, so no animation is cut short.
- Inside a screen, discrete changes wait at least one beat (`timeConfig.beatMinutes`, 8 simulated minutes, 0.8 s at the default speed):
  - clips swipe up and story frames cross-fade (`ios/swap.tsx`);
  - messages and notifications ease in;
  - banners slide down and back up;
  - scrolling glides across each phone refresh.
- Speed ranges from 1 to 30 min/s.

**Performance (2026-10-03).**
- Each phone redraws at most once per `refresh` simulated minutes (default 3), on a beat staggered by seat. The clock touches React state only when a tick changes.
- Every phone slot is a `contain: strict` island.
- A static server-render benchmark of 90 phones across a full day measured:

| Refresh | Phone renders per tick | Mean per tick | Worst tick |
| --- | --- | --- | --- |
| 1 min | 90 | 9.1 ms | 55 ms |
| 3 min (default) | 30 | 3.2 ms | 18 ms |

- The field at 10:00 is about 4,200 DOM nodes. Browser paint and frame rate have not been measured.

**Checks.** Model, layout, arrangement and clone-contract tests pass, as do typecheck and scoped ESLint. No browser check has been made, so visual fidelity and the frame rate at 90 to 150 phones are unverified.

**Known modelling choices.**
- A platform outage shows the team-chat "reconnecting" view on every working team-chat user, so 38–51 of 90 phones light at once.
- At sameness 1, global events and the rain draw still vary by day.
- Monday's small hours continue Friday night.

Feed photographs are recorded in [images](images.md); the plan and acceptance criteria are in [weekday plan](1-plan.md).

**Four live clones (2026-10-11).** `/mobiles/2` puts the SNS clones Instagram, TikTok, X and YouTube ([`sns/mobile/11`–`14`](../sns/mobile/README.md)) side by side, one per quarter of the screen. Each phone is an iframe of its own route, so it gets a true 390 px viewport (media queries, fixed bars and sheets behave as on a phone). The iframe is scaled to the column width and fills the full height, with grey gaps. All four stay live and usable by hand. The layout comes from the side-by-side browser harness used to check the clones. Checked in Chrome at 1470 × 706: all four rendered, filled their columns, and played media. Each clone keeps its own session state; the YouTube clone restores its last feed scroll on reload. The bottom-right round layout icon (the road-signs/direction/4 and bubble/3 control) opens a layout option with rows, 간격 (gap between phones, 0–40 px, default 4) and 바깥 여백 (screen-edge margin, 0–60 px, default 0). One row keeps the four phones. Two and three rows fit as many phone-shaped (390 × 844) columns as the screen width allows, repeating Instagram, TikTok, X and YouTube in order. At 1389 × 868 this gives 1 × 4, 2 × 6 and 3 × 10; each label shows the grid for the current screen. Grid positions keep their service, so changing rows resizes pages in place instead of reloading them. Checked in Chrome the same day: all three grids filled the screen. Every phone is a live same-origin page, so 3 × 10 runs 30 clones on one main thread, several of them playing video. Its frame cost is unmeasured, because the automation tab was hidden and paused rendering.

**Rendered in place, no iframes (2026-10-11, later).** Each phone is now the clone component itself, rendered in a 390 px wide box scaled into its cell (`contain: strict`, `overflow: clip`). The box stands in for the old document: it takes the root layout's body font, colours and column flex. The clones' viewport units read `--clone-viewport-height` and `--clone-viewport-width` (the box size), falling back to `100dvh`/`100vw` on their own routes. Their pointer and box measurements are divided by `CloneScale` (`components/mobile/clone/scale.ts`, 1 by default), so drags, taps and thresholds stay in the clone's own CSS pixels, as inside an iframe. X's composer form id comes from `useId`, so phones do not share it. substitution/2's renderer takes the box as its `scope`: it reads and hides only that phone and draws its own canvas there at on-screen resolution. Phones take turns re-reading, one per animation frame. The `?embed` route mode and its message protocol were removed. Rows now go to 6 and 간격 defaults to 0.

Checked in Chrome at 1400 × 679 against `/sns/mobile/11`–`14` and `/mobile/transform/substitution/2/11`–`14` placed at the same size and scale: original and 완전 대체 matched except for the standalone pages' own filter button. The match needed a 1/64 px slack in the 90% tab-in-bar test, because scaled boxes snap to layout units. At 6 × 26 (156 phones) mounting took about 5.6 s and turning the filter on about 1.8 s. Before the turn-taking, the first filter pass blocked about 23 s. With it, the worst frame was about 120 ms (63 ms mean) while phones filled one by one. Clones whose `max-width: 350px` media queries read the window rather than the phone are unchanged; they only differ when the window itself is that narrow.

**substitution/3 and three rows (2026-10-14).** The filter is now substitution/3's in-place renderer, scoped to each phone (`data-substitution-pixel-scope`): cells are written into the clone's own CSS backgrounds, with the phone's box as the screen for its ground and scrim rules. The panel takes /3's groups (화면, 명령어, 글꼴, 바탕, 테두리, 기본값으로) under the layout options; 원본 remains the default. 화면 has a third choice here, 자율 전환: a noisy voter model on the grid, stepped as a Markov chain every 200 ms. A phone flips between 원본 and 치환 with a small probability of its own (0.012 a tick, about once in 17 s) plus a contagion share (0.2 a tick at most) for each of its four neighbours already in the other state, scaled by a pace drawn once per phone (0.6–1.6); a state holds at least 1.2 s. All phones read the same field each tick, as a cellular automaton does, so a flip spreads to the phones around it and domains form and dissolve rather than scattering. Checked in the hidden automation tab (whose 1 Hz timers slow the chain about five times): of 98 flips in 36 s, 84 followed a differing neighbour and 14 were spontaneous; same-state neighbour pairs were 65 % against a 56 % chance expectation, and the field held one contiguous block. A scoped phone hides its clone only in the frame its cells are written, so a flip never shows a blank ground (968 sampled frames and 142 flips at 3 × 12 showed none). 바탕 has a third choice here, 체크무늬: phones alternate white and black ground by grid position, so each phone differs from its neighbours on either side and above and below. The default layout is 3 rows, and the field behind the phones (간격 and 바깥 여백) is black. Checked in Chrome at 1417 × 719 (hidden automation tab, rAF shimmed): 3 × 12 filled all 36 phones with 7,230 cells, one phone per frame, then went idle; dark ground and the condensed face applied to every phone; 체크무늬 alternated correctly at 3 × 12 with a 12 px gap.

Performance (2026-10-14, hidden automation tab, so script only): the first read of all 39 phones at 1417 × 663 cost 351 ms of script in total (X about 15 ms a phone, TikTok about 2 ms). At rest only TikTok's scrubber (`input[type=range]`, four attribute changes a second) caused re-reads, about 38 a second across ten phones, about 1 ms each; the renderer now ignores attribute changes on range, hidden, checkbox and radio inputs, which get no cell, so the resting field schedules no reads. The field is 103,210 DOM nodes with ten playing videos before any filter; frame rate, paint and raster were not measurable from the hidden tab and remain unverified.

**Hands of their own (2026-10-14, later).** Each phone on `/mobiles/2` is now used by a pilot of its own (`components/mobiles/2/autopilot.ts`), on by default under 행동 (자율 / 정지). It drives the clone through the DOM only, so the clones are unchanged. Each phone draws a pace once (a 1.5–4.5 s mean pause) and varies every pause by half either way. At each turn it most often scrolls the largest scroller in view by a third to a screen, smoothly and mostly downward, going back to the top when a feed ends; where nothing scrolls (TikTok's feed, Shorts) it sends a wheel tick, which those pagers take as a swipe; a quarter of the time it taps a control a reader taps (like, dislike, save, follow, subscribe, a tab); and when something it opened is on screen (a back, close or cancel control), it leaves again more often than not. It never touches fields, composers, share, options or a video's own open control, so the number of players stays what the home feeds set. Synthetic pointer gestures are not used: TikTok captures the pointer without a guard and would throw on them.
