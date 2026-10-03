import { Icon } from "../../ios";
import { createRng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import { MapSvg, RouteLine, Upright, makeMap, makeRoute, pointAt, slice } from "../navigation/map";
import type { CloneDefinition } from "../types";
import styles from "./ride-hail.module.css";

const MAP_H = 520;
const drivers = ["Marcus", "Priya", "Daniel", "Yelena", "Andre", "Carmen", "Tomasz", "Aisha"];
const cars = ["Silver Sedan", "Black SUV", "Gray Hatchback", "White Sedan", "Blue Minivan"];
const corners = ["Bedford Ave & N 7th St", "Court St & Atlantic Ave", "W 4th St & 6th Ave", "Lexington Ave & E 28th St", "Metropolitan Ave & Union Ave"];

const dest = (owner: ScreenProps["owner"]) => (owner.work === "Home" ? "Prospect Park" : owner.work);

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

function setup(props: ScreenProps) {
  const rng = createRng(props.seed ^ 0x81d);
  const map = makeMap(props.seed, 390, MAP_H, { angle: -26 });
  return { rng, map, route: makeRoute(map, 2) };
}

const fares = [
  { name: "Ride", seats: 4, note: "Affordable, everyday", base: 17.4, per: 1 },
  { name: "Comfort", seats: 4, note: "Newer cars, extra legroom", base: 22.1, per: 1.25 },
  { name: "XL", seats: 6, note: "Groups up to 6", base: 28.6, per: 1.5 },
] as const;

function Requesting(props: ScreenProps) {
  const { map, route, rng } = setup(props);
  const surge = rng.chance(0.3) ? 1.3 : 1;
  const searching = Math.min(1, (props.elapsed + 1) / Math.max(2, props.duration));
  return (
    <div className={styles.screen}>
      <div className={styles.map}>
        <MapSvg map={map}>
          <RouteLine pts={route} color="#111" casing="#fff" width={4} />
          {[34, 22, 12].map((r) => <circle key={r} cx={map.start[0]} cy={map.start[1]} r={r} fill="none" stroke="#111" strokeOpacity={0.1 + (34 - r) / 160} strokeWidth="1.5" />)}
          <Upright map={map} at={map.start}><Pickup label="Pickup" /></Upright>
          <Upright map={map} at={map.end}><rect x="-6" y="-6" width="12" height="12" fill="#111" stroke="#fff" strokeWidth="2.5" /></Upright>
        </MapSvg>
      </div>
      <div className={styles.close}><Icon name="chevronLeft" size={20} stroke={2.6} /></div>
      <div className={styles.sheet}>
        <div className={styles.grabber} />
        <div className={styles.searching}>
          <b>Finding your driver…</b>
          <span className={styles.bar}><i style={{ width: `${searching * 100}%` }} /></span>
        </div>
        <div className={styles.destRow}><span className={styles.sq} /> {dest(props.owner)}</div>
        {fares.map((f, i) => {
          const miles = 3 + (props.seed % 5) + i;
          const price = (f.base + miles * 0.4) * (i === 0 ? surge : 1);
          return (
            <div key={f.name} className={styles.fare} data-selected={i === 0}>
              <span className={styles.carIcon}><Icon name="car" size={26} stroke={1.8} /></span>
              <span className={styles.fareBody}>
                <b>{f.name}<small><Icon name="person" size={11} stroke={2.4} /> {f.seats}</small></b>
                <span>{4 + i * 2} min away · {formatTime(props.clock + 4 + i * 2 + 13)}</span>
                <small>{f.note}</small>
              </span>
              <b className={styles.price}>${price.toFixed(2)}</b>
            </div>
          );
        })}
        <div className={styles.cta}>Request Ride</div>
      </div>
    </div>
  );
}

function Arriving(props: ScreenProps) {
  const { map, route, rng } = setup(props);
  const total = Math.max(2, props.duration);
  const eta = Math.max(1, total - props.elapsed);
  // The car approaches pickup along the first part of the route, reversed.
  const approach = [...slice(route, 0, 0.45)].reverse();
  const carAt = pointAt(approach, Math.min(1, props.elapsed / total));
  const name = rng.pick(drivers);
  const car = rng.pick(cars);
  const plate = `T${rng.int(100000, 999999)}C`;
  return (
    <div className={styles.screen}>
      <div className={styles.map}>
        <MapSvg map={map}>
          <RouteLine pts={slice(approach, Math.min(1, props.elapsed / total), 1)} color="#111" width={4} />
          <Upright map={map} at={approach[approach.length - 1]}><Pickup label="Pickup" /></Upright>
          <Upright map={map} at={carAt}><CarMarker /></Upright>
        </MapSvg>
      </div>
      <div className={styles.close}><Icon name="chevronLeft" size={20} stroke={2.6} /></div>
      <div className={styles.sheet} style={{ height: 380 }}>
        <div className={styles.grabber} />
        <div className={styles.etaHead}>
          <b>{eta <= 1 ? "Arriving now" : `Meet at pickup in ${eta} min`}</b>
          <span className={styles.pin}>PIN 4{props.seed % 9}{(props.seed >> 3) % 10}{(props.seed >> 6) % 10}</span>
        </div>
        <div className={styles.meet}>{corners[props.seed % corners.length]}</div>
        <div className={styles.driver}>
          <span className={styles.avatar} style={{ background: `hsl(${props.seed % 360} 38% 46%)` }}>{name[0]}</span>
          <span className={styles.driverBody}>
            <b>{name}</b>
            <span><Icon name="heart" size={11} filled stroke={0} /> {(4.82 + (props.seed % 17) / 100).toFixed(2)} · {rng.int(1200, 6800).toLocaleString("en-US")} trips</span>
          </span>
          <span className={styles.carInfo}>
            <b className={styles.plate}>{plate}</b>
            <span>{car}</span>
          </span>
        </div>
        <div className={styles.actions}>
          <span className={styles.message}>Message {name}</span>
          <span className={styles.roundBtn}><Icon name="phone" size={20} stroke={2} /></span>
          <span className={styles.roundBtn}><Icon name="more" size={20} stroke={2.4} /></span>
        </div>
        <div className={styles.rowLine}><span>Ride · Cash-free</span><b>${(18.2 + (props.seed % 9)).toFixed(2)}</b></div>
        <div className={styles.rowLine}><span>Drop-off · {dest(props.owner)}</span><b>{formatTime(props.clock + eta + 19)}</b></div>
      </div>
    </div>
  );
}

function OnTrip(props: ScreenProps) {
  const { map, route, rng } = setup(props);
  const total = Math.max(2, props.duration);
  const progress = Math.min(1, props.elapsed / total);
  const carAt = pointAt(route, progress);
  const remaining = Math.max(1, total - props.elapsed);
  const name = rng.pick(drivers);
  return (
    <div className={styles.screen}>
      <div className={styles.map}>
        <MapSvg map={map}>
          <RouteLine pts={slice(route, 0, progress)} color="#9aa0a8" width={4} />
          <RouteLine pts={slice(route, progress, 1)} color="#111" width={4.5} />
          <Upright map={map} at={map.end}><rect x="-6" y="-6" width="12" height="12" fill="#111" stroke="#fff" strokeWidth="2.5" /></Upright>
          <Upright map={map} at={carAt}><CarMarker /></Upright>
        </MapSvg>
      </div>
      <div className={styles.sheet} style={{ height: 330 }}>
        <div className={styles.grabber} />
        <div className={styles.etaHead}>
          <b>Arriving at {formatTime(props.clock + remaining)}</b>
          <span className={styles.pin}>{remaining} min</span>
        </div>
        <div className={styles.meet}>Heading to {dest(props.owner)}</div>
        <div className={styles.progress}>
          <span className={styles.track}><i style={{ width: `${progress * 100}%` }} /></span>
          <span className={styles.progressCar} style={{ left: `calc(${progress * 100}% - 12px)` }}><Icon name="car" size={14} stroke={2.2} /></span>
        </div>
        <div className={styles.driver}>
          <span className={styles.avatar} style={{ background: `hsl(${props.seed % 360} 38% 46%)` }}>{name[0]}</span>
          <span className={styles.driverBody}><b>{name}</b><span>{rng.pick(cars)}</span></span>
          <b className={styles.plate}>T{rng.int(100000, 999999)}C</b>
        </div>
        <div className={styles.actions}>
          <span className={styles.message}><Icon name="share" size={17} stroke={2.2} /> Share trip status</span>
          <span className={styles.roundBtn}><Icon name="bell" size={20} stroke={2} /></span>
        </div>
        <div className={styles.rowLine}><span>Safety toolkit</span><Icon name="chevronRight" size={16} stroke={2.4} /></div>
        <div className={styles.rowLine}><span>Change drop-off or add stop</span><Icon name="chevronRight" size={16} stroke={2.4} /></div>
      </div>
    </div>
  );
}

function RideHailScreen(props: ScreenProps) {
  if (props.view === "arriving") return <Arriving {...props} />;
  if (props.view === "on-trip") return <OnTrip {...props} />;
  return <Requesting {...props} />;
}

const rideHail: CloneDefinition = {
  Screen: RideHailScreen,
  tone: () => "dark",
  fixtures: [
    { view: "requesting", label: "choosing a ride", clock: 18 * 60 + 52, duration: 3, seed: 6 },
    { view: "arriving", label: "driver on the way", clock: 18 * 60 + 57, duration: 6, seed: 6 },
    { view: "on-trip", label: "riding home", clock: 19 * 60 + 6, duration: 22, seed: 6 },
  ],
};

export default rideHail;
