import type {
  LinkedinMember,
  LinkedinFeedEntry,
  LinkedinNewsItem,
  LinkedinPost,
  LinkedinSuggestion,
} from "./types";

function photo(id: string, width = 160, height = 160) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&h=${height}&q=84`;
}

export const linkedinViewer = {
  name: "Jiyoon Park",
  headline: "Product designer · Seoul, South Korea",
  avatar: photo("1494790108377-be9c29b29330"),
};

export const linkedinMembers: LinkedinMember[] = [
  {
    id: "maria", name: "Maria Chen", headline: "Designing systems that make complex work feel clear", avatar: photo("1534528741775-53994a69daeb"),
  },
  {
    id: "arjun", name: "Arjun Mehta", headline: "Founder at FIELD NOTE · Building small, useful software", avatar: photo("1500648767791-00dcc994a43e"),
  },
  {
    id: "hale", name: "Hale Kim", headline: "Research lead at Atelier Haze", avatar: photo("1506794778202-cad84cf45f1d"), mutuals: "18 mutual connections",
  },
  {
    id: "alina", name: "Alina Roberts", headline: "Partner, North Avenue Ventures", avatar: photo("1524504388940-b1c1722653e1"), mutuals: "12 mutual connections",
  },
  {
    id: "james", name: "James Okafor", headline: "People & culture at Kanso Studio", avatar: photo("1519085360753-af0119f7cbe7"), mutuals: "7 mutual connections",
  },
  {
    id: "sora", name: "Sora Lee", headline: "Independent brand strategist", avatar: photo("1517841905240-472988babdf9"), mutuals: "31 mutual connections",
  },
  {
    id: "nora", name: "Nora Brooks", headline: "Community design at Common Ground", avatar: photo("1524250502761-1ac6f2e30d43"), mutuals: "9 mutual connections",
  },
  {
    id: "theo", name: "Theo Martin", headline: "Co-founder at Morrow · Working on better civic services", avatar: photo("1507591064344-4c6ce005b128"), mutuals: "5 mutual connections",
  },
  {
    id: "mina", name: "Mina Seo", headline: "Design researcher · public systems and everyday trust", avatar: photo("1531123897727-8f129e1688ce"), mutuals: "23 mutual connections",
  },
  {
    id: "luis", name: "Luis Alvarez", headline: "Architect and partner at Form Office", avatar: photo("1507003211169-0a1dd7228f2d"), mutuals: "14 mutual connections",
  },
  {
    id: "petra", name: "Petra Novak", headline: "Editorial director at Paper Trail", avatar: photo("1544005313-94ddf0286df2"), mutuals: "11 mutual connections",
  },
  {
    id: "daniel", name: "Daniel Reed", headline: "Operations at Juniper Works", avatar: photo("1506794778202-cad84cf45f1d"), mutuals: "6 mutual connections",
  },
  {
    id: "rhea", name: "Rhea Patel", headline: "People partner · teams, hiring, and healthy pace", avatar: photo("1494790108377-be9c29b29330"), mutuals: "16 mutual connections",
  },
  {
    id: "yuki", name: "Yuki Tanaka", headline: "Independent product writer", avatar: photo("1519345182560-3f2917c472ef"), mutuals: "28 mutual connections",
  },
  {
    id: "kay", name: "Kay Wilson", headline: "Program lead at Open Table Seoul", avatar: photo("1534528741775-53994a69daeb"), mutuals: "4 mutual connections",
  },
  {
    id: "samir", name: "Samir Desai", headline: "Design engineer · prototyping useful futures", avatar: photo("1516280440614-37939bbacd81"), mutuals: "20 mutual connections",
  },
  {
    id: "common-ground", name: "Common Ground", headline: "6,184 followers · Community workspace", avatar: photo("1497366754035-f200968a6e72"),
  },
  {
    id: "kanso", name: "Kanso Studio", headline: "18,592 followers · Design and strategy", avatar: photo("1516321318423-f06f85e504b3"),
  },
];

export const linkedinPosts: LinkedinPost[] = [
  {
    id: "design-walk", authorId: "maria", audience: "1st", published: "2h", context: "Eunseo Lee follows", reactions: 428, comments: 31, reposts: 12,
    body: "The most useful thing we did this quarter was remove the project dashboard.\n\nNot replace it with a better dashboard — remove it.\n\nThe work became easier to discuss when the team had one shared weekly question: what needs a decision before Friday?",
    image: photo("1497366754035-f200968a6e72", 1200, 780), imageAlt: "Sunlit table with a notebook, pencil, and small plant",
  },
  {
    id: "field-note", authorId: "arjun", audience: "1st", published: "5h", reactions: 186, comments: 19, reposts: 8,
    body: "We just published our field guide to designing calmer handoffs between product and support. It is less about tools than it is about leaving someone else a useful next move.",
    link: {
      source: "FIELDNOTE.STUDIO",
      title: "The handoff is part of the product",
      description: "Four small practices for making cross-functional work legible.",
    },
    image: photo("1516321318423-f06f85e504b3", 1200, 630), imageAlt: "Open book and notes on a pale wooden desk",
  },
  {
    id: "studio-opening", authorId: "hale", audience: "2nd", published: "1d", reactions: 92, comments: 10, reposts: 4,
    body: "We are looking for a thoughtful interaction designer to join our small research team in Seoul. The role sits between field research, service design, and product prototyping.",
    image: photo("1497366412874-3415097a27e7", 1200, 750), imageAlt: "People working together around a bright studio table",
  },
  {
    id: "community-table", authorId: "nora", audience: "1st", published: "3h", context: "Jae Kim follows", reactions: 273, comments: 22, reposts: 6,
    body: "A small observation from last night’s community dinner: people do not need a better networking prompt. They need a table where they can stay in one conversation long enough for the useful question to arrive.\n\nWe are keeping the long tables.",
    image: photo("1515003197210-e0cd71810b5f", 1200, 760), imageAlt: "Friends gathered around a dinner table in a warmly lit room",
  },
  {
    id: "morrow-launch", authorId: "theo", audience: "1st", published: "4h", reactions: 541, comments: 47, reposts: 31,
    body: "Today we opened Morrow’s first public prototype with the residents who helped shape it. The brief was simple: make it easier to understand what happens after you ask the city for help.\n\nThe prototype is still rough. The conversation around it is not.",
    link: {
      source: "MORROW.CITY",
      title: "A clearer way to follow a public-service request",
      description: "Notes from a first prototype built with residents and service teams.",
    },
  },
  {
    id: "research-wall", authorId: "mina", audience: "1st", published: "6h", context: "Lena Ortiz reposted this", reactions: 198, comments: 16, reposts: 14,
    body: "Research synthesis is not the wall of notes. It is the moment a team can name what they will do differently on Monday.\n\nA useful test: if the insight cannot change a decision, it is probably still a finding.",
    image: photo("1456324504439-367cee3b3c32", 1200, 760), imageAlt: "Hands arranging notes and printed research materials on a wall",
  },
  {
    id: "form-office", authorId: "luis", audience: "1st", published: "8h", reactions: 1_126, comments: 68, reposts: 59,
    body: "The client asked for a flexible ground floor. We started by asking what should remain fixed: a generous threshold, a place to wait without buying anything, and windows low enough for children to see in.",
    image: photo("1487958449943-2429e8be8625", 1200, 740), imageAlt: "Bright public interior with chairs, daylight, and concrete columns",
  },
  {
    id: "paper-trail", authorId: "petra", audience: "2nd", published: "11h", reactions: 347, comments: 39, reposts: 18,
    body: "A good edit does not make every sentence shorter. It tells the reader where to place their attention.\n\nOur new issue is about the small editorial choices that make complex work feel more honest.",
    link: {
      source: "PAPERTRAIL.ISSUES",
      title: "Issue 18: Attention is a design material",
      description: "Essays, conversations, and field notes on editing work in public.",
    },
  },
  {
    id: "juniper-week", authorId: "daniel", audience: "1st", published: "14h", reactions: 154, comments: 21, reposts: 5,
    body: "Friday ritual from our operations team: write down the handoff that cost someone the most time this week, then fix one part of it before Monday.\n\nNo retrospective deck. Just one less invisible obstacle.",
    image: photo("1516321165247-4aa89a48be28", 1200, 720), imageAlt: "Colleagues reviewing notes together at a wooden worktable",
  },
  {
    id: "pace-not-policy", authorId: "rhea", audience: "1st", published: "17h", reactions: 618, comments: 84, reposts: 42,
    body: "The best retention conversations I have seen are not about policy. They are about pace.\n\nWhat has become unnecessarily urgent? Where is good work repeatedly arriving too late to be good? Those questions tell you far more than a benefits survey.",
    image: photo("1521737604893-d14cc237f11d", 1200, 760), imageAlt: "Professional woman listening during a conversation in a bright office",
  },
  {
    id: "field-writing", authorId: "yuki", audience: "1st", published: "20h", reactions: 229, comments: 13, reposts: 9,
    body: "I keep a running list called ‘words the interface made me earn.’ It is mostly the language people use after they have explained a problem three times.\n\nThose are usually the words worth keeping.",
    link: {
      source: "YUKITANAKA.NEWS",
      title: "The language that appears after the third explanation",
      description: "A short note on listening before naming a product feature.",
    },
  },
  {
    id: "open-table", authorId: "kay", audience: "1st", published: "1d", reactions: 476, comments: 36, reposts: 27,
    body: "Registration is open for Open Table Seoul, our monthly working session for people making public-facing services. Bring one live problem, leave with three people who understand the constraint behind it.",
    image: photo("1517457373958-b7bdd4587205", 1200, 720), imageAlt: "Rows of chairs and a projector prepared for a small public gathering",
  },
  {
    id: "prototype-receipt", authorId: "samir", audience: "1st", published: "1d", context: "Hana Park follows", reactions: 862, comments: 73, reposts: 48,
    body: "A prototype is a receipt for a question. It shows what you were uncertain about, what you tested, and what you still owe the people using the thing.\n\nThat is why I prefer rough prototypes that keep their seams visible.",
    image: photo("1531058020387-3be344556be6", 1200, 750), imageAlt: "Hands testing a small paper and wire prototype on a workbench",
  },
  {
    id: "common-ground-open-studio", authorId: "common-ground", audience: "Following", published: "1d", context: "8 of your connections follow this", reactions: 711, comments: 52, reposts: 34,
    body: "Open Studio is back next Thursday. Drop in for twenty minutes or stay for the whole evening — the room is for unfinished work, generous questions, and new collaborators.",
    image: photo("1515169067868-5387ec356754", 1200, 720), imageAlt: "Open studio with people talking and working under warm lights",
  },
  {
    id: "kanso-report", authorId: "kanso", audience: "Following", published: "1d", reactions: 304, comments: 28, reposts: 37,
    body: "Our annual research report is now available. This year, we studied how small moments of uncertainty accumulate across an entire service journey — and the concrete moves teams can make to reduce them.",
    link: {
      source: "KANSO.STUDIO",
      title: "The cost of one more unclear step",
      description: "A research report on trust, service journeys, and the work of making next actions clear.",
    },
  },
  {
    id: "design-crit", authorId: "maria", audience: "1st", published: "2d", reactions: 1_392, comments: 102, reposts: 88,
    body: "A note for design leads: critique gets kinder and more rigorous when the work is already visible before the meeting starts.\n\nGive people time to notice what is there before asking them to explain what is wrong.",
    image: photo("1531058020387-3be344556be6", 1200, 750), imageAlt: "Hands working with paper prototypes on a desk",
  },
  {
    id: "field-note-role", authorId: "arjun", audience: "1st", published: "2d", reactions: 218, comments: 24, reposts: 11,
    body: "We are adding a product writer to FIELD NOTE. This is not a ‘make it sound better’ role. It is a research, product, and systems role for someone who likes finding the clearest possible next sentence.",
    link: {
      source: "FIELDNOTE.STUDIO",
      title: "Product writer — FIELD NOTE",
      description: "Seoul or remote · full-time · applications close Friday 8 August.",
    },
  },
  {
    id: "listening-session", authorId: "hale", audience: "2nd", published: "2d", context: "Marie Choi commented on this", reactions: 183, comments: 17, reposts: 7,
    body: "We ran six listening sessions before opening the brief. The most surprising result was how often people already had a workable solution — they just did not know who could approve it.\n\nThat changed the whole project.",
    image: photo("1516321318423-f06f85e504b3", 1200, 720), imageAlt: "Notebook and small objects arranged on a worktable",
  },
  {
    id: "brand-room", authorId: "sora", audience: "1st", published: "3d", reactions: 529, comments: 45, reposts: 22,
    body: "Brand work becomes useful when it gives someone inside the organisation a better way to make a small decision. A phrase for the support team. A boundary for the product team. A tone for a difficult email.\n\nThe rest is wallpaper.",
    image: photo("1497366811353-6870744d04b2", 1200, 720), imageAlt: "Colorful print materials, paper samples, and notebook on a table",
  },
  {
    id: "manager-notes", authorId: "james", audience: "1st", published: "3d", reactions: 389, comments: 58, reposts: 16,
    body: "A manager’s calendar tells the team what matters long before a values deck does.\n\nIf every difficult conversation gets moved, every thoughtful review is rushed, and every planning block is optional, people will learn to work around the things you say are important.",
    image: photo("1517048676732-d65bc937f952", 1200, 720), imageAlt: "Colleague listening and taking notes during a calm one-to-one meeting",
  },
];

export const linkedinNews: LinkedinNewsItem[] = [
  { id: "news-earnings", headline: "Earnings season turns to consumer spending", readers: "12,458 readers" },
  { id: "news-ai", headline: "AI investment shifts toward everyday work", readers: "9,214 readers" },
  { id: "news-energy", headline: "A new phase for global energy projects", readers: "6,803 readers" },
  { id: "news-work", headline: "What workers want from hybrid teams", readers: "5,167 readers" },
  { id: "news-ship", headline: "Shipping routes reshape summer trade", readers: "3,949 readers" },
];

export const linkedinSuggestions: LinkedinSuggestion[] = [
  { id: "suggest-hale", memberId: "hale" },
  { id: "suggest-alina", memberId: "alina" },
  { id: "suggest-james", memberId: "james" },
  { id: "suggest-sora", memberId: "sora" },
];

export function linkedinMember(id: string) {
  return linkedinMembers.find((member) => member.id === id) ?? linkedinMembers[0];
}

export function repeatLinkedinPosts(
  records: readonly LinkedinPost[],
  count: number,
  context: string,
): LinkedinFeedEntry[] {
  if (!records.length) return [];
  return Array.from({ length: count }, (_, index) => ({
    id: `${context}-${records[index % records.length].id}-${index}`,
    post: records[index % records.length],
  }));
}
