import { AppIcon, Icon, Notification, Storyboard, ios, wallpaperFor, type Panel, type Session } from "../../ios";
import { catalogue } from "../../model/catalogue";
import { createRng, hash } from "../../model/rng";
import { formatClock, formatDate, formatTime } from "../../model/time";
import type { Push, ScreenProps } from "../../model/types";
import { createFlow } from "../home/flow";
import type { CloneDefinition } from "../types";
import styles from "./lock.module.css";

const VISIBLE = 3;
const LIST_CAP = 10;
const ROW = 100;
const EVENTS = ["Design crit", "Standup", "Lunch with Priya", "Dentist", "1:1 with Dana", "School pickup", "Yoga", "Offsite planning", "Flight check-in", "Vet appointment"];
const CONDITIONS = ["Partly Cloudy", "Light Rain", "Sunny", "Overcast", "Clear", "Windy"];
const VIEWFINDERS = ["linear-gradient(170deg, #5b7a99, #2b3a4a 70%)", "linear-gradient(170deg, #c7a27c, #6b4f3a 70%)", "linear-gradient(170deg, #6fa383, #25402f 70%)", "linear-gradient(170deg, #8a8fb5, #2d2f4a 70%)"];
const MODES = ["Video", "Photo", "Portrait", "Pano"];

const wallpaper = (seed: number) => (
  <>
    <div className={styles.bgWall} style={{ background: wallpaperFor(seed) }} />
    <div className={styles.bgDim} />
  </>
);

function Clockface({ clock, day }: { clock: number; day: number }) {
  return (
    <div className={styles.header}>
      <div className={styles.date}>{formatDate(day)}</div>
      <div className={styles.time}>{formatClock(clock)}</div>
    </div>
  );
}

const quick = (
  <div className={styles.quick} aria-hidden="true">
    <span><Icon name="flashlight" size={22} /></span>
    <span><Icon name="camera" size={22} /></span>
  </div>
);

function Stack({ pushes, clock }: { pushes: readonly Push[]; clock: number }) {
  const shown = pushes.slice(0, VISIBLE);
  const hidden = pushes.length - shown.length;
  if (shown.length === 0) return null;
  return (
    <div className={styles.stack}>
      {shown.map((push) => <Notification key={push.id} push={push} clock={clock} />)}
      {hidden > 0 && <div className={styles.more}>{hidden} more notification{hidden === 1 ? "" : "s"}</div>}
    </div>
  );
}

function Widgets({ seed, clock, owner }: { seed: number; clock: number; owner: ScreenProps["owner"] }) {
  const rng = createRng(hash(seed, "widgets"));
  const events = Array.from({ length: 3 }, (_, i) => ({ id: i, title: rng.pick(EVENTS), at: Math.round((clock + 25 + i * rng.int(40, 110)) / 5) * 5 }));
  return (
    <div className={styles.widgets}>
      <div className={styles.widget}>
        <span className={styles.widgetTitle}>{owner.work === "Home" ? owner.home : owner.work}</span>
        <span className={styles.temp}>{rng.int(46, 82)}°</span>
        <span className={styles.widgetSub}>{rng.pick(CONDITIONS)} · H:{rng.int(60, 84)}° L:{rng.int(38, 58)}°</span>
      </div>
      <div className={styles.widget}>
        <span className={styles.widgetTitle}>Calendar</span>
        {events.map((e) => <span key={e.id} className={styles.event}><i />{e.title}<small>{formatTime(e.at)}</small></span>)}
      </div>
      <div className={styles.widgetRow}>
        <div className={styles.widget}><span className={styles.widgetTitle}>Steps</span><span className={styles.stat}>{rng.int(900, 11800).toLocaleString("en-US")}</span></div>
        <div className={styles.widget}><span className={styles.widgetTitle}>Battery</span><span className={styles.stat}>{rng.int(18, 96)}%</span></div>
      </div>
    </div>
  );
}

