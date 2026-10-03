import { Icon, Storyboard, TabBar, type IconName, type Panel, type Session, type Shot, type TabItem } from "../../ios";
import { createRng, hash, type Rng } from "../../model/rng";
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
  { name: "Noodles", icon: "fork", tint: "#3b8ea5" },
  { name: "Burgers", icon: "bag", tint: "#c98a2b" },
  { name: "Healthy", icon: "heart", tint: "#4e9f5a" },
  { name: "Coffee", icon: "clock", tint: "#7a5a43" },
];

type Cuisine = { name: string; nouns: readonly string[]; dishes: readonly string[]; from: string; to: string };

const cuisines: readonly Cuisine[] = [
  { name: "Pizza", nouns: ["Slice House", "Pizzeria", "Pie Co."], from: "#e8683f", to: "#9c2f1d",
    dishes: ["Margherita Pie", "Vodka Slice", "Pepperoni Pie", "White Clam Pie", "Garlic Knots", "Grandma Square", "Caesar Salad", "Meatball Hero"] },
  { name: "Ramen", nouns: ["Ramen Bar", "Noodle House"], from: "#e2b25a", to: "#7d4a24",
    dishes: ["Tonkotsu Ramen", "Spicy Miso Ramen", "Shoyu Ramen", "Pork Buns", "Gyoza (6)", "Karaage", "Cucumber Salad", "Matcha Soft Serve"] },
  { name: "Italian", nouns: ["Trattoria", "Osteria", "Pasta Bar"], from: "#b24a3a", to: "#5a2230",
    dishes: ["Rigatoni alla Vodka", "Cacio e Pepe", "Chicken Parm", "Burrata", "Tiramisu", "Arancini", "Lasagna", "Grilled Branzino"] },
  { name: "Healthy", nouns: ["Bowls", "Greens", "Kitchen"], from: "#7fc16a", to: "#2f6a47",
    dishes: ["Harvest Bowl", "Kale Caesar", "Salmon Poke", "Falafel Bowl", "Quinoa Crunch", "Green Juice", "Avocado Toast", "Miso Tofu Plate"] },
  { name: "Mexican", nouns: ["Taqueria", "Cantina"], from: "#f0a04b", to: "#b24b22",
    dishes: ["Al Pastor Tacos", "Carnitas Burrito", "Chicken Quesadilla", "Elote", "Chips & Guac", "Birria Tacos", "Horchata", "Churros"] },
  { name: "Chinese", nouns: ["Kitchen", "Dumpling House"], from: "#d9453f", to: "#7a1d2a",
    dishes: ["Soup Dumplings", "Scallion Pancake", "Dan Dan Noodles", "General Tso's Chicken", "Mapo Tofu", "Pork Fried Rice", "Sesame Noodles", "Beef Chow Fun"] },
  { name: "American", nouns: ["Burgers", "Grill", "Diner"], from: "#c9873a", to: "#6b3b1c",
    dishes: ["Double Smash", "Bacon Cheeseburger", "Veggie Burger", "Crinkle Fries", "Onion Rings", "Fried Chicken Sandwich", "Black & White Shake", "Mac & Cheese"] },
  { name: "Indian", nouns: ["Curry House", "Tandoor"], from: "#e9a33c", to: "#8f3f1b",
    dishes: ["Chicken Tikka Masala", "Saag Paneer", "Lamb Biryani", "Garlic Naan", "Samosas (2)", "Chana Masala", "Mango Lassi", "Dal Makhani"] },
  { name: "Thai", nouns: ["Thai", "Noodle Bar"], from: "#d2a03a", to: "#5f6b1f",
    dishes: ["Pad See Ew", "Green Curry", "Drunken Noodles", "Khao Soi", "Papaya Salad", "Thai Iced Tea", "Larb Gai", "Tom Yum Soup"] },
  { name: "Deli", nouns: ["Deli", "Bagels", "Appetizing"], from: "#9a7b55", to: "#3f3022",
    dishes: ["Everything Bagel", "Lox Sandwich", "Bacon Egg & Cheese", "Pastrami on Rye", "Black & White Cookie", "Tuna Melt", "Cold Brew", "Matzo Ball Soup"] },
];

