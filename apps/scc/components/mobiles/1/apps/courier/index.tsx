import { Icon, Storyboard, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash, type Rng } from "../../model/rng";
import { formatTime, weekdayShort } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { along, instruction, makeGeo, makeJob, tripsFor, type Area, type Geo, type Job, type Trip } from "./data";
import styles from "./courier.module.css";

/** Long scenes play as consecutive sessions of this many simulated minutes. */
const CHUNK = 24;
/** Estimated DOM nodes per fixture render stay under this (bench limit 700). */
const BUDGET = 600;
/** Shots never come closer than this, so storyboard normalisation keeps their times. */
const MIN_GAP = 1.4;

type Target = "store" | "drop";
type Spec =
  | { kind: "nav"; job: Job; geo: Geo; f: number; target: Target }
  | { kind: "arrive"; job: Job; geo: Geo; target: Target }
  | { kind: "checklist"; job: Job; ticked: number }
  | { kind: "handoff"; job: Job; photo: boolean }
  | { kind: "delivered"; job: Job; today: number; trips: number }
  | { kind: "waiting"; geo: Geo; area: Area }
  | { kind: "offer"; job: Job }
  | { kind: "reason" }
  | { kind: "accepted"; job: Job; by: number }
  | { kind: "today"; trips: Trip[]; clock: number }
  | { kind: "trip"; trip: Trip; geo: Geo }
  | { kind: "week"; week: number[]; weekday: number }
  | { kind: "payout"; amount: number; sent: boolean };

const cost: Record<Spec["kind"], number> = {
  nav: 30, arrive: 30, checklist: 32, handoff: 26, delivered: 22, waiting: 26, offer: 36, reason: 20, accepted: 28,
  today: 90, trip: 40, week: 56, payout: 22,
};

/** A live value and the panels that show it: map panels of a leg (prefix) or one offer (exact id). */
type Live = { kind: "eta" | "offer"; start: number; end: number; panel: string };
type Plan = { duration: number; shots: Shot[]; specs: Record<string, Spec>; live: Live[] };

type Ctx = { seed: number; part: number; duration: number; clock: number; weekday: number };

function planner(duration: number) {
  const plan: Plan = { duration, shots: [], specs: {}, live: [] };
  let spent = 0;
  const p = {
    plan,
    t: 0,
    afford: (n: number) => spent + n <= BUDGET,
    open: () => p.t < duration - 0.5,
    /** Show a panel (adding it once) and hold it for `dt` simulated minutes. */
    go(id: string, spec: Spec | undefined, dt: number, extra: Omit<Shot, "panel" | "at"> = {}) {
      if (spec && !plan.specs[id]) {
        plan.specs[id] = spec;
        spent += cost[spec.kind];
      }
      plan.shots.push({ panel: id, at: p.t, ...extra, ...(plan.shots.length ? {} : { enter: "cut" as const }) });
      p.t += Math.max(MIN_GAP, dt);
    },
  };
  return p;
}
type Planner = ReturnType<typeof planner>;

