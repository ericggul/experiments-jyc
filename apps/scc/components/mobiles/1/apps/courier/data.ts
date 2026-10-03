import { createRng, hash, type Rng } from "../../model/rng";

/** Combinatorial content for the courier clone: stores, streets, customers, orders. */

const storeNames = [
  "Kestrel", "Brightwater", "Marlowe", "Oakline", "Sable", "Tidewell", "Pemberton", "Northgate", "Lantern", "Copper Kettle",
  "Juniper", "Little Ferry", "Saffron Lane", "Two Rivers", "Ironbound", "Blue Door", "Mulberry", "Halcyon", "Red Hook", "Orchard",
] as const;
const cuisines = [
  { kind: "Deli", items: ["Turkey club", "Pastrami on rye", "Egg and cheese", "Chicken cutlet hero", "Iced coffee", "Potato salad"] },
  { kind: "Burrito Co", items: ["Carnitas burrito", "Chips and guac", "Veggie bowl", "Horchata", "Chicken quesadilla", "Elote"] },
  { kind: "Pho", items: ["Beef pho", "Spring rolls", "Banh mi", "Thai iced tea", "Vermicelli bowl", "Chicken pho"] },
  { kind: "Pizza", items: ["Margherita pie", "Pepperoni slice", "Garlic knots", "Caesar salad", "Vodka slice", "Seltzer"] },
  { kind: "Salads", items: ["Harvest bowl", "Kale caesar", "Grain bowl", "Lemonade", "Avocado toast", "Soup of the day"] },
  { kind: "Grill", items: ["Smash burger", "Fries", "Chicken sandwich", "Milkshake", "Onion rings", "Hot dog"] },
  { kind: "Noodle Bar", items: ["Dan dan noodles", "Pork buns", "Cold sesame noodles", "Bok choy", "Wonton soup", "Scallion pancake"] },
  { kind: "Dumplings", items: ["Pork dumplings", "Soup dumplings", "Chive pockets", "Hot and sour soup", "Fried rice", "Cucumber salad"] },
  { kind: "Bagels", items: ["Everything bagel", "Lox spread", "Bacon egg and cheese", "Cold brew", "Black and white cookie", "Tuna melt"] },
  { kind: "Thai Kitchen", items: ["Pad see ew", "Green curry", "Papaya salad", "Sticky rice", "Tom yum", "Pad thai"] },
  { kind: "Halal", items: ["Chicken over rice", "Lamb gyro", "Falafel wrap", "Hummus plate", "Baklava", "Mango juice"] },
  { kind: "Ramen", items: ["Tonkotsu ramen", "Gyoza", "Spicy miso ramen", "Karaage", "Edamame", "Matcha soda"] },
] as const;

const firstNames = [
  "Maya", "Dev", "Sam", "Lena", "Marcus", "Priya", "Tomás", "Aiko", "Jordan", "Chloe", "Andre", "Rosa", "Nadia", "Owen", "Grace",
  "Leo", "Imani", "Ravi", "Hannah", "Diego", "Mei", "Kofi", "Sofia", "Eli", "Zara", "Theo", "Naomi", "Jamal", "Iris", "Felix",
] as const;
const notes = [
  "Leave at door, ring bell.", "Meet at lobby, ask for the desk.", "Hand to customer, call on arrival.", "Gate code {code}, 2nd floor.",
  "Buzz {apt}, door sticks, push hard.", "Leave with doorman.", "Text when outside, baby sleeping.", "Side entrance on the left.",
  "Elevator is out, 4th floor walk-up.", "Please no knocking, dog barks.",
] as const;

