export type SnsMedia = {
  id: string;
  src: string;
  alt: string;
  tone: string;
};

export type SnsPost = {
  id: string;
  author: {
    handle: string;
    name: string;
    avatar: string;
    verified: boolean;
  };
  location: string;
  timeAgo: string;
  media: SnsMedia[];
  caption: string;
  tags: string[];
  likedBy: string;
  likes: number;
  comments: number;
  shares: number;
  firstComment: string;
  audio: string;
};

const photoIds = [
  "1500530855697-b586d89ba3ee",
  "1500534314209-a25ddb2bd429",
  "1492684223066-81342ee5ff30",
  "1494526585095-c41746248156",
  "1518005020951-eccb494ad742",
  "1515886657613-9f3515b0c78f",
  "1500534314209-a25ddb2bd429",
  "1517816743773-6e0fd518b4a6",
  "1500530855697-b586d89ba3ee",
  "1519125323398-675f0ddb6308",
  "1500534314209-a25ddb2bd429",
  "1520975682031-a4e6f9a8ad4a",
  "1500534314209-a25ddb2bd429",
  "1533050487297-09b450131914",
  "1518005020951-eccb494ad742",
  "1500530855697-b586d89ba3ee",
  "1533105079780-92b9be482077",
  "1492684223066-81342ee5ff30",
  "1500534314209-a25ddb2bd429",
  "1517817748493-49ec54a32465",
  "1518005020951-eccb494ad742",
  "1500530855697-b586d89ba3ee",
  "1515886657613-9f3515b0c78f",
  "1533050487297-09b450131914",
] as const;

const subjects = [
  "rain-glossed alley",
  "late checkout room",
  "subway mirror",
  "bakery line",
  "gallery stair",
  "rooftop table",
  "midnight bus window",
  "corner flower stand",
  "hotel lift reflection",
  "weekend market",
  "after-hours studio",
  "train platform",
] as const;

const handles = [
  "min.studio",
  "seo.archive",
  "haeun.daily",
  "juno.rooms",
  "slowplatform",
  "nari.table",
  "kyu.camera",
  "mira.notes",
  "loft.edit",
  "postcard.supply",
  "hanriverwalk",
  "quietindex",
  "yeon.field",
  "cityreceipts",
  "softtraffic",
  "analogafter",
] as const;

const names = [
  "Min Park",
  "Seo Archive",
  "Haeun",
  "Juno",
  "Slow Platform",
  "Nari",
  "Kyu",
  "Mira",
  "Loft Edit",
  "Postcard Supply",
  "Han River Walk",
  "Quiet Index",
  "Yeon",
  "City Receipts",
  "Soft Traffic",
  "Analog After",
] as const;

const locations = [
  "Seongsu-dong",
  "Euljiro 3-ga",
  "Hannam",
  "Mangwon Market",
  "Yeonnam",
  "Ikseon",
  "Noksapyeong",
  "Jongno",
  "Seoul Forest",
  "Hongdae",
  "Sinsa",
  "Samcheong",
  "Gwanghwamun",
  "Mullae",
] as const;

const captions = [
  "kept the first frame because the light looked accidental.",
  "everything was moving except the table.",
  "small errands, good weather, no real plan.",
  "the city looked edited before I touched it.",
  "three stops later the whole color changed.",
  "saved this because it felt like a still from someone else's day.",
  "coffee went cold while the street kept reflecting itself.",
  "the quiet part of the afternoon was the best part.",
  "not a trip, just a better route home.",
  "the elevator mirror did most of the styling.",
  "one more photo before the rain got serious.",
  "looked ordinary in person, better in sequence.",
] as const;

const comments = [
  "this looks like a scene transition",
  "the third slide is the one",
  "save this route",
  "why is this so calm",
  "need this exact light",
  "soft launch of a perfect day",
  "frame two feels expensive",
  "print it",
  "this color story is unreal",
  "quiet but loud",
] as const;

const tags = [
  "daily",
  "seoul",
  "street",
  "weekend",
  "light",
  "archive",
  "slow",
  "analog",
  "room",
  "city",
  "table",
  "walk",
] as const;

const audio = [
  "original audio",
  "soft traffic - city room",
  "near window - edit",
  "late table loop",
  "ambient street tape",
  "sunday camera roll",
] as const;

function imageUrl(photoId: string, seed: number) {
  const width = seed % 3 === 0 ? 1320 : 1080;
  const height = seed % 4 === 0 ? 1500 : 1350;
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=82`;
}

function avatarUrl(seed: number) {
  const photoId = photoIds[(seed * 7 + 3) % photoIds.length];
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=160&h=160&q=80`;
}

function pick<T>(items: readonly T[], seed: number) {
  return items[Math.abs(seed) % items.length];
}

export const snsPosts: SnsPost[] = Array.from({ length: 100 }, (_, index) => {
  const authorIndex = (index * 5 + 2) % handles.length;
  const imageCount = 2 + ((index * 7) % 4);
  const media = Array.from({ length: imageCount }, (_, mediaIndex) => {
    const seed = index * 13 + mediaIndex * 11;
    const subject = pick(subjects, seed);

    return {
      id: `post-${index + 1}-media-${mediaIndex + 1}`,
      src: imageUrl(pick(photoIds, seed), seed),
      alt: `${subject} frame ${mediaIndex + 1}`,
      tone: pick(["warm", "cool", "flash", "grain", "soft"], seed),
    };
  });

  return {
    id: `sns-${String(index + 1).padStart(3, "0")}`,
    author: {
      handle: handles[authorIndex],
      name: names[authorIndex],
      avatar: avatarUrl(index + authorIndex),
      verified: index % 9 === 0 || index % 17 === 0,
    },
    location: pick(locations, index * 3),
    timeAgo: `${(index % 11) + 1}${index % 4 === 0 ? "h" : "m"}`,
    media,
    caption: `${pick(captions, index * 4)} ${index % 5 === 0 ? "No filter, just timing." : ""}`.trim(),
    tags: [pick(tags, index), pick(tags, index + 4), pick(tags, index + 8)],
    likedBy: pick(handles, index + 6),
    likes: 842 + ((index * 137) % 92000),
    comments: 12 + ((index * 19) % 1800),
    shares: 3 + ((index * 11) % 420),
    firstComment: pick(comments, index * 2),
    audio: pick(audio, index * 5),
  };
});
