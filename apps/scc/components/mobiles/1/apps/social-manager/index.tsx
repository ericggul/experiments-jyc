import { Icon, TabBar, type TabItem } from "../../ios";
import { createRng, type Rng } from "../../model/rng";
import { formatTime, weekdayShort } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./social-manager.module.css";

const channels = [
  { id: "chirp", name: "Chirp", fg: "#0b5cad", bg: "#d7e9ff" },
  { id: "frame", name: "Frame", fg: "#9b2a6b", bg: "#fbdcee" },
  { id: "loop", name: "Loop", fg: "#7a3d00", bg: "#ffe5c4" },
  { id: "pro", name: "Pro", fg: "#14523a", bg: "#d4f0e2" },
] as const;
const posts = [
  "Meet the team behind our Q4 launch. Three months of work, one very tired designer.",
  "New on the blog: how Brightwater cut onboarding time by 40%.",
  "Reminder: our fall webinar is Thursday at 1pm ET. Link in bio.",
  "Behind the scenes at the Halvorsen shoot. Shot list is wild.",
  "We hit 50k. Thank you. Giveaway details inside.",
  "Hiring: Senior product designer, hybrid in New York.",
  "Tip of the week: batch your approvals on Monday mornings.",
  "Our October roundup is live. Five things we learned.",
];
const commenters = ["Maya Okafor", "Dev Patel", "Sam Rivera", "Lena Fischer", "Marcus Webb", "Priya Nair", "Tomás Herrera", "Aiko Tanaka", "Jordan Blake", "Chloe Bennett"];
const comments = [
  "Love this! When does the new version ship?",
  "Is this available in the EU yet?",
  "Pricing page says something different, can you clarify?",
  "Great thread, bookmarking for my team.",
  "Still waiting on a reply to my DM from last week.",
  "Who designed the cover? It looks amazing.",
  "Does this integrate with our existing setup?",
  "Link in bio is broken for me.",
];
const hues = ["#e8912d", "#2eb67d", "#5b6ee1", "#e0746b", "#7c3aed", "#0f766e", "#c2410c", "#2563eb"];
const colorOf = (name: string) => hues[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % hues.length];
const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");

const tabs = (active: string): TabItem[] => [
  { id: "scheduler", label: "Schedule", icon: "calendar" },
  { id: "analytics", label: "Analytics", icon: "chart" },
  { id: "comments", label: "Inbox", icon: "bubble", badge: active === "comments" ? 0 : 14 },
  { id: "me", label: "Account", icon: "person" },
];

function sample<T>(rng: Rng, items: readonly T[], n: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return out;
}


/** Running sum of steps: returns n values starting at `start`, each after adding step(). */
function walk(start: number, n: number, step: () => number, floor = -Infinity): number[] {
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < n; i++) {
    out.push(v);
    v = Math.max(floor, v + step());
  }
  return out;
}

function Nav({ title, trailing }: { title: string; trailing: string }) {
  return (
    <div className={styles.nav}>
      <div className={styles.navRow}><span>Edit</span><Icon name={trailing === "plus" ? "plus" : "filter"} size={24} stroke={2.2} /></div>
      <h1 className={styles.large}>{title}</h1>
    </div>
  );
}

function Scheduler({ seed, clock, weekday }: ScreenProps) {
  const rng = createRng(seed);
  const items = sample(rng, posts, 5);
  const ats = walk(Math.max(8 * 60, Math.ceil(clock / 30) * 30 - 30), items.length, () => rng.pick([60, 90, 120, 180]));
  const rows = items.map((copy, i) => ({ id: `${seed}-${i}`, copy, at: ats[i], channel: rng.pick(channels), ready: rng.chance(0.7) }));
  return (
    <div className={styles.root}>
      <Nav title="Queue" trailing="plus" />
      <div className={styles.week}>
        {weekdayShort.map((name, i) => (
          <div key={name} className={styles.day} data-today={i === weekday}>{name}<b>{5 + i}</b><i /></div>
        ))}
      </div>
      <div className={styles.slotLabel}>Today · {rows.length} scheduled</div>
      <div className={styles.cards}>
        {rows.map((row) => (
          <div key={row.id} className={styles.card}>
            <span className={styles.time}>{formatTime(row.at).replace(" ", "")}<small>{row.at < clock ? "Published" : "Queued"}</small></span>
            <span>
              <div className={styles.copy}>{row.copy}</div>
              <div className={styles.chips}>
                <span className={styles.chip} style={{ background: row.channel.bg, color: row.channel.fg }}>{row.channel.name}</span>
                <span className={styles.state} data-ready={row.ready}>{row.ready ? "Approved" : "Needs review"}</span>
              </div>
            </span>
          </div>
        ))}
      </div>
      <TabBar items={tabs("scheduler")} active="scheduler" tint="#0f62fe" />
    </div>
  );
}

