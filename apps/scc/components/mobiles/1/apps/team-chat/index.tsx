import { Icon, Storyboard, TabBar, type Panel, type Session, type Shot, type TabItem } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import {
  channelMessages, dmMessages, draftText, firstOf, huddleChat, makeWorld, mentionRows, replyMessages, shuffle,
  type Msg, type World,
} from "./data";
import styles from "./team-chat.module.css";

const hues = ["#e8912d", "#2eb67d", "#36c5f0", "#e01e5a", "#7c3aed", "#0f766e", "#c2410c", "#2563eb"];
const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");
const colorOf = (name: string) => hues[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % hues.length];

function Avatar({ name }: { name: string }) {
  return <span className={styles.avatar} style={{ background: colorOf(name) }}>{initials(name)}</span>;
}

const tabs = (active: string): readonly TabItem[] => [
  { id: "home", label: "Home", icon: "house" },
  { id: "dms", label: "DMs", icon: "bubble", badge: active === "dms" ? 0 : 2 },
  { id: "activity", label: "Activity", icon: "bell", badge: active === "activity" ? 0 : 3 },
  { id: "you", label: "You", icon: "person" },
];

/** Scenes longer than this are played as consecutive fresh sessions. */
const CHUNK = 24;
const HOME_TOP = 98;
const TAB_BAR = 83;
const THREAD_TOP = 112;
const COMPOSER = 126;
const VIEWPORT = 844 - THREAD_TOP - COMPOSER;
/** Rough node budget for one session; Storyboard renders every panel at once. */
const BUDGET = 600;
const BACK = { x: 24, y: 78 };

/* ───────────────────────── pieces ───────────────────────── */

function Text({ text }: { text: string }) {
  const parts = text.split(/(@[A-Z][\p{L}]+)/u);
  return <div className={styles.text}>{parts.map((part, k) => (part.startsWith("@") ? <span key={k} className={styles.at}>{part}</span> : part))}</div>;
}

function Message({ m }: { m: Msg }) {
  return (
    <div className={styles.msg} data-pending={m.pending}>
      <Avatar name={m.who} />
      <div className={styles.msgBody}>
        <div className={styles.who}>{m.who}<small>{m.pending ? "Sending…" : formatTime(m.at)}</small></div>
        <Text text={m.text} />
        {m.file && (
          <div className={styles.file}>
            <span className={styles.fileIcon} style={{ background: m.file.color }}>{m.file.ext.toUpperCase()}</span>
            <span>{m.file.name}<small>{m.file.size}</small></span>
          </div>
        )}
        {m.code && <pre className={styles.code}>{m.code.join("\n")}</pre>}
        {m.unfurl && (
          <div className={styles.unfurl}>
            <small>{m.unfurl.site}</small>
            <b>{m.unfurl.title}</b>
            {m.unfurl.desc}
          </div>
        )}
        {m.react && (
          <div className={styles.reactions}>
            {m.react.map(([emoji, count], k) => <span key={k} className={styles.react}>{emoji} {count}</span>)}
          </div>
        )}
        {m.replies ? <div className={styles.replies}>{m.replies} replies</div> : null}
      </div>
    </div>
  );
}

/** Estimated pixel height of a message, for scroll targets and tap points. */
function heightOf(m: Msg): number {
  let h = 10 + 20 + Math.ceil(m.text.length / 40) * 21;
  if (m.file) h += 58;
  if (m.code) h += 18 + m.code.length * 16;
  if (m.unfurl) h += 76;
  if (m.react) h += 28;
  if (m.replies) h += 22;
  return h;
}
const nodesOf = (m: Msg) => 8 + (m.file ? 6 : 0) + (m.code ? 1 : 0) + (m.unfurl ? 4 : 0) + (m.react ? 1 + m.react.length : 0) + (m.replies ? 1 : 0);

