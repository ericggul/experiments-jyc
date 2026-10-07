# `/adaptive-coevolving-network/7-glsl-4` — tissue with protists (2026-10-07)

- **Baseline:** [`7-glsl-3`](7-glsl-3.md), copied whole at the state after small pages were made smaller and allowed to cluster. Split off at the user's request; 7-glsl-3 was reverted to that state.
- **Changed variables (user requests: small pages more like living things than dull dots; the simulation should fill more of the screen):**
  - **Protists:** each page writes, into the tissue's held-alive channel, a membrane ring at .82 of its radius (width `max(.9, .11r)`, from 4 px radius up), a nucleus `max(1.3, .24r)` across drifting by up to .22r, and a tail `2.4r + 6` px long trailing opposite the page's drawn velocity (turning slowly when still) and beating at 7 rad/s. They fade out between 10 and 22 px of radius, where only a centre nucleus `max(1.8, .12r)` remains; the tissue grows around all of them.
  - **Layout:** gravity .2 (7-glsl-3: .9) and ideal link length from 1.4 of the area per page (7-glsl-3: .42).
- **Observed (2026-10-07, hidden automation tab):** at 30 s every page read as a small tailed cell with membrane and nucleus; at 50 s two large pages had grown lush tissue joined by a fibre channel while small pages clustered as cells. The user judged the visual style changed for the worse in 7-glsl-3 and asked for it to be kept here instead.
- **Unresolved:** whether the wider layout actually fills the screen (at 50 s the web still spanned about half the width); frame cost not measured.
