import { createRng, hash, type Rng } from "../../model/rng";
import type { Owner } from "../../model/types";

const firstNames = [
  "Maya", "Dev", "Sam", "Lena", "Marcus", "Priya", "Tomás", "Aiko", "Jordan", "Chloe", "Andre", "Rosa",
  "Nadia", "Owen", "Grace", "Leo", "Imani", "Ravi", "Hannah", "Diego", "Mei", "Kofi", "Sofia", "Eli",
] as const;
const lastNames = [
  "Okafor", "Patel", "Rivera", "Fischer", "Webb", "Nair", "Herrera", "Tanaka", "Blake", "Bennett", "Washington", "Delgado",
  "Cohen", "Kim", "Murphy", "Goldberg", "Alvarez", "Chen", "Haddad", "Brooks", "Moreno", "Sato", "Mensah", "Russo",
] as const;
const teams = ["Growth", "Platform", "Brand", "Sales East", "Ops", "Design", "Data", "Partnerships", "Mobile", "Finance", "Content", "Support"] as const;
const topics = [
  "weekly sync", "Q4 planning", "sprint demo", "design review", "pipeline review", "retro", "roadmap check-in",
  "launch readiness", "budget review", "hiring debrief", "standup", "OKR review",
] as const;
export const companies = [
  "Halvorsen Freight", "Brightwater", "Kestrel Foods", "Oakline Health", "Pemberton & Reed", "Vantage Labs", "Marlowe Retail",
  "Northgate", "Sable Energy", "Tidewell Group", "Corbel Studio", "Larchmont Bank", "Fennimore Media", "Quill & Co",
  "Ashby Logistics", "Greywell Partners", "Juniper Clinics", "Fairmount Studios", "Ironbridge Capital", "Cobalt Yard",
] as const;
const docs = ["the Q4 deck", "the launch brief", "the pricing sheet", "the notes doc", "the roadmap", "the hiring plan", "the research readout", "the budget model"] as const;

export const gradients = [
  "linear-gradient(150deg, #5b6ee1, #2a3270)", "linear-gradient(150deg, #e0746b, #7a2d3c)",
  "linear-gradient(150deg, #3fb6a8, #17585a)", "linear-gradient(150deg, #d9a441, #7a4a1c)",
  "linear-gradient(150deg, #a064d8, #442a7a)", "linear-gradient(150deg, #5aa5d8, #1f4c78)",
  "linear-gradient(150deg, #6fae5a, #2c5a24)", "linear-gradient(150deg, #d46aa0, #6a2350)",
];

export const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");
export const firstOf = (name: string) => name.split(" ")[0];

/** `n` distinct full names (first × last), never the owner. */
export function people(rng: Rng, n: number, exclude: string): string[] {
  const out: string[] = [];
  const firsts = new Set<string>();
  while (out.length < n) {
    const first = rng.pick(firstNames);
    const name = `${first} ${rng.pick(lastNames)}`;
    if (firsts.has(first) || name === exclude || first === firstOf(exclude)) continue;
    firsts.add(first);
    out.push(name);
  }
  return out;
}

export type Meeting = {
  title: string;
  /** roster[0] is the owner; the rest are other people in the room. */
  roster: string[];
  /** Index into roster of the person sharing their screen. */
  presenter: number;
  company: string;
  /** Minutes the meeting had run when the scene started. */
  startedAgo: number;
};

/** The meeting's identity: stable for a scene so every part shows the same room. */
export function meetingOf(seed: number, owner: Owner): Meeting {
  const rng = createRng(hash(seed, "meeting"));
  const me = `${owner.firstName} ${owner.lastName}`;
  const company = rng.pick(companies);
  const title = rng.chance(0.25) ? `${rng.pick(["Client check-in", "Kickoff", "Renewal call", "QBR"])}: ${company}` : `${rng.pick(teams)} ${rng.pick(topics)}`;
  const count = rng.int(6, 9);
  return { title, roster: [me, ...people(rng, count - 1, me)], presenter: 1, company, startedAgo: rng.int(1, 9) };
}

const chatPool: readonly ((m: Meeting, rng: Rng) => string)[] = [
  (m) => `Can someone drop the link to ${docs[m.title.length % docs.length]}?`,
  (m, rng) => `+1 to what ${firstOf(rng.pick(m.roster.slice(1)))} said`,
  () => "Sorry, on the train, staying muted",
  (m) => `Q for after: where are we with ${m.company}?`,
  () => "Is this being recorded?",
  () => "You froze for a sec",
  () => "Have to drop at :45 for another call",
  (_, rng) => `${rng.int(12, 48)}% is better than I expected tbh`,
  () => "Notes doc is updated",
  () => "Can you zoom in on the second chart?",
  (m, rng) => `Thanks ${firstOf(rng.pick(m.roster.slice(1)))}!`,
  () => "Let's park that and take it offline",
  (_, rng) => `go/${rng.pick(["q4-plan", "launch", "pricing", "okrs", "roadmap", "hiring"])}`,
  () => "Echo on someone's mic",
  (_, rng) => `Agree, ship ${rng.pick(["Tuesday", "Wednesday", "Thursday", "after the freeze"])}`,
  () => "Who owns the follow-up?",
  (_, rng) => `I can take ${rng.pick(["the summary", "the vendor email", "the next slide", "action items"])}`,
  (m) => `${m.company} wants numbers by Friday`,
  () => "Someone's mic is on 🙂",
  (_, rng) => `${rng.pick(["Great", "Love", "Nice"])} work on the ${rng.pick(["dashboard", "deck", "demo", "copy", "research"])}`,
  () => "Can we get 5 min at the end for hiring?",
  (_, rng) => `Running ${rng.int(2, 8)} min late to the next one`,
];

