import { createRng, hash, type Rng } from "../../model/rng";
import { weekdayOf } from "../../model/time";
import type { Owner } from "../../model/types";

export const firstNames = [
  "Maya", "Dev", "Sam", "Lena", "Marcus", "Priya", "Tomás", "Aiko", "Jordan", "Chloe", "Andre", "Rosa", "Nadia", "Owen", "Grace",
  "Leo", "Imani", "Ravi", "Hannah", "Diego", "Mei", "Kofi", "Sofia", "Eli", "Zara", "Theo", "Naomi", "Jamal", "Iris", "Felix",
] as const;
export const lastNames = [
  "Okafor", "Patel", "Rivera", "Fischer", "Webb", "Nair", "Herrera", "Tanaka", "Blake", "Bennett", "Washington", "Delgado", "Cohen", "Kim", "Murphy",
  "Goldberg", "Alvarez", "Chen", "O'Neill", "Haddad", "Brooks", "Moreno", "Sato", "Kowalski", "Mensah", "Russo", "Park", "Lindqvist", "Romero", "Gupta",
] as const;
const projects = ["Atlas", "Juniper", "Northstar", "Harbor", "Beacon", "Orchard", "Meridian", "Tidal", "Copper", "Lantern", "Quarry", "Fernway"] as const;
const companies = [
  "Halvorsen Freight", "Brightwater", "Kestrel Foods", "Oakline Health", "Pemberton & Reed", "Vantage Labs", "Marlowe Retail",
  "Northgate", "Sable Energy", "Tidewell Group", "Corbel Studio", "Ashby Capital",
] as const;
const roles = ["Product Designer", "Staff Engineer", "Data Analyst", "Account Executive", "Brand Manager", "Recruiter", "Ops Lead"] as const;
const rooms = ["Room 4B", "Room 12A", "Conference B", "Large room", "Huddle room 3", "Fishbowl", "Library", "Studio 2"] as const;
const streets = ["W 23rd St", "Lexington Ave", "Court St", "Bedford Ave", "Smith St", "Atlantic Ave", "Broadway", "8th Ave", "Bowery", "Flatbush Ave", "Amsterdam Ave", "Ludlow St"] as const;
const spots = ["Diner", "Coffee", "Noodle Bar", "Bakery", "Taqueria", "Deli", "Wine Bar", "Ramen", "Café"] as const;
const domains = ["meet.roomline.io", "call.halden.app", "join.lattice.video"] as const;
const alerts = ["15 minutes before", "10 minutes before", "At time of event", "30 minutes before", "1 hour before"] as const;
const noteLines = [
  "Agenda in the shared doc. Bring last week's numbers.",
  "Please review the deck before we meet.",
  "Goal: agree on scope and owners for next sprint.",
  "Dial-in below if the video link fails.",
  "Parking is tight, take the train if you can.",
  "We'll record this for folks in other time zones.",
  "Pre-read: the revised proposal, sections 2 and 4.",
  "Quick check-in, no prep needed.",
  "Bring laptop for the walkthrough.",
  "Lunch will be provided.",
] as const;

export type Status = "accepted" | "maybe" | "pending";
export type CalEvent = {
  id: string;
  title: string;
  start: number;
  end: number;
  color: number;
  place: string;
  video: string | null;
  calendar: "Work" | "Home" | "Family";
  host: string;
  attendees: readonly { name: string; status: Status }[];
  notes: string;
  alert: string;
  col: number;
  cols: number;
};

export const personName = (rng: Rng) => `${rng.pick(firstNames)} ${rng.pick(lastNames)}`;
const first = (rng: Rng) => rng.pick(firstNames);
const code = (rng: Rng) => {
  const letters = "abcdefghijkmnopqrstuvwxyz";
  const part = (n: number) => Array.from({ length: n }, () => letters[rng.int(0, letters.length - 1)]).join("");
  return `${part(3)}-${part(4)}-${part(3)}`;
};

type Draft = Omit<CalEvent, "id" | "start" | "end" | "col" | "cols" | "attendees" | "host" | "notes" | "alert"> & { lengths: readonly number[]; people: number };

