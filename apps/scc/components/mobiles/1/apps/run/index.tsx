import { Icon, ios } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatDate, formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import { MapSvg, RouteLine, Upright, makeMap, makeRoute, pointAt, slice } from "../navigation/map";
import type { CloneDefinition } from "../types";
import styles from "./run.module.css";

const ORANGE = "#ff6a1f";
const MAP_H = 380;

const pad = (n: number) => String(n).padStart(2, "0");
const clockTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};
const paceText = (secPerMile: number) => `${Math.floor(secPerMile / 60)}'${pad(Math.round(secPerMile % 60) % 60)}"`;

function runModel(props: ScreenProps) {
  const rng = createRng(props.seed ^ 0x2a11);
  const pace = rng.range(8 * 60 + 10, 10 * 60 + 20); // seconds per mile
  const startSec = rng.int(0, 59);
  const dur = Math.max(1, props.duration);
  return { pace, startSec, rng, dur };
}

function Active(props: ScreenProps) {
  const m = runModel(props);
  const elapsedSec = Math.max(0, props.elapsed) * 60 + m.startSec;
  const distance = elapsedSec / m.pace;
  const progress = Math.min(1, props.elapsed / m.dur);
  const map = makeMap(props.seed, 390, MAP_H, { angle: -22 });
  const route = makeRoute(map, 1);
  const here = pointAt(route, progress);
  const hr = Math.round(150 + 9 * Math.sin(props.elapsed / 2.3) + createRng(hash(props.seed, props.elapsed)).range(-3, 3));
  const zone = hr >= 165 ? 4 : hr >= 150 ? 3 : 2;
  const instant = m.pace + createRng(hash(props.seed, "p", props.elapsed)).range(-14, 14);
  return (
    <div className={`${styles.run} ${ios.dark}`}>
      <div className={styles.map}>
        <MapSvg map={map} dark>
          <RouteLine pts={route} color="#3a2a22" casing="#14171b" width={4} />
          <RouteLine pts={slice(route, 0, progress)} color={ORANGE} casing="#14171b" width={4.5} />
          <Upright map={map} at={route[0]}>
            <circle r="5" fill="#30d158" stroke="#fff" strokeWidth="1.5" />
          </Upright>
          <Upright map={map} at={here}>
            <circle r="11" fill="rgb(255 106 31 / 28%)" />
            <circle r="5.5" fill={ORANGE} stroke="#fff" strokeWidth="2" />
          </Upright>
        </MapSvg>
        <div className={styles.fade} />
      </div>
      <div className={styles.panel}>
        <div className={styles.kicker}>Outdoor Run</div>
        <div className={styles.time}>{clockTime(elapsedSec)}</div>
        <div className={styles.grid}>
          <div><b>{distance.toFixed(2)}</b><span>Miles</span></div>
          <div><b>{paceText(instant)}</b><span>Pace /mi</span></div>
          <div><b className={styles.hr}>{hr}<Icon name="heart" size={16} filled stroke={0} style={{ color: "#ff375f" }} /></b><span>Heart Rate · Zone {zone}</span></div>
          <div><b>{paceText(elapsedSec / Math.max(0.05, distance))}</b><span>Avg Pace</span></div>
        </div>
        <div className={styles.secondary}>
          <div><b>{Math.round(distance * 98 + 20)}</b><span>Active Cal</span></div>
          <div><b>{Math.round(168 + 3 * Math.sin(props.elapsed))}</b><span>Cadence</span></div>
          <div><b>{Math.round(distance * 46)}</b><span>Elev. ft</span></div>
        </div>
        <div className={styles.controls}>
          <span className={styles.ctl}><Icon name="close" size={22} stroke={2.4} /></span>
          <span className={`${styles.ctl} ${styles.pause}`}><svg width="28" height="28" viewBox="0 0 28 28"><rect x="6" y="5" width="6" height="18" rx="2" fill="#000" /><rect x="16" y="5" width="6" height="18" rx="2" fill="#000" /></svg></span>
          <span className={styles.ctl}><Icon name="lock" size={22} stroke={2.2} /></span>
        </div>
      </div>
    </div>
  );
}

function Summary(props: ScreenProps) {
  const m = runModel(props);
  const total = Math.max(1, props.duration) * 60 + m.startSec;
  const distance = total / m.pace;
  const rng = m.rng;
  const full = Math.floor(distance);
  const splits = Array.from({ length: full + (distance - full > 0.1 ? 1 : 0) }, (_, i) => {
    const miles = i < full ? 1 : distance - full;
    return { key: i + 1, miles, pace: m.pace + rng.range(-28, 28) + (i === 0 ? 14 : 0) };
  });
  const fastest = Math.min(...splits.map((s) => s.pace));
  const slowest = Math.max(...splits.map((s) => s.pace));
  const map = makeMap(props.seed, 390, 250, { angle: -22 });
  const route = makeRoute(map, 1);
  const startMin = props.clock - props.elapsed;
  const avgHr = Math.round(rng.range(144, 158));
  const stats: readonly (readonly [string, string])[] = [
    ["Workout Time", clockTime(total)],
    ["Distance", `${distance.toFixed(2)} MI`],
    ["Avg. Pace", `${paceText(m.pace)} /MI`],
    ["Active Calories", `${Math.round(distance * 98 + 20)} CAL`],
    ["Avg. Heart Rate", `${avgHr} BPM`],
    ["Elevation Gain", `${Math.round(distance * 46)} FT`],
  ];
  return (
    <div className={`${styles.run} ${ios.dark}`}>
      <div className={styles.summaryMap}>
        <MapSvg map={{ ...map, h: 250 }} dark>
          <RouteLine pts={route} color={ORANGE} casing="#14171b" width={4.5} />
          <Upright map={map} at={route[0]}><circle r="5" fill="#30d158" stroke="#fff" strokeWidth="1.5" /></Upright>
          <Upright map={map} at={route[route.length - 1]}><circle r="5" fill="#ff453a" stroke="#fff" strokeWidth="1.5" /></Upright>
        </MapSvg>
        <div className={styles.fade} />
      </div>
      <div className={styles.summary}>
        <div className={styles.summaryTitle}>
          <div className={styles.kicker}>{formatDate(props.day)}</div>
          <h1>Outdoor Run</h1>
          <div className={styles.where}>{props.owner.home} · {formatTime(startMin)}–{formatTime(props.clock)}</div>
        </div>
        <div className={styles.stats}>
          {stats.map(([label, value]) => (
            <div key={label}><span>{label}</span><b>{value}</b></div>
          ))}
        </div>
        <div className={styles.splits}>
          <div className={styles.splitHead}><span>Mile</span><span>Pace</span><span /></div>
          {splits.slice(0, 7).map((s) => (
            <div key={s.key} className={styles.split}>
              <span>{s.miles < 1 ? s.miles.toFixed(2) : s.key}</span>
              <span className={s.pace === fastest ? styles.fast : undefined}>{paceText(s.pace)}</span>
              <span className={styles.bar}><i style={{ width: `${40 + (1 - (s.pace - fastest) / Math.max(1, slowest - fastest)) * 60}%`, background: s.pace === fastest ? "#30d158" : ORANGE }} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RunScreen(props: ScreenProps) {
  return props.view === "summary" ? <Summary {...props} /> : <Active {...props} />;
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