/** Repeated legs: drive to the store or the customer, pick up or hand off, then the next job. */
function runLegs(p: Planner, rng: Rng, ctx: Ctx, first: { job: Job; target: Target; enter: Shot["enter"]; start: number; tap?: Shot["tap"] }) {
  let { job, target, tap } = first;
  let enter = first.enter;
  let completed = 0;
  const done = tripsFor(ctx.seed, ctx.clock);
  for (let leg = 0; p.open() && p.afford(150); leg++) {
    const geo = makeGeo(hash(ctx.seed, ctx.part, "leg", leg));
    const steps = rng.int(3, 5);
    const from = leg === 0 ? first.start : 0;
    const legStart = p.t;
    for (let k = 0; k < steps; k++) {
      const f = from + ((0.94 - from) * k) / steps;
      p.go(`nav-${leg}-${k}`, { kind: "nav", job, geo, f, target }, rng.range(1.6, 2.4), k === 0 ? { enter, ...(tap ? { tap } : {}) } : { enter: "fade" });
    }
    p.plan.live.push({ kind: "eta", start: legStart, end: p.t, panel: `nav-${leg}-` });
    p.go(`arrive-${leg}`, { kind: "arrive", job, geo, target }, rng.range(1.4, 1.9), { enter: "fade" });
    if (target === "store") {
      for (let ticked = 0; ticked <= job.items.length && p.open(); ticked++) {
        const at = ticked === 0 ? { x: 195, y: 786 } : { x: 44, y: CHECK_Y + (ticked - 1) * CHECK_ROW };
        p.go(`check-${leg}-${ticked}`, { kind: "checklist", job, ticked }, rng.range(1.4, 1.7), { enter: ticked === 0 ? "sheet" : "cut", tap: at });
      }
      target = "drop";
      enter = "dismiss";
      tap = { x: 195, y: 786 };
      continue;
    }
    p.go(`handoff-${leg}-0`, { kind: "handoff", job, photo: false }, rng.range(1.6, 2.2), { enter: "push", tap: { x: 195, y: 786 } });
    p.go(`handoff-${leg}-1`, { kind: "handoff", job, photo: true }, rng.range(1.5, 2), { enter: "cut", tap: { x: 195, y: 520 } });
    completed++;
    const today = done.reduce((sum, trip) => sum + trip.pay, 0) + job.pay;
    p.go(`delivered-${leg}`, { kind: "delivered", job, today, trips: done.length + completed }, rng.range(1.8, 2.4), { enter: "fade", tap: { x: 195, y: 786 } });
    if (!p.open()) break;
    p.go(`waiting-${leg}`, { kind: "waiting", geo, area: job.area }, rng.range(1.6, 2.4), { enter: "fade", tap: { x: 195, y: 786 } });
    if (!p.open()) break;
    job = makeJob(hash(ctx.seed, ctx.part, "next", leg));
    const offerStart = p.t;
    p.go(`offer-${leg}`, { kind: "offer", job }, rng.range(1.4, 2), { enter: "swipe-up" });
    p.plan.live.push({ kind: "offer", start: offerStart, end: p.t, panel: `offer-${leg}` });
    target = "store";
    enter = "fade";
    // The accept slide starts the next leg.
    tap = { x: 52, y: 748 };
  }
}

function navigatingPlan(ctx: Ctx): Plan {
  const p = planner(ctx.duration);
  const rng = createRng(hash(ctx.seed, ctx.part, "navigating"));
  const job = makeJob(hash(ctx.seed, ctx.part));
  const target: Target = (ctx.part === 0 ? hash(ctx.seed, "leg") : rng.int(0, 1)) % 2 ? "drop" : "store";
  runLegs(p, rng, ctx, { job, target, enter: "cut", start: ctx.part === 0 ? rng.range(0.05, 0.35) : 0 });
  return p.plan;
}

function offerPlan(ctx: Ctx): Plan {
  const p = planner(ctx.duration);
  const rng = createRng(hash(ctx.seed, ctx.part, "offers"));
  let enter: Shot["enter"] = "cut";
  for (let k = 0; p.open() && p.afford(200); k++) {
    const job = makeJob(hash(ctx.seed, ctx.part, "offer", k));
    const start = p.t;
    const tap = k === 0 ? undefined : enter === "dismiss" ? { x: 195, y: REASON_Y + rng.int(0, 3) * REASON_ROW } : { x: 195, y: 688 };
    p.go(`offer-${k}`, { kind: "offer", job }, rng.range(1.4, 2.2), { enter, ...(tap ? { tap } : {}) });
    p.plan.live.push({ kind: "offer", start, end: p.t, panel: `offer-${k}` });
    if (!p.open()) break;
    if ((k >= 1 && rng.chance(0.45)) || k >= 3) {
      p.go("accepted", { kind: "accepted", job, by: ctx.clock + p.t + job.minutes - 4 }, rng.range(1.8, 2.4), { enter: "fade", tap: { x: 52, y: 748 } });
      runLegs(p, rng, ctx, { job, target: "store", enter: "fade", start: 0, tap: { x: 195, y: 748 } });
      break;
    }
    if (rng.chance(0.4)) {
      p.go(`reason-${k}`, { kind: "reason" }, rng.range(1.4, 1.8), { enter: "sheet", tap: { x: 195, y: 688 } });
      enter = "dismiss";
    } else enter = "fade";
  }
  return p.plan;
}

