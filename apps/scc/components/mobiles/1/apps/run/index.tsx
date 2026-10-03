import { Icon, Storyboard, ios, type Panel, type Session } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatDate, formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import { MapSvg, RouteLine, Upright, makeMap, makeRoute, pointAt, slice } from "../navigation/map";
import { createFlow } from "../navigation/session";
import type { CloneDefinition } from "../types";
import styles from "./run.module.css";

const ORANGE = "#ff6a1f";
const pad = (n: number) => String(n).padStart(2, "0");
const clockTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};
const paceText = (secPerMile: number) => `${Math.floor(secPerMile / 60)}'${pad(Math.round(secPerMile % 60) % 60)}"`;

const routeNames = [
  "Prospect Park Loop", "East River Esplanade", "Hudson River Greenway", "Central Park Reservoir", "McCarren Park Laps", "Brooklyn Bridge Out and Back",
  "Riverside Park", "Williamsburg Waterfront", "Fort Greene Hills", "Flushing Meadows", "Roosevelt Island", "Inwood Hill Trail",
] as const;
const zoneNames = ["Easy", "Fat burn", "Aerobic", "Threshold", "Max"] as const;
const zoneColors = ["#64d2ff", "#30d158", "#ffd60a", "#ff9f0a", "#ff453a"] as const;

/** One workout, generated from a seed: the live run is workout 0, history is the rest. */
function workout(seed: number, k: number, minutes?: number) {
  const rng = createRng(hash(seed, "workout", k));
  const pace = rng.range(7 * 60 + 50, 10 * 60 + 40);
  const total = (minutes ?? rng.int(22, 64)) * 60 + rng.int(0, 59);
  const miles = total / pace;
  const full = Math.floor(miles);
  const splits = Array.from({ length: full + (miles - full > 0.1 ? 1 : 0) }, (_, i) => ({
    id: `mile-${i + 1}`,
    n: i + 1,
    miles: i < full ? 1 : miles - full,
    pace: pace + rng.range(-30, 30) + (i === 0 ? 16 : 0),
  }));
  const zones = [rng.range(2, 8), rng.range(8, 22), rng.range(14, 34), rng.range(8, 24), rng.range(0, 8)];
  const sum = zones.reduce((a, b) => a + b, 0);
  return {
    name: routeNames[(hash(seed, k) + k) % routeNames.length],
    pace, total, miles, splits, k,
    hr: Math.round(rng.range(138, 164)),
    zones: zones.map((z) => z / sum),
    cal: Math.round(miles * rng.range(92, 108) + 20),
    elev: Math.round(miles * rng.range(24, 70)),
    cadence: rng.int(160, 178),
    daysAgo: k * 2 + rng.int(0, 1),
  };
}
type Workout = ReturnType<typeof workout>;

type Spec = { kind: "metrics" | "map" | "splits" | "mile" | "overview" | "zones" | "route" | "history"; at: number; k: number };