function workKind(rng: Rng, owner: Owner): Draft {
  const office = owner.work === "Home" ? "Video call" : `${owner.work} · ${rng.pick(rooms)}`;
  const video = () => `${rng.pick(domains)}/${code(rng)}`;
  const kind = rng.int(0, 13);
  const base = { color: 0, calendar: "Work" as const, video: null as string | null, place: office, lengths: [30, 45, 60], people: 4 };
  switch (kind) {
    case 0: return { ...base, title: `1:1 with ${first(rng)}`, lengths: [30], people: 1, video: rng.chance(0.5) ? video() : null };
    case 1: return { ...base, title: `${rng.pick(projects)} standup`, lengths: [15], people: 6, place: "Video call", video: video(), color: 0 };
    case 2: return { ...base, title: `${rng.pick(projects)} sync`, color: 4, people: 5 };
    case 3: { const c = rng.pick(companies); return { ...base, title: `${c} call`, place: "Video call", video: video(), color: 1, people: 4 }; }
    case 4: return { ...base, title: `Interview: ${rng.pick(roles)}`, lengths: [45, 60], color: 3, people: 2 };
    case 5: return { ...base, title: `Design crit: ${rng.pick(projects)}`, lengths: [60], color: 4, people: 6 };
    case 6: return { ...base, title: `${rng.pick(companies)} QBR`, lengths: [60, 90], color: 1, people: 7 };
    case 7: return { ...base, title: "Focus time", lengths: [60, 90, 120], people: 0, place: "Desk", color: 2 };
    case 8: return { ...base, title: `${rng.pick(projects)} retro`, lengths: [45, 60], color: 4, people: 7 };
    case 9: return { ...base, title: `Vendor sync: ${rng.pick(companies)}`, place: "Video call", video: video(), color: 3, people: 3 };
    case 10: return { ...base, title: `Coffee with ${first(rng)}`, lengths: [30], place: `${rng.pick(streets)} ${rng.pick(spots)}`, color: 2, people: 1 };
    case 11: return { ...base, title: "Pipeline review", lengths: [45, 60], color: 1, people: 5 };
    case 12: return { ...base, title: `Budget check-in: ${rng.pick(projects)}`, lengths: [30], color: 3, people: 3 };
    default: return { ...base, title: `Lunch with ${first(rng)}`, lengths: [60], place: `${rng.int(12, 480)} ${rng.pick(streets)}`, color: 2, people: 1 };
  }
}

function personalKind(rng: Rng, owner: Owner, evening: boolean): Draft {
  const base = { color: 3, calendar: "Home" as const, video: null, lengths: [60], people: 0 };
  if (!evening) {
    return rng.pick([
      { ...base, title: "Gym", place: `${owner.home} Fitness` },
      { ...base, title: "Run along the river", place: owner.home },
      { ...base, title: "Drop off dry cleaning", lengths: [15], place: `${rng.int(20, 300)} ${rng.pick(streets)}` },
    ]);
  }
  return rng.pick([
    { ...base, title: `Dinner with ${first(rng)}`, lengths: [90], place: `${rng.pick(streets)} ${rng.pick(spots)}`, people: 1, calendar: "Family" as const, color: 4 },
    { ...base, title: "Dentist: cleaning", place: `${rng.int(100, 900)} ${rng.pick(streets)}, Suite ${rng.int(2, 18)}` },
    { ...base, title: `Pick up ${first(rng)}`, lengths: [30], place: owner.home, calendar: "Family" as const, color: 4 },
    { ...base, title: "Climbing", lengths: [90], place: `${owner.home} Boulders` },
    { ...base, title: `Drinks: ${rng.pick(projects)} team`, lengths: [90], place: `${rng.pick(streets)} ${rng.pick(spots)}`, people: 5 },
  ]);
}

