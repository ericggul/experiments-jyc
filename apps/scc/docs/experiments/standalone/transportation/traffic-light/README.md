# Traffic light

`/transportation/traffic-light/1`, 2026-10-06: Korean vehicle signal heads
on one galvanised cantilever pole (신호등주). No intersection, road markings
or pedestrian signals. The question is whether one ordinary street object,
modelled at real scale with real materials, holds attention on its own.

[`/2`](2.md) repeats this pole fifty times down a straight road.

`transportation/` is a standalone grouping for later traffic objects; each
object keeps its own family (`transportation/<object>/<n>`).

## Model

In metres. Heads use 300 mm lamps at 0.36 m pitch in a 0.40 m-wide,
0.22 m-deep powder-coated housing with a separate front door, rear door and
hinges; short (0.16 m) cut-cylinder visors open over the lower 40 %; domed,
near-neutral lenses over LED boards. The arrow board is drawn as on Korean
heads: an open chevron of four emitter rows and, after a short gap, a
three-row shaft, filling most of the lens; lens glow is masked to the lit
emitters. Three-colour
heads read red–amber–green; four-colour heads red–amber–left arrow–green, left
to right, or top to bottom when vertical.

The pole stands on the right, 6.1 m on a base plate with gussets,
double-nutted anchor bolts and a concrete footing, with a street-facing
hand-hole cover. The level arm, at 5.2 m, bolts to a welded bracket through two
flange plates. Arm heads hang centred on it, so their bottom edge is at 5.0 m.
The arm ends 0.07 m past the outermost head's outer clamp band; no arm runs on
beyond the heads. No signal cable is drawn.

| Heads | Positions from flange | Arm (3색 / 4색 outer) |
| --- | --- | --- |
| 1 | 5.3 | 5.70 / 5.88 m |
| 2 | 4.2, 6.6 | 7.00 / 7.18 m |
| 3 | 4.2, 6.6, 9.0 | 9.40 / 9.58 m |

Arm and shaft diameters grow linearly with arm length from 164→108 mm and
230→170 mm at 6.4 m (`poleSections`).

## Options

Bottom right, after `mobile/finger-network`'s grammar: one `옵션`/`닫기`
toggle with rows of plain-text choices above it. Rows are a list in
`index.tsx`; another parameter is another row.

- `신호등` 1–3개: heads on the arm at 2.4 m centres.
- `좌회전`: every head on the arm, and the pole head, becomes four-colour; all
  heads for one approach repeat the same indication.
- `뒷면 신호등`: one head, always one, clamped back to back with the outermost
  arm head and facing the opposing approach.
- `기둥 신호등`: a vertical auxiliary head (차량 보조등) on two band clamps in
  front of the pole, facing this approach. It is the same head at two-thirds
  scale, i.e. 200 mm lamps, with its bottom at 2.5 m, the manual's minimum for
  side-pole vertical heads.
- `신호 주기`: timing plan, below.

Each plan starts this approach at the onset of red; lamps switch instantly as
LEDs do; amber is a fixed 3 s. Green is straight-and-left together (직좌
동시신호): a four-colour head lights green with the arrow.

| Plan | Red | Green (+arrow) | Amber | Cycle | Opposing approach |
| --- | --- | --- | --- | --- | --- |
| 적색 10초 (default) | 10 s | 8 s | 3 s | 21 s | same phase |
| 2현시 90초 | 47 s | 40 s | 3 s | 90 s | same phase |
| 4현시 160초 | 122 s | 35 s | 3 s | 160 s | next phase, 40 s earlier |

The default compresses a two-phase junction: red 10 s = all-red 1 s +
cross-street green 5 s + cross amber 3 s + all-red 1 s.

## Rendering

Draws only on signal change, orbit, option change or resize; the sun shadow is
recomputed once per rebuild. A gradient sky is both background and PMREM
environment; one shadowed sun. Unreal bloom on a half-float MSAA target with
neutral tone mapping; per-colour LED intensities balance luminance.

Draw calls do not grow with head count (`rendering/structure.ts`). Pole, arm
and fasteners merge into one mesh per material, and every clamp bracket into
one more. Each housing kind and orientation is one instanced mesh, holding
body, doors, hinges, visors and gaskets merged. Each lamp colour has one
instanced board mesh and one instanced lens mesh. A per-instance `lampOn`
attribute scales emissive, so front and back heads light independently
without material swaps. A headless build measured 11 draw calls for one head
and 15 for three heads with left turn, back and pole heads; a signal change
rewrites only the `lampOn` attributes. The per-lamp point lights for visor
spill were removed: their count, and shader cost, grew with every lamp.

## Sources

Spacing (≥ 2.4 m between side-by-side heads), the 4.5–5 m bottom-edge height,
and the ±20° placement cone are the National Police Agency's
[교통신호기 설치·관리 매뉴얼](https://www.police.go.kr/user/bbs/BD_selectBbs.do?q_bbsCode=1001&q_bbscttSn=20230117161850418),
as summarised in [Korea Science](https://koreascience.kr/article/JAKO200645178570299.pdf).
Lamp order, one to three heads per arm and vertical heads being auxiliary or
right-turn only: [나무위키, 신호등/대한민국](https://namu.wiki/w/%EC%8B%A0%ED%98%B8%EB%93%B1/%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD).
Vertical auxiliary heads (차량 보조등, 종형 삼색·사색) beside the road:
[도로교통법 시행규칙 별표 3](https://www.law.go.kr/flDownload.do?flSeq=129330173).
Side-pole vertical heads with their bottom 2.5–3.5 m above the pavement:
[매뉴얼 03 신호기 설치장소 및 운영](http://cyeng.iptime.org/xe/board_jjc/86117),
seen only as a search summary. No source for auxiliary lens size was found;
200 mm is an assumption.
The 2.4 m was read as centre-to-centre; an edge-clearance reading gives
3.5 m centres, which looked too long.

## Failures

Browser-checked 2026-10-06 against photos of installed Korean four-colour
heads (Google Images: 한국 4색 신호등 좌회전; 좌회전 화살표 신호등 LED):

- 2° arm rise with level heads, from an oblique low camera, read as a tilted
  lamp row. The arm is now level and the opening view square to it.
- 3.2–3.5 m head spacing on 9.2–11.8 m arms looked unrealistically long;
  replaced by 2.4 m centres.
- The first pole head, a full-size 300 mm head standing 0.2 m off the pole,
  read as too large and too high; replaced by the 200 mm head tight to the
  pole.
- The first bottom-right toggle (faint grey text, then a dark panel) was hard
  to read or off-grammar; replaced by the finger-network option grammar.

- The first arrow was a filled triangle head on a short bar, small in the lens,
  and the lens glowed as a full green disc around it, so the arrow vanished.
  Replaced by the stroke-drawn chevron and masked lens glow.
- Only the outermost head was four-colour with a left turn; every head now is.
- Tinted off lenses read maroon, brown and dark green; long visors cut lit
  lamps into crescents from below; glossy lenses bloomed the sun into white
  "lit" lamps. Lenses are now near-neutral and softer, visors shorter.

Observed in the browser (macOS Chrome, 2026-10-06): left-turn heads, arrow
and pole head render and switch with the plan; no console errors. The pavement
reads dark brown, and is unaddressed.
