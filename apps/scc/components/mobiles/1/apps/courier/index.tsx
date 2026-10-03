import { Icon } from "../../ios";
import { createRng } from "../../model/rng";
import { weekdayShort } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./courier.module.css";

const pickups = ["Kestrel Deli", "Brightwater Bakery", "Marlowe Burrito Co", "Oakline Pho", "Sable Pizza", "Tidewell Salads", "Pemberton Grill", "Northgate Noodle Bar"];
const streets = ["Atlantic Ave", "Court St", "Bedford Ave", "Smith St", "Flushing Ave", "5th Ave", "Lexington Ave", "W 23rd St", "Metropolitan Ave", "Nostrand Ave"];
const notes = ["Leave at door, ring bell.", "Meet at lobby, ask for the desk.", "Hand to customer, call on arrival.", "Gate code 4471, 2nd floor."];

function Offer({ seed, elapsed, duration }: ScreenProps) {
  const rng = createRng(seed);
  const pay = (rng.int(620, 2150) / 100).toFixed(2);
  const miles = (rng.int(8, 52) / 10).toFixed(1);
  const mins = rng.int(14, 36);
  const left = Math.max(0, Math.round(30 * (1 - elapsed / Math.max(1, duration))));
  const R = 28;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, 1 - elapsed / Math.max(1, duration));
  return (
    <div className={styles.dark}>
      <div className={styles.offerTop}>
        <span className={styles.tag}>{rng.chance(0.4) ? "Priority" : "Delivery"} · 1 order</span>
        <div className={styles.ring}>
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r={R} fill="none" stroke="rgb(255 255 255 / 14%)" strokeWidth="5" />
            <circle cx="32" cy="32" r={R} fill="none" stroke="#e8402a" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
          </svg>
          <span className={styles.ringNum}>{left}</span>
        </div>
      </div>
      <div className={styles.pay}><small>Estimated payout</small><b>${pay}</b><span>Includes ${(rng.int(150, 450) / 100).toFixed(2)} tip</span></div>
      <div className={styles.stats}>
        <div className={styles.stat}><small>Distance</small><b>{miles} mi</b></div>
        <div className={styles.stat}><small>Time</small><b>{mins} min</b></div>
        <div className={styles.stat}><small>Per mile</small><b>${(Number(pay) / Number(miles)).toFixed(2)}</b></div>
      </div>
      <div className={styles.stops}>
        <div className={styles.stop}><span className={styles.pin} /><span><b>{rng.pick(pickups)}</b><small>{rng.int(2, 9)} min away · {rng.int(100, 480)} {rng.pick(streets)}</small></span></div>
        <div className={styles.stop}><span className={styles.pin} data-end="true" /><span><b>Drop-off</b><small>{miles} mi · {rng.int(10, 390)} {rng.pick(streets)}</small></span></div>
      </div>
      <div className={styles.decline}>Decline</div>
      <div className={styles.slide}>
        <span className={styles.knob}><Icon name="chevronRight" size={30} stroke={2.6} /></span>
        <span className={styles.slideText}>Accept</span>
      </div>
    </div>
  );
}

