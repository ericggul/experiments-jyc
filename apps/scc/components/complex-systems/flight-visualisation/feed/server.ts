/**
 * Server half of the receiver. viz1090 reads Beast frames from a local dump1090 over
 * TCP; a browser cannot open that socket, so this module asks public ADS-B aggregators
 * for the same decoded state and normalises it into `FeedSnapshot` rows.
 *
 * adsb.lol (readsb JSON, ODbL) is primary. OpenSky's anonymous REST API is a slower,
 * rate-limited fallback. Responses are shared between viewers for a short time so
 * several open screens cost the upstream one request.
 */

import {
  FEED_MAX_RADIUS_NM,
  FEED_MIN_RADIUS_NM,
  type FeedAircraftRow,
  type FeedQuery,
  type FeedSnapshot,
} from "./types";

const USER_AGENT = "scc-flight-visualisation (viz1090 browser port)";
const PRIMARY_MIN_INTERVAL_MS = 1500;
const PRIMARY_MAX_INTERVAL_MS = 12000;
const PRIMARY_WAIT_MS = 4000;
const STALE_LIMIT_MS = 30000;
const OPENSKY_TTL_MS = 10000;
const REQUEST_TIMEOUT_MS = 6000;

type CacheEntry = { expires: number; promise: Promise<FeedSnapshot> };

const cache = new Map<string, CacheEntry>();

const finite = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function parseFeedQuery(params: URLSearchParams): FeedQuery | null {
  const lat = Number.parseFloat(params.get("lat") ?? "");
  const lon = Number.parseFloat(params.get("lon") ?? "");
  const radius = Number.parseFloat(params.get("radius") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radius)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  // Quantise so nearby viewers share cache entries.
  return {
    lat: Math.round(lat * 20) / 20,
    lon: Math.round(lon * 20) / 20,
    radius: Math.min(
      FEED_MAX_RADIUS_NM,
      Math.max(FEED_MIN_RADIUS_NM, Math.ceil(radius / 5) * 5),
    ),
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
}

type ReadsbAircraft = {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  true_heading?: number;
  baro_rate?: number;
  geom_rate?: number;
  seen?: number;
  seen_pos?: number;
  messages?: number;
  rssi?: number;
};

async function fetchAdsbLol(query: FeedQuery): Promise<FeedSnapshot> {
  const data = (await fetchJson(
    `https://api.adsb.lol/v2/lat/${query.lat}/lon/${query.lon}/dist/${query.radius}`,
  )) as { now?: number; ac?: ReadsbAircraft[] };

  const aircraft: FeedAircraftRow[] = [];
  for (const entry of data.ac ?? []) {
    if (!entry.hex || typeof entry.lat !== "number" || typeof entry.lon !== "number") continue;
    aircraft.push([
      entry.hex.replace(/^~/, ""),
      (entry.flight ?? "").trim(),
      entry.lat,
      entry.lon,
      entry.alt_baro === "ground" ? 0 : Math.round(finite(entry.alt_baro)),
      Math.round(finite(entry.gs)),
      finite(entry.track, finite(entry.true_heading)),
      Math.round(finite(entry.baro_rate, finite(entry.geom_rate))),
      finite(entry.seen),
      finite(entry.seen_pos, finite(entry.seen)),
      Math.round(finite(entry.messages, -1)),
      finite(entry.rssi, 1),
    ]);
  }

  return { source: "adsb.lol", now: finite(data.now, Date.now()), aircraft };
}

type OpenSkyState = [
  string, string | null, string, number | null, number, number | null, number | null,
  number | null, boolean, number | null, number | null, number | null, ...unknown[],
];

async function fetchOpenSky(query: FeedQuery): Promise<FeedSnapshot> {
  const latSpan = (query.radius * 1.852) / 111.195;
  const lonSpan = latSpan / Math.max(0.05, Math.cos((query.lat * Math.PI) / 180));
  const bounds = new URLSearchParams({
    lamin: String(query.lat - latSpan),
    lamax: String(query.lat + latSpan),
    lomin: String(query.lon - lonSpan),
    lomax: String(query.lon + lonSpan),
  });
  const data = (await fetchJson(
    `https://opensky-network.org/api/states/all?${bounds}`,
  )) as { time?: number; states?: OpenSkyState[] | null };

  const now = finite(data.time, Date.now() / 1000);
  const aircraft: FeedAircraftRow[] = [];
  for (const state of data.states ?? []) {
    const [hex, callsign, , timePosition, lastContact, lon, lat, altitude, onGround, velocity, track, verticalRate] = state;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    aircraft.push([
      hex,
      (callsign ?? "").trim(),
      lat,
      lon,
      onGround ? 0 : Math.round(finite(altitude) * 3.28084),
      Math.round(finite(velocity) * 1.943844),
      finite(track),
      Math.round(finite(verticalRate) * 196.85),
      Math.max(0, now - lastContact),
      Math.max(0, now - finite(timePosition, lastContact)),
      -1,
      1,
    ]);
  }

  return { source: "opensky", now: now * 1000, aircraft };
}

function cached(key: string, ttl: number, load: () => Promise<FeedSnapshot>) {
  const time = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > time) return hit.promise;

  const promise = load();
  cache.set(key, { expires: time + ttl, promise });
  promise.catch(() => cache.delete(key));

  if (cache.size > 256) {
    for (const [entryKey, entry] of cache) if (entry.expires <= time) cache.delete(entryKey);
  }
  return promise;
}

