import { Icon, TabBar, type TabItem, ios } from "../../ios";
import { createRng, type Rng } from "../../model/rng";
import { formatTime, timeConfig } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./team-chat.module.css";

const people = [
  "Maya Okafor", "Dev Patel", "Sam Rivera", "Lena Fischer", "Marcus Webb",
  "Priya Nair", "Tomás Herrera", "Aiko Tanaka", "Jordan Blake", "Chloe Bennett",
  "Andre Washington", "Rosa Delgado",
];
const channelNames = [
  "general", "eng-standup", "design-crit", "launch-q4", "ops-alerts",
  "sales-wins", "support-escalations", "random", "hiring", "product-feedback",
];
const hues = ["#e8912d", "#2eb67d", "#36c5f0", "#e01e5a", "#7c3aed", "#0f766e", "#c2410c", "#2563eb"];

const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");
const colorOf = (name: string) => hues[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % hues.length];

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Avatar({ name }: { name: string }) {
  return <span className={styles.avatar} style={{ background: colorOf(name) }}>{initials(name)}</span>;
}

const tabs: readonly TabItem[] = [
  { id: "home", label: "Home", icon: "house", badge: 0 },
  { id: "dms", label: "DMs", icon: "bubble", badge: 2 },
  { id: "activity", label: "Activity", icon: "bell" },
  { id: "you", label: "You", icon: "person" },
];

function Channels({ seed, owner, greyed = false }: ScreenProps & { greyed?: boolean }) {
  const rng = createRng(seed);
  const channels = shuffle(rng, channelNames).slice(0, 6).map((name) => ({
    name,
    unread: rng.chance(0.5),
    mentions: rng.chance(0.3) ? rng.int(1, 3) : 0,
  }));
  const dms = shuffle(rng, people).slice(0, 5).map((name) => ({ name, on: rng.chance(0.55), unread: rng.chance(0.3) }));
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.ws}>{owner.work.slice(0, 1).toUpperCase()}</span>
        <span className={styles.wsName}>{owner.work === "Home" ? "Halden Studio" : `${owner.work} Team`}<small>{owner.firstName}</small></span>
        <Icon name="compose" size={24} style={{ color: "var(--ios-blue)" }} />
      </div>
      <div className={greyed ? styles.grey : undefined}>
        <div className={styles.search}><Icon name="search" size={17} /> Jump to…</div>
        <div className={styles.quick}>
          <span className={styles.quickItem}><Icon name="bubble" size={18} /> Threads</span>
          <span className={styles.quickItem}><Icon name="bell" size={18} /> Mentions</span>
        </div>
        <div className={styles.section}><Icon name="chevronDown" size={12} stroke={2.6} /> Channels</div>
        {channels.map((c) => (
          <div key={c.name} className={styles.chan} data-unread={c.unread}>
            <span className={styles.hashGlyph}>#</span>
            <span className={styles.chanName}>{c.name}</span>
            {c.mentions > 0 && <span className={styles.mention}>{c.mentions}</span>}
          </div>
        ))}
        <div className={styles.section}><Icon name="chevronDown" size={12} stroke={2.6} /> Direct messages</div>
        {dms.map((d) => (
          <div key={d.name} className={styles.chan} data-unread={d.unread}>
            <span className={styles.dmAvatar}>
              <Avatar name={d.name} />
              <span className={styles.presence} data-on={d.on} />
            </span>
            <span className={styles.chanName}>{d.name}</span>
            {d.unread && <span className={styles.mention}>1</span>}
          </div>
        ))}
      </div>
      {greyed && <div className={styles.banner}><Icon name="refresh" size={14} stroke={2.4} /> Reconnecting…</div>}
      <div className={styles.tabs}><TabBar items={tabs} active="home" tint="#4a154b" /></div>
    </div>
  );
}

const script: readonly { text: string; react?: string }[] = [
  { text: "Morning all. Standup in 10, notes are in the doc." },
  { text: "Q4 deck v3 is up. Can someone sanity check slide 14 before the client call?", react: "👀 2" },
  { text: "Looking now." },
  { text: "ENG-2041 is blocked on the API change, pinging @Dev." },
  { text: "Halvorsen moved to 2:30 and wants the revised numbers.", react: "😬 3" },
  { text: "I can have the revenue table refreshed by 1." },
  { text: "Thanks. @{me} can you own the summary slide?" },
  { text: "On it. Will drop a draft here shortly.", react: "✅ 4" },
  { text: "Reminder: freeze for the release branch is at 5 today." },
];

