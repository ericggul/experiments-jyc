# SNS Instagram 3-finger — finger-activated stories

- **Route:** `/sns/instagram/3-finger`
- **Date:** 2026-09-24
- **Baseline:** `/sns/instagram/3`

The same centered story grid uses the baseline's default surface, 40 px icon size, 26 px gap, hidden labels, and Instagram ring palette. The lower-right test controls are absent. The surface is fixed to the mobile viewport; touch gestures operate on the stories without scrolling the page.

All story cells begin empty. Pointer-down activates a cell immediately. A captured pointer crosses cells without lifting; its coalesced samples and each segment between samples are checked against the actual circular bounds, so fast movement can activate every circle it intersects. A cell never activates from another cell. Each activated story holds its new ring for 1.2 seconds, runs the existing 760 ms viewing sweep, fades for 300 ms, then becomes empty. A later pass can activate it again.

This fork tests a continuous gesture selecting discrete story cells. It retains the baseline's geometry and story rendering while replacing autonomous appearance and social propagation with direct contact. Static typecheck passed; visual interaction has not been checked in a browser.

## Temporal edges

When a new bubble is activated, it receives a directed edge from every bubble activated by the same uninterrupted pointer gesture in the preceding one second. The sources are ordered by actual crossings along the pointer path, including a fast swipe processed as one event. Edge paths use the baseline's short fading trace (1.2 seconds). Lifting or cancelling the pointer ends that gesture's history; another finger has its own history. Existing bubbles never create edges on their own.
