const base = "/images/mobiles/feeds";
export const productSrc = (name: string) => `${base}/${name}.webp`;

export type Product = { id: string; img: string; alt: string; name: string; price: number; list: number; rating: number; reviews: number };

export const products: readonly Product[] = [
  { id: "sneaker", img: "prod-01", alt: "A single white low-top sneaker", name: "Low-Top Leather Sneakers, White", price: 64.99, list: 89.99, rating: 4.5, reviews: 12840 },
  { id: "headphones", img: "prod-02", alt: "A pair of over-ear headphones on a white surface", name: "Over-Ear Wireless Headphones with Noise Canceling", price: 79.0, list: 129.0, rating: 4.4, reviews: 48210 },
  { id: "mug", img: "prod-03", alt: "A white ceramic coffee mug on a kitchen counter", name: "Stoneware Coffee Mug, 14 oz, Set of 4", price: 28.5, list: 36.0, rating: 4.7, reviews: 6532 },
  { id: "backpack", img: "prod-04", alt: "A black and grey backpack hanging on a wall", name: "Commuter Backpack 22L, Water Resistant", price: 39.99, list: 59.99, rating: 4.6, reviews: 21977 },
  { id: "lamp", img: "prod-05", alt: "A white table lamp on a wooden table", name: "LED Desk Lamp with USB Charging Port", price: 22.49, list: 34.99, rating: 4.3, reviews: 9104 },
  { id: "bottle", img: "prod-06", alt: "Three colorful metal water bottles", name: "Insulated Water Bottle, 32 oz, 3-Pack", price: 34.95, list: 49.95, rating: 4.8, reviews: 33415 },
  { id: "planter", img: "prod-07", alt: "A green plant in a blue ceramic pot", name: "Ceramic Planter with Drainage Tray, 8 in", price: 18.99, list: 24.99, rating: 4.5, reviews: 2871 },
  { id: "watch", img: "prod-08", alt: "A black digital smartwatch with its screen on", name: "Fitness Smartwatch, 1.8 in Display, Heart Rate", price: 49.99, list: 99.99, rating: 4.2, reviews: 15690 },
];

export const money = (n: number) => `$${n.toFixed(2)}`;
export const percentOff = (p: Product) => Math.round((1 - p.price / p.list) * 100);
export const reviewCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

/** "Ends in 5h 12m" until the deal window closes at `endMinute` (minutes of day, may wrap). */
export function endsIn(clock: number, endMinute: number): string {
  const left = (endMinute - clock + 1440) % 1440;
  const h = Math.floor(left / 60);
  const m = left % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
