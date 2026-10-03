import { Icon, Storyboard, TabBar, type Enter, type Panel, type Session, type Shot, type TabItem } from "../../ios";
import { createRng, hash, type Rng } from "../../model/rng";
import { formatTime, weekdayShort } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import {
  boroughs, channels, colorOf, compact, initials, makeComment, makePost, ranges, tints,
  type Comment, type Post, type Range,
} from "./data";
import styles from "./social-manager.module.css";

/* ---------- layout (pt on the 390 × 844 glass) ---------- */

const NAV = 147;
/** Nav plus the week strip or segmented control kept in the chrome. */
const ROOT_TOP = 213;
const SEG_TOP = 191;
const SUB_TOP = 98;
const TAB_BAR = 83;
const CARD = 102;
const CARDS_FROM = 28;
const COMMENT = 118;
const KEYBOARD = 291;
const tabX = { scheduler: 52, analytics: 147, comments: 243 } as const;
const TAB_Y = 806;
const BACK = { x: 28, y: 76 };
/** Scene parts: long scenes play as consecutive sessions of this many simulated minutes. */
const CHUNK = 24;
/** Estimated DOM nodes a session may spend on panels (bench limit 700). */
const BUDGET = 620;

type TabId = keyof typeof tabX;

const tabs = (active: TabId): TabItem[] => [
  { id: "scheduler", label: "Schedule", icon: "calendar" },
  { id: "analytics", label: "Analytics", icon: "chart" },
  { id: "comments", label: "Inbox", icon: "bubble", badge: active === "comments" ? 0 : 14 },
  { id: "me", label: "Account", icon: "person" },
];

function walk(rng: Rng, start: number, n: number, lo: number, hi: number, floor: number): number[] {
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < n; i++) {
    out.push(v);
    v = Math.max(floor, v + rng.int(lo, hi));
  }
  return out;
}

/* ---------- shared chrome ---------- */

function Nav({ title, trailing }: { title: string; trailing: "plus" | "filter" }) {
  return (
    <div className={styles.nav}>
      <div className={styles.navRow}><span>Edit</span><Icon name={trailing} size={24} stroke={2.2} /></div>
      <h1 className={styles.large}>{title}</h1>
    </div>
  );
}

function SubNav({ back, title, action }: { back: string; title: string; action?: string }) {
  return (
    <header className={styles.subNav}>
      <span className={styles.subBack}><Icon name="chevronLeft" size={24} stroke={2.4} />{back}</span>
      <b>{title}</b>
      <span className={styles.subAction}>{action}</span>
    </header>
  );
}

function Seg({ items, on }: { items: readonly string[]; on: number }) {
  return (
    <div className={`${styles.seg} ${styles.segFixed}`}>
      {items.map((label, i) => <span key={i} data-on={i === on}>{label}</span>)}
    </div>
  );
}

const keyRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function Keyboard() {
  return (
    <div className={styles.keys}>
      {keyRows.map((row, r) => (
        <div key={r} className={styles.keyRow}>
          {r === 2 && <span className={`${styles.key} ${styles.keyWide}`}>⇧</span>}
          {[...row].map((k, i) => <span key={i} className={styles.key}>{k}</span>)}
          {r === 2 && <span className={`${styles.key} ${styles.keyWide}`}>⌫</span>}
        </div>
      ))}
      <div className={styles.keyRow}>
        <span className={`${styles.key} ${styles.keyWide}`}>123</span>
        <span className={`${styles.key} ${styles.keySpace}`}>space</span>
        <span className={`${styles.key} ${styles.keyGo}`}>return</span>
      </div>
    </div>
  );
}

const hhmm = (minute: number) => formatTime(minute).replace(" ", "");

/* ---------- scheduler panels ---------- */

function Week({ weekday, on, fixed = true }: { weekday: number; on: number; fixed?: boolean }) {
  return (
    <div className={`${styles.week} ${fixed ? styles.weekFixed : ""}`}>
      {weekdayShort.map((name, i) => (
        <div key={i} className={styles.day} data-today={i === on} data-past={i < weekday}>{name}<b>{5 + i}</b><i /></div>
      ))}
    </div>
  );
}

