import { Icon, NavBar } from "../../ios";
import { createRng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./transit.module.css";

type Line = { id: string; color: string; ink: string; headway: number; terminals: readonly [string, string] };

const lines: readonly Line[] = [
  { id: "A", color: "#0039a6", ink: "#fff", headway: 7, terminals: ["Inwood–207 St", "Far Rockaway"] },
  { id: "4", color: "#00933c", ink: "#fff", headway: 5, terminals: ["Woodlawn", "Crown Heights"] },
  { id: "L", color: "#8d9096", ink: "#fff", headway: 6, terminals: ["8 Av", "Canarsie"] },
  { id: "N", color: "#fccc0a", ink: "#000", headway: 8, terminals: ["Astoria–Ditmars", "Coney Island"] },
  { id: "7", color: "#b933ad", ink: "#fff", headway: 5, terminals: ["Flushing–Main St", "34 St–Hudson Yards"] },
  { id: "F", color: "#ff6319", ink: "#fff", headway: 9, terminals: ["Jamaica–179 St", "Coney Island"] },
  { id: "G", color: "#6cbe45", ink: "#000", headway: 10, terminals: ["Court Sq", "Church Av"] },
];

const stationPool = ["Jefferson St", "Myrtle Av", "Hoyt St", "Bedford Av", "Lorimer St", "Union Sq", "Canal St", "Grand St", "Fulton St", "Atlantic Av", "Nevins St", "DeKalb Av"];
const routeStops = ["Bedford Av", "1 Av", "3 Av", "Union Sq–14 St", "23 St", "28 St", "Herald Sq–34 St", "42 St–Bryant Park", "47–50 Sts", "Rockefeller Ctr", "57 St", "Columbus Circle", "72 St", "86 St", "96 St"];

export function Bullet({ line, size = 28 }: { line: Line; size?: number }) {
  return (
    <span className={styles.bullet} style={{ width: size, height: size, background: line.color, color: line.ink, fontSize: size * 0.58 }}>
      {line.id}
    </span>
  );
}

const lineFor = (seed: number, offset = 0) => lines[(seed + offset) % lines.length];

/** Minutes until each upcoming train, counting down as the scene elapses. */
function arrivals(headway: number, offset: number, elapsed: number): number[] {
  const first = (((offset - elapsed) % headway) + headway) % headway;
  return [first, first + headway, first + headway * 2 + (offset % 2)];
}

const mins = (m: number) => (m <= 0 ? "Now" : `${m} min`);

function Departures({ seed, elapsed, owner }: ScreenProps) {
  const rng = createRng(seed ^ 0x7a1);
  const start = rng.int(0, stationPool.length - 1);
  const stations = [0, 1, 2].map((i) => ({
    id: `station-${i}`,
    name: stationPool[(start + i * 3) % stationPool.length],
    walk: 3 + i * 4 + rng.int(0, 2),
    lines: [lineFor(seed, i * 2), lineFor(seed, i * 2 + 1)],
    offsets: [rng.int(0, 8), rng.int(0, 8), rng.int(0, 8), rng.int(0, 8)],
  }));
  return (
    <div className={styles.page}>
      <NavBar title="Transit" large trailing={<Icon name="search" size={22} stroke={2.2} style={{ color: "#1f9d55" }} />} />
      <div className={styles.subhead}>Near {owner.home}</div>
      <div className={styles.cards}>
        {stations.map((s) => (
          <div key={s.id} className={styles.station}>
            <div className={styles.stationHead}>
              <span>{s.name}</span>
              <small><Icon name="run" size={13} stroke={2} /> {s.walk} min walk</small>
            </div>
            {s.lines.flatMap((line, li) =>
              [0, 1].map((dir) => {
                const times = arrivals(line.headway, s.offsets[li * 2 + dir], elapsed);
                return (
                  <div key={`${line.id}${dir}`} className={styles.dep}>
                    <Bullet line={line} />
                    <span className={styles.dest}>{line.terminals[dir]}<small>{dir === 0 ? "Uptown" : "Downtown"}</small></span>
                    <span className={styles.times}>
                      <b className={times[0] <= 1 ? styles.soon : undefined}>{mins(times[0])}</b>
                      <small>{times[1]}, {times[2]} min</small>
                    </span>
                  </div>
                );
              }),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Trip({ seed, elapsed, duration, clock, owner }: ScreenProps) {
  const rng = createRng(seed ^ 0x33f);
  const line = lineFor(seed);
  const first = rng.int(0, 2);
  const names = [owner.home === "Home" ? "Bedford Av" : `${owner.home}`, ...routeStops.slice(first + 1, first + 10)];
  names.push(owner.work === "Home" ? "96 St" : owner.work);
  const dur = Math.max(1, duration);
  const progress = Math.min(1, elapsed / dur);
  const n = names.length;
  const pos = progress * (n - 1);
  const start = clock - elapsed;
  const stops = names.map((name, i) => ({ id: `stop-${i}`, name, time: Math.round(start + (i / (n - 1)) * dur) }));
  const remaining = Math.max(0, dur - elapsed);
  const next = Math.min(n - 1, Math.ceil(pos));
  return (
    <div className={styles.page}>
      <NavBar title="Trip" leading={<Icon name="chevronLeft" size={22} stroke={2.4} style={{ color: "#1f9d55" }} />} trailing={<Icon name="share" size={22} stroke={2} style={{ color: "#1f9d55" }} />} />
      <div className={styles.tripHead}>
        <Bullet line={line} size={40} />
        <div>
          <b>{line.terminals[0]}-bound</b>
          <span>Next stop {names[next]}</span>
        </div>
        <div className={styles.eta}>
          <b>{formatTime(clock + remaining)}</b>
          <span>{remaining} min left</span>
        </div>
      </div>
      <div className={styles.diagram}>
        <div className={styles.track} style={{ background: line.color }} />
        <div className={styles.trackDone} style={{ height: `${pos * 40}px` }} />
        {stops.map((s, i) => (
          <div key={s.id} className={styles.stop} data-passed={i < Math.floor(pos)} data-end={i === 0 || i === n - 1}>
            <span className={styles.dot} style={{ borderColor: i < Math.floor(pos) ? "#aeb0b5" : line.color }} />
            <span className={styles.stopName}>{s.name}</span>
            <span className={styles.stopTime}>{formatTime(s.time).replace(" ", " ")}</span>
          </div>
        ))}
        <span className={styles.train} style={{ top: `${24 + pos * 40}px`, background: line.color, color: line.ink }}>
          <Icon name="train" size={14} stroke={2.2} />
        </span>
      </div>
    </div>
  );
}

function Delay({ seed, clock, elapsed }: ScreenProps) {
  const line = lineFor(seed, 1);
  const alt = lineFor(seed, 3);
  const alt2 = lineFor(seed, 5);
  const rng = createRng(seed ^ 0xde1);
  const where = rng.pick(["Fulton St", "Canal St", "14 St–Union Sq", "Jay St–MetroTech"]);
  const posted = clock - elapsed - rng.int(6, 20);
  const extra = rng.int(12, 25);
  return (
    <div className={styles.page}>
      <NavBar title="Service Alerts" leading={<Icon name="chevronLeft" size={22} stroke={2.4} style={{ color: "#1f9d55" }} />} />
      <div className={styles.alert}>
        <div className={styles.alertTop}>
          <Bullet line={line} size={36} />
          <b>Delays</b>
          <span><Icon name="bolt" size={14} filled stroke={0} /> Active</span>
        </div>
        <p>Trains are running with delays because of signal problems at {where}.</p>
        <small>Posted {formatTime(posted)} · Updated {formatTime(clock - (elapsed % 7))}</small>
      </div>
      <div className={styles.block}>
        <h2>Your trip</h2>
        <div className={styles.impact}>
          <span>Usual time</span><b>31 min</b>
          <span>With delays</span><b className={styles.late}>{31 + extra} min</b>
        </div>
      </div>
      <div className={styles.block}>
        <h2>Alternatives</h2>
        {[
          { l: alt, how: `Walk 6 min to the ${alt.id}, ride to Union Sq–14 St`, total: 36 + (rng.int(0, 6)) },
          { l: alt2, how: `Transfer to the ${alt2.id} at ${where}`, total: 41 + rng.int(0, 8) },
        ].map((r) => (
          <div key={r.l.id} className={styles.alt}>
            <Bullet line={r.l} />
            <span className={styles.altHow}>{r.how}<small>Arrive {formatTime(clock + r.total)}</small></span>
            <b>{r.total} min</b>
          </div>
        ))}
        <div className={styles.alt}>
          <span className={styles.walkIcon}><Icon name="run" size={18} stroke={2} /></span>
          <span className={styles.altHow}>Walk and ride the bus<small>M15 Select Bus · Arrive {formatTime(clock + 52)}</small></span>
          <b>52 min</b>
        </div>
      </div>
      <div className={styles.block}>
        <h2>Also affected</h2>
        <div className={styles.affected}>
          {[lineFor(seed, 2), lineFor(seed, 4)].map((l) => (
            <span key={l.id}><Bullet line={l} size={24} /> Minor delays</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransitScreen(props: ScreenProps) {
  if (props.view === "trip") return <Trip {...props} />;
  if (props.view === "delay") return <Delay {...props} />;
  return <Departures {...props} />;
}

const transit: CloneDefinition = {
  Screen: TransitScreen,
  tone: () => "dark",
  fixtures: [
    { view: "departures", label: "walking to the station", clock: 8 * 60 + 12, duration: 6, seed: 5 },
    { view: "trip", label: "mid commute", clock: 8 * 60 + 25, duration: 32, seed: 5 },
    { view: "delay", label: "signal problems", clock: 8 * 60 + 40, duration: 6, seed: 9 },
  ],
};

export default transit;
