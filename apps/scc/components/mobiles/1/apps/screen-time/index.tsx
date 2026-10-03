import { AppIcon } from "../../ios";
import { catalogue, type AppId } from "../../model/catalogue";
import { createRng } from "../../model/rng";
import type { ArchetypeId, ScreenProps } from "../../model/types";
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

const TRACKED: readonly AppId[] = ["messages", "mail", "photo-feed", "short-video", "team-chat", "news", "audio", "transit", "navigation", "shopping", "wallet", "bank"];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const dur = (m: number) => {
  const total = Math.round(m);
  const h = Math.floor(total / 60);
  return h > 0 ? `${h} h ${total % 60} min` : `${total} min`;
};
const durShort = (m: number) => {
  const total = Math.round(m);
  const h = Math.floor(total / 60);
  return h > 0 ? `${h}h ${total % 60}m` : `${total}m`;
};

/** Category shares sum to 1 and lean with the person. */
function shares(archetype: ArchetypeId, seed: number) {
  const rng = createRng(seed ^ 0x77aa);
  const bias = {
    social: archetype === "social-manager" ? 0.46 : archetype === "grad-student" ? 0.3 : 0.3,
    productivity: archetype === "founder" || archetype === "client-sales" ? 0.34 : 0.22,
    entertainment: archetype === "remote-late" || archetype === "snoozer-creative" ? 0.3 : 0.2,
  };
  const raw = [bias.social + rng.range(-0.05, 0.05), bias.productivity + rng.range(-0.04, 0.04), bias.entertainment + rng.range(-0.04, 0.04)];
  const other = Math.max(0.06, 1 - raw[0] - raw[1] - raw[2]);
  const all = [...raw, other];
  const sum = all.reduce((a, b) => a + b, 0);
  return all.map((v) => v / sum);
}

