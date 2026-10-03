import { Icon, NavBar, Storyboard, ios, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash, type Rng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./messages.module.css";

/* ------------------------------------------------------------------ content */

const firstNames = [
  "Maya", "Dev", "Rosa", "Jordan", "Tasha", "Sam", "Nina", "Eli", "Priya", "Marcus", "Lena", "Theo", "Dana", "Chris", "Amara", "Ben",
  "Keisha", "Omar", "Hannah", "Luis", "Grace", "Raj", "Ivy", "Mateo", "Zoe", "Andre", "Lily", "Kenji", "Sofia", "Noah", "Ava", "Dmitri",
  "Fatima", "Jamal", "Chloe", "Wes", "Mina", "Gabe", "Tess", "Yusuf",
];
const lastNames = [
  "Chen", "Patel", "Alvarez", "Reyes", "Brooks", "Okafor", "Kowalski", "Rosen", "Nair", "Webb", "Fischer", "Park", "Whitfield", "Delgado",
  "Obi", "Silver", "Moreno", "Kim", "Haddad", "Russo", "Nguyen", "Santos", "Murphy", "Levy", "Osei", "Lindqvist", "Ortiz", "Shah",
];
const family = ["Mom", "Dad", "Grandma", "Aunt Rita", "Uncle Joe"];
const groupHeads = ["Brunch", "Soccer Thursday", "Book Club", "Roof", "Apt 4C", "Cousins", "Run Club", "Trivia", "Bachelorette", "Fantasy", "Work Besties", "Ski Trip"];
const groupTails = ["Crew", "Chat", "Squad", "🔥", "Gang", "2026", "Planning", ""];
const placeA = ["Little", "Golden", "Blue", "Corner", "Second", "Old", "Lucky", "Wild", "Silver", "Hungry", "Quiet", "Red"];
const placeB = ["Fig", "Anchor", "Owl", "Lantern", "Pearl", "Spoon", "Garden", "Fox", "Kettle", "Harbor", "Crow", "Mill"];
const foods = ["dumplings", "tacos", "ramen", "pizza", "pho", "bagels", "falafel", "dosa", "oysters", "bibimbap", "khachapuri", "hot pot"];
const dishes = ["burrata", "spicy vodka rigatoni", "short rib", "fish tacos", "cacio e pepe", "pork buns", "the brisket", "lamb kofta"];
const trains = ["the L", "the G", "the 6", "the A", "the Q", "the 7", "the F", "the J", "the 2", "the N"];
const days = ["Saturday", "Sunday", "Friday", "next weekend", "Thursday"];
const docs = ["deck", "Q4 forecast", "client memo", "launch plan", "budget sheet", "offsite agenda"];
const times = ["7", "7:30", "8", "6:45", "8:30", "noon", "1"];
const linkSites = ["citybites.news", "thegridnyc.com", "weekendlist.co", "metrodesk.org", "slowfood.blog"];
const linkTitles = [
  "The {n} best {food} spots in {hood}", "Why everyone is lining up for {food} in {hood}", "Every free concert in the parks this month",
  "{train} weekend service changes, explained", "This {hood} apartment has a secret garden", "A walking tour of {hood} in {n} stops",
];
const emojis = ["❤️", "👍", "😂", "‼️", "❓", "👎"];
const photoTints = [
  "linear-gradient(160deg, #f6d365, #fda085)", "linear-gradient(160deg, #84fab0, #8fd3f4)", "linear-gradient(160deg, #a18cd1, #fbc2eb)",
  "linear-gradient(160deg, #30cfd0, #330867)", "linear-gradient(160deg, #fddb92, #d1fdff)", "linear-gradient(160deg, #ff9a9e, #fecfef)",
  "linear-gradient(160deg, #43e97b, #38f9d7)", "linear-gradient(160deg, #667eea, #764ba2)",
];
const shades = ["#8e8e93", "#7d8aa5", "#a0836b", "#6f9c8e", "#9a7fb0", "#b0787a", "#7396b8", "#8c9a6b"];

type Topic = "plans" | "work" | "family" | "home" | "group";
const lines: Record<Topic, { them: readonly string[]; me: readonly string[] }> = {
  plans: {
    them: [
      "are we still on for {food} tonight?", "{place} at {time}?", "I can grab a table", "they have a waitlist now 🙄", "ok I put our name down",
      "should I invite {friend}?", "lol", "running 10 behind, {train} is a mess", "they're out of the {dish} 😭", "I'm by the bar",
      "wait which entrance", "found it!!", "you're gonna love this place", "it's so loud in here haha", "ok see you soon",
    ],
    me: [
      "yes!! {time} works", "omw", "{train} is crawling", "save me a seat", "order me the {dish}", "be there in 5", "just got off at {hood}",
      "is it cash only?", "perfect", "walking in now", "I see you", "sorry sorry sorry", "worth the wait honestly",
    ],
  },
  work: {
    them: [
      "did the {doc} go out?", "{friend} wants one more pass on slide {n}", "can you hop on a call at {time}?", "shared the folder with you",
      "approved 🙌", "client moved the meeting to {time}", "are you in the {work} office today?", "legal signed off", "quick q about the {doc}",
      "nice work on this", "can we push to tomorrow?", "I'll take the first half",
    ],
    me: [
      "sending in 5", "on it", "yes, joining now", "in the office till {time}", "just fixed slide {n}", "thanks for flagging",
      "let's do {time}", "can you send the latest version?", "done ✅", "will review on {train}",
    ],
  },
  family: {
    them: [
      "Did you eat yet", "What did you eat", "Call me when you're home", "Grandma says hi", "Are you coming {day}?", "I made too much {food}",
      "Did you see the photos", "Your cousin got engaged!!", "Wear a jacket it's cold", "Love you", "Your father wants to know about the game",
      "Are you sleeping enough",
    ],
    me: [
      "Yes Mom", "{food}", "Will call tonight", "Hi Grandma!!", "Yes, {day} works", "Save me some", "So pretty", "WHAT", "I'm fine", "Love you too",
      "Busy week but ok",
    ],
  },
  home: {
    them: [
      "did you pay the electric bill?", "super is coming at {time}", "we're out of oat milk", "package at the front desk for you",
      "the radiator is banging again", "can you move your bike lol", "I'm making {food}, want some?", "rent is due friday", "someone took our laundry",
      "heading out, need anything?",
    ],
    me: [
      "paid it this morning", "ok I'll be home", "grabbing some on the way", "thank you!!", "ugh again", "moving it now", "yes please",
      "venmo'd you", "classic", "toilet paper pls",
    ],
  },
  group: {
    them: [
      "who's in for {day}?", "I'm in", "can't, work thing", "{place}?", "ok poll: {food} or {food2}", "{food2} obviously",
      "booking for 6 at {time}", "send the address", "lmao", "wait who's bringing the speaker", "I'll bring snacks", "omg yes",
      "the {train} isn't running fyi", "rain plan??", "this is the best group chat",
    ],
    me: ["in!", "{food} 100%", "I can host", "bringing wine", "see you all there", "lol stop", "I'll take the {train} up", "same", "yes", "I'm so ready"],
  },
};

const pickFrom = <T,>(rng: Rng, items: readonly T[]) => items[rng.int(0, items.length - 1)];
const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");
const shade = (name: string) => shades[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % shades.length];
const firstOf = (name: string) => name.split(" ")[0];

function fill(template: string, rng: Rng, owner: Owner, friend: string): string {
  return template
    .replace("{food2}", pickFrom(rng, foods))
    .replace("{food}", pickFrom(rng, foods))
    .replace("{place}", `${pickFrom(rng, placeA)} ${pickFrom(rng, placeB)}`)
    .replace("{time}", pickFrom(rng, times))
    .replace("{train}", pickFrom(rng, trains))
    .replace("{dish}", pickFrom(rng, dishes))
    .replace("{day}", pickFrom(rng, days))
    .replace("{doc}", pickFrom(rng, docs))
    .replace("{friend}", firstOf(friend))
    .replace("{hood}", rng.chance(0.5) ? owner.home : owner.work)
    .replace("{work}", owner.work === "Home" ? "Midtown" : owner.work)
    .replace("{n}", String(rng.int(3, 21)));
}

/* -------------------------------------------------------------------- model */

type Kind = "text" | "photo" | "link" | "voice";
type Line = {
  id: string;
  from: "me" | "them";
  sender: string;
  kind: Kind;
  text: string;
  tapback?: string;
  tint?: string;
  /** Estimated rendered height in pt, for scroll targets. */
  h: number;
};
type Thread = {
  id: string;
  name: string;
  members?: readonly string[];
  topic: Topic;
  lines: Line[];
};

const textHeight = (text: string) => Math.max(1, Math.ceil(text.length / 27)) * 22 + 15;

function makeThread(rng: Rng, owner: Owner, id: string, name: string, topic: Topic, members?: readonly string[]): Thread {
  const count = rng.int(16, 22);
  const out: Line[] = [];
  let from: "me" | "them" = rng.chance(0.6) ? "them" : "me";
  let run = 0;
  for (let i = 0; i < count; i++) {
    if (run >= rng.int(1, 3)) {
      from = from === "me" ? "them" : "me";
      run = 0;
    }
    run++;
    const sender = from === "me" ? owner.firstName : members ? pickFrom(rng, members) : name;
    const roll = rng.next();
    const kind: Kind = i < 2 ? "text" : roll < 0.08 ? "photo" : roll < 0.13 ? "link" : roll < 0.18 && from === "them" ? "voice" : "text";
    const text =
      kind === "link" ? fill(pickFrom(rng, linkTitles), rng, owner, sender)
      : kind === "voice" ? `0:${String(rng.int(4, 48)).padStart(2, "0")}`
      : fill(pickFrom(rng, lines[topic][from]), rng, owner, members ? pickFrom(rng, members) : name);
    const previous = out[out.length - 1];
    const gap = previous && previous.from !== from ? 7 : 0;
    const label = members && from === "them" && (!previous || previous.sender !== sender) ? 15 : 0;
    const body = kind === "photo" ? 184 : kind === "link" ? 214 : kind === "voice" ? 44 : textHeight(text);
    out.push({
      id: `${id}-${i}`,
      from,
      sender,
      kind,
      text,
      tapback: rng.chance(0.14) ? pickFrom(rng, emojis) : undefined,
      tint: kind === "photo" || kind === "link" ? pickFrom(rng, photoTints) : undefined,
      h: body + 2 + gap + label,
    });
  }
  return { id, name, members, topic, lines: out };
}

function pickNames(rng: Rng, count: number, taken: Set<string>): string[] {
  const out: string[] = [];
  while (out.length < count) {
    const name = `${pickFrom(rng, firstNames)} ${pickFrom(rng, lastNames)}`;
    const first = firstOf(name);
    if (taken.has(first)) continue;
    taken.add(first);
    out.push(name);
  }
  return out;
}

type ListRow = { id: string; name: string; members?: readonly string[]; preview: string; at: number; unread: boolean };

type Model = {
  threads: Thread[];
  rows: ListRow[];
  shots: Shot[];
  /** Typing windows (simulated minutes) for the live composer. */
  typing: { start: number; end: number; text: string }[];
  /** Photo shown in the viewer, per photo visit. */
  photo?: Line;
  total: number;
};

const STAMP = 34;
const VIEWPORT = 844 - 144 - 90;
/** Centre of the pinned avatars on the list (pt). */
const PIN_Y = 246;
const PIN_X = [83, 195, 307];

/** Scroll that brings line `k` (exclusive) to the bottom of the thread viewport. */
function revealTo(thread: Thread, k: number) {
  let height = STAMP;
  for (let i = 0; i < Math.min(k, thread.lines.length); i++) height += thread.lines[i].h;
  return Math.max(0, Math.round(height + 12 - VIEWPORT));
}

/**
 * The whole session as data: threads, list rows, shots and typing windows.
 * Cheap enough to recompute each tick for the live composer.
 */
function plan({ seed, duration, clock, owner, view }: ScreenProps): Model {
  const rng = createRng(hash(seed, owner.seed, "messages"));
  const taken = new Set<string>([owner.firstName]);
  const people = pickNames(rng, 14, taken);
  const kin = pickFrom(rng, family);
  const groupName = rng.chance(0.3) ? `${owner.home} Neighbors` : `${pickFrom(rng, groupHeads)} ${pickFrom(rng, groupTails)}`.trim();
  const groupMembers = pickNames(rng, 4, taken);
  const firstTopic = rng.weighted<Topic>([["plans", 3], ["work", owner.work === "Home" ? 1 : 3], ["home", 2]]);
  const threads = [
    makeThread(rng, owner, "t0", people[0], firstTopic),
    makeThread(rng, owner, "t1", groupName, "group", groupMembers),
    makeThread(rng, owner, "t2", kin, "family"),
  ];
  // The list: the three threads near the top, everyone else below.
  const rows: ListRow[] = [];
  let at = clock - rng.int(0, 3);
  const order = [threads[1], threads[0], threads[2]];
  order.forEach((thread, index) => {
    const last = thread.lines[Math.min(thread.lines.length - 1, 6)];
    const preview = last.kind === "photo" ? "Attachment: 1 Image" : last.kind === "voice" ? "Audio Message" : last.text;
    rows.push({ id: thread.id, name: thread.name, members: thread.members, preview: thread.members ? `${firstOf(last.sender)}: ${preview}` : preview, at, unread: index < 2 });
    at -= rng.int(3, 25);
  });
  people.slice(1, 11).forEach((name, index) => {
    const topic = rng.pick<Topic>(["plans", "home", "work", "plans"]);
    rows.push({ id: `p${index}`, name, preview: fill(pickFrom(rng, lines[topic][rng.chance(0.5) ? "me" : "them"]), rng, owner, name), at, unread: false });
    at -= rng.int(20, 160);
  });

  const total = Math.max(4, duration);
  const shots: Shot[] = [];
  const typing: Model["typing"] = [];
  const shown = threads.map(() => rng.int(4, 6));
  let t = 0;
  let listScroll = 0;
  let current = view === "conversation" ? 0 : -1;
  let visits = 0;
  let photo: Line | undefined;
  const gap = () => rng.range(1.3, 2.1);

  if (current < 0) {
    listScroll = rng.int(40, 110);
    shots.push({ panel: "list", at: 0, scroll: listScroll, flicks: 2, enter: "cut" });
  } else {
    shots.push({ panel: "t0", at: 0, scroll: revealTo(threads[0], shown[0]), flicks: 2, enter: "cut" });
  }
  let steps = 0;
  while (t < total) {
    t += gap();
    if (current < 0) {
      // On the list: open the next thread (tap its row).
      const next = visits % threads.length;
      const rowIndex = order.indexOf(threads[next]);
      shown[next] += 2;
      shots.push({ panel: threads[next].id, at: t, scroll: revealTo(threads[next], shown[next]), flicks: 2, enter: "push", tap: { x: PIN_X[rowIndex], y: PIN_Y - listScroll } });
      current = next;
      visits++;
      steps = 0;
      continue;
    }
    const thread = threads[current];
    steps++;
    const done = shown[current] >= thread.lines.length || steps > rng.int(3, 5);
    if (done) {
      listScroll = rng.int(0, 110);
      shots.push({ panel: "list", at: t, enter: "pop", scroll: listScroll, tap: { x: 24, y: 76 } });
      current = -1;
      continue;
    }
    // A photo just revealed: open it, then come back.
    const fresh = thread.lines.slice(Math.max(0, shown[current] - 3), shown[current]);
    const pic = !photo ? fresh.find((line) => line.kind === "photo") : undefined;
    if (pic) {
      photo = pic;
      shots.push({ panel: "photo", at: t, enter: "fade", tap: { x: pic.from === "me" ? 260 : 130, y: 560 } });
      t += gap();
      shots.push({ panel: thread.id, at: t, enter: "fade", tap: { x: 32, y: 76 } });
      continue;
    }
    const nextMe = thread.lines.findIndex((line, index) => index >= shown[current] && line.from === "me");
    if (nextMe >= 0 && nextMe - shown[current] <= 1 && thread.lines[nextMe].kind === "text") {
      // The person replies: a typing window, then the sent bubble scrolls in.
      const length = Math.max(1.4, Math.min(3, thread.lines[nextMe].text.length / 14));
      typing.push({ start: t - 0.4, end: t + length, text: thread.lines[nextMe].text });
      t += length;
      shown[current] = nextMe + 1;
      shots.push({ panel: thread.id, at: t, scroll: revealTo(thread, shown[current]), tap: { x: 362, y: 559 } });
      continue;
    }
    shown[current] = Math.min(thread.lines.length, shown[current] + rng.int(1, 3));
    shots.push({ panel: thread.id, at: t, scroll: revealTo(thread, shown[current]), flicks: rng.int(1, 2) });
  }
  return { threads, rows, shots, typing, photo, total };
}

/* ------------------------------------------------------------------- render */

function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(${shade(name)}, #6c6c72)` }}>
      {initials(name)}
    </span>
  );
}

