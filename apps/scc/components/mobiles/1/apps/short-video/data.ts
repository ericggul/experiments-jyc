import { createRng, hash } from "../../model/rng";

const base = "/images/mobiles/feeds";
export const clipSrc = (name: string) => `${base}/${name}.webp`;

/** Local stills that crop well to a tall frame. */
const stills: readonly { img: string; alt: string }[] = [
  { img: "clip-01", alt: "A person in a raincoat crossing a wet intersection at night" },
  { img: "clip-02", alt: "A man standing on a rooftop above the city at sunset" },
  { img: "clip-03", alt: "Raindrops on a window with blurred city lights behind" },
  { img: "clip-04", alt: "A train pulling into an elevated station" },
  { img: "clip-05", alt: "Two dogs resting on autumn leaves in a park" },
  { img: "clip-06", alt: "A man in front of a late-night street food cart" },
  { img: "clip-07", alt: "Dancers rehearsing on a dimly lit stage" },
  { img: "clip-08", alt: "A person walking along a beach with a surfboard at sunset" },
  { img: "story-01", alt: "A steaming mug by a sunlit window" },
  { img: "story-02", alt: "Two friends on a roof looking over the city" },
  { img: "story-03", alt: "A bridge across the river at dusk" },
  { img: "story-04", alt: "A park bench under autumn trees" },
  { img: "post-01", alt: "A latte with foam art on a cafe table" },
  { img: "post-02", alt: "A pizza on a dark wooden table" },
  { img: "post-03", alt: "A cat asleep on a sofa" },
  { img: "post-05", alt: "A street intersection seen from above" },
  { img: "post-06", alt: "A woman on a staircase in front of a tall bookshelf" },
  { img: "post-07", alt: "A bowl of ramen with chopsticks" },
  { img: "post-08", alt: "A dog looking straight at the camera" },
  { img: "post-10", alt: "A bar with a neon sign behind it" },
];

const names = ["mara", "jules", "theo", "dani", "kofi", "rae", "luz", "ines", "omar", "bex", "nico", "sasha", "pri", "leo", "tash", "wes", "ama", "jun", "cass", "remy"];
const tails = [".walks", ".eats", "_nyc", ".bk", ".after.dark", "inqueens", ".daily", "_irl", ".lofi", ".thrifts", "cooks", ".runs", ".diaries", "_uptown"];
export const handleFor = (n: number) => `${names[n % names.length]}${tails[Math.floor(n / names.length) % tails.length]}`;

const hoods = ["Bushwick", "Astoria", "the LES", "Harlem", "Red Hook", "Jackson Heights", "Ridgewood", "Dumbo", "Sunset Park", "the West Village", "Flushing", "Greenpoint", "Inwood", "Crown Heights"];
const foods = ["bacon egg and cheese", "dollar slice", "chopped cheese", "bagel", "dumpling spot", "halal cart", "taco truck", "bodega coffee", "ramen", "cannoli"];
const povs = [
  "you said one episode at 11", "your landlord texts 'quick question'", "the express turns local at 59th", "you finally got the window seat on the ferry",
  "your upstairs neighbor discovered furniture at 1am", "the bodega cat chose you", "you missed the train by one second", "it's 72 degrees in October",
  "your roommate's 'quick shower' was 40 minutes", "you moved here with two suitcases", "you tried to cross Canal at 5pm", "the group chat wants brunch at 10",
];
const takes = [
  "the 7 is the best train and I will not be taking questions", "pizza is better folded", "Queens has the best food in the city",
  "nobody needs a car here", "summer here is overrated, fall is everything", "the ferry is the most underrated commute",
  "brunch lines are not worth it", "bagels should be toasted, fight me", "walking 30 blocks is a normal distance",
];
const challenges = ["walking every street in Manhattan", "trying every bagel in Brooklyn", "cooking only from the bodega", "running before work", "saying yes to everything", "no takeout"];
const songs = ["Golden Hour (slowed)", "Night Shift", "Uptown Rain", "Salt Air", "Static Love", "Ferry Lights", "Slow Down Sunday", "Platform 4", "Paper Moon", "Heatwave Radio", "Blue Hour", "Corner Store"];
const artists = ["Teo Lang", "Wren Alder", "The Low Tides", "Mira K.", "June & the Fog", "Saint Grove", "Kai Monroe", "Velvet Crane", "Dot Hayes"];
const tagPool = ["#nyc", "#fyp", "#brooklyn", "#queens", "#foodtok", "#commute", "#fall", "#citylife", "#pov", "#dogsoftiktok", "#nightout", "#lofi", "#subway", "#thrift", "#runclub", "#rent", "#apartmenttour", "#bodegacat"];

export type Clip = {
  id: string;
  handle: string;
  /** Photo still, or null for a text-on-colour clip. */
  img: string | null;
  alt: string;
  /** Big text for text clips, or the on-video text sticker. */
  overlay: string | null;
  caption: string;
  tags: string;
  sound: string;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  hue: number;
  sponsored: boolean;
  following: boolean;
};

