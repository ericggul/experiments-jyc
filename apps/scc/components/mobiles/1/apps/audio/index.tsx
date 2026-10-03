import { Icon, Storyboard, ios, type Panel, type Session } from "../../ios";
import { createRng, hash } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import { createFlow } from "../navigation/session";
import type { CloneDefinition } from "../types";
import styles from "./audio.module.css";

const adjectives = ["Slow", "Glass", "Paper", "Low", "Seventh", "Tide", "Night", "Salt", "Ever", "Quiet", "Hollow", "Blue", "Neon", "Velvet", "Copper", "Late"] as const;
const nouns = ["Hours", "Harbor", "Moons", "Light", "Floor", "Water", "Bus", "Static", "Line", "Engines", "Bell", "Garden", "Letters", "Windows", "Rooftops", "Weather"] as const;
const actFirst = ["Juno", "Marlow", "Odessa", "Kite", "North", "Cassette", "Wren", "Alder", "Sable", "Lumen", "Paloma", "Fern"] as const;
const actSecond = ["Vale", "Park", "Lane", "Season", "Weather", "Static", "Trains", "Choir", "Atlas", "Echo", "Motel", "Radio"] as const;
const showA = ["The Long", "Small", "Market", "Ten Minute", "Late Night", "Morning", "Open", "Quiet", "Borough", "Street"] as const;
const showB = ["Way Round", "Hours", "Open", "Cities", "Desk", "Walk", "Line", "Table", "Notes", "Report"] as const;
const hosts = ["Ines Calloway", "Theo Marsh", "Dana Okafor", "Rosa Quintero", "Lee Brandt", "Maya Feld", "Omar Reyes", "June Whitaker"] as const;
const subjects = ["the L train", "a bagel", "payphones", "the crosswalk", "street vendors", "rent rates", "bridge tolls", "the bodega cat", "rooftop gardens", "night buses", "ferry schedules", "alternate side parking"] as const;
const angles = ["Why %s is never on time", "The economics of %s", "A short history of %s", "What %s says about us", "Inside the world of %s", "Ten things about %s", "Do we still need %s?", "Listener mail about %s"] as const;
const chapterNames = ["Cold open", "Intro", "The setup", "Listener mail", "The deep dive", "What happens next", "Sponsor break", "Wrap-up"] as const;
const verbs = ["Hold", "Follow", "Carry", "Leave", "Watch", "Keep", "Call", "Meet"] as const;
const objects = ["the window light", "every streetlamp", "your quiet name", "the last train", "paper lanterns", "salt on the glass", "the river road", "a borrowed coat"] as const;
const places = ["in the harbor", "on the stairs", "by the avenue", "past midnight", "under the bridge", "across the roof", "till morning", "down the line"] as const;

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

type Track = { id: string; n: number; title: string; artist: string; length: number; art: number; hue: number };
const trackOf = (seed: number, n: number): Track => {
  const rng = createRng(hash(seed, "track", n));
  return {
    id: `t${n}`,
    n,
    title: `${rng.pick(adjectives)} ${rng.pick(nouns)}`,
    artist: `${rng.pick(actFirst)} ${rng.pick(actSecond)}`,
    length: rng.int(172, 266),
    art: hash(seed, n),
    hue: rng.int(0, 359),
  };
};

/** The listening session: each play is skipped on after a minute or three of simulated time. */
function playsFor(seed: number, total: number) {
  const rng = createRng(hash(seed, "plays"));
  const plays: { track: Track; start: number; end: number }[] = [];
  let t = -rng.range(0, 1.2);
  for (let n = 0; t < total + 3; n += 1) {
    const length = rng.range(1.4, 3.4);
    plays.push({ track: trackOf(seed, n), start: t, end: t + length });
    t += length;
  }
  return plays;
}
type Plays = ReturnType<typeof playsFor>;
const playIndex = (plays: Plays, elapsed: number) => Math.max(0, plays.findIndex((p) => p.end > elapsed));

