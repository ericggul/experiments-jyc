# xyzt city

Experimental. `/dimensions/xyzt-city/1`, created 2026-10-03. Runtime rendering
is **unverified**: no browser check has been authorized yet.

## 1 — height as the sweep, time as an axis

**Tested relation.** City-growth visualisations usually draw (x, y, z) and sweep a
year threshold T ([Urban Layers](https://www.6sqft.com/new-mapping-tool-urban-layers-tracks-the-age-of-every-building-in-manhattan/),
[Thomas Rhiel's Brooklyn building ages](https://flowingdata.com/2013/09/04/age-of-city-buildings/)).
Here, each Lower Manhattan building is a space-time prism: its footprint extruded
between construction year `t0` and demolition year `t1`, with the present on
the ground and the past stacked up world +Y (changed on 2026-10-03 at the
user's direction; the first draft ran time upward from the earliest year).
Buildings that replaced each other on one lot stack along t, with predecessors
above. Height is removed from the
geometry and becomes the swept threshold Z.

- `≤ Z` (default) admits buildings no taller than Z, so the city "becomes" as Z
  rises. Atlas fabric arrives at 9, 11 and 14 m, and the Twin Towers prisms
  (1973–2001) at about 415 m, just before One WTC (429.3 m roof).
- `≥ Z` keeps only buildings that reach Z: a horizontal section through time.

**Precedent.** Building lifespans as space-time prisms already exist in
[space-time cube cartography](https://www.mdpi.com/2220-9964/7/6/209) (Hägerstrand's cube;
[ICA overview](https://icaci.org/files/documents/ICC_proceedings/ICC2003/Papers/255.pdf)).
The closest Manhattan work is
[Manhattan Timeformations](https://old.skyscraper.org/WEB_PROJECTS/MANHATTAN_TIMEFORMATIONS/mt_intro.htm)
(Brian McGrath with Mark Watkins, 2000), a layered map history plus an "exploded time line" of
office development; its exact axis layout was not confirmed. No precedent was
found for sweeping height as the threshold over a real-data xyt cube. That
search was not exhaustive.

**Invariants.**
- The first frame is static: the whole city, `≤ Z`, Z at maximum.
- The threshold is set by GPU uniforms only; moving it never rebuilds geometry.
- DPR 1.0; the autonomous sweep is capped at 24 Hz and lasts 36 s; reduced
  motion disables it.
- 3 draw calls (faces, edges, time axis) plus 7 DOM year labels.
- The slider is cubic (`heightAtControl`) because most fabric sits under 40 m.

**Encoding of uncertainty (no legends).**
- An end of kind `bound` (censored) fades out over 40 % of the prism with an
  ordered Bayer screen door.
- A heaped `t0` (1900/1910/1920/1925/1930, `fuzzy`) fades its bottom to 45 %.
- The 1991 tick is drawn like every other tick. It is where NYC's demolition
  records begin.

## Data ledger

The bake lives in `components/dimensions/xyzt-city/1/source/`. Its output is
`public/data/xyzt-city/lower-manhattan.json` (about 1.7 MB). The bbox is lat
40.6995–40.7165, lon −74.0200 to −73.9980, clipped by footprint centroid.
Coordinates are local equirectangular metres around (40.708, −74.010), x east,
y north.

| Origin | Source | Prisms | Notes |
| --- | --- | --- | --- |
| current | [NYC Building Footprints](https://data.cityofnewyork.us/d/5zhs-2jue) | 1,014 | `height_roof` excludes spires; NYC heaps years on 1920/1925/1930 citywide |
| historic | [NYC Building Historic](https://data.cityofnewyork.us/d/ipkp-snf6) | 63 | demolition years only cover 1991–2026; 55 dropped for missing height; contains no 2001 WTC records |
| atlas1854 | [Building footprints to 42nd St, 1854](https://geodiscovery.uwm.edu/catalog/sde-columbia-cul_nyc_nypl_1854_buildings) (Columbia/NYPL, Perris atlas), via Columbia GeoServer WFS | 7,435 | see below |
| corrections | Wikipedia, URL per record in `corrections.mjs` | 4 (t0 only) | NYC years for rebuilt WTC towers were site/start dates: One WTC 2009→2014, 3 WTC 2009→2018, 4 WTC 2009→2013, 7 WTC 2003→2006. Other ≥ 200 m records left unverified, and 8 Spruce St is missing (no year) |
| manual | Wikipedia, URL per record in `manual-towers.mjs` | 9 | Singer, City Investing, Gillender, World, Manhattan Life, Western Union, Tower Building, WTC 1 and 2 |

- **Atlas georeference.** The layer declares EPSG:2263, but its coordinates sit
  in an offset grid rotated about 4.6°. The pipeline fits them against the 73
  surviving pre-1855 footprints: mean error about 5 m, with 56 of 73 within 6 m.
  The constants are `ATLAS_FIT` in `geometry.mjs`.
- **Atlas heights.** All are estimated from material: frame 9 m, brick/stone
  14 m, unknown 11 m.
- **Atlas lifespans.** `t0` is a bound of 1854. `t1` is the earliest successor's
  `t0`, also as a bound. 91 atlas records duplicated a surviving building and were
  dropped. 3,240 atlas records (about 44 %) have no recorded successor and stand
  only 1854–1855 with both ends censored. They read as a thin 1854 slab, not as
  observed one-year lifespans.
- **Manual footprints.** These are approximate rectangles. Manhattan Life,
  Western Union and Tower Building lot sizes are estimates, and the Twin Tower
  centres are approximate. 7 WTC (1987–2001), Hudson Terminal and the Produce
  Exchange are left out because they were not verified.

Regenerate from `apps/scc/components/dimensions/xyzt-city/1`:

```sh
node source/build-lower-manhattan.mjs --cache <dir>
node --test source/source.test.mjs model/threshold.test.ts
```

## Unresolved

- Height history. Footprints record only final height, so later additions are
  lost; DOB alteration permits could restore some of it.
- Demolitions from 1855 to 1990 outside the manual towers. Lots whose successor
  was never recorded leave gaps in t.
- Whether the 1854 slab reads as evidence or as noise once the piece is seen. It
  might need its own option.
- Pre-1854: the Castello Plan (1660) and Welikia terrain.
