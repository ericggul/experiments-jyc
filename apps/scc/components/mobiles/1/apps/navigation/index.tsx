import { Icon, Storyboard, ios, type Panel, type Session } from "../../ios";
import { createRng, hash, type Rng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { MapSvg, RouteLine, Upright, headingAt, makeMap, makeRoute, pointAt, slice } from "./map";
import { createFlow } from "./session";
import styles from "./navigation.module.css";

const BLUE = "#2f7cf6";
const trafficColors = ["#30c26a", "#30c26a", "#ffb020", "#f0453a"] as const;

const avenues = [
  "Atlantic Ave", "Flatbush Ave", "Court St", "Bedford Ave", "Metropolitan Ave", "Houston St", "Canal St", "Delancey St", "Second Ave", "Hudson St", "Broadway",
  "Nostrand Ave", "Myrtle Ave", "Fulton St", "Bowery", "Lafayette St", "Varick St", "Church St", "Grand St", "Kent Ave", "Flushing Ave", "Union Ave",
  "Northern Blvd", "Queens Blvd", "Jackson Ave", "Vernon Blvd", "Park Ave", "Madison Ave", "Lexington Ave", "Amsterdam Ave", "Columbus Ave", "Riverside Dr",
] as const;
const highways = ["FDR Dr", "BQE", "West Side Hwy", "Major Deegan Expy", "Belt Pkwy", "Kosciuszko Br"] as const;
const places = ["Anchor Coffee", "Pier Market", "Union Library", "Harbor Gym", "Loft Studios", "Corner Pharmacy", "Maple Dental", "Field Park", "Garden Clinic", "Central Garage", "Salt Kitchen", "Yard Hardware"] as const;
const hoods = ["Williamsburg", "Chelsea", "Astoria", "Park Slope", "Midtown", "Greenpoint", "Harlem", "Dumbo", "Long Island City", "SoHo", "Red Hook", "Fort Greene"] as const;

function street(rng: Rng): string {
  const roll = rng.next();
  if (roll < 0.34) {
    const n = rng.int(3, 98);
    const ord = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
    return `${rng.pick(["W", "E"])} ${n}${ord} St`;
  }
  return roll < 0.88 ? rng.pick(avenues) : rng.pick(highways);
}

type Move = "left" | "right" | "straight";
const maneuvers = [
  { kind: "right", text: "Turn right onto" }, { kind: "left", text: "Turn left onto" }, { kind: "straight", text: "Continue on" },
  { kind: "right", text: "Keep right onto" }, { kind: "left", text: "Keep left onto" }, { kind: "right", text: "Merge onto" }, { kind: "left", text: "Use the left lane to turn onto" },
] as const satisfies readonly { kind: Move; text: string }[];

type Trip = { id: string; kk: number; t0: number; dur: number; overviewAt: number; arriveAt: number };

function destinationOf(seed: number, kk: number, owner: ScreenProps["owner"]) {
  const rng = createRng(hash(seed, "dest", kk));
  const name = kk === 0 && owner.work !== "Home" ? owner.work : `${rng.pick(places)}`;
  return { name, hood: rng.pick(hoods), number: rng.int(12, 880) };
}

function stepsFor(seed: number, kk: number, dur: number) {
  const rng = createRng(hash(seed, "steps", kk));
  const steps: { id: string; move: (typeof maneuvers)[number]; street: string; start: number; len: number; miles: number; lanes: number; lane: number }[] = [];
  let t = 0;
  while (t < dur + 3) {
    const len = rng.range(1, 3);
    steps.push({ id: `step-${steps.length}`, move: rng.pick(maneuvers), street: street(rng), start: t, len, miles: len * rng.range(0.28, 0.5), lanes: rng.int(3, 4), lane: rng.int(0, 3) });
    t += len;
  }
  return steps;
}

function plan(props: ScreenProps) {
  const { seed } = props;
  const total = Math.max(4, props.duration);
  const rng = createRng(hash(seed, "nav-plan"));
  const flow = createFlow(total);
  const trips: Trip[] = [];
  let k = 0;
  let order = 0;
  while (flow.open) {
    const kk = k % 3;
    const dur = rng.int(11, 24);
    const drivingFirst = props.view === "driving" && k === 0;
    const overviewAt = flow.t;
    if (!drivingFirst) {
      flow.go(`overview-${kk}`, rng.range(2.2, 2.8), { enter: order === 0 ? "cut" : "fade" });
      order += 1;
    }
    const offset = drivingFirst ? dur * rng.range(0.1, 0.3) : 0;
    const driveAt = flow.t;
    const t0 = driveAt - offset;
    const arriveAt = t0 + dur;
    const first = Math.max(2.4, (arriveAt - driveAt) * 0.4);
    flow.go("drive", first, { enter: drivingFirst ? "cut" : "push", tap: drivingFirst ? undefined : { x: 320, y: 500 } });
    flow.go(`steps-${kk}`, 2.4, { enter: "sheet", tap: { x: 195, y: 800 } });
    flow.go("drive", Math.max(1.4, arriveAt - flow.t), { enter: "dismiss" });
    flow.go(`arrived-${kk}`, 2.6, { enter: "fade" });
    trips.push({ id: `trip-${k}`, kk, t0, dur, overviewAt, arriveAt });
    k += 1;
    order += 1;
  }
  return { total, seed, shots: flow.shots, trips };
}
type Plan = ReturnType<typeof plan>;

function Pin({ color, label }: { color: string; label?: string }) {
  return (
    <g>
      <circle r="7" fill={color} stroke="#fff" strokeWidth="2" />
      {label && <text y="-12" textAnchor="middle" fontSize="9" fontWeight="600" fill="#1c1c1e" stroke="#fff" strokeWidth="3" paintOrder="stroke" fontFamily="-apple-system, Helvetica, sans-serif">{label}</text>}
    </g>
  );
}

function Arrow({ kind, size = 56, color = "#fff" }: { kind: Move; size?: number; color?: string }) {
  const d = kind === "right" ? "M9 22V13a5 5 0 0 1 5-5h8M17 3l5 5-5 5" : kind === "left" ? "M19 22V13a5 5 0 0 0-5-5H6M11 3 6 8l5 5" : "M14 23V5M8 11l6-6 6 6";
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const distanceText = (miles: number) => (miles >= 0.2 ? miles.toFixed(1) : String(Math.max(50, Math.round((miles * 5280) / 50) * 50)));
const distanceUnit = (miles: number) => (miles >= 0.2 ? "mi" : "ft");

function overviewPanel(trip: Trip, p: Plan, props: ScreenProps): Panel {
  const { seed, owner } = props;
  const map = makeMap(hash(seed, trip.kk, "nav-map"), 390, 560, { angle: -24 });
  const rng = createRng(hash(seed, trip.kk, "options"));
  const routes = [0, 1, 2].map((v) => makeRoute(map, v + 1 + trip.kk));
  const base = trip.dur + rng.int(-2, 3);
  const dest = destinationOf(seed, trip.kk, owner);
  const start = props.clock - props.elapsed + trip.overviewAt;
  const options = [
    { id: "fastest", mins: base, miles: (base * 0.34).toFixed(1), via: street(rng), note: "Fastest route", detail: rng.pick(["Usual traffic", "Light traffic"]) },
    { id: "tolls", mins: base + rng.int(3, 7), miles: (base * 0.31).toFixed(1), via: street(rng), note: rng.pick(["Fewer tolls", "No tolls"]), detail: "Light traffic" },
    { id: "highways", mins: base + rng.int(6, 12), miles: (base * 0.37).toFixed(1), via: street(rng), note: "Avoids highways", detail: rng.pick(["Moderate traffic", "Heavy traffic"]) },
  ];
  const mid = pointAt(routes[0], 0.5);
  void p;
  return {
    body: (
      <div className={styles.mapTop}>
        <MapSvg map={map}>
          {[2, 1].map((i) => <RouteLine key={i} pts={routes[i]} color="#9db6d9" width={5} />)}
          <RouteLine pts={routes[0]} color={BLUE} width={6} />
          <Upright map={map} at={map.start}><circle r="6" fill={BLUE} stroke="#fff" strokeWidth="2.5" /></Upright>
          <Upright map={map} at={map.end}><Pin color="#ff3b30" /></Upright>
          <Upright map={map} at={mid}>
            <rect x="-22" y="-26" width="44" height="20" rx="10" fill={BLUE} />
            <text y="-12.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="-apple-system, Helvetica, sans-serif">{options[0].mins} min</text>
          </Upright>
        </MapSvg>
      </div>
    ),
    chrome: (
      <>
        <div className={styles.search}>
          <Icon name="chevronLeft" size={20} stroke={2.6} style={{ color: BLUE }} />
          <div className={styles.fields}>
            <span><i className={styles.fromDot} /> My Location</span>
            <span><i className={styles.toDot} /> {dest.name}</span>
          </div>
          <Icon name="more" size={22} stroke={2.4} style={{ color: BLUE }} />
        </div>
        <div className={styles.sheet}>
          <div className={styles.grabber} />
          <div className={styles.modes}>
            <span data-on="true"><Icon name="car" size={18} stroke={2} /> {options[0].mins} min</span>
            <span><Icon name="train" size={18} stroke={2} /> {options[0].mins + 9} min</span>
            <span><Icon name="run" size={18} stroke={2} /> {Math.round(options[0].mins * 4.4)} min</span>
          </div>
          {options.map((o, i) => (
            <div key={o.id} className={styles.option} data-selected={i === 0}>
              <div>
                <b>{o.mins} min</b>
                <span>{o.miles} mi · via {o.via}</span>
                <small>{o.note} · {o.detail}</small>
              </div>
              {i === 0 ? <span className={styles.go}>GO</span> : <span className={styles.arrive}>{formatTime(start + o.mins)}</span>}
            </div>
          ))}
        </div>
      </>
    ),
  };
}

function stepsPanel(trip: Trip, props: ScreenProps): Panel {
  const steps = stepsFor(props.seed, trip.kk, trip.dur).slice(0, 9);
  const dest = destinationOf(props.seed, trip.kk, props.owner);
  return {
    className: styles.sheetPanel,
    top: 150,
    body: (
      <div className={styles.stepList}>
        {steps.map((s) => (
          <div key={s.id} className={styles.stepRow}>
            <Arrow kind={s.move.kind} size={28} color="#1c1c1e" />
            <span>{s.move.text} {s.street}<small>{s.miles.toFixed(1)} mi · {Math.round(s.len)} min</small></span>
          </div>
        ))}
      </div>
    ),
    chrome: <header className={styles.sheetHead}>To {dest.name}</header>,
  };
}

function arrivedPanel(trip: Trip, props: ScreenProps): Panel {
  const dest = destinationOf(props.seed, trip.kk, props.owner);
  const rng = createRng(hash(props.seed, "arrived", trip.kk));
  return {
    body: (
      <div className={styles.arrived}>
        <span className={styles.arrivedPin}><Icon name="pin" size={40} stroke={2} /></span>
        <h1>You have arrived</h1>
        <b>{dest.name}</b>
        <span>{dest.number} {street(rng)}, {dest.hood}</span>
        <div className={styles.arrivedStats}>
          <div><b>{trip.dur} min</b><span>Drive</span></div>
          <div><b>{(trip.dur * 0.34).toFixed(1)} mi</b><span>Distance</span></div>
          <div><b>{Math.round(rng.range(17, 29))} mph</b><span>Average</span></div>
        </div>
        <span className={styles.go}>Done</span>
      </div>
    ),
  };
}

function Live({ p, props }: { p: Plan; props: ScreenProps }) {
  const trip = [...p.trips].reverse().find((t) => t.t0 - 0.01 <= props.elapsed + 3 && t.overviewAt <= props.elapsed);
  if (!trip) return null;
  const { seed, elapsed, clock, owner } = props;
  const local = Math.max(0, elapsed - trip.t0);
  const progress = Math.min(1, local / trip.dur);
  const map = makeMap(hash(seed, trip.kk, "nav-drive"), 390, 844, { angle: -24, gy: 14 });
  const route = makeRoute(map, 1 + trip.kk);
  const here = pointAt(route, progress);
  const heading = headingAt(route, progress);
  const steps = stepsFor(seed, trip.kk, trip.dur);
  let index = 0;
  steps.forEach((s, i) => {
    if (s.start <= local) index = i;
  });
  const step = steps[index];
  const next = steps[index + 1] ?? step;
  const frac = (local - step.start) / step.len;
  const left = Math.max(0.05, (1 - frac) * step.miles);
  const remaining = Math.max(0, Math.round(trip.dur - local));
  const milesLeft = steps.slice(index).reduce((a, s) => a + s.miles, 0) - frac * step.miles;
  const wobble = createRng(hash(seed, "mph", Math.floor(elapsed)));
  const mph = Math.round(frac > 0.8 ? 12 + wobble.range(0, 6) : 24 + wobble.range(-4, 9));
  const dest = destinationOf(seed, trip.kk, owner);
  const rerouteAt = 0.4 + (hash(seed, trip.kk) % 20) / 100;
  const banner = progress >= rerouteAt && progress < rerouteAt + 0.1 ? "Traffic ahead. Faster route found, saves 3 min." : progress >= rerouteAt + 0.1 && progress < rerouteAt + 0.2 ? "Rerouted around a closure." : null;
  const scale = 2.3;
  const rngT = createRng(hash(seed, trip.kk, "traffic"));
  const pieces = Array.from({ length: 6 }, (_, i) => ({ id: `piece-${i}`, i, color: trafficColors[Math.floor(rngT.next() * trafficColors.length)] }));
  return (
    <div className={`${styles.live} ${ios.dark}`}>
      <MapSvg map={map} dark camera={{ at: here, scale, anchor: [200, 600] }}>
        <RouteLine pts={slice(route, 0, progress)} color="#55606e" casing="#14171b" width={4} />
        {pieces.map((q) => <RouteLine key={q.id} pts={slice(route, Math.max(progress, q.i / 6), (q.i + 1) / 6)} color={q.color} casing="#14171b" width={4.6} />)}
        <Upright map={map} at={route[route.length - 1]} scale={(1 / scale) * 1.4}><Pin color="#ff453a" label={dest.name} /></Upright>
        <g transform={`translate(${here[0]} ${here[1]}) rotate(${heading}) scale(${1 / scale})`}>
          <circle r="17" fill="rgb(47 124 246 / 25%)" />
          <path d="M0-13 10 11 0 6-10 11z" fill={BLUE} stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
        </g>
      </MapSvg>
      <div className={styles.banner}>
        <Arrow kind={step.move.kind} />
        <div className={styles.bannerText}>
          <div className={styles.dist}>{distanceText(left)}<small>{distanceUnit(left)}</small></div>
          <div className={styles.onto}>{step.move.text} {step.street}</div>
        </div>
      </div>
      <div className={styles.lanes}>
        {Array.from({ length: step.lanes }, (_, l) => (
          <span key={l === 0 ? "l0" : l === 1 ? "l1" : l === 2 ? "l2" : "l3"} data-active={Math.abs(l - step.lane) <= (step.move.kind === "straight" ? 0 : 1)}>
            <svg width="22" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d={l === 0 ? "M14 25V6M8 12l6-6 6 6" : l === step.lanes - 1 ? "M14 25V12a5 5 0 0 1 5-5h4M19 3l4 4-4 4" : "M14 25V5M8 11l6-6 6 6"} />
            </svg>
          </span>
        ))}
      </div>
      <div className={styles.then}>{banner ?? `Then ${next.move.text.toLowerCase()} ${next.street}`}</div>
      <span className={styles.speed}>{mph}<small>mph</small></span>
      <div className={styles.eta}>
        <div className={styles.etaCol}><b>{formatTime(clock + remaining)}</b><span>arrival</span></div>
        <div className={styles.etaCol}><b className={styles.green}>{remaining} min</b><span>remaining</span></div>
        <div className={styles.etaCol}><b>{milesLeft.toFixed(1)} mi</b><span>distance</span></div>
        <span className={styles.end}>End</span>
      </div>
    </div>
  );
}

function buildPanels(p: Plan, props: ScreenProps): Record<string, Panel> {
  const panels: Record<string, Panel> = { drive: { className: styles.drivePanel, body: <div /> } };
  for (const trip of p.trips) {
    panels[`overview-${trip.kk}`] ??= overviewPanel(trip, p, props);
    panels[`steps-${trip.kk}`] ??= stepsPanel(trip, props);
    panels[`arrived-${trip.kk}`] ??= arrivedPanel(trip, props);
  }
  return panels;
}

function NavigationScreen(props: ScreenProps) {
  const p = plan(props);
  const build = (): Session => ({ duration: p.total, shots: p.shots, panels: buildPanels(p, props) });
  return (
    <div className={styles.screen}>
      <Storyboard id={`${props.view}:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={build} live={(panel) => (panel === "drive" ? <Live p={p} props={props} /> : null)} />
    </div>
  );
}

const navigation: CloneDefinition = {
  Screen: NavigationScreen,
  tone: (view) => (view === "driving" ? "light" : "dark"),
  fixtures: [
    { view: "route-overview", label: "picking a route", clock: 8 * 60 + 5, duration: 36, seed: 14 },
    { view: "driving", label: "on the way in", clock: 8 * 60 + 20, duration: 26, seed: 14 },
    { view: "driving", label: "evening drive", clock: 18 * 60 + 10, duration: 34, seed: 3 },
  ],
};

export default navigation;
