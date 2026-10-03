import type { Minute, Weekday } from "./types.ts";

export const MINUTES_PER_DAY = 1440;

export const timeConfig = {
  /** Simulated minutes per real second: 10 → one hour every 6 s, one day in 2.4 min. */
  minutesPerSecond: 10,
  /** The field re-renders when the clock crosses this many simulated minutes. */
  tickMinutes: 1,
  startMinute: 6 * 60,
  startDay: 0,
  /**
   * Screen transitions and the still hold after them, in simulated minutes:
   * at 10 min/s a 3.6-minute transition plays in 360 ms, at 30 min/s in 120 ms.
   */
  transitionMinutes: 3.6,
  holdMinutes: 4,
  /** iOS snooze length in simulated minutes. */
  snoozeMinutes: 9,
  /**
   * Each phone redraws at most once per this many simulated minutes, on a
   * beat staggered by seat, so only a fraction of the field renders per tick.
   */
  phoneRefreshMinutes: 3,
  /**
   * Shortest interval, in simulated minutes, between discrete content changes
   * inside one screen (next clip, next story frame, next speaker). At the
   * default speed one beat is 0.8 s, long enough to read each change.
   */
  beatMinutes: 8,
  /** How long a banner stays over an active screen, in simulated minutes. */
  bannerMinutes: 6,
  /** How long a push lights a dark screen into its lock screen. */
  wakeLightMinutes: 4,
} as const;

/** The minute a phone in seat `index` currently shows (staggered refresh). */
export function phoneMinute(minute: number, index: number, refresh: number = timeConfig.phoneRefreshMinutes): number {
  if (refresh <= 1) return Math.floor(minute);
  const offset = index % refresh;
  const shown = Math.floor((minute - offset) / refresh) * refresh + offset;
  return shown < 0 ? 0 : shown;
}

/** Real milliseconds a span of simulated minutes takes at a given speed. */
export const simToMs = (minutes: number, minutesPerSecond: number) => (minutes / Math.max(0.001, minutesPerSecond)) * 1000;

/** Absolute simulated time: day index plus minute of that day. */
export type SimTime = { day: number; minute: number };

export function advance(time: SimTime, deltaMs: number, minutesPerSecond: number): SimTime {
  const total = time.minute + (deltaMs / 1000) * minutesPerSecond;
  const days = Math.floor(total / MINUTES_PER_DAY);
  return { day: time.day + days, minute: total - days * MINUTES_PER_DAY };
}

export const weekdayOf = (day: number): Weekday => (((day % 5) + 5) % 5) as Weekday;

export const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export const weekdayShort = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

/** iOS status-bar style: "9:41". */
export function formatClock(minute: Minute): string {
  const m = Math.floor(((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY);
  const hours = Math.floor(m / 60) % 12 || 12;
  return `${hours}:${String(m % 60).padStart(2, "0")}`;
}

/** "7:30 AM". */
export function formatTime(minute: Minute): string {
  const m = Math.floor(((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY);
  return `${formatClock(m)} ${m < 720 ? "AM" : "PM"}`;
}

/** 24-hour "07:30" for authoring controls. */
export function format24(minute: Minute): string {
  const m = Math.floor(((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Relative notification age as iOS prints it: "now", "9m ago", "2h ago". */
export function formatAge(minutes: number): string {
  if (minutes < 1) return "now";
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

/** Day 0 is Monday 5 October 2026; weekends are skipped. */
export function formatDate(day: number): string {
  const week = Math.floor(day / 5);
  const date = new Date(Date.UTC(2026, 9, 5 + week * 7 + weekdayOf(day)));
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}
