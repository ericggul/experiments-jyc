# mobiles/1 — weekday plan (implemented 2026-10-03, browser-unverified)

Status: approved 2026-10-03. The time base is 10 simulated minutes per real
second (one hour every 6 s, one day in 2.4 min), set by
`timeConfig.minutesPerSecond` and the options-row speed control. Scenes are
authored at a resolution of a few minutes, not minute by minute. The baseline is the empty phone grid at
`/mobiles/1` ([README](README.md)). This plan adds the following without
changing that grid's layout math:

- one stochastic weekday per phone;
- hyperreal iOS-grammar app screens;
- an always-present bottom options row.

## Proposition

Each phone is one person's weekday. Every phone reads one shared clock, so the
field shows three things together:

- **Synchrony:** the 07:00 alarm wave, the 08:30 commute band, the 12:30 lunch
  glow and the 23:40 doomscroll field.
- **Individual drift:** the person who snoozes twice, the 05:45 runner, the
  10:00 riser.
- **Repetition across days:** Monday through Friday are nearly the same, but
  never identical.

The servitude is shown structurally, not by commentary:

- the phone sets every transition (alarm, delay alert, Slack ping, courier job
  offer, Screen Time report);
- the same push arrives at dozens of phones at once;
- the battery drains on the same curve for everyone.

## Architecture (`components/mobiles/1/`)

| Folder | Owns |
| --- | --- |
| `model/` | Pure, seeded and tested: `rng` (mulberry32, hashed from `seed:personId:day`), `personas`, `plan-day` (episodes → scenes), `notifications`, `sample` (state at minute *t*), `layout` (existing) |
| `ios/` | Shared primitives: phone frame, status bar (time, signal, battery, Focus glyph), lock screen, notification banner/stack, home indicator, tab bar, navigation bar, list cell, icon set (inline SVG, no SF Symbols), type tokens |
| `apps/<app-id>/` | One clone per folder: `Screen` (props only), `fixtures.ts` (≥3 states along its time course), CSS Module, `index.ts` |
| `apps/registry.ts` | `appId → { Screen, fixtures, title }` (lead-owned) |
| `controls/` | Bottom options row |
| `index.tsx` | Field: clock, sampler, grid, controls |

Routes:

- `/mobiles/1` is the field.
- `/mobiles/1/[app]` (for example `/mobiles/1/meeting`) shows one clone at
  native 390×844, centred and scaled to the viewport. It cycles through that
  clone's fixtures, or follows one persona's timeline for that app.
- Both use the same `Screen`, so a clone that works alone also works as a tile.

### Data flow

```text
persona + day + seed
  → planDay()        → Episode[]  {start, end, activity}
  → expand()         → Scene[]    {start, appId | "off" | "lock", state, focus}
  → notifications()  → Push[]     {at, appId, title, body}  (persona rate × activity × global events)
sample(minute)       → PhoneView  {scene, visiblePushes, battery, clock}
```

Each day plan is computed once, when the day, seed or sameness changes. A tick
only looks up the scene for the current minute (binary search). Within one
scene, change over time (scroll position, chat messages arriving, ETA counting
down, run distance) comes from `minute - scene.start`, not from timers.

### Performance

- One `requestAnimationFrame` clock. React state updates once per simulated
  minute.
- Each `Phone` is memoised by scene key plus the visible-push key. The status
  bar time is its own small component.
- No video, and no `backdrop-filter` in the field. Banners use opaque
  vibrancy-like fills; blur is allowed only in the single-clone route.
- `off` scenes render a black glass and no children.
- Images come from a local curated set (`public/images/mobiles/`, about 40 webp
  files of 60 KB or less), not hotlinks.
- Measure 90 and 120 phones before adding any motion.

## Personas

There are about 12 archetypes. Each phone draws one archetype by weight, then
individual traits from that archetype's distributions. This gives every phone
its own seat and story while keeping legible groups.

