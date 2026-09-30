/**
 * Live receiver. Polls the feed route for aggregated ADS-B state and turns each
 * snapshot back into a stream of per-aircraft messages: every row carries how long
 * ago its last position and last message arrived, so each is replayed at its own
 * moment after a fixed delay. Aircraft therefore update one by one, as they do on a
 * dump1090 connection, rather than all at once on every poll.
 */

import type { FeedAircraftRow, FeedSnapshot } from "../../feed/types";
import { FEED_ENDPOINT } from "../config";
import type { ReceiverMessage } from "../model/aircraft";
import { signalFromRssi, type Receiver, type ReceiverState } from "./types";

const POLL_MS = 2000;
const EARLY_POLL_MS = 600;
/**
 * Playback delay; must exceed the interval between fresh upstream snapshots, which
 * stretches when the aggregator rate-limits, so it follows the observed interval.
 */
const MIN_REPLAY_DELAY_MS = 3200;
const MAX_REPLAY_DELAY_MS = 14000;
const FAILURES_BEFORE_DISCONNECT = 3;
const OFFSET_SAMPLES = 24;
const MIN_EVENT_GAP_MS = 50;

export class LiveReceiver implements Receiver {
  readonly state: ReceiverState = { connected: false, source: "adsb.lol" };

  private queue: ReceiverMessage[] = [];
  private head = 0;
  private lastPosition = new Map<string, number>();
  private lastSeen = new Map<string, number>();
  private offsets: number[] = [];
  private lastSnapshotAt = 0;
  private snapshotInterval = POLL_MS;
  private area: { lat: number; lon: number; radius: number } | null = null;
  private polled: { lat: number; lon: number; radius: number } | null = null;
  private lastPollAt = -Infinity;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: AbortController | null = null;
  private failures = 0;
  private active = true;
  private disposed = false;

  setArea(lat: number, lon: number, radius: number) {
    this.area = { lat, lon, radius };
    if (!this.polled) {
      this.schedule(0);
      return;
    }
    // Zooming out or panning far should not wait for the next regular poll.
    const moved = Math.hypot(lat - this.polled.lat, (lon - this.polled.lon) * Math.cos((lat * Math.PI) / 180)) * 60;
    if (radius > this.polled.radius * 1.4 || moved > this.polled.radius * 0.35) {
      this.schedule(Math.max(0, this.lastPollAt + EARLY_POLL_MS - performance.now()));
    }
  }

  setActive(active: boolean) {
    this.active = active;
    if (active) this.schedule(0);
    else this.clearTimer();
  }

  drain(now: number, out: ReceiverMessage[]) {
    const queue = this.queue;
    while (this.head < queue.length && queue[this.head].time <= now) out.push(queue[this.head++]);
    if (this.head > 1024) {
      this.queue = queue.slice(this.head);
      this.head = 0;
    }
  }

  dispose() {
    this.disposed = true;
    this.clearTimer();
    this.inFlight?.abort();
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(delay: number) {
    if (this.disposed || !this.active || this.inFlight) return;
    this.clearTimer();
    this.timer = setTimeout(() => void this.poll(), delay);
  }

  private async poll() {
    this.timer = null;
    const area = this.area;
    if (!area || this.disposed || !this.active) return;

    const controller = new AbortController();
    this.inFlight = controller;
    this.lastPollAt = performance.now();
    this.polled = area;
    const params = new URLSearchParams({
      lat: area.lat.toFixed(3),
      lon: area.lon.toFixed(3),
      radius: String(Math.round(area.radius)),
    });

    try {
      const response = await fetch(`${FEED_ENDPOINT}?${params}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(String(response.status));
      const snapshot = (await response.json()) as FeedSnapshot;
      this.ingest(snapshot, performance.now());
      this.failures = 0;
      this.state.connected = true;
      this.state.source = snapshot.source;
    } catch {
      if (controller.signal.aborted && this.disposed) return;
      this.failures++;
      if (this.failures >= FAILURES_BEFORE_DISCONNECT) this.state.connected = false;
    } finally {
      this.inFlight = null;
    }

    const backoff = this.failures ? Math.min(15000, POLL_MS * 2 ** (this.failures - 1)) : POLL_MS;
    this.schedule(Math.max(0, this.lastPollAt + backoff - performance.now()));
  }

  private ingest(snapshot: FeedSnapshot, receivedAt: number) {
    // Map upstream time onto performance.now(); the minimum over recent samples is the
    // least-delayed estimate and keeps replay monotonic when the upstream cache ages.
    if (snapshot.now > this.lastSnapshotAt) {
      if (this.lastSnapshotAt) {
        this.snapshotInterval += 0.3 * (Math.min(20000, snapshot.now - this.lastSnapshotAt) - this.snapshotInterval);
      }
      this.lastSnapshotAt = snapshot.now;
      this.offsets.push(receivedAt - snapshot.now);
      if (this.offsets.length > OFFSET_SAMPLES) this.offsets.shift();
    }
    const delay = Math.min(MAX_REPLAY_DELAY_MS, Math.max(MIN_REPLAY_DELAY_MS, this.snapshotInterval + 1200));
    const offset = Math.min(...this.offsets) + delay;

    const pending = this.queue.slice(this.head);
    for (const row of snapshot.aircraft) this.enqueue(row, snapshot.now, offset, pending);
    pending.sort((a, b) => a.time - b.time);
    if (this.lastSeen.size > 4000) this.forgetOld(snapshot.now);
    this.queue = pending;
    this.head = 0;
  }

  private enqueue(row: FeedAircraftRow, now: number, offset: number, out: ReceiverMessage[]) {
    const [addr, flight, lat, lon, altitude, speed, track, verticalRate, seen, seenPosition, messages, rssi] = row;
    const positionAt = now - seenPosition * 1000;
    const seenAt = now - seen * 1000;
    const base = { addr, flight, altitude, speed, track, verticalRate, messages, signal: signalFromRssi(rssi) };

    if (positionAt > (this.lastPosition.get(addr) ?? -Infinity) + MIN_EVENT_GAP_MS) {
      this.lastPosition.set(addr, positionAt);
      out.push({ ...base, time: positionAt + offset, lat, lon });
    }
    const lastSeen = this.lastSeen.get(addr) ?? -Infinity;
    if (seenAt > lastSeen + MIN_EVENT_GAP_MS && seenAt > positionAt + MIN_EVENT_GAP_MS) {
      out.push({ ...base, time: seenAt + offset });
    }
    this.lastSeen.set(addr, Math.max(lastSeen, seenAt, positionAt));
  }

  private forgetOld(now: number) {
    for (const [key, value] of this.lastSeen) {
      if (value < now - 600000) {
        this.lastSeen.delete(key);
        this.lastPosition.delete(key);
      }
    }
  }
}
