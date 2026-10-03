/**
 * The twelve weekday archetypes. This file is the place to tailor the field by
 * hand: every tunable of a person's day lives in the table below, not in the
 * planner. Times are minutes since 00:00 (write them with `hm(7, 30)`); a
 * bedtime after midnight is written past 24:00, e.g. `hm(24, 30)`.
 *
 * Weighted lists (`[value, weight]`) are drawn per person or per day. When the
 * `sameness` control is 1, every draw collapses to one archetype-wide choice,
 * every spread (`sd`) to zero and every event probability to zero.
 */
import type { AppId, AppView } from "./catalogue.ts";
import type { ArchetypeId, Minute } from "./types.ts";

/** "app/view", checked against the catalogue at compile time. */
export type ViewRef = { [A in AppId]: `${A}/${AppView<A>}` }[AppId];
export type Weighted<T> = readonly (readonly [T, number])[];

export type CommuteMode = "subway" | "bus" | "car" | "ride-hail" | "bike" | "walk" | "none";
/** desk: office pickups and meetings · courier: job queue · shift: phone in a locker · leave: parental leave at home. */
export type WorkStyle = "desk" | "courier" | "shift" | "leave";
export type LunchStyle = "delivery" | "desk" | "counter" | "feed" | "reservation" | "skip" | "street" | "break";
export type EveningActivity =
  | "grocery" | "school" | "baby" | "takeout" | "messages" | "streaming" | "shopping"
  | "bank" | "earnings" | "social" | "news" | "inbox";

export type Persona = {
  id: ArchetypeId;
  label: string;
  /** Share of the population (relative weight). */
  weight: number;
  /** Usual alarm; null wakes without one (`rise`). */
  alarm: Minute | null;
  /** Person-to-person spread of the usual alarm, minutes. */
  alarmSd: number;
  /** Get-up time for people without an alarm, and its day-to-day spread. */
  rise?: { at: Minute; sd: number };
  /** Snoozes per morning: typical count, day-to-day spread, ceiling. */
  snooze: { typical: number; sd: number; max: number };
  /** Night wakes (new parent): baby monitor, log a feed, scroll, back to sleep. */
  nightWakes: readonly Minute[];
  /** Minutes from getting up to leaving the house (or opening the laptop). */
  morning: { minutes: number; sd: number };
  /** Minutes spent in bed on the phone after the alarm, and what is open. */
  inBed: { minutes: readonly [number, number]; views: Weighted<ViewRef> };
  /** Share of people who run, chance of a run on a given day, run length. */
  run: { share: number; dayChance: number; minutes: number };
  commute: { modes: Weighted<CommuteMode>; minutes: number; sd: number };
  work: {
    style: WorkStyle;
    hours: number;
    /** Day-to-day spread of the end of work, minutes. */
    sd: number;
    /** What a work pickup opens. */
    surfaces: Weighted<ViewRef>;
    /** Meetings per day, inclusive range (feeds per day for parental leave). */
    meetings: readonly [number, number];
    /** Phone pickups per hour between meetings (Poisson), and their length. */
    pickupsPerHour: number;
    pickupMinutes: readonly [number, number];
    /** Share of pickups that are feeds or messages instead of work. */
    distraction: number;
  };
  lunch: { at: Minute; sd: number; minutes: number; styles: Weighted<LunchStyle> };
  evening: Weighted<EveningActivity>;
  /** Feeds for breaks, commutes and the night scroll. */
  feeds: Weighted<ViewRef>;
  /** Getting into bed (alarm set, then the night scroll). */
  bed: { at: Minute; sd: number };
  /** Night-scroll minutes before the screen goes dark. */
  doomscroll: { minutes: number; sd: number };
  /** Weekday rules (not scaled by sameness): Friday bedtime shift, Friday drinks. */
  friday: { later: number; drinks: boolean };
  /** Push-rate multiplier relative to the median person. */
  pushRate: number;
  /** Day events, probability per day (scaled toward zero by sameness). */
  events: { delay: number; lateMeeting: number; sickKid: number; lowBattery: number };
  places: { home: readonly string[]; work: readonly string[] };
};

