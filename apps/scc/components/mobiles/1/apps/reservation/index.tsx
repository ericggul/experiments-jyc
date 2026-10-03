import { Icon, Storyboard, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatDate, formatTime } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./reservation.module.css";

type Kind = { cuisine: string; make: (name: string) => string; dishes: readonly string[]; from: string; to: string };

const kinds: readonly Kind[] = [
  { cuisine: "Italian", make: (n) => `Osteria ${n}`, from: "#a8452f", to: "#4d1f1b", dishes: ["Cacio e pepe", "Lamb ragù", "Burrata", "Olive oil cake"] },
  { cuisine: "Italian", make: (n) => `Trattoria ${n}`, from: "#9e5b2c", to: "#3f1f12", dishes: ["Rigatoni", "Veal milanese", "Arancini", "Tiramisu"] },
  { cuisine: "French", make: (n) => `Maison ${n}`, from: "#7d5a3a", to: "#2f2218", dishes: ["Steak frites", "Onion soup", "Escargots", "Crème brûlée"] },
  { cuisine: "French", make: (n) => `Brasserie ${n}`, from: "#6b4f61", to: "#2a1d27", dishes: ["Moules frites", "Duck confit", "Niçoise", "Profiteroles"] },
  { cuisine: "Japanese", make: (n) => `Izakaya ${n}`, from: "#3c6a7a", to: "#1b2e3a", dishes: ["Yakitori", "Agedashi tofu", "Chicken karaage", "Uni rice"] },
  { cuisine: "Japanese", make: (n) => `Sushi ${n}`, from: "#2f5a6c", to: "#0f2430", dishes: ["Omakase", "Toro hand roll", "Miso soup", "Hojicha pudding"] },
  { cuisine: "Mexican", make: (n) => `Cantina ${n}`, from: "#d1802e", to: "#7a2c1a", dishes: ["Mole negro", "Fish tacos", "Elote", "Tres leches"] },
  { cuisine: "Greek", make: (n) => `Taverna ${n}`, from: "#3d6fa3", to: "#1a2f4a", dishes: ["Grilled octopus", "Spanakopita", "Lamb chops", "Galaktoboureko"] },
  { cuisine: "American", make: (n) => `${n} Room`, from: "#6a7f55", to: "#27331f", dishes: ["Dry-aged burger", "Roast chicken", "Wedge salad", "Apple pie"] },
  { cuisine: "Seafood", make: (n) => `${n} Oyster Bar`, from: "#3f7f86", to: "#16363f", dishes: ["East coast oysters", "Lobster roll", "Crudo", "Key lime pie"] },
  { cuisine: "Korean", make: (n) => `${n} Pocha`, from: "#a33d4f", to: "#3d1520", dishes: ["Kimchi pancake", "Galbi", "Tteokbokki", "Bingsu"] },
  { cuisine: "Indian", make: (n) => `${n} Table`, from: "#c28a2f", to: "#6a2a12", dishes: ["Butter chicken", "Lamb rogan josh", "Dosa", "Gulab jamun"] },
];

const names = ["Delmar", "Pelletier", "Castillo", "Ume", "Birch", "Juniper", "Marigold", "Fennel", "Olmo", "Sorrel", "Wren", "Ondine", "Lupa", "Cielo", "Haru", "Odessa", "Larkin", "Vesper"];
const hoods = [
  ["West Village", "Bleecker St"], ["East Village", "E 7th St"], ["Tribeca", "Franklin St"], ["Williamsburg", "Wythe Ave"],
  ["Greenpoint", "Manhattan Ave"], ["Murray Hill", "Lexington Ave"], ["Park Slope", "5th Ave"], ["Fort Greene", "DeKalb Ave"],
  ["Lower East Side", "Orchard St"], ["Astoria", "30th Ave"], ["Carroll Gardens", "Court St"], ["Chelsea", "9th Ave"],
  ["Harlem", "Frederick Douglass Blvd"], ["Nolita", "Mulberry St"],
] as const;
const blurbs = [
  "Candlelit room with a long marble bar and a seasonal menu.",
  "Neighborhood favorite with a back garden and natural wine list.",
  "Counter seating facing the open kitchen; walk-ins at the bar.",
  "Family-run spot, famous for weekend crowds and big plates.",
  "Low lights, loud playlist, and a late-night menu after 10 PM.",
];