function Analytics({ seed, elapsed }: ScreenProps) {
  const rng = createRng(seed);
  const n = 14;
  const series = walk(rng.int(900, 1400), n, () => rng.int(-180, 260), 400);
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const W = 334;
  const H = 120;
  const pts = series.map((s, i) => [(i / (n - 1)) * W, H - 8 - ((s - lo) / (hi - lo || 1)) * (H - 24)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const reach = series.reduce((a, b) => a + b, 0) * 3 + elapsed * 40;
  const metrics = [
    { label: "Reach", value: `${(reach / 1000).toFixed(1)}K`, delta: rng.int(-6, 18) },
    { label: "Engagement", value: `${(rng.range(2.2, 5.8)).toFixed(1)}%`, delta: rng.int(-4, 9) },
    { label: "Followers", value: `${(rng.int(41, 62) / 10).toFixed(1)}K`, delta: rng.int(-1, 5) },
    { label: "Link clicks", value: `${rng.int(380, 1290)}`, delta: rng.int(-12, 22) },
  ];
  const top = sample(rng, posts, 3);
  return (
    <div className={styles.root}>
      <Nav title="Analytics" trailing="filter" />
      <div className={styles.seg}>{["7 days", "30 days", "90 days"].map((s, i) => <span key={s} data-on={i === 0}>{s}</span>)}</div>
      <div className={styles.metrics}>
        {metrics.map((m) => (
          <div key={m.label} className={styles.metric}>
            <small>{m.label}</small>
            <b>{m.value}</b>
            <span className={styles.delta} data-up={m.delta >= 0}>{m.delta >= 0 ? "▲" : "▼"} {Math.abs(m.delta)}%</span>
          </div>
        ))}
      </div>
      <div className={styles.chart}>
        <div className={styles.chartTitle}>Daily reach<small>Last 14 days</small></div>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Daily reach">
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgb(60 60 67 / 12%)" strokeWidth="0.5" />)}
          <path d={`${line}L${W} ${H}L0 ${H}Z`} fill="#0f62fe" opacity="0.1" />
          <path d={line} fill="none" stroke="#0f62fe" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="4" fill="#fff" stroke="#0f62fe" strokeWidth="2" />
        </svg>
      </div>
      <div className={styles.top}>
        {top.map((copy, i) => (
          <div key={copy} className={styles.topRow}>
            <b>{i + 1}</b><span>{copy}</span><b>{rng.int(2, 19)}.{rng.int(0, 9)}K</b>
          </div>
        ))}
      </div>
      <TabBar items={tabs("analytics")} active="analytics" tint="#0f62fe" />
    </div>
  );
}

function Comments({ seed, clock, elapsed }: ScreenProps) {
  const rng = createRng(seed);
  const names = sample(rng, commenters, 7);
  const texts = sample(rng, comments, 7);
  const ts = walk(clock - elapsed - 3, names.length, () => -rng.int(4, 40));
  const visible = names.map((name, i) => ({ name, text: texts[i], channel: rng.pick(channels), age: clock - ts[i], post: rng.pick(posts) }));
  return (
    <div className={styles.root}>
      <Nav title="Inbox" trailing="filter" />
      <div className={styles.seg}>{["To answer", "Mentions", "All"].map((s, i) => <span key={s} data-on={i === 0}>{s}</span>)}</div>
      <div className={styles.inbox}>
        {visible.slice(0, 6).map((r, i) => (
          <div key={r.name} className={styles.comment}>
            <span className={styles.avatar} style={{ background: colorOf(r.name) }}>{initials(r.name)}</span>
            <span>
              <div className={styles.who}>{r.name}<small>{r.channel.name} · {r.age < 60 ? `${r.age}m` : `${Math.floor(r.age / 60)}h`}</small>{i === 0 && <span className={styles.pending}>New</span>}</div>
              <div className={styles.body}>{r.text}</div>
              <div className={styles.on}>On: {r.post.slice(0, 34)}…</div>
              <div className={styles.actions}><span>Reply</span><span>Like</span><span>Hide</span></div>
            </span>
          </div>
        ))}
      </div>
      <TabBar items={tabs("comments")} active="comments" tint="#0f62fe" />
    </div>
  );
}

export function SocialManagerScreen(props: ScreenProps) {
  if (props.view === "analytics") return <Analytics {...props} />;
  if (props.view === "comments") return <Comments {...props} />;
  return <Scheduler {...props} />;
}

const socialManager: CloneDefinition = {
  Screen: SocialManagerScreen,
  tone: () => "dark",
  fixtures: [
    { view: "scheduler", label: "planning the day", seed: 12, clock: 9 * 60 + 20, duration: 10 },
    { view: "analytics", label: "weekly numbers", seed: 7, clock: 11 * 60 + 5, duration: 8 },
    { view: "comments", label: "clearing replies", seed: 19, clock: 14 * 60 + 15, duration: 12 },
  ],
};

export default socialManager;