/** Generated square artwork: gradient plus a few geometric shapes. */
function Art({ seed, size, radius = 10 }: { seed: number; size: number; radius?: number }) {
  const rng = createRng(seed ^ 0xa27);
  const hue = rng.int(0, 359);
  const h2 = (hue + rng.int(40, 140)) % 360;
  const shapes = Array.from({ length: 4 }, (_, i) => ({ i, kind: rng.int(0, 2), x: rng.range(10, 90), y: rng.range(10, 90), r: rng.range(10, 34), o: rng.range(0.25, 0.7), rot: rng.int(0, 90) }));
  const id = `g${seed}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ borderRadius: radius, display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 70% 55%)`} />
          <stop offset="1" stopColor={`hsl(${h2} 65% 28%)`} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {shapes.map((s) =>
        s.kind === 0 ? (
          <circle key={s.i} cx={s.x} cy={s.y} r={s.r} fill={`hsl(${(hue + 30 * s.i) % 360} 80% 80%)`} opacity={s.o} />
        ) : s.kind === 1 ? (
          <rect key={s.i} x={s.x - s.r / 2} y={s.y - s.r / 2} width={s.r} height={s.r} fill="#fff" opacity={s.o * 0.6} transform={`rotate(${s.rot} ${s.x} ${s.y})`} />
        ) : (
          <path key={s.i} d={`M${s.x - s.r} ${s.y + s.r / 2}L${s.x} ${s.y - s.r}L${s.x + s.r} ${s.y + s.r / 2}Z`} fill="#000" opacity={s.o * 0.4} />
        ),
      )}
    </svg>
  );
}

const Glyph = {
  play: <path d="M8 5v22l19-11z" />,
  pause: <path d="M7 5h6v22H7zM19 5h6v22h-6z" />,
  next: <path d="M4 6v20l14-10zM20 6h5v20h-5z" />,
  prev: <path d="M28 6v20L14 16zM12 6H7v20h5z" />,
};

