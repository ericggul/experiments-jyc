/**
 * Wire format shared by the feed route and the browser receiver.
 *
 * One row carries what dump1090 decodes for viz1090's `struct aircraft`: address,
 * flight, position, altitude, speed, track, vertical rate, message count and
 * signal level, plus the ages that let the browser replay each message at the
 * moment it was actually received.
 */

export type FeedSource = "adsb.lol" | "opensky";

export type FeedAircraftRow = [
  hex: string,
  flight: string,
  lat: number,
  lon: number,
  /** Barometric altitude in feet; 0 on the ground. */
  altitude: number,
  /** Ground speed in knots. */
  speed: number,
  /** Degrees clockwise from true north. */
  track: number,
  /** Feet per minute. */
  verticalRate: number,
  /** Seconds since any message from this aircraft. */
  seen: number,
  /** Seconds since the last position message. */
  seenPosition: number,
  /** Running message total, or -1 when the source does not report it. */
  messages: number,
  /** dBFS, or 1 when the source does not report it. */
  rssi: number,
];

export type FeedSnapshot = {
  source: FeedSource;
  /** Upstream clock at the moment the snapshot was taken (ms since epoch). */
  now: number;
  aircraft: FeedAircraftRow[];
};

export type FeedQuery = {
  lat: number;
  lon: number;
  /** Radius in nautical miles. */
  radius: number;
};

export const FEED_MAX_RADIUS_NM = 250;
export const FEED_MIN_RADIUS_NM = 5;
