// Texts for the cloned pages and for what the reader writes in them. Names
// and outlets are invented; the headlines borrow the register of the
// coverage, not its sentences.

export type SlackMessage = { id: string; author: string; initials: string; tone: string; time: string; text: string; link?: { title: string; site: string; url: string } };

const people = [
  ['민준', 'ㅁ', '#e01e5a'], ['서연', 'ㅅ', '#2eb67d'], ['도윤', 'ㄷ', '#ecb22e'], ['하은', 'ㅎ', '#36c5f0'],
  ['지호', 'ㅈ', '#4a154b'], ['수아', 'ㅅ', '#1264a3'], ['예준', 'ㅇ', '#e8912d'],
] as const;

export function slackMessages(keyword: string): SlackMessage[] {
  const at = (i: number) => people[i % people.length];
  const line = (i: number, time: string, text: string, link?: SlackMessage['link']): SlackMessage => ({ id: `m${i}`, author: at(i)[0], initials: at(i)[1], tone: at(i)[2], time, text, link });
  const article = articleFor(keyword);
  return [
    line(0, '9:41', `다들 ${keyword} 관련 뉴스 봤어요? 오늘 아침부터 타임라인이 전부 그 얘기네요`),
    line(1, '9:42', `ㅋㅋ 저도요. 투자사에서 ${keyword} 로드맵 있냐고 또 물어봄`),
    line(2, '9:44', `우리 데모 첫 장에 ${keyword} 한 줄이라도 넣어야 되나`),
    line(3, '9:45', `이거 읽어보세요`, { title: article.headline, site: 'signal.news', url: '#' }),
    line(4, '9:47', `솔직히 ${keyword} 버블 아니냐는 얘기도 많던데`),
    line(0, '9:48', `버블이든 아니든 지금 안 올라타면 늦는 느낌`),
    line(5, '9:52', `Altman 인터뷰 보면 2027년 얘기함. 진심인지는 모르겠지만`),
    line(6, '9:55', `@channel 오후 3시 ${keyword} 스터디 할 사람? 회의실 B`),
    line(1, '9:56', `저요. 근데 우리 지금 하는 거랑 ${keyword}가 무슨 상관인지는 아직 모르겠어요`),
    line(2, '9:58', `상관없어도 넣어야죠. 다들 넣잖아요`),
  ];
}

export type Article = { headline: string; standfirst: string; section: string; body: string[]; pull: string; related: string[] };

const headlines: Record<string, [string, string]> = {
  'AI': ['The AI gold rush is now the whole economy', 'Every earnings call, every syllabus, every résumé: how one abbreviation swallowed the agenda.'],
  'AGI': ['AGI by 2027? Inside the forecast everyone is suddenly quoting', 'A timeline that began as a blog post is now a line item in strategy decks.'],
  'AI bubble': ['Is this the AI bubble, or just the beginning?', 'Valuations say one thing, revenue says another, and both camps are certain.'],
  'NVIDIA': ['Nvidia’s quarter was so big it moved the index by itself', 'One company’s guidance has become the weather report for the rest of the market.'],
  'OpenAI': ['OpenAI’s next model, and the week the rumours became the news', 'Leaks, denials and a demo: the cycle has a rhythm now, and everyone dances to it.'],
  'generative AI': ['Generative AI ate the creative department', 'Agencies are hiring prompt leads faster than they are losing art directors.'],
  'physical AI': ['Physical AI: the hype moves from screens to factories', 'Robots were always coming; this time the chips came first.'],
  'AI agents': ['The year of the agent, again', 'Every platform promises software that acts for you. Few explain what it does when you are not looking.'],
  'xAI': ['xAI wants a data centre the size of a city', 'The company’s plans read like infrastructure policy, and are being treated like it.'],
  'Sam Altman': ['Sam Altman says the singularity is gentle. Markets disagree.', 'Six words on a social feed moved more capital than most quarterly reports.'],
  'superintelligence': ['Superintelligence timelines are getting shorter in public', 'The people building it keep revising their own estimates downward, on stage.'],
  'semiconductors': ['The chip is the new oil, and everyone wants a refinery', 'Subsidies, export controls and a single supplier: the industry nobody could ignore.'],
};

