# LinkedIn 6 test — preserved failed renderer

- **Route:** `/sns/linkedin/6-test`
- **Date:** 2026-09-14
- **Purpose:** immutable snapshot of the unsuccessful first `/linkedin/6`
  implementation, retained only to preserve the failure and enable comparison.

It combines a browser-paint texture capture with independently cylinder-deformed
surfaces. It does **not** meet the accepted contract: some DOM paint is broken,
the capture lifecycle can degrade interaction performance, and it has not met
pixel-fidelity review. It must not be imported by or used as the basis for
`/sns/linkedin/6`.