function G({ name, size }: { name: keyof typeof Glyph; size: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">{Glyph[name]}</svg>;
}

function Skip({ label, back }: { label: string; back?: boolean }) {
  return (
    <span className={styles.skip}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={back ? "M20 7a14 14 0 1 1-14 14M20 7l-5-4M20 7l-5 4" : "M20 7a14 14 0 1 0 14 14M20 7l5-4M20 7l5 4"} />
      </svg>
      <b>{label}</b>
    </span>
  );
}

type Kind = "np" | "queue" | "lyrics" | "library" | "playlist" | "player" | "chapters" | "show" | "episode";
type Spec = { kind: Kind; at: number; c: number };

function plan(props: ScreenProps) {
  const total = Math.max(4, props.duration);
  const rng = createRng(hash(props.seed, "audio-plan"));
  const flow = createFlow(total);
  const specs: Record<string, Spec> = {};
  const podcast = props.view === "podcast";
  const go = (kind: Kind, c: number, dwell: number, options: Parameters<typeof flow.go>[2] = {}) => {
    const id = `${kind}-${c}`;
    specs[id] = { kind, at: flow.t, c };
    flow.go(id, dwell, options);
  };
  let cycle = 0;
  while (flow.open) {
    const c = cycle % 2;
    const d = () => rng.range(1.9, 2.5);
    if (podcast) {
      go("player", 0, d(), cycle === 0 ? {} : { enter: "tab", tap: { x: 40, y: 790 } });
      go("chapters", c, d(), { enter: "sheet", scroll: 90, flicks: 2, tap: { x: 345, y: 620 } });
      go("player", 0, d(), { enter: "dismiss" });
      go("show", c, d(), { enter: "push", scroll: 240, flicks: 3, tap: { x: 195, y: 300 } });
      go("episode", c, d(), { enter: "push", scroll: 80, tap: { x: 195, y: 420 } });
    } else {
      go("np", 0, d(), cycle === 0 ? {} : { enter: "tab", tap: { x: 195, y: 790 } });
      go("queue", c, d(), { enter: "sheet", scroll: 160, flicks: 2, tap: { x: 345, y: 760 } });
      go("np", 0, d(), { enter: "dismiss" });
      go("lyrics", c, rng.range(2.4, 3.2), { enter: "swipe-up", scroll: 360, flicks: 3, tap: { x: 40, y: 760 } });
      go("np", 0, d(), { enter: "swipe-down", tap: { x: 195, y: 90 } });
      go("library", c, d(), { enter: "tab", scroll: 80, tap: { x: 130, y: 790 } });
      go("playlist", c, d(), { enter: "push", scroll: 220, flicks: 3, tap: { x: 120, y: 330 } });
    }
    cycle += 1;
  }
  return { total, seed: props.seed, specs, shots: flow.shots, plays: playsFor(props.seed, total), podcast };
}
type Plan = ReturnType<typeof plan>;

const Swatch = ({ seed, size = 44 }: { seed: number; size?: number }) => {
  const hue = createRng(seed ^ 0xa27).int(0, 359);
  return <span className={styles.swatch} style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 80) % 360} 65% 28%))` }} />;
};

const dark = (extra?: string) => `${ios.dark} ${styles.panelDark} ${extra ?? ""}`;
const sheetHead = (title: string) => <header className={styles.sheetHead}><span className={styles.sheetGrab} />{title}</header>;

/** A podcast's identity, generated from the seed. */
function showOf(seed: number, c: number) {
  const rng = createRng(hash(seed, "show", c));
  const name = `${rng.pick(showA)} ${rng.pick(showB)}`;
  const episodes = Array.from({ length: 9 }, (_, i) => ({ id: `ep-${i}`, title: rng.pick(angles).replace("%s", rng.pick(subjects)), mins: rng.int(18, 74), day: rng.int(1, 28), art: hash(seed, c, i) }));
  return { name, host: rng.pick(hosts), episodes, total: rng.int(38, 72) * 60, art: hash(seed, c, "podart") };
}

function chaptersOf(seed: number, c: number, total: number) {
  const rng = createRng(hash(seed, "chapters", c));
  const count = 7;
  return Array.from({ length: count }, (_, i) => ({ id: `ch-${i}`, i, name: chapterNames[(i + rng.int(0, 1)) % chapterNames.length], at: i === 0 ? 0 : Math.round((total * (i + rng.range(-0.2, 0.2))) / count) }));
}

function buildPanel(spec: Spec, p: Plan): Panel {
  const { seed } = p;
  const idx = playIndex(p.plays, spec.at);
  if (spec.kind === "np") {
    return {
      className: dark(styles.npBg),
      body: <div />,
      chrome: (
        <>
          <div className={styles.grabber} />
          <div className={styles.controls}>
            <G name="prev" size={38} />
            <span className={styles.main}><G name="pause" size={54} /></span>
            <G name="next" size={38} />
          </div>
          <div className={styles.volume}><Icon name="note" size={14} stroke={2} /><span className={styles.line}><i style={{ width: "62%" }} /></span><Icon name="bell" size={16} stroke={2} /></div>
          <div className={styles.bottomIcons}><Icon name="bubble" size={22} stroke={1.9} /><Icon name="send" size={22} stroke={1.9} /><Icon name="filter" size={22} stroke={1.9} /></div>
        </>
      ),
    };
  }
  if (spec.kind === "queue") {
    const rows = p.plays.slice(idx + 1, idx + 9).map((x) => x.track);
    return {
      className: styles.sheetPanel,
      top: 150,
      body: (
        <div className={styles.list}>
          <div className={styles.listHead}>Up next</div>
          {rows.map((t) => (
            <div key={t.id} className={styles.track}>
              <Swatch seed={t.art} />
              <span className={styles.trackBody}>{t.title}<small>{t.artist}</small></span>
              <span className={styles.trackTime}>{mmss(t.length)}</span>
            </div>
          ))}
        </div>
      ),
      chrome: sheetHead("Queue"),
    };
  }
  if (spec.kind === "lyrics") {
    const t = p.plays[idx].track;
    const rng = createRng(hash(seed, "lyrics", t.n));
    return {
      className: dark(styles.npBg),
      top: 120,
      body: (
        <div className={styles.lyrics}>
          {Array.from({ length: 14 }, (_, i) => <p key={`l${i}`} data-on={i === 3}>{rng.pick(verbs)} {rng.pick(objects)} {rng.pick(places)}</p>)}
        </div>
      ),
      chrome: <header className={styles.lyricsBar}><Swatch seed={t.art} size={40} /><span>{t.title}<small>{t.artist}</small></span></header>,
    };
  }
  if (spec.kind === "library") {
    const rng = createRng(hash(seed, "library", spec.c));
    const lists = Array.from({ length: 6 }, (_, i) => ({ id: `pl-${i}`, name: `${rng.pick(adjectives)} ${rng.pick(["Mix", "Drive", "Focus", "Mornings", "Walk", "Evenings"])}`, count: rng.int(12, 84), art: hash(seed, spec.c, i) }));
    return {
      className: dark(),
      top: 0,
      body: (
        <div className={styles.libraryBody}>
          <h1>Library</h1>
          <div className={styles.grid}>
            {lists.map((l) => (
              <div key={l.id} className={styles.tile}><Swatch seed={l.art} size={168} /><b>{l.name}</b><small>{l.count} songs</small></div>
            ))}
          </div>
        </div>
      ),
      chrome: <div className={styles.tabs}><Icon name="house" size={24} /><Icon name="note" size={24} /><Icon name="search" size={24} /></div>,
    };
  }
  if (spec.kind === "playlist") {
    const rng = createRng(hash(seed, "playlist", spec.c));
    const name = `${rng.pick(adjectives)} ${rng.pick(["Mix", "Drive", "Focus", "Mornings"])}`;
    const rows = Array.from({ length: 10 }, (_, i) => trackOf(seed, 100 + spec.c * 20 + i));
    return {
      className: dark(),
      body: (
        <div className={styles.list}>
          <div className={styles.plHead}><Swatch seed={hash(seed, spec.c, "plhead")} size={200} /><b>{name}</b><small>{rows.length} songs</small></div>
          {rows.map((t) => (
            <div key={t.id} className={styles.track}>
              <Swatch seed={t.art} />
              <span className={styles.trackBody}>{t.title}<small>{t.artist}</small></span>
              <span className={styles.trackTime}>{mmss(t.length)}</span>
            </div>
          ))}
        </div>
      ),
      chrome: <header className={styles.back}><Icon name="chevronLeft" size={26} stroke={2.4} /></header>,
    };
  }
  const show = showOf(seed, 0);
  if (spec.kind === "player") {
    return {
      className: dark(styles.podBg),
      body: <div />,
      chrome: (
        <>
          <div className={styles.grabber} />
          <div className={styles.podArt}><Art seed={show.art} size={250} radius={16} /></div>
          <div className={styles.podMeta}>
            <div className={styles.show}>{show.name}</div>
            <div className={styles.episode}>{show.episodes[0].title}</div>
            <div className={styles.artist}>{show.host}</div>
          </div>
          <div className={styles.controls} style={{ top: 494 }}>
            <Skip label="15" back />
            <span className={styles.main}><G name="pause" size={54} /></span>
            <Skip label="30" />
          </div>
          <div className={styles.speedRow}>
            <span className={styles.speed}>1.5×</span>
            <span className={styles.sleep}><Icon name="moon" size={14} stroke={2} /> Sleep timer</span>
          </div>
        </>
      ),
    };
  }
  if (spec.kind === "chapters") {
    const sh = showOf(seed, 0);
    const chapters = chaptersOf(seed, 0, sh.total);
    return {
      className: styles.sheetPanel,
      top: 150,
      body: (
        <div className={styles.list}>
          {[...chapters, ...chapters.slice(0, 3).map((x) => ({ ...x, id: `${x.id}-b`, name: chapterNames[(x.i + 4) % chapterNames.length], at: x.at + 160 }))].map((x) => (
            <div key={x.id} className={styles.chapter}><span className={styles.chapTime}>{mmss(x.at)}</span><span className={styles.chapName}>{x.name}</span></div>
          ))}
        </div>
      ),
      chrome: sheetHead("Chapters"),
    };
  }
  if (spec.kind === "show") {
    const sh = showOf(seed, spec.c);
    return {
      className: dark(styles.podBg),
      body: (
        <div className={styles.list}>
          <div className={styles.plHead}><Art seed={sh.art} size={180} radius={16} /><b>{sh.name}</b><small>{sh.host}</small></div>
          {sh.episodes.map((e) => (
            <div key={e.id} className={styles.track}>
              <Swatch seed={e.art} />
              <span className={styles.trackBody}>{e.title}<small>Oct {e.day} · {e.mins} min</small></span>
            </div>
          ))}
        </div>
      ),
      chrome: <header className={styles.back}><Icon name="chevronLeft" size={26} stroke={2.4} /></header>,
    };
  }
  const sh = showOf(seed, spec.c);
  const rng = createRng(hash(seed, "episode", spec.c));
  const ep = sh.episodes[rng.int(0, sh.episodes.length - 1)];
  return {
    className: dark(styles.podBg),
    body: (
      <div className={styles.episodeBody}>
        <Art seed={ep.art} size={150} radius={14} />
        <div className={styles.show}>{sh.name}</div>
        <h1>{ep.title}</h1>
        <small>Oct {ep.day} · {ep.mins} min</small>
        <span className={styles.playBtn}><G name="play" size={20} /> Play</span>
        <p>{rng.pick(angles).replace("%s", rng.pick(subjects))}. {rng.pick(hosts)} joins to talk through {rng.pick(subjects)}, {rng.pick(subjects)} and what comes next.</p>
        <p>Chapters: {chapterNames.slice(0, 5).join(" · ")}.</p>
      </div>
    ),
    chrome: <header className={styles.back}><Icon name="chevronLeft" size={26} stroke={2.4} /></header>,
  };
}

function Live({ p, props, id }: { p: Plan; props: ScreenProps; id: string }) {
  const spec = p.specs[id];
  if (!spec) return null;
  if (spec.kind === "np") {
    const play = p.plays[playIndex(p.plays, props.elapsed)];
    const t = play.track;
    const position = Math.max(0, props.elapsed - play.start) * 60 + 4;
    const shown = Math.min(position, t.length - 1);
    return (
      <div className={styles.live}>
        <div className={styles.art}><Art seed={t.art} size={342} radius={12} /></div>
        <div className={styles.meta}>
          <div><div className={styles.title}>{t.title}</div><div className={styles.artist}>{t.artist}</div></div>
          <span className={styles.more}><Icon name="more" size={20} stroke={2.4} /></span>
        </div>
        <div className={styles.scrub}>
          <div className={styles.line}><i style={{ width: `${(shown / t.length) * 100}%` }} /></div>
          <div className={styles.times}><span>{mmss(shown)}</span><span>-{mmss(t.length - shown)}</span></div>
        </div>
      </div>
    );
  }
  if (spec.kind === "player") {
    const show = showOf(p.seed, 0);
    const chapters = chaptersOf(p.seed, 0, show.total);
    const start = createRng(hash(p.seed, "pos")).int(60, 600);
    const position = Math.min(show.total - 1, start + Math.round(props.elapsed * 90) + Math.floor(props.elapsed / 3) * 30);
    const active = chapters.reduce((a, c) => (position >= c.at ? c.i : a), 0);
    return (
      <div className={styles.live}>
        <div className={styles.scrub} style={{ top: 456 }}>
          <div className={styles.line}><i style={{ width: `${(position / show.total) * 100}%` }} /></div>
          <div className={styles.times}><span>{mmss(position)}</span><span>-{mmss(Math.round((show.total - position) / 1.5))} left</span></div>
        </div>
        <div className={styles.chapterNow}><span className={styles.eq}><i /><i /><i /></span>Chapter {active + 1} · {chapters[active].name}</div>
      </div>
    );
  }
  return null;
}

function AudioScreen(props: ScreenProps) {
  const p = plan(props);
  const build = (): Session => ({
    duration: p.total,
    shots: p.shots,
    panels: Object.fromEntries(Object.entries(p.specs).map(([id, spec]) => [id, buildPanel(spec, p)])),
  });
  return (
    <div className={styles.screen}>
      <Storyboard id={`${props.view}:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={build} live={(panel) => <Live p={p} props={props} id={panel} />} />
    </div>
  );
}

const audio: CloneDefinition = {
  Screen: AudioScreen,
  tone: () => "light",
  fixtures: [
    { view: "now-playing", label: "commute playlist", clock: 8 * 60 + 18, duration: 30, seed: 12 },
    { view: "podcast", label: "morning episode", clock: 7 * 60 + 50, duration: 30, seed: 7 },
  ],
};

export default audio;
