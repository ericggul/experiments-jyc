/**
 * Constants and palette carried over from viz1090's View.h and Style.h.
 */

export type Rgb = readonly [number, number, number];

/** Seconds an aircraft stays drawn after its last message (DISPLAY_ACTIVE). */
export const DISPLAY_ACTIVE = 30;
/** viz1090's target frame time; all per-frame easing and label physics run at this rate. */
export const TICK_MS = 1000 / 30;
/** Label physics relaxation passes per tick (View::draw). */
export const LABEL_ITERATIONS = 8;
export const PAD = 5;
export const ROUND_RADIUS = 3;
/** Kilometres per degree of latitude (6371 · π / 180). */
export const LATLONMULT = 111.195;
export const DEFAULT_MAX_DIST_KM = 25;
export const MIN_MAX_DIST_KM = 0.3;
export const MAX_MAX_DIST_KM = 2500;
/** Trails keep at most this many fixes per aircraft. */
export const TRAIL_LIMIT = 2048;

const pink: Rgb = [249, 38, 114];
const purple: Rgb = [85, 0, 255];
const purpleDark: Rgb = [33, 0, 122];
const orange: Rgb = [253, 151, 31];
const greyLight: Rgb = [196, 196, 196];
const grey: Rgb = [127, 127, 127];
const greyDark: Rgb = [64, 64, 64];
const black: Rgb = [0, 0, 0];
const white: Rgb = [255, 255, 255];
const red: Rgb = [255, 0, 0];

export const STYLE = {
  background: black,
  selected: pink,
  plane: [0, 255, 174] as Rgb,
  planeGone: grey,
  trailOld: red,
  trailNew: [255, 200, 0] as Rgb,
  geo: purpleDark,
  airport: purple,
  label: white,
  labelLine: greyDark,
  subLabel: grey,
  labelBackground: black,
  scaleBar: greyLight,
  button: greyLight,
  buttonBackground: black,
  click: grey,
  fps: greyDark,
  warning: red,
  loading: orange,
  black,
} as const;

export const FONT_FAMILY = "viz1090-terminus";
export const FONT_URLS = {
  regular: "/fonts/flight-visualisation/TerminusTTF-4.46.0.ttf",
  bold: "/fonts/flight-visualisation/TerminusTTF-Bold-4.46.0.ttf",
} as const;
export const MAP_DATA_ROOT = "/data/flight-visualisation";
export const FEED_ENDPOINT = "/flight-visualisation/feed";

export type FeedMode = "live" | "sim";

export type FlightVisualisationOptions = {
  /** Receiver position; viz1090's --lat / --lon. */
  lat: number;
  lon: number;
  /** Half the larger screen dimension, in kilometres. */
  maxDist: number;
  metric: boolean;
  fps: boolean;
  /** viz1090's --uiscale; 0 derives it from the viewport. */
  uiScale: number;
  feed: FeedMode;
};

/** Seoul, framed so both Incheon and Gimpo are on screen. */
export const DEFAULT_OPTIONS: FlightVisualisationOptions = {
  lat: 37.52,
  lon: 126.63,
  maxDist: 30,
  metric: false,
  fps: false,
  uiScale: 0,
  feed: "live",
};

const flag = (value: string | null) => value !== null && value !== "0" && value !== "false";

/** Query parameters mirror viz1090's command line: ?lat=&lon=&metric&fps&uiscale=&dist=&feed=sim */
export function readOptions(search: string): FlightVisualisationOptions {
  const params = new URLSearchParams(search);
  const number = (key: string, fallback: number, min: number, max: number) => {
    const value = Number.parseFloat(params.get(key) ?? "");
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  };

  return {
    lat: number("lat", DEFAULT_OPTIONS.lat, -85, 85),
    lon: number("lon", DEFAULT_OPTIONS.lon, -180, 180),
    maxDist: number("dist", DEFAULT_OPTIONS.maxDist, MIN_MAX_DIST_KM, MAX_MAX_DIST_KM),
    metric: flag(params.get("metric")),
    fps: flag(params.get("fps")),
    uiScale: Math.round(number("uiscale", 0, 0, 4)),
    feed: params.get("feed") === "sim" ? "sim" : "live",
  };
}

export const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

export const lerp = (a: number, b: number, factor: number) => {
  const t = clamp(factor, 0, 1);
  return (1 - t) * a + t * b;
};

export function lerpAngle(from: number, to: number, factor: number) {
  let a = from;
  let b = to;
  if (Math.abs(b - a) > 180) {
    if (b > a) a += 360;
    else b += 360;
  }
  const value = a + (b - a) * factor;
  return ((value % 360) + 360) % 360;
}

export function lerpColor(a: Rgb, b: Rgb, factor: number): Rgb {
  const t = clamp(factor, 0, 1);
  return [
    (1 - t) * a[0] + t * b[0],
    (1 - t) * a[1] + t * b[1],
    (1 - t) * a[2] + t * b[2],
  ];
}

export const rgba = (color: Rgb, alpha = 1) =>
  `rgba(${color[0] | 0},${color[1] | 0},${color[2] | 0},${clamp(alpha, 0, 1).toFixed(3)})`;