/** Map neighbourhoods: vertical avenues (west → east) and horizontal streets (north → south). */
const areas = [
  {
    name: "Downtown Brooklyn",
    avenues: ["Court St", "Smith St", "Hoyt St", "Bond St", "Nevins St", "3rd Ave", "4th Ave", "5th Ave"],
    streets: ["Atlantic Ave", "Pacific St", "Dean St", "Bergen St", "St Marks Ave", "Prospect Pl", "Park Pl", "Sterling Pl", "St Johns Pl", "Lincoln Pl", "Union St", "President St", "Carroll St", "1st St", "2nd St", "3rd St"],
  },
  {
    name: "Astoria",
    avenues: ["21st St", "Crescent St", "29th St", "31st St", "Steinway St", "38th St", "41st St", "44th St"],
    streets: ["Ditmars Blvd", "23rd Ave", "24th Ave", "Astoria Blvd", "30th Ave", "31st Ave", "Broadway", "34th Ave", "35th Ave", "36th Ave", "Northern Blvd", "37th Ave", "38th Ave", "39th Ave", "40th Ave", "41st Ave"],
  },
  {
    name: "Chelsea",
    avenues: ["11th Ave", "10th Ave", "9th Ave", "8th Ave", "7th Ave", "6th Ave", "5th Ave", "Madison Ave"],
    streets: Array.from({ length: 16 }, (_, i) => `W ${33 - i} St`),
  },
  {
    name: "Upper West Side",
    avenues: ["Riverside Dr", "West End Ave", "Broadway", "Amsterdam Ave", "Columbus Ave", "Central Park W", "5th Ave", "Madison Ave"],
    streets: Array.from({ length: 16 }, (_, i) => `W ${96 - i} St`),
  },
  {
    name: "Williamsburg",
    avenues: ["Kent Ave", "Wythe Ave", "Berry St", "Bedford Ave", "Driggs Ave", "Roebling St", "Havemeyer St", "Union Ave"],
    streets: ["N 12th St", "N 11th St", "N 10th St", "N 9th St", "N 8th St", "N 7th St", "N 6th St", "N 5th St", "N 4th St", "N 3rd St", "Metropolitan Ave", "Grand St", "S 1st St", "S 2nd St", "S 3rd St", "S 4th St"],
  },
] as const;

export type Area = (typeof areas)[number];

export type Job = {
  id: string;
  store: string;
  storeAddr: string;
  customer: string;
  dropAddr: string;
  apt: string;
  pay: number;
  tip: number;
  miles: number;
  minutes: number;
  items: { name: string; qty: number }[];
  note: string;
  priority: boolean;
  order: number;
  area: Area;
};

const money = (rng: Rng, lo: number, hi: number) => rng.int(lo * 100, hi * 100) / 100;

export function areaFor(seed: number): Area {
  return areas[hash(seed, "area") % areas.length];
}

export function makeJob(seed: number): Job {
  const rng = createRng(hash(seed, "job"));
  const area = areaFor(seed);
  const cuisine = rng.pick(cuisines);
  const store = `${rng.pick(storeNames)} ${cuisine.kind}`;
  const count = rng.int(2, 4);
  const pool = [...cuisine.items];
  const items = Array.from({ length: count }, () => ({ name: pool.splice(rng.int(0, pool.length - 1), 1)[0], qty: rng.chance(0.25) ? 2 : 1 }));
  const apt = `${rng.int(1, 6)}${rng.pick(["A", "B", "C", "D", "F", "R"])}`;
  const miles = rng.int(6, 48) / 10;
  const tip = money(rng, 1.5, 6.5);
  return {
    id: `job-${seed}`,
    store,
    storeAddr: `${rng.int(12, 480)} ${rng.pick(area.avenues)}`,
    customer: `${rng.pick(firstNames)} ${String.fromCharCode(65 + rng.int(0, 25))}.`,
    dropAddr: `${rng.int(10, 390)} ${rng.pick(area.streets)}`,
    apt,
    pay: Math.round((money(rng, 3.5, 9) + miles * rng.range(0.9, 1.6) + tip) * 100) / 100,
    tip,
    miles,
    minutes: Math.round(8 + miles * rng.range(3.2, 5)),
    items,
    note: rng.pick(notes).replace("{code}", String(rng.int(1000, 9999))).replace("{apt}", apt),
    priority: rng.chance(0.35),
    order: rng.int(1000, 9999),
    area,
  };
}

