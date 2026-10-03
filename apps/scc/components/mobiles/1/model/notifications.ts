/**
 * Pushes for one phone's day: cues the plan emits at its transitions (the
 * phone dictates the next scene), an ambient Poisson stream shaped by the
 * archetype and what the screen is doing, and simultaneous global events.
 * All copy is fictional US English set in New York; no real brand names.
 */
import { catalogue, type AppId } from "./catalogue.ts";
import { basePushesPerHour, personas, type Persona, type Weighted } from "./personas.ts";
import { createRng, hash, type Rng } from "./rng.ts";
import { formatTime } from "./time.ts";
import type { Minute, Owner, Push, Scene } from "./types.ts";

export type CueKind =
  | "digest" | "screen-time" | "transit-delay" | "traffic" | "meeting" | "ping" | "delivery-out" | "delivery-here"
  | "ride" | "courier-offer" | "earnings" | "purchase" | "reservation" | "school" | "sick-kid" | "baby" | "drinks";

/** A push the plan asks for at a transition. */
export type Cue = { kind: CueKind; at: Minute; app?: AppId; label?: string; start?: Minute; end?: Minute };

export type GlobalKind = "breaking" | "weather" | "outage" | "alert" | "update";
export type GlobalEvent = { id: string; kind: GlobalKind; at: Minute; app: AppId; title: string; body: string };

// ---------------------------------------------------------------------------
// Copy pools

const friends = ["Maya", "Jordan", "Priya", "Marcus", "Dani", "Leah", "Theo", "Imani", "Sam", "Nico", "Grace", "Omar", "Rosa", "Kenji", "Tess", "Andre", "Zoe", "Eli", "Bianca", "Hugo"];
const family = ["Mom", "Dad", "Grandma", "Auntie Rose", "Big Sis", "Uncle Ray"];
const groups = ["Brunch Club", "Apt 4R", "Fantasy League", "Cousins", "College Crew", "Thursday Trivia", "Book Club (we don't read)", "Family", "Soccer Sundays", "Bachelorette Planning"];
const groupLines = [
  "are we still on for 7?", "who's bringing the speaker", "LMAO", "can someone pay me back for the cake", "running 10 min late",
  "the L is a disaster again", "did anyone see that??", "ok I'm outside", "sending the address now", "wait what happened",
  "vote: tacos or ramen", "happy birthday!!!", "reminder rent is due friday", "this is so us", "I can't tonight, next week?",
];
const dmLines = [
  "call me when you're free", "did you eat?", "omw", "what time does it start", "lol yes", "can you grab milk on the way",
  "Are you up?", "thinking about you", "the super said the heat will be fixed tomorrow", "this made me think of you",
  "sending you the link", "how'd it go??", "you left your charger here",
];
const channels = ["#general", "#design", "#launch-q4", "#marketing", "#sales-team", "#random", "#product", "#eng-oncall", "#client-success", "#announcements"];
const workLines = [
  "@{first} can you take a look before 2?", "quick q when you have a sec", "Pushed the new version, lmk", "deck is in the drive",
  "who owns this?", "+1 to what Dana said", "moving standup to 10:15 today", "@channel reminder: timesheets due today",
  "can we hop on a quick call?", "@{first} client is asking about the timeline", "shipping this today 🚢", "approved ✅",
];
const mailSenders: readonly (readonly [string, string, string])[] = [
  ["Jessica Park", "Re: Q4 deck — final comments", "Looping in Dan. Can we lock the numbers by end of day?"],
  ["Facilities", "Elevator maintenance on 14", "Elevator B will be out of service Thursday from 7 AM to noon."],
  ["Rewards Team", "Your October statement is ready", "View your statement and payment due date."],
  ["Kevin Ortiz", "Contract redlines", "Attached are legal's edits. Two open items on page 6."],
  ["HR", "Open enrollment ends Friday", "Review your benefits elections before October 9."],
  ["Building Management", "Water shutoff notice", "Water will be off Wednesday 10 AM–2 PM for riser work."],
  ["Lena Fischer", "Following up", "Just bumping this to the top of your inbox."],
  ["Calendar", "Invitation: Q4 Planning", "Thursday 2 PM–3 PM · Conference Room 6B"],
];
const headlines = [
  "City Council passes bill capping delivery app fees", "Subway ridership hits highest level since 2019, officials say",
  "Rent for Brooklyn one-bedrooms reaches a record $3,850", "Fed holds rates steady, signals one more cut this year",
  "Heat wave expected to break by Thursday night", "Mayor unveils plan for 12 new protected bike lanes",
  "Ferry service to expand to the Bronx next spring", "Stocks slide as tech earnings disappoint",
  "Water main break floods streets in Midtown", "Bridge tolls to rise 6% in January",
];
const handles = ["maya.creates", "jordan_eats_nyc", "priya.p", "the.l.train.diaries", "dani_runs", "brooklynbites", "sam.makes.things", "nico.film", "tess_in_queens", "rooftop.rosa"];
const merchants = ["Bluebird Coffee", "Ninth St. Deli", "Golden Wok", "Greenleaf Market", "Corner Bodega", "Lucky Laundromat", "Marigold Kitchen", "Little Saigon", "Halal Cart on 6th", "Pharmacy Plus"];
const restaurants = ["Little Saigon", "Golden Wok", "Marigold Kitchen", "Nonna's Slice", "Taqueria Luna", "Bowl & Grain", "Bombay Express", "Sakura Sushi"];
const products = ["Noise-Cancelling Headphones", "Wool Overcoat", "Air Fryer XL", "Running Shoes", "Linen Sheet Set", "Standing Desk Mat"];
const lines = ["L", "A", "C", "4", "5", "6", "7", "N", "Q", "R", "F", "G", "2", "3", "J"];
const roads = ["Cross Bronx Expy", "BQE", "FDR Dr", "Major Deegan Expy", "Hutchinson River Pkwy", "Garden State Pkwy"];
const teachers = ["Ms. Alvarez · Grade 3", "Mr. Okafor · Grade 5", "PTA", "Ms. Chen · Kindergarten"];
const schoolLines = [
  "Reminder: picture day is Thursday. Please send the signed form.", "Early dismissal Friday at 12:30.",
  "Field trip permission slips are due tomorrow.", "Lost and found is overflowing — please check for jackets!",
];

