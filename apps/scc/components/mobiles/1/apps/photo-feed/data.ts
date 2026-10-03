import { createRng, hash } from "../../model/rng";

const base = "/images/mobiles/feeds";
export const photoSrc = (name: string) => `${base}/${name}.webp`;

export type Photo = { img: string; alt: string; place: string; caption: string };

export const posts: readonly Photo[] = [
  { img: "post-01", alt: "A latte with leaf-shaped foam art on a cafe table", place: "Greenpoint, Brooklyn", caption: "monday fuel. the oat flat white at this place is dangerous" },
  { img: "post-02", alt: "A sliced pepperoni and ham pizza on a dark wooden table", place: "Bleecker Street", caption: "two slices and a folded napkin. the only correct lunch" },
  { img: "post-03", alt: "A cat sleeping on a sofa", place: "Home", caption: "she has not moved since 9am and honestly goals" },
  { img: "post-04", alt: "A brunch table with eggs, sausages and sliced ham", place: "Astoria, Queens", caption: "brunch with the people who answer the group chat" },
  { img: "post-05", alt: "Aerial view of a street intersection with crosswalks and cars", place: "Midtown", caption: "everyone in a hurry, nobody going anywhere" },
  { img: "post-06", alt: "A woman standing on a small staircase in front of a tall bookshelf", place: "The Strand", caption: "went in for one book. leaving with seven" },
  { img: "post-07", alt: "A bowl of ramen with chopsticks on a wooden table", place: "East Village", caption: "it is 41 degrees. this is the plan" },
  { img: "post-08", alt: "A dog looking straight at the camera in a park", place: "Prospect Park", caption: "he knows what he did" },
  { img: "post-09", alt: "The Manhattan skyline under a pale sky", place: "Hoboken Waterfront", caption: "the view from the other side" },
  { img: "post-10", alt: "A bar with a neon sign glowing behind it", place: "Lower East Side", caption: "one drink turned into the whole night, as usual" },
];

export const stories: readonly Photo[] = [
  { img: "story-01", alt: "A steaming white mug on a wooden table in front of a sunlit window", place: "", caption: "" },
  { img: "story-02", alt: "Two men on the roof of a tall building looking over the city", place: "", caption: "" },
  { img: "story-03", alt: "A bridge across the river at dusk", place: "", caption: "" },
  { img: "story-04", alt: "A park bench under autumn trees", place: "", caption: "" },
  { img: "clip-02", alt: "A man standing on a rooftop at sunset", place: "", caption: "" },
  { img: "clip-08", alt: "A person carrying a surfboard along the beach at sunset", place: "", caption: "" },
];

/** Every local photo that reads as a personal picture, for both feed and stories. */
const media: readonly { img: string; alt: string }[] = [
  ...posts,
  ...stories,
  { img: "clip-01", alt: "A person in a raincoat crossing a wet intersection at night" },
  { img: "clip-03", alt: "Raindrops on a window with city lights behind" },
  { img: "clip-04", alt: "A train pulling into an elevated station" },
  { img: "clip-05", alt: "Two dogs resting on autumn leaves" },
  { img: "clip-06", alt: "A street food cart at night" },
  { img: "clip-07", alt: "Dancers rehearsing on a dim stage" },
];

const first = ["maya", "theo", "june", "carlos", "nora", "sam", "lucy", "darius", "iris", "benji", "hana", "owen", "tessa", "malik", "ruby", "felix", "zoe", "andre"];
const tails = [".eats", ".reyes", "inbk", ".m", ".and.co", ".ocean", "_park", ".t", ".shot", ".nyc", ".kim", ".walks", "_jpg", ".film"];
export const handleAt = (i: number) => {
  const n = ((i % (first.length * tails.length)) + first.length * tails.length) % (first.length * tails.length);
  return `${first[n % first.length]}${tails[Math.floor(n / first.length) % tails.length]}`;
};