function GroupAvatar({ names }: { names: readonly string[] }) {
  const spots = [{ top: 0, left: 0 }, { top: 4, left: 18 }, { top: 18, left: 8 }];
  return (
    <span className={styles.group}>
      {names.slice(0, 3).map((name, index) => (
        <span key={index} className={styles.avatar} style={{ ...spots[index], background: `linear-gradient(${shade(name)}, #6c6c72)` }}>{initials(name)}</span>
      ))}
    </span>
  );
}

function dayLabel(at: number, clock: number) {
  if (at >= 0 && clock - at < 1) return "Now";
  if (at >= 0) return formatTime(at);
  return ["Yesterday", "Sunday", "Saturday", "10/1/26"][Math.min(3, Math.floor(-at / 1440))];
}

function ListBody({ rows, clock }: { rows: readonly ListRow[]; clock: number }) {
  const pinned = rows.slice(0, 3);
  return (
    <>
      <NavBar title="Messages" large leading={<span className={styles.edit}>Edit</span>} trailing={<Icon name="compose" size={23} stroke={1.9} className={styles.compose} />}>
        <div className={styles.search}><Icon name="search" size={16} stroke={2.2} />Search</div>
      </NavBar>
      <div className={styles.pins}>
        {pinned.map((row) => (
          <div key={row.id} className={styles.pin}>
            {row.unread && <span className={styles.pinDot} />}
            <Avatar name={row.members ? row.members[0] : row.name} size={86} />
            {firstOf(row.name)}
          </div>
        ))}
      </div>
      {rows.slice(3).map((row) => (
        <div key={row.id} className={styles.row}>
          <span className={styles.dotCell}>{row.unread && <i className={styles.dot} />}</span>
          {row.members ? <GroupAvatar names={row.members} /> : <Avatar name={row.name} size={50} />}
          <div className={styles.rowBody}>
            <span className={styles.name}>{row.name}</span>
            <span className={styles.time}>{dayLabel(row.at, clock)}</span>
            <span className={styles.preview}>{row.preview}</span>
          </div>
        </div>
      ))}
    </>
  );
}