function earningsPlan(ctx: Ctx): Plan {
  const p = planner(ctx.duration);
  const rng = createRng(hash(ctx.seed, ctx.part, "earnings"));
  const trips = tripsFor(ctx.seed, ctx.clock);
  const total = trips.reduce((sum, trip) => sum + trip.pay, 0);
  const wrng = createRng(hash(ctx.seed, "week"));
  const week = weekdayShort.map((_, i) => (i === ctx.weekday ? total : i < ctx.weekday ? wrng.int(95, 210) : 0));
  const maxScroll = Math.max(0, TODAY_TRIPS_Y + trips.length * TRIP_ROW + 40 - (844 - EARN_TOP));
  let scroll = 0;
  p.go("today", { kind: "today", trips, clock: ctx.clock }, rng.range(1.5, 2), { scroll: 0 });
  for (let round = 0; p.open(); round++) {
    for (let visit = 0; visit < 2 && p.open(); visit++) {
      scroll = Math.min(maxScroll, rng.int(140, 320) + visit * 120);
      p.go("today", undefined, rng.range(1.5, 2), { enter: "pop", scroll, flicks: 2 });
      const first = Math.max(0, Math.ceil((scroll - TODAY_TRIPS_Y) / TRIP_ROW));
      const index = Math.min(trips.length - 1, first + rng.int(0, 2));
      const y = EARN_TOP + TODAY_TRIPS_Y + index * TRIP_ROW + TRIP_ROW / 2 - scroll;
      const id = `trip-${index}`;
      const spec: Spec | undefined = p.plan.specs[id] || !p.afford(cost.trip) ? undefined : { kind: "trip", trip: trips[index], geo: makeGeo(hash(ctx.seed, "trip", index)) };
      if (!spec && !p.plan.specs[id]) continue;
      p.go(id, spec, rng.range(1.8, 2.4), { enter: "push", tap: { x: 195, y: Math.max(EARN_TOP + 20, Math.min(800, y)) }, scroll: rng.int(80, 220) });
    }
    if (!p.open()) break;
    p.go("today", undefined, 1.4, { enter: "pop" });
    p.go("week", p.afford(cost.week) ? { kind: "week", week, weekday: ctx.weekday } : undefined, rng.range(1.8, 2.4), { enter: "tab", tap: { x: 290, y: 122 }, scroll: rng.int(60, 160) });
    if (!p.plan.specs.week) break;
    if (round === 0 && p.afford(cost.payout * 2)) {
      const amount = Math.round(week.reduce((a, b) => a + b, 0) * 0.6 * 100) / 100;
      p.go("payout-0", { kind: "payout", amount, sent: false }, rng.range(1.5, 2), { enter: "sheet", tap: { x: 195, y: 520 } });
      p.go("payout-1", { kind: "payout", amount, sent: true }, rng.range(1.5, 2), { enter: "cut", tap: { x: 195, y: 760 } });
      p.go("week", undefined, 1.6, { enter: "dismiss", tap: { x: 195, y: 760 } });
    }
    p.go("today", undefined, 1.5, { enter: "tab", tap: { x: 100, y: 122 } });
  }
  return p.plan;
}

export function planFor(view: string, ctx: Ctx): Plan {
  if (view === "navigating") return navigatingPlan(ctx);
  if (view === "earnings") return earningsPlan(ctx);
  return offerPlan(ctx);
}

