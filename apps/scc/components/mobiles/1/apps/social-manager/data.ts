import { createRng, hash, type Rng } from "../../model/rng";

/** Fictional networks the queue publishes to. */
export const channels = [
  { id: "chirp", name: "Chirp", fg: "#0b5cad", bg: "#d7e9ff", limit: 280 },
  { id: "frame", name: "Frame", fg: "#9b2a6b", bg: "#fbdcee", limit: 2200 },
  { id: "loop", name: "Loop", fg: "#7a3d00", bg: "#ffe5c4", limit: 2200 },
  { id: "pro", name: "Pro", fg: "#14523a", bg: "#d4f0e2", limit: 3000 },
] as const;
export type Channel = (typeof channels)[number];

const firsts = [
  "Maya", "Dev", "Sam", "Lena", "Marcus", "Priya", "Tomás", "Aiko", "Jordan", "Chloe", "Andre", "Rosa", "Nadia", "Owen", "Grace",
  "Leo", "Imani", "Ravi", "Hannah", "Diego", "Mei", "Kofi", "Sofia", "Eli", "Zara", "Theo", "Naomi", "Jamal", "Iris", "Felix",
];
const lasts = [
  "Okafor", "Patel", "Rivera", "Fischer", "Webb", "Nair", "Herrera", "Tanaka", "Blake", "Bennett", "Washington", "Delgado", "Cohen", "Kim", "Murphy",
  "Goldberg", "Alvarez", "Chen", "Haddad", "Brooks", "Moreno", "Sato", "Kowalski", "Mensah", "Russo", "Park", "Lindqvist", "Romero", "Gupta", "Shah",
];
export const clients = [
  "Brightwater", "Kestrel Foods", "Oakline Health", "Marlowe Retail", "Halden Studio", "Tidewell", "Pemberton & Reed", "Sable Coffee",
  "Northgate Bikes", "Corbel Home", "Lumen Optics", "Harbor Bakery", "Fieldnote Books", "Ridgeway Shoes",
];
const products = ["oat milk latte", "fall jacket", "cold brew kit", "canvas tote", "trail runner", "candle set", "2027 planner", "ceramic mug", "rain shell", "maple granola", "desk lamp", "sourdough loaf"];
const hoods = ["Williamsburg", "the West Village", "Astoria", "Park Slope", "SoHo", "Fort Greene", "Long Island City", "the Lower East Side", "Harlem", "DUMBO", "Greenpoint", "Chelsea"];
const events = ["our fall webinar", "the launch livestream", "Founders Night", "the holiday market", "a panel on creator pay", "the open studio", "a tasting night"];
const campaigns = ["the Q4 launch", "Fall Edit", "Project Lantern", "the city guide", "Small Batch Week", "the rebrand", "Made in Queens"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const roles = ["Senior product designer", "Community manager", "Video editor", "Copywriter", "Growth analyst", "Store lead"];
const tips = ["batch your approvals on Monday mornings", "post Reels before 9 a.m.", "reply to every comment in the first hour", "keep captions under 125 characters", "recycle your top post from last quarter"];
const metrics = ["onboarding time", "returns", "wait times", "support tickets", "delivery costs"];

type Slots = { rng: Rng; client: string };
const postTemplates: ((s: Slots) => string)[] = [
  ({ rng }) => `Meet the team behind ${rng.pick(campaigns)}. Three months of work, one very tired designer.`,
  ({ rng, client }) => `New on the blog: how ${client} cut ${rng.pick(metrics)} by ${rng.int(12, 48)}%.`,
  ({ rng }) => `Our fall ${rng.pick(products)} is live. Swing by ${rng.pick(hoods)} this ${rng.pick(days)}.`,
  ({ rng }) => `Reminder: ${rng.pick(events)} is ${rng.pick(days)} at ${rng.int(1, 7)}pm ET. Link in bio.`,
  ({ rng }) => `Behind the scenes at the ${rng.pick(campaigns).replace("the ", "")} shoot in ${rng.pick(hoods)}.`,
  ({ rng }) => `We hit ${rng.int(12, 98)}k followers. Thank you. Giveaway details inside.`,
  ({ rng }) => `Hiring: ${rng.pick(roles)}, hybrid in New York. DM us or apply via the link.`,
  ({ rng }) => `Tip of the week: ${rng.pick(tips)}.`,
  ({ rng }) => `The ${rng.pick(products)} is back in stock. Limited run, ships ${rng.pick(days)}.`,
  ({ rng }) => `Pop-up in ${rng.pick(hoods)} this ${rng.pick(days)}, noon to close. Bring a friend.`,
  ({ rng }) => `Poll: ${rng.pick(products)} or ${rng.pick(products)}? Wrong answers only.`,
  ({ rng }) => `Thank you ${rng.pick(hoods)}! ${rng.int(120, 900)} of you came through on ${rng.pick(days)}.`,
];

export type Post = { id: string; copy: string; client: string; channel: Channel; at: number; ready: boolean; likes: number; reach: number; comments: number; tint: number };

export const tints = ["#c7d7f5", "#f5d0c7", "#cfe8d4", "#efe1b8", "#dccff2", "#c9e6ec"];

export function makePost(seed: number, index: number, at: number): Post {
  const rng = createRng(hash(seed, "post", index));
  const client = rng.pick(clients);
  const copy = rng.pick(postTemplates)({ rng, client });
  return {
    id: `p${index}`,
    copy,
    client,
    channel: rng.pick(channels),
    at,
    ready: rng.chance(0.6),
    likes: rng.int(40, 4800),
    reach: rng.int(1800, 96_000),
    comments: rng.int(2, 240),
    tint: rng.int(0, tints.length - 1),
  };
}

const commentTemplates: ((rng: Rng) => string)[] = [
  (rng) => `Love this! When does the ${rng.pick(products)} ship?`,
  (rng) => `Is the ${rng.pick(products)} available in ${rng.pick(["Jersey City", "Hoboken", "Philly", "Boston"])} yet?`,
  () => "Pricing page says something different, can you clarify?",
  () => "Great thread, bookmarking for my team.",
  (rng) => `Still waiting on a reply to my DM from ${rng.pick(days)}.`,
  () => "Who designed the cover? It looks amazing.",
  (rng) => `Will you be in ${rng.pick(hoods)} again soon?`,
  () => "Link in bio is broken for me.",
  (rng) => `Ordered the ${rng.pick(products)} last week, still no tracking number.`,
  (rng) => `Saw this at ${rng.pick(events)}, so good 🙌`,
  () => "Do you ship to the Bronx?",
  (rng) => `Can I bring my dog to the ${rng.pick(hoods)} pop-up?`,
];
const replyTemplates: ((first: string, rng: Rng) => string)[] = [
  (first, rng) => `Thanks ${first}! It ships ${rng.pick(days)}, link in bio.`,
  (first) => `Hi ${first}, so sorry about that. Sending you a DM now.`,
  (first, rng) => `Yes! We're back in ${rng.pick(hoods)} next ${rng.pick(days)} ${first}.`,
  (first) => `Good catch ${first}, fixed the link. Thank you!`,
  (first) => `${first} that means a lot, passing it on to the team 💛`,
  (first) => `Checking with our ops team now ${first}, hang tight.`,
];

export type Comment = { id: string; name: string; handle: string; text: string; reply: string; channel: Channel; age: number; post: string; mention: boolean };

export function makeComment(seed: number, index: number, age: number): Comment {
  const rng = createRng(hash(seed, "comment", index));
  const first = rng.pick(firsts);
  const last = rng.pick(lasts);
  return {
    id: `c${index}`,
    name: `${first} ${last}`,
    handle: `${first.toLowerCase().replace("á", "a")}.${last.toLowerCase()}`,
    text: rng.pick(commentTemplates)(rng),
    reply: rng.pick(replyTemplates)(first, rng),
    channel: rng.pick(channels),
    age,
    post: rng.pick(postTemplates)({ rng, client: rng.pick(clients) }),
    mention: rng.chance(0.3),
  };
}

export const ranges = [
  { id: "7", label: "7 days", points: 7 },
  { id: "30", label: "30 days", points: 15 },
  { id: "90", label: "90 days", points: 13 },
] as const;
export type Range = (typeof ranges)[number];

export const boroughs = ["Brooklyn", "Manhattan", "Queens", "Jersey City", "The Bronx"];

const hues = ["#e8912d", "#2eb67d", "#5b6ee1", "#e0746b", "#7c3aed", "#0f766e", "#c2410c", "#2563eb"];
export const colorOf = (name: string) => hues[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % hues.length];
export const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");
export const compact = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(0)}K` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