function Bubble({ line, previous, following, group }: { line: Line; previous?: Line; following?: Line; group: boolean }) {
  const tail = following?.from !== line.from;
  return (
    <div className={styles.line} data-from={line.from} data-gap={!!previous && previous.from !== line.from}>
      {group && line.from === "them" && previous?.sender !== line.sender && <span className={styles.sender}>{line.sender}</span>}
      {line.kind === "photo" ? (
        <div className={styles.photo} style={{ background: line.tint }}>{line.tapback && <span className={styles.tapback}>{line.tapback}</span>}</div>
      ) : line.kind === "link" ? (
        <div className={styles.link}>
          <span className={styles.linkArt} style={{ background: line.tint }} />
          <b>{line.text}</b>
          <small>{linkSites[line.text.length % linkSites.length]}</small>
        </div>
      ) : line.kind === "voice" ? (
        <div className={styles.bubble} data-from={line.from} data-tail={tail}>
          <span className={styles.voice}><Icon name="play" size={14} filled stroke={0} /><i />{line.text}</span>
        </div>
      ) : (
        <div className={styles.bubble} data-from={line.from} data-tail={tail}>
          {line.tapback && <span className={styles.tapback}>{line.tapback}</span>}
          {line.text}
        </div>
      )}
    </div>
  );
}

