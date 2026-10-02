# Mobile finger-network/4

- **Route:** `/mobile/finger-network/4`
- **Date:** 2026-10-02
- **Baseline:** [`/mobile/finger-network/3`](finger-network-3.md) with people always on: 5 s fading session nodes, faint (0.2) network under a session's person, stick figures on `/2`'s rig. `/3` remains independently addressable.

The changed relation is that a person outlives its touch session and becomes an agent. While the session's fingers are down, the person is exactly `/3`'s white, touch-sized stick figure. When the last finger lifts, the person leaves the touch network: over 1.6 s it shrinks (smoothstep) from its touched pose into a walking adult about 60 px tall, and its white turns into its lineage hue. The session's nodes still fade over 5 s, faintly, as in `/3`. A single-node session raises no one and leaves no agent.

## Society: love, children, ageing (second model, 2026-10-02)

The first society model, also on 2026-10-02, used `adaptive-coevolving-network/1`'s coevolving voter rule: four finger-count opinions, ties that rewired or converted, and agents about 35 px tall. The user found everything after the person's creation dull, especially the tiny agents clustering in one place, so it was replaced by a life-course model (`model/society.ts`). It has one sex, and one model year is 1.5 s.

- **Arrival:** a touch-born person arrives as an adult aged 18–28. Its inherited trait, a position on a 360° circle shown as hue, starts from a founding hue for its finger count (2–5 fingers: 45°, 200°, 345°, 120°) ± 15°.
- **Movement:** singles roam the whole field with a persistent, randomly turning heading. A single who sees a compatible single within 150 px walks toward them. Adults keep 48 px personal space, and soft margins keep everyone on screen. Old people walk more slowly.
- **Courtship:** compatibility is 1 − (trait distance / 180°). Two singles within 46 px pair if each finds the other at least as compatible as its own pickiness (attempts at 1.2/yr). Parents, children, and siblings never pair.
- **Couples:** a couple walks side by side, 30 px apart, holding hands. Each reaches its inner hand out, and a white line joins the two hands. A union raises a pink heart.
- **Satisfaction:** it starts from compatibility, leans toward it over time, wears slowly, and wobbles at random. Each child adds to it.
- **Divorce:** divorce comes at 0.9/yr × (1 − satisfaction)², shown as a grey heart splitting apart.
- **Betrayal:** a partnered person near an unrelated single who fits them better than their current satisfaction + 0.15 may leave for them (0.35/yr). This is shown as a red split heart followed by a new heart.
- **Adaptation:** pickiness starts at 0.7 and falls 0.04 per single year, down to 0.15. Being left raises it by 0.18; leaving raises it less. A widowed person resets to 0.5.
- **Children:** a fertile couple (both 18–45, at least 2.5 years since their last child) has a child at 0.35/yr × (0.5 + satisfaction) × (1 − population / 70). The newborn rings once as it appears. The child's trait is the circular mean of its parents' traits plus Gaussian mutation (σ 14°). It starts at about half size, grows to adult size at 16, and stays beside a living parent until then.
- **Ageing and death:** colour pales from 55 and strongly from 70. Mortality is Gompertz, 0.0006 × e^(0.085 × age) per year. The dead lie down and fade over 1.6 s, and a widowed partner becomes single. A hard cap of 120 living people retires the oldest.

A two-line monospace readout at the bottom uses `/2`'s readout style (10 px, centred, tabular digits) and is rewritten at about 12 Hz. It hides when nobody is alive.

