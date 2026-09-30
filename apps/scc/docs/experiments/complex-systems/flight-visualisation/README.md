# Flight visualisation experiment

Route: `/flight-visualisation/1`, owned by the filesystem-only
`complex-systems` group. Date: 2026-09-30. Status: experimental;
browser-observed 2026-09-30 (see Checks).

A browser port of Nathan Matsuda's
[viz1090](https://github.com/nmatsuda/viz1090) (C++/SDL2, a dump1090 front end
for a handheld ADS-B receiver). Reference commit read: `master` as cloned on
2026-09-30.

## Interface premise

1. **Participant situation:** one person watches the aircraft a receiver would
   hear around a chosen location, on a dark administrative map.
2. **Primary parameter:** each aircraft's position, track and message freshness.
3. **Perceptual job:** follow aircraft as they appear, glide between reported fixes and fade out as their messages stop, while labels rearrange themselves to stay legible.
4. **Interaction job:** drag to pan, zoom with wheel, pinch or `-`/`=`, tap an
   aircraft to select and follow it, tap twice to zoom 4× on a point or the
   selected aircraft, arrow keys pan, `Escape` releases the selection.
5. **Wrapper justification:** viz1090's grammar is kept as found: status boxes,
   scale bars, neon-on-black palette and Terminus type are the reference's
   operational interface, not added chrome.

## Query parameters

viz1090's command line becomes the URL: `?lat=&lon=` (receiver position, default
37.52 N 126.63 E, framing Incheon and Gimpo), `dist=` (half the larger screen
dimension in km, default 30; viz1090's is 25), `metric`, `fps`, `uiscale=` (1–4; default derived
from viewport), `feed=sim` (offline synthetic traffic).

## Source ledger

| viz1090 | Port |
| --- | --- |
| `View.h`/`Style.h` constants, palette | `1/config.ts` |
| `pxFromLonLat`, `screenCoords`, `moveCenter*`, `animateCenterAbsolute`, `moveMapToTarget`, `zoomMapToTarget` | `1/view/camera.ts` |
| `Aircraft`, `AircraftList::update`, `AppData::updateStatus` | `1/model/aircraft.ts` |
| `AircraftLabel` forces, 15-sample buffer, density levels | `1/model/aircraft-label.ts` |
| `drawPlanes`, `drawPlaneIcon`, `drawPlaneOffMap`, `AircraftLabel::draw` | `1/view/draw-aircraft.ts` |
| `drawTrails` | `1/view/draw-trails.ts` |
| `drawStatus*`, `drawScaleBars`, `drawClick` | `1/view/draw-hud.ts` |
| `drawGeography` texture cache, `Map` quadtree, `loading map N%` | `1/map/geography-layer.ts`, `1/map/tiles.ts` |
| `mapconverter.py`, `getmap.sh` | `scripts/build-flight-visualisation-map.mjs` |
| `Input::getInput` | `1/input/controls.ts` |
| `AppData` dump1090 TCP/Beast connection | `feed/server.ts` + `1/transport/live-receiver.ts` |

Retained exactly: DISPLAY_ACTIVE 30 s lifecycle (500 ms acquisition dots, 500 ms
glide and ping on each fix, grey fade, countdown arc after 15 s, shrinking ring),
trail colouring, label force constants and eight passes per ~30 ms frame,
4× double-tap zoom, 0.1 easing, 30 px selection radius, bracket spring.

## Deliberate deviations

- **Transport.** Browsers cannot open dump1090's socket. `feed/route` proxies
  adsb.lol's readsb JSON (primary) or OpenSky (fallback; 10 s cache). adsb.lol
  rate-limits per IP (observed 429s even at 2–3 s spacing while another viewer
  polled), so upstream spacing adapts from 1.5 s up to 12 s (×1.6 on failure,
  ×0.9 on success) and the last good adsb.lol snapshot is served for up to 30 s
  before OpenSky is used. Each row's `seen`/`seen_pos` ages are replayed through
  a jitter buffer whose delay follows the observed snapshot interval
  (3.2–14 s), so aircraft update individually, as on a receiver, not per poll.
  The query area follows the view; aircraft stale for 60 s are removed.
