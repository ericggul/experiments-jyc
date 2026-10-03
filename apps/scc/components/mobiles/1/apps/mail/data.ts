import { createRng, hash, type Rng } from "../../model/rng";
import type { Owner } from "../../model/types";

const firstNames = [
  "Maya", "Dev", "Sam", "Lena", "Marcus", "Priya", "Tomás", "Aiko", "Jordan", "Chloe", "Andre", "Rosa", "Nadia", "Owen", "Grace",
  "Leo", "Imani", "Ravi", "Hannah", "Diego", "Mei", "Kofi", "Sofia", "Eli", "Zara", "Theo", "Naomi", "Jamal", "Iris", "Felix",
];
const lastNames = [
  "Okafor", "Patel", "Rivera", "Fischer", "Webb", "Nair", "Herrera", "Tanaka", "Blake", "Bennett", "Washington", "Delgado", "Cohen", "Kim", "Murphy",
  "Goldberg", "Alvarez", "Chen", "O'Neill", "Haddad", "Brooks", "Moreno", "Sato", "Kowalski", "Mensah", "Russo", "Park", "Lindqvist", "Romero", "Gupta",
];
const companies = [
  "Halvorsen Freight", "Brightwater", "Kestrel Foods", "Oakline Health", "Pemberton & Reed", "Vantage Labs", "Marlowe Retail", "Northgate",
  "Sable Energy", "Tidewell Group", "Corbel Studio", "Fairhaven Capital", "Juniper Logistics", "Quarry Media", "Bellwether Insurance", "Ashgrove Partners",
];
const projects = ["Atlas", "Q4 launch", "pricing page", "onboarding revamp", "data migration", "spring campaign", "vendor audit", "mobile checkout", "board deck", "rebrand"];
const docs = ["Q4 deck", "budget model", "launch brief", "roadmap", "SOW", "research readout", "creative brief", "forecast", "hiring plan", "press release"];
const stores = ["Tallow & Pine", "Northfield Outfitters", "Corbel Home", "Ridgeway Shoes", "Mott St Market", "Lumen Optics", "Harbor Coffee Co", "Fieldnote Books", "Greenpoint Cycle", "Union Sq Florals"];
const categories = ["outerwear", "running shoes", "home goods", "fall knits", "coffee gear", "notebooks", "bedding", "sunglasses", "kitchen tools", "plants"];
const restaurants = ["Lucia's on 8th", "Noodle Lab", "the taqueria on Smith", "Pellegrino's", "that ramen place", "Café Ambrose", "Bar Tilde", "the dumpling spot"];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const meetingNames = ["Pipeline review", "Design crit", "Sprint planning", "Budget check-in", "Vendor sync", "Roadmap review", "Hiring loop", "Quarterly business review"];
const fileTypes = [".pdf", ".xlsx", ".docx", ".key"];

export type MailKind = "work" | "client" | "invite" | "promo" | "receipt" | "personal" | "notice";

export type Mail = {
  id: string;
  from: string;
  kind: MailKind;
  subject: string;
  preview: string;
  body: readonly string[];
  /** Minute of day, may be negative (yesterday). */
  time: number;
  unread: boolean;
  vip: boolean;
  flagged: boolean;
  attachment?: { name: string; size: string };
  /** Invite: when and where. Receipt: line items. Promo: headline. */
  invite?: { title: string; when: string; where: string };
  lines?: readonly (readonly [string, string])[];
  headline?: string;
  tint: string;
};

const tints = ["#e8912d", "#2eb67d", "#5b6ee1", "#e0746b", "#7c3aed", "#0f766e", "#c2410c", "#2563eb", "#b45309", "#be185d"];

export const personName = (rng: Rng) => `${rng.pick(firstNames)} ${rng.pick(lastNames)}`;
export const firstOf = (name: string) => name.split(" ")[0];
export const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");