function Navigating({ seed, elapsed, duration }: ScreenProps) {
  const rng = createRng(seed);
  const place = rng.pick(pickups);
  const street = rng.pick(streets);
  // Street grid with a few jittered offsets, drawn once per seed.
  const xs = Array.from({ length: 8 }, (_, i) => i * 56 - 30 + rng.int(-6, 6));
  const ys = Array.from({ length: 16 }, (_, i) => i * 60 - 20 + rng.int(-6, 6));
  const route: [number, number][] = [[xs[1], ys[12]], [xs[1], ys[8]], [xs[4], ys[8]], [xs[4], ys[4]], [xs[6], ys[4]]];
  const total = route.slice(1).reduce((sum, p, i) => sum + Math.abs(p[0] - route[i][0]) + Math.abs(p[1] - route[i][1]), 0);
  let remaining = Math.min(1, elapsed / Math.max(1, duration)) * total;
  let puck = route[0];
  for (let i = 1; i < route.length; i++) {
    const seg = Math.abs(route[i][0] - route[i - 1][0]) + Math.abs(route[i][1] - route[i - 1][1]);
    if (remaining <= seg || i === route.length - 1) {
      const f = Math.min(1, remaining / seg);
      puck = [route[i - 1][0] + (route[i][0] - route[i - 1][0]) * f, route[i - 1][1] + (route[i][1] - route[i - 1][1]) * f];
      break;
    }
    remaining -= seg;
  }
  const eta = Math.max(1, Math.round((duration - elapsed) * 0.9 + 1));
  const end = route[route.length - 1];
  return (
    <div className={styles.mapWrap}>
      <svg width="390" height="844" viewBox="0 0 390 844" role="img" aria-label="Route map">
        <rect width="390" height="844" fill="#e8e6df" />
        <rect x={xs[5] + 8} y={ys[9] + 8} width="90" height="110" rx="10" fill="#c9e3c0" />
        <path d={`M-10 ${ys[2]}C120 ${ys[3]} 240 ${ys[1]} 400 ${ys[2] + 30}V${ys[0] - 40}H-10Z`} fill="#b5d6f0" />
        {xs.map((x) => <line key={`x${x}`} x1={x} x2={x} y1="0" y2="844" stroke="#fff" strokeWidth="9" />)}
        {ys.map((y) => <line key={`y${y}`} x1="0" x2="390" y1={y} y2={y} stroke="#fff" strokeWidth="9" />)}
        <line x1={xs[3]} x2={xs[3]} y1="0" y2="844" stroke="#f6d27a" strokeWidth="3" />
        <polyline points={route.map((p) => p.join(",")).join(" ")} fill="none" stroke="#1a6dff" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
        <rect x={end[0] - 11} y={end[1] - 11} width="22" height="22" rx="6" fill="#e8402a" stroke="#fff" strokeWidth="3" />
        <circle cx={puck[0]} cy={puck[1]} r="13" fill="#1a6dff" opacity="0.22" />
        <circle cx={puck[0]} cy={puck[1]} r="8" fill="#1a6dff" stroke="#fff" strokeWidth="3" />
      </svg>
      <div className={styles.chipTop}>
        <span className={styles.round}><Icon name="close" size={22} stroke={2.4} /></span>
        <span className={styles.eta}>{eta} min</span>
        <span className={styles.round}><Icon name="arrow" size={22} /></span>
      </div>
      <div className={styles.card}>
        <div className={styles.step}>Step 1 of 2 · Pick up</div>
        <div className={styles.place}>{place}</div>
        <div className={styles.addr}>{rng.int(100, 480)} {street} · Order #{rng.int(1000, 9999)}</div>
        <div className={styles.note}>{rng.pick(notes)}</div>
        <div className={styles.go}>Arrived at store</div>
      </div>
    </div>
  );
}

function Earnings({ seed, clock, weekday }: ScreenProps) {
  const rng = createRng(seed);
  const hours = Math.max(0.5, (clock - 8 * 60) / 60);
  const rate = rng.int(1900, 2800) / 100;
  const today = rate * hours;
  const trips = Math.max(1, Math.round(hours * rng.range(1.4, 2.2)));
  const week = weekdayShort.map((_, i) => (i === weekday ? today : i < weekday ? rng.int(95, 210) : 0));
  const max = Math.max(...week, 100);
  const total = week.reduce((a, b) => a + b, 0);
  return (
    <div className={styles.earn}>
      <div className={styles.earnHead}>
        <div className={styles.navRow}><span>Today</span><Icon name="gear" size={22} /></div>
      </div>
      <div className={styles.big}><small>Earned today</small><b>${today.toFixed(2)}</b></div>
      <div className={styles.tiles}>
        <div className={styles.tile}><small>Trips</small><b>{trips}</b></div>
        <div className={styles.tile}><small>Online</small><b>{Math.floor(hours)}h {Math.round((hours % 1) * 60)}m</b></div>
        <div className={styles.tile}><small>Per hour</small><b>${rate.toFixed(0)}</b></div>
      </div>
      <div className={styles.week}>
        <div className={styles.weekTitle}>This week<small>${total.toFixed(0)}</small></div>
        <div className={styles.bars}>
          {weekdayShort.map((name, i) => (
            <div key={name} className={styles.barCol} data-today={i === weekday}>
              {week[i] > 0 && <b>${Math.round(week[i])}</b>}
              <span style={{ height: `${Math.max(2, (week[i] / max) * 120)}px` }} />
              {name}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.cash}><span>Cash out</span><span>${(total * 0.6).toFixed(2)} available</span></div>
    </div>
  );
}

export function CourierScreen(props: ScreenProps) {
  if (props.view === "navigating") return <Navigating {...props} />;
  if (props.view === "earnings") return <Earnings {...props} />;
  return <Offer {...props} />;
}

const courier: CloneDefinition = {
  Screen: CourierScreen,
  tone: (view) => (view === "earnings" ? "dark" : view === "navigating" ? "dark" : "light"),
  fixtures: [
    { view: "job-offer", label: "lunch rush offer", seed: 21, clock: 12 * 60 + 8, duration: 1 },
    { view: "navigating", label: "heading to pickup", seed: 6, clock: 12 * 60 + 15, duration: 8 },
    { view: "earnings", label: "mid-shift check", seed: 33, clock: 14 * 60 + 40, duration: 3 },
  ],
};

export default courier;
