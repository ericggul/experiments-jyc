# 0922 default

- Route: `/screen/0922/default` (legacy alias: `/0922/default`)
- Date: 2026-09-22
- Baseline: [`0908/overlay-5`](../0908/overlay-5.md), including its current local changes

This is a standalone copy of overlay-5. The question for the 0922 family is
what can be changed after preserving that exact working baseline; this default
introduces no visual, algorithmic, timing, control, or interaction mutation.
Its initial selection remains parameter combination `5`, and combination `4`
remains available in the right-hand controls.

The component modules are local to `0922/default`; the story session key,
renderer log label, generator target, and copied audio asset use the new
experiment identity. Existing 0908 image URLs remain unchanged so the same
source images and appearance are used. No distinct runtime outcome has been
observed yet; verification is static until this HTTPS route is tested.
