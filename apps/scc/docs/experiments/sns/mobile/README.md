# Mobile service and social-platform surfaces

The first ten routes are independent fictional service interfaces, created
2026-09-23 as reusable DOM material for later web-interface collage experiments.
They are original plausible services, not pixel-matched copies of named
commercial applications. Routes 11–13 instead reconstruct recognizable
social-platform navigation and interaction patterns with local sample content.

| Route | Service | Primary workflow |
| --- | --- | --- |
| `/sns/mobile/1` | 오브제 — design shop | Browse products, select options, manage bag, create a local order |
| `/sns/mobile/2` | 한끼 — neighborhood meals | Find a restaurant, customize a meal, choose delivery/pickup, order locally |
| `/sns/mobile/3` | 여백 — small stays | Search stays, choose dates/guests, save and manage a local reservation |
| `/sns/mobile/4` | 오늘 — team work | Filter tasks, edit details/checklists, comment, create tasks, read inbox |
| `/sns/mobile/5` | 곁 — secondhand market | Browse/filter listings, save, compose a listing, continue a local conversation |
| `/sns/mobile/6` | [THREAD — British fashion resale](6.md) | Filter by category and UK size, save items, manage a bag and local orders |
| `/sns/mobile/7` | [SIDEWALK — New York food ordering](7.md) | Customise meals, choose delivery/pickup and create local orders |
| `/sns/mobile/8` | [PLATFORM — British rail](8.md) | Select outbound/return fares and manage local sample tickets |
| `/sns/mobile/9` | [REP — US fitness booking](9.md) | Find scheduled classes, inspect studios and manage local bookings |
| `/sns/mobile/10` | [COMMON — London neighbourhood marketplace](10.md) | Find nearby items, compose listings and continue local conversations |
| `/sns/mobile/11` | [Instagram](11.md) | Move among the feed, stories, discovery, posts, Reels and profiles |
| `/sns/mobile/12` | [TikTok](12.md) | Watch and navigate videos, creators, search, comments and saved states |
| `/sns/mobile/13` | [X](13.md) | Read feeds and threads, search, visit profiles, compose and manage post actions |

The existing SNS experiments establish the method: Instagram contributes
recognizable viewport and action grammar; LinkedIn connects feed, detail and
composition through local state; YouTube links discovery to sustained browsing
and a library. This family preserves that connected behavior while changing
the service and its mobile composition. Existing variants remain untouched.

Each numbered folder owns its model, screen, CSS Module and entrypoint. The
shared SNS registry and dynamic route expose the numbered surfaces. Independent
markup and state keep future cut-up or distortion experiments bounded; no
canvas screenshot, cross-service store, socket or production API is involved.

Product photos, merchant/menu imagery and lodging/listing photos support
selection; typography, density and action placement vary with the actual task.
Narrow layouts use safe-area-aware navigation and scrollable content without
device chrome. Order, reservation and conversation flows are local prototypes,
not real payments, inventory, availability or message delivery. Image loading
requires the external image host.

In 1–5, shop, meals and team-work changes last until page reload. Stays and marketplace
records persist in this browser under `scc-yeobaek-v1` and `scc-gyeot-v1`;
storage failures fall back to the current session with visible feedback.

Variants 6–10 preserve the independent architecture and connected local workflows,
not the visual styling of 1–5. Their numbered records hold direct visual references
and adaptation decisions. Differences include density, navigation, photography,
currency, sizing, locality and service-specific copy. They are fictional
adaptations, not verified pixel replicas. No 1–5 implementation is changed by
the 6–10 extension.

Variants 11–13 are replicas of recognizable social-platform interface systems
rather than fictional brands. They use local sample posts, media and state;
social actions do not publish to or retrieve from Instagram, TikTok or X. Their
numbered records specify the reference frame and the implemented inner-page
flows. The earlier mobile services remain independent baselines.

## Variants 1–5 verification — 2026-09-23