const money = (rng: Rng, lo: number, hi: number) => `$${(rng.int(lo * 100, hi * 100) / 100).toFixed(2)}`;
const clockLabel = (h: number, m: number) => `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;

/** One message of the inbox, built from templates and the seed. */
export function makeMail(seed: number, index: number, owner: Owner, time: number): Mail {
  const rng = createRng(hash(seed, "mail", index));
  const kind = rng.weighted<MailKind>([["work", 5], ["client", 3], ["invite", 2], ["promo", 3], ["receipt", 2], ["personal", 2], ["notice", 1]]);
  const person = personName(rng);
  const company = rng.pick(companies);
  const project = rng.pick(projects);
  const doc = rng.pick(docs);
  const day = rng.pick(weekdays);
  const me = owner.firstName;
  const base = { id: `m${index}`, time, unread: rng.chance(0.5), vip: false, flagged: rng.chance(0.12), tint: rng.pick(tints) };
  switch (kind) {
    case "work": {
      const subject = rng.pick([
        `${doc}: comments by ${day}`, `Re: ${project} timeline`, `${project} kickoff notes`, `Can you review the ${doc}?`,
        `Headcount for ${project}`, `Quick question on the ${doc}`, `Re: ${project} status, week ${rng.int(38, 44)}`, `Fwd: ${company} escalation`,
      ]);
      const ask = rng.pick([
        `Could you take a pass on sections ${rng.int(2, 4)} and ${rng.int(5, 8)} before ${day}?`,
        `We are still missing the numbers from finance, so the ${doc} is on hold until ${day}.`,
        `${company} pushed the date again. I suggested ${day} at ${rng.int(9, 11)} and they have not confirmed.`,
        `I moved the ${project} review to ${day}. Let me know if that conflicts with anything on your side.`,
      ]);
      return {
        ...base, kind, from: person, subject, vip: rng.chance(0.3),
        preview: `Hi ${me}, ${ask}`,
        body: [`Hi ${me},`, ask, rng.pick(["Happy to jump on a call if easier.", "No rush on the formatting, just the logic.", "I flagged the open items in yellow.", "Copying the team so we stay in one thread."]), `Thanks,\n${firstOf(person)}`],
        attachment: rng.chance(0.55) ? { name: `${doc.replace(/ /g, "_")}_v${rng.int(2, 9)}${rng.pick(fileTypes)}`, size: `${(rng.int(3, 98) / 10).toFixed(1)} MB` } : undefined,
      };
    }
    case "client": {
      const subject = rng.pick([
        `${company} renewal: redlines on ${rng.int(2, 9)}.${rng.int(1, 6)}`, `Intro: ${person} (${company})`, `${company} proposal, revised pricing`,
        `${company} QBR deck`, `Re: ${company} invoice ${rng.int(20100, 20999)}`, `${company} contract countersigned`,
      ]);
      const line = rng.pick([
        `Legal reviewed the draft and wants to talk through the liability cap on ${day}.`,
        `Attaching the revised scope. Pricing drops to ${money(rng, 18, 64)}K per quarter if we sign by month end.`,
        `Our team is aligned on the rollout. The only open item is the data retention clause.`,
        `Invoice ${rng.int(20100, 20999)} for ${money(rng, 2, 40)}K is now ${rng.int(7, 30)} days past due.`,
      ]);
      return {
        ...base, kind, from: person, subject, preview: line,
        body: [`Hi ${me},`, line, `Best,\n${person}\n${company}`],
        attachment: rng.chance(0.6) ? { name: `${company.split(" ")[0]}_${rng.pick(["Proposal", "MSA", "Redlines", "QBR"])}${rng.pick(fileTypes)}`, size: `${(rng.int(4, 60) / 10).toFixed(1)} MB` } : undefined,
      };
    }
    case "invite": {
      const title = `${rng.pick(meetingNames)}${rng.chance(0.4) ? `: ${company}` : ""}`;
      const h = rng.int(9, 16);
      const when = `${day}, Oct ${rng.int(5, 30)} · ${clockLabel(h, rng.pick([0, 30]))}`;
      const where = rng.pick([`${owner.work} · Room ${rng.int(2, 9)}${rng.pick(["A", "B", "C"])}`, "Video call", `${company} office`, "Huddle room"]);
      return {
        ...base, kind, from: person, subject: `Invitation: ${title} @ ${when}`, preview: `${person} has invited you. ${where}.`,
        body: [`${firstOf(person)} added a note: ${rng.pick(["Agenda in the doc.", "Bring the latest numbers.", "Short one, promise.", "Can move if needed."])}`],
        invite: { title, when, where },
      };
    }
    case "promo": {
      const store = rng.pick(stores);
      const category = rng.pick(categories);
      const pct = rng.pick([15, 20, 25, 30, 40, 50]);
      const subject = rng.pick([
        `${pct}% off ${category} ends ${day}`, `New arrivals: fall ${category}`, `Your ${rng.int(120, 900)} points expire soon`,
        `Free shipping on ${category} this weekend`, `Back in stock: ${category}`, `${me}, picked for you`,
      ]);
      return {
        ...base, kind, from: store, subject, unread: rng.chance(0.7), preview: `Shop ${category} before it's gone. Members get early access.`,
        body: [`Shop ${category} before it's gone. Members get early access and free returns.`],
        headline: rng.pick([`${pct}% off`, "Just in", "Members only", "Last call"]),
      };
    }
    case "receipt": {
      const store = rng.pick([...stores, "Metro Card Services", "Con Edge Utility", "Gotham Mobile", "Hudson Health Pharmacy"]);
      const items = Array.from({ length: rng.int(2, 4) }, () => [rng.pick(["Wool beanie", "Pour-over kit", "Desk lamp", "Notebook, dotted", "Monthly plan", "Late fee", "Oat milk", "Shipping", "Prescription refill", "Throw pillow"]), money(rng, 3, 90)] as const);
      const subject = rng.pick([`Your order #${rng.int(100000, 999999)} has shipped`, `Receipt from ${store}`, `${store} statement is ready`, `Payment received, thank you`, `Arriving ${day}: your package`]);
      return {
        ...base, kind, from: store, subject, unread: rng.chance(0.4), preview: `${items.length} items · ${items[0][0]} and more. Track or manage your order.`,
        body: [`Thanks for your order, ${me}.`], lines: items,
      };
    }
    case "personal": {
      const subject = rng.pick([
        `${rng.pick(["Dinner", "Drinks", "Lunch", "Brunch"])} ${day}?`, `Photos from ${rng.pick(["the wedding", "Montauk", "Sam's birthday", "the lake house", "Thanksgiving"])}`,
        `${owner.home} apartment, Saturday`, `Re: ${rng.pick(["Lisbon", "Vermont", "Mexico City", "Chicago"])} plans`, `Mom's birthday`, "Did you see this?",
      ]);
      const line = rng.pick([
        `Thinking ${restaurants[rng.int(0, restaurants.length - 1)]} around 7:30. You in?`,
        `Finally uploaded everything. The one of you on the dock is my favorite.`,
        `Flights went up again. If we book by ${day} we keep the cheaper fare.`,
        `Can you call me after work? Nothing urgent.`,
      ]);
      return { ...base, kind, from: person, subject, vip: rng.chance(0.5), preview: line, body: [`Hey ${me}!`, line, `xx ${firstOf(person)}`] };
    }
    default: {
      const subject = rng.pick([
        `${owner.home} building: water off ${day} 10–2`, `Action required: security training by ${day}`, "Your prescription is ready",
        "Library hold available", `People Ops: open enrollment closes ${day}`, `Alternate side parking suspended ${day}`,
      ]);
      return {
        ...base, kind, from: rng.pick(["Building Management", "People Ops", "IT Helpdesk", "Hudson Health Pharmacy", "Brooklyn Public Library", "NYC Notify"]),
        subject, preview: "Please read the details below and reply if you have questions.",
        body: ["Please read the details below and reply if you have questions.", rng.pick(["Thank you for your patience.", "This notice was sent to all residents.", "It takes about 25 minutes."])],
      };
    }
  }
}

