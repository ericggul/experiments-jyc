import { Icon, Storyboard, type Panel, type Session } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import { createFlow } from "../navigation/session";
import type { CloneDefinition } from "../types";
import styles from "./transit.module.css";

type Line = { id: string; color: string; ink: string; headway: number; terminals: readonly [string, string] };

const lines: readonly Line[] = [
  { id: "A", color: "#0039a6", ink: "#fff", headway: 7, terminals: ["Inwood", "Far Rockaway"] },
  { id: "C", color: "#2850ad", ink: "#fff", headway: 9, terminals: ["Washington Hts", "Euclid Av"] },
  { id: "1", color: "#ee352e", ink: "#fff", headway: 5, terminals: ["Van Cortlandt", "South Ferry"] },
  { id: "4", color: "#00933c", ink: "#fff", headway: 5, terminals: ["Woodlawn", "Crown Heights"] },
  { id: "6", color: "#00a65c", ink: "#fff", headway: 6, terminals: ["Pelham Bay", "City Hall"] },
  { id: "L", color: "#8d9096", ink: "#fff", headway: 6, terminals: ["8 Av", "Canarsie"] },
  { id: "N", color: "#fccc0a", ink: "#000", headway: 8, terminals: ["Astoria", "Coney Island"] },
  { id: "Q", color: "#f9b200", ink: "#000", headway: 7, terminals: ["96 St", "Brighton Beach"] },
  { id: "7", color: "#b933ad", ink: "#fff", headway: 5, terminals: ["Flushing", "Hudson Yards"] },
  { id: "F", color: "#ff6319", ink: "#fff", headway: 9, terminals: ["Jamaica", "Coney Island"] },
  { id: "G", color: "#6cbe45", ink: "#000", headway: 10, terminals: ["Court Sq", "Church Av"] },
  { id: "J", color: "#996633", ink: "#fff", headway: 10, terminals: ["Jamaica Ctr", "Broad St"] },
];

const streets = ["Jefferson", "Myrtle", "Hoyt", "Bedford", "Lorimer", "Union", "Canal", "Grand", "Fulton", "Atlantic", "Nevins", "DeKalb", "Flushing", "Marcy", "Broadway", "Nostrand", "Kingston", "Franklin", "Classon", "Metropolitan", "Graham", "Montrose", "Morgan", "Halsey", "Wilson", "Knickerbocker"] as const;
const suffix = ["Av", "St", "Sq", "Plaza"] as const;
const station = (n: number) => (n % 5 === 4 ? `${14 + (n % 9) * 6} St` : `${streets[n % streets.length]} ${suffix[Math.floor(n / streets.length + n) % suffix.length]}`);
const causes = ["signal problems", "a sick passenger", "a train with mechanical problems", "track maintenance", "police activity", "a door problem", "earlier flooding"] as const;
const buses = ["B62", "M15 Select", "Q59", "B44 Select", "M14A", "B38"] as const;

function Bullet({ line, size = 28 }: { line: Line; size?: number }) {
  return <span className={styles.bullet} style={{ width: size, height: size, background: line.color, color: line.ink, fontSize: size * 0.58 }}>{line.id}</span>;
}
const lineAt = (n: number) => lines[((n % lines.length) + lines.length) % lines.length];

/** Three stations near the person, each with three upcoming-train rows. */
function stationsFor(seed: number, k: number) {
  const rng = createRng(hash(seed, "stations", k));
  const first = rng.int(0, 60);
  return [0, 1, 2].map((i) => {
    const l0 = lineAt(rng.int(0, 11));
    const l1 = lineAt(rng.int(0, 11));
    return {
      id: `station-${i}`,
      name: station(first + i * 7 + k * 3),
      walk: 2 + i * 3 + rng.int(0, 2),
      rows: [
        { id: "a", line: l0, dir: 0, offset: rng.int(0, 9) },
        { id: "b", line: l0, dir: 1, offset: rng.int(0, 9) },
        { id: "c", line: l1, dir: rng.int(0, 1), offset: rng.int(0, 9) },
      ],
    };
  });
}

const countdown = (headway: number, offset: number, elapsed: number) => {
  const first = (((offset - elapsed) % headway) + headway) % headway;
  return [first, first + headway, first + headway * 2];
};
const mins = (m: number) => (m <= 0 ? "Now" : `${m} min`);

type Kind = "dep" | "trip" | "alert" | "alts";
type Spec = { kind: Kind; k: number; at: number; gap: number };

