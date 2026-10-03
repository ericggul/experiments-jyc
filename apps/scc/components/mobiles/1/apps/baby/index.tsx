import { Icon, ios, type IconName } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./baby.module.css";

const babies = ["Noa", "Theo", "Ada", "Milo", "June", "Eli"];
const months = [2, 3, 4, 5, 7, 9];

type Kind = "feed" | "sleep" | "diaper";
const kinds: Record<Kind, { label: string; icon: IconName; hue: string }> = {
  feed: { label: "Feed", icon: "fork", hue: "#f2994a" },
  sleep: { label: "Sleep", icon: "moon", hue: "#5e5ce6" },
  diaper: { label: "Diaper", icon: "tag", hue: "#34a853" },
};

const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

function Tracker({ seed, clock, elapsed }: ScreenProps) {
  const rng = createRng(seed);
  const name = babies[seed % babies.length];
  const age = months[seed % months.length];
  const sinceFeed = rng.int(35, 170) + elapsed;
  const lastFeed = clock - sinceFeed;
  const events: { id: string; kind: Kind; at: number; note: string }[] = [{ id: "f0", kind: "feed", at: lastFeed, note: `${rng.pick([3, 4, 5])} oz bottle` }];
  let at = lastFeed;
  let index = 1;
  while (events.length < 7 && at > 0) {
    at -= rng.int(35, 130);
    const kind = rng.weighted<Kind>([["feed", 3], ["sleep", 3], ["diaper", 4]]);
    const note = kind === "feed" ? `${rng.pick([3, 4, 5])} oz bottle` : kind === "sleep" ? `Nap, ${duration(rng.int(35, 110))}` : rng.pick(["Wet", "Dirty", "Wet + dirty"]);
    events.push({ id: `e${index}`, kind, at, note });
    index += 1;
  }
  const feeds = events.filter((event) => event.kind === "feed").length + 2;
  const clockText = duration(sinceFeed).split(" ");
  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div className={styles.bar}><span>Family</span><Icon name="more" size={22} stroke={2.6} /></div>
        <div className={styles.who}>
          <span className={styles.face}>{name[0]}</span>
          <div><b>{name}</b><small>{age} months · 14 lb 6 oz</small></div>
        </div>
        <div className={styles.timer}>
          <small>Since last feed</small>
          <div className={styles.clock}>{clockText[0].replace("h", "")}<span>h </span>{clockText[1].replace("m", "")}<span>m</span></div>
          <p>Last fed {formatTime(lastFeed)}</p>
        </div>
        <div className={styles.quick}>
          {(Object.keys(kinds) as Kind[]).map((kind) => (
            <div key={kind} className={styles.q}><span style={{ background: kinds[kind].hue }}><Icon name={kinds[kind].icon} size={21} stroke={1.9} /></span>{kinds[kind].label}</div>
          ))}
        </div>
        <div className={styles.sums}><span>Today</span><span>{feeds} feeds · 3 diapers · 6h 20m sleep</span></div>
      </div>
      <div className={styles.log}>
        {events.map((event) => (
          <div key={event.id} className={styles.event}>
            <span className={styles.dot} style={{ background: kinds[event.kind].hue }}><Icon name={kinds[event.kind].icon} size={16} stroke={2} /></span>
            <div>{kinds[event.kind].label}<small>{event.note}</small></div>
            <span className={styles.when}>{event.at >= 0 ? formatTime(event.at) : "11:48 PM"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Monitor({ seed, clock, elapsed }: ScreenProps) {
  const rng = createRng(seed);
  const temp = 69 + rng.int(0, 3);
  const quiet = rng.chance(0.6);
  const levels = Array.from({ length: 18 }, (_, i) => {
    const raw = (hash(seed, elapsed, i) % 100) / 100;
    return Math.round((quiet ? 0.1 + raw * 0.22 : 0.15 + raw * 0.75) * 44);
  });
  return (
    <div className={`${styles.night} ${ios.dark}`}>
      <div className={styles.feed}>
        <div className={styles.mobile}><i style={{ left: 8 }} /><i style={{ left: 44 }} /><i style={{ left: 80 }} /></div>
        <div className={styles.rails} />
        <div className={styles.mattress} />
        <div className={styles.blanket} />
        <div className={styles.head2} />
      </div>
      <div className={styles.overlay}><span className={styles.live}><i />Nursery</span><span>Night vision</span></div>
      <div className={styles.stamp}>Mon {formatTime(clock)}</div>
      <div className={styles.panel}>
        <div className={styles.cols}>
          <div className={styles.tile}><small>Sound</small><div className={styles.bars}>{levels.map((height, i) => <i key={i} data-hot={height > 30} style={{ height }} />)}</div></div>
          <div className={styles.tile}><small>Temperature</small><b>{temp}°F</b><small style={{ textTransform: "none" }}>Humidity {rng.int(38, 47)}%</small></div>
        </div>
        <div className={styles.soothe}><div>Lullaby<small>Soft piano · off in 30 min</small></div><span><Icon name="play" size={16} filled stroke={0} /></span></div>
      </div>
    </div>
  );
}

export function LittleScreen(props: ScreenProps) {
  return props.view === "monitor" ? <Monitor {...props} /> : <Tracker {...props} />;
}

const little: CloneDefinition = {
  Screen: LittleScreen,
  tone: (view) => (view === "monitor" ? "light" : "dark"),
  fixtures: [
    { view: "tracker", label: "mid-morning feed", seed: 2, clock: 10 * 60 + 12, duration: 5 },
    { view: "tracker", label: "afternoon check", seed: 5, clock: 15 * 60 + 40, duration: 4 },
    { view: "monitor", label: "quiet night", seed: 1, clock: 2 * 60 + 14, duration: 6 },
    { view: "monitor", label: "stirring", seed: 3, clock: 4 * 60 + 52, duration: 6 },
  ],
};

export default little;
