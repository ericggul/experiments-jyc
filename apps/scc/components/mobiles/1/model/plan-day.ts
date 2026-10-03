import { composePushes, globalEvents, type Cue } from "./notifications.ts";
import { personas } from "./personas.ts";
import { commute, evening, morning, nightSegments, work, type Build } from "./plan/episodes.ts";
import { fillAwake } from "./plan/fill.ts";
import { createTimeline, overlay, type Segment } from "./plan/timeline.ts";
import { cityDay, dayTraits, personTraits } from "./plan/traits.ts";
import { createVary } from "./plan/vary.ts";
import { hash } from "./rng.ts";
import { MINUTES_PER_DAY, weekdayOf } from "./time.ts";
import type { DayPlan, Owner, Scene } from "./types.ts";

export type PlanOptions = {
  /** 0 = maximal individual variation, 1 = everyone identical. */
  sameness: number;
  /** Multiplier on push density. */
  notificationRate: number;
  /** Whether simultaneous global events are scheduled. */
  synchrony: boolean;
  /** Population seed. */
  seed: number;
  /** Target share of awake time with the screen on (0 keeps only scripted use). */
  screenTime: number;
};

export const defaultPlanOptions: PlanOptions = { sameness: 0.6, notificationRate: 1, synchrony: true, seed: 1, screenTime: 0.85 };

const ACTIVE_EXCLUDED = new Set(["off", "lock", "alarm"]);

/**
 * One person's weekday: contiguous scenes over [0, 1440) and the pushes that
 * drive them. Pure and deterministic for (owner, day, options). The first
 * scenes replay the previous night's scroll past midnight.
 */