- **Labels follow camera moves.** viz1090 shifts labels only on drag; here every
  camera change (zoom, follow, double tap) carries each label with its anchor.
  Without this, a 4× zoom left leader lines up to 529 px long for seconds.
- **Timing.** Rendering runs at display rate; per-frame dynamics run on a fixed
  30 Hz tick with label interpolation, so behaviour is refresh-rate independent.
- **Map.** Natural Earth 10m admin-1 and admin-0 lines plus coastline replace
  admin-1 polygon boundaries (same appearance, no doubled edges); OurAirports
  runway thresholds/widths replace the US-only FAA runway polygons. Data is baked
  into Int16 tiles (4° at 0.0008° tolerance; 20° at 0.012° beyond 0.3 km/px)
  inside 161 pack files, 5.1 MB total, fetched only for the visible area. Place
  names start at viz1090's 100k population floor and rise with zoom.
- **Bugs fixed rather than copied:** drag/unproject inverses now agree (the
  original mixed a 0.95 factor), latitude shows N/S, scale bars convert miles,
  speed reads `kt` (dump1090 reports knots), the single-aircraft 0/0 density
  NaN, selected labels stay visible, flightless aircraft show their ICAO hex.
- **Additions:** a `feed` status box names the data source (attribution for
  adsb.lol's ODbL data and honesty in `sim` mode); keyboard pan/deselect; label
  neighbour search uses bucket grids instead of the O(n²) list walk.

## Checks (2026-09-30)

Static only (no server started): `pnpm typecheck`, scoped ESLint, the
navigation registry test for this key, and a scratch harness: projection
round trip error ≈1e-11 px; Seoul pack decodes all 24 tiles and consumes every
byte; 60 labels in a 5 km cluster relax with no NaN or overlaps; label
relaxation ≈0.5 ms/tick at 100 aircraft, ≈2 ms at 300, ≈6–10 ms at 600 fully
visible labels (Node, after warm-up); `feed/server` normalised 33 live adsb.lol
rows near Seoul.

Browser session 2026-09-30 (Chrome, dev server, user-authorised). The
automation tab reported `visibilityState: hidden`, so rAF did not run; frames
were driven from the page via a MessageChannel loop and gestures by synthetic
pointer/wheel/key events. Observed: map, runways, names and status row render;
~3–5 position fixes/s arrive staggered per aircraft on adsb.lol; trails,
acquisition dots, glides and grey fading appear; tap selects (pink brackets)
and the camera follows; drag keeps the grabbed point under the pointer
(0.01 px); wheel ×1.27 per 100 px, `=` ×0.667, double tap eases to 0.25×; at
600 km the coarse tiles load, map re-render 0.4 ms, frame median 0.1 ms. Found
and fixed: permanent OpenSky fallback after the first 429, labels stranded
after zoom, `setPointerCapture` throwing for pointers without capture.

## Unresolved

- Browser frame cost of dense geography at wide zoom and of many trails is
  unmeasured.
- adsb.lol's limit is dynamic and shared per server IP; a public deployment with
  many viewers will see longer snapshot intervals (coarser motion). OpenSky's
  anonymous quota (≈400 requests/day) makes it an emergency fallback only.
- Real-rAF frame timing on a visible tab was not measured in this session.

## Regenerating map data

User-operated (downloads ≈95 MB of source data):

```sh
# into <dir>: Natural Earth GeoJSON from github.com/nvkelso/natural-earth-vector/geojson
#   ne_10m_admin_1_states_provinces_lines, ne_10m_admin_0_boundary_lines_land,
#   ne_10m_coastline, ne_10m_populated_places_simple, ne_10m_airports
# and runways.csv from davidmegginson.github.io/ourairports-data
node apps/scc/scripts/build-flight-visualisation-map.mjs <dir>
```

Licences: Natural Earth and OurAirports are public domain; adsb.lol data is
ODbL; Terminus TTF (`public/fonts/flight-visualisation/`) is SIL OFL 1.1;
viz1090 is BSD-2-Clause-style (Matsuda, Robb, Sanfilippo).