const CHECK_Y = 241;
const CHECK_ROW = 52;
const REASON_Y = 531;
const REASON_ROW = 52;

const money = (value: number) => `$${value.toFixed(2)}`;

function MapSvg({ geo, f, target, route = true, height = 844, top = 0 }: { geo: Geo; f: number; target: Target; route?: boolean; height?: number; top?: number }) {
  const { puck, rest } = along(geo, f);
  const end = geo.points[geo.points.length - 1];
  return (
    <svg width="390" height={height} viewBox={`0 ${top} 390 ${height}`} role="img" aria-label="Route map" className={height === 844 ? styles.map : styles.mapInline}>
      <rect y={top} width="390" height={height} fill="#e8e6df" />
      <rect x={geo.xs[5] + 8} y={geo.ys[9] + 8} width="90" height="110" rx="10" fill="#c9e3c0" />
      <path d={`M-10 ${geo.ys[1]}C120 ${geo.ys[2]} 240 ${geo.ys[0]} 400 ${geo.ys[1] + 30}V-40H-10Z`} fill="#b5d6f0" />
      <path d={geo.grid} fill="none" stroke="#fff" strokeWidth="9" />
      <path d={`M${geo.xs[3]} 0V844`} stroke="#f6d27a" strokeWidth="3" />
      {route && <polyline points={rest.map((pt) => pt.join(",")).join(" ")} fill="none" stroke="#1a6dff" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />}
      {route && (target === "store"
        ? <rect x={end[0] - 11} y={end[1] - 11} width="22" height="22" rx="6" fill="#e8402a" stroke="#fff" strokeWidth="3" />
        : <circle cx={end[0]} cy={end[1]} r="11" fill="#121214" stroke="#fff" strokeWidth="3" />)}
      <circle cx={puck[0]} cy={puck[1]} r="13" fill="#1a6dff" opacity="0.22" />
      <circle cx={puck[0]} cy={puck[1]} r="8" fill="#1a6dff" stroke="#fff" strokeWidth="3" />
    </svg>
  );
}

const mapButtons = (
  <div className={styles.chipTop}>
    <span className={styles.round}><Icon name="close" size={22} stroke={2.4} /></span>
    <span className={styles.round}><Icon name="arrow" size={22} /></span>
  </div>
);

function placeOf(job: Job, target: Target) {
  return target === "store" ? { name: job.store, addr: `${job.storeAddr} · Order #${job.order}` } : { name: job.customer, addr: `${job.dropAddr}, Apt ${job.apt}` };
}

function NavPanel({ spec }: { spec: Extract<Spec, { kind: "nav" | "arrive" }> }) {
  const { job, geo, target } = spec;
  const place = placeOf(job, target);
  const arrived = spec.kind === "arrive";
  const step = instruction(geo, job.area, arrived ? 1 : spec.f, target === "store" ? job.storeAddr : job.dropAddr);
  return (
    <div className={styles.mapWrap}>
      <MapSvg geo={geo} f={arrived ? 1 : spec.f} target={target} route={!arrived} />
      <div className={styles.turn} data-arrived={arrived}>
        <Icon name={arrived || step.turn === "arrive" ? "pin" : step.turn === "right" ? "chevronRight" : "chevronLeft"} size={34} stroke={2.6} />
        <span>{arrived ? <b>Arrived</b> : <b>{step.distance}</b>}{arrived ? place.name : step.turn === "arrive" ? `Destination: ${step.text}` : `Turn ${step.turn} onto ${step.text}`}</span>
      </div>
      {mapButtons}
      <div className={styles.card}>
        <div className={styles.step}>{target === "store" ? "Step 1 of 2 · Pick up" : "Step 2 of 2 · Drop off"}</div>
        <div className={styles.place}>{place.name}</div>
        <div className={styles.addr}>{place.addr}</div>
        {arrived && <div className={styles.note}>{target === "store" ? `${job.items.length} items · ask for order #${job.order}` : job.note}</div>}
        <div className={styles.go} data-dim={!arrived}>{target === "store" ? (arrived ? "Confirm pickup" : "Arrived at store") : arrived ? "Start handoff" : "Arrived"}</div>
      </div>
    </div>
  );
}

