/**
 * Episodes of a weekday, appended in order onto one timeline: morning, commute,
 * work (with lunch and meetings), evening, and the night scroll. Every choice
 * goes through `Vary`, so sameness controls how far a person drifts.
 */
import type { AppId } from "../catalogue.ts";
import type { Cue } from "../notifications.ts";
import type { CommuteMode, EveningActivity, LunchStyle, Persona, ViewRef, Weighted } from "../personas.ts";
import { timeConfig } from "../time.ts";
import type { Owner, Weekday } from "../types.ts";
import { createTimeline, parseRef, type Ref, type Segment, type Timeline } from "./timeline.ts";
import type { DayTraits, PersonTraits } from "./traits.ts";
import type { Vary } from "./vary.ts";

export type Build = {
  owner: Owner;
  persona: Persona;
  weekday: Weekday;
  traits: PersonTraits;
  d: DayTraits;
  tl: Timeline;
  v: Vary;
  cues: Cue[];
};

const cue = (b: Build, kind: Cue["kind"], extra: Omit<Cue, "kind" | "at"> = {}, at = b.tl.cursor) => {
  b.cues.push({ kind, at, ...extra });
};

/** Several short feed episodes filling `minutes`, sometimes via the home screen. */
function scroll(b: Build, minutes: number, views: Weighted<ViewRef>, lengths: readonly [number, number] = [4, 14]) {
  const { tl, v } = b;
  const end = Math.min(tl.end, tl.cursor + minutes);
  let previous: Ref | null = null;
  while (tl.cursor < end) {
    if (previous && v.pick([[true, 0.25], [false, 0.75]])) tl.add("home/page", 1);
    let ref = v.pick(views);
    if (ref === previous && views.length > 1) ref = v.pick(views);
    tl.add(ref, Math.min(v.span(lengths[0], lengths[1]), end - tl.cursor));
    previous = ref;
  }
}

// ---------------------------------------------------------------------------
// Night (from bedtime until the screen goes dark; may run past midnight)

/** Built on its own timeline so the next day can replay its after-midnight tail. */
export function nightSegments(persona: Persona, traits: PersonTraits, d: DayTraits, v: Vary): Segment[] {
  const tl = createTimeline(d.bedStart, d.sleep);
  const b = { persona, tl, v } as Build;
  if (traits.alarm !== null) tl.add("alarm/set", 1);
  else if (persona.id === "new-parent") tl.add("baby/monitor", 2);
  if (v.pick([[true, 0.3], [false, 0.7]])) tl.add("messages/conversation", v.span(2, 5));
  const batteryAt = d.lowBattery ? tl.cursor + Math.round((d.sleep - tl.cursor) * 0.5) : Infinity;
  while (tl.cursor < d.sleep) {
    if (tl.cursor >= batteryAt && !tl.segments.some((segment) => segment.app === "system-sheet")) tl.add("system-sheet/low-battery", 1);
    scroll(b, Math.min(v.span(6, 20), batteryAt > tl.cursor ? batteryAt - tl.cursor : Infinity), persona.feeds, [4, 18]);
  }
  return tl.segments;
}

// ---------------------------------------------------------------------------
// Morning