export const hm = (hours: number, minutes = 0): Minute => hours * 60 + minutes;

/** How the sameness control (0…1) scales variation. Tune here. */
export const variation = {
  /** Multiplier on every sd. */
  sigma: (sameness: number) => 1 - sameness,
  /** Multiplier on every event probability; gentler than linear so 0.6 still drifts. */
  probability: (sameness: number) => Math.sqrt(1 - sameness),
};

/** Base pushes per awake hour for a median person at notification rate 1×. */
export const basePushesPerHour = 2.2;

const BROOKLYN = ["Bushwick", "Williamsburg", "Greenpoint", "Bed-Stuy", "Crown Heights", "Park Slope", "Prospect Heights", "Clinton Hill", "Flatbush", "Sunset Park", "Ridgewood"];
const QUEENS = ["Astoria", "Long Island City", "Sunnyside", "Jackson Heights", "Forest Hills", "Woodside", "Flushing"];
const MANHATTAN = ["Harlem", "Washington Heights", "Inwood", "East Village", "Lower East Side", "Upper West Side", "Upper East Side", "Murray Hill", "Hell's Kitchen", "Chelsea"];
const BRONX = ["Mott Haven", "Riverdale", "Fordham", "Kingsbridge", "Parkchester"];
const SUBURBS = ["Yonkers", "New Rochelle", "Scarsdale", "Montclair", "Great Neck", "Tottenville", "Bay Ridge", "Maplewood", "Port Washington"];
const OFFICES = ["Midtown", "Flatiron", "Hudson Yards", "Financial District", "Union Square", "Chelsea", "SoHo", "Downtown Brooklyn", "DUMBO", "Long Island City"];