function Checklist({ job, ticked }: { job: Job; ticked: number }) {
  const done = ticked >= job.items.length;
  return (
    <div className={styles.sheetBack}>
      <div className={styles.sheetCard}>
        <span className={styles.grabber} />
        <div className={styles.sheetTitle}>Order #{job.order}<small>For {job.customer} · {job.store}</small></div>
        <div className={styles.sheetHint}>Check each item before you leave</div>
        {job.items.map((item, i) => (
          <div key={i} className={styles.check} data-on={i < ticked}>
            <span className={styles.box}>{i < ticked && <Icon name="check" size={16} stroke={3} />}</span>
            <span><b>{item.qty}×</b> {item.name}</span>
          </div>
        ))}
        <div className={styles.check} data-on={done}>
          <span className={styles.box}>{done && <Icon name="check" size={16} stroke={3} />}</span>
          <span>Bag sealed, drinks upright</span>
        </div>
        <div className={styles.go} data-dim={!done}>{done ? "Picked up" : `${ticked} of ${job.items.length} checked`}</div>
      </div>
    </div>
  );
}

function Handoff({ job, photo }: { job: Job; photo: boolean }) {
  return (
    <div className={styles.page}>
      <div className={styles.pageHead}><Icon name="chevronLeft" size={26} stroke={2.4} /><b>Drop off</b><span /></div>
      <div className={styles.pageBody}>
        <div className={styles.place}>{job.customer}</div>
        <div className={styles.addr}>{job.dropAddr}, Apt {job.apt}</div>
        <div className={styles.note}>{job.note}</div>
        <div className={styles.photo} data-taken={photo}>
          <Icon name={photo ? "check" : "camera"} size={34} stroke={2} />
          {photo ? "Photo added" : "Take a photo of the order at the door"}
        </div>
      </div>
      <div className={`${styles.go} ${styles.pageGo}`} data-dim={!photo}>Complete delivery</div>
    </div>
  );
}

function Delivered({ job, today, trips }: { job: Job; today: number; trips: number }) {
  return (
    <div className={styles.page}>
      <div className={styles.done}>
        <span className={styles.doneMark}><Icon name="check" size={46} stroke={3} /></span>
        <small>Delivered to {job.customer}</small>
        <b>+{money(job.pay)}</b>
        <span>Includes {money(job.tip)} tip</span>
      </div>
      <div className={styles.doneRows}>
        <div><span>Today</span><b>{money(today)}</b></div>
        <div><span>Trips</span><b>{trips}</b></div>
      </div>
      <div className={`${styles.go} ${styles.pageGo}`}>Done</div>
    </div>
  );
}

function Waiting({ geo, area }: { geo: Geo; area: Area }) {
  return (
    <div className={styles.mapWrap}>
      <MapSvg geo={geo} f={0.5} target="drop" route={false} />
      {mapButtons}
      <div className={styles.card}>
        <div className={styles.step}>You&rsquo;re online</div>
        <div className={styles.place}>Finding offers</div>
        <div className={styles.addr}>Busy near {area.name}. Stay close to {area.avenues[3]}.</div>
      </div>
    </div>
  );
}

