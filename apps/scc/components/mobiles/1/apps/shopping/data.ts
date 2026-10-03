import { createRng, hash } from "../../model/rng";

const base = "/images/mobiles/feeds";
export const productSrc = (name: string) => `${base}/${name}.webp`;

type Kind = { noun: string; img?: string; glyph?: string; alt: string; price: number; details: readonly string[]; variants: readonly string[] };

const colors = ["Black", "Sand", "Olive", "Navy", "White", "Rust", "Slate", "Sage", "Charcoal", "Cream"];
const packs = ["Set of 2", "3-Pack", "Pack of 6", "Set of 4"];

/** Generic goods: photographed ones use the local set, the rest are drawn as studio tiles. */
const kinds: readonly Kind[] = [
  { noun: "Low-Top Leather Sneakers", img: "prod-01", alt: "A white low-top sneaker", price: 69, details: ["Cushioned insole", "Rubber cup sole"], variants: ["Size 8", "Size 9", "Size 10", "Size 11"] },
  { noun: "Over-Ear Wireless Headphones", img: "prod-02", alt: "Over-ear headphones on a white surface", price: 89, details: ["40-hour battery", "Active noise canceling"], variants: colors },
  { noun: "Stoneware Coffee Mugs, 14 oz", img: "prod-03", alt: "A white ceramic mug on a counter", price: 29, details: ["Dishwasher safe", "Microwave safe"], variants: packs },
  { noun: "Commuter Backpack 22L", img: "prod-04", alt: "A black and grey backpack on a wall", price: 45, details: ["Fits 16 in laptop", "Water resistant"], variants: colors },
  { noun: "LED Desk Lamp with USB Port", img: "prod-05", alt: "A white table lamp on a wooden table", price: 26, details: ["5 brightness levels", "Touch control"], variants: colors },
  { noun: "Insulated Water Bottle, 32 oz", img: "prod-06", alt: "Three colorful metal water bottles", price: 32, details: ["Keeps cold 24 hours", "Leakproof lid"], variants: packs },
  { noun: "Ceramic Planter with Tray, 8 in", img: "prod-07", alt: "A green plant in a blue ceramic pot", price: 21, details: ["Drainage hole", "Indoor use"], variants: colors },
  { noun: "Fitness Smartwatch, Heart Rate", img: "prod-08", alt: "A black digital smartwatch", price: 55, details: ["7-day battery", "Sleep tracking"], variants: colors },
  { noun: "Merino Crew Socks", glyph: "🧦", alt: "Wool socks", price: 18, details: ["Cushioned sole", "Machine washable"], variants: packs },
  { noun: "Soy Wax Candle, 9 oz", glyph: "🕯️", alt: "A candle", price: 16, details: ["50-hour burn", "Cotton wick"], variants: ["Fig & Cedar", "Sea Salt", "Amber", "Fresh Linen"] },
  { noun: "Compact Travel Umbrella", glyph: "☂️", alt: "An umbrella", price: 19, details: ["Windproof frame", "Auto open"], variants: colors },
  { noun: "Ribbed Knit Scarf", glyph: "🧣", alt: "A knit scarf", price: 24, details: ["Soft acrylic blend", "70 in long"], variants: colors },
  { noun: "Dot Grid Notebook, A5", glyph: "📓", alt: "A notebook", price: 12, details: ["160 pages", "Lay-flat binding"], variants: packs },
  { noun: "Polarized Sunglasses", glyph: "🕶️", alt: "Sunglasses", price: 22, details: ["UV400 lenses", "Includes case"], variants: colors },
  { noun: "Touchscreen Winter Gloves", glyph: "🧤", alt: "Gloves", price: 15, details: ["Fleece lined", "Grip palms"], variants: colors },
  { noun: "Electric Gooseneck Kettle", glyph: "🫖", alt: "A kettle", price: 49, details: ["Temperature presets", "1.0 L"], variants: colors },
  { noun: "Adjustable Dumbbells, Pair", glyph: "🏋️", alt: "Dumbbells", price: 79, details: ["5 to 25 lb", "Quick-change dial"], variants: ["25 lb", "40 lb", "52 lb"] },
  { noun: "Rechargeable Bike Light Set", glyph: "🚲", alt: "A bike light", price: 21, details: ["USB-C charging", "Waterproof"], variants: ["Front + Rear", "Front Only"] },
  { noun: "Cast Iron Skillet, 10 in", glyph: "🍳", alt: "A skillet", price: 27, details: ["Pre-seasoned", "Oven safe"], variants: ["10 in", "12 in", "Set of 2"] },
  { noun: "Wireless Phone Charger Stand", glyph: "🔋", alt: "A charger", price: 23, details: ["15W fast charge", "Case friendly"], variants: colors },
  { noun: "Plush Throw Blanket", glyph: "🛋️", alt: "A blanket", price: 34, details: ["50 × 60 in", "Machine washable"], variants: colors },
  { noun: "Retro Bluetooth Speaker", glyph: "📻", alt: "A speaker", price: 39, details: ["12-hour battery", "Splash proof"], variants: colors },
  { noun: "Houseplant Starter Kit", glyph: "🪴", alt: "A potted plant", price: 28, details: ["Includes soil", "3 plants"], variants: ["Pothos", "Snake Plant", "Fern"] },
  { noun: "Silk Sleep Mask", glyph: "😴", alt: "A sleep mask", price: 14, details: ["Adjustable strap", "Blocks light"], variants: colors },
];