function plan(props: ScreenProps) {
  const total = Math.max(4, props.duration);
  const rng = createRng(hash(props.seed, "transit-plan"));
  const specs: Record<string, Spec> = {};
  const flow = createFlow(total);
  const order: readonly Kind[] = props.view === "trip" ? ["trip", "alert", "alts", "dep"] : props.view === "delay" ? ["alert", "alts", "dep", "trip"] : ["dep", "trip", "alert", "alts"];
  const enters = { dep: "pop", trip: "push", alert: "sheet", alts: "push" } as const;
  const taps = { dep: { x: 330, y: 200 }, trip: { x: 195, y: 650 }, alert: { x: 195, y: 180 }, alts: { x: 195, y: 520 } } as const;
  let cycle = 0;
  while (flow.open) {
    const k = cycle % 3;
    for (const kind of order) {
      if (!flow.open) break;
      const id = `${kind}-${k}`;
      const gap = rng.range(1.5, 2.3);
      specs[id] = { kind, k: cycle, at: flow.t, gap };
      const dwell = kind === "trip" ? rng.range(2.6, 3.6) : rng.range(1.9, 2.5);
      const first = flow.shots.length === 0;
      flow.go(id, dwell, { enter: first ? "cut" : enters[kind], tap: first ? undefined : taps[kind], ...(kind === "trip" ? { scroll: 330, flicks: 3 } : kind === "alts" ? { scroll: 60 } : {}) });
    }
    cycle += 1;
  }
  return { total, seed: props.seed, specs, shots: flow.shots, view: props.view };
}
type Plan = ReturnType<typeof plan>;

const back = (title: string, tint = "#1f9d55") => (
  <header className={styles.bar}><Icon name="chevronLeft" size={24} stroke={2.4} style={{ color: tint }} /><b>{title}</b></header>
);

function tripFor(seed: number, k: number, owner: ScreenProps["owner"]) {
  const rng = createRng(hash(seed, "trip", k));
  const line = lineAt(rng.int(0, 11));
  const first = rng.int(0, 70);
  const stops = Array.from({ length: 12 }, (_, i) => ({ id: `stop-${i}`, name: i === 0 && owner.home !== "Home" ? owner.home : i === 11 && owner.work !== "Home" ? owner.work : station(first + i * 3) }));
  return { line, stops };
}