function Offer({ job }: { job: Job }) {
  return (
    <div className={styles.dark}>
      <div className={styles.offerTop}>
        <span className={styles.tag}>{job.priority ? "Priority" : "Delivery"} · {job.items.length} items</span>
      </div>
      <div className={styles.pay}><small>Estimated payout</small><b>{money(job.pay)}</b><span>Includes {money(job.tip)} tip</span></div>
      <div className={styles.stats}>
        <div className={styles.stat}><small>Distance</small><b>{job.miles.toFixed(1)} mi</b></div>
        <div className={styles.stat}><small>Time</small><b>{job.minutes} min</b></div>
        <div className={styles.stat}><small>Per mile</small><b>${(job.pay / job.miles).toFixed(2)}</b></div>
      </div>
      <div className={styles.stops}>
        <div className={styles.stop}><span className={styles.pin} /><span><b>{job.store}</b><small>{Math.max(2, Math.round(job.minutes / 4))} min away · {job.storeAddr}</small></span></div>
        <div className={styles.stop}><span className={styles.pin} data-end="true" /><span><b>{job.area.name}</b><small>{job.miles.toFixed(1)} mi · {job.dropAddr}</small></span></div>
      </div>
      <div className={styles.decline}>Decline</div>
      <div className={styles.slide}>
        <span className={styles.knob}><Icon name="chevronRight" size={30} stroke={2.6} /></span>
        <span className={styles.slideText}>Accept</span>
      </div>
    </div>
  );
}

const reasons = ["Too far", "Pay too low", "Wrong direction", "Taking a break"];

function Reason() {
  return (
    <div className={`${styles.dark} ${styles.dim}`}>
      <div className={styles.reasonCard}>
        <span className={styles.grabber} />
        <div className={styles.sheetTitle}>Why are you declining?<small>Declines don&rsquo;t affect your rating</small></div>
        {reasons.map((reason, i) => <div key={i} className={styles.reason}>{reason}</div>)}
      </div>
    </div>
  );
}

function Accepted({ job, by }: { job: Job; by: number }) {
  return (
    <div className={styles.dark}>
      <div className={styles.accepted}>
        <span className={styles.doneMark}><Icon name="check" size={40} stroke={3} /></span>
        <b>Offer accepted</b>
        <small>Pick up by {formatTime(by)}</small>
      </div>
      <div className={styles.stops}>
        <div className={styles.stop}><span className={styles.pin} /><span><b>{job.store}</b><small>{job.storeAddr}</small></span></div>
        <div className={styles.stop}><span className={styles.pin} data-end="true" /><span><b>{job.customer}</b><small>{job.dropAddr}</small></span></div>
      </div>
      <div className={styles.slide}><span className={styles.slideText} style={{ paddingRight: 0 }}>Start navigation</span></div>
    </div>
  );
}

const EARN_TOP = 140;
const TODAY_TRIPS_Y = 226;
const TRIP_ROW = 62;

const earnHead = (tab: "today" | "week") => (
  <div className={styles.earnHead}>
    <div className={styles.navRow}><span>Earnings</span><Icon name="gear" size={22} /></div>
    <div className={styles.seg}><span data-on={tab === "today"}>Today</span><span data-on={tab === "week"}>This week</span></div>
  </div>
);

