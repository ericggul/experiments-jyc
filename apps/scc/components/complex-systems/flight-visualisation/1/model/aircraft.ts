/**
 * Aircraft and AircraftList from viz1090, fed by timed receiver messages instead of
 * dump1090's linked list. Times are performance.now() milliseconds at which the
 * message is replayed locally.
 */

import { DISPLAY_ACTIVE, TRAIL_LIMIT } from "../config";
import type { AircraftLabel } from "./aircraft-label";

export type ReceiverMessage = {
  addr: string;
  time: number;
  flight: string;
  altitude: number;
  speed: number;
  track: number;
  verticalRate: number;
  /** Present for position messages. */
  lat?: number;
  lon?: number;
  /** Running message total from the source, or -1. */
  messages: number;
  /** Linear signal level 0–1, or -1 when the source has none. */
  signal: number;
};

export class Aircraft {
  readonly addr: string;
  flight = "";
  altitude = 0;
  speed = 0;
  track = 0;
  verticalRate = 0;
  lat = 0;
  lon = 0;
  hasPosition = false;

  /** Local time of the last message of any kind (msSeen). */
  seen = 0;
  /** Local time of the last position (msSeenLatLon). */
  seenLatLon = 0;
  /** Local time the first position arrived. */
  created = 0;
  messageRate = 0;
  messages = -1;
  signal = -1;

  lonHistory: number[] = [];
  latHistory: number[] = [];
  headingHistory: number[] = [];

  /** Screen position used for labels and hit-testing, written each frame. */
  x = 0;
  y = 0;
  /** Projected position (before any off-screen clamping) and the camera it used. */
  projectedX = 0;
  projectedY = 0;
  projectedCamera = -1;
  /** True while the aircraft is drawn with a label this frame. */
  drawn = false;
  label: AircraftLabel | null = null;

  constructor(addr: string) {
    this.addr = addr;
  }

  get lastLon() {
    return this.lonHistory.length > 1 ? this.lonHistory[this.lonHistory.length - 2] : this.lon;
  }

  get lastLat() {
    return this.latHistory.length > 1 ? this.latHistory[this.latHistory.length - 2] : this.lat;
  }

  get lastHeading() {
    return this.headingHistory.length > 1 ? this.headingHistory[this.headingHistory.length - 2] : this.track;
  }

  get callsign() {
    return this.flight || this.addr.toUpperCase();
  }
}

export type ReceiverStatus = {
  visible: number;
  total: number;
  messageRate: number;
  /** Mean linear signal (0–1), or -1 when no aircraft reports one. */
  signal: number;
};

export class AircraftList {
  private byAddr = new Map<string, Aircraft>();
  /** Stable iteration order: newest first, as viz1090 prepends to its list. */
  list: Aircraft[] = [];

  find(addr: string) {
    return this.byAddr.get(addr);
  }

  /** AircraftList::update for one message; `now` is when it is shown. */
  apply(message: ReceiverMessage, now: number) {
    let p = this.byAddr.get(message.addr);
    if (!p) {
      p = new Aircraft(message.addr);
      this.byAddr.set(message.addr, p);
      this.list.unshift(p);
    }

    const isPosition = message.lat !== undefined && message.lon !== undefined;
    if (isPosition ? message.time <= p.seenLatLon : message.time <= p.seen) return;

    const interval = p.seen && message.time > p.seen ? (message.time - p.seen) / 1000 : 0;
    if (message.messages >= 0 && p.messages >= 0 && interval > 0) {
      const rate = Math.max(0, message.messages - p.messages) / interval;
      p.messageRate = p.messageRate ? p.messageRate + 0.3 * (rate - p.messageRate) : rate;
    } else if (interval > 0) {
      p.messageRate = 1 / interval;
    }
    if (message.messages >= 0) p.messages = message.messages;
    if (message.signal >= 0) p.signal = message.signal;

    p.seen = Math.max(p.seen, message.time);
    if (message.flight) p.flight = message.flight;

    if (message.lat === undefined || message.lon === undefined) return;

    p.seenLatLon = message.time;
    p.altitude = message.altitude;
    p.speed = message.speed;
    p.track = message.track;
    p.verticalRate = message.verticalRate;

    if (!p.hasPosition) {
      p.created = now;
      p.hasPosition = true;
    }
    if (p.lat === message.lat && p.lon === message.lon) return;

    p.lat = message.lat;
    p.lon = message.lon;
    p.lonHistory.push(p.lon);
    p.latHistory.push(p.lat);
    p.headingHistory.push(p.track);
    if (p.lonHistory.length > TRAIL_LIMIT) {
      const excess = p.lonHistory.length - TRAIL_LIMIT;
      p.lonHistory.splice(0, excess);
      p.latHistory.splice(0, excess);
      p.headingHistory.splice(0, excess);
    }
  }

  /** Drops aircraft once their trail has faded fully to black (2 × DISPLAY_ACTIVE). */
  prune(now: number, onRemove: (aircraft: Aircraft) => void) {
    const cutoff = now - 2 * DISPLAY_ACTIVE * 1000;
    let removed = false;
    for (const p of this.list) {
      if (p.seen < cutoff) {
        this.byAddr.delete(p.addr);
        onRemove(p);
        removed = true;
      }
    }
    if (removed) this.list = this.list.filter((p) => this.byAddr.has(p.addr));
  }

  status(now: number): ReceiverStatus {
    let visible = 0;
    let total = 0;
    let messageRate = 0;
    let signal = 0;
    let signalCount = 0;
    const active = now - DISPLAY_ACTIVE * 1000;
    for (const p of this.list) {
      if (p.seen < active) continue;
      total++;
      if (p.hasPosition) visible++;
      messageRate += p.messageRate;
      if (p.signal >= 0) {
        signal += p.signal;
        signalCount++;
      }
    }
    return { visible, total, messageRate, signal: signalCount ? signal / signalCount : -1 };
  }
}
