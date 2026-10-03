import { Icon, Storyboard, type Panel, type Session } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import { MapSvg, RouteLine, Upright, makeMap, makeRoute, pointAt, slice } from "../navigation/map";
import { createFlow } from "../navigation/session";
import type { CloneDefinition } from "../types";
import styles from "./ride-hail.module.css";

const MAP_H = 520;
const firstNames = ["Marcus", "Priya", "Daniel", "Yelena", "Andre", "Carmen", "Tomasz", "Aisha", "Kofi", "Mei", "Rafael", "Ingrid", "Samir", "Bianca", "Leon", "Noor", "Hector", "Dara", "Viktor", "Amara", "Julian", "Soledad", "Wei", "Teodor"] as const;
const colors = ["Silver", "Black", "Gray", "White", "Blue", "Red", "Green", "Tan"] as const;
const models = ["Sedan", "SUV", "Hatchback", "Minivan", "Crossover", "Wagon", "Coupe", "Hybrid"] as const;
const avenues = ["Bedford Ave", "Court St", "Atlantic Ave", "Lexington Ave", "Metropolitan Ave", "Union Ave", "Smith St", "Vernon Blvd", "Fulton St", "Amsterdam Ave", "Houston St", "Nostrand Ave"] as const;
const places = ["Anchor Coffee", "Pier Market", "Union Library", "Harbor Gym", "Loft Studios", "Corner Pharmacy", "Maple Dental", "Field Park", "Garden Clinic", "Salt Kitchen"] as const;
const hoods = ["Williamsburg", "Chelsea", "Astoria", "Park Slope", "Midtown", "Greenpoint", "Harlem", "Dumbo", "Long Island City", "SoHo"] as const;
const chat = [
  ["I'm in the gray jacket by the corner.", "Got it, I see you."], ["Can you wait one minute?", "No problem, I'll circle the block."], ["Which side of the street?", "East side, near the hydrant."],
  ["I'm outside the blue door.", "Two minutes away."], ["Traffic is heavy on the avenue.", "Thanks for the heads up."],
] as const;

type Ride = { id: string; kk: number; arriveAt: number; arriveDur: number; tripAt: number; tripDur: number };

function rideData(seed: number, kk: number, owner: ScreenProps["owner"]) {
  const rng = createRng(hash(seed, "ride", kk));
  const map = makeMap(hash(seed, kk, "ride-map"), 390, MAP_H, { angle: -26 });
  const route = makeRoute(map, 2 + kk);
  const name = rng.pick(firstNames);
  return {
    map, route, name,
    car: `${rng.pick(colors)} ${rng.pick(models)}`,
    plate: `T${rng.int(100000, 999999)}C`,
    rating: (4.6 + rng.range(0, 0.39)).toFixed(2),
    trips: rng.int(900, 9800).toLocaleString("en-US"),
    pin: String(rng.int(1000, 9999)),
    meet: `${rng.pick(avenues)} & ${rng.pick(["N 7th St", "W 4th St", "E 28th St", "Dean St", "Pearl St", "Grand St"])}`,
    dest: kk === 0 && owner.work !== "Home" ? owner.work : `${rng.pick(places)}, ${rng.pick(hoods)}`,
    fare: 16 + rng.range(0, 24),
    surge: rng.chance(0.3) ? 1.3 : 1,
    hue: rng.int(0, 359),
    chat: chat[rng.int(0, chat.length - 1)],
  };
}

type Kind = "requesting" | "matched" | "arriving" | "chat" | "ontrip" | "details" | "rate";
type Spec = { kind: Kind; kk: number };

