import { Icon, NavBar, Storyboard, Switch, TabBar, ios, wallpaperFor, type Panel, type Session, type TabItem } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatClock, formatTime, timeConfig } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import { createFlow } from "../home/flow";
import { LockScreen } from "../lock";
import type { CloneDefinition } from "../types";
import styles from "./alarm.module.css";

const SNOOZE_MINUTES = timeConfig.snoozeMinutes;

const tabs: readonly TabItem[] = [
  { id: "world", label: "World Clock", icon: "clock" },
  { id: "alarms", label: "Alarms", icon: "alarm" },
  { id: "stopwatch", label: "Stopwatch", icon: "clock" },
  { id: "timers", label: "Timers", icon: "hourglass" },
];

function Ringing({ clock, owner }: ScreenProps) {
  return (
    <div className={styles.ringing}>
      <div className={styles.wallpaper} style={{ background: wallpaperFor(owner.seed) }} />
      <div className={styles.shade} />
      <div className={styles.label}>Alarm</div>
      <div className={styles.time}>{formatClock(clock)}</div>
      <div className={styles.snooze}>Snooze</div>
      <div className={styles.slide}>
        <span className={styles.knob}><Icon name="alarm" size={26} stroke={2} /></span>
        <span className={styles.slideText}>slide to stop</span>
      </div>
    </div>
  );
}

function Snoozed(props: ScreenProps) {
  const remaining = Math.max(0, SNOOZE_MINUTES - props.elapsed);
  return (
    <>
      <LockScreen {...props} view="lock" />
      <div className={styles.activity}>
        <span className={styles.activityIcon}><Icon name="alarm" size={22} stroke={2.2} /></span>
        <span className={styles.activityText}>Alarm<small>Snoozed</small></span>
        <span className={styles.countdown}>{remaining}:00</span>
      </div>
    </>
  );
}

const CITIES: readonly (readonly [string, number])[] = [
  ["London", 5], ["Paris", 6], ["Tokyo", 13], ["Los Angeles", -3], ["Sydney", 15], ["Mumbai", 9.5], ["Dubai", 9], ["Mexico City", -1],
  ["Sao Paulo", 1], ["Berlin", 6], ["Seoul", 13], ["Lagos", 5], ["Reykjavik", 4], ["Singapore", 12], ["Honolulu", -6], ["Cairo", 7],
];
const LABELS = ["Alarm", "Weekdays", "Gym", "Meds", "Catch the L", "School run", "Call Mom", "Standup", "Laundry", "Leave for work", "Actually get up"];
const TAB_X = [52, 147, 243, 338];
const TAB_Y = 792;
const TAB_OF: Record<string, number> = { world: 0, alarms: 1, "alarms-b": 1, stopwatch: 2, timers: 3 };
const ROW_TOP = 336;
const ALARM_ROW = 90;

const clockTabs = (active: string) => <TabBar items={tabs} active={active} tint="#ff9f0a" tone="light" />;

type Entry = { id: string; minute: number; label: string; on: boolean };
type Owner = ScreenProps["owner"];

function alarmsFor(owner: Owner, seed: number): Entry[] {
  const rng = createRng(hash(seed, owner.seed, "alarms"));
  const wake = owner.alarm ?? 7 * 60;
  const count = rng.int(3, 5);
  return Array.from({ length: count }, (_, i) => ({
    id: `al-${i}`,
    minute: Math.round(((i === 0 ? wake + 10 : rng.int(5 * 60, 23 * 60)) % 1440) / 5) * 5,
    label: rng.pick(LABELS),
    on: rng.chance(0.6),
  })).sort((a, b) => a.minute - b.minute);
}

function Alarms({ owner, seed, flipped }: { owner: Owner; seed: number; flipped: number }) {
  const wake = owner.alarm ?? 7 * 60;
  const entries = alarmsFor(owner, seed);
  return (
    <>
      <NavBar title="Alarms" large leading={<span className={styles.edit}>Edit</span>} trailing={<Icon name="plus" size={24} stroke={2.2} style={{ color: "#ff9f0a" }} />} />
      <div className={styles.sectionLabel}><Icon name="moon" size={18} filled stroke={0} /> Sleep | Wake Up</div>
      <div className={styles.sleepRow}>
        <span>{owner.alarm === null ? "No Alarm" : formatTime(wake)}, weekdays</span>
        <span className={styles.change}>CHANGE</span>
      </div>
      <div className={styles.sectionLabel}>Other</div>
      {entries.map((alarm, index) => {
        const on = index === flipped ? !alarm.on : alarm.on;
        const [time, period] = formatTime(alarm.minute).split(" ");
        return (
          <div key={alarm.id} className={styles.alarmRow}>
            <span className={on ? undefined : styles.off}>
              <div className={styles.alarmTime}>{time}<small>{period}</small></div>
              <div className={styles.alarmLabel}>{alarm.label}</div>
            </span>
            <Switch on={on} />
          </div>
        );
      })}
    </>
  );
}