The full SCC TypeScript check and scoped ESLint passed. Chrome rendered all
five routes at 390×844 and 320×740; all five measured 320px document width at
320px. At 1280×900, each retains its centered 460–480px mobile composition
without document overflow. Initial visible photographs loaded successfully.

Observed Chrome workflows:

- Shop: product detail, color/quantity, bag subtotal and delivery fee, validated
  local checkout, recipient/contact/delivery-request order snapshot.
- Meals: pickup mode, menu extras and requests, bag total with zero delivery
  charge, local order confirmation.
- Stays: saving, detail, price breakdown, capacity rejection and draft cancel
  restoration, reservation and cancellation; edited dates commit visibly.
- Team work: checklist, comment, completion progress, task creation on a date
  outside the initial week and navigation to that week.
- Marketplace: search, save, offer-to-chat transition and additional local
  message storage; listing composer opens. Photo-file selection could not be
  completed because the Chrome extension denied local-file access, so image
  upload and the resulting listing submission are source-checked, not
  browser-verified.

Integration caught and fixed a missing JSX fragment closing tag in `/2`,
cart replacement on reorder, pickup-specific instructions, and native date
inputs whose displayed value could differ from React state. Date forms now
read named form values at submission and validate those values. Physical
phone keyboards, touch behavior and every secondary state remain unverified.

## Variants 6–10 verification — 2026-09-23

Five Astra assignments built independent US/UK surfaces; concurrency was bounded
to three subagents alongside the lead. The user rejected the initial `/6`
appearance after viewing it, and its composition, controls and typography were
reworked; [6.md](6.md) retains that outcome and the replacement reference.

The integrated SCC TypeScript check, scoped ESLint, CSS-class reference audit,
route/entrypoint and local documentation-link checks passed. All ten mobile
routes are registered once. Hash comparison confirmed that all 20 implementation
files in 1–5 remained unchanged during this extension.

Pure checks covered seller-grouped postage, food subtotal/fees/tipping, rail
direction and return chronology, and fitness booking deduction, duplicate and
overlap rejection, insufficient credits and cancellation refunding exactly once.
All 6–10 state is local to the mounted visit. No payment, delivery, travel ticket,
studio reservation, listing publication or seller contact occurs.

No browser/runtime inspection was performed for 6–10. Rendered appearance,
physical-phone behavior, photo-file selection and remote photo availability
remain unverified; the earlier 1–5 browser evidence does not apply to these
variants. Public reference screenshots were inspected before implementation,
but these fictional services are not verified pixel matches.

## Variants 11–13 verification — 2026-09-23

The three replicas use distinct platform navigation and session-local data.
Instagram links its feed, stories, post detail, profile, Explore and Reels;
TikTok links a local-video feed with comments, search, creator profiles and
saved/liked views; X links its timeline, threads, profile, search and composer.
Their individual records describe which visual and behavioral references were
observed and where the reconstruction relies on inference.

The 2026-09-23 revision gives Instagram 100 photo posts with 100 distinct
source image IDs and captions, interleaved across ten accounts. Its bottom
navigation follows Meta's publicly announced Home–Reels–Messages–Search–Profile
arrangement; the announcement does not establish universal rollout. X has 108
distinct top-level posts across 20 fictional accounts plus 14 linked replies;
its dark shell follows a public mobile screenshot whose capture date is unknown.
TikTok no longer wraps its five local clips back to the first. It advances in
ordered batches from a curated Commons list, reaching at most 34 distinct
source videos based on a static metadata check. Missing media, network or codec
support can shorten a browser session, and the finite selection cannot match
TikTok's continually replenished live feed.

The integrated SCC TypeScript check, scoped ESLint, TikTok's pure feed-boundary
test, local media-path and documentation-link checks, and `git diff --check`
passed. A read-only source
review also checked linked detail flows and corrected profile/search state
issues before handoff. No browser, playback, device or same-viewport visual
gate was run for 11–13. Their rendered fit, gesture timing, external photo
loading and exact visual fidelity remain unverified.
