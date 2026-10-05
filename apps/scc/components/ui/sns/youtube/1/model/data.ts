import type {
  CommentRecord,
  ExploreCollection,
  PlaylistRecord,
  VideoCreator,
  VideoRecord,
} from "./types";

function photo(id: string, width = 1280, height = 720) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&h=${height}&q=84`;
}

export const videoCreators: VideoCreator[] = [
  {
    id: "field-notes",
    name: "Field Notes",
    handle: "@fieldnotesstudio",
    avatar: photo("1534528741775-53994a69daeb", 160, 160),
    subscribers: "684K subscribers",
  },
  {
    id: "counterweight",
    name: "Counterweight",
    handle: "@counterweight",
    avatar: photo("1500648767791-00dcc994a43e", 160, 160),
    subscribers: "1.1M subscribers",
  },
  {
    id: "soft-signal",
    name: "Soft Signal",
    handle: "@softsignal",
    avatar: photo("1544005313-94ddf0286df2", 160, 160),
    subscribers: "328K subscribers",
  },
  {
    id: "mira-choi",
    name: "Mira Choi",
    handle: "@mirachoi",
    avatar: photo("1508214751196-bcfd4ca60f91", 160, 160),
    subscribers: "912K subscribers",
  },
  {
    id: "walk-cycle",
    name: "Walk Cycle",
    handle: "@walkcycle",
    avatar: photo("1506794778202-cad84cf45f1d", 160, 160),
    subscribers: "126K subscribers",
  },
  {
    id: "ordinary-machines",
    name: "Ordinary Machines",
    handle: "@ordinarymachines",
    avatar: photo("1544725176-7c40e5a71c5e", 160, 160),
    subscribers: "2.3M subscribers",
  },
  {
    id: "lina-song",
    name: "Lina Song",
    handle: "@linasong",
    avatar: photo("1527980965255-d3b416303d12", 160, 160),
    subscribers: "486K subscribers",
  },
];

export const videos: VideoRecord[] = [
  {
    id: "night-walk-essay",
    title: "A city after 11pm is a different instrument",
    creatorId: "field-notes",
    thumbnail: photo("1477959858617-67f85cf4f1df"),
    thumbnailAlt: "A city street at night reflected in wet pavement",
    duration: "18:42",
    views: "482K views",
    published: "3 days ago",
    description:
      "A quiet field recording from the hour when delivery bikes, train platforms, and office lights begin sharing the same rhythm. Headphones recommended.",
    tags: ["City", "Essay", "Sound"],
    progress: 38,
    chapters: [
      { id: "night-walk-1", label: "The late train", at: "0:00" },
      { id: "night-walk-2", label: "Light after rain", at: "4:18" },
      { id: "night-walk-3", label: "Leaving the station", at: "11:06" },
    ],
  },
  {
    id: "tape-loop",
    title: "I rebuilt a lost tape loop from three seconds of noise",
    creatorId: "counterweight",
    thumbnail: photo("1516280440614-37939bbacd81"),
    thumbnailAlt: "A cassette recorder beside a window with blue evening light",
    duration: "24:08",
    views: "1.8M views",
    published: "1 week ago",
    description:
      "The repair is less about accuracy than recognizing when a broken sound begins to sing again.",
    tags: ["Music", "Process", "Studio"],
  },
  {
    id: "small-table",
    title: "The small table that changed how I host dinner",
    creatorId: "mira-choi",
    thumbnail: photo("1507504031003-b417219a0fde"),
    thumbnailAlt: "A dinner table set with flowers and glassware",
    duration: "12:16",
    views: "723K views",
    published: "5 days ago",
    description:
      "A table is a choreography device. Here is how a narrower one made every conversation better.",
    tags: ["Home", "Design", "Food"],
  },
  {
    id: "signal-underwater",
    title: "Why underwater cables keep the internet feeling close",
    creatorId: "ordinary-machines",
    thumbnail: photo("1580587771525-78b9dba3b914"),
    thumbnailAlt: "A blue underwater landscape with a diver silhouette",
    duration: "16:04",
    views: "2.4M views",
    published: "2 weeks ago",
    description:
      "A map of the fragile physical routes underneath a thing that feels weightless.",
    tags: ["Technology", "Explainer", "Ocean"],
    progress: 61,
  },
  {
    id: "first-train",
    title: "First train to the coast, no itinerary",
    creatorId: "walk-cycle",
    thumbnail: photo("1473448912268-2022ce9509d8"),
    thumbnailAlt: "A train passing through a green hillside",
    duration: "31:29",
    views: "96K views",
    published: "1 day ago",
    description:
      "One camera, a paper ticket, and a day that did not need a plan.",
    tags: ["Travel", "Slow TV", "Train"],
  },
  {
    id: "designing-quiet",
    title: "Designing quiet interfaces without making them empty",
    creatorId: "soft-signal",
    thumbnail: photo("1558655146-d09347e92766"),
    thumbnailAlt: "A person working at a desk with a bright monitor",
    duration: "14:37",
    views: "357K views",
    published: "6 days ago",
    description:
      "What quietness can do when it is made from decisions rather than fewer controls.",
    tags: ["Design", "Interface", "Talk"],
  },
  {
    id: "kitchen-sun",
    title: "The exact way morning light crosses this kitchen",
    creatorId: "lina-song",
    thumbnail: photo("1556910103-1c02745aae4d"),
    thumbnailAlt: "A sunny kitchen shelf with plants and ceramics",
    duration: "8:54",
    views: "188K views",
    published: "4 days ago",
    description:
      "A small record of one changing room over the course of a week.",
    tags: ["Home", "Film", "Light"],
  },
  {
    id: "late-code",
    title: "I let the weather score a tiny synthesizer for 30 days",
    creatorId: "counterweight",
    thumbnail: photo("1511379938547-c1f69419868d"),
    thumbnailAlt: "A modular synthesizer with colorful cables",
    duration: "21:52",
    views: "943K views",
    published: "3 weeks ago",
    description:
      "Rain, wind, and temperature become a weather instrument with a very narrow vocabulary.",
    tags: ["Music", "Code", "Experiment"],
  },
  {
    id: "live-room",
    title: "Live now: the room tone session",
    creatorId: "field-notes",
    thumbnail: photo("1524368535928-5b5e00ddc76b"),
    thumbnailAlt: "A softly lit room with studio microphones",
    duration: "LIVE",
    views: "12K watching",
    published: "Started 42 minutes ago",
    description:
      "An open studio transmission: field recordings, questions, and a changing evening light.",
    tags: ["Live", "Sound", "Studio"],
    live: true,
  },
  {
    id: "paper-map",
    title: "A paper map of every convenience store I loved",
    creatorId: "mira-choi",
    thumbnail: photo("1524666041070-9d87656c25bb"),
    thumbnailAlt: "A paper map spread across a table with a pencil",
    duration: "10:21",
    views: "511K views",
    published: "2 days ago",
    description:
      "The map is inaccurate in the useful ways: it keeps feelings, not routes.",
    tags: ["City", "Drawing", "Story"],
  },
  {
    id: "small-objects",
    title: "Seven ordinary objects that hide precise engineering",
    creatorId: "ordinary-machines",
    thumbnail: photo("1516979187457-637abb4f9353"),
    thumbnailAlt: "A collection of small tools arranged on a workbench",
    duration: "19:48",
    views: "1.2M views",
    published: "8 days ago",
    description:
      "A close look at small mechanisms that disappear exactly because they work so well.",
    tags: ["Engineering", "Objects", "Explainer"],
  },
  {
    id: "bread-window",
    title: "Baking before the first streetlight turns off",
    creatorId: "lina-song",
    thumbnail: photo("1509440159596-0249088772ff"),
    thumbnailAlt: "Fresh bread on a wooden table in window light",
    duration: "13:03",
    views: "276K views",
    published: "1 week ago",
    description:
      "A recipe, but mostly a record of getting up before the room begins asking for things.",
    tags: ["Food", "Morning", "Film"],
  },
];

export const commentThreads: CommentRecord[] = [
  {
    id: "comment-nari",
    author: "Nari Lee",
    avatar: photo("1531123897727-8f129e1688ce", 96, 96),
    body: "The sound of the crosswalk at 6:14 made the whole walk feel suddenly close. I replayed that part twice.",
    published: "2 days ago",
    likes: "4.2K",
    replies: [
      {
        id: "comment-nari-reply",
        author: "Field Notes",
        avatar: photo("1534528741775-53994a69daeb", 96, 96),
        body: "It was almost removed. Glad it stayed.",
        published: "1 day ago",
        likes: "846",
      },
    ],
  },
  {
    id: "comment-tae",
    author: "Tae Park",
    avatar: photo("1502823403499-6ccfcf4fb453", 96, 96),
    body: "This is the first city video in a while that leaves enough air around the city. Thank you for that.",
    published: "3 days ago",
    likes: "1.8K",
  },
  {
    id: "comment-mari",
    author: "Mari S.",
    avatar: photo("1494790108377-be9c29b29330", 96, 96),
    body: "Headphones were the right instruction. The train door and the rain are mixed so beautifully.",
    published: "3 days ago",
    likes: "931",
  },
  {
    id: "comment-daniel",
    author: "Daniel Kim",
    avatar: photo("1507003211169-0a1dd7228f2d", 96, 96),
    body: "Would love a longer cut with no narration someday.",
    published: "4 days ago",
    likes: "476",
  },
];

export const playlists: PlaylistRecord[] = [
  {
    id: "watch-later",
    title: "Watch later",
    count: 28,
    thumbnail: videos[1].thumbnail,
    thumbnailAlt: videos[1].thumbnailAlt,
    updated: "Updated today",
  },
  {
    id: "late-notes",
    title: "Late notes",
    count: 14,
    thumbnail: videos[0].thumbnail,
    thumbnailAlt: videos[0].thumbnailAlt,
    updated: "Updated yesterday",
  },
  {
    id: "make-a-room",
    title: "Make a room",
    count: 9,
    thumbnail: videos[2].thumbnail,
    thumbnailAlt: videos[2].thumbnailAlt,
    updated: "Updated 5 days ago",
  },
];

export const exploreCollections: ExploreCollection[] = [
  {
    id: "music",
    title: "Music",
    description: "Live rooms, new sessions, and deep listening.",
    image: videos[1].thumbnail,
    imageAlt: videos[1].thumbnailAlt,
    videoIds: ["tape-loop", "late-code", "live-room"],
  },
  {
    id: "technology",
    title: "Technology",
    description: "The physical edges of the digital world.",
    image: videos[3].thumbnail,
    imageAlt: videos[3].thumbnailAlt,
    videoIds: ["signal-underwater", "small-objects", "designing-quiet"],
  },
  {
    id: "travel",
    title: "Travel",
    description: "A slower way to go somewhere else.",
    image: videos[4].thumbnail,
    imageAlt: videos[4].thumbnailAlt,
    videoIds: ["first-train", "night-walk-essay", "paper-map"],
  },
  {
    id: "home",
    title: "Home & food",
    description: "Rooms, rituals, and what happens around a table.",
    image: videos[2].thumbnail,
    imageAlt: videos[2].thumbnailAlt,
    videoIds: ["small-table", "kitchen-sun", "bread-window"],
  },
];

export const recentSearches = [
  "field recording city", "interface design", "night train film"
] as const;

export function getVideo(id: string) {
  return videos.find((video) => video.id === id) ?? videos[0];
}

export function getCreator(id: string) {
  return videoCreators.find((creator) => creator.id === id) ?? videoCreators[0];
}

export function videosByIds(ids: string[]) {
  return ids.map(getVideo);
}
