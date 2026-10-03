export type Clip = { img: string; alt: string; handle: string; caption: string; tags: string; sound: string };

const base = "/images/mobiles/feeds";
export const clipSrc = (name: string) => `${base}/${name}.webp`;

export const clips: readonly Clip[] = [
  { img: "clip-01", alt: "A person in a grey raincoat crossing a wet intersection as an orange car waits", handle: "mara.walks", caption: "nobody warned me the crosswalk on 6th turns into a runway when it rains", tags: "#nyc #rainyday #commute", sound: "original sound - mara.walks" },
  { img: "clip-02", alt: "A man standing on a rooftop edge above the city at sunset", handle: "rooftopjules", caption: "found the one roof in Williamsburg nobody is allowed on. worth it", tags: "#rooftop #goldenhour", sound: "Golden Hour (slowed) - Teo Lang" },
  { img: "clip-03", alt: "Raindrops running down a window with blurred city lights behind", handle: "latenight.lofi", caption: "2am. rain. one more episode", tags: "#cozy #rain #lofi", sound: "rain on glass - latenight.lofi" },
  { img: "clip-04", alt: "A train pulling into an elevated station", handle: "transit.nerd", caption: "the L at 11pm hits different when it is empty", tags: "#subway #nyc #lline", sound: "original sound - transit.nerd" },
  { img: "clip-05", alt: "Two dogs resting on autumn leaves in a park", handle: "biscuit_and_pearl", caption: "they have been like this for 40 minutes. do not move", tags: "#dogsoftiktok #fall", sound: "Sunday Morning - Wren Alder" },
  { img: "clip-06", alt: "A man standing in front of a late-night street food cart", handle: "cartlife.queens", caption: "halal cart guy said this is his 11th year on this corner", tags: "#foodtok #queens", sound: "original sound - cartlife.queens" },
  { img: "clip-07", alt: "Ballerinas rehearsing on a dimly lit stage", handle: "studio.nine", caption: "last run before opening night, my feet are done", tags: "#dance #rehearsal", sound: "Swan Lake (lofi remix) - Mira K." },
  { img: "clip-08", alt: "A person walking along a beach holding a surfboard at sunset", handle: "rockaway.rae", caption: "october is the secret season at Rockaway", tags: "#surf #rockaway #nyc", sound: "Salt Air - The Low Tides" },
];

export const comments: readonly { name: string; text: string }[] = [
  { name: "jess.in.nyc", text: "why is this the most relaxing thing I have seen all week" },
  { name: "dan_o", text: "me at 1am promising I will sleep after this one" },
  { name: "priyaaa.s", text: "wait where is this?? need to go" },
  { name: "tomasz.b", text: "the sound makes it" },
  { name: "ellie_marie", text: "sent this to my whole group chat" },
  { name: "marcus.hall", text: "I have watched this 9 times" },
  { name: "nina.k", text: "okay but the lighting 😭" },
  { name: "devon.reyes", text: "algorithm knows exactly what time it is" },
  { name: "sam.the.baker", text: "my phone says screen time is up and I do not care" },
  { name: "ava.lin", text: "not me crying over a dog" },
  { name: "cal_wright", text: "this is why I live in this city" },
  { name: "rosa.m", text: "ok that is actually so good" },
  { name: "ben.yoon", text: "first comment, finally" },
  { name: "tess.o", text: "bro said just one more and it has been two hours" },
];

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
