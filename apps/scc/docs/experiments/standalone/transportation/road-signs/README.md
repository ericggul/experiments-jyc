# Road signs

`/transportation/road-signs/archive`, 2026-10-06: the reference archive of
every currently valid Korean traffic safety sign (안전표지), laid out in its
official order: 주의표지 100s, 규제표지 200s, 지시표지 300s, 보조표지 400s and
노면표시 500s. Each sign shows its number and official name. It is the
trusted source material, not an experiment. Numbered variants (`/1`, `/2`, …)
are kept for experiments that use these signs as material; they should read
the SVGs and `model/catalogue.ts` from here rather than copy them.

Child family: `/direction/…` experiments with the 305–307 arrow's heading.
[`/direction/1`](direction/1.md) turns it through the full circle toward the
pointer. [`/direction/2`](direction/2.md) makes it a fractal of signs: straight,
left and right each open into smaller straight, left and right signs. [`/direction/3`](direction/3.md) keeps one
sign whose single connected arrow branches straight, left and right without
end. [`/direction/4`](direction/4.md) fills the screen with signs whose arrows
are finger-skated, also listed at `/mobile/finger-skating/road-sign/1`.

Source of truth: 도로교통법 시행규칙 [별표 6] 「안전표지의 종류, 만드는 방식 및
설치·관리기준」 (개정 2024. 11. 14.), in the version in force from 2026-08-24, downloaded from
[국가법령정보센터](https://www.law.go.kr/법령/도로교통법시행규칙). Its drawings
are monochrome rasters with dimension lines, so they set the list, the names
and the geometry but cannot be shown as they are.

The set has 212 entries: 42 caution, 29 regulatory, 43 instruction,
31 supplementary and 67 road markings. Deleted numbers are left out: 131, 208,
209, 215, 229, 426, 429 and 509. Sub-numbers such as 110의2 are separate
entries. Several sub-numbers that secondary lists miss are current: 320의3,
320의4, 331의2, 536의5 and 545의2.

[`sources.json`](sources.json) records the source of each sign and every
remaining deviation:

- **Commons (124):** files from Wikimedia Commons'
  [KR road sign](https://commons.wikimedia.org/wiki/Category:SVG_road_signs_in_South_Korea)
  series, which are public domain (Korean government works). Each was checked
  against the 별표 6 drawing, not against Wikipedia's gallery picks. 303 and
  321 use the plain files, not the "(newer)" ones.
- **Drawn (88):** drawn for this route from the 별표 6 dimensions (mm viewBox,
  outlined lettering). These cover:
  - every 400s plate (the Commons set is the 2010 version with an empty plate);
  - every 501–524 marking;
  - 525–549 markings that are missing or outdated on Commons;
  - 206의2, 320의2–4, 321의2 and 335.

Colours are normalised to one palette across sources: red #d21d24, blue
#1e50a3, yellow #f9a70c and road-marking pavement #a7a5a6. Commons road
marks lose their black outlines, because painted markings have none.

Lettering. 안전표지 have no prescribed typeface. 별표 6 Ⅰ.1.마 says only
that letterforms follow its examples, and the electronic law text sets those
examples in ordinary Hancom fonts. The 『도로안내표지 디자인매뉴얼』 typeface
covers guide signs, not safety signs. The Commons KR series' heavy square
gothic (진입금지, 주정차금지) and narrow round numerals (224, 225) are
therefore the reference, and every sign is lettered to match it:

- **Sign faces and plates:** Gothic A1 ExtraBold for Hangul, with Barlow
  Condensed Bold for numerals and Latin letters. Both are OFL, merged into one
  outline source.
- **Commons signs:** the lettering of 37 Commons signs (106, 116, 117, 140,
  201–228, 301–334) was replaced glyph by glyph in its original cells. The
  original layout is kept, for example the raised t and the smaller .5 in 220.
  A glyph wider than its cell is condensed, as on the signs.
- **Latin words:** SLOW, STOP, YIELD and DANGER and the P of 319 and 320 keep
  their Commons lettering.
- **Road markings:** painted letters have even strokes, so they use Do Hyeon,
  stretched to each drawn letter box, with the same numerals. A bold face
  stretched 2–3× thickens its horizontals, so it reads wrong on the road.
  The Commons road letters of 519, 521 and 540–542 already have that even
  painted stroke and are kept.

The earlier 2026-10-06 pass mixed Commons lettering with Noto Sans CJK Bold.
Its thin 비보호 (329), Helvetica-like 5.5t (220) and italic 10% (116, 117)
read as foreign to the set. That pass is the failure the current lettering
replaces.

**207:** the 별표 6 drawing is schematic, showing a tractor over a tiller with
a trailer. The Commons figure, a hand cart over a tiller, is kept instead,
because it is taken to match the signs installed on roads. The traced
official version was not kept.

Weakest entries are recorded in `sources.json`:

- 525의3: its colours are approximate, because 별표 6 gives no values.
- 516의4: an oblique view of the kerb, not to scale.
- 524: hatch layout approximated.
- 335 and 321의2: colours inferred from the 일반기준, because the drawings are
  line art.
- 400s: the 5 mm border line width is assumed.

Grid: identical square cells for the signs and taller cells for the road
markings. Images are fitted to their cells, so relative physical size is not
preserved. Road markings are metres long and plates are 600 mm wide, so true
scale would make most signs illegible.

Checked on 2026-10-06 over HTTPS on the local server at desktop width, before
the relettering: all 212 images loaded and there was no horizontal overflow.
The relettered set was checked by rasterising every SVG with resvg. Phone
width has not been browser-checked. Scoped lint, TypeScript and the
navigation test pass.