function plan(props: ScreenProps) {
  const total = Math.max(4, props.duration);
  const rng = createRng(hash(props.seed, "run-plan"));
  const specs: Record<string, Spec> = {};
  const flow = createFlow(total);
  const dwell = () => rng.range(1.8, 2.5);
  const go = (id: string, kind: Spec["kind"], k: number, options: Parameters<typeof flow.go>[2] = {}) => {
    specs[id] = { kind, at: flow.t, k };
    flow.go(id, dwell(), options);
  };
  const live = workout(props.seed, 0, Math.max(1, props.duration));
  if (props.view === "summary") {
    let k = 0;
    let first = true;
    while (flow.open) {
      const w = Math.min(k, 1);
      const id = (kind: string) => `${kind}-${w}`;
      go(id("overview"), "overview", w, { enter: first ? "cut" : "push", scroll: 150, flicks: 2, tap: first ? undefined : { x: 195, y: 250 } });
      go(id("splits"), "splits", w, { enter: "push", scroll: 80, tap: { x: 195, y: 560 } });
      go(id("zones"), "zones", w, { enter: "push", tap: { x: 195, y: 560 } });
      go(id("route"), "route", w, { enter: "push", tap: { x: 195, y: 450 } });
      go("history", "history", w, { enter: "pop", scroll: 60 + k * 30, flicks: 2, tap: { x: 30, y: 70 } });
      first = false;
      k += 1;
    }
    return { total, specs, shots: flow.shots, live, route: null as null };
  }
  let milesAnnounced = 0;
  let sheets = 0;
  let cycle = 0;
  while (flow.open) {
    const done = Math.floor((flow.t * 60 + live.total % 60) / live.pace);
    if (done > milesAnnounced && sheets < 4) {
      milesAnnounced = done;
      go(`mile-${sheets}`, "mile", done, { enter: "sheet" });
      sheets += 1;
      go("metrics", "metrics", 0, { enter: "dismiss" });
      continue;
    }
    go("metrics", "metrics", 0, { enter: cycle === 0 ? "cut" : "pop", tap: cycle === 0 ? undefined : { x: 195, y: 790 } });
    go("map", "map", 0, { enter: "push", tap: { x: 360, y: 90 } });
    go("metrics", "metrics", 0, { enter: "pop", tap: { x: 40, y: 790 } });
    if (cycle < 3) go(`splits-${cycle}`, "splits", 0, { enter: "push", scroll: 60, tap: { x: 355, y: 90 } });
    cycle += 1;
  }
  return { total, specs, shots: flow.shots, live, route: null as null };
}
type Plan = ReturnType<typeof plan>;

function Dots({ active }: { active: number }) {
  return <div className={styles.dots}>{[0, 1, 2].map((i) => <i key={i} data-on={i === active} />)}</div>;
}

const controls = (
  <div className={styles.controls}>
    <span className={styles.ctl}><Icon name="close" size={22} stroke={2.4} /></span>
    <span className={`${styles.ctl} ${styles.pause}`}><svg width="28" height="28" viewBox="0 0 28 28"><path d="M6 5h6v18H6zM16 5h6v18h-6z" fill="#000" /></svg></span>
    <span className={styles.ctl}><Icon name="lock" size={22} stroke={2.2} /></span>
  </div>
);

const back = (title: string) => <header className={styles.bar}><Icon name="chevronLeft" size={26} stroke={2.4} /><b>{title}</b></header>;

function SplitRows({ w, limit }: { w: Workout; limit: number }) {
  const rows = w.splits.slice(0, limit);
  const fastest = Math.min(...rows.map((s) => s.pace));
  const slowest = Math.max(...rows.map((s) => s.pace));
  return (
    <div className={styles.splits}>
      <div className={styles.splitHead}><span>Mile</span><span>Pace</span><span /></div>
      {rows.map((s) => (
        <div key={s.id} className={styles.split}>
          <span>{s.miles < 1 ? s.miles.toFixed(2) : s.n}</span>
          <span className={s.pace === fastest ? styles.fast : undefined}>{paceText(s.pace)}</span>
          <span className={styles.bar2}><i style={{ width: `${40 + (1 - (s.pace - fastest) / Math.max(1, slowest - fastest)) * 60}%`, background: s.pace === fastest ? "#30d158" : ORANGE }} /></span>
        </div>
      ))}
    </div>
  );
}

function RouteMap({ seed, k, height, w }: { seed: number; k: number; height: number; w: Workout }) {
  const map = makeMap(hash(seed, k, "run-map"), 390, height, { angle: -22 });
  const route = makeRoute(map, 1 + k);
  return (
    <MapSvg map={map} dark>
      <RouteLine pts={route} color={ORANGE} casing="#14171b" width={4.5} />
      <Upright map={map} at={route[0]}><circle r="5" fill="#30d158" stroke="#fff" strokeWidth="1.5" /></Upright>
      <Upright map={map} at={route[route.length - 1]}><circle r="5" fill="#ff453a" stroke="#fff" strokeWidth="1.5" /></Upright>
      <title>{w.name}</title>
    </MapSvg>
  );
}