/** Alarm (with snoozes) or baby, then the ritual until leaving. Returns wake and leave. */
export function morning(b: Build): { wake: number; leave: number } {
  const { tl, d, v, persona, traits } = b;
  if (traits.alarm === null) {
    tl.until("off", Math.max(tl.cursor + 1, d.rise));
    cue(b, "baby");
    tl.add("baby/monitor", 2);
  } else {
    tl.until("off", Math.max(tl.cursor + 1, traits.alarm));
    d.ringMinutes.forEach((ring, index) => {
      tl.add("alarm/ringing", ring);
      if (index < d.snoozes) tl.add("alarm/snoozed", timeConfig.snoozeMinutes);
    });
  }
  const wake = tl.cursor;
  cue(b, "digest");
  if (persona.id === "new-parent") {
    tl.add("baby/tracker", 3);
    scroll(b, v.span(10, 18), persona.feeds);
    tl.add("baby/tracker", 1);
  } else tl.add("lock/lock", v.span(1, 3));
  if (b.weekday === 0) {
    cue(b, "screen-time");
    tl.add("screen-time/weekly-report", 2);
  }
  scroll(b, d.inBed, persona.inBed.views, [2, 6]);
  let leave = wake + d.morning;
  if (d.runMinutes > 0) {
    tl.add("off", v.span(3, 6));
    tl.add("run/active", d.runMinutes);
    tl.add("run/summary", v.span(2, 3));
    leave += d.runMinutes + 8;
  }
  const remaining = leave - tl.cursor;
  if (remaining > 8) {
    tl.add("off", Math.min(16, Math.round(remaining * 0.35)));
    if (d.remote) tl.until("off", leave - 3);
    else tl.until(v.pick<ViewRef>([["audio/now-playing", 3], ["audio/podcast", 2]]), leave - 2);
    tl.until(v.pick<Ref>([["weather/hourly", 2], ["messages/list", 1], ["off", 1]]), leave);
  }
  return { wake, leave: Math.max(leave, tl.cursor) };
}

// ---------------------------------------------------------------------------
// Commute

/** One leg of a commute starting now; returns the arrival minute. */
export function commute(b: Build, mode: CommuteMode, minutes: number, outbound: boolean): number {
  const { tl, v, d, persona } = b;
  const start = tl.cursor;
  const delay = outbound ? d.delay : 0;
  const end = start + minutes + delay;
  switch (mode) {
    case "subway":
    case "bus": {
      tl.add("transit/departures", 2);
      tl.add("off", v.span(3, 7));
      if (delay > 0) {
        cue(b, "transit-delay");
        tl.add("transit/delay", v.span(4, 8));
      }
      tl.add("transit/trip", v.span(2, 4));
      const rideEnd = end - v.span(3, 6);
      const ride: Weighted<ViewRef> = [...persona.feeds, ["audio/podcast", 1], ["messages/conversation", 1]];
      while (tl.cursor < rideEnd) {
        scroll(b, Math.min(v.span(5, 12), rideEnd - tl.cursor), ride, [4, 10]);
        tl.add(v.pick<Ref>([["off", 2], ["lock/lock", 1]]), v.span(1, 3));
      }
      tl.until("off", end);
      break;
    }
    case "car":
      tl.add("navigation/route-overview", 2);
      if (delay > 0) {
        tl.add("navigation/driving", Math.round(minutes * 0.3));
        cue(b, "traffic");
        tl.add("navigation/route-overview", 1);
      }
      tl.until("navigation/driving", end);
      break;
    case "ride-hail": {
      tl.add("ride-hail/requesting", 2);
      cue(b, "ride");
      tl.add("ride-hail/arriving", v.span(3, 6));
      const middle = tl.cursor + Math.round((end - tl.cursor) * 0.45);
      tl.until("ride-hail/on-trip", middle);
      tl.add(v.pick<ViewRef>([["mail/inbox", 2], ["messages/conversation", 1], ["photo-feed/feed", 1]]), v.span(3, 6));
      tl.until("ride-hail/on-trip", end);
      break;
    }
    case "walk":
      tl.until(v.pick<ViewRef>([["audio/podcast", 2], ["audio/now-playing", 1]]), end);
      break;
    case "bike":
    case "none":
      break;
  }
  return tl.cursor;
}

// ---------------------------------------------------------------------------
// Work

type Block = { start: number; end: number; fill: (b: Build) => void };

/** Fixed blocks (meetings, lunch, breaks) with `gap` filling the time between. */
function fillWork(b: Build, end: number, blocks: Block[], gap: (b: Build) => void) {
  const { tl } = b;
  blocks.sort((x, y) => x.start - y.start);
  let lastEnd = tl.cursor;
  for (const block of blocks) {
    if (block.start < lastEnd || block.end > end) continue;
    tl.cap = block.start;
    gap(b);
    tl.until("off", block.start);
    tl.cap = block.end;
    block.fill(b);
    tl.until("off", block.end);
    tl.cap = Infinity;
    lastEnd = block.end;
  }
  tl.cap = end;
  gap(b);
  tl.until("off", end);
  tl.cap = Infinity;
}