const fill = (text: string, owner: Owner) => text.replace("{first}", owner.firstName);
const money = (rng: Rng, low: number, high: number) => `$${rng.range(low, high).toFixed(2)}`;
const plate = (rng: Rng) => `${String.fromCharCode(65 + rng.int(0, 25), 65 + rng.int(0, 25), 65 + rng.int(0, 25))} ${rng.int(1000, 9999)}`;

type Copy = { app: AppId; title: string; body: string; subtitle?: string };

// ---------------------------------------------------------------------------
// Ambient kinds

type Kind = "group" | "dm" | "family" | "work-chat" | "mail" | "news" | "bank" | "photo" | "video" | "shopping" | "code" | "weather" | "social" | "courier" | "school" | "baby";

function ambientCopy(kind: Kind, rng: Rng, owner: Owner, at: Minute): Copy {
  switch (kind) {
    case "group": return { app: "messages", title: rng.pick(groups), subtitle: rng.pick(friends), body: rng.pick(groupLines) };
    case "dm": return { app: "messages", title: rng.pick(friends), body: rng.pick(dmLines) };
    case "family": return { app: "messages", title: rng.pick(family), body: rng.pick(dmLines) };
    case "work-chat": return { app: "team-chat", title: rng.pick(channels), subtitle: rng.pick(friends), body: fill(rng.pick(workLines), owner) };
    case "mail": {
      const [from, subject, body] = rng.pick(mailSenders);
      return { app: "mail", title: from, subtitle: subject, body };
    }
    case "news": return { app: "news", title: at < 600 ? "Morning Briefing" : "Top Story", body: rng.pick(headlines) };
    case "bank": return rng.chance(0.5)
      ? { app: "bank", title: "Purchase Alert", body: `A ${money(rng, 3, 60)} card purchase at ${rng.pick(merchants)} was approved.` }
      : { app: "bank", title: "Balance Alert", body: `Your checking balance is below $${rng.pick([100, 200, 250])}.` };
    case "photo": return { app: "photo-feed", title: "Frame", body: rng.pick([
      `${rng.pick(handles)} liked your photo.`, `${rng.pick(handles)} and ${rng.int(3, 40)} others liked your reel.`,
      `${rng.pick(handles)} started a live video.`, `${rng.pick(handles)} mentioned you in a comment.`,
    ]) };
    case "video": return { app: "short-video", title: "Loop", body: rng.pick([
      `${rng.pick(handles)} posted a new video`, `${rng.pick(handles)} replied to your comment`, "Your video is getting views 👀", "Trending near you: Bushwick",
    ]) };
    case "shopping": return { app: "shopping", title: "Cart", body: rng.pick([
      `Price drop: ${rng.pick(products)} now ${money(rng, 39, 199)}`, "Out for delivery: arriving by 8 PM", "Your package was delivered", `Only 2 left: ${rng.pick(products)}`,
    ]) };
    case "code": return { app: "messages", title: String(rng.int(20000, 89999)), body: `Your verification code is ${rng.int(100000, 999999)}. Don't share it with anyone.` };
    case "weather": return { app: "weather", title: "Weather", body: rng.pick(["Rain starting around 4 PM.", "High 61°, low 49°. Breezy this afternoon.", "Clear skies all day. High 68°."]) };
    case "social": return { app: "social-manager", title: "Queue", body: rng.pick([
      `Comments are up ${rng.int(12, 80)}% on today's post`, "Your 2:00 PM post is scheduled", `${rng.int(4, 30)} new comments need a reply`, "Engagement report is ready",
    ]) };
    case "courier": return { app: "courier", title: "Drop", body: rng.pick(["Busy near you: Midtown East · +$2.50 per trip", "Peak pay is live in Downtown Brooklyn", "Rate your last drop-off"]) };
    case "school": return { app: "school", title: rng.pick(teachers), body: rng.pick(schoolLines) };
    case "baby": return { app: "baby", title: "Little", body: rng.pick(["Feeding due: last feed was 2h 50m ago.", "Nap started 40 min ago.", "Room temperature is 74°F."]) };
  }
}