/** The inbox, newest first, ending at the scene's start clock. */
export function makeInbox(seed: number, owner: Owner, clock: number, count: number): Mail[] {
  const rng = createRng(hash(seed, "inbox"));
  let time = clock - rng.int(0, 6);
  return Array.from({ length: count }, (_, index) => {
    const mail = makeMail(seed, index, owner, time);
    time -= rng.int(4, 55);
    return mail;
  });
}

/** A quick reply the person types, sized to the message. */
export function replyFor(mail: Mail, owner: Owner, seed: number): string {
  const rng = createRng(hash(seed, mail.id, "reply"));
  const name = firstOf(mail.from);
  const lines = mail.kind === "personal"
    ? [`Yes!! Count me in.`, rng.pick([`I can do 7:30, maybe 8 if the train is slow.`, `Send me the address and I'll be there.`, `Let's do it. I owe you one anyway.`])]
    : [
        rng.pick([`Thanks ${name}, this is helpful.`, `Hi ${name}, thanks for the quick turnaround.`, `Got it, thanks ${name}.`]),
        rng.pick([
          `I'll review tonight and send comments by ${rng.pick(weekdays)} morning.`,
          `Looping in finance so we can close the open items this week.`,
          `${rng.pick(weekdays)} works for me. I'll send an invite for ${rng.pick(["9:30", "10", "11:30", "2", "3:30", "4"])}.`,
          `Agree on the scope. Let's keep the date and revisit pricing after the pilot.`,
        ]),
      ];
  return `${lines.join(" ")}\n\n${owner.firstName}`;
}

export const searchTerms = (mails: readonly Mail[]) => mails.map((mail) => (mail.kind === "client" || mail.kind === "work" ? mail.subject.split(/[ :]/)[0] : firstOf(mail.from)));