function plan(props: ScreenProps) {
  const total = Math.max(4, props.duration);
  const rng = createRng(hash(props.seed, "ride-plan"));
  const flow = createFlow(total);
  const specs: Record<string, Spec> = {};
  const rides: Ride[] = [];
  const stages: readonly Kind[] = ["requesting", "matched", "arriving", "ontrip", "rate"];
  const startStage = props.view === "arriving" ? 2 : props.view === "on-trip" ? 3 : 0;
  let k = 0;
  let first = true;
  const enter = (kind: Kind, wasFirst: boolean) => (wasFirst ? ("cut" as const) : kind === "rate" ? ("sheet" as const) : kind === "requesting" ? ("fade" as const) : ("push" as const));
  while (flow.open) {
    const kk = k % 2;
    const arriveDur = rng.int(6, 9);
    const tripDur = rng.int(12, 22);
    let ride: Ride = { id: `ride-${k}`, kk, arriveAt: 0, arriveDur, tripAt: 0, tripDur };
    const mark = (kind: Kind, dwell: number, options: Parameters<typeof flow.go>[2] = {}) => {
      const id = `${kind}-${kk}`;
      specs[id] = { kind, kk };
      const wasFirst = flow.shots.length === 0;
      flow.go(id, dwell, { enter: enter(kind, wasFirst), ...(wasFirst ? {} : options) });
    };
    for (const stage of stages.slice(first ? startStage : 0)) {
      if (!flow.open) break;
      if (stage === "requesting") mark("requesting", rng.range(2.2, 2.8));
      else if (stage === "matched") mark("matched", rng.range(2, 2.6), { tap: { x: 195, y: 790 } });
      else if (stage === "arriving") {
        const offset = first && startStage === 2 ? arriveDur * rng.range(0.1, 0.3) : 0;
        ride = { ...ride, arriveAt: flow.t - offset };
        const end = ride.arriveAt + arriveDur;
        mark("arriving", Math.max(2.4, (end - flow.t) * 0.45), { tap: { x: 195, y: 790 } });
        mark("chat", 2.4, { tap: { x: 130, y: 620 } });
        flow.go(`arriving-${kk}`, Math.max(1.4, end - flow.t), { enter: "pop", tap: { x: 40, y: 70 } });
      } else if (stage === "ontrip") {
        const offset = first && startStage === 3 ? tripDur * rng.range(0.1, 0.35) : 0;
        ride = { ...ride, tripAt: flow.t - offset };
        const end = ride.tripAt + tripDur;
        mark("ontrip", Math.max(2.4, (end - flow.t) * 0.4), { tap: { x: 195, y: 790 } });
        mark("details", 2.4, { tap: { x: 195, y: 700 } });
        flow.go(`ontrip-${kk}`, Math.max(1.4, end - flow.t), { enter: "dismiss" });
      } else mark("rate", rng.range(2.4, 3), { tap: { x: 195, y: 700 } });
    }
    rides.push(ride);
    first = false;
    k += 1;
  }
  return { total, seed: props.seed, specs, shots: flow.shots, rides };
}
type Plan = ReturnType<typeof plan>;

function CarMarker({ color = "#111" }: { color?: string }) {
  return (
    <g>
      <circle r="13" fill="#fff" stroke="rgb(0 0 0 / 15%)" />
      <rect x="-4.5" y="-8" width="9" height="16" rx="3.5" fill={color} />
      <rect x="-3" y="-4.5" width="6" height="3.5" rx="1" fill="#9aa4b2" />
    </g>
  );
}
function Pickup({ label }: { label?: string }) {
  return (
    <g>
      <circle r="6" fill="#111" stroke="#fff" strokeWidth="2.5" />
      {label && <text y="-13" textAnchor="middle" fontSize="9" fontWeight="700" fill="#111" stroke="#fff" strokeWidth="3" paintOrder="stroke" fontFamily="-apple-system, Helvetica, sans-serif">{label}</text>}
    </g>
  );
}
const Square = () => <rect x="-6" y="-6" width="12" height="12" fill="#111" stroke="#fff" strokeWidth="2.5" />;