function ambientWeights(persona: Persona, minute: Minute, atWork: boolean): Weighted<Kind> {
  const surfaces = persona.work.surfaces;
  const teamChat = surfaces.some(([ref]) => ref.startsWith("team-chat"));
  const hour = minute / 60;
  return [
    ["group", 4], ["dm", 3], ["family", 1], ["news", hour < 10 ? 3 : 1.4], ["photo", 2], ["video", 1.2], ["shopping", 1.1],
    ["bank", 0.5], ["code", 0.4], ["weather", hour >= 5 && hour < 9 ? 1.2 : 0],
    ["work-chat", teamChat ? (atWork ? 7 : 0.6) : 0],
    ["mail", atWork ? 4 : 0.9],
    ["social", persona.id === "social-manager" ? 5 : 0],
    ["courier", persona.id === "gig-courier" && atWork ? 3 : 0],
    ["school", persona.id === "suburban-parent" ? 1 : 0],
    ["baby", persona.id === "new-parent" ? 2.5 : 0],
  ];
}

// ---------------------------------------------------------------------------
// Cues

function cueCopy(cue: Cue, rng: Rng, owner: Owner): Copy {
  switch (cue.kind) {
    case "digest": return ambientCopy(rng.weighted<Kind>([["group", 4], ["dm", 2], ["news", 3], ["mail", 2], ["photo", 2], ["shopping", 1], ["bank", 1]]), rng, owner, cue.at);
    case "screen-time": return { app: "screen-time", title: "Weekly Report Available", body: `Your screen time was up ${rng.int(4, 22)}% last week, for an average of ${rng.int(4, 8)} hours, ${rng.int(2, 58)} minutes a day.` };
    case "transit-delay": {
      const line = rng.pick(lines);
      return { app: "transit", title: `${line} Train Delays`, body: `${line} trains are running with delays in both directions while crews address a signal problem.` };
    }
    case "traffic": return { app: "navigation", title: "Heavy traffic ahead", body: `Delays of ${rng.int(8, 25)} min on the ${rng.pick(roads)}. You're still on the fastest route.` };
    case "meeting": return { app: "calendar", title: `${cue.label ?? "Meeting"} in 5 minutes`, body: `${formatTime(cue.start ?? cue.at + 5)} – ${formatTime(cue.end ?? cue.at + 35)} · Video call` };
    case "ping": {
      const app = cue.app ?? "messages";
      if (app === "team-chat") return ambientCopy("work-chat", rng, owner, cue.at);
      if (app === "mail") return ambientCopy("mail", rng, owner, cue.at);
      if (app === "social-manager") return ambientCopy("social", rng, owner, cue.at);
      if (app === "calendar") return { app: "calendar", title: "Updated invitation", body: `${rng.pick(friends)} moved "Sync" to ${formatTime(cue.at + 60)}` };
      if (app === "photo-feed") return ambientCopy("photo", rng, owner, cue.at);
      if (app === "short-video") return ambientCopy("video", rng, owner, cue.at);
      if (app === "news") return ambientCopy("news", rng, owner, cue.at);
      if (app === "shopping") return ambientCopy("shopping", rng, owner, cue.at);
      if (app === "baby") return ambientCopy("baby", rng, owner, cue.at);
      return ambientCopy(rng.chance(0.5) ? "dm" : "group", rng, owner, cue.at);
    }
    case "delivery-out": return { app: "food-delivery", title: "Your order is on the way", body: `${rng.pick(friends)} picked up your order from ${rng.pick(restaurants)}. Arriving around ${formatTime(cue.at + rng.int(9, 16))}.` };
    case "delivery-here": return { app: "food-delivery", title: "Your order has arrived", body: "Your courier left it at the door. Enjoy!" };
    case "ride": return { app: "ride-hail", title: `Your driver is ${rng.int(2, 6)} min away`, body: `Look for ${rng.pick(friends)} in a gray sedan · ${plate(rng)}` };
    case "courier-offer": return { app: "courier", title: `New offer · ${money(rng, 6, 16)}`, body: `${rng.range(0.6, 3.4).toFixed(1)} mi · Pick up at ${rng.pick(restaurants)} · ${rng.int(3, 9)} min away` };
    case "earnings": return { app: "courier", title: "Today's earnings", body: `${money(rng, 90, 210)} · ${rng.int(10, 22)} deliveries` };
    case "purchase": return { app: "bank", title: "Purchase Approved", body: `${money(rng, 4, cue.label === "dinner" ? 140 : 24)} at ${cue.label === "dinner" ? rng.pick(restaurants) : rng.pick(merchants)}` };
    case "reservation": return { app: "reservation", title: "Reservation today", body: `Table for ${rng.int(2, 4)} at ${rng.pick(restaurants)}, ${formatTime(cue.at + 20)}. See you soon.` };
    case "school": return { app: "school", title: rng.pick(teachers), body: rng.pick(schoolLines) };
    case "sick-kid": return { app: "school", title: "Nurse's Office", body: "Your child isn't feeling well. Please call the front office." };
    case "baby": return { app: "baby", title: "Sound detected", body: `Crying in Nursery · ${formatTime(cue.at)}` };
    case "drinks": return { app: "messages", title: rng.pick(groups), subtitle: rng.pick(friends), body: "drinks at the usual spot at 6?? 🍻" };
  }
}