const prefixes = [
  "Lucia's", "Golden", "Third Rail", "Blue Door", "Little", "Union", "Corner", "Kinoko", "Nonna's", "Bowery", "Driggs",
  "Mott Street", "Atlantic", "Halsey", "Graham", "Lorimer", "Marcy", "Essex", "Delancey", "Ludlow", "Court Street", "Myrtle",
];
const descriptors = ["House favorite", "Comes with a side", "Spicy option available", "Serves 1–2", "Made to order", "Chef's pick", "Vegetarian", "Popular this week"];
const couriers = ["Marco R.", "Aisha K.", "Devon T.", "Yuki S.", "Luis P.", "Fatima B.", "Kwame A.", "Irina V.", "Jamal H.", "Rosa M."];
const streets = ["Bedford Ave", "Franklin St", "Flushing Ave", "W 83rd St", "Court St", "Nostrand Ave", "E 10th St", "Grand St", "Atlantic Ave", "Broadway"];

type Restaurant = { id: string; name: string; cuisine: Cuisine; eta: number; fee: string; rating: string; reviews: string; promo?: string };

function restaurantAt(seed: number, index: number): Restaurant {
  const rng = createRng(hash(seed, "restaurant", index));
  const cuisine = cuisines[(seed + index * 3 + rng.int(0, 2)) % cuisines.length];
  const name = `${rng.pick(prefixes)} ${rng.pick(cuisine.nouns)}`;
  const eta = rng.int(14, 34);
  return {
    id: `r${index}`,
    name,
    cuisine,
    eta,
    fee: rng.chance(0.3) ? "$0 delivery fee" : `$${rng.int(0, 3)}.${rng.pick(["49", "99"])} delivery fee`,
    rating: (4.1 + rng.next() * 0.8).toFixed(1),
    reviews: `${rng.int(1, 9)}.${rng.int(0, 9)}k`,
    promo: rng.chance(0.35) ? rng.pick(["20% off", "Free item over $25", "$5 off $30", "Buy 1 get 1"]) : undefined,
  };
}

type Dish = { id: string; name: string; note: string; price: number };

function menuOf(restaurant: Restaurant, seed: number): Dish[] {
  const rng = createRng(hash(seed, restaurant.id, "menu"));
  const offset = rng.int(0, 7);
  return Array.from({ length: 12 }, (_, i) => ({
    id: `d${i}`,
    name: i < 8 ? restaurant.cuisine.dishes[(offset + i) % 8] : extras[(offset + i) % extras.length],
    note: rng.pick(descriptors),
    price: rng.int(5, 24) + rng.pick([0, 0.5, 0.95]),
  }));
}

const extras = ["Fountain soda", "Sparkling water", "Side salad", "Chocolate chip cookie", "Seltzer", "Extra sauce cup"];

const money = (value: number) => `$${value.toFixed(2)}`;
const gradient = (c: Cuisine, angle = 135) => `linear-gradient(${angle}deg, ${c.from}, ${c.to})`;

/** Spreads a list of steps across the scene: one shot every 1.35–2.2 simulated minutes. */
function place(steps: readonly Omit<Shot, "at">[], total: number): Shot[] {
  const dwell = Math.min(2.2, Math.max(1.35, total / Math.max(1, steps.length)));
  return steps.map((step, index) => ({ ...step, at: index * dwell }));
}

/* ------------------------------------------------------------------ browse */

const HOME_TOP = 156;
const TAB_BAR = 83;

function Card({ item }: { item: Restaurant }) {
  return (
    <div className={styles.card}>
      <div className={styles.hero} style={{ background: gradient(item.cuisine) }}>
        <Icon name="plate" size={56} stroke={1.2} />
        {item.promo && <span className={styles.promo}>{item.promo}</span>}
      </div>
      <div className={styles.meta}>{item.name}<span className={styles.eta}>{item.eta}–{item.eta + 10} min</span></div>
      <div className={styles.sub}><b>{item.rating}</b> ★ ({item.reviews}) · {item.cuisine.name} · {item.fee}</div>
    </div>
  );
}