const fares = [
  { id: "ride", name: "Ride", seats: 4, note: "Affordable, everyday", add: 0, per: 1 },
  { id: "comfort", name: "Comfort", seats: 4, note: "Newer cars, extra legroom", add: 4.7, per: 1.25 },
  { id: "xl", name: "XL", seats: 6, note: "Groups up to 6", add: 11.2, per: 1.5 },
] as const;

const Avatar = ({ name, hue, size = 52 }: { name: string; hue: number; size?: number }) => (
  <span className={styles.avatar} style={{ width: size, height: size, background: `hsl(${hue} 38% 46%)` }}>{name[0]}</span>
);

function buildPanel(spec: Spec, p: Plan, props: ScreenProps): Panel {
  const d = rideData(p.seed, spec.kk, props.owner);
  const back = <div className={styles.close}><Icon name="chevronLeft" size={20} stroke={2.6} /></div>;
  const mapPanel = (extra?: React.ReactNode) => (
    <div className={styles.map}>
      <MapSvg map={d.map}>
        <RouteLine pts={d.route} color="#111" casing="#fff" width={4} />
        {extra}
        <Upright map={d.map} at={d.map.start}><Pickup label="Pickup" /></Upright>
        <Upright map={d.map} at={d.map.end}><Square /></Upright>
      </MapSvg>
    </div>
  );
  if (spec.kind === "requesting") {
    return {
      body: mapPanel(<>{[34, 22, 12].map((r) => <circle key={r} cx={d.map.start[0]} cy={d.map.start[1]} r={r} fill="none" stroke="#111" strokeOpacity={0.1 + (34 - r) / 160} strokeWidth="1.5" />)}</>),
      chrome: (
        <>
          {back}
          <div className={styles.sheet}>
            <div className={styles.grabber} />
            <div className={styles.searching}><b>Choose a ride</b></div>
            <div className={styles.destRow}><span className={styles.sq} /> {d.dest}</div>
            {fares.map((f, i) => {
              const price = (d.fare + f.add + f.per * 3) * (i === 0 ? d.surge : 1);
              return (
                <div key={f.id} className={styles.fare} data-selected={i === 0}>
                  <span className={styles.carIcon}><Icon name="car" size={26} stroke={1.8} /></span>
                  <span className={styles.fareBody}>
                    <b>{f.name}<small><Icon name="person" size={11} stroke={2.4} /> {f.seats}</small></b>
                    <span>{3 + i * 2 + (d.hue % 3)} min away</span>
                    <small>{f.note}</small>
                  </span>
                  <b className={styles.price}>${price.toFixed(2)}</b>
                </div>
              );
            })}
            <div className={styles.cta}>Request Ride</div>
          </div>
        </>
      ),
    };
  }
  if (spec.kind === "matched") {
    return {
      body: mapPanel(),
      chrome: (
        <div className={styles.sheet} style={{ height: 330 }}>
          <div className={styles.grabber} />
          <div className={styles.etaHead}><b>Driver matched</b><span className={styles.pin}>PIN {d.pin}</span></div>
          <div className={styles.meet}>Meet at {d.meet}</div>
          <div className={styles.driver}>
            <Avatar name={d.name} hue={d.hue} />
            <span className={styles.driverBody}><b>{d.name}</b><span><Icon name="heart" size={11} filled stroke={0} /> {d.rating} · {d.trips} trips</span></span>
            <span className={styles.carInfo}><b className={styles.plate}>{d.plate}</b><span>{d.car}</span></span>
          </div>
          <div className={styles.rowLine}><span>Ride · Cash-free</span><b>${(d.fare * d.surge).toFixed(2)}</b></div>
          <div className={styles.rowLine}><span>Drop-off</span><b>{d.dest.split(",")[0]}</b></div>
        </div>
      ),
    };
  }
  if (spec.kind === "arriving") {
    return {
      body: mapPanel(),
      chrome: (
        <>
          {back}
          <div className={styles.sheet} style={{ height: 380 }}>
            <div className={styles.grabber} />
            <div className={styles.etaHead}><b>&nbsp;</b><span className={styles.pin}>PIN {d.pin}</span></div>
            <div className={styles.meet}>{d.meet}</div>
            <div className={styles.driver}>
              <Avatar name={d.name} hue={d.hue} />
              <span className={styles.driverBody}><b>{d.name}</b><span><Icon name="heart" size={11} filled stroke={0} /> {d.rating} · {d.trips} trips</span></span>
              <span className={styles.carInfo}><b className={styles.plate}>{d.plate}</b><span>{d.car}</span></span>
            </div>
            <div className={styles.actions}>
              <span className={styles.message}>Message {d.name}</span>
              <span className={styles.roundBtn}><Icon name="phone" size={20} stroke={2} /></span>
              <span className={styles.roundBtn}><Icon name="more" size={20} stroke={2.4} /></span>
            </div>
            <div className={styles.rowLine}><span>Ride · Cash-free</span><b>${(d.fare * d.surge).toFixed(2)}</b></div>
          </div>
        </>
      ),
    };
  }
  if (spec.kind === "chat") {
    const [mine, theirs] = d.chat;
    return {
      top: 98,
      body: (
        <div className={styles.chat}>
          <span className={styles.them}>{`I'm on my way, about ${3 + (d.hue % 4)} minutes out.`}</span>
          <span className={styles.me}>{mine}</span>
          <span className={styles.them}>{theirs}</span>
          <span className={styles.me}>Thank you!</span>
        </div>
      ),
      chrome: <header className={styles.chatBar}><Icon name="chevronLeft" size={22} stroke={2.4} /><Avatar name={d.name} hue={d.hue} size={30} /><b>{d.name}</b><small>{d.car}</small></header>,
    };
  }
  if (spec.kind === "ontrip") {
    return {
      body: (
        <div className={styles.map}>
          <MapSvg map={d.map}>
            <RouteLine pts={d.route} color="#111" casing="#fff" width={4.5} />
            <Upright map={d.map} at={d.map.end}><Square /></Upright>
          </MapSvg>
        </div>
      ),
      chrome: (
        <div className={styles.sheet} style={{ height: 330 }}>
          <div className={styles.grabber} />
          <div className={styles.etaHead}><b>&nbsp;</b></div>
          <div className={styles.meet}>Heading to {d.dest}</div>
          <div className={styles.progress}><span className={styles.track} /></div>
          <div className={styles.driver}>
            <Avatar name={d.name} hue={d.hue} />
            <span className={styles.driverBody}><b>{d.name}</b><span>{d.car}</span></span>
            <b className={styles.plate}>{d.plate}</b>
          </div>
          <div className={styles.actions}>
            <span className={styles.message}><Icon name="share" size={17} stroke={2.2} /> Share trip status</span>
            <span className={styles.roundBtn}><Icon name="bell" size={20} stroke={2} /></span>
          </div>
        </div>
      ),
    };
  }
  if (spec.kind === "details") {
    const rng = createRng(hash(p.seed, "details", spec.kk));
    return {
      className: styles.sheetPanel,
      top: 150,
      body: (
        <div className={styles.detailBody}>
          {[["Safety toolkit", ""], ["Share trip status", `${rng.int(1, 3)} contacts`], ["Add a stop", ""], ["Change drop-off", d.dest.split(",")[0]], ["Fare breakdown", `$${(d.fare * d.surge).toFixed(2)}`], ["Audio recording", rng.pick(["Off", "On"])]].map(([label, value]) => (
            <div key={label} className={styles.rowLine}><span>{label}</span><b>{value}</b></div>
          ))}
        </div>
      ),
      chrome: <header className={styles.sheetHead}>Trip details</header>,
    };
  }
  const tips = [1, 2, 3, 5];
  return {
    className: styles.ratePanel,
    body: (
      <div className={styles.rate}>
        <Avatar name={d.name} hue={d.hue} size={84} />
        <h1>How was your ride with {d.name}?</h1>
        <div className={styles.stars}>{[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="heart" size={34} filled={n <= 4 + (d.hue % 2)} stroke={1.6} />)}</div>
        <span>Add a tip for {d.name}</span>
        <div className={styles.tips}>{tips.map((t, i) => <b key={t} data-on={i === d.hue % 3}>${t}</b>)}</div>
        <div className={styles.cta2}>Submit · ${(d.fare * d.surge).toFixed(2)}</div>
      </div>
    ),
  };
}