function Card({ post, clock }: { post: Post; clock: number }) {
  return (
    <div className={styles.card}>
      <span className={styles.time}>{hhmm(post.at)}<small>{post.at < clock ? "Published" : "Queued"}</small></span>
      <span>
        <div className={styles.copy}>{post.copy}</div>
        <div className={styles.chips}>
          <span className={styles.chip} style={{ background: post.channel.bg, color: post.channel.fg }}>{post.channel.name} · {post.client}</span>
          <span className={styles.state} data-ready={post.ready}>{post.ready ? "Approved" : "Needs review"}</span>
        </div>
      </span>
    </div>
  );
}

function queuePanel(posts: readonly Post[], clock: number, weekday: number, on: number): Panel {
  return {
    top: ROOT_TOP,
    bottom: TAB_BAR,
    className: styles.page,
    chrome: (
      <>
        <Nav title="Queue" trailing="plus" />
        <Week weekday={weekday} on={on} />
        <TabBar items={tabs("scheduler")} active="scheduler" tint="#0f62fe" />
      </>
    ),
    body: (
      <>
        <div className={styles.slotLabel}>{on === weekday ? "Today" : weekdayShort[on]} · {posts.length} scheduled</div>
        <div className={styles.cards}>{posts.map((post) => <Card key={post.id} post={post} clock={clock} />)}</div>
      </>
    ),
  };
}

function postPanel(post: Post, owner: Owner, approved: boolean): Panel {
  const ok = approved || post.ready;
  return {
    top: SUB_TOP,
    bottom: 96,
    className: styles.page,
    chrome: (
      <>
        <SubNav back="Queue" title="Post" action="Preview" />
        <div className={styles.actionBar}>
          <span className={styles.ghost}>Edit</span>
          <span className={styles.primary} data-done={ok}>{ok ? "Approved" : "Approve"}</span>
        </div>
      </>
    ),
    body: (
      <>
        <div className={styles.preview}>
          <div className={styles.previewHead}>
            <span className={styles.avatar} style={{ background: colorOf(post.client) }}>{initials(post.client)}</span>
            <span className={styles.who}>{post.client}<small>{post.channel.name} · {hhmm(post.at)}</small></span>
          </div>
          <p className={styles.previewCopy}>{post.copy}</p>
          <div className={styles.media} style={{ background: tints[post.tint] }} />
        </div>
        <div className={styles.meta}>
          <div><span>Channel</span><span>{post.channel.name}</span></div>
          <div><span>Scheduled</span><span>{hhmm(post.at)}</span></div>
          <div><span>Characters</span><span>{post.copy.length} / {post.channel.limit}</span></div>
          <div><span>Status</span><span data-ok={ok}>{ok ? `Approved by ${owner.firstName}` : "Waiting on you"}</span></div>
        </div>
      </>
    ),
  };
}

function composePanel(post: Post, share: number, onChannels: number): Panel {
  const text = post.copy.slice(0, Math.max(1, Math.ceil(post.copy.length * share)));
  return {
    className: styles.sheetPanel,
    body: null,
    chrome: (
      <div className={styles.sheet}>
        <div className={styles.sheetBar}><span>Cancel</span><b>{post.client}</b><span className={styles.sheetGo}>Schedule</span></div>
        <div className={styles.toggles}>
          {channels.map((c, i) => (
            <span key={c.id} className={styles.chip} style={(onChannels >> i) & 1 ? { background: c.bg, color: c.fg } : undefined}>{c.name}</span>
          ))}
        </div>
        <div className={styles.draft}>{text}<span className={styles.caret} /></div>
        <div className={styles.draftFoot}>
          <span className={styles.thumb} style={{ background: tints[post.tint] }} />
          <span>{post.channel.limit - text.length}</span>
        </div>
        <Keyboard />
      </div>
    ),
  };
}