// ---------------------------------------------------------------------------
// Global events

const globalCopy: Record<GlobalKind, (rng: Rng, rain: boolean) => { app: AppId; title: string; body: string }> = {
  breaking: (rng) => ({ app: "news", title: "Breaking News", body: rng.pick(headlines) }),
  weather: (_rng, rain) => rain
    ? { app: "weather", title: "Flash Flood Warning", body: "In effect for New York County until 9:00 PM. Avoid flooded roads and subway stairs." }
    : { app: "weather", title: "Air Quality Alert", body: "Unhealthy for sensitive groups until 11:00 PM. Limit time outdoors." },
  outage: () => ({ app: "team-chat", title: "Desk is having connection issues", body: "Messages may be delayed. We're working on a fix." }),
  alert: () => ({ app: "system-sheet", title: "Emergency Alert", body: "This is a test of the Wireless Emergency Alert system. No action is required." }),
  update: () => ({ app: "system-sheet", title: "Software Update", body: "Version 27.1 can be installed tonight. Plug in and connect to Wi-Fi to update." }),
};

const globalWindows: Record<GlobalKind, readonly [Minute, Minute]> = {
  weather: [7 * 60 + 15, 8 * 60 + 20],
  outage: [10 * 60 + 30, 15 * 60 + 30],
  alert: [14 * 60 + 10, 14 * 60 + 30],
  breaking: [9 * 60, 20 * 60 + 30],
  update: [21 * 60, 22 * 60],
};

