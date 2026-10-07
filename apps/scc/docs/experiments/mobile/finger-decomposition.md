# Finger decomposition — /mobile/transform/finger-decomposition/[clone]

Experimental, 2026-10-07. Baseline: each preserved `clone/1`–`clone/13` surface. [Decomposition](decomposition.md) sorts every atom by category in one move. Here the interface is taken apart only as far as fingers take it, in the manner of [finger skating](finger-skating.md), and is treated as one continuous liquid sheet rather than as separate pieces.

- **Changed variable:** what takes the interface apart. A finger drags a continuous deformation of the page; there is no sort.
- **Invariants:** the clones themselves, and the live page underneath, which taps still operate.

## First version (same day, replaced)

The first version copied decomposition's atoms (text runs, icons, images, boxes) as DOM pieces. It carried each piece's centre and local Jacobian through a composed Gaussian flow. It failed on both counts the user named.

- **Not continuous.** Each piece moved by its own centre, so a box's fill and the text inside it parted (search field and icon, chip and label). The interface read as cut into pieces, not as a deforming sheet.
- **Slow.** About 2,000 DOM transforms were rewritten per frame on `/11`.

## Method

- **Picture** (`engine.ts`). The visible viewport is captured with html2canvas in `foreignObjectRendering` mode, which uses the browser's own text layout. The canvas renderer shifted text baselines (search placeholder, chip labels). That mode does not load `<img>`, so images are inlined as data URLs in the capture clone and cached across captures. The page is re-captured after a DOM change, a scroll, or a load, at most every 400 ms. Capture scale is the device pixel ratio, capped at 2 and at 2.4 MP.
- **Sheet** (`liquid.ts`, pure, `liquid.test.mjs`). An Eulerian velocity grid (14 px) is the liquid. A finger pulls the velocity within a Gaussian of σ toward its own velocity, capped at 4,000 px/s. Each frame, the velocity is advected by itself (semi-Lagrangian) and spread by viscosity (1,400 px²/s). A 24-iteration Jacobi pressure solve projects it divergence-free, so the sheet keeps its area and a stroke sends return currents and eddies round its sides (after [Stam, *Stable Fluids*](https://www.josstam.com/publications)). The screen edges are free-slip walls, and floor friction (1.6 /s) brings the liquid to rest a few seconds after release. A Lagrangian mesh (8 px, about 5,350 vertices and 10,400 triangles on a 390 × 844 viewport) is carried by that velocity with the midpoint rule. Each vertex keeps its rest position as its texture coordinate, so the drawn page is a continuous map of the original. It is never cut.
- **Holding.** A finger landing on an interface element holds it. The element is found by mapping the touch back through the deformation to the page and taking the first control, graphic, or drawn box there. Enclosing boxes up to 6× its area come with it, so the search field comes with its input and a chip with its label. Anything over 30 % of the viewport counts as ground. The mesh vertices inside the held element move rigidly with the finger and are not advected, while the finger also drags the liquid around them. The surroundings therefore flow continuously into and away from the held piece. A per-vertex lift, used as WebGL depth, draws the most recently held part of the sheet on top. A finger on ground skates the liquid without holding anything.
- **Drawing** (`renderer.ts`). WebGL2 draws one indexed triangle mesh. Vertex positions are streamed each frame, while rest positions, indices, and lift are uploaded once or only when a new piece is held. Where the sheet is pulled away, the page's ground shows: the first opaque fill behind the middle of the screen, not the body's dark-scheme colour.
- **Input.** A press that moves less than 6 px is a tap. It is mapped back through the deformation (`restPointAt`) and clicks the live element drawn there. The new state is re-captured into the same deformed sheet. The wheel scrolls the live page or the inner scroll area under the pointer. Touch cannot scroll, because every touch is a drag.

Bottom-right `옵션` panel: `되돌리기` stops the liquid and glides the sheet back to the page in 760 ms. `범위` sets the drag's σ as a share of the viewport's short side: 0.05–0.6, default 0.14, about 55 px on a 390 px phone.

## Status and limits

Model tests (6) cover:

- rest identity;
- local carry with a still far field;
- coasting and return to rest;
- area kept within 5 %;
- rigid held vertices;
- inverse mapping.

On the development Mac, one liquid step takes 0.38 ms, one finger sample 0.004 ms, and one inverse-mapped tap 0.16 ms.

Browser check in a 390 × 844 iframe in a background tab (2026-10-07). rAF and timers were shimmed because the window was hidden, so frame rate was not measured. `/9`:

- the foreignObject capture matched the page;
- holding the search field carried the whole field rigidly on top, with the calendar and chips flowing round it;
- tapping `Fri 25` changed the live page and the re-captured sheet.

`/11`: inlined images drew, and the photograph bent continuously. In those synthetic tests, 50 pointer events dispatched within 1 ms stretched long streaks from a held story ring, because no liquid frame ran during the burst. Real-time finger behaviour is unverified.

Further limits:

- Phone frame timing and capture time are unmeasured. A capture took about 2–3 s in the throttled background tab.
- Video and WebGL content capture blank in foreignObject mode.
- Between captures, an animating clone is shown as it was at the last capture.
- Long presses and swipes are not forwarded to the page.
