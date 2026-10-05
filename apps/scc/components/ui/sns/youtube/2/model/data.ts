import type { YoutubeTwoComment, YoutubeTwoCreator, YoutubeTwoVideo } from "./types";

function photo(id: string, width = 1280, height = 720) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&h=${height}&q=86`;
}

export const youtubeTwoCreators: YoutubeTwoCreator[] = [
  { id: "kbs", name: "KBS Symphony Orchestra", handle: "@KBS_Symphony_Orchestra", avatar: photo("1520523839897-bd0b52f945a0", 120, 120), subscribers: "268K subscribers" },
  { id: "frame", name: "Frame by Frame", handle: "@framebyframe", avatar: photo("1507003211169-0a1dd7228f2d", 120, 120), subscribers: "1.28M subscribers" },
  { id: "audio", name: "Open Air Audio", handle: "@openairaudio", avatar: photo("1493225457124-a3eb161ffa5f", 120, 120), subscribers: "542K subscribers" },
  { id: "slow", name: "Slow Television", handle: "@slowtelevision", avatar: photo("1488426862026-3ee34a7d66df", 120, 120), subscribers: "89K subscribers" },
  { id: "desk", name: "Desk Study", handle: "@deskstudy", avatar: photo("1500648767791-00dcc994a43e", 120, 120), subscribers: "803K subscribers" },
  { id: "field", name: "Field Notes", handle: "@fieldnotes", avatar: photo("1534528741775-53994a69daeb", 120, 120), subscribers: "376K subscribers" },
  { id: "objects", name: "Ordinary Objects", handle: "@ordinaryobjects", avatar: photo("1519345182560-3f2917c472ef", 120, 120), subscribers: "2.04M subscribers" },
];

export const youtubeTwoVideos: YoutubeTwoVideo[] = [
  {
    id: "mahler-five",
    title: "Mahler: Symphony No. 5 — Adagietto, live from Seoul",
    creatorId: "kbs",
    thumbnail: photo("1507838153414-b4b713384a76"),
    alt: "Orchestra musicians performing under warm concert hall lights",
    duration: "1:14:49",
    views: "182K views",
    published: "3 hours ago",
    description: "A live performance recorded in the concert hall. Programme notes, movement markers, and the full orchestra roster are below.",
    topic: "Classical music",
    progress: 31,
  },
  {
    id: "aqua-score",
    title: "Aqua — a quiet score for an early train",
    creatorId: "audio",
    thumbnail: photo("1519681393784-d120267933ba"),
    alt: "Blue evening light seen through a rain-streaked train window",
    duration: "4:31",
    views: "1.2M views",
    published: "2 years ago",
    description: "A short piece for piano, rain, and the first train of the day.",
    topic: "Music",
  },
  {
    id: "bolero",
    title: "Ravel, Boléro / Markus Stenz and the orchestra",
    creatorId: "kbs",
    thumbnail: photo("1465847899084-d164df4dedc6"),
    alt: "Conductor and orchestra rehearsing in a wooden concert hall",
    duration: "16:48",
    views: "588K views",
    published: "10 months ago",
    description: "An uninterrupted performance with a single, slowly gathering pulse.",
    topic: "Classical music",
    progress: 46,
  },
  {
    id: "kitchen-film",
    title: "A kitchen at 7:12 — no narration, just morning",
    creatorId: "slow",
    thumbnail: photo("1556910103-1c02745aae4d"),
    alt: "Sunlit kitchen shelves with plants and ceramic cups",
    duration: "22:06",
    views: "94K views",
    published: "1 day ago",
    description: "A small domestic film, held at the pace the light asks for.",
    topic: "Ambient",
  },
  {
    id: "city-essay",
    title: "The sound of a city after the last train",
    creatorId: "field",
    thumbnail: photo("1477959858617-67f85cf4f1df"),
    alt: "Wet city street at night with illuminated storefront reflections",
    duration: "18:42",
    views: "482K views",
    published: "3 days ago",
    description: "A field recording essay from the hour when the city starts to speak in smaller voices.",
    topic: "Essays",
    progress: 19,
  },
  {
    id: "tiny-mechanisms",
    title: "Seven tiny mechanisms that make a room work",
    creatorId: "objects",
    thumbnail: photo("1516979187457-637abb4f9353"),
    alt: "Small hand tools arranged on a dark workbench",
    duration: "19:48",
    views: "1.2M views",
    published: "8 days ago",
    description: "Door closers, switches, hinges, and the precise things we only notice when they fail.",
    topic: "Design",
  },
  {
    id: "study-interval",
    title: "90 minutes of deep work with a working typesetter",
    creatorId: "desk",
    thumbnail: photo("1517841905240-472988babdf9"),
    alt: "Desk with a laptop, papers, and a cup of coffee in warm light",
    duration: "1:30:00",
    views: "317K views",
    published: "5 days ago",
    description: "A focused session: page setting, a small break, then the final proof.",
    topic: "Focus",
  },
  {
    id: "night-studio",
    title: "Live now: an open studio session after midnight",
    creatorId: "audio",
    thumbnail: photo("1516280440614-37939bbacd81"),
    alt: "Tape recorder and headphones glowing in a dark studio",
    duration: "LIVE",
    views: "12K watching",
    published: "Started 42 minutes ago",
    description: "Field recordings, questions, and an evolving set with the lights down.",
    topic: "Live",
    live: true,
  },
  {
    id: "screen-print",
    title: "From one ink drawing to a three-colour screen print",
    creatorId: "frame",
    thumbnail: photo("1561214115-f2f134cc4912"),
    alt: "Hands pulling ink across a screen printing frame",
    duration: "14:08",
    views: "764K views",
    published: "1 week ago",
    description: "A complete printing session, including the mistakes worth keeping.",
    topic: "Process",
  },
  {
    id: "coast-train",
    title: "First train to the coast, no itinerary",
    creatorId: "slow",
    thumbnail: photo("1473448912268-2022ce9509d8"),
    alt: "Train travelling through a green hillside towards the coast",
    duration: "31:29",
    views: "96K views",
    published: "1 day ago",
    description: "One camera, a paper ticket, and a day with enough room to change direction.",
    topic: "Travel",
  },
  {
    id: "room-tone",
    title: "How a room tone becomes part of a song",
    creatorId: "audio",
    thumbnail: photo("1524368535928-5b5e00ddc76b"),
    alt: "Studio microphones arranged in a softly lit recording room",
    duration: "11:55",
    views: "211K views",
    published: "6 days ago",
    description: "A listening session about the sound that sits underneath everything else.",
    topic: "Music",
  },
];

export const youtubeTwoChips = ["All", "Music", "Classical music", "Ambient", "Essays", "Design", "Live", "Recently uploaded"];

export const youtubeTwoComments: YoutubeTwoComment[] = [
  { id: "c-1", author: "Jina Han", avatar: photo("1524504388940-b1c1722653e1", 96, 96), body: "The strings at 22:30 are so clear here. Thank you for publishing the whole performance.", published: "2 hours ago", likes: "1.1K" },
  { id: "c-2", author: "Minseo", avatar: photo("1531123897727-8f129e1688ce", 96, 96), body: "I was in the hall and the silence before the final entrance felt even longer than it does on the recording.", published: "1 hour ago", likes: "628" },
  { id: "c-3", author: "Caleb Harris", avatar: photo("1506794778202-cad84cf45f1d", 96, 96), body: "The camera direction is unusually patient. It lets the movement breathe.", published: "47 minutes ago", likes: "402" },
];

export function youtubeTwoCreator(id: string) {
  return youtubeTwoCreators.find((creator) => creator.id === id) ?? youtubeTwoCreators[0];
}

export function youtubeTwoVideo(id: string) {
  return youtubeTwoVideos.find((video) => video.id === id) ?? youtubeTwoVideos[0];
}

export type YoutubeTwoFeedEntry = {
  id: string;
  video: YoutubeTwoVideo;
};

export function repeatYoutubeTwoVideos(
  records: YoutubeTwoVideo[],
  count: number,
  context: string,
): YoutubeTwoFeedEntry[] {
  if (!records.length) return [];
  return Array.from({ length: count }, (_, index) => {
    const video = records[index % records.length];
    return { id: `${context}-${video.id}-${index}`, video };
  });
}