function buildPanel(spec: Spec, p: Plan, props: ScreenProps): Panel {
  const dark = `${styles.run} ${ios.dark}`;
  if (spec.kind === "metrics") return { className: dark, body: <div />, chrome: <>{controls}<Dots active={0} /></> };
  if (spec.kind === "map") {
    const map = makeMap(props.seed, 390, 844, { angle: -22 });
    const route = makeRoute(map, 1);
    return {
      className: dark,
      body: (
        <MapSvg map={map} dark>
          <RouteLine pts={route} color="#3a2a22" casing="#14171b" width={4} />
          <Upright map={map} at={route[0]}><circle r="5" fill="#30d158" stroke="#fff" strokeWidth="1.5" /></Upright>
        </MapSvg>
      ),
      chrome: <><div className={styles.stripBg} /><Dots active={1} />{back("Route")}</>,
    };
  }
  if (spec.kind === "mile") {
    const m = p.live.splits[Math.min(p.live.splits.length - 1, Math.max(0, spec.k - 1))];
    return {
      className: styles.sheetPanel,
      body: <div />,
      chrome: (
        <div className={styles.mileSheet}>
          <span className={styles.kicker}>Mile {spec.k} complete</span>
          <b>{paceText(m.pace)}</b>
          <small>Average pace · {Math.round(p.live.hr + (spec.k % 3) * 3)} BPM</small>
        </div>
      ),
    };
  }
  if (spec.kind === "splits") {
    const w = props.view === "active" ? { ...p.live, splits: p.live.splits.slice(0, Math.max(1, Math.floor((spec.at * 60) / p.live.pace) + 1)) } : workout(props.seed, spec.k, spec.k === 0 ? props.duration : undefined);
    return {
      className: dark,
      top: 92,
      body: <div className={styles.padded}><div className={styles.kicker}>Splits</div><SplitRows w={w} limit={9} /></div>,
      chrome: <>{back("Splits")}<Dots active={2} /></>,
    };
  }
  const w = workout(props.seed, spec.k, spec.k === 0 ? props.duration : undefined);
  if (spec.kind === "overview") {
    const stats: readonly (readonly [string, string])[] = [
      ["Workout Time", clockTime(w.total)], ["Distance", `${w.miles.toFixed(2)} MI`], ["Avg. Pace", `${paceText(w.pace)} /MI`],
      ["Active Calories", `${w.cal} CAL`], ["Avg. Heart Rate", `${w.hr} BPM`], ["Elevation Gain", `${w.elev} FT`], ["Cadence", `${w.cadence} SPM`], ["Splits", `${w.splits.length}`],
    ];
    const start = props.clock - props.elapsed - w.daysAgo * 0;
    return {
      className: dark,
      body: (
        <div>
          <div className={styles.summaryMap}><RouteMap seed={props.seed} k={w.k} height={250} w={w} /><div className={styles.fade} /></div>
          <div className={styles.summary}>
            <div className={styles.kicker}>{formatDate(props.day - w.daysAgo)}</div>
            <h1>{w.name}</h1>
            <div className={styles.where}>{props.owner.home} · {formatTime(start)}</div>
            <div className={styles.stats}>{stats.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>
            <SplitRows w={w} limit={3} />
          </div>
        </div>
      ),
      chrome: back("Workout"),
    };
  }
  if (spec.kind === "zones") {
    return {
      className: dark,
      top: 92,
      body: (
        <div className={styles.padded}>
          <div className={styles.kicker}>Heart rate zones</div>
          <div className={styles.avg}><b>{w.hr}</b> BPM average</div>
          {w.zones.map((z, i) => (
            <div key={zoneNames[i]} className={styles.zone}>
              <span>Zone {i + 1}<small>{zoneNames[i]}</small></span>
              <span className={styles.bar2}><i style={{ width: `${Math.max(3, z * 100)}%`, background: zoneColors[i] }} /></span>
              <b>{Math.round(z * w.total / 60)}m</b>
            </div>
          ))}
        </div>
      ),
      chrome: back("Heart Rate"),
    };
  }
  if (spec.kind === "route") {
    return { className: dark, body: <RouteMap seed={props.seed} k={w.k} height={844} w={w} />, chrome: back(w.name) };
  }
  const rows = Array.from({ length: 8 }, (_, i) => workout(props.seed, i + 1));
  return {
    className: dark,
    top: 92,
    body: (
      <div className={styles.padded}>
        {[workout(props.seed, 0, props.duration), ...rows].map((r) => (
          <div key={r.k} className={styles.hist}>
            <span><b>{r.name}</b><small>{r.k === 0 ? "Today" : `${r.daysAgo} days ago`}</small></span>
            <em>{r.miles.toFixed(2)}<small>MI · {paceText(r.pace)}</small></em>
          </div>
        ))}
      </div>
    ),
    chrome: back("Workouts"),
  };
}

/** Live numbers: re-render every tick over the metrics and map panels. */
function Live({ p, props, panel }: { p: Plan; props: ScreenProps; panel: string }) {
  const kind = p.specs[panel]?.kind;
  if (props.view !== "active" || (kind !== "metrics" && kind !== "map")) return null;
  const startSec = p.live.total % 60;
  const sec = Math.max(0, props.elapsed) * 60 + startSec;
  const miles = sec / p.live.pace;
  const wobble = createRng(hash(props.seed, "p", props.elapsed));
  const hr = Math.round(p.live.hr - 8 + Math.min(14, props.elapsed / 2) + 4 * Math.sin(props.elapsed / 2.3) + wobble.range(-3, 3));
  const pace = p.live.pace + wobble.range(-18, 18);
  const zone = hr >= 168 ? 5 : hr >= 156 ? 4 : hr >= 140 ? 3 : 2;
  if (kind === "map") {
    const map = makeMap(props.seed, 390, 844, { angle: -22 });
    const route = makeRoute(map, 1);
    const progress = Math.min(1, props.elapsed / Math.max(1, props.duration));
    const here = pointAt(route, progress);
    return (
      <div className={styles.live}>
        <svg width="390" height="844" viewBox="0 0 390 844" aria-hidden="true">
          <g transform={`rotate(${map.angle} 195 422)`}>
            <RouteLine pts={slice(route, 0, progress)} color={ORANGE} casing="#14171b" width={4.5} />
            <Upright map={map} at={here}><circle r="11" fill="rgb(255 106 31 / 28%)" /><circle r="5.5" fill={ORANGE} stroke="#fff" strokeWidth="2" /></Upright>
          </g>
        </svg>
        <div className={styles.strip}>
          <div><b>{clockTime(sec)}</b><span>Time</span></div>
          <div><b>{miles.toFixed(2)}</b><span>Miles</span></div>
          <div><b>{paceText(pace)}</b><span>Pace</span></div>
          <div><b>{hr}</b><span>BPM</span></div>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.live}>
      <div className={styles.metrics}>
        <div className={styles.kicker}>Outdoor Run</div>
        <div className={styles.time}>{clockTime(sec)}</div>
        <div className={styles.grid}>
          <div><b>{miles.toFixed(2)}</b><span>Miles</span></div>
          <div><b>{paceText(pace)}</b><span>Pace /mi</span></div>
          <div><b>{hr}<Icon name="heart" size={16} filled stroke={0} style={{ color: "#ff375f" }} /></b><span>Heart Rate · Zone {zone}</span></div>
          <div><b>{paceText(sec / Math.max(0.05, miles))}</b><span>Avg Pace</span></div>
        </div>
        <div className={styles.secondary}>
          <div><b>{Math.round(miles * 98 + 20)}</b><span>Active Cal</span></div>
          <div><b>{Math.round(p.live.cadence + 3 * Math.sin(props.elapsed))}</b><span>Cadence</span></div>
          <div><b>{Math.round(miles * 46)}</b><span>Elev. ft</span></div>
        </div>
      </div>
    </div>
  );
}

function RunScreen(props: ScreenProps) {
  const p = plan(props);
  const build = (): Session => ({
    duration: p.total,
    shots: p.shots,
    panels: Object.fromEntries(Object.entries(p.specs).map(([id, spec]) => [id, buildPanel(spec, p, props)])),
  });
  return (
    <div className={styles.screen}>
      <Storyboard id={`${props.view}:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={build} live={(panel) => <Live p={p} props={props} panel={panel} />} />
    </div>
  );
}

const run: CloneDefinition = {
  Screen: RunScreen,
  tone: () => "light",
  fixtures: [
    { view: "active", label: "mile two", clock: 6 * 60 + 12, duration: 38, seed: 8 },
    { view: "summary", label: "just finished", clock: 6 * 60 + 52, duration: 37, seed: 8 },
  ],
};

export default run;