export function articleFor(keyword: string): Article {
  const [headline, standfirst] = headlines[keyword] ?? [`${keyword} is the only story left`, `How one keyword came to stand in for the future, and what it is crowding out.`];
  return {
    headline,
    standfirst,
    section: 'Technology',
    body: [
      `It is hard to remember when ${keyword} was a topic rather than the topic. In the past year it has moved from the technology pages to the front page, from the research lab to the earnings call, and from the earnings call to the dinner table. The term now appears in policy speeches, in job descriptions for roles that have nothing to do with it, and in the marketing of products that do not use it.`,
      `The acceleration is measurable. Mentions of ${keyword} in quarterly calls have risen for nine consecutive quarters, according to transcripts reviewed by Signal. Search interest has doubled twice. Analysts who covered other sectors have been reassigned. “If you are not talking about it, your investors assume you have missed it,” one chief executive said, on condition of anonymity, before talking about it for forty minutes.`,
      `What the term refers to has become less clear as its use has spread. For some it is a specific set of models and the hardware they run on. For others it is a management posture: a willingness to reorganise, to spend, to be seen spending. The ambiguity is part of the appeal. A word that can mean anything can be attached to anything.`,
      `Sceptics point to the previous cycles, and to the gap between demonstrations and deployment. Enthusiasts point to the same demonstrations and to the speed with which they have improved. Both sides agree on one thing: that attention, once captured, is hard to release. The next keyword is already waiting.`,
      `Whether the current wave ends in a correction or a new baseline, the shape of the attention is itself the story. A single word, repeated often enough across enough channels, becomes the frame through which everything else is seen. ${keyword} is that word this year.`,
    ],
    pull: `“If you are not talking about it, your investors assume you have missed it.”`,
    related: [
      `What ${keyword} means for the jobs that do not mention it`,
      `The investors betting against the ${keyword} consensus`,
      `Inside the data centres that ${keyword} is paying for`,
      `A short history of the last five keywords`,
    ],
  };
}

export type Result = { title: string; url: string; site: string; path: string; snippet: string };

const siteOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');
const result = (title: string, url: string, snippet: string): Result => ({ title, url, site: siteOf(url), path: new URL(url).pathname.replace(/\/$/, '').split('/').filter(Boolean).join(' › '), snippet });

const wikiArticle: Record<string, string> = { 'AI': 'Artificial_intelligence', 'AGI': 'Artificial_general_intelligence', 'LLM': 'Large_language_model', 'generative AI': 'Generative_artificial_intelligence', 'AI agents': 'Intelligent_agent', 'AI bubble': 'AI_boom', 'xAI': 'XAI_(company)', 'physical AI': 'Robotics', 'superintelligence': 'Superintelligence', 'Anthropic': 'Anthropic', 'machine learning': 'Machine_learning' };

export function googleResults(keyword: string) {
  const q = encodeURIComponent(keyword);
  const article = wikiArticle[keyword] ?? 'Artificial_intelligence';
  const results: Result[] = [
    result(`${article.replace(/_/g, ' ').replace(/ \(.*\)$/, '')} - Wikipedia`, `https://en.wikipedia.org/wiki/${article}`, `${keyword} is a field of research in computer science that develops and studies methods and software that enable machines to perceive their environment and use learning and intelligence to take actions that maximize their chances of achieving defined goals.`),
    result(`What is ${keyword}? Everything you need to know`, `https://www.theverge.com/ai-artificial-intelligence`, `The term has gone from a research niche to the centre of the technology industry in under three years. Here is what it means, who is building it and why every company suddenly claims to be doing it.`),
    result(`${keyword} news and analysis`, `https://techcrunch.com/category/artificial-intelligence/`, `Latest ${keyword} coverage: funding rounds, model releases, regulation and the companies racing to deploy it. Updated throughout the day.`),
    result(`OpenAI`, `https://openai.com/`, `We are building safe and beneficial ${keyword}. Explore our research, products and the models behind ChatGPT.`),
    result(`${keyword} | NVIDIA`, `https://www.nvidia.com/en-us/ai/`, `The platform for ${keyword}, from training to inference, in the cloud, the data center and at the edge. Explore the full stack.`),
    result(`r/singularity: ${keyword} megathread`, `https://www.reddit.com/r/singularity/`, `Discussion of ${keyword} timelines, releases and what comes after. 3.4M members. Weekly thread: how close are we?`),
    result(`${keyword} videos`, `https://www.youtube.com/results?search_query=${q}`, `Talks, keynotes, interviews and explainers on ${keyword}, from one-hour lectures to three-minute summaries.`),
    result(`${keyword}: the complete guide (2026)`, `https://www.ibm.com/think/topics/artificial-intelligence`, `A plain-language overview of ${keyword}: definitions, history, how the systems are built, and where they are used in business today.`),
  ];
  return {
    overview: `${keyword} refers to computer systems that perform tasks associated with human intelligence, such as understanding language, recognising patterns and making decisions. Interest in ${keyword} has grown sharply since 2022, driven by large models, specialised hardware and heavy investment. Analysts disagree about whether current valuations reflect a lasting shift or a cycle of enthusiasm.`,
    alsoAsk: [`What is ${keyword} in simple terms?`, `Is ${keyword} a bubble?`, `Which companies lead in ${keyword}?`, `Will ${keyword} replace jobs?`],
    related: [`${keyword} meaning`, `${keyword} stocks`, `${keyword} news today`, `${keyword} examples`, `${keyword} vs AGI`, `${keyword} jobs`, `${keyword} course`, `${keyword} bubble`],
    results,
    count: `About ${(3 + (keyword.length % 7)).toFixed(0)},${String(140 + keyword.length * 37).slice(0, 3)}0,000,000 results (0.${30 + keyword.length}s)`,
  };
}