function whenPanel(post: Post, weekday: number, rng: Rng): Panel {
  const slot = rng.int(1, 4);
  const base = Math.ceil(post.at / 30) * 30;
  return {
    className: styles.sheetPanel,
    body: null,
    chrome: (
      <div className={styles.sheet}>
        <div className={styles.sheetBar}><span>Back</span><b>Schedule</b><span className={styles.sheetGo}>Done</span></div>
        <Week weekday={weekday} on={Math.min(4, weekday + (slot > 2 ? 1 : 0))} fixed={false} />
        <div className={styles.slots}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} data-on={i === slot}>{hhmm(base + i * 45)}<small>{i === 1 ? "Best time" : `${rng.int(2, 9)}.${rng.int(0, 9)}K est. reach`}</small></div>
          ))}
        </div>
        <div className={styles.confirm}>Schedule for {hhmm(base + slot * 45)}</div>
      </div>
    ),
  };
}

/* ---------- analytics panels ---------- */

function analyticsPanel(seed: number, range: Range, index: number, posts: readonly Post[]): Panel {
  const rng = createRng(hash(seed, "range", range.id));
  const scale = range.points === 7 ? 1 : range.points === 15 ? 4.1 : 11.5;
  const n = range.points;
  const series = walk(rng, rng.int(900, 1400), n, -220, 280, 300);
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const W = 334;
  const H = 120;
  const pts = series.map((s, i) => [(i / (n - 1)) * W, H - 8 - ((s - lo) / (hi - lo || 1)) * (H - 24)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const reach = series.reduce((a, b) => a + b, 0) * 3 * (scale / (n / 7));
  const metrics = [
    { label: "Reach", value: compact(Math.round(reach)), delta: rng.int(-6, 18) },
    { label: "Engagement", value: `${rng.range(2.2, 5.8).toFixed(1)}%`, delta: rng.int(-4, 9) },
    { label: "Followers", value: compact(rng.int(4100, 6200) * 10), delta: rng.int(-1, 5) },
    { label: "Link clicks", value: compact(Math.round(rng.int(380, 1290) * scale)), delta: rng.int(-12, 22) },
  ];
  const shares = boroughs.map(() => rng.int(8, 40));
  const total = shares.reduce((a, b) => a + b, 0);
  return {
    top: SEG_TOP,
    bottom: TAB_BAR,
    className: styles.page,
    chrome: (
      <>
        <Nav title="Analytics" trailing="filter" />
        <Seg items={ranges.map((r) => r.label)} on={index} />
        <TabBar items={tabs("analytics")} active="analytics" tint="#0f62fe" />
      </>
    ),
    body: (
      <>
        <div className={styles.metrics}>
          {metrics.map((m, i) => (
            <div key={i} className={styles.metric}>
              <small>{m.label}</small>
              <b>{m.value}</b>
              <span className={styles.delta} data-up={m.delta >= 0}>{m.delta >= 0 ? "▲" : "▼"} {Math.abs(m.delta)}%</span>
            </div>
          ))}
        </div>
        <div className={styles.chart}>
          <div className={styles.chartTitle}>Daily reach<small>Last {range.label}</small></div>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Daily reach">
            <path d={`M0 ${H * 0.33}H${W}M0 ${H * 0.66}H${W}`} stroke="rgb(60 60 67 / 12%)" strokeWidth="0.5" />
            <path d={`${line}L${W} ${H}L0 ${H}Z`} fill="#0f62fe" opacity="0.1" />
            <path d={line} fill="none" stroke="#0f62fe" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="4" fill="#fff" stroke="#0f62fe" strokeWidth="2" />
          </svg>
        </div>
        <div className={styles.sectionLabel}>Top posts</div>
        <div className={styles.top}>
          {posts.slice(0, 5).map((post, i) => (
            <div key={post.id} className={styles.topRow}>
              <b>{i + 1}</b><span>{post.copy}</span><b>{compact(Math.round(post.reach * scale * (1 - i * 0.12)))}</b>
            </div>
          ))}
        </div>
        <div className={styles.sectionLabel}>Audience</div>
        <div className={styles.top}>
          {boroughs.map((name, i) => (
            <div key={i} className={styles.aud}>
              <span>{name}</span><i style={{ width: `${(shares[i] / total) * 240}px` }} /><b>{Math.round((shares[i] / total) * 100)}%</b>
            </div>
          ))}
        </div>
      </>
    ),
  };
}

function insightsPanel(seed: number, post: Post, scale: number): Panel {
  const rng = createRng(hash(seed, "insight", post.id));
  const hours = Array.from({ length: 12 }, () => rng.int(8, 100));
  const stats = [
    ["Reach", compact(Math.round(post.reach * scale))], ["Likes", compact(post.likes)], ["Comments", `${post.comments}`],
    ["Shares", `${rng.int(4, 400)}`], ["Saves", `${rng.int(10, 900)}`], ["Clicks", `${rng.int(20, 1600)}`],
  ];
  return {
    top: SUB_TOP,
    bottom: 34,
    className: styles.page,
    chrome: <SubNav back="Analytics" title="Post insights" action="Share" />,
    body: (
      <>
        <div className={styles.insHead}>
          <span className={styles.thumbLg} style={{ background: tints[post.tint] }} />
          <p>{post.copy}<small>{post.client} · {post.channel.name}</small></p>
        </div>
        <div className={styles.metrics}>
          {stats.map(([label, value], i) => <div key={i} className={styles.metric}><small>{label}</small><b>{value}</b></div>)}
        </div>
        <div className={styles.chart}>
          <div className={styles.chartTitle}>First 12 hours<small>Engagement</small></div>
          <div className={styles.hours}>{hours.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
        </div>
      </>
    ),
  };
}

/* ---------- comment panels ---------- */

const ageLabel = (age: number) => (age < 60 ? `${age}m` : `${Math.floor(age / 60)}h`);

function inboxPanel(list: readonly Comment[], filter: number): Panel {
  return {
    top: SEG_TOP,
    bottom: TAB_BAR,
    className: styles.page,
    chrome: (
      <>
        <Nav title="Inbox" trailing="filter" />
        <Seg items={["To answer", "Mentions", "All"]} on={filter} />
        <TabBar items={tabs("comments")} active="comments" tint="#0f62fe" />
      </>
    ),
    body: (
      <div className={styles.inbox}>
        {list.map((r, i) => (
          <div key={r.id} className={styles.comment}>
            <span className={styles.avatar} style={{ background: colorOf(r.name) }}>{initials(r.name)}</span>
            <span>
              <div className={styles.who}>{filter === 1 ? `@${r.handle}` : r.name}<small>{r.channel.name} · {ageLabel(r.age)}</small>{i === 0 && <span className={styles.pending}>New</span>}</div>
              <div className={styles.body}>{r.text}</div>
              <div className={styles.on}>On: {r.post}</div>
              <div className={styles.actions}>Reply · Like · Hide</div>
            </span>
          </div>
        ))}
      </div>
    ),
  };
}

function Thread({ comment, sent }: { comment: Comment; sent: boolean }) {
  return (
    <>
      <div className={styles.snippet}><small>{comment.channel.name} post</small>{comment.post}</div>
      <div className={styles.comment}>
        <span className={styles.avatar} style={{ background: colorOf(comment.name) }}>{initials(comment.name)}</span>
        <span><div className={styles.who}>{comment.name}<small>{ageLabel(comment.age)}</small></div><div className={styles.body}>{comment.text}</div></span>
      </div>
      {sent && <div className={styles.mine}>{comment.reply}<small>Sent · just now</small></div>}
    </>
  );
}

function replyPanel(comment: Comment, sent: boolean): Panel {
  const typed = comment.reply.slice(0, Math.ceil(comment.reply.length * 0.6));
  return {
    top: SUB_TOP,
    bottom: sent ? 90 : KEYBOARD + 56,
    className: styles.page,
    chrome: (
      <>
        <SubNav back="Inbox" title={comment.name.split(" ")[0]} />
        <div className={styles.composer} style={{ bottom: sent ? 34 : KEYBOARD }}>
          <span className={styles.field}>{sent ? "Reply…" : <>{typed}<span className={styles.caret} /></>}</span>
          <Icon name="send" size={24} filled={!sent} stroke={sent ? 1.8 : 0} />
        </div>
        {!sent && <Keyboard />}
      </>
    ),
    body: <Thread comment={comment} sent={sent} />,
  };
}

/* ---------- session ---------- */

type Ctx = { view: string; seed: number; duration: number; clock: number; weekday: number; owner: Owner };

type Builder = {
  rng: Rng;
  shots: Shot[];
  panels: Record<string, Panel>;
  tabOf: Record<string, TabId>;
  scroll: Record<string, number>;
  t: number;
  spent: number;
  at: string;
};

function session(ctx: Ctx): Session {
  const { seed, clock, weekday, owner } = ctx;
  const rng = createRng(hash(seed, "social-session"));
  const total = Math.max(1, ctx.duration);
  const b: Builder = { rng, shots: [], panels: {}, tabOf: {}, scroll: {}, t: 0, spent: 0, at: "" };

  // Content for this part of the scene.
  const dayPosts = (day: number) => {
    const r = createRng(hash(seed, "day", day));
    const start = Math.max(8 * 60, Math.ceil(clock / 30) * 30 - r.int(2, 5) * 60);
    let at = start;
    return Array.from({ length: 8 }, (_, i) => {
      const post = makePost(seed, day * 10 + i, at);
      at += r.pick([30, 45, 60, 90, 120]);
      return post;
    });
  };
  const posts: Post[][] = [];
  const postsFor = (day: number) => (posts[day] ??= dayPosts(day));
  let age = rng.int(1, 4);
  const answer = Array.from({ length: 7 }, (_, i) => makeComment(seed, i, (age += rng.int(2, 25))));
  age = rng.int(2, 9);
  const mentions = Array.from({ length: 5 }, (_, i) => makeComment(seed, 20 + i, (age += rng.int(5, 70))));
  const topPosts = Array.from({ length: 5 }, (_, i) => makePost(seed, 50 + i, clock - 600));

  const add = (id: string, tab: TabId, cost: number, make: () => Panel) => {
    if (b.panels[id]) return true;
    if (b.spent + cost > BUDGET) return false;
    b.panels[id] = make();
    b.tabOf[id] = tab;
    b.spent += cost;
    return true;
  };
  const go = (panel: string, enter: Enter, dt: number, extra: Partial<Shot> = {}) => {
    b.shots.push({ panel, at: b.t, enter, ...extra });
    if (extra.scroll !== undefined) b.scroll[panel] = extra.scroll;
    b.at = panel;
    b.t += dt;
  };
  const dt = (lo = 1.4, hi = 2.2) => rng.range(lo, hi);
  const scrollOf = (id: string) => b.scroll[id] ?? 0;
  const flickTo = (id: string, max: number) => {
    const from = scrollOf(id);
    let to = Math.round(rng.range(0, max));
    if (Math.abs(to - from) < 90) to = from > max / 2 ? Math.max(0, from - rng.int(140, 260)) : Math.min(max, from + rng.int(140, 260));
    return to;
  };

  const roots: Record<TabId, string> = { scheduler: `q${weekday}`, analytics: "an0", comments: "in0" };
  const ensureRoot = (tab: TabId) => {
    if (tab === "scheduler") return add(roots.scheduler, tab, 118, () => queuePanel(postsFor(weekday), clock, weekday, weekday));
    if (tab === "analytics") return add("an0", tab, 104, () => analyticsPanel(seed, ranges[0], 0, topPosts));
    return add("in0", tab, 112, () => inboxPanel(answer, 0));
  };
  const homeTab = (): TabId => (ctx.view === "analytics" ? "analytics" : ctx.view === "comments" ? "comments" : "scheduler");

  /** Brings the person back to a list in `tab`: back button, or a tab tap. */
  const toRoot = (tab: TabId, keep?: string) => {
    if (b.tabOf[b.at] === tab) {
      if (b.at.startsWith("q") || b.at.startsWith("an") || b.at.startsWith("in")) return b.at;
      const target = keep ?? roots[tab];
      go(target, "pop", dt(1.3, 1.7), { tap: BACK });
      return target;
    }
    go(roots[tab], "tab", dt(1.3, 1.8), { tap: { x: tabX[tab], y: TAB_Y } });
    return roots[tab];
  };

  // Episodes. Each returns false when it cannot run (budget, place).
  const flick = () => {
    const tab = b.tabOf[b.at] ?? homeTab();
    const id = toRoot(tab);
    const max = maxScroll(id);
    go(id, "pop", dt(1.5, 2.3), { scroll: flickTo(id, max), flicks: rng.int(1, 3) });
    return true;
  };

  const maxScroll = (id: string) => (id.startsWith("q") ? 300 : id.startsWith("an") ? 240 : id === "in0" ? 260 : 60);
  const used = new Set<string>();
  /** An unvisited row near the visible window; flicks to it first when it is off screen. */
  const pickRow = (list: string, count: number, stride: number, from: number) => {
    const scroll = scrollOf(list);
    const visible = Math.max(0, Math.floor((scroll - from) / stride));
    const order = Array.from({ length: count }, (_, k) => (visible + k) % count);
    const i = order.find((k) => !used.has(`${list}:${k}`)) ?? order[rng.int(0, Math.min(2, count - 1))];
    used.add(`${list}:${i}`);
    const want = Math.max(0, Math.min(maxScroll(list), from + i * stride - rng.int(60, 160)));
    if (Math.abs(want - scroll) > 180) go(list, "pop", dt(1.4, 1.9), { scroll: want, flicks: rng.int(1, 2) });
    return i;
  };

  const openPost = () => {
    const list = b.at.startsWith("q") ? b.at : roots.scheduler;
    if (!list.startsWith("q") || b.tabOf[b.at] !== "scheduler") return false;
    const day = Number(list.slice(1));
    const day0 = postsFor(day);
    const i = pickRow(list, day0.length, CARD, CARDS_FROM);
    const scroll = scrollOf(list);
    const post = day0[i];
    const id = `p${day}-${i}`;
    if (!add(id, "scheduler", 36, () => postPanel(post, owner, false))) return false;
    const y = ROOT_TOP + CARDS_FROM + i * CARD - scroll + 46;
    go(id, "push", dt(1.6, 2.2), { tap: { x: 200, y: Math.min(740, Math.max(ROOT_TOP + 20, y)) } });
    const branch = rng.weighted([["approve", post.ready ? 0 : 3], ["edit", 3], ["back", 1]] as const);
    if (branch === "approve" && add(`${id}-ok`, "scheduler", 36, () => postPanel(post, owner, true))) {
      go(`${id}-ok`, "cut", dt(1.3, 1.7), { tap: { x: 285, y: 790 } });
      go(list, "pop", dt(1.4, 2), { tap: BACK });
      return true;
    }
    if (branch === "edit" && add(`${id}-a`, "scheduler", 54, () => composePanel(post, 0.45, 1 << channels.indexOf(post.channel)))) {
      go(`${id}-a`, "sheet", dt(1.4, 1.9), { tap: { x: 105, y: 790 } });
      if (add(`${id}-b`, "scheduler", 54, () => composePanel(post, 1, (1 << channels.indexOf(post.channel)) | 0b1000))) go(`${id}-b`, "cut", dt(1.4, 1.8), { tap: { x: 300, y: 152 } });
      if (add(`${id}-w`, "scheduler", 26, () => whenPanel(post, weekday, createRng(hash(seed, id))))) {
        go(`${id}-w`, "push", dt(1.5, 2), { tap: { x: 345, y: 92 } });
        go(id, "dismiss", dt(1.3, 1.6), { tap: { x: 195, y: 760 } });
      } else go(id, "dismiss", dt(1.3, 1.6), { tap: { x: 345, y: 92 } });
    }
    go(list, "pop", dt(1.4, 2), { tap: BACK, scroll: Math.min(maxScroll(list), scroll + rng.int(60, 200)) });
    return true;
  };

  const switchDay = () => {
    if (b.tabOf[b.at] !== "scheduler" || !b.at.startsWith("q")) return false;
    const current = Number(b.at.slice(1));
    const options = [0, 1, 2, 3, 4].filter((d) => d !== current);
    const day = current !== weekday && rng.chance(0.6) ? weekday : rng.pick(options);
    const id = `q${day}`;
    if (!add(id, "scheduler", 108, () => queuePanel(postsFor(day), clock, weekday, day))) return false;
    go(id, "cut", dt(1.5, 2.2), { tap: { x: 16 + 71.6 * (day + 0.5), y: NAV + 30 }, scroll: rng.int(0, 2) * 120, flicks: 1 });
    return true;
  };

  const newPost = () => {
    if (b.tabOf[b.at] !== "scheduler" || !b.at.startsWith("q")) return false;
    const draft = makePost(seed, 90 + b.shots.length, clock + rng.int(60, 300));
    const id = `n${b.shots.length}`;
    if (!add(`${id}-a`, "scheduler", 54, () => composePanel(draft, 0.3, 1))) return false;
    const list = b.at;
    go(`${id}-a`, "sheet", dt(1.5, 2), { tap: { x: 360, y: 76 } });
    if (add(`${id}-b`, "scheduler", 54, () => composePanel(draft, 0.8, 0b0101))) go(`${id}-b`, "cut", dt(1.4, 1.9), { tap: { x: 210, y: 152 } });
    go(list, "dismiss", dt(1.4, 1.8), { tap: { x: 345, y: 92 } });
    return true;
  };

  const switchRange = () => {
    if (b.tabOf[b.at] !== "analytics") return false;
    const current = b.at.startsWith("an") ? Number(b.at.slice(2)) : 0;
    const index = rng.pick([0, 1, 2].filter((r) => r !== current));
    const id = `an${index}`;
    if (!add(id, "analytics", 104, () => analyticsPanel(seed, ranges[index], index, topPosts))) return false;
    if (!b.at.startsWith("an")) go(`an${current}`, "pop", dt(1.3, 1.6), { tap: BACK });
    go(id, "cut", dt(1.5, 2.1), { tap: { x: 76 + index * 119, y: 163 }, scroll: rng.chance(0.5) ? 0 : rng.int(80, 240), flicks: 1 });
    return true;
  };

  const openInsight = () => {
    if (!b.at.startsWith("an")) return false;
    const range = Number(b.at.slice(2));
    const list = b.at;
    const j = [0, 1, 2, 3].find((k) => !used.has(`${list}:x${k}`)) ?? rng.int(0, 3);
    used.add(`${list}:x${j}`);
    const id = `x${range}-${j}`;
    const scale = [1, 4.1, 11.5][range];
    if (!add(id, "analytics", 44, () => insightsPanel(seed, topPosts[j], scale * (1 - j * 0.12)))) return false;
    const scroll = scrollOf(list) < 120 ? 200 : scrollOf(list);
    if (scroll !== scrollOf(list)) go(list, "pop", dt(1.3, 1.6), { scroll, flicks: 1 });
    go(id, "push", dt(1.6, 2.2), { tap: { x: 190, y: SEG_TOP + 432 + j * 40 - scroll }, scroll: rng.int(80, 200), flicks: 1 });
    go(list, "pop", dt(1.4, 1.9), { tap: BACK });
    return true;
  };

  const filter = () => {
    if (b.tabOf[b.at] !== "comments") return false;
    const target = b.at === "in1" ? "in0" : "in1";
    if (!add(target, "comments", 90, () => (target === "in1" ? inboxPanel(mentions, 1) : inboxPanel(answer, 0)))) return false;
    if (!b.at.startsWith("in")) toRoot("comments");
    go(target, "cut", dt(1.4, 2), { tap: { x: target === "in1" ? 195 : 76, y: 163 }, scroll: rng.int(0, 2) * 110, flicks: 1 });
    return true;
  };

  const reply = () => {
    if (b.tabOf[b.at] !== "comments") return false;
    const list = b.at.startsWith("in") ? b.at : "in0";
    if (list !== b.at) toRoot("comments", list);
    const pool = list === "in1" ? mentions : answer;
    const i = pickRow(list, pool.length, COMMENT, 0);
    const scroll = scrollOf(list);
    const id = `r${list}-${i}`;
    if (!add(`${id}-a`, "comments", 52, () => replyPanel(pool[i], false))) return false;
    go(`${id}-a`, "push", dt(1.5, 2.1), { tap: { x: 200, y: SEG_TOP + i * COMMENT - scroll + 60 } });
    if (add(`${id}-b`, "comments", 22, () => replyPanel(pool[i], true))) go(`${id}-b`, "cut", dt(1.3, 1.7), { tap: { x: 360, y: 844 - KEYBOARD - 26 } });
    go(list, "pop", dt(1.4, 1.9), { tap: BACK, scroll: Math.min(maxScroll(list), scroll + rng.int(40, 130)) });
    return true;
  };

  const detour = () => {
    const tab = rng.pick((["scheduler", "analytics", "comments"] as const).filter((x) => x !== b.tabOf[b.at]));
    if (!ensureRoot(tab)) return false;
    toRoot(tab);
    b.t += rng.range(0.2, 0.6);
    return true;
  };

  const episodes: Record<TabId, readonly (readonly [() => boolean, number])[]> = {
    scheduler: [[flick, 3], [openPost, 5], [switchDay, 2], [newPost, 1.5], [detour, 0.6]],
    analytics: [[flick, 2], [switchRange, 4], [openInsight, 4], [detour, 0.6]],
    comments: [[flick, 2.5], [reply, 6], [filter, 2], [detour, 0.5]],
  };

  // Start.
  const tab = homeTab();
  ensureRoot(tab);
  const root = roots[tab];
  go(root, "cut", dt(1.5, 2.2), { scroll: rng.int(1, 2) * 100, flicks: 2 });
  let guard = 0;
  while (b.t < total && guard++ < 60) {
    const here = b.tabOf[b.at] ?? tab;
    // Drift back to the scene's main tab after a detour.
    const set = here !== tab && rng.chance(0.6) ? null : episodes[here];
    if (!set) {
      toRoot(tab);
      continue;
    }
    const episode = rng.weighted(set);
    if (!episode()) flick();
  }
  return { duration: total, shots: b.shots, panels: b.panels };
}

export function SocialManagerScreen(props: ScreenProps) {
  const part = Math.floor(Math.max(0, props.elapsed) / CHUNK);
  const start = part * CHUNK;
  const duration = Math.max(1, Math.min(CHUNK, props.duration - start));
  const ctx: Ctx = {
    view: props.view,
    seed: hash(props.seed, part),
    duration,
    clock: props.clock - props.elapsed + start,
    weekday: props.weekday,
    owner: props.owner,
  };
  return (
    <div className={styles.root}>
      <Storyboard id={`${props.view}:${props.seed}:${part}:${duration}`} elapsed={props.elapsed - start} build={() => session(ctx)} />
    </div>
  );
}

const socialManager: CloneDefinition = {
  Screen: SocialManagerScreen,
  tone: () => "dark",
  fixtures: [
    { view: "scheduler", label: "planning the day", seed: 12, clock: 9 * 60 + 20, duration: 10 },
    { view: "analytics", label: "weekly numbers", seed: 7, clock: 11 * 60 + 5, duration: 8 },
    { view: "comments", label: "clearing replies", seed: 19, clock: 14 * 60 + 15, duration: 12 },
    { view: "scheduler", label: "long queue session", seed: 40, clock: 15 * 60 + 2, duration: 24 },
    { view: "comments", label: "evening inbox", seed: 26, clock: 21 * 60 + 40, duration: 20 },
  ],
};

export default socialManager;
