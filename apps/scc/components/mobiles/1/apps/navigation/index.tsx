import { Icon, ios } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { MapSvg, RouteLine, Upright, headingAt, makeMap, makeRoute, pointAt, slice } from "./map";
import styles from "./navigation.module.css";

const BLUE = "#2f7cf6";
const trafficColors = ["#30c26a", "#30c26a", "#ffb020", "#f0453a"] as const;

const roads = ["Atlantic Ave", "Flatbush Ave", "Court St", "Bedford Ave", "Metropolitan Ave", "Houston St", "Canal St", "Delancey St", "Second Ave", "FDR Dr", "Hudson St", "Broadway"];

function Pin({ color, label }: { color: string; label?: string }) {
  return (
    <g>
      <circle r="7" fill={color} stroke="#fff" strokeWidth="2" />
      {label && <text y="-12" textAnchor="middle" fontSize="9" fontWeight="600" fill="#1c1c1e" stroke="#fff" strokeWidth="3" paintOrder="stroke" fontFamily="-apple-system, Helvetica, sans-serif">{label}</text>}
    </g>
  );
}

const destination = (owner: ScreenProps["owner"]) => (owner.work === "Home" ? "Prospect Park" : owner.work);

function Overview(props: ScreenProps) {
  const { seed, owner, clock } = props;
  const MAP_H = 560;
  const map = makeMap(seed, 390, MAP_H, { angle: -24 });
  const rng = createRng(seed ^ 0x61);
  const routes = [0, 1, 2].map((v) => makeRoute(map, v + 1));
  const base = rng.int(18, 38);
  // Three different roads: each option's id is its role, not its display text.
  const first = rng.int(0, roads.length - 1);
  const via = (offset: number) => roads[(first + offset) % roads.length];
  const options = [
    { id: "fastest", mins: base, miles: (base * 0.27).toFixed(1), via: via(0), note: "Fastest route", detail: "Usual traffic" },
    { id: "tolls", mins: base + rng.int(3, 7), miles: (base * 0.25).toFixed(1), via: via(4), note: "Fewer tolls", detail: "Light traffic" },
    { id: "highways", mins: base + rng.int(6, 12), miles: (base * 0.3).toFixed(1), via: via(8), note: "Avoids highways", detail: "Moderate traffic" },
  ];
  const mid = pointAt(routes[0], 0.5);
  return (
    <div className={styles.screen}>
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
      <div className={styles.search}>
        <Icon name="chevronLeft" size={20} stroke={2.6} style={{ color: BLUE }} />
        <div className={styles.fields}>
          <span><i className={styles.fromDot} /> My Location</span>
          <span><i className={styles.toDot} /> {destination(owner)}</span>
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
            {i === 0 ? <span className={styles.go}>GO</span> : <span className={styles.arrive}>{formatTime(clock + o.mins)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

const maneuvers = [
  { kind: "right", text: "Turn right onto" },
  { kind: "left", text: "Turn left onto" },
  { kind: "right", text: "Turn right onto" },
  { kind: "straight", text: "Continue on" },
  { kind: "left", text: "Turn left onto" },
  { kind: "right", text: "Keep right onto" },
] as const;

function Arrow({ kind, size = 56 }: { kind: "right" | "left" | "straight"; size?: number }) {
  const d = kind === "right" ? "M9 22V13a5 5 0 0 1 5-5h8M17 3l5 5-5 5" : kind === "left" ? "M19 22V13a5 5 0 0 0-5-5H6M11 3 6 8l5 5" : "M14 23V5M8 11l6-6 6 6";
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const distanceText = (miles: number) => (miles >= 0.2 ? `${miles.toFixed(1)}` : `${Math.max(50, Math.round((miles * 5280) / 50) * 50)}`);
const distanceUnit = (miles: number) => (miles >= 0.2 ? "mi" : "ft");

function Driving(props: ScreenProps) {
  const { seed, elapsed, duration, clock, owner } = props;
  const W = 390;
  const H = 844;
  const dur = Math.max(2, duration);
  const progress = Math.min(1, elapsed / dur);
  const map = makeMap(seed, W, H, { angle: -24, gy: 14 });
  const route = makeRoute(map, 1);
  const here = pointAt(route, progress);
  const heading = headingAt(route, progress);
  const rng = createRng(seed ^ 0x9f);
  const leg = Math.max(2, Math.round(dur / 6));
  const idx = Math.floor(elapsed / leg);
  const frac = (elapsed % leg) / leg;
  const legMiles = 0.3 + (hash(seed, idx) % 12) / 10;
  const left = Math.max(0.05, (1 - frac) * legMiles);
  const man = maneuvers[(idx + (seed % 3)) % maneuvers.length];
  const street = roads[(hash(seed, "s", idx) % roads.length)];
  const remaining = Math.max(0, dur - elapsed);
  const milesLeft = remaining * 0.28;
  const nextStreet = roads[(hash(seed, "t", idx) % roads.length)];
  // Traffic runs along the remaining route in coloured stretches.
  const pieces = Array.from({ length: 6 }, (_, i) => ({ i, color: trafficColors[Math.floor(rng.next() * trafficColors.length)] }));
  const scale = 2.3;
  return (
    <div className={`${styles.screen} ${ios.dark}`}>
      <div className={styles.mapFull}>
        <MapSvg map={map} dark camera={{ at: here, scale, anchor: [W / 2 + 10, 600] }}>
          <RouteLine pts={slice(route, 0, progress)} color="#55606e" casing="#14171b" width={4} />
          {pieces.map((p) => (
            <RouteLine key={p.i} pts={slice(route, Math.max(progress, p.i / 6), (p.i + 1) / 6)} color={p.color} casing="#14171b" width={4.6} />
          ))}
          <Upright map={map} at={route[route.length - 1]} scale={1 / scale * 1.4}><Pin color="#ff453a" label={destination(owner)} /></Upright>
          <g transform={`translate(${here[0]} ${here[1]}) rotate(${heading}) scale(${1 / scale})`}>
            <circle r="17" fill="rgb(47 124 246 / 25%)" />
            <path d="M0-13 10 11 0 6-10 11z" fill="#2f7cf6" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
          </g>
        </MapSvg>
      </div>
      <div className={styles.banner}>
        <Arrow kind={man.kind} />
        <div className={styles.bannerText}>
          <div className={styles.dist}>{distanceText(left)}<small>{distanceUnit(left)}</small></div>
          <div className={styles.onto}>{man.text} {street}</div>
        </div>
      </div>
      <div className={styles.lanes}>
        {[0, 1, 2, 3].map((l) => {
          const active = man.kind === "left" ? l <= 1 : man.kind === "right" ? l >= 2 : l === 1 || l === 2;
          return (
            <span key={l} data-active={active}>
              <svg width="22" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path d={l === 0 ? "M14 25V6M8 12l6-6 6 6" : l === 3 ? "M14 25V12a5 5 0 0 1 5-5h4M19 3l4 4-4 4" : "M14 25V5M8 11l6-6 6 6"} />
              </svg>
            </span>
          );
        })}
      </div>
      <div className={styles.then}>Then {maneuvers[(idx + 1 + (seed % 3)) % maneuvers.length].text.toLowerCase()} {nextStreet}</div>
      <div className={styles.eta}>
        <div className={styles.etaCol}><b>{formatTime(clock + remaining)}</b><span>arrival</span></div>
        <div className={styles.etaCol}><b className={styles.green}>{remaining} min</b><span>remaining</span></div>
        <div className={styles.etaCol}><b>{milesLeft.toFixed(1)} mi</b><span>distance</span></div>
        <span className={styles.end}>End</span>
      </div>
    </div>
  );
}

function NavigationScreen(props: ScreenProps) {
  return props.view === "driving" ? <Driving {...props} /> : <Overview {...props} />;
}

const navigation: CloneDefinition = {
  Screen: NavigationScreen,
  tone: (view) => (view === "driving" ? "light" : "dark"),
  fixtures: [
    { view: "route-overview", label: "picking a route", clock: 8 * 60 + 5, duration: 3, seed: 14 },
    { view: "driving", label: "on the way in", clock: 8 * 60 + 20, duration: 26, seed: 14 },
    { view: "driving", label: "evening drive", clock: 18 * 60 + 10, duration: 34, seed: 3 },
  ],
};

export default navigation;
