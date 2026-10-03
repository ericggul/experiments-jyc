import { Icon, Storyboard, ios, type Panel, type Session } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import { createFlow } from "../navigation/session";
import type { CloneDefinition } from "../types";
import styles from "./weather.module.css";

type Sky = "clear" | "partly" | "cloudy" | "rain";
const skyLabel: Record<Sky, string> = { clear: "Clear", partly: "Partly Cloudy", cloudy: "Mostly Cloudy", rain: "Light Rain" };
const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Saved places around the city: [name, temperature offset in °F, wetter/drier bias]. */
const cityPool = [
  ["New York", 0, 0], ["Brooklyn", -1, 0], ["Queens", 1, 1], ["Hoboken", 0, 1], ["Jersey City", 2, 0], ["Newark", 3, 1],
  ["Yonkers", -2, 0], ["Stamford", -3, 1], ["Long Beach", -1, 2], ["White Plains", -3, 0], ["Staten Island", 1, 1], ["Montclair", -2, 1],
] as const;
const notes = [
  "Conditions will stay similar through the evening.", "Wind gusts up to 18 mph this afternoon.", "Clearing skies expected after midnight.",
  "Mild for the season, cooling after sunset.", "Humid, with haze lingering into the evening.", "Breezy near the water through tonight.",
] as const;

const isNight = (hour: number) => hour < 6 || hour >= 19;

type Backdrop = "night" | "dawn" | "dusk" | "clear" | "cloudy" | "rain";
function backdrop(sky: Sky, minute: number): Backdrop {
  const hour = minute / 60;
  if (hour < 5 || hour >= 20) return "night";
  if (hour < 7.5) return "dawn";
  if (hour >= 17.5) return "dusk";
  return sky === "rain" ? "rain" : sky === "cloudy" ? "cloudy" : "clear";
}