export type ChatLine = { id: number; who: string; text: string; minute: number };

export function chatLines(seed: number, m: Meeting, n: number, startMinute: number): ChatLine[] {
  const rng = createRng(hash(seed, "chat"));
  let minute = startMinute;
  return Array.from({ length: n }, (_, id) => {
    minute += rng.int(0, 2);
    return { id, who: rng.pick(m.roster.slice(1)), text: rng.pick(chatPool)(m, rng), minute };
  });
}

export type Slide =
  | { kind: "bars"; title: string; sub: string; labels: string[]; values: number[] }
  | { kind: "bullets"; title: string; items: string[] }
  | { kind: "kpi"; title: string; tiles: { label: string; value: string; delta: number }[] }
  | { kind: "sheet"; title: string; rows: { account: string; stage: string; arr: number; close: number }[] }
  | { kind: "doc"; title: string; paras: string[] }
  | { kind: "roadmap"; title: string; rows: { label: string; month: string; status: "done" | "on track" | "at risk" }[] };

export const slideCost: Record<Slide["kind"], number> = { bars: 80, bullets: 70, kpi: 78, sheet: 128, doc: 76, roadmap: 82 };

const metrics = ["Net new ARR", "Weekly active users", "Support tickets", "Trial conversions", "Signups", "Churned accounts", "Gross margin", "Pipeline added"] as const;
const bulletPool = [
  "Ship onboarding v2 behind a flag", "Close {c} before the holiday freeze", "Hire two senior engineers", "Cut p95 latency under 300 ms",
  "Move standup to async on Fridays", "Refresh the brand guidelines", "Retire the legacy billing flow", "Expand pilot to Brooklyn stores",
  "Renegotiate the {c} contract", "Launch the referral program", "Audit every dashboard we pay for", "Weekly office hours with Support",
  "Localize checkout for Canada", "Run five customer interviews a week", "Publish the Q4 roadmap internally", "Ship dark mode on mobile",
];
const docParas = [
  "We propose moving the launch to the second week of November so {c} can finish their integration testing.",
  "Usage grew steadily after the September release, driven mostly by teams in New York and Chicago.",
  "Risks: the vendor timeline is tight, and we still need legal sign-off on the data processing terms.",
  "Open question: do we price per seat or per workspace? Finance prefers seats; Sales prefers workspaces.",
  "Next steps are owned in the tracker. Please add comments by Thursday so we can lock scope.",
  "Customer feedback was consistent: setup takes too long and the export is hard to find.",
  "Budget stays flat, but we move two contractors to the platform team through the end of Q1.",
  "The pilot with {c} ended with 41 of 50 seats active after four weeks.",
];
const milestones = ["Beta to 20 accounts", "Pricing page live", "SOC 2 audit", "Mobile release", "Partner API", "Holiday campaign", "Data migration", "New onboarding"] as const;
const months = ["Oct", "Nov", "Dec", "Jan", "Feb"] as const;
const stages = ["Discovery", "Proposal", "Legal", "Verbal", "Closed"] as const;

function sample<T>(rng: Rng, items: readonly T[], n: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return out;
}

/** Slide `index` of the deck this meeting is presenting. */
export function slideOf(seed: number, index: number, m: Meeting): Slide {
  const rng = createRng(hash(seed, "slide", index));
  const kind = rng.weighted<Slide["kind"]>([["bars", 3], ["bullets", 3], ["kpi", 2], ["sheet", 2], ["doc", 2], ["roadmap", 2]]);
  const c = (text: string) => text.replace("{c}", m.company);
  if (kind === "bars") {
    const metric = rng.pick(metrics);
    const byWeek = rng.chance(0.5);
    const labels = byWeek ? ["W36", "W37", "W38", "W39", "W40", "W41"] : ["Q1", "Q2", "Q3", "Q4 fcst"];
    let v = rng.int(20, 50);
    const values = labels.map(() => (v = Math.max(8, v + rng.int(-6, 12))));
    return { kind, title: `${metric} by ${byWeek ? "week" : "quarter"}`, sub: `${m.company} · ${rng.pick(["all regions", "New York", "self-serve", "enterprise"])}`, labels, values };
  }
  if (kind === "bullets") return { kind, title: rng.pick(["Priorities this quarter", "What we heard", "Decisions needed", "Next two weeks", "Asks for this group"]), items: sample(rng, bulletPool, 4).map(c) };
  if (kind === "kpi") {
    return {
      kind,
      title: rng.pick(["Where we landed", "Scorecard", "Week in numbers", "Launch, day 7"]),
      tiles: sample(rng, metrics, 3).map((label) => ({ label, value: rng.chance(0.5) ? `${rng.int(12, 96)}.${rng.int(0, 9)}K` : `${rng.int(3, 74)}%`, delta: rng.int(-9, 24) })),
    };
  }
  if (kind === "sheet") {
    return {
      kind,
      title: rng.pick(["Pipeline", "Renewals", "Q4 forecast", "Top accounts"]),
      rows: sample(rng, companies, 17).map((account) => ({ account, stage: rng.pick(stages), arr: rng.int(40, 480), close: rng.int(1, 28) })),
    };
  }
  if (kind === "doc") return { kind, title: rng.pick(["Launch plan, draft 3", "Proposal: pricing change", "Research readout", "Postmortem: checkout outage"]), paras: sample(rng, docParas, 6).map(c) };
  return {
    kind,
    title: rng.pick(["Roadmap", "Milestones", "Delivery plan"]),
    rows: sample(rng, milestones, 5).map((label, i) => ({ label, month: months[Math.min(months.length - 1, i)], status: rng.weighted([["done", 2], ["on track", 3], ["at risk", 1]] as const) })),
  };
}
