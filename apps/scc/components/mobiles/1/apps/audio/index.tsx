import { Icon, ios } from "../../ios";
import { createRng } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./audio.module.css";

const titles = ["Slow Hours", "Glass Harbor", "Paper Moons", "Lowlight", "Seventh Floor", "Tidewater", "Night Bus", "Salt & Static", "Evergreen Line", "Quiet Engines", "Hollow Bell", "Blue Hour"];
const artists = ["Wren & The Static", "Marlow Park", "Odessa Lane", "The Late Trains", "Juno Vale", "Cassette Weather", "North Alder", "Kite Season"];
const shows = [
  { name: "The Long Way Round", host: "Ines Calloway" },
  { name: "Small Hours", host: "Theo Marsh" },
  { name: "Market Open", host: "Dana Okafor & Lee Brandt" },
  { name: "Ten Minute Cities", host: "Rosa Quintero" },
];
const episodeTitles = ["Why the L train is never on time", "The economics of a bagel", "Inside the city's last payphones", "What we owe our neighbors", "A short history of the crosswalk", "Rent, rates and the Fed"];
const chapterNames = ["Cold open", "Intro", "The setup", "Listener mail", "The deep dive", "What happens next", "Wrap-up"];

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

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

function NowPlaying(props: ScreenProps) {
  const rng = createRng(props.seed ^ 0x51);
  const tracks = Array.from({ length: 12 }, (_, i) => ({ i, title: titles[(props.seed + i * 5) % titles.length], artist: artists[(props.seed + i * 3) % artists.length], length: rng.int(172, 266), art: props.seed * 7 + i }));
  let position = Math.max(0, props.elapsed) * 60 + (props.seed % 50);
  let current = tracks[0];
  for (const t of tracks) {
    current = t;
    if (position < t.length) break;
    position -= t.length;
  }
  position = Math.min(position, current.length - 1);
  const hue = createRng(current.art ^ 0xa27).int(0, 359);
  return (
    <div className={`${styles.screen} ${ios.dark}`} style={{ background: `linear-gradient(180deg, hsl(${hue} 45% 30%) 0%, hsl(${hue} 40% 12%) 70%, #000 100%)` }}>
      <div className={styles.grabber} />
      <div className={styles.art}><Art seed={current.art} size={342} radius={12} /></div>
      <div className={styles.meta}>
        <div>
          <div className={styles.title}>{current.title}</div>
          <div className={styles.artist}>{current.artist}</div>
        </div>
        <span className={styles.more}><Icon name="more" size={20} stroke={2.4} /></span>
      </div>
      <div className={styles.scrub}>
        <div className={styles.line}><i style={{ width: `${(position / current.length) * 100}%` }} /></div>
        <div className={styles.times}><span>{mmss(position)}</span><span>-{mmss(current.length - position)}</span></div>
      </div>
      <div className={styles.controls}>
        <G name="prev" size={38} />
        <span className={styles.main}><G name="pause" size={54} /></span>
        <G name="next" size={38} />
      </div>
      <div className={styles.volume}>
        <Icon name="note" size={14} stroke={2} />
        <span className={styles.line}><i style={{ width: "62%" }} /></span>
        <Icon name="bell" size={16} stroke={2} />
      </div>
      <div className={styles.bottomIcons}>
        <Icon name="bubble" size={22} stroke={1.9} />
        <Icon name="send" size={22} stroke={1.9} />
        <Icon name="filter" size={22} stroke={1.9} />
      </div>
    </div>
  );
}

function Podcast(props: ScreenProps) {
  const rng = createRng(props.seed ^ 0xb0d);
  const show = shows[props.seed % shows.length];
  const episode = episodeTitles[(props.seed >> 2) % episodeTitles.length];
  const total = rng.int(38, 72) * 60;
  const speed = 1.5;
  // Played minutes advance at 1.5x as scene time passes.
  const position = Math.min(total - 1, rng.int(60, 600) + Math.round(props.elapsed * 60 * speed));
  const count = 6;
  const chapters = Array.from({ length: count }, (_, i) => ({ i, name: chapterNames[i], at: i === 0 ? 0 : Math.round((total * (i + rng.range(-0.2, 0.2))) / count) }));
  const active = chapters.reduce((a, c) => (position >= c.at ? c.i : a), 0);
  const left = Math.round((total - position) / speed);
  return (
    <div className={`${styles.screen} ${ios.dark}`} style={{ background: "linear-gradient(180deg, #2b2438 0%, #14111c 65%, #000 100%)" }}>
      <div className={styles.grabber} />
      <div className={styles.podArt}><Art seed={props.seed * 13 + 4} size={250} radius={16} /></div>
      <div className={styles.podMeta}>
        <div className={styles.show}>{show.name}</div>
        <div className={styles.episode}>{episode}</div>
        <div className={styles.artist}>{show.host}</div>
      </div>
      <div className={styles.scrub}>
        <div className={styles.line}><i style={{ width: `${(position / total) * 100}%` }} /></div>
        <div className={styles.times}><span>{mmss(position)}</span><span>-{mmss(left)} left</span></div>
      </div>
      <div className={styles.controls}>
        <Skip label="15" back />
        <span className={styles.main}><G name="pause" size={54} /></span>
        <Skip label="30" />
      </div>
      <div className={styles.speedRow}>
        <span className={styles.speed}>{speed}×</span>
        <span className={styles.sleep}><Icon name="moon" size={14} stroke={2} /> Sleep timer</span>
      </div>
      <div className={styles.chapters}>
        <div className={styles.chapHead}>Chapters</div>
        {chapters.map((c) => (
          <div key={c.i} className={styles.chapter} data-active={c.i === active}>
            <span className={styles.chapTime}>{mmss(c.at)}</span>
            <span className={styles.chapName}>{c.name}</span>
            {c.i === active && <span className={styles.eq}><i /><i /><i /></span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AudioScreen(props: ScreenProps) {
  return props.view === "podcast" ? <Podcast {...props} /> : <NowPlaying {...props} />;
}

const audio: CloneDefinition = {
  Screen: AudioScreen,
  tone: () => "light",
  fixtures: [
    { view: "now-playing", label: "commute playlist", clock: 8 * 60 + 18, duration: 22, seed: 12 },
    { view: "podcast", label: "morning episode", clock: 7 * 60 + 50, duration: 30, seed: 7 },
  ],
};

export default audio;