| Archetype | Share | Wake (μ±σ) | Snooze | Commute | Work surface | Lunch | Evening / night |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Early-bird analyst | 8% | 05:45±10 | 0 | subway | mail, calendar | desk salad (delivery) | early sleep 22:15 |
| Snoozer creative | 10% | alarm 07:30, up 08:00 | 2–3 × 9 min | subway, late | team chat, reels breaks | solo, feed | doomscroll to 01:00 |
| Median office commuter | 18% | 07:00±15 | 0–1 | subway or bus | team chat, meetings | solo or with colleagues | cooking, streaming, scroll |
| Suburban parent driver | 10% | 06:15±10 | 0 | car (navigation) | mail, calls | desk | school app, groceries, kids, 23:00 |
| Remote late riser | 8% | 09:45±30 | 1–2 | none | video meetings | home delivery | gaming, scroll |
| Social media manager | 6% | 07:15±15 | 1 | subway | scheduler, analytics, comments | phone never down | replies at night |
| Client-facing sales | 7% | 06:45±10 | 0 | ride-hail | calendar, mail | client lunch (reservation) | drinks, ride home |
| Gig courier | 7% | 07:30±30 | 0 | bike | courier job queue all day | in the street | earnings, scroll |
| Hospital early shift | 6% | 05:30±10 | 0 | bus | phone in locker (off) | break scroll | exhausted sleep 21:30 |
| Grad student | 8% | 10:15±40 | 2 | walk | lecture, notes | cheap solo | short video to 02:00 |
| New parent | 6% | night wakes 02:00 and 04:30 | — | — | parental leave | baby tracker, delivery | monitor |
| Founder / always-on | 6% | 06:00±20 | 0 | car or ride-hail | everything, inbox zero | skipped | mail at 00:30 |

**Traits** (per person, seeded):

- alarm time, snooze probability per ring, snooze interval (9 min);
- commute duration and mode;
- work-pickup rate (checks per hour, Poisson);
- notification-rate multiplier;
- doomscroll appetite (minutes and bed delay);
- wallpaper, battery health, home-screen layout.

**Day variation** (per person and day):

- Wake, commute and bed times jitter by archetype σ × the `sameness` control.
- Weighted events:
  - line delay leads to a longer commute and a delay push;
  - rain switches the commute to ride-hail;
  - a late meeting;
  - a sick child (parent works from home);
  - Friday drinks;
  - the Monday Screen Time report.
- A gym or run day is a Bernoulli draw per archetype.

**Global events** (same minute on every phone, gated by `synchrony`):

- a breaking-news push;
- a weather alert;
- a platform outage (team chat shows "reconnecting");
- an evening software-update prompt.

### Example: snoozer creative, Wednesday

| Time | Episode | Screen |
| --- | --- | --- |
| 07:30 | Alarm | Alarm rings ("Alarm, 7:30 AM", Snooze / Stop) |
| 07:31 | Snooze | Lock screen, Sleep Focus off, 14 notifications |
| 07:39 | Alarm again | Alarm rings |
| 07:48 | Snooze 2 | Lock screen |
| 07:57 | Wake | Stop, then the lock-screen notification stack: group chat ×6, mail ×3, bank |
| 07:58 | Scroll in bed | Photo feed (11 min) |
| 08:20 | Getting ready | Music, now playing |
| 08:41 | Commute | Transit departures: "L train · 6 min · Delays", then a delay push |
| 09:24 | Work | Team chat unread channels, then a thread |
| 10:00 | Meeting | Video grid with "You're muted" |
| 10:40 | Break | Short video (7 min) |

The day continues the same way through lunch, the afternoon, the evening and
night.

## App clones (first set, about 26)

No logos and no real brand names. Apps use generic or fictional titles and
glyph icons. They follow iOS grammar: San Francisco through `-apple-system`,
iOS type ramp (large title 34, body 17, footnote 13), 390×844 points, safe
areas and tab bars.

