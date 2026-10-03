import { personas, variation, type CommuteMode, type LunchStyle, type Persona } from "../personas.ts";
import { createRng, hash } from "../rng.ts";
import { weekdayOf } from "../time.ts";
import type { Minute, Owner, Weekday } from "../types.ts";
import { createVary } from "./vary.ts";

export type Sameness = number;

/** Stable per-person habits (the same every day for one seed and sameness). */
export type PersonTraits = {
  alarm: Minute | null;
  commuteMode: CommuteMode;
  commuteMinutes: number;
  runner: boolean;
  pickupsPerHour: number;
  pushMultiplier: number;
  doomFactor: number;
  bedOffset: number;
  lunchHabit: LunchStyle;
  standupLead: number;
};

export function personTraits(owner: Owner, persona: Persona, sameness: Sameness, seed: number): PersonTraits {
  const v = createVary(hash("traits", owner.seed), hash("traits", persona.id, seed), sameness);
  const spread = variation.sigma(sameness);
  const alarm = persona.alarm === null ? null : Math.round(persona.alarm + ((owner.alarm ?? persona.alarm) - persona.alarm) * spread);
  const commuteMode = v.pick(persona.commute.modes);
  const commuteMinutes = persona.commute.minutes > 0 ? Math.max(10, Math.round(v.num(persona.commute.minutes, persona.commute.sd))) : 0;
  const runner = persona.run.share > 0 && v.pick([[true, persona.run.share], [false, 1 - persona.run.share]]);
  const rate = persona.work.pickupsPerHour;
  return {
    alarm,
    commuteMode,
    commuteMinutes,
    runner,
    pickupsPerHour: rate > 0 ? Math.max(rate * 0.4, v.num(rate, rate * 0.25)) : 0,
    pushMultiplier: Math.max(0.3, v.num(1, 0.3)),
    doomFactor: Math.max(0.3, v.num(1, 0.3)),
    bedOffset: v.num(0, persona.bed.sd),
    lunchHabit: v.pick(persona.lunch.styles),
    standupLead: v.span(0, 1) * 30,
  };
}

/** City-wide conditions shared by every phone on a day. */
export function cityDay(seed: number, day: number, sameness: Sameness) {
  const rng = createRng(hash("city", seed, day));
  return { rain: rng.next() < 0.22 * variation.probability(sameness) };
}

/** Day-level timing and events for one person, independent of the scenes. */
export type DayTraits = {
  weekday: Weekday;
  rain: boolean;
  snoozes: number;
  ringMinutes: number[];
  rise: Minute;
  morning: number;
  inBed: number;
  runMinutes: number;
  commuteMode: CommuteMode;
  commuteMinutes: number;
  delay: number;
  remote: boolean;
  sickKid: boolean;
  lunchAt: Minute;
  lunchMinutes: number;
  lunchStyle: LunchStyle;
  workMinutes: number;
  lateMeeting: boolean;
  meetings: number;
  drinks: boolean;
  lowBattery: boolean;
  bedStart: Minute;
  /** Absolute minute the screen goes dark (may be ≥ 1440, after midnight). */
  sleep: Minute;
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function dayTraits(owner: Owner, traits: PersonTraits, day: number, sameness: Sameness, seed: number): DayTraits {
  const persona = personas[owner.archetype];
  const weekday = weekdayOf(day);
  const v = createVary(hash("day", owner.seed, day), hash("day", persona.id, seed), sameness);
  const { rain } = cityDay(seed, day, sameness);

  const snoozes = clamp(Math.round(v.num(persona.snooze.typical, persona.snooze.sd)), 0, persona.snooze.max);
  const ringMinutes = Array.from({ length: snoozes + 1 }, () => v.span(1, 2));
  const rise = persona.rise ? Math.round(v.num(persona.rise.at, persona.rise.sd)) : 0;
  const morning = Math.max(12, Math.round(v.num(persona.morning.minutes, persona.morning.sd)));
  const inBed = v.span(persona.inBed.minutes[0], persona.inBed.minutes[1]);
  const runs = traits.runner && v.pick([[true, persona.run.dayChance], [false, 1 - persona.run.dayChance]]);
  const runMinutes = runs ? Math.max(15, Math.round(v.num(persona.run.minutes, 6))) : 0;

  const sickKid = v.chance(persona.events.sickKid);
  let commuteMode = traits.commuteMode;
  const rideInRain = v.chance(0.45);
  if (rain && rideInRain && (commuteMode === "subway" || commuteMode === "bus" || commuteMode === "walk")) commuteMode = "ride-hail";
  const remote = sickKid || commuteMode === "none";
  const commuteMinutes = commuteMode === "none" || commuteMode === "bike" ? 0 : Math.max(8, Math.round(traits.commuteMinutes + v.num(0, 5)));
  const delayed = v.chance(persona.events.delay);
  const delayMinutes = v.span(8, 25);
  const delay = delayed && !remote && (commuteMode === "subway" || commuteMode === "bus" || commuteMode === "car") ? delayMinutes : 0;

  const lunchAt = Math.round(v.num(persona.lunch.at, persona.lunch.sd));
  const lunchMinutes = Math.max(8, Math.round(v.num(persona.lunch.minutes, persona.lunch.minutes * 0.2)));
  const lunchStyle = v.pick(persona.lunch.styles.map(([style, weight]) => [style, style === traits.lunchHabit ? weight + 4 : weight] as const));
  const workMinutes = Math.round(persona.work.hours * 60 + v.num(0, persona.work.sd));
  const lateMeeting = v.chance(persona.events.lateMeeting);
  const meetings = v.span(persona.work.meetings[0], persona.work.meetings[1]);
  const lowBattery = v.chance(persona.events.lowBattery);

  const bedStart = Math.round(persona.bed.at + traits.bedOffset + v.num(0, persona.bed.sd * 0.6) + (weekday === 4 ? persona.friday.later : 0));
  const doom = Math.max(5, Math.round(persona.doomscroll.minutes * traits.doomFactor + v.num(0, persona.doomscroll.sd)));
  const morningStart = persona.alarm ?? persona.rise?.at ?? 360;
  const night = persona.nightWakes[0] ?? morningStart;
  const sleep = Math.min(bedStart + doom + 1, 1440 + Math.min(night, morningStart) - 90);

  return {
    weekday, rain, snoozes, ringMinutes, rise, morning, inBed, runMinutes,
    commuteMode, commuteMinutes, delay, remote, sickKid,
    lunchAt, lunchMinutes, lunchStyle, workMinutes, lateMeeting, meetings,
    drinks: weekday === 4 && persona.friday.drinks,
    lowBattery, bedStart, sleep,
  };
}
