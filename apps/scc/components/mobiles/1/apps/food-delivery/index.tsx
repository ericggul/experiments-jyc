import { Icon, TabBar, type IconName, type TabItem } from "../../ios";
import { createRng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./food-delivery.module.css";

const ACCENT = "#ff8a00";

const tabs: readonly TabItem[] = [
  { id: "home", label: "Home", icon: "house" },
  { id: "browse", label: "Browse", icon: "search" },
  { id: "orders", label: "Orders", icon: "bag" },
  { id: "account", label: "Account", icon: "person" },
];

const categories: readonly { name: string; icon: IconName; tint: string }[] = [
  { name: "Pizza", icon: "plate", tint: "#e0523a" },
  { name: "Sushi", icon: "fork", tint: "#3b8ea5" },
  { name: "Burgers", icon: "bag", tint: "#c98a2b" },
  { name: "Healthy", icon: "heart", tint: "#4e9f5a" },
  { name: "Coffee", icon: "clock", tint: "#7a5a43" },
];

const restaurants = [
  { name: "Lucia's Slice House", cuisine: "Pizza", from: "#e8683f", to: "#9c2f1d" },
  { name: "Kinoko Ramen Bar", cuisine: "Japanese", from: "#e2b25a", to: "#7d4a24" },
  { name: "Nonna Rosa Trattoria", cuisine: "Italian", from: "#b24a3a", to: "#5a2230" },
  { name: "Greenhouse Bowls", cuisine: "Healthy", from: "#7fc16a", to: "#2f6a47" },
  { name: "Bodega Taqueria", cuisine: "Mexican", from: "#f0a04b", to: "#b24b22" },
  { name: "Golden Dragon Kitchen", cuisine: "Chinese", from: "#d9453f", to: "#7a1d2a" },
  { name: "Third Rail Burgers", cuisine: "American", from: "#c9873a", to: "#6b3b1c" },
  { name: "Saffron & Salt", cuisine: "Indian", from: "#e9a33c", to: "#8f3f1b" },
];

function Browse({ seed, clock }: ScreenProps) {
  const rng = createRng(seed);
  const hour = Math.floor(clock / 60);
  const meal = hour < 11 ? "Breakfast" : hour < 16 ? "Lunch" : "Dinner";
  const offset = rng.int(0, restaurants.length - 1);
  const list = [0, 1, 2].map((index) => {
    const base = restaurants[(offset + index) % restaurants.length];
    const min = rng.int(15, 30);
    return {
      ...base,
      id: base.name,
      fee: rng.chance(0.3) ? "$0 delivery fee" : `$${rng.int(0, 3)}.${rng.pick(["49", "99", "99"])} delivery fee`,
      eta: `${min}–${min + 10}`,
      rating: (4.2 + rng.next() * 0.7).toFixed(1),
      reviews: `${rng.int(1, 9)}.${rng.int(0, 9)}k`,
      promo: index === 0 ? "20% off" : index === 2 ? "Free dumplings over $25" : undefined,
    };
  });
  return (
    <div className={styles.root}>
      <div className={styles.top}>
        <div className={styles.addr}>
          <b><div><small>Deliver now</small>{rng.int(120, 480)} {rng.pick(["Bedford Ave", "Franklin St", "Flushing Ave", "W 83rd St", "Court St"])}<Icon name="chevronDown" size={14} stroke={2.6} style={{ marginLeft: 4 }} /></div></b>
          <span className={styles.cart}><Icon name="bag" size={20} stroke={1.9} /><i>{rng.int(1, 3)}</i></span>
        </div>
        <div className={styles.search}><Icon name="search" size={17} stroke={2.2} />Search {meal.toLowerCase()}, cuisines, dishes</div>
        <div className={styles.cats}>
          {categories.map((cat) => (
            <div key={cat.name} className={styles.cat}><span style={{ background: `linear-gradient(145deg, ${cat.tint}, ${cat.tint}bb)` }}><Icon name={cat.icon} size={26} stroke={1.8} /></span>{cat.name}</div>
          ))}
        </div>
        <div className={styles.chips}>
          {["Offers", "Under 30 min", "Rating 4.5+", "$$", "Pickup"].map((label, index) => (
            <span key={label} className={styles.chip} data-on={index === 1}>{label}</span>
          ))}
        </div>
        <h2 className={styles.heading}>{meal} near you</h2>
        {list.slice(0, 2).map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.hero} style={{ background: `linear-gradient(135deg, ${item.from}, ${item.to})` }}>
              <Icon name="plate" size={56} stroke={1.2} />
              <Icon name="heart" size={22} stroke={2} className={styles.fav} />
              {item.promo && <span className={styles.promo}>{item.promo}</span>}
            </div>
            <div className={styles.meta}>{item.name}<span className={styles.eta}>{item.eta} min</span></div>
            <div className={styles.sub}><b>{item.rating}</b> ★ ({item.reviews}) · {item.cuisine} · {item.fee}</div>
          </div>
        ))}
      </div>
      <TabBar items={tabs} active="browse" tint={ACCENT} />
    </div>
  );
}

/** Route polyline in map coordinates (restaurant → door). */
const route: readonly (readonly [number, number])[] = [[70, 330], [70, 250], [170, 250], [170, 160], [290, 160], [290, 90], [330, 90]];