- Line 1 is the present: model year, living population, couples (`pairs`), children under 16, highest generation, and lineages (living people's 30° hue groups).
- Line 2 counts events per ten model years over the last 20 years: births, deaths, unions (`wed`), partings including betrayals (`split`), and betrayals alone (`cheat`).
- Lines stay within 59 characters for up to 4-digit years and 3-digit counts, so they fit a 390 px-wide phone.

People are batched by 10° hue bin and life stage, so each bin is one stroke. All couples' hands are one stroke.

These are the complex-adaptive ingredients. Agents are heterogeneous (trait, pickiness, age) and interact only locally (courting, cheating, and parenting happen at short range). They adapt from their own experience (pickiness). Feedback loops run from compatibility to satisfaction to children to satisfaction, and from crowding to fewer births. Selection with inheritance lets lineages, population size, and families emerge rather than being scripted. Touch is the open-system inflow.

## Observations

Pure-model runs started from eight touch-born adults (seeds 1–3, 390 × 800 field, no further touches for 400 s):

- **Two seeds grew.** They reached 35–40 people, with 8–10 couples and 13–14 children alive. Over the run there were 123–164 unions, 50–55 partings (3–10 betrayals), 116–157 births, and 84–130 deaths.
- **Lineage hues narrowed.** The number of 30° hue groups fell from 7–8 to 3, because compatible couples have more children.
- **One seed went extinct.** It ended by 240 s after only 10 unions and 6 births, which shows that a new touch can be what rescues a society.
- **Spread:** people covered most of the field. The nearest non-partner was about 26–58 px away on average.

A headless run of the component (12 sessions of 2–5 fingers, then 90 s) drew 20 strokes per frame with no non-finite coordinates. The worst frame in Node with a mocked canvas was 1.0 ms. Device frame time is unmeasured.

Tests cover the existing `/3` network and person rules, plus:

- seeded replay;
- mutual, monogamous partnerships between living, unrelated adults;
- bounded positions;
- unions, partings, betrayals, births, and deaths all occurring over about 80 model years;
- children inheriting their parents' trait;
- pickiness falling while single;
- the deaths of the very old.

## Model option and political landscape (2026-10-02)

The bottom of the screen now has `/3`'s option control, laid out as one row. `옵션` opens `사랑` and `정치`, the active one at full opacity, and `닫기` closes the row. The touch-to-person part is the same in both models; a person settles into whichever model is shown when its fingers lift. Each model keeps its own people, and only the shown model runs, so switching away pauses a society rather than clearing it. Touches that start on the controls do not create nodes. The readout moved up to 52 px and the instruction to 64 px to clear the controls.

`정치` (`model/politics.ts`) replaces left and right with the phone's vertical axis. Opinion runs from −1 (하파, bottom) to +1 (상파, top), and each person walks toward the height of its opinion (0.35 of the screen height on each side of the centre), so the screen is the spectrum. A newcomer's opinion is where its person was let go.

- **Talks:** 0.8 per person per second. Three in four are with a random person within 70 px, i.e. an on-screen neighbour who therefore holds a similar view. One in four is with anyone on screen (`crossTalk`), which is where distant opinions meet.
- **Bounded confidence with backfire** (Deffuant et al. 2000; repulsion as in Jager and Amblard 2005):
  - within a person's tolerance, it moves 15% toward the other (× openness);
  - beyond tolerance + 0.25, it moves 10% away;
  - in between, nothing happens.
  Openness is 1 − 0.7|opinion|, so extremes are stubborn.
- **Adaptation:** an agreeable talk widens tolerance by 0.01, and a backfire narrows it by 0.05 (floor 0.1, ceiling 0.8). Starting tolerances are 0.2–0.6.
- **Swings:**
  - an election every 12 s, decided by majority side;
  - for 6 s afterwards, a backlash pushes everyone 0.08/s away from the winner (thermostatic public opinion);
  - random issues push everyone 0.08/s one way for 3 s, about once every 15 s;
  - small Gaussian noise.
- **Turnover:** each person retires at 1/45 per second and is replaced at a random spot by a newcomer with opinion N(0, 0.3), so a pool of persuadable centrists keeps returning. The population cap is 120.
- **Encoding:**
  - Colour runs from 하파 teal through a pale grey centre to 상파 amber, in 0.1 opinion bins.
  - A faint centre line separates the sides, with small `상파` and `하파` labels at the top and bottom, and an election flashes that line in the winner's colour for 2 s.
  - Recent talks draw a faint white line for agreement and a red one for a backfire.
  - Retiring people fade where they stand.
- **Readout:** the first line shows the current 상파/하파 shares, population, centrists (|opinion| < 0.3), and extremes (|opinion| > 0.8). The second line shows the last election's winner and share, talks per second, and the backfire share over the last 20 s.

### Tuning record

Untuned, talk partners were always on-screen neighbours, whose opinions are already close, so no talk ever backfired (0%) and the screen stayed a static gradient. Adding cross-screen talks while keeping wide, growing tolerance made everyone converge to the centre within about 4 minutes (sd of opinion fell to 0.07–0.17), and the majority then flipped randomly around zero. Narrow, slowly growing tolerance with stronger backfire froze the population at the two extremes, 50/50, with no movement (sd ≈ 0.9). Adding a pull back toward the centre plus tolerance recovery again collapsed everyone to the centre. Generational turnover is what held the middle regime.

With the chosen settings, in pure runs (30 people, seeds 1–3, 240 s):

- opinion stayed spread (sd 0.36–0.60);
- both centrists and extremes persisted;
- about 9–12% of talks backfired;
- the 상파 share at 24 s samples ranged from 17% to 80%, with repeated changes of majority.

Tests cover the opinion–height mapping, seeded replay, bounded opinions and walking to the opinion's height, convergence of close neighbours and backfire of far ones, steady population under turnover, and scheduled elections with majority flips. A headless run of the component in both models (12 sessions, then 120 s) drew 20–21 strokes per frame with no non-finite coordinates. Device frame time is unmeasured.

## Unresolved

Open questions:

- Whether the political swings read as a story at phone size, and whether 12 s elections are too frequent.
- Whether people in the political model should also pair or die, joining the two models.

- Whether hearts and hand lines read clearly at phone size.
- Whether one model year should be 1.5 s.
- Whether new touches should do more than add adults, for example bless or break up a couple they touch.
- Whether an extinct society should stay empty until touched.