function Composer({ placeholder, draft }: { placeholder: string; draft?: string }) {
  return (
    <div className={styles.composer}>
      <div className={styles.composerText} data-draft={Boolean(draft)}>{draft ?? placeholder}{draft && <span className={styles.caret} />}</div>
      <div className={styles.composerTools} data-ready={Boolean(draft)}>
        <Icon name="plus" size={22} />
        <Icon name="camera" size={22} />
        <Icon name="mic" size={22} />
        <Icon name="send" size={22} />
      </div>
    </div>
  );
}

function ThreadHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className={styles.thHead}>
      <span className={styles.thBack}><Icon name="chevronLeft" size={26} stroke={2.4} /></span>
      <span className={styles.thTitle}>{title}<small>{sub}</small></span>
      <Icon name="search" size={22} style={{ color: "var(--ios-blue)" }} />
    </div>
  );
}

type HomeMode = "ok" | "grey" | "back";

function homePanel(world: World, mode: HomeMode): Panel {
  const { owner, channels, dms } = world;
  return {
    top: HOME_TOP,
    bottom: TAB_BAR,
    chrome: (
      <>
        <div className={styles.header}>
          <span className={styles.ws}>{world.workspace.slice(0, 1)}</span>
          <span className={styles.wsName}>{world.workspace}<small>{owner.firstName}</small></span>
          <Icon name="compose" size={24} style={{ color: "var(--ios-blue)" }} />
        </div>
        {mode === "grey" && <div className={styles.banner}><Icon name="refresh" size={14} stroke={2.4} /> Reconnecting…</div>}
        {mode === "back" && <div className={styles.banner} data-ok="true"><Icon name="check" size={14} stroke={2.4} /> Connected</div>}
        <div className={styles.tabs}><TabBar items={tabs("home")} active="home" tint="#4a154b" /></div>
      </>
    ),
    body: (
      <div className={mode === "grey" ? styles.grey : undefined}>
        <div className={styles.search}><Icon name="search" size={17} /> Jump to…</div>
        <div className={styles.quick}>
          <span className={styles.quickItem}><Icon name="bubble" size={18} /> Threads</span>
          <span className={styles.quickItem}><Icon name="bell" size={18} /> Mentions</span>
        </div>
        <div className={styles.section}>Channels</div>
        {channels.map((c) => (
          <div key={c.id} className={styles.chan} data-unread={c.unread}>
            <span className={styles.hashGlyph}>#</span>
            <span className={styles.chanName}>{c.name}</span>
            {c.mentions > 0 && <span className={styles.mention}>{c.mentions}</span>}
          </div>
        ))}
        <div className={styles.section}>Direct messages</div>
        {dms.map((d) => (
          <div key={d.id} className={styles.chan} data-unread={d.unread}>
            <span className={styles.dmAvatar}>
              <Avatar name={d.name} />
              <span className={styles.presence} data-on={d.on} />
            </span>
            <span className={styles.chanName}>{d.name}</span>
            {d.unread && <span className={styles.mention}>1</span>}
          </div>
        ))}
      </div>
    ),
  };
}
const HOME_COST = 110;
/** Centre of a home row (pt on the glass) before scrolling. */
const channelRowY = (index: number) => HOME_TOP + 50 + 46 + 34 + index * 38 + 19;
const dmRowY = (world: World, index: number) => channelRowY(world.channels.length) + 34 + index * 38;
const homeMaxScroll = (world: World) => Math.max(0, dmRowY(world, world.dms.length) + 20 - (844 - TAB_BAR));

type Built = { panel: Panel; cost: number; height: number; messages: Msg[] };

