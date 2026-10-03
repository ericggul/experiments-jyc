import { Icon, ios } from "../../ios";
import { createRng } from "../../model/rng";
import { formatDate, formatTime, weekdayOf } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./calendar.module.css";

const HOUR = 56;
const colors = [
  { fg: "#0a4aa6", bg: "#d6e6ff", bar: "#007aff" },
  { fg: "#8a2a1f", bg: "#ffdcd8", bar: "#ff3b30" },
  { fg: "#1d6a31", bg: "#d6f3dd", bar: "#34c759" },
  { fg: "#7a4a00", bg: "#ffe9c2", bar: "#ff9500" },
  { fg: "#5a2a9a", bg: "#e8dcfa", bar: "#af52de" },
];
const titles = [
  "Standup", "Q4 deck review", "1:1 with Maya", "Halvorsen call", "Design crit", "Sprint planning",
  "Pipeline review", "Focus time", "Lunch with Priya", "Vendor sync", "All-hands", "Interview: Designer",
  "Roadmap offsite prep", "Budget check-in",
];
const places = ["Huddle room 4B", "Conference B", "Video call", "Pantry", "Desk", "Cafe on 8th", "Large room"];

type Ev = { id: string; title: string; start: number; end: number; color: number; place: string; col: number; cols: number };

function buildEvents(seed: number): Ev[] {
  const rng = createRng(seed);
  const used = new Set<string>();
  const raw: Omit<Ev, "col" | "cols">[] = [{ id: "standup", title: "Standup", start: 9 * 60 + 30, end: 9 * 60 + 45, color: 0, place: "Video call" }];
  const count = rng.int(6, 8);
  for (let i = 0; i < count; i++) {
    const title = rng.pick(titles);
    if (used.has(title) || title === "Standup") continue;
    used.add(title);
    const start = rng.int(9, 17) * 60 + rng.pick([0, 0, 30, 15]);
    raw.push({ id: title, title, start, end: start + rng.pick([30, 45, 60, 60, 90]), color: rng.int(0, 4), place: rng.pick(places) });
  }
  raw.sort((a, b) => a.start - b.start || a.end - b.end);
  // Greedy column assignment inside clusters of overlapping events.
  const out: Ev[] = [];
  let cluster: Ev[] = [];
  let clusterEnd = -1;
  const flush = () => { const cols = Math.max(1, ...cluster.map((e) => e.col + 1)); cluster.forEach((e) => { e.cols = cols; }); out.push(...cluster); cluster = []; };
  for (const e of raw) {
    if (e.start >= clusterEnd && cluster.length) flush();
    const taken = new Set(cluster.filter((c) => c.end > e.start).map((c) => c.col));
    let col = 0;
    while (taken.has(col)) col++;
    cluster.push({ ...e, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  flush();
  return out;
}

const hourLabel = (h: number) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "Noon" : `${h - 12} PM`);

function Day({ seed, clock, day }: ScreenProps) {
  const events = buildEvents(seed);
  const weekday = weekdayOf(day);
  const [dayName, ...rest] = formatDate(day).split(", ");
  const letters = ["S", "M", "T", "W", "T", "F", "S"];
  const viewportH = 844 - 172 - 83;
  const total = 24 * HOUR;
  const top = Math.max(0, Math.min(total - viewportH, (clock / 60 - 2.5) * HOUR));
  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div className={styles.navRow}>
          <span className={styles.back}><Icon name="chevronLeft" size={22} stroke={2.4} /> {rest[0].split(" ")[0]}</span>
          <span className={styles.right}><Icon name="search" size={22} /><Icon name="plus" size={24} stroke={2.2} /></span>
        </div>
        <div className={styles.strip}>
          {letters.map((letter, i) => {
            const idx = i - 1; // Monday = 0
            const date = 4 + (Math.floor(day / 5) * 7) + (idx + 1);
            return (
              <span key={i}>
                {letter}
                <span className={styles.num} data-weekend={i === 0 || i === 6} data-today={idx === weekday}>{date > 31 ? date - 31 : date}</span>
              </span>
            );
          })}
        </div>
        <div className={styles.dayTitle}>{dayName}<small>{rest.join(", ")}</small></div>
      </div>
      <div className={styles.viewport}>
        <div className={`${styles.sheet} ${ios.flow}`} style={{ height: total, transform: `translateY(${-top}px)` }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className={styles.hour} style={{ top: h * HOUR + 8 }}>
              {h > 0 && <span>{hourLabel(h)}</span>}<i />
            </div>
          ))}
          {events.map((e) => {
            const c = colors[e.color];
            const width = (390 - 60 - 6) / e.cols;
            return (
              <div
                key={e.id}
                className={styles.event}
                style={{
                  top: (e.start / 60) * HOUR + 9,
                  height: Math.max(20, ((e.end - e.start) / 60) * HOUR - 2),
                  left: 58 + e.col * width,
                  width: width - 2,
                  background: c.bg,
                  color: c.fg,
                  borderLeftColor: c.bar,
                }}
              >
                {e.title}
                {e.end - e.start >= 45 && <small>{e.place}</small>}
                {e.end - e.start >= 60 && <small>{formatTime(e.start).replace(":00", "")} – {formatTime(e.end).replace(":00", "")}</small>}
              </div>
            );
          })}
          <div className={styles.now} style={{ top: (clock / 60) * HOUR + 8 }}>
            <span>{formatTime(clock).replace(" AM", "").replace(" PM", "")}</span><b /><i />
          </div>
        </div>
      </div>
      <div className={styles.toolbar}><span>Today</span><span>Calendars</span><span>Inbox</span></div>
    </div>
  );
}

export function CalendarScreen(props: ScreenProps) {
  return <Day {...props} />;
}

const calendar: CloneDefinition = {
  Screen: CalendarScreen,
  tone: () => "dark",
  fixtures: [
    { view: "day", label: "before standup", seed: 3, clock: 9 * 60 + 12, duration: 6 },
    { view: "day", label: "midday stack", seed: 17, clock: 13 * 60 + 35, duration: 6 },
    { view: "day", label: "late scramble", seed: 28, clock: 16 * 60 + 50, duration: 8 },
  ],
};

export default calendar;
