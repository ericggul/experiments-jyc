import { Icon, NavBar, ios } from "../../ios";
import { formatTime, timeConfig } from "../../model/time";
import { createRng, type Rng } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./messages.module.css";

const people = ["Maya Chen", "Dev Patel", "Rosa Alvarez", "Jordan Reyes", "Tasha Brooks", "Sam Okafor", "Nina Kowalski", "Eli Rosen", "Priya Nair", "Marcus Webb", "Lena Fischer", "Theo Park", "Dana Whitfield", "Mom", "Dad", "Chris Delgado", "Amara Obi", "Ben Silverstein"];
const groups = ["Brunch Crew", "5th Floor Neighbors", "Soccer Thursday", "Fam", "Apt 4C", "Book Club"];
const previews = [
  "ok that works, see you at 7", "lol no way", "Can you send me the address again?", "Thanks!!", "Running 10 min late, sorry",
  "did you see the L is suspended again", "Loved \"that's hilarious\"", "I'll call you after the meeting", "just landed", "Are we still on for tonight?",
  "Sent a photo", "happy birthday!!! 🎂", "yes please", "Can't wait", "omw", "Your package was left at the front desk",
];
const shades = ["#8e8e93", "#7d8aa5", "#a0836b", "#6f9c8e", "#9a7fb0", "#b0787a", "#7396b8", "#8c9a6b"];

const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");
const shade = (name: string) => shades[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % shades.length];

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
        <span key={name} className={styles.avatar} style={{ ...spots[index], background: `linear-gradient(${shade(name)}, #6c6c72)` }}>{initials(name)}</span>
      ))}
    </span>
  );
}

type Thread = { id: string; name: string; members?: string[]; text: string; at: number; unread: boolean };

function pickPeople(rng: Rng, count: number) {
  const pool = [...people];
  const out: string[] = [];
  while (out.length < count) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return out;
}

function buildThreads(seed: number, clock: number): Thread[] {
  const rng = createRng(seed);
  const names = pickPeople(rng, 12);
  const gnames = [...groups].sort(() => rng.next() - 0.5).slice(0, 2);
  const threads: Thread[] = [];
  let at = clock - rng.int(1, 6);
  names.forEach((name, index) => {
    threads.push({ id: `p-${name}`, name, text: rng.pick(previews), at, unread: index < 2 + rng.int(0, 1) });
    at -= rng.int(14, 140);
  });
  gnames.forEach((name, index) => {
    const members = pickPeople(rng, 3);
    threads.splice(1 + index * 3, 0, { id: `g-${name}`, name, members, text: `${members[0].split(" ")[0]}: ${rng.pick(previews)}`, at: clock - rng.int(8, 90), unread: index === 0 });
  });
  return threads.sort((a, b) => b.at - a.at);
}

function dayLabel(at: number, clock: number) {
  if (at >= 0 && clock - at < 1) return "Now";
  if (at >= 0) return formatTime(at);
  return ["Yesterday", "Sunday", "Saturday", "10/1/26"][Math.min(3, Math.floor(-at / 1440))];
}