export function planDay(owner: Owner, day: number, options: PlanOptions = defaultPlanOptions): DayPlan {
  const persona = personas[owner.archetype];
  const sameness = Math.min(1, Math.max(0, options.sameness));
  const traits = personTraits(owner, persona, sameness, options.seed);
  const d = dayTraits(owner, traits, day, sameness, options.seed);
  const nightVary = (index: number) => createVary(hash("night", owner.seed, index), hash("night", persona.id, options.seed), sameness);

  // Yesterday's night scroll after midnight.
  const previous = dayTraits(owner, traits, day - 1, sameness, options.seed);
  const tail: Segment[] = [];
  let tailEnd = 0;
  if (previous.sleep > MINUTES_PER_DAY) {
    for (const segment of nightSegments(persona, traits, previous, nightVary(day - 1))) {
      if (segment.end <= MINUTES_PER_DAY) continue;
      tail.push({ ...segment, start: Math.max(0, segment.start - MINUTES_PER_DAY), end: segment.end - MINUTES_PER_DAY });
    }
    tailEnd = previous.sleep - MINUTES_PER_DAY;
  }

  // A bedtime after midnight leaves the screen dark at midnight, as tomorrow replays it.
  const tl = createTimeline(tailEnd, Math.min(d.bedStart, MINUTES_PER_DAY - 3));
  tl.segments.push(...tail);
  const v = createVary(hash("plan", owner.seed, day), hash("plan", persona.id, options.seed), sameness);
  const cues: Cue[] = [];
  const b: Build = { owner, persona, weekday: d.weekday, traits, d, tl, v, cues };

  // Small hours: a new parent's night feeds, or a rare glance at the time.
  const firstEvent = traits.alarm ?? d.rise;
  if (persona.nightWakes.length > 0) {
    for (const nightWake of persona.nightWakes) {
      const at = Math.round(v.num(nightWake, 20));
      if (at < tl.cursor + 10 || at > firstEvent - 40) continue;
      tl.until("off", at);
      cues.push({ kind: "baby", at });
      tl.add("baby/monitor", 2);
      tl.add("baby/tracker", 2);
      tl.add(v.pick([["short-video/feed", 2], ["shopping/browse", 1]] as const), v.span(10, 20));
      tl.add("baby/tracker", 1);
    }
  } else if (v.chance(0.15)) {
    const at = Math.round(tl.cursor + 30 + (firstEvent - 90 - tl.cursor) * v.rng.next());
    if (at > tl.cursor) {
      tl.until("off", at);
      tl.add("lock/sleep", v.span(1, 2));
    }
  }

  const { wake, leave } = morning(b);
  tl.until("off", leave);

  const mode = d.commuteMode;
  const commutes = !d.remote && mode !== "none" && mode !== "bike";
  const arrive = commutes ? commute(b, mode, d.commuteMinutes, true) : tl.cursor;
  const workEnd = work(b, arrive);
  const workWindow = [arrive, workEnd] as const;
  if (commutes && !d.drinks) commute(b, mode, Math.max(8, Math.round(d.commuteMinutes + v.num(5, 5))), false);
  evening(b, true);

  // Tonight's scroll (clipped at midnight; tomorrow replays the rest).
  let segments = tl.segments;
  for (const segment of nightSegments(persona, traits, d, nightVary(day))) {
    if (segment.start >= MINUTES_PER_DAY) break;
    if (segment.start < tl.cursor) continue;
    segments.push({ ...segment, end: Math.min(segment.end, MINUTES_PER_DAY) });
  }
  const last = segments[segments.length - 1];
  if (last.end < MINUTES_PER_DAY) segments.push({ start: last.end, end: MINUTES_PER_DAY, app: "off", view: "off" });

  // Awake, the phone is almost always in hand: refill the dark gaps with pickups.
  segments = fillAwake(segments, {
    from: wake,
    to: Math.min(d.bedStart, MINUTES_PER_DAY),
    share: options.screenTime ?? defaultPlanOptions.screenTime,
    work: persona.work.style === "leave" ? null : workWindow,
    persona,
    v,
  });

  // Simultaneous global events touch the screens that are on.
  const globals = options.synchrony ? globalEvents(options.seed, day, cityDay(options.seed, day, sameness).rain) : [];
  const usesTeamChat = persona.work.surfaces.some(([ref]) => ref.startsWith("team-chat"));
  for (const event of globals) {
    const current = segments.find((segment) => segment.start <= event.at && event.at < segment.end);
    if (!current) continue;
    if (event.kind === "outage" && usesTeamChat && event.at >= arrive && event.at < workEnd && current.app !== "meeting") {
      segments = overlay(segments, event.at, event.at + 12, "team-chat/reconnecting");
    } else if (event.kind === "update" && !ACTIVE_EXCLUDED.has(current.app)) {
      segments = overlay(segments, event.at, event.at + 2, "system-sheet/update");
    }
  }

  const scenes = toScenes(owner, day, segments);
  const pushes = composePushes({
    owner,
    day,
    scenes,
    cues,
    globals,
    tailEnd,
    wake,
    sleep: d.sleep,
    work: persona.work.style === "leave" ? null : workWindow,
    pushMultiplier: traits.pushMultiplier,
    notificationRate: options.notificationRate,
    spread: 1 - sameness,
  });

  return {
    ownerId: owner.id,
    day,
    weekday: weekdayOf(day),
    scenes,
    pushes,
    wake,
    sleep: d.sleep >= MINUTES_PER_DAY ? d.sleep - MINUTES_PER_DAY : d.sleep,
  };
}

/** Clips to [0, 1440), merges equal neighbours and assigns stable ids and seeds. */
function toScenes(owner: Owner, day: number, segments: readonly Segment[]): Scene[] {
  const scenes: Scene[] = [];
  let cursor = 0;
  for (const segment of segments) {
    const start = Math.max(cursor, segment.start);
    const end = Math.min(MINUTES_PER_DAY, segment.end);
    if (end <= start) continue;
    const last = scenes[scenes.length - 1];
    if (start > cursor) {
      if (last && last.app === "off") last.end = start;
      else scenes.push(scene(owner, day, scenes.length, cursor, start, "off", "off"));
    }
    const previous = scenes[scenes.length - 1];
    if (previous && previous.app === segment.app && previous.view === segment.view) previous.end = end;
    else scenes.push(scene(owner, day, scenes.length, start, end, segment.app, segment.view));
    cursor = end;
  }
  if (cursor < MINUTES_PER_DAY) scenes.push(scene(owner, day, scenes.length, cursor, MINUTES_PER_DAY, "off", "off"));
  return scenes;
}

function scene(owner: Owner, day: number, index: number, start: number, end: number, app: Scene["app"], view: string): Scene {
  return { id: `${owner.id}:${day}:${index}`, start, end, app, view, seed: hash(owner.seed, day, index) };
}