function channelPanel(seed: number, world: World, channel: number, clock: number, options: { stale?: boolean } = {}): Built {
  const c = world.channels[channel];
  const messages = channelMessages(hash(seed, channel), world, clock, 9);
  if (options.stale) {
    const me = `${world.owner.firstName} ${world.owner.lastName}`;
    messages.push({ id: 90, who: me, at: clock, text: "Trying again, can anyone see this?", pending: true });
    messages.push({ id: 91, who: me, at: clock, text: "Signal is terrible in this elevator.", pending: true });
  }
  const typer = firstOf(messages[0].who);
  const height = 40 + messages.reduce((sum, m) => sum + heightOf(m), 0) + 24;
  return {
    messages,
    height,
    cost: 22 + messages.reduce((sum, m) => sum + nodesOf(m), 0),
    panel: {
      top: THREAD_TOP,
      bottom: COMPOSER,
      chrome: (
        <>
          <ThreadHead title={`# ${c.name}`} sub={`${c.members} members`} />
          {options.stale && <div className={styles.banner} style={{ top: THREAD_TOP }}><Icon name="clock" size={14} stroke={2.4} /> Waiting for network…</div>}
          <Composer placeholder={`Message # ${c.name}`} />
        </>
      ),
      body: (
        <div className={options.stale ? styles.stale : undefined}>
          <div className={styles.dayRow}><span className={styles.day}>Today</span></div>
          {messages.map((m) => <Message key={m.id} m={m} />)}
          {!options.stale && <div className={styles.typing}>{typer} is typing…</div>}
        </div>
      ),
    },
  };
}

function repliesPanel(seed: number, world: World, parent: Msg, channel: string, clock: number, sent: boolean): Built {
  const replies = replyMessages(hash(seed, parent.id), world, parent.at, 4);
  const draft = draftText(hash(seed, parent.id), world, clock);
  const all = sent ? [...replies, { id: 99, who: `${world.owner.firstName} ${world.owner.lastName}`, at: clock, text: draft }] : replies;
  const parentCopy: Msg = { ...parent, replies: undefined };
  return {
    messages: all,
    height: heightOf(parentCopy) + 40 + all.reduce((sum, m) => sum + heightOf(m), 0),
    cost: 30 + nodesOf(parentCopy) + all.length * 8,
    panel: {
      top: THREAD_TOP,
      bottom: COMPOSER,
      chrome: (
        <>
          <ThreadHead title="Thread" sub={`# ${channel}`} />
          <Composer placeholder="Reply…" draft={sent ? undefined : draft} />
        </>
      ),
      body: (
        <>
          <Message m={parentCopy} />
          <div className={styles.divider}>{all.length} replies</div>
          {all.map((m) => <Message key={m.id} m={m} />)}
        </>
      ),
    },
  };
}

function dmPanel(seed: number, world: World, dm: number, clock: number): Built {
  const partner = world.dms[dm];
  const messages = dmMessages(hash(seed, "dm", dm), world, partner.name, clock, 7);
  return {
    messages,
    height: 60 + messages.reduce((sum, m) => sum + heightOf(m), 0),
    cost: 22 + messages.length * 8,
    panel: {
      top: THREAD_TOP,
      bottom: COMPOSER,
      chrome: (
        <>
          <ThreadHead title={partner.name} sub={partner.on ? "Active" : "Away"} />
          <Composer placeholder={`Message ${firstOf(partner.name)}`} />
        </>
      ),
      body: (
        <>
          <div className={styles.dayRow}><span className={styles.day}>Today</span></div>
          {messages.map((m) => <Message key={m.id} m={m} />)}
        </>
      ),
    },
  };
}

function activityPanel(seed: number, world: World, clock: number): Built {
  const rows = mentionRows(seed, world, clock, 8);
  return {
    messages: [],
    height: rows.length * 72,
    cost: 30 + rows.length * 7,
    panel: {
      top: HOME_TOP,
      bottom: TAB_BAR,
      chrome: (
        <>
          <div className={styles.header}><span className={styles.wsName}>Activity<small>Mentions and reactions</small></span><Icon name="filter" size={22} style={{ color: "var(--ios-blue)" }} /></div>
          <div className={styles.tabs}><TabBar items={tabs("activity")} active="activity" tint="#4a154b" /></div>
        </>
      ),
      body: rows.map((r) => (
        <div key={r.id} className={styles.act}>
          <Avatar name={r.who} />
          <span className={styles.actBody}>
            <span className={styles.actWho}>{r.who}<small>#{r.name} · {formatTime(r.at)}</small></span>
            <Text text={r.text} />
          </span>
        </div>
      )),
    },
  };
}