const pickupApps: Partial<Record<AppId, true>> = { "team-chat": true, mail: true, messages: true, "social-manager": true, calendar: true, "photo-feed": true };

/** Phone face down, picked up at a Poisson rate: work surface, feed, or a glance. */
function pickups(b: Build) {
  const { tl, v, persona, traits } = b;
  const rate = traits.pickupsPerHour;
  if (rate <= 0) return;
  const { distraction, pickupMinutes, surfaces } = persona.work;
  const distractions: Weighted<ViewRef> = [...persona.feeds, ["messages/conversation", 2], ["messages/list", 1]];
  for (;;) {
    const wait = Math.max(1, Math.round(v.interval(60 / rate)));
    if (tl.cursor + wait + 2 > tl.end) return;
    tl.add("off", wait);
    const kind = v.pick([["work", 1 - distraction], ["feed", distraction], ["glance", 0.2]] as const);
    if (kind === "glance") {
      tl.add("lock/lock", 1);
      continue;
    }
    const ref = kind === "work" ? v.pick(surfaces) : v.pick(distractions);
    const { app } = parseRef(ref);
    if (app !== "off" && pickupApps[app] && v.pick([[true, 0.55], [false, 0.45]])) cue(b, "ping", { app });
    else if (kind === "feed" && v.pick([[true, 0.3], [false, 0.7]])) tl.add("home/page", 1);
    tl.add(ref, v.span(pickupMinutes[0], pickupMinutes[1]));
    if (ref === "team-chat/channels" && v.pick([[true, 0.4], [false, 0.6]])) tl.add("team-chat/thread", v.span(2, 5));
    if (ref === "mail/message" && v.pick([[true, 0.3], [false, 0.7]])) tl.add("mail/compose", v.span(2, 4));
  }
}

const meetingTitles = ["Standup", "Weekly Sync", "1:1", "Q4 Planning", "Design Review", "Client Check-in", "Pipeline Review", "Sprint Retro", "All Hands", "Budget Review"];

function meetingBlock(start: number, minutes: number, title: string): Block {
  return {
    start,
    end: start + minutes,
    fill: (b) => {
      b.cues.push({ kind: "meeting", at: start - 5, label: title, start, end: start + minutes });
      b.tl.add("meeting/joining", 1);
      b.tl.add(b.v.pick<ViewRef>([["meeting/grid", 3], ["meeting/speaker", 2]]), minutes - 1);
    },
  };
}

function lunchBlock(b: Build, style: LunchStyle, start: number, minutes: number): Block {
  return { start, end: start + minutes, fill: (build) => lunch(build, style) };
}

/** Lunch, filling the block's cap. */
function lunch(b: Build, style: LunchStyle) {
  const { tl, v, persona } = b;
  const end = tl.end;
  const eat = (views: Weighted<ViewRef>) => scroll(b, Math.max(0, end - tl.cursor - v.span(2, 6)), views);
  switch (style) {
    case "delivery":
    case "desk":
      tl.add("food-delivery/browse", v.span(4, 8));
      tl.add("off", v.span(8, 14));
      cue(b, "delivery-out");
      tl.add("food-delivery/tracking", v.span(5, 9));
      cue(b, "delivery-here");
      tl.add("off", 2);
      eat(style === "desk" ? [["news/article", 2], ["mail/inbox", 1]] : persona.feeds);
      break;
    case "counter":
      tl.add("off", v.span(4, 8));
      tl.add("wallet/tap-to-pay", 1);
      cue(b, "purchase");
      tl.add("off", v.span(3, 6));
      eat(persona.feeds);
      break;
    case "feed":
      tl.add("off", v.span(3, 6));
      eat([...persona.feeds, ["messages/conversation", 1]]);
      break;
    case "reservation":
      cue(b, "reservation");
      tl.add("reservation/confirmed", 2);
      tl.add("ride-hail/requesting", 2);
      cue(b, "ride");
      tl.add("ride-hail/on-trip", v.span(10, 14));
      tl.until("off", end - 18);
      tl.add("wallet/tap-to-pay", 1);
      cue(b, "purchase", { label: "dinner" });
      tl.add("ride-hail/requesting", 2);
      tl.until("ride-hail/on-trip", end);
      break;
    case "skip":
      tl.add("mail/inbox", v.span(4, 8));
      break;
    case "street":
      tl.add("short-video/feed", v.span(8, 12));
      tl.add("wallet/tap-to-pay", 1);
      cue(b, "purchase");
      break;
    case "break":
      scroll(b, v.span(14, 20), persona.feeds);
      tl.add("messages/conversation", v.span(2, 5));
      break;
  }
}

