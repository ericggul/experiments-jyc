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
