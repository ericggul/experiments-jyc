import { createRng, hash, type Rng } from "../../model/rng";
import { formatClock } from "../../model/time";
import type { Owner } from "../../model/types";

/** Seeded content for the team-chat clone: people, channels and messages built combinatorially. */

const firstNames = [
  "Maya", "Dev", "Sam", "Lena", "Marcus", "Priya", "Tomás", "Aiko", "Jordan", "Chloe", "Andre", "Rosa", "Nadia", "Owen",
  "Grace", "Leo", "Imani", "Ravi", "Hannah", "Diego", "Mei", "Kofi", "Sofia", "Eli", "Zara", "Theo", "Naomi", "Jamal",
];
const lastNames = [
  "Okafor", "Patel", "Rivera", "Fischer", "Webb", "Nair", "Herrera", "Tanaka", "Blake", "Bennett", "Washington", "Delgado",
  "Cohen", "Kim", "Murphy", "Goldberg", "Alvarez", "Chen", "Haddad", "Brooks", "Moreno", "Sato", "Kowalski", "Mensah",
];
const prefixes = ["eng", "design", "proj", "team", "ops", "growth", "data", "cs", "mktg"];
const topics = [
  "checkout", "onboarding", "q4-launch", "mobile", "billing", "search", "infra", "brand", "partnerships", "hiring",
  "analytics", "pricing", "support", "notifications", "payments", "web", "retention",
];
const fixedChannels = ["general", "random", "announcements", "nyc-office", "standup", "incidents", "wins", "lunch-crew"];
const projects = ["Atlas", "Juniper", "Northstar", "Harbor", "Maple", "Orbit", "Cobalt", "Fern", "Beacon", "Quartz", "Lantern", "Tundra"];
const companies = [
  "Halvorsen Freight", "Brightwater", "Kestrel Foods", "Oakline Health", "Pemberton & Reed", "Vantage Labs",
  "Marlowe Retail", "Northgate Co", "Sable Energy", "Tidewell Group", "Corbel Studio", "Larkspur Bank",
];
const services = ["auth-api", "search-index", "payments", "notifier", "edge-cache", "billing-worker", "export-svc", "feed-ranker"];
const ticketKeys = ["ENG", "WEB", "MOB", "OPS", "DATA", "PAY"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const roles = ["senior designer", "staff engineer", "data analyst", "product manager", "support lead"];
const floors = ["the 12th floor", "the 4th floor", "the big room", "the cafe area"];
const domains = ["wiki.halden.dev", "tracker.northgate.io", "docs.cobalt.app", "status.tidewell.net", "notes.larkspur.co", "board.fernhq.com"];
const docs = ["roadmap", "spec", "budget", "research", "deck", "contract", "launch-plan", "retro", "brief", "forecast"];
const exts = [["pdf", "#e01e5a"], ["xlsx", "#2eb67d"], ["docx", "#2563eb"], ["png", "#7c3aed"], ["csv", "#0f766e"]] as const;
export const reactions = ["👀", "✅", "🎉", "🙏", "🔥", "😂", "💯", "👍", "🙌", "😬"];

const lines = [
  "Standup notes for {d} are in the doc, {p} is still on track.",
  "{c} pushed the review to {h}. Can someone own the prep?",
  "PR for {t} is up, would love eyes before {h}.",
  "Heads up: deploy freeze for {p} starts at {h}.",
  "{@} do we have the numbers from {c} yet?",
  "Shipped {t} to staging. Smoke tests are green.",
  "Who has context on the {p} billing edge case?",
  "Moved the {p} retro to {d}, same room on {f}.",
  "Latency on {s} is back under {n}ms after the rollback.",
  "Draft of the {c} proposal is ready for comments.",
  "Can we get a quick sync on {p} before {h}?",
  "Customer from {c} reported the export bug again, filed {t}.",
  "Great work on the {p} demo yesterday, {c} loved it.",
  "Heads down until {h}, ping me if it's urgent.",
  "Lunch order for the {p} offsite closes at {h}.",
  "{@} can you take a look at the copy for the {p} launch email?",
  "Flagging that {t} might slip to {d}.",
  "New dashboard for {p} is live, link below.",
  "The {s} alert fired twice overnight, looking into it.",
  "{me} owns the summary slide for {c}, thanks!",
  "OOO {d} afternoon, {@} is covering {p}.",
  "Do we still need the room booked for {c} at {h}?",
  "Quick poll: move the {p} weekly to {d}?",
  "Approved the Q4 budget for {p}, details in the sheet.",
  "Merged. {t} goes out with the {h} release.",
  "Can someone from design check the empty states on {p}?",
  "Interview loop for the {r} role is set for {d}.",
  "Reminder: all-hands at {h} on {f}.",
  "{@} the {c} contract came back with redlines on section {n2}.",
  "Rolling back {s}, error rate spiked to {n2}%.",
];
const replyLines = [
  "On it.", "Looking now.", "+1, same on my end.", "Thanks, that helps a lot.", "Can do after lunch.", "Let me check with {@}.",
  "Done, updated the doc.", "Works for me.", "Pushed a fix, try again?", "I think that was {@}'s change.", "Agreed, keep it simple.",
  "Sounds good, I'll update {t}.", "Can we pair on it at {h}?", "Nice catch.", "Adding it to the {p} board.",
];
const drafts = [
  "Taking this one, will update by {h}.", "Looked at it, the fix is in {t}.", "Thanks all, I'll share notes after the {c} call.",
  "Can we push this to {d}? Slammed today.", "Joining in 5, coming from {w}.", "Approved. Ship it after the {h} freeze.",
  "I can own the {p} follow-up.",
];
const dmLines = [
  "you around for a quick call?", "lunch at the place on 8th?", "did {c} ever reply?", "running late, train stuck near {home}",
  "can you look at my PR when you get a sec", "lol did you see #random", "thanks for covering earlier!", "are we still on for {h}?",
  "coffee run, want anything?", "sending the deck now", "ok that meeting could've been an email", "heading back to {w} after this",
  "is {t} yours or mine?", "can you intro me to someone at {c}?", "ugh, {p} standup ran 40 min", "free at {h} for 10?",
];
const issues = ["export times out", "duplicate charges on retry", "push not delivered", "search returns stale rows", "login loop on iPad", "CSV headers shifted"];

export type Msg = {
  id: number;
  who: string;
  at: number;
  text: string;
  react?: readonly (readonly [string, number])[];
  file?: { name: string; size: string; color: string; ext: string };
  code?: readonly string[];
  unfurl?: { site: string; title: string; desc: string };
  replies?: number;
  pending?: boolean;
};

export type Channel = { id: number; name: string; unread: boolean; mentions: number; members: number };
export type Dm = { id: number; name: string; on: boolean; unread: boolean };

export type World = {
  workspace: string;
  people: readonly string[];
  channels: readonly Channel[];
  dms: readonly Dm[];
  owner: Owner;
};

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const firstOf = (name: string) => name.split(" ")[0];

export function makeWorld(seed: number, owner: Owner): World {
  const rng = createRng(hash(seed, "desk-world"));
  const people = shuffle(rng, firstNames).slice(0, 12).map((first) => `${first} ${rng.pick(lastNames)}`);
  const names = new Set<string>();
  const pool = [...shuffle(rng, fixedChannels).slice(0, 3)];
  while (pool.length < 9) {
    const name = `${rng.pick(prefixes)}-${rng.pick(topics)}`;
    if (!names.has(name)) pool.push(name);
    names.add(name);
  }
  const channels = pool.map((name, id) => ({
    id,
    name,
    unread: rng.chance(0.5),
    mentions: rng.chance(0.3) ? rng.int(1, 4) : 0,
    members: rng.int(6, 140),
  }));
  const dms = people.slice(0, 6).map((name, id) => ({ id, name, on: rng.chance(0.6), unread: rng.chance(0.35) }));
  const workspace = owner.work === "Home" ? `${rng.pick(projects)} Studio` : `${rng.pick(projects)} ${owner.work}`;
  return { workspace, people, channels, dms, owner };
}

/** Fills {slots} in a template line. */
function fill(rng: Rng, template: string, world: World, clock: number): string {
  const time = clock + rng.int(10, 240);
  return template.replace(/\{(@|me|p|c|t|d|h|s|n|n2|f|r|w|home)\}/g, (_, slot: string) => {
    switch (slot) {
      case "@": return `@${firstOf(rng.pick(world.people))}`;
      case "me": return `@${world.owner.firstName}`;
      case "p": return rng.pick(projects);
      case "c": return rng.pick(companies);
      case "t": return `${rng.pick(ticketKeys)}-${rng.int(1200, 4800)}`;
      case "d": return rng.pick(days);
      case "h": return formatClock(Math.round(time / 15) * 15);
      case "s": return rng.pick(services);
      case "n": return String(rng.int(8, 30) * 10);
      case "n2": return String(rng.int(2, 9));
      case "f": return rng.pick(floors);
      case "r": return rng.pick(roles);
      case "w": return world.owner.work === "Home" ? "home" : world.owner.work;
      default: return world.owner.home;
    }
  });
}

function code(rng: Rng): string[] {
  const svc = rng.pick(services);
  const n = rng.int(2, 9);
  return rng.pick([
    [`const retries = ${n};`, `await client.post("/${svc}", { retries });`],
    ["SELECT count(*) FROM orders", `WHERE region = 'NYC' AND day > '2026-10-0${n}';`],
    [`git checkout -b fix/${rng.pick(ticketKeys).toLowerCase()}-${rng.int(1200, 4800)}`, `pnpm test --filter ${svc}`],
    [`if (p95 > ${n * 100}) {`, `  page("${svc}");`, "}"],
    [`kubectl rollout restart deploy/${svc}`],
    [`export const ${rng.pick(projects).toUpperCase()}_ENABLED = ${rng.chance(0.5)};`],
    [`curl -s https://${svc}.internal/health`, `{"status":"degraded","lag":${n * 13}}`],
  ]);
}

/** A run of channel messages, oldest first, ending just before `clock`. */
export function channelMessages(seed: number, world: World, clock: number, count: number): Msg[] {
  const rng = createRng(hash(seed, "desk-msgs"));
  const speakers = shuffle(rng, world.people).slice(0, 5);
  const out: Msg[] = [];
  let at = clock - rng.int(count * 2, count * 5);
  for (let id = 0; id < count; id++) {
    at += rng.int(1, 6);
    const msg: Msg = { id, who: rng.chance(0.12) ? `${world.owner.firstName} ${world.owner.lastName}` : rng.pick(speakers), at, text: fill(rng, rng.pick(lines), world, clock) };
    const extra = rng.weighted([["none", 5], ["file", 1.3], ["code", 1.2], ["unfurl", 1.3]] as const);
    if (extra === "file") {
      const [ext, color] = rng.pick(exts);
      msg.file = { name: `${rng.pick(projects)}_${rng.pick(docs)}_v${rng.int(2, 9)}.${ext}`, size: `${(rng.int(2, 480) / 10).toFixed(1)} MB`, color, ext };
    } else if (extra === "code") {
      msg.code = code(rng);
    } else if (extra === "unfurl") {
      const project = rng.pick(projects);
      msg.unfurl = rng.pick([
        { site: rng.pick(domains), title: `${project}: ${rng.pick(docs)} for ${rng.pick(companies)}`, desc: `Last edited by ${firstOf(rng.pick(world.people))} · ${rng.int(3, 40)} comments` },
        { site: rng.pick(domains), title: `${rng.pick(ticketKeys)}-${rng.int(1200, 4800)}: ${rng.pick(issues)}`, desc: `${rng.pick(["Open", "In review", "Blocked"])} · Priority P${rng.int(1, 3)}` },
        { site: rng.pick(domains), title: `${rng.pick(services)} incident review`, desc: `${rng.int(4, 38)} min of elevated errors on ${rng.pick(days)}` },
      ]);
    }
    if (rng.chance(0.35)) {
      const first = rng.int(0, reactions.length - 1);
      msg.react = rng.chance(0.5)
        ? [[reactions[first], rng.int(1, 9)], [reactions[(first + rng.int(1, 5)) % reactions.length], rng.int(1, 4)]]
        : [[reactions[first], rng.int(1, 12)]];
    }
    if (rng.chance(0.25)) msg.replies = rng.int(2, 14);
    out.push(msg);
  }
  return out;
}

export function replyMessages(seed: number, world: World, parentAt: number, count: number): Msg[] {
  const rng = createRng(hash(seed, "desk-replies"));
  return Array.from({ length: count }, (_, id) => ({ id, who: rng.pick(world.people), at: parentAt + 2 + id * rng.int(1, 4), text: fill(rng, rng.pick(replyLines), world, parentAt) }));
}

export function draftText(seed: number, world: World, clock: number): string {
  const rng = createRng(hash(seed, "desk-draft"));
  return fill(rng, rng.pick(drafts), world, clock);
}

export function dmMessages(seed: number, world: World, partner: string, clock: number, count: number): Msg[] {
  const rng = createRng(hash(seed, "desk-dm"));
  const me = `${world.owner.firstName} ${world.owner.lastName}`;
  let at = clock - rng.int(count * 3, count * 8);
  return Array.from({ length: count }, (_, id) => {
    at += rng.int(1, 7);
    return { id, who: rng.chance(0.45) ? me : partner, at, text: fill(rng, rng.pick(dmLines), world, clock) };
  });
}

export function mentionRows(seed: number, world: World, clock: number, count: number) {
  const rng = createRng(hash(seed, "desk-mentions"));
  let ago = rng.int(2, 9);
  return Array.from({ length: count }, (_, id) => {
    ago += rng.int(4, 50);
    const channel = rng.pick(world.channels);
    return { id, who: rng.pick(world.people), channel: channel.id, name: channel.name, at: clock - ago, text: fill(rng, rng.pick(lines), world, clock).replace(/^/, `@${world.owner.firstName} `) };
  });
}

export function huddleChat(seed: number, world: World, names: readonly string[], clock: number, count: number): Msg[] {
  const rng = createRng(hash(seed, "desk-huddle-chat"));
  const quick = [
    "can you share the link?", "you're on mute {@}", "sharing in a sec", "dropping the doc here", "brb 2 min", "+1 to that",
    "can everyone see my screen?", "{t} is the one", "let's take it offline", "noting this for the {p} doc", "audio cut out for me",
  ];
  return Array.from({ length: count }, (_, id) => ({ id, who: rng.pick(names), at: clock - count + id, text: fill(rng, rng.pick(rng.chance(0.5) ? quick : replyLines), world, clock) }));
}