/** Half-hour meeting slots between arrival and the end of work, avoiding lunch. */
function meetingBlocks(b: Build, arrive: number, end: number, count: number, lunchStart: number, lunchEnd: number): Block[] {
  const { v, traits } = b;
  if (count <= 0) return [];
  const first = Math.ceil((arrive + 15) / 30) * 30 + traits.standupLead;
  const slots: number[] = [];
  for (let slot = first; slot + 30 <= end - 15; slot += 30) {
    if (slot + 60 > lunchStart - 5 && slot < lunchEnd + 5) continue;
    slots.push(slot);
  }
  const blocks: Block[] = [];
  const taken = new Set<number>();
  for (let i = 0; i < count && slots.length > 0; i++) {
    const index = i === 0 ? 0 : v.span(0, slots.length - 1);
    const start = slots[index];
    if (taken.has(start)) continue;
    taken.add(start);
    const minutes = i === 0 ? 15 : v.pick([[30, 3], [45, 1], [60, 1]] as const);
    blocks.push(meetingBlock(start, minutes, i === 0 ? "Standup" : meetingTitles[1 + v.span(0, meetingTitles.length - 2)]));
  }
  return blocks;
}

/** The work part of the day from arrival; returns the minute work ends. */
export function work(b: Build, arrive: number): number {
  const { tl, d, v, persona } = b;
  const style = persona.work.style;
  let end = arrive + d.workMinutes;
  const lunchStart = Math.min(Math.max(d.lunchAt, arrive + 30), end - d.lunchMinutes - 20);
  const lunchEnd = lunchStart + d.lunchMinutes;
  const blocks: Block[] = [lunchBlock(b, d.lunchStyle, lunchStart, d.lunchMinutes)];

  if (style === "desk") {
    if (d.lateMeeting) {
      blocks.push(meetingBlock(end - 15, 60, "Late Sync"));
      end += 45;
    }
    blocks.push(...meetingBlocks(b, arrive, end - (d.lateMeeting ? 60 : 0), d.meetings, lunchStart, lunchEnd));
    if (d.sickKid) {
      blocks.push({ start: arrive + 20, end: arrive + 30, fill: (build) => {
        cue(build, "sick-kid");
        build.tl.add("school/updates", 4);
        build.tl.add("messages/conversation", 4);
      } });
    }
    fillWork(b, end, blocks, pickups);
  } else if (style === "courier") {
    let jobs = 0;
    fillWork(b, end, blocks, (build) => {
      const { tl: line } = build;
      while (line.cursor + 15 < line.end) {
        cue(build, "courier-offer");
        line.add("courier/job-offer", v.span(1, 2));
        line.add("courier/navigating", v.span(9, 18));
        line.add(v.pick<Ref>([["off", 2], ["short-video/feed", 1]]), v.span(2, 6));
        line.add("courier/navigating", v.span(7, 15));
        line.add("off", v.span(1, 4));
        if (++jobs % 4 === 0) line.add("courier/earnings", 2);
      }
    });
    cue(b, "earnings");
    tl.add("courier/earnings", 3);
    tl.add("off", v.span(15, 25));
  } else if (style === "shift") {
    const breakAt = Math.round(v.num(10 * 60, 15));
    blocks.push({ start: breakAt, end: breakAt + 15, fill: (build) => scroll(build, 13, persona.feeds) });
    fillWork(b, end, blocks, () => undefined);
  } else {
    // Parental leave: feeds every few hours, lunch delivered, pickups between.
    const feeds = d.meetings;
    const spacing = Math.round((end - arrive) / (feeds + 0.5));
    for (let i = 0; i < feeds; i++) {
      const start = Math.round(arrive + spacing * (i + 0.5) + v.num(0, 15));
      blocks.push({ start, end: start + 25, fill: (build) => {
        cue(build, "ping", { app: "baby" });
        build.tl.add("baby/tracker", 2);
        scroll(build, v.span(14, 20), persona.feeds);
        build.tl.add("baby/tracker", 1);
      } });
    }
    fillWork(b, end, blocks, pickups);
  }
  return end;
}

