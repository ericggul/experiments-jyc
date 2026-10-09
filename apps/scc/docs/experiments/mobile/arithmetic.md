# 사칙연산 — /mobile/arithmetic

2026-10-09. The four Instagram post actions — like, comment, repost, share — read as the 사칙연산 of SNS (see the [clone/11 glyph correction](../sns/mobile/11.md#사칙연산-glyph-correction--2026-10-03)).

## /default — the four glyphs

`/default` is the baseline. It was created at `/1` on 2026-10-09 and moved to `/default` the same day, freeing `/1` for the calculator. It shows the four glyphs large, in one horizontal row, on a full-viewport page in Instagram's web dark-mode colours: icons `rgb(248 249 249)` on `rgb(12 16 20)`. The first version used pure white on black. Each glyph is `min(18vw, 18vh)` square with a `6vmin` gap. Path data is copied verbatim from clone/11's IGDS glyphs into [`glyphs.ts`](../../../components/mobile/arithmetic/default/glyphs.ts) so the archived clone is not coupled to this experiment. There is no interaction yet; the next instruction defines it.

On 2026-10-09, the glyphs were checked again against a fresh fetch of Instagram's web bundles: 4,040 `static.cdninstagram.com` scripts from the same five logged-out pages that clone/11 used. All four `d` strings and the share fold line are character-identical to the live `IGDSHeartPanoOutlineIcon`, `IGDSCommentPanoOutlineIcon`, `IGDSResharePanoOutlineIcon` and `IGDSDirectPrismOutline24Icon` modules. Paint attributes are also identical. The base fills with `currentColor`; comment and share use a 2-unit round-joined stroke with no fill; the fold line has a round cap. The extra `strokeLinecap="round"` on the SVG root has no effect here, because heart and repost have no stroke and the comment and share paths are closed. Scaling the 24-unit viewBox keeps the stroke-to-glyph ratio.

The same fetch supplied the colours. Instagram web dark mode sets `--ig-primary-text` to `248, 249, 249` and `--ig-primary-background` to `12, 16, 20`. Glyph identity is with the web IGDS assets; clone/11 measured the 2026 iOS promotional frames against them at IoU 0.91–0.95.

Static checks only; not viewed on a device.

## /1 — iOS 27 Calculator clone

`/1` is a working clone of the iOS basic Calculator, the starting surface for a 사칙연산 calculator. Files are the pure engine [`model/calculator.ts`](../../../components/mobile/arithmetic/1/model/calculator.ts), the screen [`screen/`](../../../components/mobile/arithmetic/1/screen/index.tsx), and the symbols [`glyphs.tsx`](../../../components/mobile/arithmetic/1/screen/glyphs.tsx).

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