function Store({ item, menu }: { item: Restaurant; menu: readonly Dish[] }) {
  return (
    <>
      <div className={styles.storeHero} style={{ background: gradient(item.cuisine, 160) }}><Icon name="plate" size={64} stroke={1.1} /></div>
      <div className={styles.storeInfo}>
        <h1>{item.name}</h1>
        <div className={styles.sub}><b>{item.rating}</b> ★ ({item.reviews}) · {item.cuisine.name} · {item.eta}–{item.eta + 10} min</div>
        <div className={styles.toggle}><span data-on="true">Delivery</span><span>Pickup</span></div>
      </div>
      <h2 className={styles.menuHead}>Popular</h2>
      {menu.map((dish) => (
        <div key={dish.id} className={styles.dish}>
          <div><b>{dish.name}</b><small>{dish.note}</small><span>{money(dish.price)}</span></div>
          <span className={styles.thumb} style={{ background: gradient(item.cuisine, 200) }}><i><Icon name="plus" size={16} stroke={2.6} /></i></span>
        </div>
      ))}
    </>
  );
}

const sizes = [["Regular", 0], ["Large", 3], ["Family", 9]] as const;
const addOns = ["Extra sauce", "Add a drink", "No onions", "Make it spicy", "Side salad", "Extra cheese"];

function ItemSheet({ item, dish, rng }: { item: Restaurant; dish: Dish; rng: Rng }) {
  const size = rng.int(0, 2);
  const picks = [rng.int(0, 5), rng.int(0, 5)];
  return (
    <div className={styles.sheetBody}>
      <div className={styles.sheetArt} style={{ background: gradient(item.cuisine, 120) }}><Icon name="plate" size={48} stroke={1.2} /></div>
      <h2 className={styles.sheetTitle}>{dish.name}</h2>
      <div className={styles.sub}>{dish.note} · {money(dish.price)}</div>
      <div className={styles.optHead}>Size<small>Required</small></div>
      {sizes.map(([label, extra], i) => (
        <div key={label} className={styles.opt}><i data-kind="radio" data-on={i === size} />{label}<span>{extra ? `+$${extra}.00` : ""}</span></div>
      ))}
      <div className={styles.optHead}>Add-ons<small>Optional</small></div>
      {addOns.slice(0, 4).map((label, i) => (
        <div key={label} className={styles.opt}><i data-on={picks.includes(i)} />{label}<span>+$1.50</span></div>
      ))}
    </div>
  );
}

const addButton = (label: string) => <div className={styles.sheetButton}>{label}</div>;

type Line = { id: string; name: string; qty: number; price: number };

function Cart({ item, lines }: { item: Restaurant; lines: readonly Line[] }) {
  const subtotal = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  return (
    <div className={styles.sheetBody}>
      <h2 className={styles.sheetTitle}>Your cart</h2>
      <div className={styles.sub}>{item.name}</div>
      {lines.map((line) => (
        <div key={line.id} className={styles.cartLine}><span className={styles.qtyBox}>{line.qty}</span>{line.name}<b>{money(line.qty * line.price)}</b></div>
      ))}
      <div className={styles.cartLine}>Subtotal<b>{money(subtotal)}</b></div>
    </div>
  );
}

