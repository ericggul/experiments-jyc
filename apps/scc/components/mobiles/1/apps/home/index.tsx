import { AppIcon, Icon, ios, wallpaperFor } from "../../ios";
import { catalogue, type AppId } from "../../model/catalogue";
import { createRng } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./home.module.css";

const DOCK: readonly AppId[] = ["messages", "mail", "audio", "calendar"];
const SIRI: readonly AppId[] = ["transit", "weather", "wallet", "messages"];
const FIRST = ["Maya", "Jordan", "Priya", "Marcus", "Elena", "Dev", "Sam", "Nina", "Theo", "Lucia", "Omar", "Chloe"];
const LAST = ["Rivera", "Okafor", "Shah", "Kim", "Bennett", "Alvarez", "Cohen", "Nguyen", "Brooks", "Hale"];
const HUES = ["#ff9500", "#5856d6", "#34c759", "#ff2d55", "#007aff", "#af52de", "#ff6b35"];

/** Apps that can carry a badge, with a typical ceiling for the count. */
const BADGE_MAX: Partial<Record<AppId, number>> = {
  mail: 48, messages: 9, "team-chat": 14, news: 3, "photo-feed": 6, "social-manager": 5, calendar: 2, "food-delivery": 1, school: 2,
};

function gridApps(seed: number): AppId[] {
  const rng = createRng(seed ^ 0x51ed);
  const apps = (Object.keys(catalogue) as AppId[]).filter((id) => id !== "lock" && id !== "home" && !DOCK.includes(id));
  for (let i = apps.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [apps[i], apps[j]] = [apps[j], apps[i]];
  }
  return apps.slice(0, 24);
}

function badgeFor(app: AppId, seed: number, clock: number): number {
  const max = BADGE_MAX[app];
  if (!max) return 0;
  const rng = createRng(seed ^ (app.length * 977) ^ (app.charCodeAt(0) << 8));
  const base = rng.chance(0.78) ? rng.int(1, max) : 0;
  // Counts creep up as the day goes on.
  return base === 0 ? 0 : base + Math.floor(clock / 240);
}

function Cell({ app, seed, clock }: { app: AppId; seed: number; clock: number }) {
  const count = badgeFor(app, seed, clock);
  return (
    <div className={styles.cell}>
      <span className={styles.iconWrap}>
        <AppIcon app={app} size={60} />
        {count > 0 && <span className={styles.badge}>{count > 99 ? "99+" : count}</span>}
      </span>
      <span className={styles.label}>{catalogue[app].title}</span>
    </div>
  );
}

function Page({ seed, owner, clock }: ScreenProps) {
  const apps = gridApps(owner.seed);
  const page = 1 + (seed % 3);
  return (
    <div className={styles.home}>
      <div className={styles.wallpaper} style={{ background: wallpaperFor(owner.seed) }} />
      <div className={styles.grid}>
        {apps.map((app) => <Cell key={app} app={app} seed={owner.seed} clock={clock} />)}
      </div>
      <div className={styles.dots}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={styles.dot} data-on={i === page - 1} />)}
      </div>
      <div className={styles.pill}><Icon name="search" size={14} stroke={2.2} /> Search</div>
      <div className={styles.dock}>
        {DOCK.map((app) => <Cell key={app} app={app} seed={owner.seed} clock={clock} />)}
      </div>
    </div>
  );
}

function Search({ seed, owner, clock }: ScreenProps) {
  const rng = createRng(seed ^ 0xc0de);
  const contacts = Array.from({ length: 4 }, () => {
    const first = rng.pick(FIRST);
    return { id: `${first}-${rng.int(0, 999)}`, first, last: rng.pick(LAST), hue: rng.pick(HUES) };
  });
  const suggestions = [
    { app: "weather" as AppId, title: "Weather in New York", sub: "Weather" },
    { app: "navigation" as AppId, title: `Directions to ${owner.work === "Home" ? owner.home : owner.work}`, sub: "Maps" },
    { app: "reservation" as AppId, title: "Tables near me tonight", sub: "Table" },
  ];
  return (
    <div className={`${styles.search} ${ios.dark}`}>
      <div className={styles.wallpaper} style={{ background: wallpaperFor(owner.seed) }} />
      <div className={styles.shade} />
      <div className={styles.field}>
        <div className={styles.input}><Icon name="search" size={17} stroke={2.2} /> Search</div>
        <span className={styles.cancel}>Cancel</span>
      </div>
      <div className={styles.sections}>
        <div className={styles.sectionTitle}>Siri Suggestions</div>
        <div className={`${styles.card} ${styles.sirirow}`}>
          {SIRI.map((app) => (
            <div key={app} className={styles.cell}>
              <span className={styles.iconWrap}>
                <AppIcon app={app} size={60} />
                {badgeFor(app, owner.seed, clock) > 0 && <span className={styles.badge}>{badgeFor(app, owner.seed, clock)}</span>}
              </span>
              <span className={styles.label}>{catalogue[app].title}</span>
            </div>
          ))}
        </div>
        <div className={styles.sectionTitle}>Suggested Contacts</div>
        <div className={`${styles.card} ${styles.contacts}`}>
          {contacts.map((c) => (
            <div key={c.id} className={styles.contact}>
              <span className={styles.avatar} style={{ background: c.hue }}>{c.first[0]}{c.last[0]}</span>
              {c.first}
            </div>
          ))}
        </div>
        <div className={styles.sectionTitle}>Suggested Searches</div>
        <div className={styles.list}>
          {suggestions.map((s) => (
            <div key={s.title} className={styles.item}>
              <AppIcon app={s.app} size={32} />
              <span className={styles.itemText}>{s.title}<small>{s.sub}</small></span>
              <Icon name="chevronRight" size={16} stroke={2.4} style={{ color: "rgb(235 235 245 / 30%)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomeScreen(props: ScreenProps) {
  return props.view === "search" ? <Search {...props} /> : <Page {...props} />;
}

const home: CloneDefinition = {
  Screen: HomeScreen,
  tone: () => "light",
  fixtures: [
    { view: "page", label: "glancing at badges", seed: 3, clock: 12 * 60 + 41, duration: 2 },
    { view: "search", label: "pull down to search", seed: 7, clock: 18 * 60 + 5, duration: 1 },
  ],
};

export default home;