function List({ seed, clock }: ScreenProps) {
  const threads = buildThreads(seed, clock);
  const pinned = threads.slice(0, 3);
  const rest = threads.slice(3, 11);
  return (
    <div className={styles.root}>
      <NavBar title="Messages" large leading={<span className={styles.edit}>Edit</span>} trailing={<Icon name="compose" size={23} stroke={1.9} className={styles.compose} />}>
        <div className={styles.search}><Icon name="search" size={16} stroke={2.2} />Search</div>
      </NavBar>
      <div className={styles.pins}>
        {pinned.map((thread) => (
          <div key={thread.id} className={styles.pin}>
            {thread.unread && <span className={styles.pinDot} />}
            <Avatar name={thread.members ? thread.members[0] : thread.name} size={86} />
            {thread.name.split(" ")[0]}
          </div>
        ))}
      </div>
      {rest.map((thread) => (
        <div key={thread.id} className={styles.row}>
          <span className={styles.dotCell}>{thread.unread && <i className={styles.dot} />}</span>
          {thread.members ? <GroupAvatar names={thread.members} /> : <Avatar name={thread.name} size={50} />}
          <div className={styles.rowBody}>
            <span className={styles.name}>{thread.name}</span>
            <span className={styles.time}>{dayLabel(thread.at, clock)}</span>
            <span className={styles.preview}>{thread.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type Line = { from: "me" | "them"; text: string; at: number; tapback?: string };

const scripts: readonly { who: string; lines: readonly Line[] }[] = [
  { who: "Maya Chen", lines: [
    { from: "them", text: "are you close?", at: 0 },
    { from: "me", text: "Two stops away, the 6 is crawling", at: 0 },
    { from: "them", text: "no rush, I just got a table by the window", at: 0 },
    { from: "me", text: "Perfect. Order me the burrata?", at: 0, tapback: "👍" },
    { from: "them", text: "already did 😂", at: 1 },
    { from: "them", text: "also they have the good rosé tonight", at: 2 },
    { from: "me", text: "Say less. Walking in now", at: 4 },
    { from: "them", text: "I see you!!", at: 6 },
  ] },
  { who: "Dev Patel", lines: [
    { from: "me", text: "Did the deck go out?", at: 0 },
    { from: "them", text: "Sent at 9:02. Legal wanted one more pass on slide 14", at: 0 },
    { from: "me", text: "ugh. ok. Thanks for staying on it", at: 0 },
    { from: "them", text: "Of course. Coffee later?", at: 1, tapback: "❤️" },
    { from: "me", text: "Yes, Joe's at 3?", at: 3 },
    { from: "them", text: "Make it 3:30, standup is running over", at: 5 },
  ] },
  { who: "Mom", lines: [
    { from: "them", text: "Did you eat yet", at: 0 },
    { from: "me", text: "Yes Mom", at: 0 },
    { from: "them", text: "What did you eat", at: 0 },
    { from: "me", text: "A bagel. With cream cheese", at: 1 },
    { from: "them", text: "That's not lunch", at: 2 },
    { from: "them", text: "Call me when you're home", at: 3 },
  ] },
];

/** Simulated minutes per script step, so each bubble lands half a beat apart. */
const LINE_PACE = timeConfig.beatMinutes / 2;

function Conversation({ seed, elapsed, clock, duration }: ScreenProps) {
  const script = scripts[seed % scripts.length];
  const start = clock - elapsed;
  const shown = script.lines.filter((line) => line.at * LINE_PACE <= elapsed);
  const next = script.lines[shown.length];
  const typing = next?.from === "them" && next.at * LINE_PACE - elapsed <= LINE_PACE / 2;
  const lastMe = shown.length > 0 && shown[shown.length - 1].from === "me";
  return (
    <div className={styles.root}>
      <div className={styles.convoHead}>
        <span className={styles.back}><Icon name="chevronLeft" size={22} stroke={2.6} /><b>{(seed % 3) + 1}</b></span>
        <span className={styles.who}><Avatar name={script.who} size={50} /><span>{script.who.split(" ")[0]}<Icon name="chevronRight" size={9} stroke={3} /></span></span>
        <span className={styles.video}><Icon name="video" size={26} stroke={1.8} /></span>
      </div>
      <div className={styles.thread}>
        <div className={styles.stamp}><b>Today</b> {formatTime(start)}</div>
        {shown.map((line, index) => {
          const prev = shown[index - 1];
          const following = shown[index + 1];
          return (
            <div key={`${line.from}-${index}`} className={`${styles.line} ${ios.appear}`} data-from={line.from} data-gap={prev?.from !== line.from}>
              <div className={styles.bubble} data-from={line.from} data-tail={following?.from !== line.from}>
                {line.tapback && <span className={styles.tapback}>{line.tapback}</span>}
                {line.text}
              </div>
            </div>
          );
        })}
        {lastMe && !typing && <div className={`${styles.line} ${styles.receipt}`} style={{ alignItems: "flex-end" }}>{elapsed > duration - 2 ? `Read ${formatTime(clock)}` : "Delivered"}</div>}
        {typing && <div className={styles.line} data-from="them" data-gap="true"><div className={styles.typing}><i /><i /><i /></div></div>}
      </div>
      <div className={styles.inputBar}>
        <span className={styles.plus}><Icon name="plus" size={20} stroke={2.4} /></span>
        <span className={styles.field}>Message<Icon name="mic" size={20} stroke={1.8} /></span>
      </div>
    </div>
  );
}

export function MessagesScreen(props: ScreenProps) {
  return props.view === "conversation" ? <Conversation {...props} /> : <List {...props} />;
}

const messages: CloneDefinition = {
  Screen: MessagesScreen,
  fixtures: [
    { view: "list", label: "midday check", seed: 11, clock: 12 * 60 + 20, duration: 3 },
    { view: "list", label: "evening catch up", seed: 24, clock: 18 * 60 + 5, duration: 2 },
    { view: "conversation", label: "meeting up", seed: 0, clock: 18 * 60 + 40, duration: 7 },
    { view: "conversation", label: "work thread", seed: 1, clock: 9 * 60 + 14, duration: 6 },
    { view: "conversation", label: "mom checks in", seed: 2, clock: 13 * 60 + 2, duration: 4 },
  ],
};

export default messages;