/** Small weather glyph: sun, moon, cloud, rain. */
function Wx({ sky, night, size = 28 }: { sky: Sky; night: boolean; size?: number }) {
  const cloud = <path d="M9 24h15a5 5 0 0 0 .8-9.9A7.5 7.5 0 0 0 10.4 12 6 6 0 0 0 9 24z" fill="#f4f6f9" />;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {(sky === "clear" || sky === "partly") &&
        (night ? (
          <path d="M22 18.5A8.5 8.5 0 0 1 12.5 8a8.5 8.5 0 1 0 9.5 10.5z" fill="#e8e6f6" transform={sky === "partly" ? "translate(-3 -3)" : undefined} />
        ) : (
          <g transform={sky === "partly" ? "translate(-4 -5)" : undefined}>
            <circle cx="16" cy="16" r="6.5" fill="#ffd23c" />
            <path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" stroke="#ffd23c" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
      {sky !== "clear" && cloud}
      {sky === "cloudy" && <path d="M9 24h15a5 5 0 0 0 .8-9.9A7.5 7.5 0 0 0 10.4 12 6 6 0 0 0 9 24z" fill="#c8cfd9" opacity="0.55" />}
      {sky === "rain" && <path d="M12 26l-1.2 3M17 26l-1.2 3M22 26l-1.2 3" stroke="#7fc1ff" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}


type Forecast = ReturnType<typeof forecast>;

function forecast(seed: number, city: number, clock: number, weekday: number) {
  const [name, offset, wet] = cityPool[city % cityPool.length];
  const rng = createRng(hash(seed, name, "wx"));
  const sky0 = rng.weighted<Sky>([["clear", 3], ["partly", 3], ["cloudy", 2 + wet], ["rain", 1 + wet]]);
  const mean = rng.range(55, 66) + offset;
  const swing = rng.range(7, 11);
  const rainStart = rng.int(13, 20);
  const temp = (hour: number) => mean + swing * Math.sin(((hour - 9) / 24) * Math.PI * 2);
  const hours = Array.from({ length: 8 }, (_, i) => {
    const absolute = Math.floor(clock / 60) + i;
    const hour = absolute % 24;
    const rainy = sky0 === "rain" || (sky0 === "cloudy" && hour >= rainStart && hour < rainStart + 4);
    const dry: Sky = sky0 === "rain" ? "cloudy" : sky0;
    return {
      id: `h${i}`,
      hour,
      temp: Math.round(temp(hour) + rng.range(-1.2, 1.2)),
      sky: (rainy ? "rain" : dry) as Sky,
      precip: rainy ? rng.int(40, 90) : sky0 === "cloudy" ? rng.int(5, 25) : rng.int(0, 10),
      wind: rng.int(5, 17),
    };
  });
  const high = Math.round(mean + swing);
  const low = Math.round(mean - swing);
  const days = Array.from({ length: 10 }, (_, i) => {
    const hi = i === 0 ? high : high + rng.int(-7, 5);
    const sky = i === 0 ? sky0 : rng.weighted<Sky>([["clear", 3], ["partly", 3], ["cloudy", 2], ["rain", 2 + wet]]);
    return { id: `d${i}`, name: i === 0 ? "Today" : dayNames[(weekday + i) % 7], hi, lo: i === 0 ? low : Math.min(hi - 6, low + rng.int(-5, 3)), sky, precip: sky === "rain" ? rng.int(40, 80) : 0 };
  });
  const tiles: readonly (readonly [string, string, string])[] = [
    ["UV INDEX", String(rng.int(1, 8)), rng.pick(["Low", "Moderate", "High"])],
    ["WIND", `${rng.int(4, 18)} mph`, rng.pick(["NW", "SW", "E", "NE", "S"])],
    ["HUMIDITY", `${rng.int(38, 88)}%`, `Dew point ${rng.int(38, 64)}°`],
    ["FEELS LIKE", `${Math.round(temp(clock / 60)) + rng.int(-3, 2)}°`, rng.pick(["Similar to actual", "Wind makes it cooler", "Humidity adds warmth"])],
  ];
  return { name, sky: sky0, hours, days, high, low, tiles, now: Math.round(temp(clock / 60) + rng.range(-1, 1)), note: notes[rng.int(0, notes.length - 1)], rainHour: hours.find((h) => h.sky === "rain")?.hour };
}

const hourLabel = (h: number) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`);

type Kind = "today" | "hourly" | "ten" | "radar" | "list";
type Spec = { kind: Kind; slot: number };

/** The scripted visit: skim a city, hourly, 10-day, radar, switch city. */
function plan({ seed, duration, view }: ScreenProps) {
  const total = Math.max(4, duration);
  const rng = createRng(hash(seed, "weather-plan"));
  const start = rng.int(0, cityPool.length - 1);
  const stride = rng.pick([5, 7, 11]);
  const cities = [start, (start + stride) % cityPool.length, (start + stride * 2) % cityPool.length];
  const specs: Record<string, Spec> = {};
  const flow = createFlow(total);
  const dwell = () => rng.range(1.9, 2.6);
  const go = (kind: Kind, slot: number, options: Parameters<typeof flow.go>[2] = {}) => {
    const id = kind === "radar" || kind === "list" ? kind : `${kind}-${slot}`;
    specs[id] = { kind, slot };
    flow.go(id, dwell(), options);
  };
  const entry: Kind = view === "hourly" ? "hourly" : "today";
  let cycle = 0;
  while (flow.open) {
    const slot = cycle % 2;
    const back = cycle === 0 ? { enter: "cut" as const } : { enter: "dismiss" as const };
    if (entry === "hourly" && cycle === 0) {
      go("hourly", slot, { scroll: 140, flicks: 2 });
      go("today", slot, { enter: "pop", scroll: 120, tap: { x: 28, y: 70 } });
    } else {
      go("today", slot, { ...back, scroll: 180, flicks: 2 });
      go("hourly", slot, { enter: "push", scroll: 160, flicks: 2, tap: { x: 195, y: 330 } });
      go("today", slot, { enter: "pop", scroll: 40, tap: { x: 40, y: 70 } });
    }
    go("ten", slot, { enter: "push", scroll: 120, flicks: 2, tap: { x: 195, y: 560 } });
    go("radar", slot, { enter: "push", tap: { x: 360, y: 790 } });
    go("list", slot, { enter: "sheet", scroll: 90, tap: { x: 345, y: 790 } });
    cycle += 1;
  }
  return { total, seed, cities, specs, shots: flow.shots };
}
type Plan = ReturnType<typeof plan>;

function Head({ f, big = true }: { f: Forecast; big?: boolean }) {
  return (
    <div className={big ? styles.head : styles.headSmall}>
      <div className={styles.city}>{f.name}</div>
      {big && <div className={styles.temp}>{f.now}°</div>}
      <div className={styles.cond}>{big ? skyLabel[f.sky] : `${f.now}° · ${skyLabel[f.sky]}`}</div>
      {big && <div className={styles.hl}>H:{f.high}°  L:{f.low}°</div>}
    </div>
  );
}

function Dots({ active }: { active: number }) {
  return (
    <div className={styles.toolbar}>
      <Icon name="pin" size={22} stroke={2} />
      <span className={styles.dots}>
        {[0, 1, 2].map((i) => <i key={i} data-on={i === active} />)}
      </span>
      <Icon name="filter" size={22} stroke={2} />
    </div>
  );
}

function Back({ title }: { title: string }) {
  return <header className={styles.bar}><Icon name="chevronLeft" size={26} stroke={2.4} /><b>{title}</b></header>;
}

function buildPanel(spec: Spec, p: Plan, props: ScreenProps): Panel {
  const city = p.cities[spec.slot % p.cities.length];
  const f = forecast(p.seed, city, props.clock, props.weekday);
  const tone = backdrop(f.sky, props.clock);
  const className = `${styles.sky} ${styles[tone]} ${ios.dark}`;
  if (spec.kind === "today") {
    return {
      className,
      body: (
        <div className={styles.page}>
          <Head f={f} />
          <div className={styles.card}>
            <div className={styles.cardTitle}>{f.rainHour !== undefined ? `Rain expected around ${hourLabel(f.rainHour)}.` : f.note}</div>
            <div className={styles.strip}>
              {f.hours.slice(0, 5).map((h, i) => (
                <div key={h.id} className={styles.hour}>
                  <span>{i === 0 ? "Now" : hourLabel(h.hour).replace(" ", "")}</span>
                  <Wx sky={h.sky} night={isNight(h.hour)} />
                  <b>{h.temp}°</b>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.tiles}>
            {f.tiles.map(([label, value, note]) => (
              <div key={label} className={styles.tile}><span>{label}</span><b>{value}</b><small>{note}</small></div>
            ))}
          </div>
        </div>
      ),
      chrome: <Dots active={spec.slot} />,
    };
  }
  if (spec.kind === "hourly") {
    const peak = f.hours.reduce((a, b) => (b.precip > a.precip ? b : a));
    return {
      className,
      top: 0,
      body: (
        <div className={styles.page}>
          <Head f={f} big={false} />
          <div className={styles.card}>
            <div className={styles.cardTitle}>PRECIPITATION</div>
            <div className={styles.bigNote}>{peak.precip >= 40 ? `${peak.precip}% around ${hourLabel(peak.hour)}` : "Little chance of rain"}</div>
            <svg className={styles.chart} width="342" height="70" viewBox="0 0 342 70" aria-hidden="true">
              <path d={f.hours.map((h, i) => `M${i * 38 + 12} 66v${-Math.max(2, h.precip * 0.6)}`).join("")} stroke="#7fc1ff" strokeWidth="22" strokeLinecap="round" opacity="0.8" />
            </svg>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>HOURLY FORECAST</div>
            {f.hours.map((h, i) => (
              <div key={h.id} className={styles.hrow}>
                <span className={styles.hrTime}>{i === 0 ? "Now" : hourLabel(h.hour)}</span>
                <Wx sky={h.sky} night={isNight(h.hour)} size={24} />
                <span className={styles.hrRain}>{h.precip}%</span>
                <span className={styles.hrWind}>{h.wind} mph</span>
                <b className={styles.hrTemp}>{h.temp}°</b>
              </div>
            ))}
          </div>
        </div>
      ),
      chrome: <Back title={f.name} />,
    };
  }
  if (spec.kind === "ten") {
    const minLo = Math.min(...f.days.map((d) => d.lo));
    const maxHi = Math.max(...f.days.map((d) => d.hi));
    return {
      className,
      body: (
        <div className={styles.page}>
          <Head f={f} big={false} />
          <div className={styles.card}>
            <div className={styles.cardTitle}>10-DAY FORECAST</div>
            {f.days.map((d) => (
              <div key={d.id} className={styles.day}>
                <span>{d.name}</span>
                <span className={styles.dayIcon}><Wx sky={d.sky} night={false} size={22} />{d.precip > 0 && <small>{d.precip}%</small>}</span>
                <span className={styles.lo}>{d.lo}°</span>
                <span className={styles.range}>
                  <i style={{ left: `${((d.lo - minLo) / (maxHi - minLo)) * 100}%`, width: `${((d.hi - d.lo) / (maxHi - minLo)) * 100}%` }} />
                </span>
                <span className={styles.hi}>{d.hi}°</span>
              </div>
            ))}
          </div>
        </div>
      ),
      chrome: <Back title={f.name} />,
    };
  }
  if (spec.kind === "radar") {
    return { className: `${styles.radarPanel} ${ios.dark}`, body: <RadarBase seed={p.seed + city} />, chrome: <Back title={`${f.name} radar`} /> };
  }
  const rows = p.cities.map((c) => forecast(p.seed, c, props.clock, props.weekday));
  const extra = [4].map((k) => forecast(p.seed, p.cities[0] + k, props.clock, props.weekday));
  return {
    className: styles.listPanel,
    top: 60,
    body: (
      <div className={styles.listBody}>
        {[...rows, ...extra].map((r, i) => (
          <div key={`${r.name}-${i}`} className={`${styles.place} ${styles[backdrop(r.sky, props.clock)]}`}>
            <span><b>{r.name}</b><small>{skyLabel[r.sky]}</small></span>
            <em>{r.now}°<small>H:{r.high}° L:{r.low}°</small></em>
          </div>
        ))}
      </div>
    ),
    chrome: <header className={styles.listHead}>Weather</header>,
  };
}

function RadarBase({ seed }: { seed: number }) {
  const rng = createRng(hash(seed, "radar"));
  let roads = "";
  for (let i = 0; i < 9; i += 1) roads += `M${rng.int(-20, 420)} -10L${rng.int(-20, 420)} 860`;
  for (let i = 0; i < 7; i += 1) roads += `M-10 ${rng.int(0, 860)}L400 ${rng.int(0, 860)}`;
  return (
    <svg className={styles.radarMap} width="390" height="844" viewBox="0 0 390 844" aria-hidden="true">
      <rect width="390" height="844" fill="#1b2128" />
      <path d={`M${rng.int(200, 300)} 0C${rng.int(140, 360)} 200 ${rng.int(120, 340)} 420 ${rng.int(180, 330)} 844H390V0z`} fill="#0e2a40" />
      <path d={roads} stroke="#2c333c" strokeWidth="2" fill="none" />
      <circle cx="195" cy="420" r="6" fill="#fff" stroke="#2f7fe0" strokeWidth="3" />
    </svg>
  );
}

/** Rain cells drift across the radar while the loop plays. */
function RadarOverlay({ p, elapsed, clock }: { p: Plan; elapsed: number; clock: number }) {
  const rng = createRng(hash(p.seed, "cells"));
  const cells = Array.from({ length: 4 }, (_, i) => ({ id: `cell-${i}`, x: rng.range(40, 350), y: rng.range(200, 640), r: rng.range(50, 100), vx: rng.range(-9, 9), vy: rng.range(-4, 12) }));
  const phase = elapsed % 12;
  return (
    <div className={styles.radarLive}>
      <svg width="390" height="844" viewBox="0 0 390 844" aria-hidden="true">
        {cells.map((c) => (
          <g key={c.id} transform={`translate(${c.x + c.vx * phase} ${c.y + c.vy * phase})`}>
            <ellipse rx={c.r} ry={c.r * 0.7} fill="#2fa4ff" opacity="0.38" />
            <ellipse rx={c.r * 0.6} ry={c.r * 0.4} fill="#37d17a" opacity="0.55" />
            <ellipse rx={c.r * 0.25} ry={c.r * 0.18} fill="#ffd23c" opacity="0.8" />
          </g>
        ))}
      </svg>
      <div className={styles.radarTime}><b>{formatTime(clock)}</b><i style={{ width: `${(phase / 12) * 100}%` }} /></div>
    </div>
  );
}

function WeatherScreen(props: ScreenProps) {
  const p = plan(props);
  const build = (): Session => ({
    duration: p.total,
    shots: p.shots,
    panels: Object.fromEntries(Object.entries(p.specs).map(([id, spec]) => [id, buildPanel(spec, p, props)])),
  });
  return (
    <div className={styles.screen}>
      <Storyboard id={`${props.view}:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={build} live={(panel) => (panel === "radar" ? <RadarOverlay p={p} elapsed={props.elapsed} clock={props.clock} /> : null)} />
    </div>
  );
}

const weather: CloneDefinition = {
  Screen: WeatherScreen,
  tone: () => "light",
  fixtures: [
    { view: "today", label: "morning check", clock: 6 * 60 + 40, duration: 16, seed: 11 },
    { view: "today", label: "grey afternoon", clock: 15 * 60 + 5, duration: 30, seed: 4 },
    { view: "hourly", label: "will it rain", clock: 8 * 60 + 15, duration: 22, seed: 23 },
  ],
};

export default weather;