function World({ clock, seed }: { clock: number; seed: number }) {
  const rng = createRng(hash(seed, "world"));
  const pool = [...CITIES];
  const cities = Array.from({ length: 8 }, () => pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return (
    <>
      <NavBar title="World Clock" large leading={<span className={styles.edit}>Edit</span>} trailing={<Icon name="plus" size={24} stroke={2.2} style={{ color: "#ff9f0a" }} />} />
      {cities.map(([city, offset]) => {
        const local = clock + offset * 60;
        const dayWord = local >= 1440 ? "Tomorrow" : local < 0 ? "Yesterday" : "Today";
        return (
          <div key={city} className={styles.cityRow}>
            <span className={styles.cityName}><small>{dayWord}, +{offset}HRS</small>{city}</span>
            <span className={styles.cityTime}>{formatTime(local)}</span>
          </div>
        );
      })}
    </>
  );
}

function Stopwatch({ seed }: { seed: number }) {
  const rng = createRng(hash(seed, "stopwatch"));
  const laps = Array.from({ length: 6 }, (_, i) => ({ id: i, time: `0${rng.int(0, 1)}:${String(rng.int(10, 58)).padStart(2, "0")}.${String(rng.int(0, 99)).padStart(2, "0")}` }));
  return (
    <div className={styles.stopwatch}>
      <div className={styles.digits}>{`0${rng.int(2, 9)}:${String(rng.int(0, 59)).padStart(2, "0")}.${String(rng.int(0, 99)).padStart(2, "0")}`}</div>
      <div className={styles.buttons}><span className={styles.round}>Lap</span><span className={`${styles.round} ${styles.stop}`}>Stop</span></div>
      {laps.map((lap) => <div key={lap.id} className={styles.lap}><span>Lap {laps.length - lap.id}</span><span>{lap.time}</span></div>)}
    </div>
  );
}

function Timers({ seed }: { seed: number }) {
  const rng = createRng(hash(seed, "timers"));
  const recents = Array.from({ length: 3 }, (_, i) => ({ id: i, minutes: rng.pick([1, 3, 5, 10, 15, 20, 25, 45]), label: rng.pick(["Tea", "Pasta", "Laundry", "Plank", "Focus", "Nap"]) }));
  return (
    <div className={styles.timers}>
      <NavBar title="Timers" large leading={<span className={styles.edit}>Edit</span>} />
      <div className={styles.picker}>
        <span><b>{rng.int(0, 2)}</b>hours</span><span><b>{rng.int(0, 59)}</b>min</span><span><b>{rng.int(0, 59)}</b>sec</span>
      </div>
      <div className={styles.buttons}><span className={styles.round}>Cancel</span><span className={`${styles.round} ${styles.go}`}>Start</span></div>
      <div className={styles.sectionLabel}>Recents</div>
      {recents.map((r) => <div key={r.id} className={styles.lap}><span>{r.minutes}:00<small>{r.label}</small></span><span className={styles.change}>Start</span></div>)}
    </div>
  );
}

const around = (n: number, mod: number, step: number, pad: boolean) =>
  Array.from({ length: 5 }, (_, i) => {
    const v = (n + (i - 2) * step + mod * 2) % mod;
    return pad ? String(v).padStart(2, "0") : String(v === 0 ? mod : v);
  });

function AddAlarm({ seed }: { seed: number }) {
  const rng = createRng(hash(seed, "add"));
  const hour = rng.int(1, 12);
  const minute = rng.int(0, 11) * 5;
  const wheel = (name: string, values: readonly string[]) => (
    <span className={styles.wheel}>{values.map((v, i) => <i key={`${name}-${i}`} data-mid={i === 2}>{v}</i>)}</span>
  );
  return (
    <div className={styles.addAlarm}>
      <div className={styles.addHead}><span className={styles.edit}>Cancel</span><b>Add Alarm</b><span className={styles.edit}>Save</span></div>
      <div className={styles.wheels}>{wheel("h", around(hour, 12, 1, false))}{wheel("m", around(minute, 60, 5, true))}{wheel("p", ["", "AM", "PM", "", ""])}</div>
      <div className={styles.sleepRow}><span>Repeat</span><span>{rng.pick(["Never", "Weekdays", "Every day", "Mon, Wed, Fri"])}</span></div>
      <div className={styles.sleepRow}><span>Label</span><span>{rng.pick(LABELS)}</span></div>
      <div className={styles.sleepRow}><span>Sound</span><span>{rng.pick(["Radar", "Bells", "Chimes", "Early Riser"])}</span></div>
    </div>
  );
}

const withTabs = (active: string) => ({ chrome: clockTabs(active), bottom: 83, className: styles.panelDark });

/** Flicking around the Clock app: tabs, toggles, a new alarm, all in a blur. */
function setSession({ seed, duration, clock, owner }: Pick<ScreenProps, "seed" | "duration" | "clock" | "owner">): Session {
  const rng = createRng(hash(seed, "clock-session"));
  const total = Math.max(4, duration);
  const flipped = rng.int(0, alarmsFor(owner, seed).length - 1);
  const panels: Record<string, Panel> = {
    world: { body: <World clock={clock} seed={seed} />, ...withTabs("world") },
    alarms: { body: <Alarms owner={owner} seed={seed} flipped={-1} />, ...withTabs("alarms") },
    "alarms-b": { body: <Alarms owner={owner} seed={seed} flipped={flipped} />, ...withTabs("alarms") },
    stopwatch: { body: <Stopwatch seed={seed} />, ...withTabs("stopwatch") },
    timers: { body: <Timers seed={seed} />, ...withTabs("timers") },
    sheet: { body: <AddAlarm seed={seed} />, className: styles.panelSheet, top: 54 },
  };
  const tabIds = ["world", "alarms", "stopwatch", "timers"] as const;
  const flow = createFlow(total);
  let at = "alarms";
  let toggled = false;
  flow.go("alarms", rng.range(1.4, 2));
  while (flow.open) {
    const dwell = rng.range(1.35, 2.3);
    const onAlarms = at === "alarms" || at === "alarms-b";
    const action = rng.weighted([["tab", 5], ["toggle", onAlarms ? 4 : 0], ["add", onAlarms ? 1.5 : 0]] as const);
    if (action === "toggle") {
      toggled = !toggled;
      at = toggled ? "alarms-b" : "alarms";
      flow.go(at, dwell, { enter: "tab", tap: { x: 340, y: ROW_TOP + ALARM_ROW * flipped + 36 } });
    } else if (action === "add") {
      flow.go("sheet", dwell + 0.6, { enter: "sheet", tap: { x: 345, y: 98 } });
      flow.go(at, dwell, { enter: "dismiss", tap: { x: 345, y: 80 } });
    } else {
      const next = rng.pick(tabIds.filter((_, i) => i !== TAB_OF[at]));
      at = next === "alarms" ? (toggled ? "alarms-b" : "alarms") : next;
      flow.go(at, dwell, { enter: "tab", tap: { x: TAB_X[TAB_OF[at]], y: TAB_Y }, scroll: next === "world" ? rng.int(160, 300) : undefined, flicks: 2 });
    }
  }
  return { duration: total, shots: flow.shots, panels };
}

function AlarmList({ seed, duration, owner, elapsed, clock }: ScreenProps) {
  return (
    <div className={`${styles.clock} ${ios.dark}`}>
      <Storyboard id={`clock:${seed}:${duration}:${owner.id}`} elapsed={elapsed} build={() => setSession({ seed, duration, clock, owner })} />
    </div>
  );
}

export function AlarmScreen(props: ScreenProps) {
  if (props.view === "snoozed") return <Snoozed {...props} />;
  if (props.view === "set") return <AlarmList {...props} />;
  return <Ringing {...props} />;
}

const alarm: CloneDefinition = {
  Screen: AlarmScreen,
  tone: () => "light",
  fixtures: [
    { view: "ringing", label: "alarm rings", clock: 7 * 60 + 30, duration: 2 },
    {
      view: "snoozed",
      label: "first snooze",
      clock: 7 * 60 + 31,
      duration: SNOOZE_MINUTES,
      pushes: [{ id: "s1", at: 7 * 60 + 18, app: "messages", title: "Jordan", body: "you up? the L is a mess again" }],
    },
    { view: "set", label: "setting tomorrow's alarm", clock: 23 * 60 + 48, duration: 14 },
    { view: "set", label: "tuning the morning", seed: 21, clock: 6 * 60 + 40, duration: 30 },
  ],
};

export default alarm;