/* ───────────────────────── sessions ───────────────────────── */

type Ctx = { seed: number; duration: number; clock: number; owner: Owner; view: string };

/** Channels, threads and DMs: open, skim, reply, back, next. */
function deskSession(ctx: Ctx, world: World): Session {
  const rng = createRng(hash(ctx.seed, "desk-session", ctx.view));
  const total = Math.max(1, ctx.duration);
  const panels: Record<string, Panel> = {};
  const shots: Shot[] = [];
  const meta = new Map<string, Built>();
  let spent = 0;
  let t = 0;
  let homeScroll = 0;
  const scrolls = new Map<string, number>();
  const dwell = () => rng.range(1.35, 2.3);
  const shot = (s: Omit<Shot, "at">, wait = dwell()) => {
    shots.push({ ...s, at: t });
    t += wait;
  };
  const place = (id: string, make: () => Built): boolean => {
    if (panels[id]) return true;
    const built = make();
    if (spent + built.cost > BUDGET) return false;
    panels[id] = built.panel;
    meta.set(id, built);
    spent += built.cost;
    return true;
  };
  panels.home = homePanel(world, "ok");
  spent += HOME_COST;

  const maxScroll = (id: string) => Math.max(0, (meta.get(id)?.height ?? 0) - VIEWPORT);
  /** Pick a channel panel to open: a new one if budget allows, otherwise one already built. */
  const openChannel = (): string | null => {
    const order = shuffle(rng, world.channels.map((c) => c.id));
    for (const i of order) if (place(`ch-${i}`, () => channelPanel(ctx.seed, world, i, ctx.clock))) return `ch-${i}`;
    return null;
  };
  const channelIndex = (id: string) => Number(id.split("-")[1]);

  const thread = (id: string) => {
    const built = meta.get(id);
    if (!built) return;
    const withReplies = built.messages.filter((m) => m.replies);
    const parent = withReplies.length ? rng.pick(withReplies) : rng.pick(built.messages);
    const name = world.channels[channelIndex(id)].name;
    const a = `${id}-r${parent.id}`;
    const b = `${a}-sent`;
    if (!place(a, () => repliesPanel(ctx.seed, world, parent, name, ctx.clock, false))) return;
    if (!place(b, () => repliesPanel(ctx.seed, world, parent, name, ctx.clock, true))) return;
    shot({ panel: a, enter: "push", tap: { x: 120, y: rng.int(300, 600) }, scroll: 0 }, rng.range(1.6, 2.4));
    shot({ panel: b, enter: "cut", tap: { x: 360, y: 798 }, scroll: Math.max(0, (meta.get(b)?.height ?? 0) - VIEWPORT) }, rng.range(1.4, 2));
    shot({ panel: id, enter: "pop", tap: BACK }, rng.range(1.3, 1.9));
  };

  const read = (id: string, enter: Shot["enter"], tap?: Shot["tap"]) => {
    const max = maxScroll(id);
    const from = scrolls.get(id) ?? Math.round(max * rng.range(0, 0.3));
    const mid = Math.min(max, from + rng.int(160, 380));
    shot({ panel: id, enter, tap, scroll: mid, flicks: 2 });
    const end = Math.min(max, mid + rng.int(160, 420));
    shot({ panel: id, scroll: end, flicks: rng.int(1, 3) });
    scrolls.set(id, end);
  };

  const visitChannel = (from: "home" | "activity", tap: Shot["tap"]) => {
    const id = openChannel();
    if (!id) return false;
    read(id, "push", tap);
    if (rng.chance(0.55)) thread(id);
    shot({ panel: from, enter: "pop", tap: BACK, scroll: from === "home" ? homeScroll : undefined });
    return true;
  };

  const homeTapChannel = () => ({ x: 140, y: channelRowY(rng.int(0, world.channels.length - 1)) - homeScroll });

  // Openings.
  if (ctx.view === "thread") {
    const id = openChannel() ?? "home";
    const max = maxScroll(id);
    // Messages pile in: the reader keeps up with the bottom of the channel.
    let s = Math.round(max * 0.15);
    shot({ panel: id, enter: "cut", scroll: s }, rng.range(1.2, 1.8));
    for (let i = 0; i < 3 && t < total * 0.55; i++) {
      s = Math.min(max, s + rng.int(120, 260));
      shot({ panel: id, scroll: s, flicks: rng.int(1, 2) });
    }
    scrolls.set(id, s);
    if (id !== "home") thread(id);
    shot({ panel: "home", enter: "pop", tap: BACK });
  } else {
    shot({ panel: "home", enter: "cut", scroll: 0 }, rng.range(0.9, 1.6));
  }

  const flick = () => {
    homeScroll = homeScroll > 0 ? 0 : homeMaxScroll(world);
    shot({ panel: "home", scroll: homeScroll, flicks: 1 }, rng.range(1.2, 1.8));
  };
  while (t < total) {
    const kind = rng.weighted([["channel", 5], ["dm", 2], ["activity", 1.3], ["flick", 1]] as const);
    if (kind === "flick") {
      flick();
    } else if (kind === "channel") {
      if (!visitChannel("home", homeTapChannel())) flick();
    } else if (kind === "dm") {
      const dm = rng.int(0, world.dms.length - 1);
      const id = `dm-${dm}`;
      if (!place(id, () => dmPanel(ctx.seed, world, dm, ctx.clock))) {
        flick();
        continue;
      }
      homeScroll = homeMaxScroll(world);
      shot({ panel: "home", scroll: homeScroll, flicks: 1 }, 1.3);
      read(id, "push", { x: 140, y: dmRowY(world, dm) - homeScroll });
      shot({ panel: "home", enter: "pop", tap: BACK });
    } else {
      if (!place("activity", () => activityPanel(ctx.seed, world, ctx.clock))) {
        flick();
        continue;
      }
      shot({ panel: "activity", enter: "tab", tap: { x: 243, y: 806 }, scroll: rng.int(0, 160), flicks: 1 });
      const visited = visitChannel("activity", { x: 180, y: HOME_TOP + 40 + rng.int(0, 4) * 72 });
      if (!visited) shot({ panel: "activity", scroll: 0 });
      shot({ panel: "home", enter: "tab", tap: { x: 48, y: 806 }, scroll: homeScroll });
    }
  }
  return { duration: total, shots, panels };
}

