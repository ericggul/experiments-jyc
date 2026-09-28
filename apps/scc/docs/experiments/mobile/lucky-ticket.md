# 행운의 복권

`/mobile/lucky-ticket/1`–`/3` start on a black intro with “행운의 복권” and a circular arrow button. The experiment covers one final presentation with an opaque black canvas. Scratching makes only the touched paths transparent, gradually revealing both the text and the bottom “공유하기” controls. The canvas stays in place; there is no screen transition, timer gate, or automatic full reveal. The same cover-free presentation is available immediately at `/lucky-ticket/<version>?final=true` and `/mobile/lucky-ticket/<version>?final=true` for visual preview.

`/1` displays “한심하게 XX초 동안 이거 긁고 있을 바에는 차라리 현생을 열심히 살겠다 ㅉㅉ” in one complete line fitted to the screen width. Seconds count from the first scratch and update without clearing existing strokes. The preview displays `0초`. `/2` displays “또 속았냐? 언제까지 너 실력대로 안 살고 행운에만 빌 거야? 뭐? 행운의 복권? 누가 너한테 공짜로 뭐 줄 수 있을 것 같아? 공짜 점심은 없어, 이 바보야. 한심하게 1분 동안 이거 긁을 바에는 차라리 현생을 열심히 살겠다. ㅉㅉ”. Text is centered in the area between 100px top and bottom margins.

`/3` retains `/1`'s sentence, seconds counter, cover, and sharing behavior. Its twelve words use `/1`'s single-line letter size, keep their reading order from top to bottom, and vary their horizontal positions across the viewport. The positions stay fixed as the seconds change. The preview shows the uncovered arrangement at `0초`.

The scratch width is 0.7 CSS pixels. Touch identifiers remain separate for simultaneous fingers; mouse and pen use pointer capture. The “손가락을 이용해서 긁어보세요” instruction appears in white until first contact. A revealed share icon can be tapped through the scratched cover. The Kakao icon opens the OS share sheet until this experiment has a Kakao template; the link icon copies the version's entry URL.

Static checks cover code and route wiring. Physical touch feel and elapsed reveal time remain unverified without an authorized device check.