function pointAt(t: number) {
  const lengths = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
  let target = Math.min(1, Math.max(0, t)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]) {
      const f = target / lengths[i];
      return [route[i][0] + (route[i + 1][0] - route[i][0]) * f, route[i][1] + (route[i + 1][1] - route[i][1]) * f] as const;
    }
    target -= lengths[i];
  }
  return route[route.length - 1];
}

const stepNames = ["Order placed", "Preparing", "Picked up", "Arriving"] as const;

function Tracking({ seed, elapsed, duration, clock }: ScreenProps) {
  const rng = createRng(seed);
  const total = Math.max(duration, 1);
  const progress = Math.min(1, elapsed / total);
  
  const stageIndex = progress < 0.18 ? 0 : progress < 0.4 ? 1 : progress < 0.8 ? 2 : 3;
  const eta = Math.max(1, Math.ceil(total - elapsed));
  const travel = Math.max(0, (progress - 0.4) / 0.6);
  const [cx, cy] = stageIndex < 2 ? route[0] : pointAt(travel);
  const placed = clock - elapsed;
  const place = restaurants[seed % restaurants.length];
  const courier = rng.pick(["Marco R.", "Aisha K.", "Devon T.", "Yuki S."]);
  const path = route.map((p) => p.join(",")).join(" ");
  const status = ["Order confirmed", `${place.name} is preparing your order`, `${courier.split(" ")[0]} picked up your order`, `${courier.split(" ")[0]} is almost there`][stageIndex];
  return (
    <div className={styles.root}>
      <svg className={styles.map} viewBox="0 0 390 430" aria-hidden="true">
        <rect width="390" height="430" fill="#ebe7df" />
        <rect x="0" y="360" width="390" height="70" fill="#bcd6e6" />
        <rect x="200" y="190" width="70" height="40" rx="4" fill="#cfe3c2" />
        <rect x="10" y="60" width="90" height="70" rx="4" fill="#cfe3c2" />
        {[60, 160, 250, 330].map((y) => <rect key={`h${y}`} x="0" y={y - 6} width="390" height="12" fill="#fff" />)}
        {[70, 170, 290, 350].map((x) => <rect key={`v${x}`} x={x - 6} y="0" width="12" height="360" fill="#fff" />)}
        <path d="M0 210 L390 130" stroke="#fff" strokeWidth="9" />
        <polyline points={path} fill="none" stroke="#ff8a00" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" opacity="0.35" />
        <circle cx={route[0][0]} cy={route[0][1]} r="9" fill="#fff" stroke="#ff8a00" strokeWidth="3" />
        <circle cx={route[route.length - 1][0]} cy={route[route.length - 1][1]} r="10" fill="#111" />
        <rect x={route[route.length - 1][0] - 4} y={route[route.length - 1][1] - 4} width="8" height="8" fill="#fff" />
        {stageIndex >= 2 && (
          <g>
            <circle cx={cx} cy={cy} r="17" fill="#ff8a00" opacity="0.22" />
            <circle cx={cx} cy={cy} r="10" fill="#ff8a00" stroke="#fff" strokeWidth="3" />
          </g>
        )}
      </svg>
      <span className={styles.back}><Icon name="chevronLeft" size={20} stroke={2.6} /></span>
      <div className={styles.sheet}>
        <div className={styles.grab} />
        <div className={styles.etaRow}>
          <div>
            <div className={styles.etaBig}>{eta}<small> min</small></div>
            <div className={styles.status}>{status}</div>
          </div>
          <div className={styles.sub}>Arrives by {formatTime(clock + eta)}</div>
        </div>
        <div className={styles.bar}>{stepNames.map((name, index) => <i key={name} data-done={index <= stageIndex} />)}</div>
        <div className={styles.steps}>
          {stepNames.map((name, index) => (
            <div key={name} className={styles.step} data-state={index < stageIndex ? "done" : index === stageIndex ? "now" : "todo"}>
              <span className={styles.node}>{index < stageIndex && <Icon name="check" size={13} stroke={3.4} />}</span>
              {name}
              <span className={styles.stepTime}>{index <= stageIndex ? formatTime(placed + Math.round(index * total * 0.22)) : ""}</span>
            </div>
          ))}
        </div>
        <div className={styles.courier}>
          <span className={styles.face}>{courier.split(" ").map((p) => p[0]).join("")}</span>
          <div>{courier}<small>Your courier · 4.9 ★</small></div>
          <span className={styles.round}><Icon name="bubble" size={19} stroke={1.9} /></span>
          <span className={styles.round}><Icon name="phone" size={19} stroke={1.9} /></span>
        </div>
      </div>
    </div>
  );
}

export function BiteScreen(props: ScreenProps) {
  return props.view === "tracking" ? <Tracking {...props} /> : <Browse {...props} />;
}

const bite: CloneDefinition = {
  Screen: BiteScreen,
  fixtures: [
    { view: "browse", label: "lunch scroll", seed: 5, clock: 12 * 60 + 10, duration: 3 },
    { view: "browse", label: "dinner search", seed: 18, clock: 19 * 60 + 25, duration: 3 },
    { view: "tracking", label: "lunch on the way", seed: 5, clock: 12 * 60 + 18, duration: 28 },
    { view: "tracking", label: "dinner arriving", seed: 18, clock: 19 * 60 + 40, duration: 22 },
  ],
};

export default bite;
