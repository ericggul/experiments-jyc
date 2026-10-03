import type { CSSProperties, ReactNode } from "react";
import { catalogue, type AppId } from "../model/catalogue";
import { formatAge, formatClock } from "../model/time";
import type { Minute, Push } from "../model/types";
import { Icon, type IconName } from "./icons";
import styles from "./ios.module.css";

export { Icon, type IconName } from "./icons";
export { Swap } from "./swap";
export { Storyboard, type Panel, type Session, type Shot, type Enter } from "./storyboard";
export { PlaybackContext, usePlayback, type Playback } from "./playback";
export { styles as ios };

export type Tone = "light" | "dark";

export function StatusBar({ clock, battery, charging = false, tone = "dark" }: {
  clock: Minute;
  /** 0–1. */
  battery: number;
  charging?: boolean;
  /** Glyph colour: "light" on dark screens. */
  tone?: Tone;
}) {
  const level = Math.max(0.04, Math.min(1, battery));
  const state = charging ? "charging" : level <= 0.2 ? "low" : undefined;
  return (
    <div className={styles.statusBar} data-tone={tone} aria-hidden="true">
      <span className={styles.statusTime}>{formatClock(clock)}</span>
      <span />
      <span className={styles.statusRight}>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" />
          <rect x="15" y="0" width="3" height="12" rx="0.8" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.4 10.4 0 0 0 8 .5C5.2.5 2.6 1.6.6 3.5l1.2 1.2A8.7 8.7 0 0 1 8 2.2z" />
          <path d="M8 5.6c1.5 0 2.8.6 3.8 1.5L13 5.9A7 7 0 0 0 8 3.9a7 7 0 0 0-5 2l1.2 1.2c1-.9 2.3-1.5 3.8-1.5z" />
          <path d="M8 9c.6 0 1.1.2 1.5.6L8 11.5 6.5 9.6c.4-.4.9-.6 1.5-.6z" />
        </svg>
        <span className={styles.battery}>
          <span className={styles.batteryLevel} data-state={state} style={{ width: `${level * 21}px` }} />
        </span>
      </span>
    </div>
  );
}

export function HomeIndicator({ tone = "dark" }: { tone?: Tone }) {
  return <span className={styles.homeIndicator} data-tone={tone} aria-hidden="true" />;
}

/** Continuous-corner app icon for any catalogue app. */
export function AppIcon({ app, size = 38 }: { app: AppId; size?: number }) {
  const entry = catalogue[app];
  return (
    <span
      className={styles.appIcon}
      style={{ width: size, height: size, borderRadius: size * 0.225, background: entry.tint }}
      aria-hidden="true"
    >
      <Icon name={entry.icon as IconName} size={size * 0.58} stroke={2} />
    </span>
  );
}

/** One notification as a banner or lock-screen card. */
export function Notification({ push, clock, dark = false }: { push: Push; clock: Minute; dark?: boolean }) {
  return (
    <div className={`${styles.notification} ${dark ? styles.notificationDark : ""}`}>
      <AppIcon app={push.app} />
      <span className={styles.notificationTitle}>{push.title}</span>
      <span className={styles.notificationAge}>{formatAge(clock - push.at)}</span>
      {push.subtitle && <span className={styles.notificationSubtitle}>{push.subtitle}</span>}
      <span className={styles.notificationBody}>{push.body}</span>
    </div>
  );
}

export function Banner({ push, clock, dark }: { push: Push; clock: Minute; dark?: boolean }) {
  return (
    <div className={styles.banner}>
      <Notification push={push} clock={clock} dark={dark} />
    </div>
  );
}

export function NavBar({ title, large = false, leading, trailing, children }: {
  title: string;
  large?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={styles.navBar}>
      <div className={styles.navRow}>
        <span className={styles.navAction}>{leading}</span>
        <span className={styles.navTitle}>{large ? "" : title}</span>
        <span className={styles.navAction}>{trailing}</span>
      </div>
      {large && <h1 className={styles.largeTitle}>{title}</h1>}
      {children}
    </header>
  );
}

export type TabItem = { id: string; label: string; icon: IconName; badge?: number };

export function TabBar({ items, active, tint, tone }: { items: readonly TabItem[]; active: string; tint?: string; tone?: Tone }) {
  return (
    <nav className={styles.tabBar} data-tone={tone === "light" ? "dark" : undefined} style={tint ? ({ "--tab-tint": tint } as CSSProperties) : undefined}>
      {items.map((item) => (
        <span key={item.id} className={styles.tab} data-active={item.id === active}>
          <span style={{ position: "relative" }}>
            <Icon name={item.icon} size={27} stroke={item.id === active ? 2.1 : 1.7} />
            {item.badge ? <span className={styles.badge} style={{ position: "absolute", top: -4, left: 17 }}>{item.badge}</span> : null}
          </span>
          {item.label}
        </span>
      ))}
    </nav>
  );
}

export function Group({ header, children }: { header?: string; children: ReactNode }) {
  return (
    <section>
      {header && <h2 className={styles.groupHeader}>{header}</h2>}
      <div className={styles.group}>{children}</div>
    </section>
  );
}

export function Row({ leading, title, detail, trailing, chevron = false }: {
  leading?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
}) {
  return (
    <div className={styles.row}>
      {leading}
      <div className={styles.rowBody}>
        <span className={styles.rowTitle}>{title}</span>
        {detail !== undefined && <span className={styles.rowDetail}>{detail}</span>}
        {trailing}
        {chevron && <Icon name="chevronRight" size={16} stroke={2.4} className={styles.rowChevron} />}
      </div>
    </div>
  );
}

export function Switch({ on }: { on: boolean }) {
  return <span className={styles.switch} data-on={on} aria-hidden="true" />;
}

/** Neutral launch surface used until an app's clone exists. */
export function LaunchScreen({ app }: { app: AppId }) {
  return (
    <div className={styles.launch}>
      <AppIcon app={app} size={84} />
    </div>
  );
}

/** Per-person lock/home wallpaper: soft gradients, no photography. */
const wallpapers = [
  "linear-gradient(160deg, #1d2b64 0%, #4d5b9e 45%, #f8cdda 100%)",
  "linear-gradient(170deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  "linear-gradient(165deg, #3a1c71 0%, #d76d77 60%, #ffaf7b 100%)",
  "linear-gradient(175deg, #0b486b 0%, #3b8686 55%, #79bd9a 100%)",
  "linear-gradient(160deg, #232526 0%, #414345 100%)",
  "linear-gradient(170deg, #2b5876 0%, #4e4376 100%)",
  "linear-gradient(165deg, #c94b4b 0%, #4b134f 100%)",
  "linear-gradient(170deg, #614385 0%, #516395 100%)",
  "linear-gradient(175deg, #134e5e 0%, #71b280 100%)",
  "linear-gradient(160deg, #283048 0%, #859398 100%)",
] as const;

export const wallpaperFor = (seed: number) => wallpapers[seed % wallpapers.length];
