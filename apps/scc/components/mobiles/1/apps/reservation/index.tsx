import { Icon } from "../../ios";
import { createRng } from "../../model/rng";
import { formatDate, formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./reservation.module.css";

const venues = [
  { name: "Osteria Delmar", cuisine: "Italian", hood: "West Village", street: "212 Bleecker St", from: "#a8452f", to: "#4d1f1b" },
  { name: "Ume Counter", cuisine: "Japanese", hood: "East Village", street: "36 E 7th St", from: "#3c6a7a", to: "#1b2e3a" },
  { name: "Maison Pelletier", cuisine: "French", hood: "Tribeca", street: "88 Franklin St", from: "#7d5a3a", to: "#2f2218" },
  { name: "Castillo Cantina", cuisine: "Mexican", hood: "Williamsburg", street: "141 Wythe Ave", from: "#d1802e", to: "#7a2c1a" },
  { name: "Harbor & Pine", cuisine: "Seafood", hood: "Greenpoint", street: "9 Franklin St", from: "#3f7f86", to: "#16363f" },
  { name: "Saffron Table", cuisine: "Indian", hood: "Murray Hill", street: "123 Lexington Ave", from: "#c28a2f", to: "#6a2a12" },
  { name: "Birch Room", cuisine: "American", hood: "Park Slope", street: "310 5th Ave", from: "#6a7f55", to: "#27331f" },
];

const parties = [2, 2, 4, 3, 2, 6];

function slotsFor(rng: ReturnType<typeof createRng>, around: number) {
  return [-30, 0, 30, 60].map((delta) => ({ minute: around + delta, gone: rng.chance(0.22) }));
}

function Search({ seed, clock }: ScreenProps) {
  const rng = createRng(seed);
  const party = rng.pick(parties);
  const hour = Math.floor(clock / 60);
  const target = hour < 15 ? (hour < 11 ? 12 * 60 + 30 : 13 * 60) : 19 * 60 + 30;
  const dayWord = clock < 19 * 60 ? "Today" : "Tomorrow";
  const start = rng.int(0, venues.length - 1);
  const list = [0, 1, 2].map((i) => {
    const venue = venues[(start + i) % venues.length];
    return {
      ...venue,
      id: venue.name,
      rating: (4.3 + rng.next() * 0.6).toFixed(1),
      reviews: rng.int(210, 3400).toLocaleString("en-US"),
      price: "$".repeat(rng.int(2, 4)),
      booked: rng.int(12, 64),
      slots: slotsFor(rng, target),
    };
  });
  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <h1 className={styles.title}>Table<span>.</span></h1>
        <div className={styles.search}><Icon name="search" size={17} stroke={2.2} />Location, restaurant, or cuisine</div>
        <div className={styles.chips}>
          <span className={styles.chip}><Icon name="person" size={16} stroke={2} />{party} people</span>
          <span className={styles.chip}><Icon name="calendar" size={16} stroke={2} />{dayWord}</span>
          <span className={styles.chip}><Icon name="clock" size={16} stroke={2} />{formatTime(target)}</span>
        </div>
      </div>
      <div className={styles.list}>
        {list.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.tile} style={{ background: `linear-gradient(145deg, ${item.from}, ${item.to})` }}><Icon name="plate" size={34} stroke={1.4} /></div>
            <div>
              <div className={styles.name}>{item.name}</div>
              <div className={styles.stars}><b>★★★★★</b>{item.rating} ({item.reviews})</div>
              <div className={styles.line}>{item.price} · {item.cuisine} · {item.hood}</div>
              <div className={styles.hot}><Icon name="bolt" size={12} stroke={2.4} />Booked {item.booked} times today</div>
            </div>
            <div className={styles.slots}>
              {item.slots.map((slot) => (
                <span key={slot.minute} className={styles.slot} data-gone={slot.gone}>{formatTime(slot.minute).replace(" ", " ")}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Confirmed({ seed, clock, day, elapsed }: ScreenProps) {
  const rng = createRng(seed);
  const venue = venues[seed % venues.length];
  const party = rng.pick(parties);
  const time = rng.pick([18 * 60 + 30, 19 * 60, 19 * 60 + 30, 20 * 60]);
  const bookedDay = day + 1;
  const reference = `T-${rng.int(100, 999)}${String.fromCharCode(65 + rng.int(0, 25))}${rng.int(10, 99)}`;
  const minutesUntil = 24 * 60 + time - clock - elapsed;
  const hours = Math.floor(minutesUntil / 60);
  return (
    <div className={styles.root}>
      <div className={styles.ok}>
        <div className={styles.badge}><Icon name="check" size={34} stroke={3.2} /></div>
        <h1>You&rsquo;re all set</h1>
        <p>Confirmation {reference} sent to your email</p>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHero} style={{ background: `linear-gradient(145deg, ${venue.from}, ${venue.to})` }}>
          <b>{venue.name}</b>
          <span>{venue.cuisine} · {venue.hood}</span>
        </div>
        <div className={styles.facts}>
          <div className={styles.fact}><small>Date</small><b>{formatDate(bookedDay).replace(/^(\w{3})\w*, (\w{3})\w* /, "$1, $2 ")}</b></div>
          <div className={styles.fact}><small>Time</small><b>{formatTime(time)}</b></div>
          <div className={styles.fact}><small>Party</small><b>{party} people</b></div>
        </div>
        <div className={styles.addr}><Icon name="pin" size={20} stroke={1.9} /><div>{venue.street}<small>New York, NY 100{rng.int(10, 14)}</small></div></div>
        <div className={styles.countdown}>Reservation in {hours}h {minutesUntil % 60}m</div>
      </div>
      <div className={styles.actions}>
        <div className={styles.action}><Icon name="calendar" size={22} stroke={1.8} />Add to Calendar</div>
        <div className={styles.action}><Icon name="arrow" size={22} stroke={1.8} />Get directions</div>
        <div className={styles.action}><Icon name="share" size={22} stroke={1.8} />Share with guests</div>
        <div className={styles.action} data-danger="true"><Icon name="close" size={22} stroke={1.8} />Cancel reservation</div>
      </div>
    </div>
  );
}

export function TableScreen(props: ScreenProps) {
  return props.view === "confirmed" ? <Confirmed {...props} /> : <Search {...props} />;
}

const table: CloneDefinition = {
  Screen: TableScreen,
  fixtures: [
    { view: "search", label: "friday dinner hunt", seed: 3, clock: 16 * 60 + 40, duration: 6 },
    { view: "search", label: "lunch meeting", seed: 9, clock: 10 * 60 + 15, duration: 4 },
    { view: "confirmed", label: "just booked", seed: 3, clock: 16 * 60 + 52, duration: 3 },
  ],
};

export default table;
