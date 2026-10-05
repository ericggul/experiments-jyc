import type { Post } from './data';

const photo = (id: string, width = 160, height = 160) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&h=${height}&q=84`;

export const additionalPosts: Post[] = [
  {
    id: 'jun-hci-doors', name: 'Hale Kim', headline: 'Research lead at Atelier Haze', avatar: photo('1506794778202-cad84cf45f1d'), time: '38m',
    body: '이번 주 사용성 세션에서 참가자들은 화면의 버튼보다 사무실 현관의 출입 절차를 더 오래 이야기했습니다. 앱이 열리기 전에 이미 “내가 여기 들어와도 되는 사람인가”를 판단하고 있었던 거죠.\n\n그래서 다음 프로토타입에서는 인증 성공 화면보다, 처음 멈추는 8초를 먼저 다듬어 보려 합니다. 서비스의 시작점은 종종 우리가 그린 첫 화면보다 앞에 있습니다.',
    reactions: 84, comments: 12, reposts: 3,
  },
  {
    id: 'haneul-material-library', name: 'Maria Chen', headline: 'Designing systems that make complex work feel clear', avatar: photo('1534528741775-53994a69daeb'), time: '1h',
    body: 'A prototype shelf is not storage. It is a memory system for decisions that have not become language yet.\n\nWe relabelled ours by question instead of material: “Does it invite repair?”, “Where does the hand hesitate?”, “What gets louder after a week?” The failed pieces became much easier to revisit, and the team stopped treating them as waste.', media: photo('1516321318423-f06f85e504b3', 1200, 720), mediaType: 'image', reactions: 216, comments: 28, reposts: 14,
  },
  {
    id: 'mira-chi-notes', name: 'Mina Seo', headline: 'Design researcher · public systems and everyday trust', avatar: photo('1531123897727-8f129e1688ce'), time: '2h',
    body: 'Still thinking about a conference conversation on “participation.” Someone asked whether inviting people into a workshop is enough to call a process participatory.\n\nThe answer that stayed with me: participation changes who can refuse a decision, not only who gets to decorate it. I am carrying that question into our next community brief.',
    media: photo('1517457373958-b7bdd4587205', 1200, 720), mediaType: 'image', reactions: 173, comments: 19, reposts: 8,
  },
  {
    id: 'orbit-lab-opening', name: 'Kanso Studio', headline: '18,592 followers · Design and strategy', avatar: photo('1516321318423-f06f85e504b3'), time: '3h',
    body: 'We are opening applications for a six-month design engineer residency. The work is hands-on: build rough tools with local partners, take them into real routines, then return with evidence instead of a polished story.\n\nWe can support one resident who works primarily in Korean and English. Applications include a short account of something you changed after seeing it used.', media: photo('1497366412874-3415097a27e7', 1200, 750), mediaType: 'image', reactions: 301, comments: 34, reposts: 22,
  },
  {
    id: 'david-career-shift', name: 'Daniel Reed', headline: 'Operations at Juniper Works', avatar: photo('1506794778202-cad84cf45f1d'), time: '4h',
    body: 'I spent eleven years making store openings happen on time. This month I joined a service design team, and I keep noticing how much “user journey” language leaves out: the person who restocks the printer, the call after closing, the workaround that only exists on rainy days.\n\nMy old job was not a detour. It gave me a better list of questions to bring into design.',
    reactions: 447, comments: 61, reposts: 18,
  },
  {
    id: 'soyeon-subway-fieldnotes', name: 'Nora Brooks', headline: 'Community design at Common Ground', avatar: photo('1524250502761-1ac6f2e30d43'), time: '5h',
    body: 'Field note from Line 2, 8:42 a.m.: the useful part of a wayfinding sign was not its arrows. It was the small amount of empty wall around it. People could step aside, look up, and decide without being pushed by the queue.\n\nWe often measure whether information is present. I want to pay more attention to whether the body has enough room to receive it.', reactions: 358, comments: 42, reposts: 31,
  },
  {
    id: 'nuri-design-ops', name: 'Daniel Reed', headline: 'Operations at Juniper Works', avatar: photo('1506794778202-cad84cf45f1d'), time: '6h',
    body: 'Our team retired three meeting types this quarter. The practical result was not “more focus time”; it was fewer decisions arriving without an owner, a date, or the context that made them meaningful.\n\nThe replacement is a one-page decision note shared before critique. It is deliberately plain. Good operations should make the work visible, then get out of the way.',
    media: photo('1516321165247-4aa89a48be28', 1200, 720), mediaType: 'image', reactions: 129, comments: 15, reposts: 11,
  },
  {
    id: 'elias-gesture-study', name: 'Samir Desai', headline: 'Design engineer · prototyping useful futures', avatar: photo('1516280440614-37939bbacd81'), time: '8h',
    body: 'We tested a table-top controller made from cork, magnets, and a cheap sensor board. The surprising observation was not accuracy. People began narrating their moves to each other because the control had resistance and made its own small sound.\n\nThat changed our next question from “Can this replace a screen?” to “What kinds of conversation does this object make possible?”', media: photo('1531058020387-3be344556be6', 1200, 750), mediaType: 'image', reactions: 264, comments: 37, reposts: 16,
  },
  {
    id: 'mina-recruiting-research', name: 'Mina Seo', headline: 'Design researcher · public systems and everyday trust', avatar: photo('1531123897727-8f129e1688ce'), time: '10h',
    body: 'Hiring: a research coordinator for a small HCI group in Seoul. This is a role for someone who likes the quiet infrastructure of good studies: recruiting with care, making consent language readable, keeping incentives on time, and helping researchers return to participants with what changed.\n\nExperience with labs helps, but reliability and respectful communication matter more. Hybrid, full-time.',
    reactions: 188, comments: 23, reposts: 27,
  },
  {
    id: 'prism-launch', name: 'Morrow', headline: 'Civic service prototype studio', avatar: photo('1507591064344-4c6ce005b128'), time: '12h',
    body: 'Today we launched Prism Counter, a lightweight closing checklist shaped with five neighborhood shops. It does not try to run a business. It helps the next person understand what happened before their shift: a low battery, a delayed delivery, a customer request that needs a reply.\n\nThe best feedback so far: “I can leave without keeping everything in my head.”', reactions: 512, comments: 48, reposts: 39,
  },
  {
    id: 'jihoon-modelmaking', name: 'Samir Desai', headline: 'Design engineer · prototyping useful futures', avatar: photo('1516280440614-37939bbacd81'), time: '14h',
    body: 'In a review yesterday, a colleague picked up the foam model and immediately turned it upside down. We had spent two days discussing the “front” as if it were self-evident.\n\nThat one gesture was more useful than a page of feedback. Physical prototypes are good at exposing the assumptions a render politely lets us keep.', reactions: 693, comments: 76, reposts: 41,
  },
  {
    id: 'rebecca-seoul-remote', name: 'Alina Roberts', headline: 'Partner, North Avenue Ventures', avatar: photo('1524504388940-b1c1722653e1'), time: '16h',
    body: 'Remote collaboration improved for us when we stopped asking people to “be more async.” That phrase hides the actual work.\n\nWe now write the decision, the missing input, and the deadline separately. A teammate can disagree with one without reopening all three. It feels less elegant than a manifesto, but it has made late-night clarification messages much rarer.',
    reactions: 241, comments: 31, reposts: 20,
  },
  {
    id: 'harbor-summer-program', name: 'Common Ground', headline: '6,184 followers · Community workspace', avatar: photo('1497366754035-f200968a6e72'), time: '18h',
    body: 'Our summer open workshop starts next month. We are inviting designers, technicians, students, and people who simply have a stubborn repair problem to bring one object or one question.\n\nThere will be benches, basic hand tools, and short demonstrations on mould-making and low-volume casting. No portfolio required. The point is to make something testable before deciding it needs to be perfect.', media: photo('1515169067868-5387ec356754', 1200, 720), mediaType: 'image', reactions: 335, comments: 29, reposts: 25,
  },
  {
    id: 'camille-conference-volunteers', name: 'Kay Wilson', headline: 'Program lead at Open Table Seoul', avatar: photo('1534528741775-53994a69daeb'), time: '1d',
    body: 'A small production lesson from this year’s symposium: the volunteer briefing is part of the attendee experience. When helpers know why a room is arranged a certain way, they can solve the human problem in front of them instead of escalating every exception.\n\nWe added scenario walk-throughs this year. Fewer radios, more judgment, calmer corridors.',
    reactions: 157, comments: 18, reposts: 6,
  },
  {
    id: 'tae-museum-audio', name: 'Luis Alvarez', headline: 'Architect and partner at Form Office', avatar: photo('1507003211169-0a1dd7228f2d'), time: '1d',
    body: 'We watched visitors use an audio guide prototype in a small gallery. Most did not want a continuous narration. They wanted permission to look first, then ask for context when curiosity arrived.\n\nThe revised flow begins silent and makes one sentence available at a time. It is a modest change, but it respects the pace of standing in front of an object with someone else nearby.', media: photo('1487958449943-2429e8be8625', 1200, 740), mediaType: 'image', reactions: 406, comments: 54, reposts: 23,
  },
  {
    id: 'dawon-accessible-review', name: 'Mina Seo', headline: 'Design researcher · public systems and everyday trust', avatar: photo('1531123897727-8f129e1688ce'), time: '1d',
    body: 'Accessibility review is most useful before the interface feels finished. At that stage, teams can still change the sequence, the language, and the recovery path instead of treating access as a list of visual fixes.\n\nThis week’s review surfaced a simple issue: a form timed out without telling people what would be saved. The repair was small. The feeling of being discarded was not.',
    reactions: 578, comments: 69, reposts: 62,
  },
  {
    id: 'unfold-research-wall', name: 'Kanso Studio', headline: '18,592 followers · Design and strategy', avatar: photo('1516321318423-f06f85e504b3'), time: '1d',
    body: 'We have published a small set of field notes from a six-week study with home-care coordinators. The strongest pattern was not a “pain point.” It was the amount of invisible translation they perform between families, clinics, schedules, and changing conditions.\n\nThe notes are intentionally incomplete. We hope they are useful to people doing related work, and we welcome corrections from the field.', media: photo('1456324504439-367cee3b3c32', 1200, 760), mediaType: 'image', reactions: 274, comments: 26, reposts: 33,
  },
  {
    id: 'yunseo-first-week', name: 'Yuki Tanaka', headline: 'Independent product writer', avatar: photo('1519345182560-3f2917c472ef'), time: '2d',
    body: 'First week in a new role, and my favorite moment was being asked to sit with customer support before opening Figma. The calls had a vocabulary for the product that no brief could have supplied.\n\nI wrote down every phrase that described a moment of uncertainty. Not as a research artifact to admire later, but as a starting point for the screens I will help change.',
    media: photo('1517048676732-d65bc937f952', 1200, 720), mediaType: 'image', reactions: 822, comments: 91, reposts: 35,
  },
  {
    id: 'matthew-design-crit', name: 'James Okafor', headline: 'People & culture at Kanso Studio', avatar: photo('1519085360753-af0119f7cbe7'), time: '2d',
    body: 'A critique prompt we are trying: “What would have to be true for this to be the right choice?”\n\nIt has helped us move away from taste statements and toward conditions. Sometimes the answer exposes a missing constraint; sometimes it reveals that two people are solving different problems. Either way, the conversation becomes easier to continue after the meeting.',
    media: photo('1521737604893-d14cc237f11d', 1200, 760), mediaType: 'image', reactions: 367, comments: 44, reposts: 29,
  },
  {
    id: 'sori-prototype-library', name: 'Samir Desai', headline: 'Design engineer · prototyping useful futures', avatar: photo('1516280440614-37939bbacd81'), time: '2d',
    body: 'A note from our “doorway library” experiment: a public shelf whose labels can be changed by the people who use the building.\n\nThe technical prototype is simple. The harder design question has been stewardship: who notices an empty label, who gets to name a category, and what happens when the shelf becomes too useful for its original rules?', reactions: 193, comments: 22, reposts: 10,
  },
  {
    id: 'fieldroom-fellowship', name: 'FIELD NOTE', headline: 'Building small, useful software', avatar: photo('1500648767791-00dcc994a43e'), time: '3d',
    body: 'Applications are open for the Fieldroom Fellowship. We are looking for early-career practitioners working across product, architecture, public services, or community organising.\n\nThe fellowship offers desk space, a modest materials budget, peer critique, and time with local partners. Please apply with a question you cannot answer alone, rather than a finished project proposal.', media: photo('1515003197210-e0cd71810b5f', 1200, 760), mediaType: 'image', reactions: 287, comments: 35, reposts: 46,
  },
  {
    id: 'marcus-handoff-map', name: 'Daniel Reed', headline: 'Operations at Juniper Works', avatar: photo('1506794778202-cad84cf45f1d'), time: '3d',
    body: 'We mapped a customer request from first email to final resolution and found seven handoffs, but only two were visible in the product. The rest lived in chat threads, memory, and someone’s willingness to stay late.\n\nThe map did not tell us to automate everything. It gave us a better question for each handoff: should this move be clearer, shared, or removed?',
    reactions: 459, comments: 53, reposts: 47,
  },
  {
    id: 'yen-seoul-morning', name: 'Petra Novak', headline: 'Editorial director at Paper Trail', avatar: photo('1544005313-94ddf0286df2'), time: '4d',
    body: 'Morning at a café near Seongsu: three people each on laptops, all quietly taking product photos on the same patch of sunlit table. It made me think about how workspaces become temporary production sets, then return to being places to wait, meet, and rest.\n\nThe design of a workday is partly made from these borrowed, unplanned arrangements.', media: photo('1497366754035-f200968a6e72', 1200, 780), mediaType: 'image', reactions: 638, comments: 72, reposts: 21,
  },
  {
    id: 'alba-team-transition', name: 'Rhea Patel', headline: 'People partner · teams, hiring, and healthy pace', avatar: photo('1494790108377-be9c29b29330'), time: '5d',
    body: 'After nine years in agency work, I have joined an in-house product team. The adjustment is less about pace than proximity. Decisions now have a longer afterlife: you hear how they land in support, finance, onboarding, and the next release.\n\nI am learning to value the unglamorous follow-through—the meeting after the launch, the note that closes a loop, the patient revision that keeps a promise made months ago.',
    reactions: 724, comments: 87, reposts: 38,
  },
];

export const postComments: Record<string, { id: string; name: string; body: string }[]> = {
  'jun-hci-doors': [
    { id: 'jun-c1', name: 'Hyejin Kim', body: '“멈추는 8초”라는 표현이 좋네요. 온보딩에서도 화면 밖의 긴장을 놓치기 쉽습니다.' },
    { id: 'jun-c2', name: 'Owen Park', body: 'We saw the same thing in a clinic check-in study: signage and staff posture set the first interaction.' },
  ],
  'haneul-material-library': [
    { id: 'han-c1', name: 'Jisoo Moon', body: 'Question-based labels would make critique much easier for a cross-functional team.' },
    { id: 'han-c2', name: 'Sana Lee', body: 'I want to borrow “what gets louder after a week?” for our durability review.' },
  ],
  'orbit-lab-opening': [
    { id: 'orbit-c1', name: 'Nora Shin', body: 'The application prompt is refreshingly concrete. Sharing with a colleague finishing school this year.' },
    { id: 'orbit-c2', name: 'Daeho Lim', body: 'Will there be an open studio day before applications close?' },
    { id: 'orbit-c3', name: 'Kanso Studio', body: 'Yes—details will be posted here next week.' },
  ],
  'prism-launch': [
    { id: 'prism-c1', name: 'Eunchae Ryu', body: '“Leave without keeping everything in my head” is a strong success metric for shift tools.' },
    { id: 'prism-c2', name: 'Alex Tan', body: 'Congratulations. The narrow scope is exactly what makes it feel believable.' },
  ],
  'tae-museum-audio': [
    { id: 'tae-c1', name: 'Mina Song', body: 'The option to look first is so respectful. I would love to hear how visitors use it with children.' },
    { id: 'tae-c2', name: 'Tae Kim', body: 'That is in the next round—we are testing shared listening rather than individual headsets.' },
  ],
  'dawon-accessible-review': [
    { id: 'dawon-c1', name: 'Hannah Lee', body: 'Timeout messaging is often treated as edge-case copy, but it determines whether people trust a form.' },
    { id: 'dawon-c2', name: 'Kaito Sato', body: 'Thank you for naming recovery paths. They are where the real service shows up.' },
    { id: 'dawon-c3', name: 'Dawon Seo', body: 'Exactly. A clear next step matters more than a perfect error state.' },
  ],
  'yunseo-first-week': [
    { id: 'yun-c1', name: 'Grace Kwon', body: 'What a good first-week practice. Support teams are often the clearest product historians.' },
    { id: 'yun-c2', name: 'Yunseo Kang', body: 'I felt lucky the team made that connection before assigning a screen.' },
  ],
  'fieldroom-fellowship': [
    { id: 'field-c1', name: 'Jiwoo Han', body: 'This sounds generous. Is there an information session for applicants outside Seoul?' },
    { id: 'field-c2', name: 'Fieldroom', body: 'Yes, we will host an online session and publish the recording afterward.' },
  ],
};
