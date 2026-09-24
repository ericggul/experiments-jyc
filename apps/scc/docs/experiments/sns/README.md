# SNS Experiment

- [Mobile surfaces 1–13](./mobile/README.md): ten independent Korean and US/UK
  services, then Instagram, TikTok and X interface replicas with local content.

Routes:

- `/sns`
- `/sns/feed/1`
- `/sns/instagram/1`
- `/sns/navigation/default`
- `/sns/navigation/1`
- `/sns/navigation/2`
- `/sns/youtube/1`
- `/sns/youtube/2`
- `/sns/youtube/3`
- `/sns/youtube/4`
- `/sns/youtube/5`
- `/sns/youtube/6`
- `/sns/linkedin/1`
- `/sns/linkedin/2`
- `/sns/linkedin/3`
- `/sns/linkedin/5`
- `/sns/linkedin/4`
- `/sns/linkedin/6`
- `/sns/linkedin/6-test`

Files:

- `app/sns/page.tsx`
- `app/sns/[category]/[experiment]/page.tsx`
- `components/sns/experiments.ts`
- `components/sns/feed/1/index.tsx`
- `components/sns/feed/1/data.ts`
- `components/sns/instagram/1/`
- `components/sns/navigation/default/index.tsx`
- `components/sns/navigation/1/index.tsx`
- `components/sns/navigation/2/index.tsx`
- `public/images/sns/navigation/2/instagram-action-row-reference.jpg`
- `components/sns/youtube/1/`
- `components/sns/youtube/2/`
- `components/sns/linkedin/1/`

Intent:

`/sns/feed/1` is a mobile-first Instagram-style feed clone. It uses 100
deterministic predefined posts and wraps through them as the vertical feed
extends, giving the interaction model of an infinite feed without fetching live
content.

`/sns/instagram/1` reconstructs the supplied mobile home frame as one continuous
local interface: its header, visible story profiles, shown post, and floating
navigation. It excludes device status chrome and makes only local interaction
states; it does not connect to real accounts or replay private Instagram data.

`/sns/navigation/default` preserves the iPhone Instagram bottom
navigation test: Home, Reels, Messages, Search, and Profile. It intentionally
does not clone the feed or center interface. The bar uses the newer floating
translucent iOS-style treatment rather than the older flat white strip. Tapping
a tab moves the active glass highlight. Finger skating lets one uninterrupted
pointer gesture continuously select tabs across both columns and independently
stateful navigation rows.

`/sns/navigation/1` compares two five-part cycles. `24h` compresses a modern
worker's day to bed, commute, work, meal, and phone reels. `Life` compresses a
modern worker's lifetime to birth, education, work, hospital, and death. Its
bottom-left `24h / Life` switch preserves separate interaction state for both
timescales so they can be compared without leaving the route.

`/sns/navigation/2` preserves the Instagram post-action row as a dark,
full-width reference interface: like with `3,473`, comment with `81`, repost,
send with `525`, then a save control held at the far edge. It removes the source
carousel indicator and stacks this exact row as independently selectable
finger-skating groups. See [navigation/2](./navigation/2.md) for the variant
contract.

The larger service reconstructions have variant-specific contracts:

- [Instagram 3-finger](./instagram/3-finger.md)
- [YouTube 1](./youtube/1.md)
- [YouTube 2](./youtube/2.md)
- [YouTube 3](./youtube/3.md)
- [YouTube 4](./youtube/4.md)
- [YouTube 5](./youtube/5.md)
- [YouTube 6](./youtube/6.md)
- [LinkedIn 1](./linkedin/1.md)
- [LinkedIn 2](./linkedin/2.md)
- [LinkedIn 3](./linkedin/3.md)
- [LinkedIn 5](./linkedin/5.md)
- [LinkedIn 4](./linkedin/4.md)
- [LinkedIn 6](./linkedin/6.md)
- [LinkedIn 6 test](./linkedin/6-test.md)

The icon system must communicate these cycles without visible explanatory
text. At the rendered 28-pixel size, prefer established universal pictograms
and reduce each stage to its strongest recognition cue: a baby bottle, open
book, monitor, medical cross, and gravestone. Do not invent bespoke symbolic
silhouettes or add details that make the primary object harder to recognize.

The bottom-left visual toggle compares three experimental selected states:
`Stroke` colors the icon outline, `Fill` colors its primary body, and `Halo`
keeps the icon monochrome while applying a light object-referential tint,
border, and shadow to the selected pill. Unselected icons remain monochrome.

Interaction:

- Vertical scroll extends the feed in batches and wraps through the 100-post
  dataset.
- Every `/sns` route uses the nested `app/sns/layout.tsx` viewport policy:
  `maximumScale: 1`, `userScalable: false`, and a `touch-action: pan-x pan-y`
  wrapper prevent two-finger page zoom without changing routes outside SNS.
- Each post has a horizontally snapping media carousel with two to five images.
- The active media index is tracked per carousel and shown as progress dots.
- Like, save, comment, and send are present as direct feed controls.
- `/sns/navigation/default`, `/sns/navigation/1`, and `/sns/navigation/2` use the shared
  finger-skating behavior defined in
  `apps/scc/docs/experiments/finger-skating/README.md`.
- Double-clicking media triggers a heart burst and likes the post.

Rules:

- Keep `app/sns/[category]/[experiment]/page.tsx` as a route switch only.
- Keep generated feed data in `components/sns/[category]/[experiment]/data.ts`.
- Keep interaction logic in `components/sns/[category]/[experiment]/index.tsx`.
- Do not add API calls or live social-network dependencies.