function Live({ p, props, id }: { p: Plan; props: ScreenProps; id: string }) {
  const spec = p.specs[id];
  if (!spec || (spec.kind !== "arriving" && spec.kind !== "ontrip")) return null;
  const ride = [...p.rides].reverse().find((r) => (spec.kind === "arriving" ? r.arriveAt : r.tripAt) <= props.elapsed + 0.5 && r.kk === spec.kk);
  if (!ride) return null;
  const d = rideData(p.seed, spec.kk, props.owner);
  if (spec.kind === "arriving") {
    const progress = Math.min(1, Math.max(0, (props.elapsed - ride.arriveAt) / ride.arriveDur));
    const eta = Math.max(0, Math.round(ride.arriveDur * (1 - progress)));
    const approach = [...slice(d.route, 0, 0.45)].reverse();
    const carAt = pointAt(approach, progress);
    return (
      <div className={styles.live}>
        <svg width="390" height={MAP_H} viewBox={`0 0 390 ${MAP_H}`} aria-hidden="true">
          <g transform={`rotate(${d.map.angle} 195 ${MAP_H / 2})`}>
            <RouteLine pts={slice(approach, progress, 1)} color="#111" width={4} />
            <Upright map={d.map} at={carAt}><CarMarker /></Upright>
          </g>
        </svg>
        <div className={styles.eta} style={{ top: 482, right: 130 }}><b>{eta <= 1 ? "Arriving now" : `Meet at pickup in ${eta} min`}</b></div>
      </div>
    );
  }
  const progress = Math.min(1, Math.max(0, (props.elapsed - ride.tripAt) / ride.tripDur));
  const remaining = Math.max(0, Math.round(ride.tripDur * (1 - progress)));
  const carAt = pointAt(d.route, progress);
  return (
    <div className={styles.live}>
      <svg width="390" height={MAP_H} viewBox={`0 0 390 ${MAP_H}`} aria-hidden="true">
        <g transform={`rotate(${d.map.angle} 195 ${MAP_H / 2})`}>
          <RouteLine pts={slice(d.route, 0, progress)} color="#9aa0a8" width={4.5} />
          <Upright map={d.map} at={carAt}><CarMarker /></Upright>
        </g>
      </svg>
      <div className={styles.eta} style={{ top: 532 }}>
        <b>Arriving at {formatTime(props.clock + remaining)}</b><span className={styles.pin}>{remaining} min</span>
      </div>
      <div className={styles.progressLive}>
        <span className={styles.trackLive}><i style={{ width: `${progress * 100}%` }} /></span>
        <span className={styles.progressCar} style={{ left: `calc(${progress * 100}% - 12px)` }}><Icon name="car" size={14} stroke={2.2} /></span>
      </div>
    </div>
  );
}

function RideHailScreen(props: ScreenProps) {
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

const rideHail: CloneDefinition = {
  Screen: RideHailScreen,
  tone: () => "dark",
  fixtures: [
    { view: "requesting", label: "choosing a ride", clock: 18 * 60 + 52, duration: 40, seed: 6 },
    { view: "arriving", label: "driver on the way", clock: 18 * 60 + 57, duration: 30, seed: 6 },
    { view: "on-trip", label: "riding home", clock: 19 * 60 + 6, duration: 34, seed: 6 },
  ],
};

export default rideHail;
