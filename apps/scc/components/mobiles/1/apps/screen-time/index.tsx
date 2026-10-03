import { AppIcon, Icon, Storyboard, type Panel, type Session } from "../../ios";
import { catalogue, type AppId } from "../../model/catalogue";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ArchetypeId, Owner, ScreenProps } from "../../model/types";
import { createFlow } from "../home/flow";
import type { CloneDefinition } from "../types";
import styles from "./screen-time.module.css";

/** Average daily minutes by person type. */
const BASE: Record<ArchetypeId, number> = {
  "early-analyst": 318, "snoozer-creative": 402, "office-commuter": 351, "suburban-parent": 287, "remote-late": 440,
  "social-manager": 496, "client-sales": 372, "gig-courier": 415, "early-shift": 296, "grad-student": 388, "new-parent": 344, founder: 428,
};

const CATS = [
  { id: "social", label: "Social", color: "#5ac8fa" },
  { id: "productivity", label: "Productivity", color: "#ff9f0a" },
  { id: "entertainment", label: "Entertainment", color: "#af52de" },
  { id: "other", label: "Other", color: "#8e8e93" },
] as const;
type CatIndex = 0 | 1 | 2 | 3;

const TRACKED: readonly (readonly [AppId, CatIndex])[] = [
  ["messages", 0], ["photo-feed", 0], ["social-manager", 0], ["mail", 1], ["team-chat", 1], ["calendar", 1], ["short-video", 2], ["audio", 2], ["news", 2],
  ["transit", 3], ["navigation", 3], ["shopping", 3], ["wallet", 3], ["bank", 3],
];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const durShort = (m: number) => {
  const total = Math.round(m);
  const h = Math.floor(total / 60);
  return h > 0 ? `${h}h ${total % 60}m` : `${total}m`;
};
const hm = (m: number) => (
  <>{Math.floor(m / 60)}<small> h </small>{Math.round(m % 60)}<small> min</small></>
);

type Usage = { app: AppId; cat: CatIndex; minutes: number; notifs: number; pickups: number };

/** The person's apps ranked for this scene: totals scale with the archetype and the hours awake. */
function usageFor(owner: Owner, seed: number, scale: number): Usage[] {
  const rng = createRng(hash(owner.seed, seed, "usage"));
  const apps = [...TRACKED];
  for (let i = apps.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [apps[i], apps[j]] = [apps[j], apps[i]];
  }
  const total = BASE[owner.archetype] * scale * rng.range(0.9, 1.1);
  const weights = apps.map((_, i) => 1 / (i + 1.3));
  const sum = weights.reduce((a, b) => a + b, 0);
  return apps.map(([app, cat], i) => ({
    app,
    cat,
    minutes: (total * weights[i]) / sum,
    notifs: Math.round(rng.range(3, 60) * scale * (cat === 0 ? 2 : 1)),
    pickups: Math.round(rng.range(2, 20) * scale),
  }));
}

const catMinutes = (usage: readonly Usage[], cat: number) => usage.filter((u) => u.cat === cat).reduce((a, u) => a + u.minutes, 0);

function Bars({ seed, avg, tint = "#5ac8fa", today = 6 }: { seed: number; avg: number; tint?: string; today?: number }) {
  const rng = createRng(hash(seed, "bars"));
  const days = Array.from({ length: 7 }, (_, i) => Math.max(8, avg * (i === 0 || i === 6 ? rng.range(0.85, 1.35) : rng.range(0.6, 1.25))));
  const max = Math.max(...days, avg) * 1.08;
  return (
    <div className={styles.chart}>
      <div className={styles.avg} style={{ bottom: `${20 + (avg / max) * 110}px` }} />
      {days.map((d, i) => (
        <div key={DAY_LABELS[i] + i} className={styles.col}>
          <div className={styles.bar} style={{ height: (d / max) * 110, background: tint }} />
          <span className={styles.dayLabel} data-today={i === today}>{DAY_LABELS[i]}</span>
        </div>
      ))}
    </div>
  );
}