/** What the reader writes. */
export function comments(keyword: string): string[] {
  return [
    `this is the moment. ${keyword} changes everything`,
    `${keyword} 이거 진짜 끝까지 가는 거 맞죠?`,
    `calling it now: ${keyword} will be bigger than the internet`,
    `bubble. remember 2021`,
    `${keyword} 안 배우면 도태된다길래 들어왔습니다`,
    `so is it over for us or`,
    `every CEO says ${keyword} and the stock goes up 3%`,
    `다음 주부터 ${keyword} 스터디 시작합니다 같이 하실 분`,
    `ok but what does ${keyword} actually mean`,
    `first`,
    `saved. watching later. probably never`,
    `my feed is 100% ${keyword} now and i don't remember choosing that`,
  ];
}

export type Comment = { id: string; author: string; age: string; text: string; likes: string };

export function videoComments(keyword: string): Comment[] {
  const c = (id: string, author: string, age: string, text: string, likes: string): Comment => ({ id, author, age, text, likes });
  return [
    c('c1', '@mkim_dev', '3 days ago', `Watched this twice. The part about ${keyword} at 41:20 is the clearest explanation I have seen.`, '2.1K'),
    c('c2', '@ssunny', '1 day ago', `2027 is bold but he sounds like he means it`, '834'),
    c('c3', '@quietbear', '5 hours ago', `Everyone in my company is suddenly a ${keyword} expert after this video`, '412'),
    c('c4', '@jpark', '2 days ago', `한국어 자막 있으면 좋겠어요`, '297'),
    c('c5', '@notabot_', '6 days ago', `I remember when this channel was about something else`, '158'),
    c('c6', '@lenaw', '1 week ago', `Timestamps: 0:00 intro, 12:40 ${keyword}, 41:20 the forecast, 1:12:05 Q&A`, '1.9K'),
  ];
}

export type AdCopy = { brand: string; eyebrow: string; headline: string; sub: string; cta: string; secondary: string; bullets: string[]; price: string; was: string; stat: [string, string][]; quote: string; who: string; deadline: string };

export function adCopy(keyword: string): AdCopy {
  const course = ['AI', 'machine learning'].includes(keyword);
  const api = keyword === 'LLM';
  const gpu = keyword === 'GPU';
  return {
    brand: course ? 'Neuron Academy' : api ? 'Vectorflow' : gpu ? 'Cumulus Compute' : 'Agentry',
    eyebrow: course ? 'Cohort 14 starts Monday' : api ? 'Now with 1M-token context' : gpu ? 'H100 · H200 · B200' : 'The agent platform',
    headline: course ? `Master ${keyword} in 30 days` : api ? `Ship ${keyword} features by Friday` : gpu ? `${keyword}s, by the hour, no waitlist` : `Build ${keyword} that actually do the work`,
    sub: course ? `No background needed. 12,000 graduates. The curriculum your manager keeps forwarding.` : api ? `One API, every model. Pay for what you use. Free tier for the first 10M tokens.` : gpu ? `Spin up a cluster in 90 seconds. Billed by the second. Cancel anytime.` : `Drag, connect, deploy. Your first agent in under ten minutes, no code required.`,
    cta: course ? 'Start free trial' : api ? 'Get API key' : gpu ? 'Launch instance' : 'Build your agent',
    secondary: course ? 'See the syllabus' : api ? 'Read the docs' : gpu ? 'Compare prices' : 'Watch demo (2:14)',
    bullets: course ? ['Live sessions twice a week', 'Portfolio project reviewed by mentors', 'Certificate recognised by 400+ companies'] : api ? ['Streaming, tools, structured output', '99.95% uptime SLA', 'SOC 2 Type II'] : gpu ? ['From $1.89 per GPU-hour', 'InfiniBand clusters up to 512 GPUs', 'Pre-installed PyTorch and CUDA'] : ['Connects to 300+ apps', 'Human approval steps', 'Runs 24/7 on our cloud'],
    price: course ? '$49' : api ? '$0' : gpu ? '$1.89' : '$29',
    was: course ? '$129' : api ? '' : gpu ? '$3.40' : '$79',
    stat: course ? [['12,000+', 'graduates'], ['4.9', 'average rating'], ['30', 'days']] : api ? [['1M', 'token context'], ['40+', 'models'], ['99.95%', 'uptime']] : gpu ? [['90 s', 'to first GPU'], ['512', 'GPUs per cluster'], ['-44%', 'vs. hyperscalers']] : [['300+', 'integrations'], ['10 min', 'to first agent'], ['24/7', 'runtime']],
    quote: course ? `I went from zero to shipping a ${keyword} feature at work in five weeks.` : api ? `We replaced three vendors with one call.` : gpu ? `Our training run started before the meeting ended.` : `It booked the meetings, wrote the notes and nobody noticed.`,
    who: course ? 'Product manager, Seoul' : api ? 'CTO, fintech startup' : gpu ? 'ML lead, robotics' : 'Founder, two-person team',
    deadline: course ? 'Offer ends in 47:59:12' : api ? 'Free tier, no card' : gpu ? 'Capacity available now' : '14-day free trial',
  };
}