function Thread({ seed, elapsed, clock, owner }: ScreenProps) {
  const rng = createRng(seed);
  const channel = rng.pick(channelNames);
  const speakers = shuffle(rng, people).slice(0, 4);
  const start = clock - elapsed - 10;
  const count = Math.min(script.length, Math.floor(elapsed / (timeConfig.beatMinutes / 2)) + 5);
  const next = script[count];
  return (
    <div className={styles.root}>
      <div className={styles.thHead}>
        <span className={styles.thBack}><Icon name="chevronLeft" size={26} stroke={2.4} /></span>
        <span className={styles.thTitle}># {channel}<small>{speakers.length + 18} members</small></span>
        <Icon name="search" size={22} style={{ color: "var(--ios-blue)" }} />
      </div>
      <div className={styles.feed}>
        <div className={styles.day}>Today</div>
        {script.slice(0, count).map((m, i) => {
          const name = i === 6 ? speakers[0] : i === 7 ? owner.firstName + " " + owner.lastName : speakers[i % speakers.length];
          const parts = m.text.replace("{me}", owner.firstName).split(/(@\w+)/);
          return (
            <div key={i} className={`${styles.msg} ${ios.appear}`}>
              <Avatar name={name} />
              <div className={styles.msgBody}>
                <div className={styles.who}>{name}<small>{formatTime(start + i * 2)}</small></div>
                <div className={styles.text}>
                  {parts.map((p, k) => (p.startsWith("@") ? <span key={k} className={styles.at}>{p}</span> : p))}
                </div>
                {m.react && <div className={styles.reactions}><span className={styles.react}>{m.react}</span></div>}
              </div>
            </div>
          );
        })}
        {next && <div className={styles.typing}>{speakers[count % speakers.length].split(" ")[0]} is typing…</div>}
      </div>
      <div className={styles.composer}>
        <div className={styles.composerText}>Message # {channel}</div>
        <div className={styles.composerTools}>
          <Icon name="plus" size={22} />
          <Icon name="camera" size={22} />
          <Icon name="mic" size={22} />
          <Icon name="send" size={22} />
        </div>
      </div>
    </div>
  );
}

function Huddle({ seed, elapsed, owner }: ScreenProps) {
  const rng = createRng(seed);
  const others = shuffle(rng, people).slice(0, 3);
  const names = [`${owner.firstName} ${owner.lastName}`, ...others];
  const speaker = createRng(seed + Math.floor(elapsed / timeConfig.beatMinutes)).int(1, 3);
  const muted = [true, false, rng.chance(0.5), true];
  const channel = rng.pick(channelNames);
  return (
    <div className={styles.huddle}>
      <div className={styles.huTop}># {channel}<small>Huddle · {10 + elapsed} min</small></div>
      <div className={styles.tiles}>
        {names.map((name, i) => (
          <div key={name} className={styles.tile} data-speaking={i === speaker}>
            <Avatar name={name} />
            <span className={styles.tileName}>{i === 0 ? "You" : name.split(" ")[0]}</span>
            {muted[i] && <span className={styles.tileMute}><Icon name="micOff" size={16} /></span>}
          </div>
        ))}
      </div>
      <div className={styles.controls}>
        <span className={styles.ctl} data-active="true"><Icon name="micOff" size={26} /></span>
        <span className={styles.ctl}><Icon name="video" size={26} /></span>
        <span className={styles.ctl}><Icon name="share" size={26} /></span>
        <span className={styles.ctl} data-end="true"><Icon name="phone" size={26} /></span>
      </div>
    </div>
  );
}

export function TeamChatScreen(props: ScreenProps) {
  if (props.view === "thread") return <Thread {...props} />;
  if (props.view === "huddle") return <Huddle {...props} />;
  if (props.view === "reconnecting") return <Channels {...props} greyed />;
  return <Channels {...props} />;
}

const teamChat: CloneDefinition = {
  Screen: TeamChatScreen,
  tone: (view) => (view === "huddle" ? "light" : "dark"),
  fixtures: [
    { view: "channels", label: "catching up", seed: 11, clock: 9 * 60 + 4, duration: 4 },
    { view: "thread", label: "launch thread", seed: 23, clock: 10 * 60 + 12, duration: 12 },
    { view: "huddle", label: "design huddle", seed: 5, clock: 14 * 60 + 30, duration: 15 },
    { view: "reconnecting", label: "elevator dead zone", seed: 8, clock: 12 * 60 + 41, duration: 2 },
  ],
};

export default teamChat;