type Venue = { id: string; name: string; kind: Kind; hood: string; street: string; rating: string; reviews: string; price: string; booked: number };

function venueAt(seed: number, index: number): Venue {
  const rng = createRng(hash(seed, "venue", index));
  const kind = kinds[(seed * 5 + index * 7 + rng.int(0, 3)) % kinds.length];
  const [hood, street] = hoods[(seed + index * 3 + rng.int(0, 2)) % hoods.length];
  return {
    id: `v${index}`,
    name: kind.make(names[(seed * 3 + index * 5 + rng.int(0, 4)) % names.length]),
    kind,
    hood,
    street: `${rng.int(8, 420)} ${street}`,
    rating: (4.2 + rng.next() * 0.7).toFixed(1),
    reviews: rng.int(210, 3400).toLocaleString("en-US"),
    price: "$".repeat(rng.int(2, 4)),
    booked: rng.int(12, 64),
  };
}

const slotsFor = (seed: number, venue: Venue, around: number, count: number) => {
  const rng = createRng(hash(seed, venue.id, "slots"));
  return Array.from({ length: count }, (_, i) => ({ minute: around + (i - 1) * 15 * (count > 4 ? 1 : 2), gone: rng.chance(0.25) }));
};

/** Spreads a list of steps across the scene: one shot every 1.35–2.2 simulated minutes. */
function place(steps: readonly Omit<Shot, "at">[], total: number): Shot[] {
  const dwell = Math.min(2.2, Math.max(1.35, total / Math.max(1, steps.length)));
  return steps.map((step, index) => ({ ...step, at: index * dwell }));
}

const ITEM = 151;
const HEAD = 219;

function Item({ seed, venue, target }: { seed: number; venue: Venue; target: number }) {
  return (
    <div className={styles.item}>
      <div className={styles.tile} style={{ background: `linear-gradient(145deg, ${venue.kind.from}, ${venue.kind.to})` }}><Icon name="plate" size={34} stroke={1.4} /></div>
      <div>
        <div className={styles.name}>{venue.name}</div>
        <div className={styles.stars}><b>★★★★★</b>{venue.rating} ({venue.reviews})</div>
        <div className={styles.line}>{venue.price} · {venue.kind.cuisine} · {venue.hood}</div>
        <div className={styles.hot}><Icon name="bolt" size={12} stroke={2.4} />Booked {venue.booked} times today</div>
      </div>
      <div className={styles.slots}>
        {slotsFor(seed, venue, target, 4).map((slot, i) => <span key={i} className={styles.slot} data-gone={slot.gone}>{formatTime(slot.minute)}</span>)}
      </div>
    </div>
  );
}

function Head({ party, dayWord, target, area, extra }: { party: number; dayWord: string; target: number; area: string; extra?: string }) {
  return (
    <div className={styles.head} style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 }}>
      <h1 className={styles.title}>Table<span>.</span></h1>
      <div className={styles.search}><Icon name="search" size={17} stroke={2.2} />{extra ? `${extra} · ${area}` : `Near ${area}`}</div>
      <div className={styles.chips}>
        <span className={styles.chip}><Icon name="person" size={16} stroke={2} />{party} people</span>
        <span className={styles.chip}><Icon name="calendar" size={16} stroke={2} />{dayWord}</span>
        <span className={styles.chip}><Icon name="clock" size={16} stroke={2} />{formatTime(target)}</span>
      </div>
    </div>
  );
}

const filterGroups = [
  ["Party size", ["1", "2", "3", "4", "5", "6+"]],
  ["Cuisine", ["Italian", "French", "Japanese", "Mexican", "Korean", "Seafood"]],
  ["Price", ["$", "$$", "$$$", "$$$$"]],
  ["Seating", ["Indoor", "Outdoor", "Bar", "Counter"]],
] as const;