/** A street grid with a staircase route between two corners. */
export type Geo = {
  xs: number[];
  ys: number[];
  grid: string;
  /** Route corners as [x index, y index]. */
  corners: [number, number][];
  points: [number, number][];
  length: number;
};

export function makeGeo(seed: number): Geo {
  const rng = createRng(hash(seed, "geo"));
  const xs = Array.from({ length: 8 }, (_, i) => i * 56 - 30 + rng.int(-6, 6));
  const ys = Array.from({ length: 16 }, (_, i) => i * 60 - 20 + rng.int(-6, 6));
  const grid = [...xs.map((x) => `M${x} 0V844`), ...ys.map((y) => `M0 ${y}H390`)].join("");
  let x = rng.int(1, 6);
  const corners: [number, number][] = [[x, 13]];
  const rows = [rng.int(9, 11), rng.int(5, 7), rng.int(2, 3)];
  for (const y of rows) {
    corners.push([x, y]);
    if (y === rows[rows.length - 1]) break;
    let next = rng.int(1, 6);
    if (next === x) next = x > 3 ? x - 2 : x + 2;
    x = next;
    corners.push([x, y]);
  }
  const points = corners.map(([cx, cy]) => [xs[cx], ys[cy]] as [number, number]);
  const length = points.slice(1).reduce((sum, p, i) => sum + Math.abs(p[0] - points[i][0]) + Math.abs(p[1] - points[i][1]), 0);
  return { xs, ys, grid, corners, points, length };
}

/** Position along the route at fraction f, the remaining polyline, and the next corner index. */
export function along(geo: Geo, f: number) {
  let remaining = Math.max(0, Math.min(1, f)) * geo.length;
  const pts = geo.points;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
    if (remaining <= seg || i === pts.length - 1) {
      const k = seg ? Math.min(1, remaining / seg) : 1;
      const puck: [number, number] = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
      return { puck, rest: [puck, ...pts.slice(i)], next: i, toNext: seg * (1 - k) };
    }
    remaining -= seg;
  }
  return { puck: pts[pts.length - 1], rest: [pts[pts.length - 1]], next: pts.length - 1, toNext: 0 };
}

/** Turn-by-turn text for the corner the courier is heading to. */
export function instruction(geo: Geo, area: Area, f: number, place: string) {
  const { next, toNext } = along(geo, f);
  const feet = Math.max(50, Math.round((toNext * 6) / 50) * 50);
  const distance = feet >= 1000 ? `${(feet / 5280).toFixed(1)} mi` : `${feet} ft`;
  const pts = geo.points;
  if (next >= pts.length - 1) return { distance, turn: "arrive" as const, text: place };
  const d1 = [pts[next][0] - pts[next - 1][0], pts[next][1] - pts[next - 1][1]];
  const d2 = [pts[next + 1][0] - pts[next][0], pts[next + 1][1] - pts[next][1]];
  const right = d1[0] * d2[1] - d1[1] * d2[0] > 0;
  const [cx, cy] = geo.corners[next + 1];
  const onto = d2[0] === 0 ? area.avenues[cx] : area.streets[cy];
  return { distance, turn: right ? ("right" as const) : ("left" as const), text: onto };
}

export type Trip = { id: string; store: string; at: number; pay: number; tip: number; miles: number; minutes: number; area: string };

export function tripsFor(seed: number, clock: number): Trip[] {
  const rng = createRng(hash(seed, "trips"));
  const count = Math.max(2, Math.min(9, Math.round((clock - 9 * 60) / 45) + rng.int(0, 2)));
  return Array.from({ length: count }, (_, i) => {
    const job = makeJob(hash(seed, "trip", i));
    return { id: `trip-${i}`, store: job.store, at: clock - 12 - i * rng.int(28, 52), pay: job.pay, tip: job.tip, miles: job.miles, minutes: job.minutes, area: job.area.name };
  });
}