function Checkout({ item, lines, owner, rng }: { item: Restaurant; lines: readonly Line[]; owner: ScreenProps["owner"]; rng: Rng }) {
  const subtotal = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const tip = rng.pick([0.15, 0.18, 0.2]);
  return (
    <>
      <h1 className={styles.pageTitle}>Checkout</h1>
      <div className={styles.group}>
        <div className={styles.field}><Icon name="pin" size={20} stroke={1.9} /><div>{rng.int(20, 480)} {rng.pick(streets)}<small>{owner.home} · Apt {rng.int(1, 6)}{"ABCDF"[rng.int(0, 4)]}</small></div></div>
        <div className={styles.field}><Icon name="clock" size={20} stroke={1.9} /><div>Standard<small>{item.eta}–{item.eta + 10} min</small></div></div>
        <div className={styles.field}><Icon name="card" size={20} stroke={1.9} /><div>Visa •••• {rng.int(1000, 9999)}<small>Personal</small></div></div>
      </div>
      <div className={styles.optHead}>Tip your courier</div>
      <div className={styles.tips}>{[0.15, 0.18, 0.2, 0.25].map((t) => <span key={t} data-on={t === tip}>{Math.round(t * 100)}%</span>)}</div>
      <div className={styles.group}>
        <div className={styles.cartLine}>Subtotal<b>{money(subtotal)}</b></div>
        <div className={styles.cartLine}>Delivery fee<b>{item.fee.startsWith("$0") ? "$0.00" : item.fee.split(" ")[0]}</b></div>
        <div className={styles.cartLine}>Tip<b>{money(subtotal * tip)}</b></div>
        <div className={styles.cartLine}><b>Total</b><b>{money(subtotal * (1.09 + tip) + 2.99)}</b></div>
      </div>
    </>
  );
}