function Filters({ party, picks }: { party: number; picks: readonly number[] }) {
  return (
    <div className={styles.sheetBody}>
      <h2 className={styles.sheetTitle}>Filters</h2>
      {filterGroups.map(([label, options], g) => (
        <div key={label}>
          <div className={styles.filterHead}>{label}</div>
          <div className={styles.pills}>
            {options.map((option, i) => <span key={option} data-on={g === 0 ? i === Math.min(5, party - 1) : i === picks[g]}>{option}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Detail({ seed, venue, target, party }: { seed: number; venue: Venue; target: number; party: number }) {
  const rng = createRng(hash(seed, venue.id, "detail"));
  const slots = slotsFor(seed, venue, target, 8);
  return (
    <>
      <div className={styles.detailHero} style={{ background: `linear-gradient(160deg, ${venue.kind.from}, ${venue.kind.to})` }}><Icon name="plate" size={60} stroke={1.1} /></div>
      <div className={styles.detailBody}>
        <h1 className={styles.detailName}>{venue.name}</h1>
        <div className={styles.stars}><b>★★★★★</b>{venue.rating} ({venue.reviews}) · {venue.price} · {venue.kind.cuisine}</div>
        <div className={styles.line}>{venue.street} · {venue.hood}</div>
        <div className={styles.filterHead}>Select a time · {party} people</div>
        <div className={styles.slotGrid}>
          {slots.map((slot, i) => <span key={i} className={styles.slot} data-gone={slot.gone}>{formatTime(slot.minute)}</span>)}
        </div>
        <div className={styles.filterHead}>About</div>
        <p className={styles.about}>{rng.pick(blurbs)}</p>
        <div className={styles.filterHead}>Popular dishes</div>
        <div className={styles.pills}>{venue.kind.dishes.map((dish) => <span key={dish}>{dish}</span>)}</div>
      </div>
    </>
  );
}

function Confirm({ venue, party, time, dayLabel, owner }: { venue: Venue; party: number; time: number; dayLabel: string; owner: Owner }) {
  return (
    <div className={styles.sheetBody}>
      <h2 className={styles.sheetTitle}>Confirm reservation</h2>
      <div className={styles.line}>{venue.name} · {venue.hood}</div>
      <div className={styles.facts}>
        <div className={styles.fact}><small>Date</small><b>{dayLabel}</b></div>
        <div className={styles.fact}><small>Time</small><b>{formatTime(time)}</b></div>
        <div className={styles.fact}><small>Party</small><b>{party}</b></div>
      </div>
      <div className={styles.filterHead}>Occasion</div>
      <div className={styles.pills}>{["None", "Birthday", "Date night", "Business"].map((label, i) => <span key={label} data-on={i === (party + venue.booked) % 4}>{label}</span>)}</div>
      <div className={styles.filterHead}>Guest</div>
      <div className={styles.line}>{owner.firstName} {owner.lastName} · Mobile •••• {(owner.seed % 9000) + 1000}</div>
    </div>
  );
}

const button = (label: string) => <div className={styles.sheetButton}>{label}</div>;

function searchSession({ seed, clock, duration, owner, day }: ScreenProps): Session {
  const rng = createRng(hash(seed, "search"));
  const total = Math.max(4, duration);
  const party = rng.pick([2, 2, 4, 3, 2, 6]);
  const hour = Math.floor(clock / 60);
  const target = hour < 15 ? (hour < 11 ? 12 * 60 + 30 : 13 * 60) : 19 * 60 + 30;
  const dayWord = clock < 19 * 60 ? "Today" : "Tomorrow";
  const area = hour < 15 ? owner.work : owner.home;
  const first = Array.from({ length: 8 }, (_, i) => venueAt(seed, i));
  const second = Array.from({ length: 8 }, (_, i) => venueAt(seed, i + 10));
  const picks = [0, rng.int(0, 5), rng.int(1, 3), rng.int(0, 3)];
  const extra = filterGroups[3][1][picks[3]];
  const long = total >= 10;
  const firstPick = rng.int(0, 2);
  const secondPick = rng.int(3, 5);
  const finalVenue = second[long ? secondPick : firstPick];
  const time = target + (rng.int(0, 2) - 1) * 15;
  const dayLabel = formatDate(dayWord === "Today" ? day : day + 1).replace(/^(\w{3})\w*, (\w{3})\w* /, "$1, $2 ");
  const list = (venues: readonly Venue[]) => <div className={styles.list}>{venues.map((venue) => <Item key={venue.id} seed={seed} venue={venue} target={target} />)}</div>;
  const panels: Record<string, Panel> = {
    results: { className: styles.grouped, top: HEAD, chrome: <Head party={party} dayWord={dayWord} target={target} area={area} />, body: list(first) },
    filters: { className: styles.sheetPanel, top: 250, chrome: button(`Show ${rng.int(24, 140)} restaurants`), body: <Filters party={party} picks={picks} /> },
    results2: { className: styles.grouped, top: HEAD, chrome: <Head party={party} dayWord={dayWord} target={target} area={area} extra={extra} />, body: list(second) },
    detail0: { chrome: <span className={styles.back}><Icon name="chevronLeft" size={20} stroke={2.6} /></span>, body: <Detail seed={seed} venue={second[firstPick]} target={target} party={party} /> },
    confirm: { className: styles.sheetPanel, top: 330, chrome: button("Complete reservation"), body: <Confirm venue={finalVenue} party={party} time={time} dayLabel={dayLabel} owner={owner} /> },
    booked: {
      body: (
        <div className={styles.done}>
          <div className={styles.badge}><Icon name="check" size={34} stroke={3.2} /></div>
          <h1>Booked</h1>
          <p>{finalVenue.name}</p>
          <b>{dayLabel} · {formatTime(time)} · {party} people</b>
        </div>
      ),
    },
  };
  if (long) panels.detail1 = { chrome: <span className={styles.back}><Icon name="chevronLeft" size={20} stroke={2.6} /></span>, body: <Detail seed={seed} venue={second[secondPick]} target={target} party={party} /> };
  const rowY = (index: number, scroll: number) => Math.min(780, Math.max(HEAD + 40, HEAD + 10 + index * ITEM + 50 - scroll));
  const s1 = ITEM * 2.5;
  const s2 = Math.min(560, Math.max(0, (firstPick - 1) * ITEM));
  const s3 = Math.min(560, Math.max(0, (secondPick - 1) * ITEM));
  const steps: Omit<Shot, "at">[] = [
    { panel: "results", enter: "cut", scroll: s1, flicks: 3 },
    { panel: "filters", enter: "sheet", tap: { x: 325, y: 190 } },
    { panel: "results2", enter: "dismiss", scroll: s2, flicks: 2, tap: { x: 195, y: 790 } },
    { panel: "detail0", enter: "push", scroll: 160, tap: { x: 195, y: rowY(firstPick, s2) } },
  ];
  if (long) {
    steps.push(
      { panel: "results2", enter: "pop", scroll: s3, flicks: 2, tap: { x: 36, y: 76 } },
      { panel: "detail1", enter: "push", scroll: 360, flicks: 2, tap: { x: 195, y: rowY(secondPick, s3) } },
    );
  }
  // A longer search compares a few more places before committing.
  for (let extra = 0; (steps.length + 2) * 2.2 < total; extra++) {
    steps.push({ panel: "results2", enter: "pop", scroll: 120 + (extra % 3) * 200, flicks: 2, tap: { x: 36, y: 76 } });
    steps.push({ panel: long && extra % 2 === 0 ? "detail1" : "detail0", enter: "push", scroll: 160 + (extra % 2) * 200, flicks: 2, tap: { x: 195, y: 400 } });
  }
  steps.push(
    { panel: "confirm", enter: "sheet", tap: { x: 60 + ((time - target + 15) / 15) * 90, y: 300 } },
    { panel: "booked", enter: "fade", tap: { x: 195, y: 790 } },
  );
  return { duration: total, shots: place(steps, total), panels };
}

function Search(props: ScreenProps) {
  return (
    <div className={styles.root}>
      <Storyboard id={`search:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => searchSession(props)} />
    </div>
  );
}

function confirmedSession({ seed, clock, duration, day, owner }: ScreenProps): Session {
  const rng = createRng(hash(seed, "confirmed"));
  const total = Math.max(4, duration);
  const venue = venueAt(seed, rng.int(0, 20));
  const party = rng.pick([2, 2, 4, 3, 2, 6]);
  const time = rng.pick([18 * 60 + 30, 19 * 60, 19 * 60 + 30, 20 * 60, 20 * 60 + 15]);
  const bookedDay = day + rng.int(1, 3);
  const date = formatDate(bookedDay).replace(/^(\w{3})\w*, (\w{3})\w* /, "$1, $2 ");
  const reference = `T-${rng.int(100, 999)}${String.fromCharCode(65 + rng.int(0, 25))}${rng.int(10, 99)}`;
  const zip = `100${rng.int(10, 14)}`;
  const walk = rng.int(8, 34);
  const friends = ["Maya", "Dev", "Rosa", "Jordan", "Tasha", "Sam", "Nina", "Eli", "Priya", "Theo"];
  const panels: Record<string, Panel> = {
    main: {
      className: styles.grouped,
      body: (
        <>
          <div className={styles.ok}>
            <div className={styles.badge}><Icon name="check" size={34} stroke={3.2} /></div>
            <h1>You&rsquo;re all set</h1>
            <p>Confirmation {reference} sent to your email</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHero} style={{ background: `linear-gradient(145deg, ${venue.kind.from}, ${venue.kind.to})` }}>
              <b>{venue.name}</b>
              <span>{venue.kind.cuisine} · {venue.hood}</span>
            </div>
            <div className={styles.facts}>
              <div className={styles.fact}><small>Date</small><b>{date}</b></div>
              <div className={styles.fact}><small>Time</small><b>{formatTime(time)}</b></div>
              <div className={styles.fact}><small>Party</small><b>{party} people</b></div>
            </div>
            <div className={styles.addr}><Icon name="pin" size={20} stroke={1.9} /><div>{venue.street}<small>New York, NY {zip}</small></div></div>
            <div className={styles.countdown}>Booked at {formatTime(clock - 1)} · free cancellation until {formatTime(time - 120)}</div>
          </div>
          <div className={styles.actions}>
            <div className={styles.action}><Icon name="calendar" size={22} stroke={1.8} />Add to Calendar</div>
            <div className={styles.action}><Icon name="arrow" size={22} stroke={1.8} />Get directions</div>
            <div className={styles.action}><Icon name="share" size={22} stroke={1.8} />Share with guests</div>
            <div className={styles.action}><Icon name="paper" size={22} stroke={1.8} />View menu</div>
            <div className={styles.action} data-danger="true"><Icon name="close" size={22} stroke={1.8} />Cancel reservation</div>
          </div>
          <div style={{ height: 500 }} />
        </>
      ),
    },
    calendar: {
      className: styles.sheetPanel,
      top: 360,
      chrome: button("Add"),
      body: (
        <div className={styles.sheetBody}>
          <h2 className={styles.sheetTitle}>New Event</h2>
          <div className={styles.calRow}><small>Title</small>Dinner at {venue.name}</div>
          <div className={styles.calRow}><small>Starts</small>{date} · {formatTime(time)}</div>
          <div className={styles.calRow}><small>Ends</small>{formatTime(time + 120)}</div>
          <div className={styles.calRow}><small>Location</small>{venue.street}</div>
          <div className={styles.calRow}><small>Alert</small>1 hour before</div>
        </div>
      ),
    },
    directions: {
      chrome: <span className={styles.back}><Icon name="chevronLeft" size={20} stroke={2.6} /></span>,
      body: (
        <>
          <svg className={styles.map} viewBox="0 0 390 460" aria-hidden="true">
            <rect width="390" height="460" fill="#ebe7df" />
            <rect x="230" y="40" width="120" height="90" rx="4" fill="#cfe3c2" />
            {[90, 200, 320, 420].map((y) => <rect key={`h${y}`} x="0" y={y - 6} width="390" height="12" fill="#fff" />)}
            {[60, 180, 300].map((x) => <rect key={`v${x}`} x={x - 6} y="0" width="12" height="460" fill="#fff" />)}
            <polyline points="60,420 60,320 180,320 180,200 300,200 300,90" fill="none" stroke="#c8102e" strokeWidth="5" strokeDasharray="2 9" strokeLinecap="round" />
            <circle cx="60" cy="420" r="9" fill="#007aff" stroke="#fff" strokeWidth="3" />
            <circle cx="300" cy="90" r="11" fill="#c8102e" />
          </svg>
          <div className={styles.route}>
            <b>{walk} min</b>
            <span>Walk from {owner.home === venue.hood ? "home" : owner.work} · {(walk * 0.05).toFixed(1)} mi</span>
            <div className={styles.pills}>{["Walk", "Transit", "Drive", "Bike"].map((mode, i) => <span key={mode} data-on={i === 0}>{mode}</span>)}</div>
          </div>
        </>
      ),
    },
    share: {
      className: styles.sheetPanel,
      top: 430,
      body: (
        <div className={styles.sheetBody}>
          <div className={styles.shareCard}><b>{venue.name}</b><small>{date} at {formatTime(time)} · {party} people</small></div>
          <div className={styles.people}>{[0, 1, 2, 3, 4].map((i) => {
            const name = friends[(seed + i * 3) % friends.length];
            return <span key={i}><i>{name[0]}</i>{name}</span>;
          })}</div>
          <div className={styles.calRow}>Copy link</div>
          <div className={styles.calRow}>Message</div>
        </div>
      ),
    },
    menu: {
      top: 104,
      chrome: <header className={styles.menuHead}><Icon name="chevronLeft" size={22} stroke={2.4} /><b>Menu</b><span /></header>,
      body: (
        <div className={styles.detailBody}>
          {venue.kind.dishes.concat(kinds[(seed + 3) % kinds.length].dishes).map((dish, i) => (
            <div key={i} className={styles.menuRow}><span>{dish}<small>{rng.pick(["Seasonal", "House", "For the table", "Shareable"])}</small></span><b>${rng.int(9, 46)}</b></div>
          ))}
        </div>
      ),
    },
  };
  const steps: Omit<Shot, "at">[] = [
    { panel: "main", enter: "cut", scroll: 160, flicks: 1 },
    { panel: "calendar", enter: "sheet", tap: { x: 120, y: 650 } },
    { panel: "main", enter: "dismiss", scroll: 330, tap: { x: 195, y: 790 } },
    { panel: "directions", enter: "push", tap: { x: 120, y: 420 } },
    { panel: "main", enter: "pop", tap: { x: 36, y: 76 } },
    { panel: "share", enter: "sheet", tap: { x: 120, y: 470 } },
    { panel: "main", enter: "dismiss", scroll: 380, tap: { x: 195, y: 520 } },
    { panel: "menu", enter: "push", scroll: 240, flicks: 2, tap: { x: 120, y: 520 } },
  ];
  // Lingering on the confirmation: back to it, a second look at the route or the menu.
  for (let extra = 0; steps.length * 2.2 < total; extra++) {
    steps.push({ panel: "main", enter: "pop", scroll: 120 + (extra % 2) * 200, tap: { x: 36, y: 76 } });
    steps.push(extra % 2 === 0 ? { panel: "directions", enter: "push", tap: { x: 120, y: 420 } } : { panel: "menu", enter: "push", scroll: 120 + (extra % 3) * 120, tap: { x: 120, y: 520 } });
  }
  return { duration: total, shots: place(steps, total), panels };
}

function Confirmed(props: ScreenProps) {
  return (
    <div className={styles.root}>
      <Storyboard id={`confirmed:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => confirmedSession(props)} />
    </div>
  );
}

export function TableScreen(props: ScreenProps) {
  return props.view === "confirmed" ? <Confirmed {...props} /> : <Search {...props} />;
}

const table: CloneDefinition = {
  Screen: TableScreen,
  fixtures: [
    { view: "search", label: "friday dinner hunt", seed: 3, clock: 16 * 60 + 40, duration: 12 },
    { view: "search", label: "lunch meeting", seed: 9, clock: 10 * 60 + 15, duration: 6 },
    { view: "confirmed", label: "just booked", seed: 3, clock: 16 * 60 + 52, duration: 3 },
    { view: "confirmed", label: "plans for later", seed: 14, clock: 13 * 60 + 5, duration: 12 },
  ],
};

export default table;