function finish(rng: Rng, draft: Draft, id: string, start: number, owner: Owner): Omit<CalEvent, "col" | "cols"> {
  const host = draft.people > 0 && rng.chance(0.6) ? personName(rng) : `${owner.firstName} ${owner.lastName}`;
  const attendees = Array.from({ length: Math.min(5, draft.people) }, () => ({
    name: personName(rng),
    status: rng.weighted([["accepted", 5], ["maybe", 1], ["pending", 2]] as const),
  }));
  const { lengths, people: _people, ...rest } = draft;
  void _people;
  return {
    ...rest,
    id,
    start,
    end: start + rng.pick(lengths),
    host,
    attendees,
    notes: rng.pick(noteLines),
    alert: rng.pick(alerts),
  };
}

/** Greedy column assignment inside clusters of overlapping events. */
export function layout(raw: readonly Omit<CalEvent, "col" | "cols">[]): CalEvent[] {
  const sorted = [...raw].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: CalEvent[] = [];
  let cluster: CalEvent[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((e) => e.col + 1));
    cluster.forEach((e) => { e.cols = cols; });
    out.push(...cluster);
    cluster = [];
  };
  for (const e of sorted) {
    if (e.start >= clusterEnd && cluster.length) flush();
    const taken = new Set(cluster.filter((c) => c.end > e.start).map((c) => c.col));
    let col = 0;
    while (taken.has(col)) col++;
    cluster.push({ ...e, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  flush();
  return out;
}

/** One person's day: the same for every scene of that day. */
export function buildDay(owner: Owner, day: number): CalEvent[] {
  const rng = createRng(hash(owner.seed, day, "calendar-day"));
  const raw: Omit<CalEvent, "col" | "cols">[] = [];
  if (rng.chance(0.45)) raw.push(finish(rng, personalKind(rng, owner, false), `d${day}-am`, 7 * 60 + rng.pick([0, 15, 30]), owner));
  let t = 9 * 60 + rng.pick([0, 0, 15, 30]);
  let index = 0;
  while (t < 17 * 60 + 30 && index < 9) {
    const ev = finish(rng, workKind(rng, owner), `d${day}-${index}`, t, owner);
    raw.push(ev);
    index++;
    // Sometimes a second event overlaps; usually a gap follows.
    t = rng.chance(0.18) ? t + 15 : ev.end + rng.pick([0, 0, 15, 30, 30, 60]);
  }
  if (rng.chance(0.6)) raw.push(finish(rng, personalKind(rng, owner, true), `d${day}-pm`, 18 * 60 + rng.pick([30, 45, 60, 90]), owner));
  return layout(raw);
}

export type Invite = { id: string; title: string; host: string; day: number; start: number; end: number };

export function buildInvites(seed: number, owner: Owner, day: number): Invite[] {
  const rng = createRng(hash(seed, owner.seed, "invites"));
  return Array.from({ length: 4 }, (_, i) => {
    const draft = workKind(rng, owner);
    const start = rng.int(9, 16) * 60 + rng.pick([0, 30]);
    return { id: `inv-${i}`, title: draft.title, host: personName(rng), day: day + rng.int(1, 6), start, end: start + rng.pick(draft.lengths) };
  });
}

const newTitles = (rng: Rng, owner: Owner) => [
  `Call with ${first(rng)} re: ${rng.pick(projects)}`,
  `${rng.pick(companies)} follow-up`,
  `Prep: ${rng.pick(projects)} review`,
  `Walk-through with ${first(rng)}`,
  `Apartment viewing, ${owner.home}`,
  `Pick up package on ${rng.pick(streets)}`,
];

export function buildNewEvent(seed: number, owner: Owner, clock: number) {
  const rng = createRng(hash(seed, "new-event"));
  const title = rng.pick(newTitles(rng, owner));
  const place = rng.chance(0.5) ? "Video call" : `${rng.int(10, 600)} ${rng.pick(streets)}`;
  const start = Math.ceil((clock + 50) / 30) * 30;
  return { title, place, start, end: start + rng.pick([30, 30, 60]) };
}

/** Day-of-month for a simulated day (day 0 = Monday 5 October 2026, weekends skipped). */
export function dateOf(day: number, weekdayOffset = 0): number {
  const date = 5 + Math.floor(day / 5) * 7 + weekdayOf(day) + weekdayOffset;
  return date > 61 ? date - 61 : date > 31 ? date - 31 : date;
}