function buildPanel(spec: Spec, p: Plan, props: ScreenProps): Panel {
  const { seed } = p;
  if (spec.kind === "dep") {
    return {
      body: (
        <div className={styles.page}>
          <h1 className={styles.title}>Departures</h1>
          {stationsFor(seed, spec.k).map((s) => (
            <div key={s.id} className={styles.station}>
              <div className={styles.stationHead}><span>{s.name}</span><small><Icon name="run" size={13} stroke={2} /> {s.walk} min walk</small></div>
              {s.rows.map((r) => (
                <div key={r.id} className={styles.dep}>
                  <Bullet line={r.line} />
                  <span className={styles.dest}>{r.line.terminals[r.dir]}<small>{r.dir === 0 ? "Uptown" : "Downtown"}</small></span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ),
      chrome: <header className={styles.bar}><b>Near {props.owner.home}</b><Icon name="search" size={22} stroke={2.2} style={{ color: "#1f9d55" }} /></header>,
    };
  }
  if (spec.kind === "trip") {
    const { line, stops } = tripFor(seed, spec.k, props.owner);
    const start = props.clock - props.elapsed + spec.at;
    return {
      top: 172,
      body: (
        <div className={styles.diagram}>
          <div className={styles.track} style={{ background: line.color }} />
          {stops.map((s, i) => (
            <div key={s.id} className={styles.stop} data-end={i === 0 || i === stops.length - 1}>
              <span className={styles.dot} style={{ borderColor: line.color }} />
              <span className={styles.stopName}>{s.name}</span>
              <span className={styles.stopTime}>{formatTime(Math.round(start + i * spec.gap))}</span>
            </div>
          ))}
        </div>
      ),
      chrome: <>{back(`${line.id} train`)}<span className={styles.tripBullet}><Bullet line={line} size={34} /></span></>,
    };
  }
  if (spec.kind === "alert") {
    const rng = createRng(hash(seed, "alert", spec.k));
    const line = lineAt(rng.int(0, 11));
    const where = station(rng.int(0, 90));
    return {
      className: styles.sheetPanel,
      top: 120,
      body: (
        <div className={styles.alertBody}>
          <div className={styles.alertTop}><Bullet line={line} size={36} /><b>{rng.pick(["Delays", "Reroute", "Slow speeds", "Skipping stops"])}</b><span><Icon name="bolt" size={14} filled stroke={0} /> Active</span></div>
          <p>Trains are running with delays because of {rng.pick(causes)} at {where}.</p>
          <small>Posted {formatTime(props.clock - rng.int(6, 40))} · +{rng.int(8, 25)} min on your trip</small>
          <div className={styles.affected}>
            {[lineAt(rng.int(0, 11)), lineAt(rng.int(0, 11))].map((l, i) => <span key={i === 0 ? "a" : "b"}><Bullet line={l} size={24} /> Minor delays</span>)}
          </div>
        </div>
      ),
      chrome: <header className={styles.sheetHead}>Service alert</header>,
    };
  }
  const rng = createRng(hash(seed, "alts", spec.k));
  const base = props.clock - props.elapsed + spec.at;
  const options = [0, 1, 2].map((i) => {
    const l = lineAt(rng.int(0, 11));
    const total = 30 + i * 6 + rng.int(0, 7);
    return { id: `alt-${i}`, line: l, how: rng.pick([`Walk ${rng.int(3, 9)} min to the ${l.id}`, `Transfer to the ${l.id} at ${station(rng.int(0, 80))}`, `Ride the ${l.id} to ${station(rng.int(0, 80))}`]), total };
  });
  const bus = rng.pick(buses);
  return {
    top: 98,
    body: (
      <div className={styles.page}>
        <h1 className={styles.title}>Alternatives</h1>
        <div className={styles.block}>
          {options.map((o) => (
            <div key={o.id} className={styles.alt}>
              <Bullet line={o.line} />
              <span className={styles.altHow}>{o.how}<small>Arrive {formatTime(base + o.total)}</small></span>
              <b>{o.total} min</b>
            </div>
          ))}
          <div className={styles.alt}>
            <span className={styles.walkIcon}><Icon name="run" size={18} stroke={2} /></span>
            <span className={styles.altHow}>Walk and ride the bus<small>{bus} · Arrive {formatTime(base + 52)}</small></span>
            <b>52 min</b>
          </div>
        </div>
      </div>
    ),
    chrome: back("Your trip"),
  };
}

function Live({ p, props, id }: { p: Plan; props: ScreenProps; id: string }) {
  const spec = p.specs[id];
  if (!spec) return null;
  if (spec.kind === "dep") {
    return (
      <div className={styles.live}>
        {stationsFor(p.seed, spec.k).flatMap((s, si) =>
          s.rows.map((r, ri) => {
            const t = countdown(r.line.headway, r.offset, props.elapsed);
            return (
              <div key={`${s.id}${r.id}`} className={styles.times} style={{ top: 160 + si * 226 + ri * 52 }}>
                <b className={t[0] <= 1 ? styles.soon : undefined}>{mins(t[0])}</b>
                <small>{t[1]}, {t[2]} min</small>
              </div>
            );
          }),
        )}
      </div>
    );
  }
  if (spec.kind === "trip") {
    const { stops } = tripFor(p.seed, spec.k, props.owner);
    const passed = Math.min(stops.length - 1, Math.max(0, Math.floor((props.elapsed - spec.at) / spec.gap)));
    const next = Math.min(stops.length - 1, passed + 1);
    const remaining = Math.max(0, Math.round((stops.length - 1 - passed) * spec.gap));
    return (
      <div className={styles.live}>
        <div className={styles.tripLive}>
          <span><small>Next stop</small><b>{stops[next].name}</b></span>
          <span className={styles.eta}><b>{formatTime(props.clock + remaining)}</b><small>{remaining} min left</small></span>
        </div>
      </div>
    );
  }
  return null;
}

function TransitScreen(props: ScreenProps) {
  const p = plan(props);
  const build = (): Session => ({
    duration: p.total,
    shots: p.shots,
    panels: Object.fromEntries(Object.entries(p.specs).map(([id, spec]) => [id, buildPanel(spec, p, props)])),
  });
  return (
    <div className={styles.screen}>
      <Storyboard id={`${props.view}:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={build} live={(panel) => <Live p={p} props={props} id={panel} />} />
    </div>
  );
}

const transit: CloneDefinition = {
  Screen: TransitScreen,
  tone: () => "dark",
  fixtures: [
    { view: "departures", label: "walking to the station", clock: 8 * 60 + 12, duration: 20, seed: 5 },
    { view: "trip", label: "mid commute", clock: 8 * 60 + 25, duration: 32, seed: 5 },
    { view: "delay", label: "signal problems", clock: 8 * 60 + 40, duration: 20, seed: 9 },
  ],
};

export default transit;
