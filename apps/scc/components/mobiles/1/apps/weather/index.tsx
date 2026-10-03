import { ios } from "../../ios";
import { createRng } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./weather.module.css";

type Sky = "clear" | "partly" | "cloudy" | "rain";
const skyLabel: Record<Sky, string> = { clear: "Clear", partly: "Partly Cloudy", cloudy: "Mostly Cloudy", rain: "Light Rain" };
const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const isNight = (hour: number) => hour < 6 || hour >= 19;

function gradient(sky: Sky, minute: number): string {
  const hour = minute / 60;
  if (hour < 5 || hour >= 20) return sky === "clear" ? "linear-gradient(180deg,#0a1230 0%,#1b2a5a 60%,#33467f 100%)" : "linear-gradient(180deg,#141a2a 0%,#272f45 60%,#3a4560 100%)";
  if (hour < 7.5) return "linear-gradient(180deg,#3a4f8f 0%,#8c7fb0 55%,#f0a98a 100%)";
  if (hour >= 17.5) return "linear-gradient(180deg,#2d4f94 0%,#8a78a8 55%,#f29a6b 100%)";
  if (sky === "rain") return "linear-gradient(180deg,#59636f 0%,#75808c 60%,#8b95a0 100%)";
  if (sky === "cloudy") return "linear-gradient(180deg,#5f7a99 0%,#8aa0b8 60%,#a5b6c8 100%)";
  return "linear-gradient(180deg,#2a74d4 0%,#4f98e6 55%,#8cc4f3 100%)";
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

function forecast(props: ScreenProps) {
  const rng = createRng(props.seed ^ 0x77ea);
  const base: Sky = rng.weighted<Sky>([["clear", 3], ["partly", 3], ["cloudy", 2], ["rain", 2]]);
  const mean = rng.range(55, 66);
  const swing = rng.range(7, 11);
  const rainStart = rng.int(13, 20);
  const temp = (hour: number) => mean + swing * Math.sin(((hour - 9) / 24) * Math.PI * 2);
  const hours = Array.from({ length: 24 }, (_, i) => {
    const absolute = Math.floor(props.clock / 60) + i;
    const hour = absolute % 24;
    const noise = rng.range(-1.2, 1.2);
    const rainy = base === "rain" || (base === "cloudy" && hour >= rainStart && hour < rainStart + 4);
    const dry: Sky = base === "rain" ? "cloudy" : base;
    const sky: Sky = rainy ? "rain" : dry;
    const precip = rainy ? rng.int(40, 90) : base === "cloudy" ? rng.int(5, 25) : rng.int(0, 10);
    return { key: absolute, hour, temp: Math.round(temp(hour) + noise), sky, precip, wind: rng.int(5, 15) };
  });
  const high = Math.round(mean + swing);
  const low = Math.round(mean - swing);
  const days = Array.from({ length: 10 }, (_, i) => {
    const hi = high + rng.int(-6, 4);
    const lo = Math.min(hi - 6, low + rng.int(-5, 3));
    const sky = i === 0 ? base : rng.weighted<Sky>([["clear", 3], ["partly", 3], ["cloudy", 2], ["rain", 2]]);
    return { key: i, name: i === 0 ? "Today" : dayNames[(props.weekday + i) % 7], hi: i === 0 ? high : hi, lo: i === 0 ? low : lo, sky, precip: sky === "rain" ? rng.int(40, 80) : 0 };
  });
  return { base, hours, days, now: Math.round(temp(props.clock / 60) + rng.range(-1, 1)), high, low };
}

const hourLabel = (h: number) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`);

function Today(props: ScreenProps) {
  const f = forecast(props);
  const minLo = Math.min(...f.days.map((d) => d.lo));
  const maxHi = Math.max(...f.days.map((d) => d.hi));
  const night = isNight(props.clock / 60);
  return (
    <div className={`${styles.sky} ${ios.dark}`} style={{ background: gradient(f.base, props.clock) }}>
      <div className={styles.head}>
        <div className={styles.city}>New York</div>
        <div className={styles.temp}>{f.now}°</div>
        <div className={styles.cond}>{skyLabel[f.base]}</div>
        <div className={styles.hl}>H:{f.high}°  L:{f.low}°</div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          {f.base === "rain" ? "Light rain continuing through the afternoon." : f.hours.some((h) => h.sky === "rain") ? `Rain expected around ${hourLabel(f.hours.find((h) => h.sky === "rain")!.hour)}.` : "Conditions will stay similar through the evening."}
        </div>
        <div className={styles.strip}>
          {f.hours.slice(0, 7).map((h, i) => (
            <div key={h.key} className={styles.hour}>
              <span>{i === 0 ? "Now" : hourLabel(h.hour).replace(" ", "")}</span>
              <Wx sky={h.sky} night={isNight(h.hour)} />
              <b>{h.temp}°</b>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>10-DAY FORECAST</div>
        {f.days.map((d) => (
          <div key={d.key} className={styles.day}>
            <span className={styles.dayName}>{d.name}</span>
            <span className={styles.dayIcon}>
              <Wx sky={d.sky} night={night && d.key === 0} size={22} />
              {d.precip > 0 && <small>{d.precip}%</small>}
            </span>
            <span className={styles.lo}>{d.lo}°</span>
            <span className={styles.range}>
              <i style={{ left: `${((d.lo - minLo) / (maxHi - minLo)) * 100}%`, width: `${((d.hi - d.lo) / (maxHi - minLo)) * 100}%` }} />
            </span>
            <span className={styles.hi}>{d.hi}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hourly(props: ScreenProps) {
  const f = forecast(props);
  const peak = f.hours.reduce((a, b) => (b.precip > a.precip ? b : a));
  const w = 342;
  const bar = w / 24;
  return (
    <div className={`${styles.sky} ${ios.dark}`} style={{ background: gradient(f.base === "clear" ? "cloudy" : f.base, props.clock) }}>
      <div className={styles.headSmall}>
        <div className={styles.city}>New York</div>
        <div className={styles.cond}>{f.now}° · {skyLabel[f.base]}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>PRECIPITATION · NEXT 24 HOURS</div>
        <div className={styles.bigNote}>{peak.precip >= 40 ? `${peak.precip}% chance around ${hourLabel(peak.hour)}` : "Little chance of rain today"}</div>
        <svg className={styles.chart} width={w} height="104" viewBox={`0 0 ${w} 104`} aria-hidden="true">
          {[0, 50, 100].map((p) => (
            <g key={p}>
              <line x1="0" x2={w} y1={84 - p * 0.8} y2={84 - p * 0.8} stroke="rgb(255 255 255 / 22%)" strokeWidth="0.5" />
              <text x={w} y={82 - p * 0.8} textAnchor="end" fontSize="9" fill="rgb(255 255 255 / 65%)">{p}%</text>
            </g>
          ))}
          {f.hours.map((h, i) => (
            <rect key={h.key} x={i * bar + 2} y={84 - Math.max(2, h.precip * 0.8)} width={bar - 4} height={Math.max(2, h.precip * 0.8)} rx="2" fill={h.precip >= 40 ? "#7fc1ff" : "rgb(255 255 255 / 45%)"} />
          ))}
          {[0, 6, 12, 18].map((i) => (
            <text key={i} x={i * bar} y="99" fontSize="10" fill="rgb(255 255 255 / 75%)">{i === 0 ? "Now" : hourLabel(f.hours[i].hour).replace(" ", "")}</text>
          ))}
        </svg>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>HOURLY FORECAST</div>
        {f.hours.slice(0, 9).map((h, i) => (
          <div key={h.key} className={styles.hrow}>
            <span className={styles.hrTime}>{i === 0 ? "Now" : hourLabel(h.hour)}</span>
            <Wx sky={h.sky} night={isNight(h.hour)} size={24} />
            <span className={styles.hrRain}>{h.precip}%</span>
            <span className={styles.hrWind}>{h.wind} mph</span>
            <b className={styles.hrTemp}>{h.temp}°</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeatherScreen(props: ScreenProps) {
  return props.view === "hourly" ? <Hourly {...props} /> : <Today {...props} />;
}

const weather: CloneDefinition = {
  Screen: WeatherScreen,
  tone: () => "light",
  fixtures: [
    { view: "today", label: "morning check", clock: 6 * 60 + 40, duration: 2, seed: 11 },
    { view: "today", label: "grey afternoon", clock: 15 * 60 + 5, duration: 2, seed: 4 },
    { view: "hourly", label: "will it rain", clock: 8 * 60 + 15, duration: 2, seed: 23 },
  ],
};

export default weather;