export const personas: Record<ArchetypeId, Persona> = {
  "early-analyst": {
    id: "early-analyst", label: "Early-bird analyst", weight: 8,
    alarm: hm(5, 40), alarmSd: 8, snooze: { typical: 0, sd: 0.3, max: 1 }, nightWakes: [],
    morning: { minutes: 70, sd: 8 },
    inBed: { minutes: [3, 8], views: [["news/front", 3], ["mail/inbox", 3], ["weather/today", 2], ["photo-feed/feed", 1]] },
    run: { share: 0.6, dayChance: 0.55, minutes: 38 },
    commute: { modes: [["subway", 1]], minutes: 35, sd: 6 },
    work: {
      style: "desk", hours: 9.25, sd: 15,
      surfaces: [["mail/inbox", 4], ["mail/message", 3], ["calendar/day", 2], ["mail/compose", 1], ["team-chat/channels", 1]],
      meetings: [1, 2], pickupsPerHour: 3, pickupMinutes: [2, 6], distraction: 0.2,
    },
    lunch: { at: hm(12, 15), sd: 10, minutes: 25, styles: [["desk", 3], ["delivery", 1]] },
    evening: [["grocery", 2], ["messages", 2], ["news", 2], ["streaming", 1]],
    feeds: [["news/article", 3], ["photo-feed/feed", 2], ["shopping/browse", 1]],
    bed: { at: hm(21, 55), sd: 10 }, doomscroll: { minutes: 15, sd: 5 },
    friday: { later: 45, drinks: false },
    pushRate: 0.8,
    events: { delay: 0.15, lateMeeting: 0.1, sickKid: 0, lowBattery: 0 },
    places: { home: [...BROOKLYN.slice(0, 7), ...MANHATTAN.slice(4, 8)], work: ["Financial District", "Midtown", "Hudson Yards"] },
  },
  "snoozer-creative": {
    id: "snoozer-creative", label: "Snoozer creative", weight: 10,
    alarm: hm(7, 30), alarmSd: 10, snooze: { typical: 2.4, sd: 0.7, max: 3 }, nightWakes: [],
    morning: { minutes: 42, sd: 8 },
    inBed: { minutes: [8, 15], views: [["photo-feed/feed", 4], ["short-video/feed", 3], ["messages/list", 2]] },
    run: { share: 0, dayChance: 0, minutes: 0 },
    commute: { modes: [["subway", 4], ["bus", 1]], minutes: 40, sd: 8 },
    work: {
      style: "desk", hours: 8, sd: 20,
      surfaces: [["team-chat/channels", 4], ["team-chat/thread", 3], ["team-chat/huddle", 1], ["mail/inbox", 1]],
      meetings: [1, 2], pickupsPerHour: 5, pickupMinutes: [3, 9], distraction: 0.45,
    },
    lunch: { at: hm(13, 0), sd: 20, minutes: 35, styles: [["feed", 3], ["counter", 2], ["delivery", 1]] },
    evening: [["streaming", 3], ["messages", 3], ["takeout", 2], ["shopping", 2], ["social", 1]],
    feeds: [["short-video/feed", 4], ["photo-feed/feed", 3], ["photo-feed/story", 2], ["short-video/comments", 1], ["shopping/product", 1]],
    bed: { at: hm(23, 45), sd: 20 }, doomscroll: { minutes: 75, sd: 20 },
    friday: { later: 75, drinks: true },
    pushRate: 1.3,
    events: { delay: 0.2, lateMeeting: 0.05, sickKid: 0, lowBattery: 0.35 },
    places: { home: [...BROOKLYN, "Ridgewood"], work: ["SoHo", "DUMBO", "Chelsea", "Flatiron"] },
  },
  "office-commuter": {
    id: "office-commuter", label: "Median office commuter", weight: 18,
    alarm: hm(6, 55), alarmSd: 15, snooze: { typical: 0.4, sd: 0.5, max: 1 }, nightWakes: [],
    morning: { minutes: 58, sd: 8 },
    inBed: { minutes: [4, 10], views: [["photo-feed/feed", 3], ["news/front", 2], ["weather/today", 2], ["messages/list", 2]] },
    run: { share: 0.15, dayChance: 0.4, minutes: 30 },
    commute: { modes: [["subway", 3], ["bus", 1]], minutes: 40, sd: 10 },
    work: {
      style: "desk", hours: 8.75, sd: 15,
      surfaces: [["team-chat/channels", 4], ["team-chat/thread", 3], ["mail/inbox", 3], ["mail/message", 2], ["calendar/day", 1]],
      meetings: [2, 3], pickupsPerHour: 4, pickupMinutes: [2, 7], distraction: 0.35,
    },
    lunch: { at: hm(12, 30), sd: 15, minutes: 40, styles: [["feed", 3], ["counter", 3], ["delivery", 2]] },
    evening: [["streaming", 3], ["messages", 3], ["grocery", 2], ["takeout", 2], ["shopping", 1]],
    feeds: [["photo-feed/feed", 3], ["short-video/feed", 3], ["news/front", 1], ["shopping/browse", 1]],
    bed: { at: hm(23, 0), sd: 20 }, doomscroll: { minutes: 40, sd: 12 },
    friday: { later: 60, drinks: true },
    pushRate: 1,
    events: { delay: 0.18, lateMeeting: 0.15, sickKid: 0, lowBattery: 0.1 },
    places: { home: [...BROOKLYN, ...QUEENS, ...MANHATTAN.slice(0, 3), ...BRONX.slice(0, 3)], work: OFFICES },
  },
  "suburban-parent": {
    id: "suburban-parent", label: "Suburban parent driver", weight: 10,
    alarm: hm(6, 10), alarmSd: 8, snooze: { typical: 0, sd: 0.2, max: 1 }, nightWakes: [],
    morning: { minutes: 55, sd: 6 },
    inBed: { minutes: [2, 5], views: [["weather/today", 3], ["mail/inbox", 3], ["school/updates", 2]] },
    run: { share: 0.1, dayChance: 0.3, minutes: 30 },
    commute: { modes: [["car", 1]], minutes: 50, sd: 10 },
    work: {
      style: "desk", hours: 8.5, sd: 10,
      surfaces: [["mail/inbox", 4], ["mail/message", 3], ["calendar/day", 2], ["meeting/speaker", 1]],
      meetings: [1, 3], pickupsPerHour: 3, pickupMinutes: [2, 5], distraction: 0.25,
    },
    lunch: { at: hm(12, 15), sd: 10, minutes: 25, styles: [["desk", 3], ["counter", 1]] },
    evening: [["school", 3], ["grocery", 3], ["messages", 2], ["takeout", 1], ["streaming", 1]],
    feeds: [["photo-feed/feed", 3], ["shopping/browse", 2], ["news/article", 2]],
    bed: { at: hm(22, 35), sd: 10 }, doomscroll: { minutes: 25, sd: 8 },
    friday: { later: 30, drinks: false },
    pushRate: 1.1,
    events: { delay: 0.15, lateMeeting: 0.1, sickKid: 0.12, lowBattery: 0 },
    places: { home: SUBURBS, work: ["Midtown", "Financial District", "Hudson Yards", "Long Island City"] },
  },
  "remote-late": {
    id: "remote-late", label: "Remote late riser", weight: 8,
    alarm: hm(9, 30), alarmSd: 20, snooze: { typical: 1.2, sd: 0.6, max: 2 }, nightWakes: [],
    morning: { minutes: 15, sd: 5 },
    inBed: { minutes: [8, 15], views: [["short-video/feed", 3], ["photo-feed/feed", 2], ["team-chat/channels", 2]] },
    run: { share: 0.1, dayChance: 0.3, minutes: 30 },
    commute: { modes: [["none", 1]], minutes: 0, sd: 0 },
    work: {
      style: "desk", hours: 8, sd: 25,
      surfaces: [["team-chat/channels", 3], ["team-chat/thread", 2], ["team-chat/huddle", 1], ["mail/inbox", 1]],
      meetings: [3, 4], pickupsPerHour: 5, pickupMinutes: [3, 8], distraction: 0.5,
    },
    lunch: { at: hm(13, 15), sd: 20, minutes: 30, styles: [["delivery", 3], ["feed", 1]] },
    evening: [["streaming", 3], ["takeout", 2], ["shopping", 2], ["messages", 2]],
    feeds: [["short-video/feed", 3], ["photo-feed/feed", 2], ["shopping/browse", 2], ["news/front", 1]],
    bed: { at: hm(24, 15), sd: 25 }, doomscroll: { minutes: 50, sd: 15 },
    friday: { later: 45, drinks: false },
    pushRate: 1.1,
    events: { delay: 0, lateMeeting: 0.1, sickKid: 0, lowBattery: 0.15 },
    places: { home: [...BROOKLYN, ...QUEENS, ...MANHATTAN], work: ["Home"] },
  },
  "social-manager": {
    id: "social-manager", label: "Social media manager", weight: 6,
    alarm: hm(7, 10), alarmSd: 12, snooze: { typical: 1, sd: 0.4, max: 2 }, nightWakes: [],
    morning: { minutes: 52, sd: 8 },
    inBed: { minutes: [8, 14], views: [["social-manager/analytics", 3], ["photo-feed/feed", 3], ["social-manager/comments", 2]] },
    run: { share: 0.15, dayChance: 0.3, minutes: 28 },
    commute: { modes: [["subway", 1]], minutes: 35, sd: 8 },
    work: {
      style: "desk", hours: 8.5, sd: 20,
      surfaces: [["social-manager/scheduler", 3], ["social-manager/comments", 3], ["social-manager/analytics", 2], ["photo-feed/feed", 2], ["team-chat/channels", 2], ["short-video/feed", 1]],
      meetings: [1, 2], pickupsPerHour: 9, pickupMinutes: [3, 10], distraction: 0.2,
    },
    lunch: { at: hm(12, 45), sd: 15, minutes: 30, styles: [["feed", 3], ["counter", 1]] },
    evening: [["social", 3], ["streaming", 2], ["messages", 2], ["takeout", 1]],
    feeds: [["photo-feed/feed", 3], ["short-video/feed", 2], ["social-manager/comments", 2], ["photo-feed/story", 2]],
    bed: { at: hm(23, 20), sd: 20 }, doomscroll: { minutes: 55, sd: 15 },
    friday: { later: 60, drinks: true },
    pushRate: 1.6,
    events: { delay: 0.18, lateMeeting: 0.05, sickKid: 0, lowBattery: 0.4 },
    places: { home: [...BROOKLYN.slice(0, 6), ...MANHATTAN.slice(3, 6)], work: ["SoHo", "Flatiron", "DUMBO"] },
  },
  "client-sales": {
    id: "client-sales", label: "Client-facing sales", weight: 7,
    alarm: hm(6, 40), alarmSd: 8, snooze: { typical: 0, sd: 0.2, max: 1 }, nightWakes: [],
    morning: { minutes: 55, sd: 6 },
    inBed: { minutes: [3, 6], views: [["calendar/day", 3], ["mail/inbox", 3], ["news/front", 2]] },
    run: { share: 0.3, dayChance: 0.4, minutes: 30 },
    commute: { modes: [["ride-hail", 3], ["subway", 1]], minutes: 30, sd: 8 },
    work: {
      style: "desk", hours: 9, sd: 15,
      surfaces: [["calendar/day", 3], ["mail/inbox", 3], ["mail/compose", 2], ["meeting/speaker", 2], ["messages/conversation", 1]],
      meetings: [2, 4], pickupsPerHour: 5, pickupMinutes: [2, 6], distraction: 0.2,
    },
    lunch: { at: hm(12, 30), sd: 10, minutes: 75, styles: [["reservation", 3], ["counter", 1]] },
    evening: [["messages", 3], ["inbox", 2], ["takeout", 1], ["streaming", 1], ["shopping", 1]],
    feeds: [["news/article", 2], ["photo-feed/feed", 2], ["shopping/browse", 1]],
    bed: { at: hm(23, 15), sd: 15 }, doomscroll: { minutes: 25, sd: 8 },
    friday: { later: 90, drinks: true },
    pushRate: 1.2,
    events: { delay: 0.12, lateMeeting: 0.2, sickKid: 0, lowBattery: 0.2 },
    places: { home: ["Upper East Side", "Upper West Side", "Murray Hill", "Williamsburg", "Long Island City", "Hoboken"], work: ["Midtown", "Hudson Yards", "Financial District"] },
  },
  "gig-courier": {
    id: "gig-courier", label: "Gig courier", weight: 7,
    alarm: hm(7, 25), alarmSd: 25, snooze: { typical: 0, sd: 0.4, max: 1 }, nightWakes: [],
    morning: { minutes: 30, sd: 8 },
    inBed: { minutes: [3, 8], views: [["weather/today", 3], ["courier/earnings", 2], ["short-video/feed", 2]] },
    run: { share: 0, dayChance: 0, minutes: 0 },
    commute: { modes: [["bike", 1]], minutes: 0, sd: 0 },
    work: {
      style: "courier", hours: 11, sd: 40,
      surfaces: [["courier/job-offer", 1]],
      meetings: [0, 0], pickupsPerHour: 0, pickupMinutes: [1, 1], distraction: 0,
    },
    lunch: { at: hm(15, 0), sd: 30, minutes: 15, styles: [["street", 1]] },
    evening: [["streaming", 3], ["earnings", 3], ["messages", 2], ["bank", 2]],
    feeds: [["short-video/feed", 4], ["photo-feed/feed", 1], ["news/front", 1]],
    bed: { at: hm(23, 30), sd: 25 }, doomscroll: { minutes: 40, sd: 15 },
    friday: { later: 30, drinks: false },
    pushRate: 0.9,
    events: { delay: 0, lateMeeting: 0, sickKid: 0, lowBattery: 0.5 },
    places: { home: [...BRONX, "Jackson Heights", "Flatbush", "Sunset Park", "Washington Heights", "Corona"], work: ["Citywide"] },
  },
  "early-shift": {
    id: "early-shift", label: "Hospital early shift", weight: 6,
    alarm: hm(5, 15), alarmSd: 8, snooze: { typical: 0, sd: 0.2, max: 1 }, nightWakes: [],
    morning: { minutes: 30, sd: 5 },
    inBed: { minutes: [2, 4], views: [["weather/today", 2], ["messages/list", 2], ["news/front", 1]] },
    run: { share: 0, dayChance: 0, minutes: 0 },
    commute: { modes: [["bus", 2], ["subway", 1]], minutes: 45, sd: 8 },
    work: {
      style: "shift", hours: 9, sd: 15,
      surfaces: [["messages/conversation", 1]],
      meetings: [0, 0], pickupsPerHour: 0, pickupMinutes: [1, 1], distraction: 0,
    },
    lunch: { at: hm(12, 0), sd: 15, minutes: 25, styles: [["break", 1]] },
    evening: [["messages", 2], ["grocery", 2], ["takeout", 2], ["streaming", 2]],
    feeds: [["short-video/feed", 2], ["photo-feed/feed", 2], ["news/article", 1]],
    bed: { at: hm(21, 15), sd: 10 }, doomscroll: { minutes: 15, sd: 5 },
    friday: { later: 30, drinks: false },
    pushRate: 0.8,
    events: { delay: 0.2, lateMeeting: 0, sickKid: 0, lowBattery: 0 },
    places: { home: [...BRONX, "Flatbush", "Canarsie", "Jamaica", "Washington Heights", "Inwood"], work: ["Upper East Side", "Washington Heights", "Kips Bay", "Downtown Brooklyn"] },
  },
  "grad-student": {
    id: "grad-student", label: "Grad student", weight: 8,
    alarm: hm(10, 0), alarmSd: 25, snooze: { typical: 2, sd: 0.8, max: 3 }, nightWakes: [],
    morning: { minutes: 35, sd: 10 },
    inBed: { minutes: [10, 20], views: [["short-video/feed", 3], ["photo-feed/feed", 2], ["messages/list", 2], ["mail/inbox", 1]] },
    run: { share: 0.15, dayChance: 0.3, minutes: 25 },
    commute: { modes: [["walk", 1]], minutes: 20, sd: 5 },
    work: {
      style: "desk", hours: 6, sd: 40,
      surfaces: [["mail/inbox", 2], ["calendar/day", 2], ["messages/conversation", 2], ["mail/compose", 1]],
      meetings: [0, 1], pickupsPerHour: 7, pickupMinutes: [2, 8], distraction: 0.55,
    },
    lunch: { at: hm(13, 30), sd: 25, minutes: 25, styles: [["feed", 3], ["counter", 2]] },
    evening: [["messages", 3], ["streaming", 3], ["takeout", 2], ["shopping", 1]],
    feeds: [["short-video/feed", 5], ["photo-feed/feed", 2], ["photo-feed/story", 1], ["short-video/comments", 1]],
    bed: { at: hm(24, 30), sd: 30 }, doomscroll: { minutes: 90, sd: 25 },
    friday: { later: 60, drinks: false },
    pushRate: 1.2,
    events: { delay: 0, lateMeeting: 0.05, sickKid: 0, lowBattery: 0.3 },
    places: { home: ["Morningside Heights", "Harlem", "Washington Heights", "East Village", "Greenwich Village"], work: ["Morningside Heights", "Washington Square"] },
  },
  "new-parent": {
    id: "new-parent", label: "New parent", weight: 6,
    alarm: null, alarmSd: 0, rise: { at: hm(6, 20), sd: 20 }, snooze: { typical: 0, sd: 0, max: 0 }, nightWakes: [hm(2, 0), hm(4, 30)],
    morning: { minutes: 30, sd: 10 },
    inBed: { minutes: [2, 4], views: [["baby/tracker", 1]] },
    run: { share: 0, dayChance: 0, minutes: 0 },
    commute: { modes: [["none", 1]], minutes: 0, sd: 0 },
    work: {
      style: "leave", hours: 13, sd: 20,
      surfaces: [["baby/monitor", 3], ["messages/conversation", 2], ["shopping/browse", 2], ["grocery/list", 1], ["photo-feed/feed", 2]],
      meetings: [4, 5], pickupsPerHour: 3, pickupMinutes: [3, 10], distraction: 0.4,
    },
    lunch: { at: hm(12, 45), sd: 30, minutes: 30, styles: [["delivery", 1]] },
    evening: [["baby", 4], ["takeout", 2], ["shopping", 2], ["messages", 2]],
    feeds: [["shopping/browse", 2], ["photo-feed/feed", 2], ["short-video/feed", 1], ["baby/monitor", 1]],
    bed: { at: hm(21, 50), sd: 15 }, doomscroll: { minutes: 20, sd: 8 },
    friday: { later: 0, drinks: false },
    pushRate: 0.9,
    events: { delay: 0, lateMeeting: 0, sickKid: 0, lowBattery: 0.1 },
    places: { home: ["Park Slope", "Prospect Heights", "Astoria", "Upper West Side", "Ditmas Park", "Forest Hills"], work: ["Home"] },
  },
  founder: {
    id: "founder", label: "Founder, always on", weight: 6,
    alarm: hm(5, 55), alarmSd: 15, snooze: { typical: 0, sd: 0.2, max: 1 }, nightWakes: [],
    morning: { minutes: 50, sd: 8 },
    inBed: { minutes: [6, 12], views: [["mail/inbox", 4], ["team-chat/channels", 2], ["news/front", 2], ["calendar/day", 1]] },
    run: { share: 0.3, dayChance: 0.4, minutes: 30 },
    commute: { modes: [["ride-hail", 2], ["car", 1]], minutes: 30, sd: 8 },
    work: {
      style: "desk", hours: 11, sd: 25,
      surfaces: [["mail/inbox", 4], ["mail/compose", 3], ["team-chat/channels", 3], ["team-chat/thread", 2], ["calendar/day", 2], ["mail/message", 2]],
      meetings: [4, 5], pickupsPerHour: 8, pickupMinutes: [2, 6], distraction: 0.1,
    },
    lunch: { at: hm(13, 0), sd: 20, minutes: 10, styles: [["skip", 3], ["counter", 1]] },
    evening: [["inbox", 3], ["takeout", 2], ["messages", 1], ["news", 1]],
    feeds: [["mail/inbox", 3], ["mail/compose", 2], ["news/article", 2], ["team-chat/channels", 1]],
    bed: { at: hm(23, 40), sd: 20 }, doomscroll: { minutes: 50, sd: 15 },
    friday: { later: 30, drinks: false },
    pushRate: 1.5,
    events: { delay: 0.1, lateMeeting: 0.3, sickKid: 0, lowBattery: 0.35 },
    places: { home: ["Tribeca", "West Village", "Williamsburg", "Cobble Hill", "Upper West Side"], work: ["Flatiron", "SoHo", "Hudson Yards"] },
  },
};

export const archetypeIds = Object.keys(personas) as ArchetypeId[];
export const archetypeWeights: Weighted<ArchetypeId> = archetypeIds.map((id) => [id, personas[id].weight] as const);
