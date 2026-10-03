import type { AppId } from "./catalogue.ts";

/** Minutes since 00:00 of the simulated day, 0 ≤ minute < 1440. */
export type Minute = number;

/** 0 = Monday … 4 = Friday. Weekends are not modelled yet. */
export type Weekday = 0 | 1 | 2 | 3 | 4;

export type ArchetypeId =
  | "early-analyst"
  | "snoozer-creative"
  | "office-commuter"
  | "suburban-parent"
  | "remote-late"
  | "social-manager"
  | "client-sales"
  | "gig-courier"
  | "early-shift"
  | "grad-student"
  | "new-parent"
  | "founder";

/** The person a phone belongs to. Clones may read it for names and places. */
export type Owner = {
  id: string;
  archetype: ArchetypeId;
  firstName: string;
  lastName: string;
  /** Home neighbourhood, e.g. "Bushwick". */
  home: string;
  /** Work place or area, e.g. "Midtown"; "Home" for remote work. */
  work: string;
  /** Usual weekday alarm, or null for people who wake without one. */
  alarm: Minute | null;
  /** Stable per-person seed for content that should not change day to day. */
  seed: number;
};

/**
 * What the screen shows for a span of the day. `app: "off"` is a dark screen
 * (pocket, desk, asleep). `view` is one of the catalogue's views for `app`.
 * `seed` is stable for the scene so clones derive repeatable content from it.
 */
export type Scene = {
  id: string;
  start: Minute;
  end: Minute;
  app: AppId | "off";
  view: string;
  seed: number;
};

export type Push = {
  id: string;
  at: Minute;
  app: AppId;
  title: string;
  body: string;
  /** Optional secondary line, e.g. a group-chat sender or thread name. */
  subtitle?: string;
  /** Same id on every phone for a simultaneous global event. */
  globalId?: string;
};

export type DayPlan = {
  ownerId: string;
  day: number;
  weekday: Weekday;
  /** Contiguous, sorted, covering [0, 1440). */
  scenes: readonly Scene[];
  /** Sorted by `at`. */
  pushes: readonly Push[];
  /** Minute the person actually got up (after any snoozes). */
  wake: Minute;
  /** Minute the screen goes dark for the night (may be < wake if after midnight). */
  sleep: Minute;
};

/** Props every clone screen receives. Screens are pure: no timers, no randomness. */
export type ScreenProps = {
  view: string;
  seed: number;
  /** Whole simulated minutes since the scene started. */
  elapsed: number;
  /** Scene length in simulated minutes. */
  duration: number;
  /** Current simulated minute of day. */
  clock: Minute;
  /** Absolute simulated day (0 = Monday 5 October 2026). */
  day: number;
  weekday: Weekday;
  owner: Owner;
  /** Undismissed notifications, newest first (lock screens show these). */
  pushes: readonly Push[];
};