/** Dead zone: greyed lists, a stale channel with pending sends, retries, then back online. */
function reconnectSession(ctx: Ctx, world: World): Session {
  const rng = createRng(hash(ctx.seed, "desk-reconnect"));
  const total = Math.max(1, ctx.duration);
  const channel = rng.int(0, world.channels.length - 1);
  const stale = channelPanel(ctx.seed, world, channel, ctx.clock, { stale: true });
  const fresh = channelPanel(ctx.seed, world, channel, ctx.clock);
  const panels: Record<string, Panel> = { grey: homePanel(world, "grey"), stale: stale.panel };
  const shots: Shot[] = [];
  let t = 0;
  const shot = (s: Omit<Shot, "at">, wait = rng.range(1.3, 2)) => {
    shots.push({ ...s, at: t });
    t += wait;
  };
  const tap = { x: 140, y: channelRowY(channel) };
  const staleMax = Math.max(0, stale.height - VIEWPORT);
  shot({ panel: "grey", enter: "cut" }, rng.range(0.6, 1.2));
  const online = total >= 6 ? total * rng.range(0.6, 0.8) : Infinity;
  while (t < Math.min(total, online)) {
    shot({ panel: "stale", enter: "push", tap, scroll: staleMax, flicks: 1 });
    shot({ panel: "stale", scroll: Math.max(0, staleMax - rng.int(60, 200)), flicks: 1 });
    shot({ panel: "grey", enter: "pop", tap: BACK, scroll: rng.chance(0.5) ? 40 : 0 });
  }
  if (online < total) {
    panels.back = homePanel(world, "back");
    panels.fresh = fresh.panel;
    shot({ panel: "back", enter: "fade" }, 1.6);
    shot({ panel: "fresh", enter: "push", tap, scroll: Math.max(0, fresh.height - VIEWPORT), flicks: 2 });
    shot({ panel: "back", enter: "pop", tap: BACK });
    while (t < total) {
      shot({ panel: "fresh", enter: "push", tap, scroll: Math.max(0, fresh.height - VIEWPORT - rng.int(0, 240)), flicks: 1 });
      shot({ panel: "back", enter: "pop", tap: BACK, scroll: rng.chance(0.5) ? 40 : 0 });
    }
  }
  return { duration: total, shots, panels };
}