function ThreadBody({ thread, start, clock, readAt }: { thread: Thread; start: number; clock: number; readAt: number }) {
  const lastMe = thread.lines.reduce((found, line, index) => (line.from === "me" ? index : found), -1);
  return (
    <div className={styles.threadBody}>
      <div className={styles.stamp}><b>Today</b> {formatTime(start)}</div>
      {thread.lines.map((line, index) => (
        <div key={line.id} className={styles.lineWrap}>
          <Bubble line={line} previous={thread.lines[index - 1]} following={thread.lines[index + 1]} group={!!thread.members} />
          {index === lastMe && <div className={styles.receipt}>{readAt % 2 === 0 ? `Read ${formatTime(clock)}` : "Delivered"}</div>}
        </div>
      ))}
    </div>
  );
}

function ThreadChrome({ thread, unread }: { thread: Thread; unread: number }) {
  return (
    <>
      <div className={styles.convoHead}>
        <span className={styles.back}><Icon name="chevronLeft" size={22} stroke={2.6} />{unread > 0 && <b>{unread}</b>}</span>
        <span className={styles.who}>
          {thread.members ? <GroupAvatar names={thread.members} /> : <Avatar name={thread.name} size={50} />}
          <span>{thread.members ? thread.name : firstOf(thread.name)}<Icon name="chevronRight" size={9} stroke={3} /></span>
        </span>
        <span className={styles.video}><Icon name="video" size={26} stroke={1.8} /></span>
      </div>
      <div className={styles.inputBar}>
        <span className={styles.plus}><Icon name="plus" size={20} stroke={2.4} /></span>
        <span className={styles.field}>iMessage<Icon name="mic" size={20} stroke={1.8} /></span>
      </div>
    </>
  );
}