// ---------------------------------------------------------------------------
// Evening

function eveningActivity(b: Build, activity: EveningActivity) {
  const { tl, v } = b;
  switch (activity) {
    case "grocery": tl.add("grocery/recipe", v.span(4, 8)); tl.add("grocery/list", v.span(3, 5)); break;
    case "school": cue(b, "school"); tl.add("school/updates", v.span(3, 6)); tl.add("messages/conversation", v.span(2, 4)); break;
    case "baby": tl.add("baby/tracker", 2); tl.add("baby/monitor", v.span(5, 12)); break;
    case "takeout":
      tl.add("food-delivery/browse", v.span(5, 10));
      tl.add("off", v.span(10, 18));
      cue(b, "delivery-out");
      tl.add("food-delivery/tracking", v.span(6, 10));
      cue(b, "delivery-here");
      break;
    case "messages": cue(b, "ping", { app: "messages" }); tl.add("messages/list", 1); tl.add("messages/conversation", v.span(4, 9)); break;
    case "streaming": scroll(b, v.span(15, 35), b.persona.feeds, [6, 18]); break;
    case "shopping": tl.add("shopping/browse", v.span(5, 9)); tl.add("shopping/product", v.span(2, 4)); tl.add("shopping/cart", v.span(1, 3)); break;
    case "bank": tl.add("bank/balance", v.span(2, 4)); tl.add("bank/transaction-alert", 2); break;
    case "earnings": tl.add("courier/earnings", v.span(2, 4)); break;
    case "social": cue(b, "ping", { app: "social-manager" }); tl.add("social-manager/comments", v.span(6, 14)); break;
    case "news": tl.add("news/front", v.span(2, 4)); tl.add("news/article", v.span(4, 8)); break;
    case "inbox": cue(b, "ping", { app: "mail" }); tl.add("mail/inbox", v.span(4, 8)); tl.add("mail/compose", v.span(3, 6)); break;
  }
}

/** Friday drinks straight from work, then a ride home. */
function drinks(b: Build) {
  const { tl, v } = b;
  cue(b, "drinks");
  tl.add("messages/conversation", v.span(3, 5));
  tl.add("off", v.span(30, 45));
  tl.add("photo-feed/story", v.span(2, 4));
  tl.add("off", v.span(30, 45));
  tl.add("messages/conversation", v.span(2, 4));
  tl.add("off", v.span(25, 40));
  tl.add("wallet/tap-to-pay", 1);
  cue(b, "purchase", { label: "dinner" });
  tl.add("ride-hail/requesting", 2);
  cue(b, "ride");
  tl.add("ride-hail/arriving", v.span(3, 6));
  tl.add("ride-hail/on-trip", v.span(18, 30));
}

/** Evening at home until bedtime: dark gaps (dinner, TV) and short episodes. */
export function evening(b: Build, fromWork: boolean) {
  const { tl, v, d, persona } = b;
  if (fromWork && d.drinks) drinks(b);
  while (tl.cursor < tl.end - 6) {
    tl.add("off", Math.max(4, Math.round(v.interval(26))));
    if (tl.cursor >= tl.end - 4) break;
    eveningActivity(b, v.pick(persona.evening));
  }
  tl.until("off", tl.end);
}