function AppRow({ item, max }: { item: Usage; max: number }) {
  return (
    <div className={styles.app}>
      <AppIcon app={item.app} size={38} />
      <span className={styles.appName}>
        {catalogue[item.app].title}
        <span className={styles.appTrack}><span className={styles.fill} style={{ width: `${(item.minutes / max) * 100}%`, background: CATS[item.cat].color }} /></span>
      </span>
      <span className={styles.appTime}>{durShort(item.minutes)}</span>
      <Icon name="chevronRight" size={14} stroke={2.4} className={styles.chev} />
    </div>
  );
}

function Header({ back, title }: { back: string; title: string }) {
  return (
    <div className={styles.header}>
      <span className={styles.back}><Icon name="chevronLeft" size={20} stroke={2.4} />{back}</span>
      <b>{title}</b>
    </div>
  );
}

function Report({ owner, seed, weekly, clock }: { owner: Owner; seed: number; weekly: boolean; clock: number }) {
  const rng = createRng(hash(owner.seed, seed, "report"));
  const wake = owner.alarm ?? 7 * 60;
  const scale = weekly ? 1 : Math.max(0.12, (clock - wake) / 960);
  const usage = usageFor(owner, seed, scale);
  const total = usage.reduce((a, u) => a + u.minutes, 0);
  const pct = rng.int(3, 24);
  const up = rng.chance(0.62);
  const shares = CATS.map((_, k) => catMinutes(usage, k) / total);
  const pickups = Math.round(rng.int(62, 128) * scale);
  const notifs = Math.round(rng.int(118, 296) * scale);
  const hourNow = Math.floor(clock / 60);
  const hours = Array.from({ length: 24 }, (_, h) => (h >= Math.floor(wake / 60) && h <= hourNow ? Math.min(60, rng.range(6, 52) * (h === hourNow ? (clock % 60) / 60 : 1)) : 0));
  return (
    <div className={styles.pad}>
      <h1 className={styles.title}>{weekly ? "Weekly Report" : "Screen Time"}</h1>
      {weekly && <p className={styles.lead}>Your screen time was {up ? "up" : "down"} {pct}% last week, for an average of {durShort(total)} a day.</p>}
      <div className={styles.card}>
        <div className={styles.cardLabel}>{weekly ? "Daily Average" : "Today so far"}</div>
        <div className={styles.big}>{hm(total)}</div>
        {weekly ? (
          <>
            <div className={styles.delta}>{up ? "▲" : "▼"} {pct}% from prior week</div>
            <Bars seed={seed} avg={total} today={rng.int(1, 5)} />
          </>
        ) : (
          <div className={styles.hours}>{hours.map((m, h) => <span key={h} className={styles.hour} style={{ height: `${(m / 60) * 100}%` }} />)}</div>
        )}
      </div>
      <div className={styles.card}>
        <div className={styles.cardLabel}>Most Used Categories</div>
        <div className={styles.cats}>
          {CATS.slice(0, 3).map((c, k) => (
            <div key={c.id} className={styles.cat}>
              <span>{c.label}</span>
              <span className={styles.track}><span className={styles.fill} style={{ width: `${shares[k] * 100}%`, background: c.color }} /></span>
              <span className={styles.time}>{durShort(total * shares[k])}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.pair}>
        <div className={styles.card}><div className={styles.cardLabel}>Pickups</div><div className={styles.stat}>{pickups}</div><div className={styles.delta}>{weekly ? "per day" : "so far"}</div></div>
        <div className={styles.card}><div className={styles.cardLabel}>Notifications</div><div className={styles.stat}>{notifs}</div><div className={styles.delta}>{weekly ? "per day" : "so far"}</div></div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardLabel}>Most Used</div>
        <div className={styles.apps}>{usage.slice(0, 6).map((u) => <AppRow key={u.app} item={u} max={usage[0].minutes} />)}</div>
      </div>
    </div>
  );
}

function Category({ owner, seed, scale, cat }: { owner: Owner; seed: number; scale: number; cat: CatIndex }) {
  const usage = usageFor(owner, seed, scale).filter((u) => u.cat === cat);
  const total = usage.reduce((a, u) => a + u.minutes, 0);
  return (
    <div className={styles.pad}>
      <h1 className={styles.title}>{CATS[cat].label}</h1>
      <div className={styles.card}>
        <div className={styles.cardLabel}>Daily Average</div>
        <div className={styles.big}>{hm(total)}</div>
        <Bars seed={seed + cat} avg={total} tint={CATS[cat].color} />
      </div>
      <div className={styles.card}>
        <div className={styles.cardLabel}>Apps</div>
        <div className={styles.apps}>{usage.slice(0, 4).map((u) => <AppRow key={u.app} item={u} max={usage[0].minutes} />)}</div>
      </div>
    </div>
  );
}

function Detail({ owner, seed, scale, rank }: { owner: Owner; seed: number; scale: number; rank: number }) {
  const all = usageFor(owner, seed, scale);
  const item = all[Math.min(rank, all.length - 1)];
  return (
    <div className={styles.pad}>
      <div className={styles.detailHead}><AppIcon app={item.app} size={56} /><h1 className={styles.title}>{catalogue[item.app].title}</h1></div>
      <div className={styles.card}>
        <div className={styles.cardLabel}>Daily Average</div>
        <div className={styles.big}>{hm(item.minutes)}</div>
        <Bars seed={seed + rank * 7} avg={item.minutes} tint={CATS[item.cat].color} />
      </div>
      <div className={styles.pair}>
        <div className={styles.card}><div className={styles.cardLabel}>Notifications</div><div className={styles.stat}>{item.notifs}</div></div>
        <div className={styles.card}><div className={styles.cardLabel}>Pickups</div><div className={styles.stat}>{item.pickups}</div></div>
      </div>
      <div className={styles.card}><div className={styles.cardLabel}>App Limit</div><div className={styles.stat}>{rank % 2 === 0 ? "None" : durShort(Math.round(item.minutes / 15) * 15)}</div></div>
    </div>
  );
}

function Pickups({ owner, seed, scale }: { owner: Owner; seed: number; scale: number }) {
  const rng = createRng(hash(owner.seed, seed, "pickups"));
  const usage = usageFor(owner, seed, scale);
  const wake = Math.floor((owner.alarm ?? 7 * 60) / 60);
  const rows = Array.from({ length: 12 }, (_, i) => ({ id: i, at: (wake + i) * 60 + rng.int(0, 50), count: rng.int(1, 14), app: usage[rng.int(0, 4)].app }));
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <div className={styles.pad}>
      <h1 className={styles.title}>Pickups</h1>
      <div className={styles.card}>
        <div className={styles.cardLabel}>First used after pickup</div>
        {rows.map((r) => (
          <div key={r.id} className={styles.pickup}>
            <span className={styles.pickTime}>{formatTime(r.at)}</span>
            <span className={styles.track}><span className={styles.fill} style={{ width: `${(r.count / max) * 100}%`, background: "#5ac8fa" }} /></span>
            <span className={styles.time}>{r.count} · {catalogue[r.app].title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notifications({ owner, seed, scale }: { owner: Owner; seed: number; scale: number }) {
  const usage = [...usageFor(owner, seed, scale)].sort((a, b) => b.notifs - a.notifs).slice(0, 8);
  return (
    <div className={styles.pad}>
      <h1 className={styles.title}>Notifications</h1>
      <div className={styles.card}>
        <div className={styles.apps}>
          {usage.map((u) => (
            <div key={u.app} className={styles.app}>
              <AppIcon app={u.app} size={38} />
              <span className={styles.appName}>{catalogue[u.app].title}<small>{DAY_NAMES[(u.notifs + seed) % 7]} was busiest</small></span>
              <span className={styles.appTime}>{u.notifs}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SCROLL_MAX = { weekly: 440, daily: 420 };

/**
 * A look at one's own habits: skim the report, tap into a category, then an
 * app, back out, check pickups and notifications. Taps lead every push.
 */
function reportSession({ seed, duration, clock, owner, view }: Pick<ScreenProps, "seed" | "duration" | "clock" | "owner" | "view">): Session {
  const weekly = view !== "daily";
  const rng = createRng(hash(seed, "report-session"));
  const total = Math.max(4, duration);
  const wake = owner.alarm ?? 7 * 60;
  const scale = weekly ? 1 : Math.max(0.12, (clock - wake) / 960);
  const root = weekly ? "weekly" : "daily";
  const sub = weekly ? "Screen Time" : "Back";
  const nav = (title: string, back: string) => ({ chrome: <Header back={back} title={title} />, top: 98, className: styles.panelGrouped });
  const panels: Record<string, Panel> = {
    [root]: { body: <Report owner={owner} seed={seed} weekly={weekly} clock={clock} />, ...nav(weekly ? "Weekly Report" : "Today", "Settings") },
    pickups: { body: <Pickups owner={owner} seed={seed} scale={scale} />, ...nav("Pickups", sub) },
    notifs: { body: <Notifications owner={owner} seed={seed} scale={scale} />, ...nav("Notifications", sub) },
  };
  ([0, 1, 2] as const).forEach((cat) => {
    panels[`cat-${cat}`] = { body: <Category owner={owner} seed={seed} scale={scale} cat={cat} />, ...nav(CATS[cat].label, sub) };
  });
  [0, 1, 2].forEach((rank) => {
    panels[`app-${rank}`] = { body: <Detail owner={owner} seed={seed} scale={scale} rank={rank} />, ...nav("App", sub) };
  });
  const flow = createFlow(total);
  const max = SCROLL_MAX[weekly ? "weekly" : "daily"];
  let scroll = 0;
  const skim = () => {
    scroll = scroll >= max - 40 ? rng.int(0, 60) : Math.min(max, scroll + rng.int(140, 300));
    return scroll;
  };
  flow.go(root, rng.range(1.5, 2.3), { scroll: skim(), flicks: 2 });
  while (flow.open) {
    const dwell = () => rng.range(1.35, 2.2);
    const detour = rng.weighted([["cat", 4], ["app", 3], ["pickups", 2], ["notifs", 2]] as const);
    const tap = { x: 195, y: rng.int(330, 600) };
    if (detour === "cat") {
      const cat = rng.int(0, 2);
      flow.go(`cat-${cat}`, dwell(), { enter: "push", tap, scroll: rng.int(0, 120), flicks: 1 });
      if (rng.chance(0.6)) {
        flow.go(`app-${rng.int(0, 2)}`, dwell(), { enter: "push", tap: { x: 195, y: rng.int(470, 640) } });
        flow.go(`cat-${cat}`, dwell(), { enter: "pop", tap: { x: 40, y: 76 } });
      }
    } else if (detour === "app") {
      flow.go(`app-${rng.int(0, 2)}`, dwell(), { enter: "push", tap, scroll: rng.int(0, 90), flicks: 1 });
    } else {
      flow.go(detour, dwell(), { enter: "push", tap, scroll: rng.int(120, 320), flicks: 2 });
    }
    flow.go(root, dwell(), { enter: "pop", tap: { x: 40, y: 76 }, scroll: skim(), flicks: 2 });
  }
  return { duration: total, shots: flow.shots, panels };
}

export function ScreenTimeScreen(props: ScreenProps) {
  const { seed, duration, owner, elapsed, view } = props;
  return (
    <div className={styles.screen}>
      <Storyboard id={`report:${view}:${seed}:${duration}:${owner.id}`} elapsed={elapsed} build={() => reportSession(props)} />
    </div>
  );
}

const screenTime: CloneDefinition = {
  Screen: ScreenTimeScreen,
  tone: () => "dark",
  fixtures: [
    { view: "weekly-report", label: "monday report", seed: 5, clock: 9 * 60 + 2, duration: 12 },
    { view: "weekly-report", label: "digging into habits", seed: 18, clock: 22 * 60 + 15, duration: 30 },
    { view: "daily", label: "checking today", seed: 11, clock: 14 * 60 + 20, duration: 12 },
  ],
};

export default screenTime;
