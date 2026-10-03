import { AppIcon, Icon, Storyboard, ios, wallpaperFor, type Panel, type Session } from "../../ios";
import { catalogue, type AppId } from "../../model/catalogue";
import { createRng, hash, type Rng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { createFlow } from "./flow";
import styles from "./home.module.css";

const DOCK: readonly AppId[] = ["messages", "mail", "audio", "calendar"];
const FIRST = ["Maya", "Jordan", "Priya", "Marcus", "Elena", "Dev", "Sam", "Nina", "Theo", "Lucia", "Omar", "Chloe", "Ravi", "Zoe", "Amara", "Ben"];
const LAST = ["Rivera", "Okafor", "Shah", "Kim", "Bennett", "Alvarez", "Cohen", "Nguyen", "Brooks", "Hale", "Park", "Silva"];
const HUES = ["#ff9500", "#5856d6", "#34c759", "#ff2d55", "#007aff", "#af52de", "#ff6b35"];
const WORDS = ["pizza near me", "pharmacy open now", "L train map", "laundromat", "bagel", "weather tomorrow", "oat milk", "tote bag", "dentist", "yoga class", "ferry times", "birthday gift"];
const FOLDERS = ["Work", "Life", "Utilities", "Misc", "Evening", "Go"];
const EVENTS = ["Design crit", "Standup", "Lunch with Priya", "Dentist", "1:1", "Pickup at 5", "Yoga", "Team offsite"];
const CONDITIONS = ["Partly Cloudy", "Light Rain", "Sunny", "Overcast", "Clear", "Windy"];

/** Apps that can carry a badge, with a typical ceiling for the count. */
const BADGE_MAX: Partial<Record<AppId, number>> = {
  mail: 48, messages: 9, "team-chat": 14, news: 3, "photo-feed": 6, "social-manager": 5, calendar: 2, "food-delivery": 1, school: 2, shopping: 3, bank: 1,
};

const COL_X = [51, 147, 243, 339];
const cellY = (row: number) => 66 + row * 96 + 40;
const FOLDER_SLOT = 10;

function layout(owner: Owner) {
  const rng = createRng(owner.seed ^ 0x51ed);
  const pool = (Object.keys(catalogue) as AppId[]).filter((id) => id !== "lock" && id !== "home" && !DOCK.includes(id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const folder = pool.splice(pool.length - 6, 6);
  return { pages: [pool.slice(0, 10), pool.slice(10, 16), pool.slice(16)], folder, name: rng.pick(FOLDERS) };
}

function badgeFor(app: AppId, seed: number, clock: number): number {
  const max = BADGE_MAX[app];
  if (!max) return 0;
  const rng = createRng(hash(seed, app));
  const base = rng.chance(0.72) ? rng.int(1, max) : 0;
  // Counts creep up as the day goes on.
  return base === 0 ? 0 : base + Math.floor(clock / 240);
}

function Cell({ app, seed, clock, label = true, size = 60 }: { app: AppId; seed: number; clock: number; label?: boolean; size?: number }) {
  const count = badgeFor(app, seed, clock);
  return (
    <div className={styles.cell}>
      <span className={styles.iconWrap} style={{ width: size, height: size }}>
        <AppIcon app={app} size={size} />
        {count > 0 && <span className={styles.badge}>{count > 99 ? "99+" : count}</span>}
      </span>
      {label && <span className={styles.label}>{catalogue[app].title}</span>}
    </div>
  );
}

const wallpaper = (owner: Owner) => <div className={styles.wallpaper} style={{ background: wallpaperFor(owner.seed) }} />;

function Dock({ seed, clock }: { seed: number; clock: number }) {
  return <div className={styles.dock}>{DOCK.map((app) => <Cell key={app} app={app} seed={seed} clock={clock} label={false} />)}</div>;
}

function HomePage({ index, apps, seed, scene, clock, owner }: { index: number; apps: readonly AppId[]; seed: number; scene: number; clock: number; owner: Owner }) {
  const rng = createRng(hash(scene, "widget", index));
  return (
    <div className={styles.grid}>
      {index === 1 && (
        <>
          <div className={`${styles.widget} ${styles.weather}`}>
            <span className={styles.widgetTitle}>New York</span>
            <span className={styles.temp}>{rng.int(46, 82)}°</span>
            <span className={styles.widgetSub}>{rng.pick(CONDITIONS)} · H:{rng.int(60, 84)}° L:{rng.int(38, 58)}°</span>
          </div>
          <div className={`${styles.widget} ${styles.agenda}`}>
            <span className={styles.widgetTitle}>Up next</span>
            <b>{rng.pick(EVENTS)}</b>
            <span className={styles.widgetSub}>{formatTime(Math.round((clock + rng.int(20, 180)) / 5) * 5)} · {owner.work === "Home" ? owner.home : owner.work}</span>
          </div>
        </>
      )}
      {apps.map((app) => <Cell key={app} app={app} seed={seed} clock={clock} />)}
      {index === 0 && (
        <div className={styles.cell}>
          <span className={styles.folderTile}>{[0, 1, 2, 3].map((i) => <i key={i} />)}</span>
          <span className={styles.label}>{layout(owner).name}</span>
        </div>
      )}
    </div>
  );
}

function pageChrome(index: number, seed: number, clock: number, owner: Owner) {
  return (
    <>
      {wallpaper(owner)}
      <div className={styles.dots}>
        {[0, 1, 2].map((i) => <span key={i} className={styles.dot} data-on={i === index} />)}
      </div>
      <div className={styles.pill}><Icon name="search" size={14} stroke={2.2} /> Search</div>
      <Dock seed={seed} clock={clock} />
    </>
  );
}

function Spotlight({ owner, seed, clock }: { owner: Owner; seed: number; clock: number }) {
  const rng = createRng(hash(seed, "spot"));
  const contacts = Array.from({ length: 4 }, (_, i) => ({ id: i, first: rng.pick(FIRST), last: rng.pick(LAST), hue: rng.pick(HUES) }));
  const start = rng.int(0, 2);
  const siri = (["transit", "weather", "wallet", "messages", "navigation", "news"] as const).slice(start, start + 4);
  const searches = [
    { app: "weather" as AppId, title: `Weather in ${rng.pick(["New York", "Brooklyn", "Queens"])}`, sub: "Weather" },
    { app: "navigation" as AppId, title: `Directions to ${owner.work === "Home" ? owner.home : owner.work}`, sub: "Maps" },
    { app: "reservation" as AppId, title: rng.pick(["Tables near me tonight", "Brunch this weekend", "Late dinner"]), sub: "Table" },
  ];
  return (
    <div className={styles.sections}>
      <div className={styles.sectionTitle}>Siri Suggestions</div>
      <div className={`${styles.card} ${styles.sirirow}`}>
        {siri.map((app) => <Cell key={app} app={app} seed={owner.seed ^ seed} clock={clock} />)}
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
        {searches.map((s) => (
          <div key={s.app} className={styles.item}>
            <AppIcon app={s.app} size={32} />
            <span className={styles.itemText}>{s.title}<small>{s.sub}</small></span>
            <Icon name="chevronRight" size={16} stroke={2.4} style={{ color: "rgb(235 235 245 / 30%)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

const searchField = (text: string) => (
  <div className={styles.field}>
    <div className={styles.input} data-typed={text !== ""}><Icon name="search" size={17} stroke={2.2} /> {text || "Search"}</div>
    <span className={styles.cancel}>Cancel</span>
  </div>
);

const shade = (owner: Owner) => (
  <>
    {wallpaper(owner)}
    <div className={styles.shade} />
  </>
);

function Library({ seed, clock, owner }: { seed: number; clock: number; owner: Owner }) {
  const { pages } = layout(owner);
  const groups = ["Suggestions", "Recently Added", "Social", "Utilities"];
  return (
    <div className={styles.library}>
      {groups.map((name, g) => (
        <div key={name} className={styles.libCard}>
          <div className={styles.libGrid}>
            {pages.flat().slice(g * 4 + (seed % 3), g * 4 + 4 + (seed % 3)).map((app) => <Cell key={app} app={app} seed={owner.seed ^ seed} clock={clock} label={false} size={34} />)}
          </div>
          <span className={styles.label}>{name}</span>
        </div>
      ))}
    </div>
  );
}

function FolderSheet({ owner, seed, clock }: { owner: Owner; seed: number; clock: number }) {
  const { folder, name } = layout(owner);
  return (
    <div className={styles.folder}>
      <div className={styles.folderName}>{name}</div>
      <div className={styles.folderGrid}>{folder.map((app) => <Cell key={app} app={app} seed={owner.seed ^ seed} clock={clock} />)}</div>
    </div>
  );
}

const PAGE_IDS = ["pg0", "pg1", "pg2"] as const;

function pageSession({ seed, duration, clock, owner }: ScreenProps): Session {
  const rng = createRng(hash(seed, "home-session"));
  const total = Math.max(4, duration);
  const { pages } = layout(owner);
  const panels: Record<string, Panel> = {};
  pages.forEach((apps, index) => {
    panels[PAGE_IDS[index]] = {
      body: <HomePage index={index} apps={apps} seed={owner.seed ^ seed} scene={seed} clock={clock} owner={owner} />,
      chrome: pageChrome(index, owner.seed ^ seed, clock, owner),
      className: styles.panelClear,
    };
  });
  panels.folder = { body: <FolderSheet owner={owner} seed={seed} clock={clock} />, chrome: shade(owner), className: styles.panelDark };
  panels.spot = { body: <Spotlight owner={owner} seed={seed} clock={clock} />, chrome: <>{shade(owner)}{searchField("")}</>, top: 118, className: styles.panelDark };
  panels.library = { body: <Library seed={seed} clock={clock} owner={owner} />, chrome: <>{shade(owner)}{searchField("")}</>, top: 118, className: styles.panelDark };

  const flow = createFlow(total);
  let page = rng.int(0, 2);
  flow.go(PAGE_IDS[page], rng.range(1.4, 2));
  while (flow.open) {
    const dwell = rng.range(1.35, 2.3);
    const action = rng.weighted([["swipe", 5], ["folder", 2], ["spot", 2], ["library", 1.4]] as const);
    if (action === "folder" && page !== 0) {
      page = 0;
      flow.go("pg0", dwell, { enter: "pop" });
    } else if (action === "folder") {
      flow.go("folder", dwell + 0.3, { enter: "sheet", tap: { x: COL_X[FOLDER_SLOT % 4], y: cellY(Math.floor(FOLDER_SLOT / 4)) } });
      flow.go("pg0", dwell, { enter: "dismiss", tap: { x: 195, y: 790 } });
    } else if (action === "spot") {
      flow.go("spot", dwell + 0.4, { enter: "swipe-down" });
      flow.go(PAGE_IDS[page], dwell, { enter: "fade", tap: { x: 345, y: 80 } });
    } else if (action === "library" && page === 2) {
      flow.go("library", dwell + 0.5, { enter: "push", scroll: rng.int(60, 220), flicks: 1 });
      flow.go("pg2", dwell, { enter: "pop" });
    } else {
      const next = page === 0 ? 1 : page === 2 ? 1 : rng.pick([0, 2]);
      flow.go(PAGE_IDS[next], dwell, { enter: next > page ? "push" : "pop" });
      page = next;
    }
  }
  return { duration: total, shots: flow.shots, panels };
}

type Candidate = { id: string; title: string; sub: string; kind: "app" | "contact" | "word"; app?: AppId; hue: string };

function candidates(owner: Owner, seed: number): Candidate[] {
  const rng = createRng(hash(seed, owner.seed, "candidates"));
  const apps = (Object.keys(catalogue) as AppId[]).filter((id) => id !== "lock" && id !== "home").map((app): Candidate => ({ id: `a-${app}`, title: catalogue[app].title, sub: "Application", kind: "app", app, hue: "" }));
  const contacts = Array.from({ length: 8 }, (_, i): Candidate => ({ id: `c-${i}`, title: `${rng.pick(FIRST)} ${rng.pick(LAST)}`, sub: "Contact", kind: "contact", hue: rng.pick(HUES) }));
  const words = WORDS.map((word, i): Candidate => ({ id: `w-${i}`, title: word, sub: "Suggested search", kind: "word", hue: "" }));
  return [...apps, ...contacts, ...words];
}

function Results({ prefix, target, pool }: { prefix: string; target: Candidate; pool: readonly Candidate[] }) {
  const matches = pool.filter((c) => c.id !== target.id && c.title.toLowerCase().split(" ").some((w) => w.startsWith(prefix.toLowerCase())));
  const rows = [target, ...matches].slice(0, 4);
  return (
    <div className={styles.list}>
      {rows.map((c) => (
        <div key={c.id} className={styles.item}>
          {c.kind === "app" && c.app ? <AppIcon app={c.app} size={32} /> : c.kind === "contact" ? <span className={styles.avatarSmall} style={{ background: c.hue }}>{c.title[0]}</span> : <span className={styles.avatarSmall}><Icon name="search" size={16} stroke={2.2} /></span>}
          <span className={styles.itemText}>{c.title}<small>{c.sub}</small></span>
        </div>
      ))}
      <div className={styles.item}><span className={styles.avatarSmall}><Icon name="search" size={16} stroke={2.2} /></span><span className={styles.itemText}>Search for “{prefix}”<small>Web</small></span></div>
    </div>
  );
}

const lengthsFor = (word: string) => [...new Set([1, 2, 3, Math.min(word.length, 5)])].filter((n) => n <= word.length);

/** Typing queries one letter at a time: the results rewrite themselves under the thumb. */
function searchSession({ seed, duration, owner, clock }: ScreenProps): Session {
  const rng: Rng = createRng(hash(seed, "search-session"));
  const total = Math.max(4, duration);
  const pool = candidates(owner, seed);
  const panels: Record<string, Panel> = {
    idle: { body: <Spotlight owner={owner} seed={seed} clock={clock} />, chrome: <>{shade(owner)}{searchField("")}</>, top: 118, className: styles.panelDark },
  };
  const groups = [0, 1].map((g) => {
    const target = rng.pick(pool);
    const word = target.title.toLowerCase();
    return lengthsFor(word).map((n) => {
      const id = `q${g}-${n}`;
      panels[id] = { body: <Results prefix={word.slice(0, n)} target={target} pool={pool} />, chrome: <>{shade(owner)}{searchField(word.slice(0, n))}</>, top: 118, className: styles.panelDark };
      return id;
    });
  });
  const flow = createFlow(total);
  flow.go("idle", rng.range(1.4, 1.9));
  let group = rng.int(0, 1);
  while (flow.open) {
    groups[group].forEach((id, i) => flow.go(id, rng.range(1.35, 1.7), { enter: "fade", tap: i === 0 ? { x: 150, y: 80 } : { x: rng.int(40, 350), y: rng.int(660, 780) } }));
    flow.go("idle", rng.range(1.4, 1.9), { enter: "fade", tap: { x: 330, y: 80 } });
    group = 1 - group;
  }
  return { duration: total, shots: flow.shots, panels };
}

function Page(props: ScreenProps) {
  return (
    <div className={`${styles.home} ${ios.dark}`}>
      <Storyboard id={`page:${props.seed}:${props.duration}:${props.owner.id}`} elapsed={props.elapsed} build={() => pageSession(props)} />
    </div>
  );
}

function Search(props: ScreenProps) {
  return (
    <div className={`${styles.home} ${ios.dark}`}>
      <Storyboard id={`search:${props.seed}:${props.duration}:${props.owner.id}`} elapsed={props.elapsed} build={() => searchSession(props)} />
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
    { view: "page", label: "glancing at badges", seed: 3, clock: 12 * 60 + 41, duration: 12 },
    { view: "page", label: "idle thumb", seed: 14, clock: 21 * 60 + 8, duration: 30 },
    { view: "search", label: "pull down to search", seed: 7, clock: 18 * 60 + 5, duration: 14 },
  ],
};

export default home;