function browseSession(props: ScreenProps): Session {
  const { seed, clock, duration, owner } = props;
  const rng = createRng(hash(seed, "browse"));
  const total = Math.max(4, duration);
  const hour = Math.floor(clock / 60);
  const meal = hour < 11 ? "Breakfast" : hour < 16 ? "Lunch" : "Dinner";
  const list = Array.from({ length: 7 }, (_, i) => restaurantAt(seed, i));
  const picks = [rng.int(1, 3), rng.int(4, 6)];
  const stores = picks.map((i) => list[i]);
  const menus = stores.map((store) => menuOf(store, seed));
  const chosen = [rng.int(0, 3), rng.int(1, 5)];
  const final = total >= 12 ? 1 : 0;
  const lines: Line[] = [
    { id: "l0", name: menus[final][chosen[0]].name, qty: rng.int(1, 2), price: menus[final][chosen[0]].price },
    { id: "l1", name: menus[final][chosen[1] + 2].name, qty: 1, price: menus[final][chosen[1] + 2].price },
  ];
  const head = (
    <>
      <div className={styles.homeHead}>
        <div className={styles.addr}>
          <b><div><small>Deliver now · {owner.home}</small>{rng.int(120, 480)} {rng.pick(streets)}<Icon name="chevronDown" size={14} stroke={2.6} style={{ marginLeft: 4 }} /></div></b>
          <span className={styles.cart}><Icon name="bag" size={20} stroke={1.9} /></span>
        </div>
        <div className={styles.search}><Icon name="search" size={17} stroke={2.2} />Search {meal.toLowerCase()}, cuisines, dishes</div>
      </div>
      <TabBar items={tabs} active="browse" tint={ACCENT} />
    </>
  );
  const storeChrome = (count: number) => (
    <>
      <span className={styles.back}><Icon name="chevronLeft" size={20} stroke={2.6} /></span>
      {count > 0 && <div className={styles.viewCart}>View cart · {count}</div>}
    </>
  );
  const panels: Record<string, Panel> = {
    home: {
      top: HOME_TOP,
      bottom: TAB_BAR,
      chrome: head,
      body: (
        <div className={styles.homeBody}>
          <div className={styles.cats}>
            {categories.map((cat) => (
              <div key={cat.name} className={styles.cat}><span style={{ background: `linear-gradient(145deg, ${cat.tint}, ${cat.tint}bb)` }}><Icon name={cat.icon} size={26} stroke={1.8} /></span>{cat.name}</div>
            ))}
          </div>
          <div className={styles.chips}>
            {["Offers", "Under 30 min", "Rating 4.5+", "$$", "Pickup"].map((label, index) => (
              <span key={label} className={styles.chip} data-on={index === seed % 3}>{label}</span>
            ))}
          </div>
          <h2 className={styles.heading}>{meal} near you</h2>
          {list.map((item) => <Card key={item.id} item={item} />)}
        </div>
      ),
    },
    store0: { chrome: storeChrome(final === 0 ? 0 : 1), body: <Store item={stores[0]} menu={menus[0]} /> },
    item0: { className: styles.sheetPanel, top: 70, chrome: addButton(`Add to cart · ${money(menus[0][chosen[0]].price)}`), body: <ItemSheet item={stores[0]} dish={menus[0][chosen[0]]} rng={createRng(hash(seed, "item0"))} /> },
    cart: { className: styles.sheetPanel, top: 300, chrome: addButton("Go to checkout"), body: <Cart item={stores[final]} lines={lines} /> },
    checkout: { top: 54, chrome: <><span className={styles.back}><Icon name="chevronLeft" size={20} stroke={2.6} /></span>{addButton("Place order")}</>, body: <Checkout item={stores[final]} lines={lines} owner={owner} rng={createRng(hash(seed, "checkout"))} /> },
    placed: {
      body: (
        <div className={styles.placed}>
          <span className={styles.placedBadge}><Icon name="check" size={40} stroke={3} /></span>
          <h1>Order placed</h1>
          <p>{stores[final].name} is confirming your order</p>
          <b>Arriving {formatTime(clock + total + stores[final].eta)}</b>
        </div>
      ),
    },
  };
  if (final === 1) {
    panels.store1 = { chrome: storeChrome(1), body: <Store item={stores[1]} menu={menus[1]} /> };
    panels.item1 = { className: styles.sheetPanel, top: 70, chrome: addButton(`Add to cart · ${money(menus[1][chosen[1] + 2].price)}`), body: <ItemSheet item={stores[1]} dish={menus[1][chosen[1] + 2]} rng={createRng(hash(seed, "item1"))} /> };
  }
  const cardY = (index: number, scroll: number) => Math.min(700, Math.max(240, HOME_TOP + 190 + index * 200 - scroll + 60));
  const dishY = (index: number, scroll: number) => Math.min(760, Math.max(420, 400 + index * 92 - scroll));
  const homeScroll = Math.max(0, (picks[0] - 1) * 200 + 160);
  const steps: Omit<Shot, "at">[] = [
    { panel: "home", enter: "cut", scroll: homeScroll, flicks: 3 },
    { panel: "store0", enter: "push", scroll: Math.min(560, 180 + chosen[0] * 92), flicks: 2, tap: { x: 195, y: cardY(picks[0], homeScroll) } },
    { panel: "item0", enter: "sheet", scroll: 160, tap: { x: 330, y: dishY(chosen[0], Math.min(560, 180 + chosen[0] * 92)) } },
  ];
  if (final === 1) {
    const second = homeScroll + (picks[1] - picks[0]) * 200;
    steps.push(
      { panel: "store0", enter: "dismiss", scroll: 520, flicks: 2, tap: { x: 195, y: 790 } },
      { panel: "home", enter: "pop", scroll: second, flicks: 3, tap: { x: 36, y: 76 } },
      { panel: "store1", enter: "push", scroll: Math.min(560, 180 + (chosen[1] + 2) * 92), flicks: 2, tap: { x: 195, y: cardY(picks[1], second) } },
      { panel: "item1", enter: "sheet", scroll: 200, tap: { x: 330, y: 480 } },
      { panel: "store1", enter: "dismiss", scroll: 600, flicks: 1, tap: { x: 195, y: 790 } },
    );
  } else {
  }
  // A longer session keeps browsing (back to the feed, into a store) before checking out.
  for (let extra = 0; (steps.length + 3) * 2.2 < total; extra++) {
    steps.push({ panel: "home", enter: "pop", scroll: 300 + (extra % 3) * 250, flicks: 2, tap: { x: 36, y: 76 } });
    steps.push({ panel: final === 1 && extra % 2 === 0 ? "store1" : "store0", enter: "push", scroll: 240 + (extra % 2) * 300, flicks: 2, tap: { x: 195, y: 420 } });
  }
  steps.push({ panel: "cart", enter: "sheet", tap: { x: 195, y: 790 } });
  steps.push(
    { panel: "checkout", enter: "push", scroll: 160, tap: { x: 195, y: 790 } },
    { panel: "placed", enter: "fade", tap: { x: 195, y: 790 } },
  );
  return { duration: total, shots: place(steps, total), panels };
}