function captionFor(rng: ReturnType<typeof createRng>): { caption: string; overlay: string | null } {
  const hood = rng.pick(hoods);
  switch (rng.int(0, 8)) {
    case 0: return { caption: `pov: ${rng.pick(povs)}`, overlay: null };
    case 1: return { caption: `rating every ${rng.pick(foods)} in ${hood} pt. ${rng.int(2, 19)}`, overlay: `${rng.int(4, 9)}.${rng.int(0, 9)}/10` };
    case 2: return { caption: `day ${rng.int(3, 180)} of ${rng.pick(challenges)}`, overlay: `day ${rng.int(3, 180)}` };
    case 3: return { caption: `things nobody tells you about living in ${hood}`, overlay: `${rng.int(3, 9)} things about ${hood}` };
    case 4: return { caption: `${hood} at ${rng.int(5, 11)}${rng.pick(["am", "pm"])} hits different`, overlay: null };
    case 5: return { caption: `$${rng.int(18, 60) * 100}/month in ${hood}. full tour`, overlay: "apartment tour" };
    case 6: return { caption: `unpopular opinion: ${rng.pick(takes)}`, overlay: null };
    case 7: return { caption: `what I spend in a day in ${hood}`, overlay: `$${rng.int(12, 140)}.${rng.int(10, 99)}` };
    default: return { caption: `the ${rng.pick(foods)} that ended my diet (${hood})`, overlay: null };
  }
}

/** Clip `index` of a scene: every field is drawn from the seed, so neighbouring phones differ. */
export function clipAt(seed: number, index: number): Clip {
  const rng = createRng(hash(seed, "clip", index));
  const text = rng.chance(0.22);
  const still = stills[(seed * 7 + index * 3 + rng.int(0, 2)) % stills.length];
  const { caption, overlay } = captionFor(rng);
  const handle = handleFor(hash(seed, index) % (names.length * tails.length));
  const tags = Array.from({ length: rng.int(1, 3) }, () => rng.pick(tagPool));
  return {
    id: `clip-${index}`,
    handle,
    img: text ? null : still.img,
    alt: text ? "" : still.alt,
    overlay: text ? caption.replace(/^unpopular opinion: /, "unpopular opinion:\n") : overlay,
    caption,
    tags: [...new Set(tags)].join(" "),
    sound: rng.chance(0.45) ? `original sound - ${handle}` : `${rng.pick(songs)} - ${rng.pick(artists)}`,
    likes: Math.round(10 ** rng.range(2.4, 6.6)),
    comments: Math.round(10 ** rng.range(1.2, 4.6)),
    saves: Math.round(10 ** rng.range(1, 4.4)),
    shares: Math.round(10 ** rng.range(1, 4.6)),
    hue: rng.int(0, 359),
    sponsored: !text && rng.chance(0.06),
    following: rng.chance(0.2),
  };
}

const commenters = ["jess", "dan_o", "priyaaa", "tomasz", "ellie", "marcus", "nina", "devon", "sam", "ava", "cal", "rosa", "ben", "tess", "kayla", "hugo"];
const commentTails = ["", ".nyc", "_22", ".k", "bk", "_x", ".m"];
const lines = [
  "why is this the most relaxing thing I've seen all week", "me at 1am promising I'll sleep after this one", "wait where is this?? need to go",
  "the sound makes it", "sent this to my whole group chat", "I've watched this 9 times", "okay but the lighting", "algorithm knows exactly what time it is",
  "screen time is up and I don't care", "not me crying over this", "this is why I live in this city", "ok that's actually so good", "first comment, finally",
  "said just one more and it's been two hours", "this is literally my block", "the way I gasped", "part 2 please", "how is this free",
  "my landlord could never", "booking it for saturday", "I walk past this every day and never knew", "the caption killed me", "need the recipe",
  "who else is up", "manifesting this apartment", "nah because this is so real", "following for part 3",
];

export type Comment = { id: string; name: string; text: string; likes: number; age: string; replies: number };

export function commentsFor(seed: number, clip: number, count: number): Comment[] {
  const rng = createRng(hash(seed, "comments", clip));
  return Array.from({ length: count }, (_, i) => ({
    id: `c-${clip}-${i}`,
    name: `${rng.pick(commenters)}${rng.pick(commentTails)}`,
    text: rng.pick(lines),
    likes: Math.round(10 ** rng.range(0.3, 4)),
    age: rng.pick(["2m", "8m", "23m", "1h", "3h", "5h", "1d", "3d"]),
    replies: rng.chance(0.3) ? rng.int(2, 60) : 0,
  }));
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function avatarGradient(index: number): string {
  const hue = (index * 47 + 12) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 50) % 360} 70% 40%))`;
}

export const clipBackground = (hue: number) => `linear-gradient(160deg, hsl(${hue} 62% 46%), hsl(${(hue + 70) % 360} 58% 26%))`;
