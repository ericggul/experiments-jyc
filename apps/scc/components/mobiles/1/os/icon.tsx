import { Icon, type IconName } from "../ios";
import { catalogue, type AppId } from "../model/catalogue";
import styles from "./os.module.css";

/** Lighten or darken a #rrggbb colour by `amount` (−1…1). */
function shade(hex: string, amount: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (value >> shift) & 255;
    return Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  };
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}

/** A home-screen icon with the depth of a real one: vertical gradient, filled glyph, hairline edge. */
export function OsIcon({ app, size = 62 }: { app: AppId; size?: number }) {
  const entry = catalogue[app];
  const dark = entry.tint === "#000000" || entry.tint === "#111111" || entry.tint === "#1c1c1e";
  const top = dark ? "#3a3a3c" : shade(entry.tint, 0.28);
  const bottom = dark ? "#0b0b0c" : shade(entry.tint, -0.12);
  return (
    <span className={styles.osIcon} style={{ width: size, height: size, borderRadius: size * 0.2237, background: `linear-gradient(180deg, ${top}, ${bottom})` }} aria-hidden="true">
      <Icon name={entry.icon as IconName} size={size * 0.56} stroke={2.1} />
    </span>
  );
}
