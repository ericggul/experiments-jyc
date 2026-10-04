import { Icon } from "../ios";
import { catalogue, type AppId } from "../model/catalogue";
import { OsIcon } from "./icon";
import styles from "./os.module.css";
import { osWallpaper } from "./wallpaper";

export type Launch = (app: AppId, origin: { x: number; y: number }) => void;

/** Where an icon's centre sits on the glass, for the open/close zoom. */
function originOf(element: HTMLElement): { x: number; y: number } {
  const icon = element.getBoundingClientRect();
  const glass = element.closest("[data-glass]")?.getBoundingClientRect();
  if (!glass) return { x: 195, y: 422 };
  const k = glass.width / 390;
  return { x: (icon.left + icon.width / 2 - glass.left) / k, y: (icon.top + 31 * k - glass.top) / k };
}

/** The hands-on home screen: paged icon grid, search pill and frosted dock, at iOS spacing. */
export function OsHome({ pages, dock, badges, onLaunch }: {
  pages: readonly (readonly AppId[])[];
  dock: readonly AppId[];
  badges: (app: AppId) => number;
  onLaunch: Launch;
}) {
  const cell = (app: AppId, label: boolean) => {
    const count = badges(app);
    return (
      <button key={app} type="button" className={styles.cell} aria-label={catalogue[app].title} onClick={(event) => onLaunch(app, originOf(event.currentTarget))}>
        <span className={styles.cellIcon}>
          <OsIcon app={app} />
          {count > 0 && <span className={styles.badge}>{count > 99 ? "99+" : count}</span>}
        </span>
        {label && <span className={styles.cellLabel}>{catalogue[app].title}</span>}
      </button>
    );
  };
  return (
    <div className={styles.home} style={{ background: osWallpaper }}>
      <div className={styles.pages}>
        {pages.map((apps, index) => (
          <div key={`page-${index}`} className={styles.page}>
            <div className={styles.grid}>{apps.map((app) => cell(app, true))}</div>
          </div>
        ))}
      </div>
      <div className={styles.search}><Icon name="search" size={13} stroke={2.6} /> Search</div>
      <div className={styles.dock}>{dock.map((app) => cell(app, false))}</div>
    </div>
  );
}
