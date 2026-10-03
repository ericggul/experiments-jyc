# Visual design

Read for new interfaces or material redesigns. Existing UI contracts remain
invariants when only data, behavior, math, or transport changes.

## Form follows the participant's task

Identify who acts, what parameter/relation they must notice or change, and why
the proposed interface makes that action legible. A subject name such as bank,
AI, or news does not justify a themed dashboard. Record the rationale briefly
in working notes or the experiment document; no separate proposal is required.

If the interaction is not yet proven, begin with a neutral surface, clear
typographic hierarchy, the primary parameter, necessary secondary information,
and whitespace. Add a visualization only when it makes temporal or relational
change legible. Functional separators need an actual information boundary;
decorative dividers and image captions are not defaults. Images use accurate alt text.

Do not substitute faux technical chrome for an interface concept: arbitrary
dark/neon palettes, glow, gradients, giant numbers with tiny labels, ornamental
charts/gauges, fake LIVE states, revision codes, badges, and process footers.
These are not a universal ban on domain conventions; each element needs an
informational, interactive, or perceptual job. Remove elements whose deletion
does not weaken that job. Do not imply precision, liveness, or functionality
that the system lacks.

## Preserve operational grammar

References contribute hierarchy, density, alignment, semantic color, controls,
and expectations. Copying their palette alone is insufficient. `stock/2`'s
terminal grammar belongs to its task, not every experiment with data.

Parametric interfaces change a value within the reference's active semantic
slot. Keep spreadsheet lyric tokens in ordinary unmerged cells in the intended
row; never replace them with overlays, titles, badges, or floating lines.
Edge-aligned references meet the viewport's top/left edges without outer padding.
Hyper-real spreadsheet work retains chrome, formula bar, headers, selection,
tabs, and grid. Détournement requires a recognizable original coupling and a
legible transformation, not arbitrary data in a familiar-looking shell.

**사칙연산** ("컨템포러리 사칙연산", "모바일 사칙연산", "웹 사칙연산") is the user's
term for the four SNS post-action glyphs: **heart (like), comment, repost,
share (paper plane)**. These are the arithmetic operators of social media. When the term
appears, it refers to those four controls and their counts. Save/bookmark sits next to them but
is not one of the four. Replicas keep the platform's own glyph geometry
(stroke, corner, angle, proportion) for these four. Take it from the platform's
served assets and check it against current official app frames. Never draw it
or recall it from memory. A platform can mix icon generations: Instagram in 2026
uses Pano heart, comment and repost with a Prism share plane.
[Instagram /11](../../apps/scc/docs/experiments/sns/mobile/11.md) records the
sources and measurements.

For complex-systems experiments, derive form from the exact phenomenon.
Existing routes are history, not a palette/layout template. Begin perceptual
simulations with the field alone; add controls/text only when the participant
needs them. Direct-field or keyboard actions must remain discoverable and
accessible. Do not default to serif titles, corner counters, graph notation,
pause/reset controls, or distributed metrics.

## Typography and multi-device work

Texts with the same role share exact family, size, weight, tracking, line height,
casing, and responsive behavior through a common class/token/selector. If color
is the intended difference, change only color. Compare paired labels when
editing their styles; do not invent hierarchy for visual balance.

Across devices, preserve a coherent grammar while allowing differences justified
by actual roles, parameters, or observation tasks. Make propagation, transitions,
and mutual influence perceptible; individual screen spectacle must not obscure
the relation. System-node names alone do not warrant separate visual identities.

Fixed-format artifacts scale internal typography, spacing, and controls
with the outer container at a usable visual size. Non-scrollable pages fit their
required content inside the viewport. Reuse established primitives and present
values in the experiment's domain language, not simulation/debug terminology.