function Camera({ seed }: { seed: number }) {
  const rng = createRng(hash(seed, "camera"));
  const mode = rng.int(0, 3);
  return (
    <>
      <div className={styles.finder} style={{ background: VIEWFINDERS[seed % VIEWFINDERS.length] }}><span className={styles.zoom}>{rng.pick(["1×", "2×", ".5"])}</span></div>
      <div className={styles.modes}>{MODES.map((name, i) => <span key={name} data-on={i === mode}>{name}</span>)}</div>
      <span className={styles.shutter} />
    </>
  );
}

/** Pushes grouped by app, for the group that expands when tapped. */
function bigGroup(pushes: readonly Push[]): readonly Push[] {
  const counts = new Map<string, Push[]>();
  for (const push of pushes) counts.set(push.app, [...(counts.get(push.app) ?? []), push]);
  return [...counts.values()].reduce<Push[]>((best, group) => (group.length > best.length ? group : best), []);
}

/**
 * Someone picking up a locked phone: look at the stack, open it, scroll the
 * list, pull down the notification centre, swipe to widgets or the camera.
 */
function lockSession({ seed, duration, clock, day, owner, pushes }: Pick<ScreenProps, "seed" | "duration" | "clock" | "day" | "owner" | "pushes">): Session {
  const rng = createRng(hash(seed, "lock-session"));
  const total = Math.max(4, duration);
  const list = pushes.slice(0, LIST_CAP);
  const group = bigGroup(list);
  const maxScroll = Math.max(0, list.length * ROW + 24 - 740);
  const panels: Record<string, Panel> = {
    lock: { body: null, chrome: <>{wallpaper(owner.seed)}<Clockface clock={clock} day={day} /><Stack pushes={pushes} clock={clock} />{quick}</>, className: styles.panelClear },
    widgets: { body: <Widgets seed={seed} clock={clock} owner={owner} />, top: 120, chrome: <>{wallpaper(owner.seed)}<div className={styles.headline}>{formatClock(clock)}</div></>, className: styles.panelClear },
    camera: { body: <Camera seed={seed} />, chrome: null, className: styles.panelBlack },
  };
  if (list.length > 0) {
    panels.list = {
      body: <div className={styles.list}>{list.map((push) => <Notification key={push.id} push={push} clock={clock} />)}</div>,
      top: 96,
      chrome: <>{wallpaper(owner.seed)}<div className={styles.headline}>Notification Center<small>{list.length}</small></div></>,
      className: styles.panelClear,
    };
  }
  if (group.length > 1) {
    panels.group = {
      body: (
        <div className={styles.list}>
          <div className={styles.groupHead}><AppIcon app={group[0].app} size={22} />{catalogue[group[0].app].title}<small>Show Less</small></div>
          {group.map((push) => <Notification key={push.id} push={push} clock={clock} />)}
        </div>
      ),
      top: 96,
      chrome: wallpaper(owner.seed),
      className: styles.panelClear,
    };
  }
  const flow = createFlow(total);
  const actions: (readonly [string, number])[] = [["widgets", 2], ["camera", 1.2]];
  if (list.length > 0) actions.push(["expand", 3], ["centre", 2.4]);
  if (group.length > 1) actions.push(["group", 2.4]);
  flow.go("lock", rng.range(1.4, 2));
  while (flow.open) {
    const dwell = rng.range(1.4, 2.3);
    const action = rng.weighted(actions);
    if (action === "widgets") {
      flow.go("widgets", dwell, { enter: "pop" });
      flow.go("lock", dwell, { enter: "push" });
    } else if (action === "camera") {
      flow.go("camera", dwell, { enter: "push" });
      flow.go("lock", dwell, { enter: "pop" });
    } else if (action === "group") {
      flow.go("group", dwell + 0.4, { enter: "tab", tap: { x: 195, y: 590 }, scroll: Math.max(0, group.length * ROW - 600), flicks: 1 });
      flow.go("lock", dwell, { enter: "tab", tap: { x: 330, y: 120 } });
    } else if (action === "expand") {
      flow.go("list", dwell + 0.9, { enter: "tab", tap: { x: 195, y: 650 }, scroll: rng.int(Math.min(maxScroll, 80), maxScroll), flicks: 2 });
      flow.go("lock", dwell, { enter: "fade" });
    } else {
      flow.go("list", dwell + 0.9, { enter: "swipe-down", scroll: rng.int(Math.min(maxScroll, 80), maxScroll), flicks: 2 });
      flow.go("lock", dwell, { enter: "fade" });
    }
  }
  return { duration: total, shots: flow.shots, panels };
}

