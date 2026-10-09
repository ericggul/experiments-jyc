# 사칙연산 — /mobile/arithmetic

2026-10-09. The four Instagram post actions — like, comment, repost, share — read as the 사칙연산 of SNS (see the [clone/11 glyph correction](../sns/mobile/11.md#사칙연산-glyph-correction--2026-10-03)).

## /default — the four glyphs

`/default` is the baseline. It was created at `/1` on 2026-10-09 and moved to `/default` the same day, freeing `/1` for the calculator. It shows the four glyphs large, in one horizontal row, on a full-viewport page in Instagram's web dark-mode colours: icons `rgb(248 249 249)` on `rgb(12 16 20)`. The first version used pure white on black. Each glyph is `min(18vw, 18vh)` square with a `6vmin` gap. Path data is copied verbatim from clone/11's IGDS glyphs into [`glyphs.ts`](../../../components/mobile/arithmetic/default/glyphs.ts) so the archived clone is not coupled to this experiment. There is no interaction yet; the next instruction defines it.

On 2026-10-09, the glyphs were checked again against a fresh fetch of Instagram's web bundles: 4,040 `static.cdninstagram.com` scripts from the same five logged-out pages that clone/11 used. All four `d` strings and the share fold line are character-identical to the live `IGDSHeartPanoOutlineIcon`, `IGDSCommentPanoOutlineIcon`, `IGDSResharePanoOutlineIcon` and `IGDSDirectPrismOutline24Icon` modules. Paint attributes are also identical. The base fills with `currentColor`; comment and share use a 2-unit round-joined stroke with no fill; the fold line has a round cap. The extra `strokeLinecap="round"` on the SVG root has no effect here, because heart and repost have no stroke and the comment and share paths are closed. Scaling the 24-unit viewBox keeps the stroke-to-glyph ratio.

The same fetch supplied the colours. Instagram web dark mode sets `--ig-primary-text` to `248, 249, 249` and `--ig-primary-background` to `12, 16, 20`. Glyph identity is with the web IGDS assets; clone/11 measured the 2026 iOS promotional frames against them at IoU 0.91–0.95.

Static checks only; not viewed on a device.

## /calculator — iOS 27 Calculator clone

`/calculator` began as a working clone of the iOS basic Calculator; its operator column now holds the SNS 사칙연산 (below). It was built at `/1` on 2026-10-09 and renamed `/calculator` the same day so it can keep changing as a calculator study; `/1` now holds the tap experiment. Files are the pure engine [`model/calculator.ts`](../../../components/mobile/arithmetic/calculator/model/calculator.ts), the screen [`screen/`](../../../components/mobile/arithmetic/calculator/screen/index.tsx), and the symbols [`glyphs.tsx`](../../../components/mobile/arithmetic/calculator/screen/glyphs.tsx).

### Reference

- **Layout and proportions:** the screenshot on Apple's [Use the basic calculator on iPhone](https://support.apple.com/guide/iphone/use-the-basic-calculator-iph1ac0b5cc/ios) page, in the iOS 27 user guide (fetched 2026-10-09, 490×1008 PNG). It shows a toolbar with History on the left and Change Mode on the right as glass circles, and a gray expression line `38,670÷50,000` above the result `0.7734`. The keypad reads ⌫ · AC · % · ÷ / 7 8 9 × / 4 5 6 − / 1 2 3 + / ⁺∕₋ · 0 · . · =.
- **Key changes since iOS 18:** [9to5Mac on iOS 26](https://9to5mac.com/2025/08/12/ios-26-iphone-calculator-clear-button/) reports that C/AC returned in +/−'s old slot, +/− moved to the bottom left, and the mode switch moved to the toolbar. The iOS 27 frame shows the same arrangement.
- **Not used:** Apple's [Calculator App Store listing](https://apps.apple.com/us/app/calculator/id1069511488) still serves iOS 18-era 1242×2208 frames, with the calculator icon at the bottom left and no C key.

### Measurements

All values are in units of the frame's 468 px screen width; CSS `--u` is one unit.

| Item | Value |
| --- | --- |
| Key diameter | 96 |
| Key gap | 9 |
| Side inset | 28–29 |
| Keypad bottom to screen bottom | 81 (home indicator included) |
| Result digit height | 52 (≈74 font size) |
| Expression digit height | ≈21 (≈30 font size) |
| Key digit height | 28–29 (≈40 font size); AC cap 30 |
| Function key fill | `rgb(97 97 97)` |
| Digit key fill | `rgb(54 54 54)` |
| Operator fill | `rgb(255 147 0)` |
| Expression gray | about `rgb(166 166 166)` |

The frame has flat fills with a 1-unit lighter rim at the top of each key; that rim is the only Liquid Glass treatment drawn. The keypad symbols are SVG approximations of SF Symbols. Each was rasterised and its bounding box compared with the frame: ⌫ 40×34, % 36×38 (frame 36×37), ÷ 32×28 (32×29), × 26×26 (26×25), − 32 wide, + 32×32, = 26×14 (27×15), ⁺∕₋ 36×38 (37×37). Digits and AC use the system font: SF Pro on Apple devices, a fallback elsewhere.

### Behaviour

Sourced from Apple's guide:

- ⌫ deletes the last character.
- C clears the number being entered; with no number in progress it becomes AC and clears the expression. Holding ⌫ or C for 500 ms does AC.
- Repeated `=` reapplies the last operation (`1×2=` → 2, 4, 8 …).
- A new number followed by `=` takes the last operation (`100+15%=` gives 115; then `150=` gives 172.5).

Inferred or chosen, not verified on a device:

- The whole expression is typed on the main line and evaluated with operator precedence (`2+3×4` = 14).
- After `=`, the expression moves to the gray line.
- Input stops at 9 digits per number. Results show 9 significant digits, switching to `e` notation at 10⁹ and above or below 10⁻⁸.
- `a ± b%` adds or subtracts b percent of the running total; any other `b%` is b/100.
- A negative operand after an operator is shown in parentheses.
- Division by zero shows `Error`.
- ⌫ after a result clears to 0.
- Pressed keys lighten to `rgb(115)`, `rgb(165)` and `rgb(255 199 135)`, the pre-26 iOS values, then fade back over 0.35 s.
- Long lines shrink to fit the width.
- A hardware keyboard also drives the keypad.

The History and Change Mode toolbar circles were drawn at first and removed the same day at the user's request; the display now runs to the top. Copying the result, history, scientific mode, Math Notes and Convert are outside this clone.

Verification: engine cases were run under Node (Apple's three documented examples, precedence, ÷0, 0.1+0.2, digit limit, e-notation, C/⌫). Glyph boxes were compared statically. Scoped ESLint, typecheck and navigation tests pass. The route has not been viewed in a browser or on a device; font metrics, the safe-area fit and touch feel are unverified.

## /calculator operator column: SNS 사칙연산 (later 2026-10-09)

The right-hand operator keys ÷ × − + are now Instagram's like, comment, repost and share, in Instagram's left-to-right order from top to bottom. The iOS operator glyphs were removed. The arithmetic is unchanged: heart divides, comment multiplies, repost subtracts, share adds. `=` stays. The same glyphs replace the operator characters in the expression and result lines, so what was typed reads back in the same symbols. The change was briefly placed on a separate `/2`; the user had asked for `/1`, so it was moved to `/1` (now `/calculator`) and `/2` was deleted.

**Weight match:** the iOS operator symbols drew a 3-unit stroke. Instagram's paths, copied verbatim from `/default`, use a 2-unit stroke in a 24-unit box, so each key draws them at 36 units, giving 2 × 36⁄24 = 3. Rasterised and compared:

| Key | iOS width × height | iOS stroke | SNS width × height | SNS stroke |
| --- | --- | --- | --- | --- |
| ÷ / like | 32×28 | 3–4 | 34×30 | 3–4 |
| × / comment | 26×26 | 3 | 32×32 | 3 |
| − / repost | 32×2 | 3 | 26×34 | 3 |
| + / share | 32×32 | 3 | 32×30 | 3 |

In the display, glyphs are 0.9em with the same 2⁄24 ratio (0.075em stroke), centred on the digits. Not checked in a browser.

## /1 — a tap or a skate places actions at random

`/1` (2026-10-09) is a blank full-screen field in `/default`'s Instagram dark-mode colours. Each tap places one of the four actions under the finger: like, comment, repost or share, chosen uniformly at random ([`model/actions.ts`](../../../components/mobile/arithmetic/1/model/actions.ts)). Finger skating leaves a trail. While a finger moves, it places another action at its current point every 25 ms, if it has travelled at least 3 px since its last one. The first pass used 90 ms and 6 px; the user asked for a much more continuous trail. A held finger therefore does not pile up actions. Placed actions stay. Glyphs are half of `/default`'s size, `min(9vw, 9vh)`; the first pass matched `/default` and was reduced at the user's request, and stroke and fill follow Instagram's paths: like and repost are filled, comment and share stroked at 2⁄24. The text “화면을 탭하세요” shows until the first tap.

Input follows the finger-network and finger-skating discipline:

- The screen has `touch-action: none`, `overscroll-behavior: none`, and no text selection or callout.
- Touch listeners are non-passive and attached to the document in the capture phase.
- Each touch identifier keeps its own last placement, so simultaneous fingers each place and trail their own.
- `gesturestart` and `gesturechange` are prevented.
- Mouse and pen use pointer events with capture, and only the primary mouse button.
- Canvas resolution follows the device pixel ratio up to 3. A 1.5 cap made the glyphs visibly soft on phones.
- The last 2,000 placements are kept and redrawn on resize.

Checks: scoped ESLint, typecheck and navigation tests pass. The route has not been viewed in a browser or on a device; touch feel is unverified.

## /fractal — edge fractal of each action

`/fractal` (2026-10-09) traces each action with smaller copies of itself. Every edge of the glyph's lines is the glyph again, laid along that edge, and every edge of those is the glyph again. It is a Koch-style edge substitution with the action as the generator. Four glyphs at the bottom switch between like, comment, repost and share; like is the default. Only the finest level is drawn.

- **Generator** ([`model/glyphs.ts`](../../../components/mobile/arithmetic/fractal/model/glyphs.ts)). Each glyph has an anchor span a → b and traces resampled into equal edges of about 0.165 × that span. An edge carries a copy whose a → b lands on it.

| Action | Span a → b | Traces | Edges |
| --- | --- | --- | --- |
| Like | notch → tip | IGDSHeartFilledIcon contour, halved to 24 units | 24 |
| Comment | far rim → tail tip | the glyph path | 17 |
| Repost | one arrowhead → the other | both arrows' centrelines: shafts, 4.27-radius corners, barbs | 7 + 4 + 7 + 4 |
| Share | top-edge midpoint → lower tip | plane outline and fold line | 21 + 3 |

- **Layout** ([`model/edges.ts`](../../../components/mobile/arithmetic/fractal/model/edges.ts)). The root edge is the glyph's own a → b, so the first level stands upright as the glyph. It is fitted to 92% of the area above the options. Whole levels are added while the finest copies keep a span of at least 5 px and the count stays within 30,000.
- **Drawing.** Every finest copy is Instagram's 24-unit glyph, added into one Path2D through a similarity matrix. Like and repost are filled. Comment and share are stroked at 2 glyph units, so the stroke ratio holds. Resolution follows the device pixel ratio up to 3. Nothing animates.

At 390 × 700 this gives two levels of nesting: 576 like, 289 comment, 484 repost and 576 share copies. In one offline render of each, like, comment and share read clearly; repost's barbs cluster more densely.

**Earlier the same day:**

- The first `/fractal` used fractal/logo/1's tip model, with half-size copies at the edge midpoints of each glyph's box, which made a diamond envelope. The user replaced it with this edge construction.
- A first heart-only edge version drew every level's outline (the "trace") and used 7 edges per side, so copies were large relative to their parent. The user rejected it: the traces should not be drawn, and it did not read. That led to drawing only the finest level, using smaller edges, and covering all four actions with navigation.

Checks: scoped ESLint and typecheck pass. The route has not been viewed in a browser.