/** Last good adsb.lol snapshot per area, served while the upstream is rate limiting. */
const lastGood = new Map<string, { at: number; snapshot: FeedSnapshot }>();
const primaryInFlight = new Map<string, Promise<FeedSnapshot>>();
/**
 * adsb.lol applies a dynamic per-IP limit shared by every viewer behind this server,
 * so the spacing between upstream requests adapts: it widens on each 429/failure and
 * relaxes slowly after successes.
 */
let primaryInterval = PRIMARY_MIN_INTERVAL_MS;
let nextPrimaryAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function requestPrimary(query: FeedQuery, key: string) {
  const pending = primaryInFlight.get(key);
  if (pending) return pending;
  nextPrimaryAt = Date.now() + primaryInterval;
  const promise = fetchAdsbLol(query)
    .then((snapshot) => {
      lastGood.set(key, { at: Date.now(), snapshot });
      primaryInterval = Math.max(PRIMARY_MIN_INTERVAL_MS, primaryInterval * 0.9);
      if (lastGood.size > 256) {
        for (const [entryKey, entry] of lastGood) if (Date.now() - entry.at > STALE_LIMIT_MS) lastGood.delete(entryKey);
      }
      return snapshot;
    })
    .catch((error: unknown) => {
      primaryInterval = Math.min(PRIMARY_MAX_INTERVAL_MS, primaryInterval * 1.6);
      nextPrimaryAt = Date.now() + primaryInterval;
      throw error;
    })
    .finally(() => primaryInFlight.delete(key));
  primaryInFlight.set(key, promise);
  return promise;
}

export async function getFeedSnapshot(query: FeedQuery): Promise<FeedSnapshot> {
  const key = `${query.lat},${query.lon},${query.radius}`;
  const good = lastGood.get(key);
  const age = good ? Date.now() - good.at : Infinity;
  if (good && age < primaryInterval) return good.snapshot;

  // A new area waits briefly for its turn rather than dropping to OpenSky.
  const wait = nextPrimaryAt - Date.now();
  if (wait > 0 && !good && wait < PRIMARY_WAIT_MS) await sleep(wait);

  if (Date.now() >= nextPrimaryAt || primaryInFlight.has(key)) {
    try {
      return await requestPrimary(query, key);
    } catch {
      // fall through to stale data or OpenSky
    }
  }

  // Stale adsb.lol data beats OpenSky's ten-second resolution; the browser drops
  // positions it has already replayed.
  const stale = lastGood.get(key);
  if (stale && Date.now() - stale.at < STALE_LIMIT_MS) return stale.snapshot;

  return cached(`opensky:${key}`, OPENSKY_TTL_MS, () => fetchOpenSky(query));
}