const places = ["Greenpoint, Brooklyn", "Astoria, Queens", "East Village", "Prospect Park", "Lower East Side", "Williamsburg", "Harlem", "Chinatown", "Bed-Stuy", "Long Island City", "Washington Square Park", "Coney Island", "Fort Greene", "Jackson Heights", "Dumbo", "Battery Park", "Red Hook", "Ridgewood, Queens", "Upper West Side", "Governors Island"];
const openers = ["", "", "ok ", "tiny update: ", "not me ", "reminder that ", "finally "];
const bodies = [
  "the oat flat white here is dangerous", "two slices and a folded napkin. the only correct lunch", "brunch with the people who answer the group chat",
  "went in for one book, leaving with seven", "it is 41 degrees. this is the plan", "he knows what he did", "one drink turned into the whole night",
  "photo dump from the weekend", "golden hour on the walk home", "first apartment, first plant, first casualty", "found my new corner table",
  "we said early night. it was not an early night", "the 6 train had a whole saxophone concert today", "fall is here and so am I",
  "my mom visited and we ate our way through queens", "rooftop season is not over until I say so", "sunday reset", "ran 6 miles for this bagel",
  "made the pasta from scratch, cried a little", "late shift, empty streets", "this city is a lot sometimes. still here", "dumplings for dinner three nights in a row",
];
const closers = ["", "", " 🍂", " 🗽", " ☕️", " (again)", " lol", " ✨"];
const quotes = [
  "you're allowed to leave the party early", "drink water, text back, go outside", "nobody is thinking about you as much as you think",
  "the best bagel is the one closest to you", "be the friend who answers the group chat", "rest is productive", "romanticize the commute",
  "say yes to the walk", "you don't need a reason to call your mom", "the train will come",
];
const brands = ["Kettle & Crumb", "North Pier Outfitters", "Lantern Tea Co.", "Stoop Goods", "Cobble Candles"];

export type Post = {
  id: string;
  handle: string;
  place: string;
  /** Null for a text card. */
  img: string | null;
  alt: string;
  quote: string | null;
  hue: number;
  caption: string;
  likes: number;
  comments: number;
  liker: string;
  age: string;
  carousel: number;
  sponsor: string | null;
};

export function postAt(seed: number, index: number): Post {
  const rng = createRng(hash(seed, "post", index));
  const text = rng.chance(0.12);
  const photo = media[(seed * 5 + index * 7 + rng.int(0, 3)) % media.length];
  const sponsor = !text && index > 2 && rng.chance(0.08) ? rng.pick(brands) : null;
  return {
    id: `post-${index}`,
    handle: sponsor ? sponsor.toLowerCase().replace(/[^a-z]+/g, "") : handleAt(hash(seed, index) % 252),
    place: sponsor ? "Sponsored" : rng.pick(places),
    img: text ? null : photo.img,
    alt: text ? "" : photo.alt,
    quote: text ? rng.pick(quotes) : null,
    hue: rng.int(0, 359),
    caption: sponsor ? `${rng.pick(["new fall drop is here", "made in Brooklyn, built for the commute", "your new morning ritual", "free delivery in all five boroughs"])}` : `${rng.pick(openers)}${rng.pick(bodies)}${rng.pick(closers)}`,
    likes: Math.round(10 ** rng.range(1.6, 4.9)),
    comments: rng.int(0, 400),
    liker: handleAt(hash(seed, index, "liker") % 252),
    age: rng.pick(["4 minutes ago", "12 minutes ago", "47 minutes ago", "2 hours ago", "5 hours ago", "9 hours ago", "1 day ago", "2 days ago"]),
    carousel: rng.chance(0.3) ? rng.int(2, 8) : 0,
    sponsor,
  };
}

const stickers = ["monday.", "who's up", "send help", "core memory", "this view tho", "ok bye", "rate my lunch", "day off", "5:45am club", "it's giving fall", "back at it", "guess where"];
const musics = ["Night Shift · Teo Lang", "Ferry Lights · Saint Grove", "Paper Moon · Dot Hayes", "Blue Hour · Kai Monroe", "Salt Air · The Low Tides"];
const polls = [["coffee", "tea"], ["stay in", "go out"], ["bagel", "croissant"], ["subway", "walk"], ["L", "G"]] as const;

export type StoryFrame = {
  id: string;
  img: string | null;
  alt: string;
  hue: number;
  sticker: string | null;
  place: string | null;
  music: string | null;
  poll: readonly [string, string] | null;
  age: string;
};

export function storyFrame(seed: number, author: number, segment: number): StoryFrame {
  const rng = createRng(hash(seed, "story", author, segment));
  const text = rng.chance(0.12);
  const photo = media[(seed * 3 + author * 5 + segment * 2 + rng.int(0, 2)) % media.length];
  const extra = rng.int(0, 4);
  return {
    id: `s-${author}-${segment}`,
    img: text ? null : photo.img,
    alt: text ? "" : photo.alt,
    hue: rng.int(0, 359),
    sticker: text || extra === 0 ? rng.pick(stickers) : null,
    place: extra === 1 ? rng.pick(places) : null,
    music: extra === 2 ? rng.pick(musics) : null,
    poll: extra === 3 ? rng.pick(polls) : null,
    age: `${rng.int(1, 22)}h`,
  };
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString("en-US");
}

export function avatarGradient(index: number): string {
  const hue = (index * 53 + 20) % 360;
  return `linear-gradient(135deg, hsl(${hue} 65% 58%), hsl(${(hue + 45) % 360} 70% 42%))`;
}

export const cardBackground = (hue: number) => `linear-gradient(150deg, hsl(${hue} 55% 62%), hsl(${(hue + 40) % 360} 60% 40%))`;