| Group | Apps |
| --- | --- |
| System | lock screen, alarm ringing, home screen, bedtime / sleep Focus, Screen Time report, low-battery and update sheets |
| Morning / commute | weather, run tracker (map, pace, splits), transit departures and line, navigation (turn-by-turn, ETA, traffic), ride-hail, audio now-playing |
| Work | team chat (channels, threads, huddle), video meeting, mail, calendar day view, social scheduler and analytics, courier job queue |
| Life | messages, food delivery tracking, restaurant reservation, wallet / tap to pay, banking, groceries / recipe, school-parent app, baby tracker / monitor |
| Feeds | short video, photo feed, news, shopping |

## Options row (always present)

The row follows the finger-network grammar: plain bottom-centred text buttons,
with one collapsed `options` toggle. Everything is authoring-level and
domain-named.

| Control | Default | Range | Effect |
| --- | --- | --- | --- |
| time | 06:00, playing | 00:00–24:00 scrubber, play/pause | shared clock |
| speed | 1 s = 2 min | 0.25–30 min/s | tempo of the day |
| day | Mon | Mon–Fri | regenerates the day with that weekday's events |
| phones | 90 | 30–150 | population |
| arrangement | random seats | random, by archetype, by wake time | spatial reading of synchrony |
| sameness | 0.6 | 0–1 | scales every σ and the event probabilities (1 = identical drones) |
| notifications | 1× | 0–3× | push density |
| synchrony | on | off / on | global simultaneous events |
| seed | — | regenerate | new population |

Persona weights and archetype tables stay in `model/personas.ts`, which is the
place for tailoring beyond these controls.

## Execution with agents

1. **Lead (contracts).**
   - Write the types (Persona, Episode, Scene, Push, AppState union), `rng`,
     the clock and the sampler.
   - Build the `ios/` primitives, registry, both routes and the controls.
   - Build one reference clone (alarm plus lock screen) that fixes the visual
     grammar for everyone else.
2. **Parallel subagents (Sonnet as the everyday model, about 6).**
   - They work in disjoint folders and never edit the registry or `ios/`;
     requests for new primitives go back to the lead.
     - **Model:** personas, `plan-day`, notifications, tests. This could run on
       Opus because of how composition-critical it is.
     - **Clones:** one agent per app group (System, Morning/commute, Work, Life,
       Feeds).
   - Acceptance for each clone:
     - `Screen` driven only by props, with no timers or randomness;
     - fixtures cover its time course;
     - no brand names or logos;
     - US English copy;
     - scoped lint and typecheck pass.
3. **Lead (integration).** Wire scenes to apps, tune the persona tables, and run
   a single audit pass for brand leakage, iOS consistency and copy realism.
4. **Checks.** Pure model tests, `pnpm typecheck`, scoped ESLint. Browser review
   only when the user authorises it.

## Goal and acceptance criteria

The goal is met when all of the following hold.

**Field**
- `/mobiles/1` plays a full weekday of 90 phones from one clock.
- The options row is always reachable and its controls take effect without a
  reload.

**Model**
- Every phone's day is contiguous over [0, 1440).
- The day is deterministic for (seed, person, day).
- The day varies across weekdays when sameness < 1, and every person in an
  archetype is identical at sameness 1.
- Scenes use only catalogue views.
- Pushes are sorted. When synchrony is on, global events land at the same
  minute on every phone.
- Pure tests prove each of these.

**Synchrony and drift**
- Alarms cluster around the archetype wake times, with visible snooze tails.
- Commute, lunch and night-scroll bands are visible at the population level.
- No two phones show the same scene sequence for a whole day when sameness is
  0.6.

**Clones**
- Every catalogue view renders.
- `/mobiles/1/<app>` plays each fixture through its time course.
- Screens are pure (no timers, randomness, state or effects).
- No real brand names or logos.
- US English copy set in New York.

**Performance**
- Within the budget below: no video, no backdrop-filter, no infinite CSS
  animation, modest DOM per view.
- The planning time for 150 people is tested.

**Checks**
- Model tests pass, `pnpm typecheck` passes, and scoped ESLint is clean.
- Runtime behaviour is unverified until the user authorises a browser check.