export function LockScreen({ view, clock, day, owner, pushes, seed, elapsed, duration }: ScreenProps) {
  if (view === "standby") {
    // StandBy night mode: the phone charges on its side, everything tinted red.
    return (
      <div className={styles.standby}>
        <div className={styles.standbyFace}>
          <div className={styles.standbyTime}>{formatClock(clock)}</div>
          {owner.alarm !== null && <div className={styles.standbyAlarm}><Icon name="alarm" size={18} stroke={2.2} /> {formatTime(owner.alarm)}</div>}
        </div>
      </div>
    );
  }
  if (view === "always-on") {
    return (
      <div className={styles.screen}>
        <div className={styles.wallpaper} style={{ background: wallpaperFor(owner.seed) }} />
        <div className={styles.aodDim} />
        <div className={`${styles.header} ${styles.aod}`}>
          <div className={styles.date}>{formatDate(day)}</div>
          <div className={styles.time}>{formatClock(clock)}</div>
        </div>
        {pushes.length > 0 && <div className={styles.aodCount}>{pushes.length} Notification{pushes.length === 1 ? "" : "s"}</div>}
      </div>
    );
  }
  if (view === "sleep") {
    return (
      <div className={styles.sleep}>
        <div className={styles.header}>
          <div className={styles.date}>{formatDate(day)}</div>
          <div className={styles.time}>{formatClock(clock)}</div>
          <span className={styles.focus}><Icon name="moon" size={16} filled stroke={0} /> Sleep</span>
        </div>
        {owner.alarm !== null && <div className={styles.nextAlarm}>Alarm {formatTime(owner.alarm)}</div>}
      </div>
    );
  }
  const props = { clock, day, owner, pushes, seed, duration };
  return (
    <div className={`${styles.screen} ${ios.dark}`}>
      <Storyboard id={`lock:${seed}:${duration}:${owner.id}:${pushes.length}`} elapsed={elapsed} build={() => lockSession(props)} />
    </div>
  );
}

const lock: CloneDefinition = {
  Screen: LockScreen,
  tone: () => "light",
  fixtures: [
    {
      view: "lock",
      label: "morning stack",
      clock: 7 * 60 + 12,
      duration: 12,
      pushes: [
        { id: "f1", at: 7 * 60 + 10, app: "messages", title: "Mom", body: "Did you get home ok last night? Call me when you can x" },
        { id: "f2", at: 7 * 60 + 2, app: "team-chat", title: "#design-crit", subtitle: "Priya Shah", body: "Moving crit to 10:30, the client deck isn't ready" },
        { id: "f3", at: 6 * 60 + 41, app: "news", title: "Daily", body: "Subway delays expected on the L line after overnight signal problems" },
        { id: "f4", at: 6 * 60 + 5, app: "bank", title: "Ledger", body: "Your balance is below $100.00" },
        { id: "f5", at: 5 * 60, app: "weather", title: "Weather", body: "Rain starting around 8 AM" },
      ],
    },
    { view: "lock", label: "empty", clock: 14 * 60 + 3, duration: 8, pushes: [] },
    { view: "sleep", label: "sleep focus", clock: 1 * 60 + 20, duration: 6, pushes: [] },
    {
      view: "always-on",
      label: "always-on, in a pocket",
      clock: 10 * 60 + 40,
      duration: 8,
      pushes: [{ id: "a1", at: 10 * 60 + 35, app: "team-chat", title: "#growth", subtitle: "Dana Ortiz", body: "can someone pull last week's numbers" }],
    },
    { view: "standby", label: "standby on the nightstand", clock: 3 * 60 + 12, duration: 8, pushes: [] },
  ],
};

export default lock;