/** Three to five events that land at the same minute on every phone, from (seed, day). */
export function globalEvents(seed: number, day: number, rain: boolean): GlobalEvent[] {
  const rng = createRng(hash("global", seed, day));
  const kinds: GlobalKind[] = ["breaking", "update"];
  const extras: GlobalKind[] = ["weather", "outage", "alert", "breaking"];
  const extraCount = rng.int(1, 3);
  for (let i = 0; i < extraCount; i++) kinds.push(extras.splice(rng.int(0, extras.length - 1), 1)[0]);
  return kinds
    .map((kind, index) => {
      const [low, high] = globalWindows[kind];
      return { id: `g${day}-${kind}-${index}`, kind, at: rng.int(low, high), ...globalCopy[kind](rng, rain) };
    })
    .sort((a, b) => a.at - b.at);
}

// ---------------------------------------------------------------------------
// Composition

export type PushContext = {
  owner: Owner;
  day: number;
  scenes: readonly Scene[];
  cues: readonly Cue[];
  globals: readonly GlobalEvent[];
  /** Awake windows: before `tailEnd`, and from `wake` to `sleep` (absolute, may pass 1440). */
  tailEnd: Minute;
  wake: Minute;
  sleep: Minute;
  work: readonly [Minute, Minute] | null;
  pushMultiplier: number;
  notificationRate: number;
  /** 1 − sameness: regular spacing at 0, Poisson at 1. */
  spread: number;
};

const activity: Record<string, number> = { system: 0.6, commute: 0.8, work: 1.25, life: 1, feeds: 0.9 };

export function composePushes(context: PushContext): Push[] {
  const { owner, day, scenes, cues, globals, tailEnd, wake, sleep, work, notificationRate, spread } = context;
  const persona = personas[owner.archetype];
  const rng = createRng(hash("push", owner.seed, day));
  const pushes: Push[] = [];
  let counter = 0;
  const add = (at: Minute, copy: Copy) => {
    pushes.push({ id: `${owner.id}:${day}:n${counter++}`, at, ...copy });
  };
  const awake = (minute: Minute) => minute < tailEnd || (minute >= wake && minute < sleep);

  if (notificationRate > 0) {
    for (const cue of cues) {
      if (cue.at < 0 || cue.at >= 1440) continue;
      if (!awake(cue.at) && cue.kind !== "baby") continue;
      if (notificationRate < 1 && cue.kind !== "baby" && rng.next() > notificationRate) continue;
      if (cue.kind === "digest") {
        const count = Math.round((4 + rng.next() * 10 * spread + 5 * (1 - spread)) * persona.pushRate * Math.min(notificationRate, 2));
        for (let i = 0; i < count; i++) add(cue.at, cueCopy(cue, rng, owner));
      } else add(cue.at, cueCopy(cue, rng, owner));
    }

    // Ambient stream: integrate intensity minute by minute, emit at unit crossings.
    const perMinute = (basePushesPerHour / 60) * persona.pushRate * context.pushMultiplier * notificationRate;
    const nextGap = () => 1 - spread + spread * -Math.log(1 - rng.next());
    let accumulated = 0;
    let threshold = nextGap() * 0.5;
    for (const scene of scenes) {
      const factor = scene.app === "off" ? 1 : activity[catalogue[scene.app].group];
      for (let minute = scene.start; minute < scene.end; minute++) {
        if (!awake(minute)) continue;
        const late = minute >= 22 * 60 || minute < 5 * 60 ? 0.6 : 1;
        accumulated += perMinute * factor * late;
        if (accumulated < threshold) continue;
        accumulated -= threshold;
        threshold = nextGap();
        const atWork = work !== null && minute >= work[0] && minute < work[1];
        add(minute, ambientCopy(rng.weighted(ambientWeights(persona, minute, atWork)), rng, owner, minute));
      }
    }
  }

  for (const event of globals) {
    pushes.push({ id: `${owner.id}:${event.id}`, at: event.at, app: event.app, title: event.title, body: event.body, globalId: event.id });
  }
  return pushes.sort((a, b) => a.at - b.at);
}
