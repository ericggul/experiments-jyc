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

const handles = ["maya.eats", "theo.reyes", "juneinbk", "carlos.m", "nora.and.co", "sam.ocean", "lucy_park", "darius.t", "iris.shot", "benji.nyc", "hana.kim", "owen.walks"];
export const handleAt = (i: number) => handles[((i % handles.length) + handles.length) % handles.length];

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString("en-US");
}

export function avatarGradient(index: number): string {
  const hue = (index * 53 + 20) % 360;
  return `linear-gradient(135deg, hsl(${hue} 65% 58%), hsl(${(hue + 45) % 360} 70% 42%))`;
}