## Clone contract

- A clone owns `components/mobiles/1/apps/<app-id>/` and default-exports a
  `CloneDefinition` (`apps/types.ts`): `Screen`, `fixtures` and an optional
  `tone(view)`.
- The lead registers it in `apps/registry.ts`.
- **`Screen`:** a pure function of `ScreenProps` (`model/types.ts`). Content
  comes from `createRng(seed)` (`model/rng.ts`). Change over time comes from
  `elapsed` and `duration`: scroll offset, messages arriving, ETA counting
  down.
- **Layout:**
  - The glass is 390 × 844 pt (1 CSS px = 1 pt).
  - The frame draws the status bar over the top 54 pt and the home indicator
    in the bottom 34 pt. Screens paint full-bleed and keep content clear of
    both.
- **Shared primitives and tokens:** use the primitives and `--ios-*` tokens
  from `ios/`. Add `ios.dark` at the screen root for dark appearance.
- **References:** `apps/lock` and `apps/alarm` set the reference grammar.
- **Fixtures:** at least one per view. Labels are short and lowercase. Each
  fixture's `clock` and `duration` describe a believable moment.

## Open choices (defaults chosen)

| Choice | Default | Alternatives |
| --- | --- | --- |
| Locale | New York (US English, $, °F, subway lines) | London, or a mix of both |
| Images | Local curated webp set, downloaded once | Remote hotlinks (like clone/11) |
| Short video | Still frames with swipe transitions | Real video |
| Day length | 12 real minutes at the default speed | — |

## Phase 2 — sessions in simulated time (implemented 2026-10-03, browser-unverified)

**Goal.** Inside every app, information, navigation, interaction and
transitions run at simulation speed, not real time.

At 10 min/s, a ten-minute scene is one real second of compressed use: several
flicks, a tap into a detail, a sheet, a back, a different item. Doubling the
speed doubles the tempo.

**Mechanism.** Each view builds a `Session` and plays it with `Storyboard`
(`ios/storyboard.tsx`).
- A session is panels (pages of the app) plus shots (when the person goes
  where, how far they scroll, where they tap).
- React renders a session once per scene.
- The Web Animations API plays it at full frame rate, with
  `playbackRate = minutesPerSecond`. Pausing pauses it; an outgoing screen
  freezes it.
- Live values may use a small `overlay` that re-renders per tick (ETA, clock,
  typing). Discrete changes paced by beats or timers are retired.
- Reference: `apps/photo-feed` feed view.

**Acceptance per app.**

| Criterion | Requirement |
| --- | --- |
| Shots | At least one per 2.5 simulated minutes for interactive views (feeds, chat, mail, browse). Slow-by-nature views (navigation, ride, run, baby monitor) must still change information at least every 3 simulated minutes. |
| Panels | Three or more distinct panels where the real app navigates. |
| Content | At least 40 distinct items per app, generated combinatorially from the seed, so neighbouring phones differ. |
| Realism | Flows follow how people use the app: open, skim, act, back. Taps precede navigation. |
| Timing | No fixed real-time durations anywhere; the contract test enforces this. |
| Budget | At most 700 DOM nodes per fixture render (`tools/bench-screens.mjs`). |
| Keys | No duplicate keys (`tools/bench-keys.mjs`). |
| Purity | Screens stay pure; the contract and model tests pass. |

**Tools.** Static and server-side only; no browser or server.
- `node components/mobiles/1/tools/bench-build.mjs <out>` builds the bench, then:
  - `node …/bench-screens.mjs <out>` reports nodes per fixture;
  - `node …/bench-keys.mjs <out>` reports duplicate keys and render errors over many seeds and days;
  - `node …/bench-apps.mjs <out>` renders every view of every clone over 60 seeds, 5 lengths and 3 moments (about 40 s) and reports duplicate keys, including a list that is a whole children array, and render errors;
  - `node …/bench-field.mjs <out> 3` reports field cost per tick.
