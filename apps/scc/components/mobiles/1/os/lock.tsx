import { Icon } from "../ios";
import { formatAge } from "../model/time";
import type { Push } from "../model/types";
import { OsIcon } from "./icon";
import styles from "./os.module.css";
import { osWallpaper } from "./wallpaper";

const VISIBLE = 3;

/** The hands-on lock screen, laid out like the real one at 390 pt wide. */
export function OsLock({ date, minute, pushes }: { date: Date; minute: number; pushes: readonly Push[] }) {
  const hours = date.getHours() % 12 || 12;
  const time = `${hours}:${String(date.getMinutes()).padStart(2, "0")}`;
  const day = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const shown = pushes.slice(0, VISIBLE);
  return (
    <div className={styles.lock} style={{ background: osWallpaper }}>
      <Icon name="lock" size={16} stroke={2.4} className={styles.lockGlyph} />
      <div className={styles.lockDate}>{day}</div>
      <div className={styles.lockTime}>{time}</div>
      {shown.length > 0 && (
        <div className={styles.lockStack}>
          {shown.map((push, index) => (
            <div key={push.id} className={styles.lockCard} style={index === VISIBLE - 1 && pushes.length > VISIBLE ? { marginBottom: 10 } : undefined}>
              <OsIcon app={push.app} size={38} />
              <span className={styles.lockCardTitle}>{push.title}</span>
              <span className={styles.lockCardAge}>{formatAge(minute - push.at)}</span>
              <span className={styles.lockCardBody}>{push.subtitle ? `${push.subtitle}: ` : ""}{push.body}</span>
            </div>
          ))}
          {pushes.length > VISIBLE && <div className={styles.lockMore}>{pushes.length - VISIBLE} more</div>}
        </div>
      )}
      <span className={`${styles.lockButton} ${styles.lockLeft}`}><Icon name="flashlight" size={22} stroke={2} /></span>
      <span className={`${styles.lockButton} ${styles.lockRight}`}><Icon name="camera" size={22} stroke={2} /></span>
    </div>
  );
}
