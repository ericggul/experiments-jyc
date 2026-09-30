import type { ReceiverMessage } from "../model/aircraft";

export type ReceiverState = {
  connected: boolean;
  /** Data source shown in the status row, e.g. "adsb.lol", "opensky" or "sim". */
  source: string;
};

/**
 * The browser's stand-in for viz1090's dump1090 connection. A receiver produces
 * timestamped messages; the engine drains those that are due every frame.
 */
export interface Receiver {
  readonly state: ReceiverState;
  /** Area of interest: the view centre and a radius in nautical miles. */
  setArea(lat: number, lon: number, radiusNm: number): void;
  /** Appends every message due at or before `now` (performance.now()) to `out`. */
  drain(now: number, out: ReceiverMessage[]): void;
  setActive(active: boolean): void;
  dispose(): void;
}

/** rssi dBFS → linear amplitude, the quantity viz1090 averages for "sAvg". */
export const signalFromRssi = (rssi: number) => (rssi > 0 ? -1 : Math.min(1, 10 ** (rssi / 20)));