function Today({ trips, clock }: { trips: Trip[]; clock: number }) {
  const total = trips.reduce((sum, trip) => sum + trip.pay, 0);
  const first = trips[trips.length - 1].at - trips[trips.length - 1].minutes;
  const hours = Math.max(0.5, (clock - first) / 60);
  return (
    <div>
      <div className={styles.big}><small>Earned today</small><b>{money(total)}</b></div>
      <div className={styles.tiles}>
        <div className={styles.tile}><small>Trips</small><b>{trips.length}</b></div>
        <div className={styles.tile}><small>Online</small><b>{Math.floor(hours)}h {Math.round((hours % 1) * 60)}m</b></div>
        <div className={styles.tile}><small>Per hour</small><b>${(total / hours).toFixed(0)}</b></div>
      </div>
      <div className={styles.listHead}>Trips</div>
      <div className={styles.list}>
        {trips.map((trip) => (
          <div key={trip.id} className={styles.tripRow}>
            <span><b>{trip.store}</b><small>{formatTime(trip.at)} · {trip.miles.toFixed(1)} mi · {trip.area}</small></span>
            <b>{money(trip.pay)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function TripDetail({ trip, geo }: { trip: Trip; geo: Geo }) {
  const rows: [string, string][] = [
    ["Base pay", money(trip.pay - trip.tip)], ["Customer tip", money(trip.tip)], ["Distance", `${trip.miles.toFixed(1)} mi`],
    ["Time", `${trip.minutes} min`], ["Picked up", formatTime(trip.at - trip.minutes)], ["Delivered", formatTime(trip.at)],
  ];
  return (
    <div>
      <MapSvg geo={geo} f={0} target="drop" height={210} top={260} />
      <div className={styles.tripTitle}>{trip.store}<small>{trip.area}</small></div>
      <div className={styles.list}>
        {rows.map(([label, value], i) => <div key={i} className={styles.tripRow}><span>{label}</span><b>{value}</b></div>)}
        <div className={styles.tripRow}><span><b>Total</b></span><b>{money(trip.pay)}</b></div>
      </div>
    </div>
  );
}

function Week({ week, weekday }: { week: number[]; weekday: number }) {
  const max = Math.max(...week, 100);
  const total = week.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className={styles.big}><small>This week</small><b>{money(total)}</b></div>
      <div className={styles.week}>
        <div className={styles.bars}>
          {weekdayShort.map((name, i) => (
            <div key={i} className={styles.barCol} data-today={i === weekday}>
              {week[i] > 0 && <b>${Math.round(week[i])}</b>}
              <span style={{ height: `${Math.max(2, (week[i] / max) * 120)}px` }} />
              {name}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.cash}><span>Cash out</span><span>{money(total * 0.6)} available</span></div>
      <div className={styles.list} style={{ marginTop: 14 }}>
        {weekdayShort.map((name, i) => <div key={i} className={styles.tripRow}><span>{name}</span><b>{week[i] ? money(week[i]) : "–"}</b></div>)}
      </div>
    </div>
  );
}

function Payout({ amount, sent }: { amount: number; sent: boolean }) {
  return (
    <div className={styles.sheetBack}>
      <div className={styles.sheetCard} style={{ top: 360 }}>
        <span className={styles.grabber} />
        {sent ? <span className={styles.doneMark}><Icon name="check" size={34} stroke={3} /></span> : null}
        <div className={styles.sheetTitle}>{sent ? "On its way" : "Cash out"}<small>To debit card ending 4821</small></div>
        <div className={styles.payoutAmount}>{money(amount - (sent ? 0.5 : 0))}</div>
        <div className={styles.sheetHint}>{sent ? "Usually arrives in a few minutes" : "Instant transfer fee $0.50"}</div>
        <div className={styles.go}>{sent ? "Done" : `Cash out ${money(amount)}`}</div>
      </div>
    </div>
  );
}

function panelFor(spec: Spec): Panel {
  switch (spec.kind) {
    case "nav":
    case "arrive": return { body: null, chrome: <NavPanel spec={spec} /> };
    case "checklist": return { body: null, chrome: <Checklist job={spec.job} ticked={spec.ticked} />, className: styles.clear };
    case "handoff": return { body: null, chrome: <Handoff job={spec.job} photo={spec.photo} /> };
    case "delivered": return { body: null, chrome: <Delivered job={spec.job} today={spec.today} trips={spec.trips} /> };
    case "waiting": return { body: null, chrome: <Waiting geo={spec.geo} area={spec.area} /> };
    case "offer": return { body: null, chrome: <Offer job={spec.job} />, className: styles.darkPanel };
    case "reason": return { body: null, chrome: <Reason />, className: styles.clear };
    case "accepted": return { body: null, chrome: <Accepted job={spec.job} by={spec.by} />, className: styles.darkPanel };
    case "today": return { body: <Today trips={spec.trips} clock={spec.clock} />, chrome: earnHead("today"), top: EARN_TOP, className: styles.earnPanel };
    case "trip": return {
      body: <TripDetail trip={spec.trip} geo={spec.geo} />,
      chrome: <div className={styles.earnHead}><div className={styles.navRow}><span className={styles.backLink}><Icon name="chevronLeft" size={24} stroke={2.4} />Today</span><span /></div></div>,
      top: 98,
      className: styles.earnPanel,
    };
    case "week": return { body: <Week week={spec.week} weekday={spec.weekday} />, chrome: earnHead("week"), top: EARN_TOP, className: styles.earnPanel };
    case "payout": return { body: null, chrome: <Payout amount={spec.amount} sent={spec.sent} />, className: styles.clear };
  }
}

function build(plan: Plan): Session {
  const panels: Record<string, Panel> = {};
  for (const [id, spec] of Object.entries(plan.specs)) panels[id] = panelFor(spec);
  return { duration: plan.duration, shots: plan.shots, panels };
}

/** Live values outside the storyboard: the ETA while driving, the countdown on an offer. */
function LiveLayer({ plan, panel, elapsed, clock }: { plan: Plan; panel: string; elapsed: number; clock: number }) {
  const span = plan.live.find((item) => (item.kind === "eta" ? panel.startsWith(item.panel) : panel === item.panel));
  if (!span) return null;
  if (span.kind === "eta") {
    const eta = Math.max(1, Math.ceil(span.end - Math.max(span.start, elapsed)));
    return <div className={styles.live}><span className={styles.eta}>{eta} min<small>{formatTime(clock + eta)}</small></span></div>;
  }
  const R = 28;
  const C = 2 * Math.PI * R;
  const frac = Math.min(1, Math.max(0.05, 1 - (elapsed - span.start) / Math.max(1, span.end - span.start)));
  return (
    <div className={styles.live}>
      <div className={styles.ring}>
        <svg viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r={R} fill="none" stroke="rgb(255 255 255 / 14%)" strokeWidth="5" />
          <circle cx="32" cy="32" r={R} fill="none" stroke="#e8402a" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
        </svg>
        <span className={styles.ringNum}>{Math.round(30 * frac)}</span>
      </div>
    </div>
  );
}

export function CourierScreen(props: ScreenProps) {
  const part = Math.max(0, Math.floor(props.elapsed / CHUNK));
  const start = part * CHUNK;
  const duration = Math.max(1, Math.min(CHUNK, props.duration - start));
  const elapsed = props.elapsed - start;
  const ctx: Ctx = { seed: props.seed, part, duration, clock: props.clock - props.elapsed + start, weekday: props.weekday };
  const plan = planFor(props.view, ctx);
  return (
    <div className={styles.screen}>
      <Storyboard
        id={`${props.view}:${props.seed}:${part}:${duration}`}
        elapsed={elapsed}
        build={() => build(plan)}
        live={(panel) => <LiveLayer plan={plan} panel={panel} elapsed={elapsed} clock={props.clock} />}
      />
    </div>
  );
}

const courier: CloneDefinition = {
  Screen: CourierScreen,
  tone: (view) => (view === "job-offer" ? "light" : "dark"),
  fixtures: [
    { view: "job-offer", label: "lunch rush offer", seed: 21, clock: 12 * 60 + 8, duration: 1 },
    { view: "job-offer", label: "offer run", seed: 13, clock: 18 * 60 + 2, duration: 8 },
    { view: "navigating", label: "heading to pickup", seed: 6, clock: 12 * 60 + 15, duration: 8 },
    { view: "navigating", label: "full delivery", seed: 9, clock: 13 * 60 + 40, duration: 18 },
    { view: "earnings", label: "mid-shift check", seed: 33, clock: 14 * 60 + 40, duration: 3 },
    { view: "earnings", label: "end of shift", seed: 4, clock: 20 * 60 + 10, duration: 10 },
  ],
};

export default courier;