function session(props: ScreenProps, model: Model): Session {
  const { seed, clock, elapsed } = props;
  const start = clock - elapsed;
  const panels: Record<string, Panel> = {
    list: { body: <ListBody rows={model.rows} clock={clock} /> },
  };
  model.threads.forEach((thread, index) => {
    panels[thread.id] = {
      top: 144,
      bottom: 90,
      chrome: <ThreadChrome thread={thread} unread={(seed + index) % 4} />,
      body: <ThreadBody thread={thread} start={start - 20 - index * 37} clock={clock} readAt={index % 2} />,
    };
  });
  const photo = model.photo;
  panels.photo = {
    className: `${styles.viewer} ${ios.dark}`,
    chrome: (
      <div className={styles.viewerHead}>
        <Icon name="chevronLeft" size={24} stroke={2.4} />
        <span><b>{photo?.sender ?? ""}</b><small>Today {formatTime(start)}</small></span>
        <Icon name="share" size={22} stroke={1.9} />
      </div>
    ),
    body: <div className={styles.viewerPhoto} style={{ background: photo?.tint }} />,
  };
  return { duration: model.total, shots: model.shots, panels };
}

const keyRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/** The live composer and keyboard while the person types (re-renders per tick). */
function Composer({ model, elapsed }: { model: Model; elapsed: number }) {
  const active = model.typing.find((item) => elapsed >= item.start && elapsed < item.end);
  if (!active) return null;
  const share = Math.min(1, (elapsed - active.start + 0.5) / (active.end - active.start));
  const text = active.text.slice(0, Math.max(1, Math.round(active.text.length * share)));
  return (
    <div className={styles.composer}>
      <div className={styles.composerBar}>
        <span className={styles.plus}><Icon name="plus" size={20} stroke={2.4} /></span>
        <span className={styles.typed}>{text}<span className={styles.sendDot}><Icon name="send" size={14} stroke={2.4} /></span></span>
      </div>
      <div className={styles.keyboard}>
        {keyRows.map((row, index) => <div key={index} className={styles.keys}>{[...row].map((key, k) => <span key={k}>{key}</span>)}</div>)}
        <div className={styles.keys}><span className={styles.wide}>123</span><span className={styles.space}>space</span><span className={styles.wide}>return</span></div>
      </div>
    </div>
  );
}

export function MessagesScreen(props: ScreenProps) {
  const model = plan(props);
  return (
    <div className={styles.root}>
      <Storyboard
        id={`${props.view}:${props.seed}:${props.duration}`}
        elapsed={props.elapsed}
        build={() => session(props, model)}
        live={(panel) => (/^t\d$/.test(panel) ? <Composer model={model} elapsed={props.elapsed} /> : null)}
      />
    </div>
  );
}

const messages: CloneDefinition = {
  Screen: MessagesScreen,
  fixtures: [
    { view: "list", label: "midday check", seed: 11, clock: 12 * 60 + 20, duration: 3 },
    { view: "list", label: "evening catch up", seed: 24, clock: 18 * 60 + 5, duration: 8 },
    { view: "conversation", label: "meeting up", seed: 0, clock: 18 * 60 + 40, duration: 7 },
    { view: "conversation", label: "work thread", seed: 1, clock: 9 * 60 + 14, duration: 6 },
    { view: "conversation", label: "long chat", seed: 2, clock: 21 * 60 + 2, duration: 14 },
  ],
};

export default messages;