function Browse(props: ScreenProps) {
  return (
    <div className={styles.root}>
      <Storyboard id={`browse:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => browseSession(props)} />
    </div>
  );
}

/* ---------------------------------------------------------------- tracking */

/** Route polyline in map coordinates (restaurant → door). */
const routes: readonly (readonly (readonly [number, number])[])[] = [
  [[70, 330], [70, 250], [170, 250], [170, 160], [290, 160], [290, 90], [330, 90]],
  [[350, 330], [290, 330], [290, 250], [170, 250], [170, 60], [100, 60]],
  [[40, 160], [170, 160], [170, 250], [290, 250], [290, 330], [330, 330]],
];

function pointAt(route: readonly (readonly [number, number])[], t: number) {
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
const stageAt = (progress: number) => (progress < 0.18 ? 0 : progress < 0.4 ? 1 : progress < 0.8 ? 2 : 3);

type Order = {
  place: Restaurant;
  courier: string;
  route: readonly (readonly [number, number])[];
  lines: Line[];
  placed: number;
  arrive: number;
  total: number;
};

function orderOf({ seed, clock, elapsed, duration }: ScreenProps): Order {
  const rng = createRng(hash(seed, "order"));
  const place = restaurantAt(seed, rng.int(0, 9));
  const menu = menuOf(place, seed);
  const total = Math.max(4, duration);
  const start = clock - elapsed;
  return {
    place,
    courier: rng.pick(couriers),
    route: routes[seed % routes.length],
    lines: Array.from({ length: rng.int(2, 4) }, (_, i) => ({ id: `o${i}`, name: menu[(i * 3 + seed) % 12].name, qty: rng.int(1, 2), price: menu[(i * 3 + seed) % 12].price })),
    placed: start - rng.int(2, 6),
    arrive: start + total,
    total,
  };
}

function MapPanel({ order, stage }: { order: Order; stage: number }) {
  const path = order.route.map((p) => p.join(",")).join(" ");
  const [sx, sy] = order.route[0];
  const [ex, ey] = order.route[order.route.length - 1];
  const first = order.courier.split(" ")[0];
  const status = ["Order confirmed", `${order.place.name} is preparing your order`, `${first} picked up your order`, `${first} is almost there`][stage];
  return (
    <div className={styles.mapWrap}>
      <svg className={styles.map} viewBox="0 0 390 430" aria-hidden="true">
        <rect width="390" height="430" fill="#ebe7df" />
        <rect x="0" y="360" width="390" height="70" fill="#bcd6e6" />
        <rect x="200" y="190" width="70" height="40" rx="4" fill="#cfe3c2" />
        <rect x="10" y="80" width="90" height="60" rx="4" fill="#cfe3c2" />
        {[60, 160, 250, 330].map((y) => <rect key={`h${y}`} x="0" y={y - 6} width="390" height="12" fill="#fff" />)}
        {[70, 170, 290, 350].map((x) => <rect key={`v${x}`} x={x - 6} y="0" width="12" height="360" fill="#fff" />)}
        <polyline points={path} fill="none" stroke={ACCENT} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" opacity="0.35" />
        <circle cx={sx} cy={sy} r="9" fill="#fff" stroke={ACCENT} strokeWidth="3" />
        <circle cx={ex} cy={ey} r="10" fill="#111" />
      </svg>
      <div className={styles.sheet}>
        <div className={styles.grab} />
        <div className={styles.etaRow}>
          <div>
            <div className={styles.etaBig}>{formatTime(order.arrive)}</div>
            <div className={styles.status}>{status}</div>
          </div>
          <div className={styles.sub}>Estimated arrival</div>
        </div>
        <div className={styles.bar}>{stepNames.map((name, index) => <i key={name} data-done={index <= stage} />)}</div>
        <div className={styles.steps}>
          {stepNames.map((name, index) => (
            <div key={name} className={styles.step} data-state={index < stage ? "done" : index === stage ? "now" : "todo"}>
              <span className={styles.node}>{index < stage && <Icon name="check" size={13} stroke={3.4} />}</span>
              {name}
              <span className={styles.stepTime}>{index <= stage ? formatTime(order.placed + Math.round(index * (order.arrive - order.placed) * 0.25)) : ""}</span>
            </div>
          ))}
        </div>
        <div className={styles.courier}>
          <span className={styles.face}>{order.courier.split(" ").map((p) => p[0]).join("")}</span>
          <div>{order.courier}<small>Your courier · 4.9 ★</small></div>
          <span className={styles.round}><Icon name="bubble" size={19} stroke={1.9} /></span>
          <span className={styles.round}><Icon name="phone" size={19} stroke={1.9} /></span>
        </div>
      </div>
    </div>
  );
}

const courierLines = [
  ["Hi! Picked up your order from {place}", "Thanks so much!"],
  ["On my way now, traffic is light", "Perfect, buzzer is {apt}"],
  ["Is it the side door or the lobby?", "Lobby please, doorman will let you up"],
  ["Few minutes out", "👍"],
];

function Chat({ order, owner, rng }: { order: Order; owner: ScreenProps["owner"]; rng: Rng }) {
  const apt = `${rng.int(1, 6)}${"ABCD"[rng.int(0, 3)]}`;
  const lines = courierLines.slice(0, 2 + rng.int(1, 2)).flatMap(([them, me], i) => [
    { id: `t${i}`, from: "them", text: them.replace("{place}", order.place.name) },
    { id: `m${i}`, from: "me", text: me.replace("{apt}", apt) },
  ]);
  return (
    <div className={styles.chat}>
      <div className={styles.chatNote}>Chat with {order.courier.split(" ")[0]} · delivering to {owner.home}</div>
      {lines.map((line) => <div key={line.id} className={styles.bubble} data-from={line.from}>{line.text}</div>)}
    </div>
  );
}

function Details({ order }: { order: Order }) {
  const subtotal = order.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  return (
    <div className={styles.sheetBody}>
      <h2 className={styles.sheetTitle}>Order details</h2>
      <div className={styles.sub}>{order.place.name} · placed {formatTime(order.placed)}</div>
      {order.lines.map((line) => (
        <div key={line.id} className={styles.cartLine}><span className={styles.qtyBox}>{line.qty}</span>{line.name}<b>{money(line.qty * line.price)}</b></div>
      ))}
      <div className={styles.cartLine}>Subtotal<b>{money(subtotal)}</b></div>
      <div className={styles.cartLine}>Fees & tax<b>{money(subtotal * 0.12 + 2.99)}</b></div>
      <div className={styles.cartLine}><b>Total</b><b>{money(subtotal * 1.32 + 2.99)}</b></div>
    </div>
  );
}

function trackingShots(order: Order): Shot[] {
  const total = order.total;
  const shots: Shot[] = [];
  const stageFor = (t: number) => stageAt(t / total);
  let t = 0;
  let detour = 0;
  shots.push({ panel: `map${stageFor(0)}`, at: 0, enter: "cut" });
  t += 2;
  while (t < total - 1.8) {
    const kind = detour % 2;
    detour++;
    if (kind === 0) {
      shots.push({ panel: "details", at: t, enter: "sheet", scroll: 120, tap: { x: 195, y: 470 } });
      t += 1.8;
      shots.push({ panel: `map${stageFor(t)}`, at: t, enter: "dismiss", tap: { x: 195, y: 330 } });
    } else {
      shots.push({ panel: "chat", at: t, enter: "push", scroll: 140, tap: { x: 304, y: 730 } });
      t += 2;
      shots.push({ panel: `map${stageFor(t)}`, at: t, enter: "pop", tap: { x: 34, y: 76 } });
    }
    t += 2;
  }
  shots.push({ panel: "arrived", at: Math.max(t, total - 1.6), enter: "fade" });
  return shots;
}

function trackingSession(props: ScreenProps, order: Order): Session {
  const shots = trackingShots(order);
  const panels: Record<string, Panel> = {};
  for (const shot of shots) {
    const match = /^map(\d)$/.exec(shot.panel);
    if (match && !panels[shot.panel]) {
      panels[shot.panel] = { chrome: <span className={styles.back}><Icon name="chevronLeft" size={20} stroke={2.6} /></span>, body: <MapPanel order={order} stage={Number(match[1])} /> };
    }
  }
  panels.details = { className: styles.sheetPanel, top: 300, body: <Details order={order} /> };
  panels.chat = {
    top: 104,
    bottom: 90,
    chrome: (
      <>
        <header className={styles.chatHead}><Icon name="chevronLeft" size={22} stroke={2.4} /><b>{order.courier}</b><Icon name="phone" size={20} stroke={1.9} /></header>
        <div className={styles.composer}>Message {order.courier.split(" ")[0]}</div>
      </>
    ),
    body: <Chat order={order} owner={props.owner} rng={createRng(hash(props.seed, "chat"))} />,
  };
  panels.arrived = {
    body: (
      <div className={styles.placed}>
        <span className={styles.placedBadge}><Icon name="bag" size={38} stroke={2.2} /></span>
        <h1>Your order is here</h1>
        <p>{order.courier.split(" ")[0]} left it with you at {formatTime(order.arrive)}</p>
        <div className={styles.tips}>{["★ 1", "★ 2", "★ 3", "★ 4", "★ 5"].map((label, i) => <span key={label} data-on={i === 4}>{label}</span>)}</div>
      </div>
    ),
  };
  return { duration: order.total, shots, panels };
}

/** Live courier position and minutes left on a map page: re-rendered per tick. */
function TrackingLive({ order, elapsed }: { order: Order; elapsed: number }) {
  const progress = Math.min(1, elapsed / order.total);
  const stage = stageAt(progress);
  const left = Math.max(1, Math.ceil(order.total - elapsed));
  const [cx, cy] = stage < 2 ? order.route[0] : pointAt(order.route, (progress - 0.4) / 0.6);
  return (
    <div className={styles.live}>
      {stage >= 2 && <span className={styles.courierDot} style={{ transform: `translate(${cx - 13}px, ${cy - 13}px)` }} />}
      <span className={styles.etaPill}>{left} min</span>
    </div>
  );
}

function Tracking(props: ScreenProps) {
  const order = orderOf(props);
  return (
    <div className={styles.root}>
      <Storyboard
        id={`tracking:${props.seed}:${props.duration}`}
        elapsed={props.elapsed}
        build={() => trackingSession(props, order)}
        live={(panel) => (panel.startsWith("map") ? <TrackingLive order={order} elapsed={props.elapsed} /> : null)}
      />
    </div>
  );
}

export function BiteScreen(props: ScreenProps) {
  return props.view === "tracking" ? <Tracking {...props} /> : <Browse {...props} />;
}

const bite: CloneDefinition = {
  Screen: BiteScreen,
  fixtures: [
    { view: "browse", label: "lunch scroll", seed: 5, clock: 12 * 60 + 10, duration: 6 },
    { view: "browse", label: "dinner search", seed: 18, clock: 19 * 60 + 25, duration: 14 },
    { view: "tracking", label: "lunch on the way", seed: 5, clock: 12 * 60 + 18, duration: 28 },
    { view: "tracking", label: "dinner arriving", seed: 18, clock: 19 * 60 + 40, duration: 9 },
  ],
};

export default bite;