type Huddle = { channel: string; names: string[]; muted: boolean[] };

function huddleOf(seed: number, world: World): Huddle {
  const rng = createRng(hash(seed, "desk-huddle"));
  const others = shuffle(rng, world.people).slice(0, 3);
  return {
    channel: rng.pick(world.channels).name,
    names: [`${world.owner.firstName} ${world.owner.lastName}`, ...others],
    muted: [true, false, rng.chance(0.5), rng.chance(0.4)],
  };
}

function HuddleControls() {
  return (
    <div className={styles.controls}>
      <span className={styles.ctl} data-active="true"><Icon name="micOff" size={26} /></span>
      <span className={styles.ctl}><Icon name="video" size={26} /></span>
      <span className={styles.ctl}><Icon name="share" size={26} /></span>
      <span className={styles.ctl} data-end="true"><Icon name="phone" size={26} /></span>
    </div>
  );
}

function huddlePanel(h: Huddle, speaker: number): Panel {
  return {
    className: styles.huddle,
    body: null,
    chrome: (
      <>
        <span className={styles.huChat}><Icon name="bubble" size={22} /></span>
        <div className={styles.tiles}>
          {h.names.map((name, i) => (
            <div key={i} className={styles.tile} data-speaking={i === speaker}>
              <Avatar name={name} />
              <span className={styles.tileName}>{i === 0 ? "You" : firstOf(name)}</span>
              {h.muted[i] && i !== speaker && <span className={styles.tileMute}><Icon name="micOff" size={16} /></span>}
            </div>
          ))}
        </div>
        <HuddleControls />
      </>
    ),
  };
}

function sharePanel(seed: number, h: Huddle, world: World, clock: number): Panel {
  const sample = channelMessages(hash(seed, "share"), world, clock, 6).find((m) => m.code)?.code ?? ["git log --oneline -5", "pnpm test --filter export-svc"];
  const presenter = firstOf(h.names[1]);
  return {
    className: styles.huddle,
    body: null,
    chrome: (
      <>
        <span className={styles.huChat}><Icon name="bubble" size={22} /></span>
        <div className={styles.shareStage}>
          <small>{presenter}&rsquo;s screen</small>
          <pre className={styles.code}>{sample.join("\n")}</pre>
        </div>
        <div className={styles.shareStrip}>
          {h.names.map((name, i) => (
            <div key={i} className={styles.tile} data-speaking={i === 1}><Avatar name={name} /></div>
          ))}
        </div>
        <HuddleControls />
      </>
    ),
  };
}

function huddleChatPanel(seed: number, h: Huddle, world: World, clock: number): Panel {
  const lines = huddleChat(seed, world, h.names.slice(1), clock, 9);
  return {
    className: styles.huSheetPanel,
    top: 160,
    bottom: 126,
    body: lines.map((m) => (
      <div key={m.id} className={styles.huLine}><b>{firstOf(m.who)}</b><Text text={m.text} /></div>
    )),
    chrome: (
      <>
        <div className={styles.huSheetHead}><b>Huddle thread</b><Icon name="close" size={20} stroke={2.4} /></div>
        <div className={styles.huSheetComposer}>Message huddle</div>
      </>
    ),
  };
}

