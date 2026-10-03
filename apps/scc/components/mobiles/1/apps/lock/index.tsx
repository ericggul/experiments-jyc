import { Icon, Notification, ios, wallpaperFor } from "../../ios";
import { formatClock, formatDate, formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./lock.module.css";

const VISIBLE = 3;

export function LockScreen({ view, clock, day, owner, pushes }: ScreenProps) {
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
  const shown = pushes.slice(0, VISIBLE);
  const hidden = pushes.length - shown.length;
  return (
    <div className={styles.screen}>
      <div className={styles.wallpaper} style={{ background: wallpaperFor(owner.seed) }} />
      <div className={styles.dim} />
      <div className={styles.header}>
        <div className={styles.date}>{formatDate(day)}</div>
        <div className={styles.time}>{formatClock(clock)}</div>
      </div>
      {shown.length > 0 && (
        <div className={styles.stack}>
          {shown.map((push) => <div key={push.id} className={ios.appear}><Notification push={push} clock={clock} /></div>)}
          {hidden > 0 && <div className={styles.more}>{hidden} more notification{hidden === 1 ? "" : "s"}</div>}
        </div>
      )}
      <div className={styles.quick} aria-hidden="true">
        <span><Icon name="flashlight" size={22} /></span>
        <span><Icon name="camera" size={22} /></span>
      </div>
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
      duration: 6,
      pushes: [
        { id: "f1", at: 7 * 60 + 10, app: "messages", title: "Mom", body: "Did you get home ok last night? Call me when you can x" },
        { id: "f2", at: 7 * 60 + 2, app: "team-chat", title: "#design-crit", subtitle: "Priya Shah", body: "Moving crit to 10:30, the client deck isn't ready" },
        { id: "f3", at: 6 * 60 + 41, app: "news", title: "Daily", body: "Subway delays expected on the L line after overnight signal problems" },
        { id: "f4", at: 6 * 60 + 5, app: "bank", title: "Ledger", body: "Your balance is below $100.00" },
        { id: "f5", at: 5 * 60, app: "weather", title: "Weather", body: "Rain starting around 8 AM" },
      ],
    },
    { view: "lock", label: "empty", clock: 14 * 60 + 3, duration: 4, pushes: [] },
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