function Weekly({ seed, owner }: ScreenProps) {
  const rng = createRng(owner.seed ^ (seed * 31));
  const avg = BASE[owner.archetype] + rng.int(-30, 30);
  const pct = rng.int(3, 24);
  const up = rng.chance(0.62);
  const days = Array.from({ length: 7 }, (_, i) => Math.max(40, avg * (i === 0 || i === 6 ? rng.range(0.85, 1.35) : rng.range(0.7, 1.2))));
  const max = Math.max(...days, avg) * 1.08;
  const s = shares(owner.archetype, owner.seed);
  const pickups = rng.int(62, 128);
  const notifs = rng.int(118, 296);
  return (
    <div className={`${styles.screen}`}>
      <div className={styles.body}>
        <div className={styles.nav}><span>Back</span><span>Done</span></div>
        <h1 className={styles.title}>Weekly Report</h1>
        <p className={styles.lead}>
          Your screen time was {up ? "up" : "down"} {pct}% last week, for an average of {dur(avg)} a day.
        </p>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Daily Average</div>
          <div className={styles.big}>{Math.floor(avg / 60)}<small> h </small>{Math.round(avg % 60)}<small> min</small></div>
          <div className={styles.delta}>{up ? "▲" : "▼"} {pct}% from prior week</div>
          <div className={styles.chart}>
            <div className={styles.avg} style={{ bottom: `${20 + (avg / max) * 130}px` }} />
            <span className={styles.avgLabel} style={{ bottom: `${20 + (avg / max) * 130}px` }}>avg</span>
            {days.map((d, i) => {
              const h = (d / max) * 130;
              return (
                <div key={DAY_LABELS[i] + i} className={styles.col}>
                  <div className={styles.bar} style={{ height: h }}>
                    {s.map((share, k) => <span key={CATS[k].id} className={styles.seg} style={{ height: `${share * 100}%`, background: CATS[k].color }} />)}
                  </div>
                  <span className={styles.dayLabel} data-today={i === 6}>{DAY_LABELS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Most Used Categories</div>
          <div className={styles.cats}>
            {CATS.slice(0, 3).map((c, k) => (
              <div key={c.id} className={styles.cat}>
                <span>{c.label}</span>
                <span className={styles.track}><span className={styles.fill} style={{ width: `${s[k] * 100}%`, background: c.color, display: "block" }} /></span>
                <span className={styles.time}>{durShort(avg * s[k])}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.pair}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Pickups</div>
            <div className={styles.stat}>{pickups}</div>
            <div className={styles.delta}>per day, {rng.int(2, 19)}% {up ? "more" : "fewer"}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Notifications</div>
            <div className={styles.stat}>{notifs}</div>
            <div className={styles.delta}>per day, {rng.int(1, 14)}% {up ? "more" : "fewer"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Daily({ seed, owner, clock }: ScreenProps) {
  const rng = createRng(owner.seed ^ (seed * 17));
  const wake = owner.alarm ?? 7 * 60;
  const awake = Math.max(0, clock - wake);
  const total = (BASE[owner.archetype] / 960) * awake * rng.range(0.92, 1.08);
  const s = shares(owner.archetype, owner.seed);
  const hourNow = Math.floor(clock / 60);
  const hours = Array.from({ length: 24 }, (_, h) => {
    const active = h >= Math.floor(wake / 60) && h <= hourNow;
    const partial = h === hourNow ? (clock % 60) / 60 : 1;
    return active ? Math.min(60, rng.range(6, 52) * partial) : 0;
  });
  const apps = createRng(owner.seed ^ 0x1234);
  const list = [...TRACKED].sort(() => apps.next() - 0.5).slice(0, 5);
  const weights = list.map((_, i) => 1 / (i + 1.4));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const pickups = Math.round((awake / 960) * 96);
  const notifs = Math.round((awake / 960) * 214);
  return (
    <div className={styles.screen}>
      <div className={styles.body}>
        <div className={styles.nav}><span>Back</span><span>Edit</span></div>
        <h1 className={styles.title}>Screen Time</h1>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Today so far</div>
          <div className={styles.big}>{Math.floor(total / 60)}<small> h </small>{Math.round(total % 60)}<small> min</small></div>
          <div className={styles.hours}>
            {hours.map((m, h) => <span key={h} className={styles.hour} style={{ height: `${(m / 60) * 100}%` }} />)}
            {[0, 6, 12, 18].map((h) => <span key={h} className={styles.hourTick} style={{ left: `${(h / 24) * 100}%` }}>{h === 0 ? "12 AM" : h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}</span>)}
          </div>
          <div className={styles.legend}>
            {CATS.slice(0, 3).map((c, k) => <span key={c.id}><i className={styles.dotKey} style={{ background: c.color }} />{c.label} {durShort(total * s[k])}</span>)}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Most Used</div>
          <div className={styles.apps}>
            {list.map((app, i) => (
              <div key={app} className={styles.app}>
                <AppIcon app={app} size={38} />
                <span className={styles.appName}>
                  {catalogue[app].title}
                  <span className={styles.appTrack}><span className={styles.fill} style={{ display: "block", width: `${(weights[i] / weights[0]) * 100}%`, background: "#5ac8fa" }} /></span>
                </span>
                <span className={styles.appTime}>{durShort(total * 0.8 * (weights[i] / wsum))}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.pair}>
          <div className={styles.card}><div className={styles.cardLabel}>Pickups</div><div className={styles.stat}>{pickups}</div></div>
          <div className={styles.card}><div className={styles.cardLabel}>Notifications</div><div className={styles.stat}>{notifs}</div></div>
        </div>
      </div>
    </div>
  );
}

export function ScreenTimeScreen(props: ScreenProps) {
  return props.view === "daily" ? <Daily {...props} /> : <Weekly {...props} />;
}

const screenTime: CloneDefinition = {
  Screen: ScreenTimeScreen,
  tone: () => "dark",
  fixtures: [
    { view: "weekly-report", label: "monday report", seed: 5, clock: 9 * 60 + 2, duration: 3 },
    { view: "daily", label: "checking today", seed: 11, clock: 14 * 60 + 20, duration: 2 },
  ],
};

export default screenTime;