/** A huddle: the active speaker hops every one or two minutes; chat and screen share drop in. */
function huddleSession(ctx: Ctx, world: World, h: Huddle): Session {
  const rng = createRng(hash(ctx.seed, "desk-huddle-session"));
  const total = Math.max(1, ctx.duration);
  const panels: Record<string, Panel> = {};
  h.names.forEach((_, i) => { panels[`s${i}`] = huddlePanel(h, i); });
  panels.chat = huddleChatPanel(ctx.seed, h, world, ctx.clock);
  panels.share = sharePanel(ctx.seed, h, world, ctx.clock);
  const shots: Shot[] = [];
  let t = 0;
  let speaker = rng.int(1, 3);
  let sharing = false;
  shots.push({ panel: `s${speaker}`, at: 0, enter: "cut" });
  t = rng.range(1, 1.8);
  let nextChat = rng.range(3, 6);
  while (t < total) {
    if (t >= nextChat) {
      shots.push({ panel: "chat", at: t, enter: "sheet", tap: { x: 352, y: 70 }, scroll: rng.int(80, 220), flicks: 2 });
      t += rng.range(1.7, 2.4);
      shots.push({ panel: sharing ? "share" : `s${speaker}`, at: t, enter: "dismiss", tap: { x: 356, y: 128 } });
      t += rng.range(1.3, 2);
      nextChat = t + rng.range(5, 9);
      continue;
    }
    if (!sharing && rng.chance(0.12)) {
      sharing = true;
      shots.push({ panel: "share", at: t, enter: "fade" });
      t += rng.range(1.6, 2.3);
      continue;
    }
    if (sharing && rng.chance(0.4)) sharing = false;
    speaker = (speaker + rng.int(1, 3)) % h.names.length;
    if (speaker === 0 && rng.chance(0.6)) speaker = 1;
    shots.push({ panel: sharing ? "share" : `s${speaker}`, at: t, enter: "cut" });
    t += rng.range(1, 2);
  }
  return { duration: total, shots, panels };
}

/* ───────────────────────── screen ───────────────────────── */

export function TeamChatScreen(props: ScreenProps) {
  const { view, seed, elapsed, duration, clock, owner } = props;
  const part = Math.max(0, Math.floor(elapsed / CHUNK));
  const partStart = part * CHUNK;
  const partDuration = Math.max(1, Math.min(CHUNK, duration - partStart));
  const partElapsed = elapsed - partStart;
  const ctx: Ctx = { seed: hash(seed, part), duration: partDuration, clock: clock - elapsed + partStart, owner, view };
  const world = makeWorld(seed, owner);
  const huddle = view === "huddle" ? huddleOf(seed, world) : null;
  const build = (): Session => {
    if (huddle) return huddleSession(ctx, world, huddle);
    if (view === "reconnecting") return reconnectSession(ctx, world);
    return deskSession(ctx, world);
  };
  return (
    <div className={huddle ? styles.huddleRoot : styles.root}>
      <Storyboard
        id={`${view}:${seed}:${part}:${partDuration}`}
        elapsed={partElapsed}
        build={build}
        live={(panel) => (huddle && panel !== "chat" ? <div className={styles.huTop}># {huddle.channel}<small>Huddle · {12 + (seed % 17) + elapsed} min</small></div> : null)}
      />
    </div>
  );
}

const teamChat: CloneDefinition = {
  Screen: TeamChatScreen,
  tone: (view) => (view === "huddle" ? "light" : "dark"),
  fixtures: [
    { view: "channels", label: "catching up", seed: 11, clock: 9 * 60 + 4, duration: 4 },
    { view: "channels", label: "long desk stretch", seed: 12, clock: 11 * 60 + 20, duration: 22 },
    { view: "thread", label: "launch thread", seed: 23, clock: 10 * 60 + 12, duration: 12 },
    { view: "huddle", label: "design huddle", seed: 5, clock: 14 * 60 + 30, duration: 15 },
    { view: "reconnecting", label: "elevator dead zone", seed: 8, clock: 12 * 60 + 41, duration: 2 },
    { view: "reconnecting", label: "subway outage", seed: 9, clock: 17 * 60 + 52, duration: 12 },
  ],
};

export default teamChat;
