import { Icon, NavBar, Switch, TabBar, ios, wallpaperFor, type TabItem } from "../../ios";
import { formatClock, formatTime, timeConfig } from "../../model/time";
import type { ScreenProps } from "../../model/types";
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

function AlarmList({ owner, seed }: ScreenProps) {
  const wake = owner.alarm ?? 7 * 60;
  const extras = [wake + 10, wake + 20, 9 * 60 + 30].slice(0, 1 + (seed % 3));
  return (
    <div className={`${styles.clock} ${ios.dark}`}>
      <NavBar title="Alarms" large leading={<span className={styles.edit}>Edit</span>} trailing={<Icon name="plus" size={24} stroke={2.2} style={{ color: "#ff9f0a" }} />} />
      <div className={styles.sectionLabel}><Icon name="moon" size={18} filled stroke={0} /> Sleep | Wake Up</div>
      <div className={styles.sleepRow}>
        <span>{owner.alarm === null ? "No Alarm" : formatTime(wake)}, weekdays</span>
        <span className={styles.change}>CHANGE</span>
      </div>
      <div className={styles.sectionLabel}>Other</div>
      {extras.map((minute, index) => {
        const on = index === 0;
        const [time, period] = formatTime(minute).split(" ");
        return (
          <div key={minute} className={styles.alarmRow}>
            <span className={on ? undefined : styles.off}>
              <div className={styles.alarmTime}>{time}<small>{period}</small></div>
              <div className={styles.alarmLabel}>{index === 0 ? "Alarm, weekdays" : index === 1 ? "Actually get up" : "Alarm"}</div>
            </span>
            <Switch on={on} />
          </div>
        );
      })}
      <TabBar items={tabs} active="alarms" tint="#ff9f0a" tone="light" />
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
    { view: "set", label: "setting tomorrow's alarm", clock: 23 * 60 + 48, duration: 3 },
  ],
};

export default alarm;