const qualifiers = ["", "", "Classic", "Everyday", "Premium", "Slim", "Heavy-Duty", "Lightweight", "Minimalist"];

export type Product = {
  id: string;
  name: string;
  img: string | null;
  glyph: string;
  alt: string;
  price: number;
  list: number;
  rating: number;
  reviews: number;
  hue: number;
  details: readonly string[];
  badge: string | null;
  bought: number;
};

const cents = [0.99, 0.49, 0.95, 0.0, 0.79];

export function productAt(seed: number, list: string, index: number): Product {
  const rng = createRng(hash(seed, "product", list, index));
  const kind = kinds[(hash(seed, list) + index * 7 + rng.int(0, 5)) % kinds.length];
  const qualifier = rng.pick(qualifiers);
  const price = Math.max(4, Math.floor(kind.price * rng.range(0.6, 1.25))) + rng.pick(cents);
  const off = rng.chance(0.75) ? rng.int(8, 45) : 0;
  return {
    id: `${list}-${index}`,
    name: `${qualifier ? `${qualifier} ` : ""}${kind.noun}, ${rng.pick(kind.variants)}`,
    img: kind.img ?? null,
    glyph: kind.glyph ?? "",
    alt: kind.alt,
    price,
    list: off ? Math.round((price / (1 - off / 100)) * 100) / 100 : price,
    rating: Math.round(rng.range(3.6, 4.9) * 10) / 10,
    reviews: Math.round(10 ** rng.range(1.8, 4.8)),
    hue: rng.int(0, 359),
    details: kind.details,
    badge: rng.weighted([[null, 6], ["Best Seller", 1], ["Limited time deal", 2], ["Overall Pick", 1]] as const),
    bought: rng.chance(0.5) ? rng.pick([50, 100, 200, 500, 1000, 3000]) : 0,
  };
}

const reviewers = ["Jasmine R.", "Mike T.", "Ana P.", "Derek W.", "Keisha L.", "Tom B.", "Lena S.", "Raj K.", "Chris M.", "Olivia D.", "Sam H.", "Nadia F."];
const titles = ["Exactly what I needed", "Great value", "Better than expected", "Solid for the price", "Returned it", "Love it", "Does the job", "Bought a second one", "Not bad, not great", "Perfect for my apartment"];
const texts = [
  "Arrived a day early and works perfectly. Would buy again.", "Smaller than I thought but quality is good.", "My third one. They hold up well with daily use.",
  "Took it on the subway every day for a month, still looks new.", "Color is slightly different from the photos but I like it.", "Packaging was damaged but the item was fine.",
  "Gift for my sister and she loves it.", "Cheaper than the store on my block and same quality.", "Instructions were confusing but it works great now.",
  "Fits perfectly in a small studio.", "Would give 6 stars if I could.", "Stopped working after two weeks, replacement was fast though.",
];

export function reviewsFor(seed: number, product: string, count: number) {
  const rng = createRng(hash(seed, "reviews", product));
  return Array.from({ length: count }, (_, i) => ({
    id: `${product}-review-${i}`,
    name: rng.pick(reviewers),
    stars: rng.weighted([[5, 6], [4, 3], [3, 1], [2, 0.5], [1, 0.5]] as const),
    title: rng.pick(titles),
    text: rng.pick(texts),
    date: `${rng.pick(["August", "September", "October", "July"])} ${rng.int(1, 28)}, 2026`,
  }));
}

export const money = (n: number) => `$${n.toFixed(2)}`;
export const percentOff = (p: Product) => Math.round((1 - p.price / p.list) * 100);
export const reviewCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));
export const tileBackground = (hue: number) => `radial-gradient(circle at 50% 42%, hsl(${hue} 35% 96%), hsl(${hue} 28% 86%))`;

export const queries = ["desk lamp", "rain jacket", "phone stand", "coffee", "gifts under $25", "space heater", "throw blanket", "running shoes", "kitchen", "candles"];

/** "5h 12m" until the deal window closes at `endMinute` (minutes of day, may wrap). */
export function endsIn(clock: number, endMinute: number): string {
  const left = Math.floor((endMinute - clock + 1440) % 1440);
  const h = Math.floor(left / 60);
  const m = left % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
