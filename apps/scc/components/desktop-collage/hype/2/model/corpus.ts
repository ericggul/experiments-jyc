// Texts for the cloned pages: the fear of missing out around AI, in the
// registers the web uses for it. Names, outlets and companies are invented;
// figures that sound like statistics are the genre's, not sources.

export type SlackMessage = { id: string; author: string; initials: string; tone: string; time: string; text: string; link?: { title: string; site: string; url: string } };

const people = [
  ['민준', 'ㅁ', '#e01e5a'], ['서연', 'ㅅ', '#2eb67d'], ['도윤', 'ㄷ', '#ecb22e'], ['하은', 'ㅎ', '#36c5f0'],
  ['지호', 'ㅈ', '#4a154b'], ['수아', 'ㅅ', '#1264a3'], ['예준', 'ㅇ', '#e8912d'],
] as const;

export function slackMessages(keyword: string): SlackMessage[] {
  const at = (i: number) => people[i % people.length];
  const line = (i: number, time: string, text: string, link?: SlackMessage['link']): SlackMessage => ({ id: `m${i}`, author: at(i)[0], initials: at(i)[1], tone: at(i)[2], time, text, link });
  const list = listicleFor(keyword);
  return [
    line(0, '9:41', `인사팀 공지 봤어요? 다음 분기부터 평가에 "AI 활용도" 항목 들어간대요`),
    line(1, '9:42', `옆 팀 신입 TO 전부 취소됐다는데 진짜예요?`),
    line(2, '9:43', `네. 대신 "AI 에이전트 운영" 계약직 하나 뽑는대요`),
    line(3, '9:45', `이거 보셨어요`, { title: list.title, site: 'medium.com', url: '#' }),
    line(4, '9:47', `엔비디아 또 올랐네요. 저만 없어요 진짜`),
    line(5, '9:48', `프롬프트 엔지니어 연봉 봤어요? 3년 차에 2억이래요. 3년 전엔 직업이 없었는데`),
    line(6, '9:52', `저 이번 주말에 ${keyword} 스터디 들어갔어요. 안 하면 불안해서`),
    line(0, '9:55', `@channel 오늘 4시 전사 미팅 안건: "AI 전환 로드맵". 각자 팀에서 AI로 대체 가능한 업무 리스트 준비해오래요`),
    line(1, '9:56', `우리가 우리 업무를 리스트업 하는 거예요?`),
    line(2, '9:58', `네`),
  ];
}

export type Article = { headline: string; standfirst: string; section: string; body: string[]; pull: string; related: string[] };

const headlines: Record<string, [string, string]> = {
  'AI jobs': ['The 10 jobs AI will take first, according to the people building it', 'Customer service, translation, bookkeeping, junior coding: a list that keeps getting longer and closer.'],
  'AI stocks': ['The AI trade has one rule: don’t be the last one in', 'Every dip is bought within hours. Analysts who called a top in 2024 have stopped calling.'],
  'CS graduates': ['The class of 2026 did everything right. Then the entry-level job disappeared.', 'Six thousand applications, two interviews, one offer from a restaurant: the new numbers of a computer science degree.'],
  'AI layoffs': ['“Efficiency”: inside the layoffs that cite AI', 'Memos now name the model. The headcount that follows is a round number.'],
  'learn AI': ['Your co-worker has already finished the AI course. Have you?', 'The skill that every job posting lists and no job description can define.'],
  'AGI 2027': ['AGI by 2027: the forecast that turned into a deadline', 'A scenario written by researchers now sets the pace for boardrooms, syllabi and savings plans.'],
  'AI bubble': ['If this is a bubble, nobody wants to be the first to leave', 'Valuations say one thing, revenue says another, and both camps are certain.'],
  'NVIDIA': ['Nvidia is now worth more than the next five chipmakers combined', 'One company’s guidance has become the weather report for the rest of the market.'],
};

export function articleFor(keyword: string): Article {
  const [headline, standfirst] = headlines[keyword] ?? [`${keyword}: the story everyone is suddenly behind on`, `How one keyword came to stand in for the future, and what it is crowding out.`];
  return {
    headline,
    standfirst,
    section: 'Technology',
    body: [
      `It is hard to remember when ${keyword} was a topic rather than the topic. In the past year it has moved from the technology pages to the front page, from the research lab to the earnings call, and from the earnings call to the dinner table. The term now appears in policy speeches, in job descriptions for roles that have nothing to do with it, and in the marketing of products that do not use it.`,
      `The numbers people quote are getting larger and the deadlines shorter. Mentions of ${keyword} in quarterly calls have risen for nine consecutive quarters, according to transcripts reviewed by Signal. “If you are not talking about it, your investors assume you have missed it,” one chief executive said, on condition of anonymity, before talking about it for forty minutes.`,
      `For workers the arithmetic is simpler and worse. A skill that did not exist three years ago is listed as a three-year requirement. An entry-level role is described as needing judgment the entry level was supposed to produce. The advice from every direction is the same: learn it now, before someone who already has takes your place.`,
      `Sceptics point to the previous cycles, and to the gap between demonstrations and deployment. Enthusiasts point to the same demonstrations and to the speed with which they have improved. Both sides agree on one thing: that the fear of being late is doing more work than any model.`,
      `Whether the current wave ends in a correction or a new baseline, the shape of the attention is itself the story. A single word, repeated often enough across enough channels, becomes the frame through which everything else is seen. ${keyword} is that word this year.`,
    ],
    pull: `“Learn it now, before someone who already has takes your place.”`,
    related: [
      `What ${keyword} means for the jobs that do not mention it`,
      `The investors betting against the ${keyword} consensus`,
      `Inside the data centres that ${keyword} is paying for`,
      `A short history of the last five keywords`,
    ],
  };
}

export type Listicle = { title: string; sub: string; author: string; read: string; claps: string; items: { title: string; blurb: string; figure: string }[]; outro: string };

const jobsList = [
  ['Customer service representative', 'Chat and voice agents already handle the first contact. The second is next.', '92%'],
  ['Data entry clerk', 'The form fills itself. The person who filled it does not.', '95%'],
  ['Translator', 'Quality is “good enough” for most contracts, and contracts decide.', '88%'],
  ['Paralegal', 'Discovery, summaries, first drafts: the billable hours that are gone.', '81%'],
  ['Bookkeeper', 'Reconciliation at scale, no lunch break, no certification.', '86%'],
  ['Copywriter', 'Twenty variants per brief, ranked by click-through before anyone reads them.', '79%'],
  ['Junior developer', 'The tasks that trained a junior are the tasks the tools do first.', '74%'],
  ['Telemarketer', 'The voice is synthetic and never discouraged.', '97%'],
  ['Graphic designer', 'The brief is the prompt. The portfolio is the training data.', '68%'],
  ['Radiologist', 'The scan is read before the doctor sits down. The doctor signs.', '61%'],
] as const;

export function listicleFor(keyword: string): Listicle {
  const item = (title: string, blurb: string, figure: string) => ({ title, blurb, figure });
  if (keyword === 'AI stocks' || keyword === 'AI 수혜주' || keyword === 'NVIDIA') return {
    title: keyword === 'AI 수혜주' ? 'AI 수혜주 7선: 아직 안 늦었다 (2026 하반기)' : '7 AI stocks that could 10x before 2030 (and the one everyone is missing)',
    sub: keyword === 'AI 수혜주' ? '엔비디아만 보다가 놓친 종목들. 지금 포지션이 없다면 이 글부터.' : 'If you only own the obvious one, you are early to the wrong party.',
    author: 'Nadia Keller', read: '7 min read', claps: '18.2K',
    items: [item('NVIDIA (NVDA)', 'Still the picks-and-shovels trade. The question is only how much more.', '+212% 1Y'), item('SK하이닉스 (000660)', 'HBM is the bottleneck, and the bottleneck sets the price.', '+164% 1Y'), item('Broadcom (AVGO)', 'Custom silicon for every hyperscaler that does not want to pay Nvidia.', '+96% 1Y'), item('Micron (MU)', 'Memory was boring until it was not.', '+131% 1Y'), item('TSMC (TSM)', 'Everything above is manufactured here.', '+71% 1Y'), item('Palantir (PLTR)', 'The software layer that governments and the Fortune 100 already bought.', '+248% 1Y'), item('The one everyone is missing', 'Scroll to the end. Subscribers only.', '???')],
    outro: 'Not financial advice. The author holds positions in all of the above and will not be selling.',
  };
  if (keyword === 'learn AI' || keyword === 'prompt engineering') return {
    title: '10 AI skills that will matter in 2027 (and the 90% of your current ones that won’t)',
    sub: 'A new list every quarter. This is the one hiring managers are reading now.',
    author: 'Nadia Keller', read: '9 min read', claps: '24.7K',
    items: [item('Prompting as a discipline', 'Not tricks: specs. The people who write them get paid like engineers.', '$180K median'), item('Agent orchestration', 'One model is a demo. Twelve in a loop is a product.', '+340% postings'), item('Evaluation', 'Knowing when the output is wrong is the whole job now.', 'new'), item('Retrieval and context', 'Your data, their model, your problem.', '+210% postings'), item('Fine-tuning', 'For the week each year when it is cheaper than prompting.', 'niche'), item('AI product management', 'Every PM role, renamed.', '+120% postings'), item('Workflow automation', 'The quiet skill that removes the loud ones.', 'everywhere'), item('Vibe coding', 'Shipping without reading. Reading optional.', 'contested'), item('AI literacy for managers', 'A course, a certificate, a line on the slide.', 'mandatory'), item('Explaining the layoffs', 'Communications has never been busier.', 'growing')],
    outro: 'The list from last quarter is linked below. Four of its ten are gone.',
  };
  if (keyword === 'CS graduates') return {
    title: 'The class of 2026: 10 things computer science graduates are doing instead of software jobs',
    sub: 'Six thousand applications later. A survey of one subreddit and several group chats.',
    author: 'Nadia Keller', read: '6 min read', claps: '31.9K',
    items: [item('Applying', 'The median is 1,200 applications. The mode is zero replies.', '1,200'), item('Prompt engineering bootcamps', 'Four weeks, $4,000, a certificate nobody has asked for.', '$4,000'), item('Master’s degrees', 'Two more years for the market to change its mind.', '+38%'), item('Restaurant management', 'The only company that called back.', 'true story'), item('Freelancing for AI companies', 'Labelling the data that replaces the job.', '$18/hr'), item('Starting an AI startup', 'YC says 70% of the batch is AI. So is 70% of the rejections.', '70%'), item('Teaching coding to kids', 'Who are told they will not need it.', 'ironic'), item('Content about not finding a job', 'The one growth sector.', '2.4M views'), item('Waiting', 'For the correction, the hiring freeze to thaw, the next keyword.', 'ongoing'), item('Learning AI', 'Of course.', 'everyone')],
    outro: 'If you are in the class of 2027, the comments have advice. Most of it is "start earlier".',
  };
  return {
    title: keyword === 'AI 대체 직업' ? 'AI로 대체될 직업 TOP 10 (2027년 기준, 당신의 직업은 몇 위?)' : '10 jobs that won’t exist by 2027 (is yours on the list?)',
    sub: keyword === 'AI 대체 직업' ? '세계경제포럼·골드만삭스·실제 채용 공고를 교차해 정리했다. 1위부터 보지 말고 끝까지 보라.' : 'Cross-referenced from the WEF, Goldman Sachs and the postings themselves. Don’t skip to number one.',
    author: 'Nadia Keller', read: '8 min read', claps: '42.3K',
    items: jobsList.map(([title, blurb, figure]) => item(title, blurb, figure)),
    outro: 'Number 11 is "writer of lists like this". The model that drafted this one is credited below.',
  };
}

export type Job = { id: string; title: string; company: string; place: string; posted: string; applicants: string; tags: string[]; easy: boolean; promoted: boolean };

export function jobsFor(keyword: string) {
  const job = (id: string, title: string, company: string, place: string, posted: string, applicants: string, tags: string[], easy = true, promoted = false): Job => ({ id, title, company, place, posted, applicants, tags, easy, promoted });
  const jobs: Job[] = [
    job('j1', 'Senior AI Engineer (LLM, Agents)', 'Orbital', 'Seoul · Hybrid', '2 hours ago', 'Over 100 applicants', ['5+ years with LLMs', 'Python', 'RAG'], true, true),
    job('j2', 'Founding AI Engineer', 'Hexa Labs', 'Remote', '4 hours ago', 'Over 100 applicants', ['0 → 1', 'Equity', 'Agents']),
    job('j3', 'Prompt Engineer (Contract)', 'Nordlake', 'Seoul', '1 day ago', 'Over 100 applicants', ['3+ years prompting', 'Evaluation', '$120–180K']),
    job('j4', 'AI Product Manager', 'Fintly', 'Pangyo · On-site', '1 day ago', 'Over 100 applicants', ['PM 5+ years', 'AI roadmap', 'B2B'], false, true),
    job('j5', 'Machine Learning Engineer, Agents', 'Kumo', 'Remote (KR)', '2 days ago', 'Over 100 applicants', ['PyTorch', 'Agents', 'MLOps']),
    job('j6', 'Head of AI Transformation', 'Veldt Group', 'Seoul', '3 days ago', '87 applicants', ['Change management', 'AI strategy', 'Exec']),
    job('j7', 'AI Automation Specialist', 'Agentry', 'Remote', '3 days ago', 'Over 100 applicants', ['n8n', 'Zapier', 'LLM APIs']),
    job('j8', 'Software Engineer II (AI-first team)', 'Orbital', 'Seoul · Hybrid', '4 days ago', 'Over 100 applicants', ['Ships with Copilot', '3+ years', 'TypeScript']),
    job('j9', 'AI Research Scientist', 'Hexa Labs', 'Seoul', '5 days ago', '64 applicants', ['PhD', 'Publications', 'RLHF']),
    job('j10', 'Data Annotator (AI Training)', 'Taskforce', 'Remote', '5 days ago', 'Over 100 applicants', ['$18/hr', 'Flexible', 'No experience']),
    job('j11', 'Customer Success Manager, AI Platform', 'Fintly', 'Seoul', '6 days ago', 'Over 100 applicants', ['SaaS', 'Enterprise', 'AI fluency']),
    job('j12', 'Junior Developer', 'Any', 'Anywhere', '', '0 results', [], false),
  ];
  const detail = keyword === 'CS graduates' ? jobs[7] : keyword === 'prompt engineering' ? jobs[2] : jobs[0];
  return {
    query: keyword === 'CS graduates' ? 'software engineer entry level' : keyword === 'prompt engineering' ? 'prompt engineer' : 'AI',
    count: keyword === 'CS graduates' ? '1,284 results · 0 entry level' : '14,702 results',
    jobs: jobs.filter(j => j.id !== 'j12' || keyword === 'CS graduates'),
    detail,
    about: `We are an AI-first company. Every role here uses AI daily and this one builds it. You will own agents in production, evaluate models weekly, and ship faster than the roadmap. ${keyword === 'CS graduates' ? 'This is not an entry-level position; we have paused entry-level hiring while we assess what the tools can do.' : 'Experience with LLMs in production is required.'}`,
    requirements: ['3+ years of experience building with large language models', 'Strong judgment about when the model is wrong', 'Comfort shipping without complete specs', 'Experience replacing a workflow with an agent, end to end', 'Bonus: you have written about it'],
  };
}

export type Quote = { symbol: string; name: string; price: string; change: string; percent: string; up: boolean; exchange: string; currency: string; points: number[]; stats: [string, string][]; headlines: string[]; watch: { symbol: string; name: string; percent: string; up: boolean }[] };

function series(seed: number, n: number, drift: number, noise: number) {
  let state = seed >>> 0 || 1;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
  const points: number[] = [];
  let value = 100;
  for (let i = 0; i < n; i++) { value *= 1 + drift + (random() - 0.5) * noise; points.push(value); }
  return points;
}

export function stockFor(keyword: string, seed: number): Quote {
  const korean = keyword === 'AI 수혜주';
  const watch = [
    { symbol: 'NVDA', name: 'NVIDIA', percent: '+4.35%', up: true }, { symbol: 'MU', name: 'Micron', percent: '+9.42%', up: true }, { symbol: 'SMCI', name: 'Super Micro', percent: '+12.7%', up: true },
    { symbol: 'AMD', name: 'AMD', percent: '+6.08%', up: true }, { symbol: 'AVGO', name: 'Broadcom', percent: '+3.21%', up: true }, { symbol: 'PLTR', name: 'Palantir', percent: '+5.93%', up: true },
    { symbol: '000660', name: 'SK하이닉스', percent: '+7.24%', up: true }, { symbol: '005930', name: '삼성전자', percent: '+3.10%', up: true }, { symbol: 'TSM', name: 'TSMC', percent: '+2.77%', up: true }, { symbol: 'ARM', name: 'Arm', percent: '-1.12%', up: false },
  ];
  return korean
    ? { symbol: '000660', name: 'SK하이닉스', price: '412,500', change: '+27,500', percent: '+7.14%', up: true, exchange: 'KOSPI', currency: 'KRW', points: series(seed, 120, 0.004, 0.03), stats: [['시가', '389,000'], ['고가', '415,000'], ['저가', '386,500'], ['거래량', '18,204,311'], ['시가총액', '300.3조'], ['PER', '14.2'], ['52주 최고', '415,000'], ['52주 최저', '142,800']], headlines: ['SK하이닉스, HBM4 공급 확대에 7% 급등…52주 신고가', '"AI 반도체 슈퍼사이클 아직 초입" 증권가 목표가 줄상향', '외국인 11거래일 연속 순매수…개인은 차익실현', '엔비디아 실적 앞두고 반도체주 동반 강세'], watch }
    : { symbol: 'NVDA', name: 'NVIDIA Corporation', price: '187.42', change: '+7.81', percent: '+4.35%', up: true, exchange: 'NASDAQ', currency: 'USD', points: series(seed, 120, 0.0035, 0.028), stats: [['Open', '180.12'], ['High', '188.90'], ['Low', '179.44'], ['Volume', '312.4M'], ['Market cap', '4.57T'], ['P/E', '58.3'], ['52w high', '188.90'], ['52w low', '86.62']], headlines: ['Nvidia jumps 4% as hyperscalers raise capex guidance again', 'Analyst: "Every dip in NVDA has been bought within hours"', 'Retail inflows into AI names hit record for third straight week', 'Is it too late to buy Nvidia? Five strategists weigh in'], watch };
}

export type Post = { title: string; company: string; author: string; age: string; body: string[]; likes: string; comments: { id: string; company: string; text: string; likes: string }[]; related: { title: string; company: string; count: string }[] };

export function communityFor(keyword: string): Post {
  const comment = (id: string, company: string, text: string, likes: string) => ({ id, company, text, likes });
  const base = {
    'CS graduates': { title: '컴공 졸업하고 1년째 백수인데 다들 어떻게 취직함?', company: '취준생', body: ['작년에 졸업하고 지원서 400개 넘게 냈는데 면접 3번 봄. 신입 공고 자체가 없음. 다 경력 3년 이상에 AI 경험 필수.', 'AI 경험이 3년이면 AI가 나온 지 3년인데 누가 있음?', '요즘은 그냥 AI 자격증 공부하는 중. 이게 맞나 싶은데 안 하면 더 불안함.'] },
    'AI layoffs': { title: '우리 팀 절반 정리됐다 (AI 전환 명목)', company: '네이버', body: ['오늘 통보 받음. 팀 12명 중 6명. 사유는 "AI 도입으로 인한 업무 효율화".', '남은 6명이 AI 돌리면서 12명 일 하면 된대. 그 AI 세팅은 우리가 했음.', '퇴직금 받고 AI 스타트업 간다는 사람 많던데 거기도 똑같다고 함.'] },
    'AI 자격증': { title: 'AI 자격증 이거 따면 진짜 도움 됨? (2주 완성 광고 보고)', company: '삼성전자', body: ['회사에서 AI 활용 평가 넣는다길래 급하게 알아보는 중. 2주 완성 29만원.', '같은 팀 사람 셋이 이미 땄다고 함. 안 따면 나만 없는 느낌.', '근데 이거 면접관들은 보긴 함?'] },
    'AI 대체 직업': { title: 'AI 대체 직업 순위 보고 이직 준비 시작함', company: '카카오', body: ['내 직업이 3위였음. 번역/문서 쪽.', '리스트 매주 바뀌는데 매주 내가 있음.', '상위권에 없는 직업으로 가려는데 그 직업들 공고에도 AI 필수라고 써있음.'] },
  } as const;
  const chosen = base[keyword as keyof typeof base] ?? { title: 'AI 때문에 신입 채용 전면 중단됐다는데 다른 회사도 그럼?', company: '토스', body: ['인사팀 공지 떴음. "AI 도입 효과 검증 전까지 신입 채용 중단".', '검증은 누가 언제 함? 아무도 모름.', '옆 회사도 비슷하다는데 다들 조용함. 조용한 게 더 무서움.'] };
  return {
    ...chosen,
    author: '익명',
    age: '2시간 전',
    body: [...chosen.body],
    likes: '312',
    comments: [
      comment('c1', '쿠팡', '우리도 똑같음. 조용히 TO 줄임', '88'),
      comment('c2', '현대자동차', 'AI 경력 3년 ㅋㅋㅋ 챗지피티 나온 게 2022년 말인데', '241'),
      comment('c3', '취준생', '저도 400개 넘게 냈습니다 힘내요 우리', '57'),
      comment('c4', 'LG전자', '지금 자격증 따봤자 내년에 또 바뀜. 근데 안 따면 불안하니까 땀', '132'),
      comment('c5', '네이버', '결국 AI 잘 쓰는 사람만 남는다는 말을 AI 잘 못 쓰는 임원이 함', '409'),
      comment('c6', '스타트업', '우리 회사 AI 전환 담당자 3명인데 다 작년에 들어옴', '64'),
      comment('c7', '삼성전자', '엔비디아나 샀어야 했는데', '198'),
      comment('c8', '취준생', '다음 키워드 뭐임? 미리 공부하게', '77'),
    ],
    related: [{ title: '프롬프트 엔지니어 연봉 인증', company: '스타트업', count: '512' }, { title: '우리 회사 AI 도입 후기 (안 좋음)', company: 'SK', count: '388' }, { title: '2027년 AGI 온다는데 뭐 준비함?', company: '카카오', count: '731' }, { title: '엔비디아 지금 들어가도 됨?', company: '현대자동차', count: '1,204' }, { title: '개발자 그만두고 AI 컨설턴트 됨', company: '네이버', count: '925' }],
  };
}

export type Result = { title: string; url: string; site: string; path: string; snippet: string };

const siteOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');
const result = (title: string, url: string, snippet: string): Result => ({ title, url, site: siteOf(url), path: new URL(url).pathname.replace(/\/$/, '').split('/').filter(Boolean).join(' › '), snippet });

export function googleResults(keyword: string) {
  const q = encodeURIComponent(keyword);
  const results: Result[] = [
    result(`10 Jobs That Won't Exist by 2027 (Is Yours on the List?)`, `https://medium.com/@nadiakeller/jobs-ai-2027`, `Customer service, data entry, translation, paralegals, bookkeeping, copywriting, junior developers… Cross-referenced from the WEF, Goldman Sachs and the postings themselves.`),
    result(`Goldman Sachs: AI could replace the equivalent of 300 million jobs`, `https://news.google.com/search?q=${q}`, `Generative AI could expose the equivalent of 300 million full-time jobs to automation, according to the bank's economists. Two-thirds of occupations are partially exposed.`),
    result(`r/cscareerquestions: 6,000 applications, 2 interviews, 0 offers`, `https://www.reddit.com/r/cscareerquestions/`, `Graduated May 2025 with a CS degree from a state school. Every posting wants 3+ years with LLMs. 3.4M members. Top post this week.`),
    result(`The AI stocks to buy now, according to 7 analysts`, `https://finance.yahoo.com/quote/NVDA/`, `Nvidia, Broadcom, Micron, TSMC and the names you have not heard of yet. "The dip gets bought within hours." Not investment advice.`),
    result(`Learn AI in 30 days: the course your manager keeps forwarding`, `https://www.coursera.org/search?query=ai`, `12,000 graduates. No background needed. Cohort 14 starts Monday. Certificate recognised by 400+ companies.`),
    result(`Layoffs.fyi: tech layoffs tracker`, `https://layoffs.fyi/`, `Live tracker of tech layoffs since 2020. Filter by "AI" in the reason column. Updated daily from public reports.`),
    result(`AI 2027`, `https://ai-2027.com/`, `A scenario: what the next two years of AI progress could look like, written by researchers who used to work on it. Read by everyone who sets a roadmap.`),
    result(`${keyword} videos`, `https://www.youtube.com/results?search_query=${q}`, `Explainers, countdowns, stock picks and warnings on ${keyword}, from one-hour lectures to ninety-second lists.`),
  ];
  return {
    overview: `Interest in ${keyword} has grown sharply since 2023. Analyses from the World Economic Forum, Goldman Sachs and the IMF estimate that between a third and two-thirds of occupations are exposed to automation, while new roles in AI engineering, evaluation and prompting are growing faster than they can be filled. Commentators advise acquiring AI skills now; others warn that the fear of being left behind is itself driving decisions.`,
    alsoAsk: [`Which jobs will AI replace first?`, `Is it too late to learn AI?`, `Is ${keyword} a bubble?`, `What should I do if my job is on the list?`],
    related: [`${keyword} 2027`, `${keyword} list`, `${keyword} reddit`, `${keyword} korea`, `${keyword} course`, `${keyword} salary`, `is ${keyword} too late`, `${keyword} safe jobs`],
    results,
    count: `About ${(3 + (keyword.length % 7)).toFixed(0)},${String(140 + keyword.length * 37).slice(0, 3)}0,000,000 results (0.${30 + keyword.length}s)`,
  };
}

export type Comment = { id: string; author: string; age: string; text: string; likes: string };

export function videoComments(keyword: string): Comment[] {
  const c = (id: string, author: string, age: string, text: string, likes: string): Comment => ({ id, author, age, text, likes });
  return [
    c('c1', '@mkim_dev', '3 days ago', `Got laid off the week this came out. Number 7 was my job. Watching this again from the job centre.`, '4.2K'),
    c('c2', '@ssunny', '1 day ago', `Bought NVDA at 30 because of a video like this. Not selling. Not financial advice.`, '1.8K'),
    c('c3', '@quietbear', '5 hours ago', `Everyone in my company suddenly has an AI title after this video`, '612'),
    c('c4', '@jpark', '2 days ago', `한국어 자막 있으면 좋겠어요. 우리 팀도 이거 보고 ${keyword} 회의함`, '297'),
    c('c5', '@notabot_', '6 days ago', `The list from last year had my job at #4. This year it's #2. See you next year at #1`, '2.9K'),
    c('c6', '@lenaw', '1 week ago', `Timestamps: 0:00 intro, 2:10 the list, 9:40 "is yours safe", 12:05 what to learn, 14:20 sponsor (an AI course)`, '1.1K'),
  ];
}

export type AdCopy = { brand: string; eyebrow: string; headline: string; sub: string; cta: string; secondary: string; bullets: string[]; price: string; was: string; stat: [string, string][]; quote: string; who: string; deadline: string };

export function adCopy(keyword: string): AdCopy {
  if (keyword === 'AI 자격증') return { brand: '에듀AI', eyebrow: '14기 10월 13일 개강 · 잔여 7석', headline: 'AI 활용능력 자격증, 2주면 됩니다', sub: '인사평가에 AI 활용도가 들어가기 전에. 비전공자 합격률 94%, 수료생 12,000명.', cta: '무료 체험 시작', secondary: '커리큘럼 보기', bullets: ['평일 저녁 라이브 2회', '실무 프로젝트 1:1 첨삭', '400개 기업 인정 수료증'], price: '290,000원', was: '590,000원', stat: [['12,000+', '수료생'], ['94%', '합격률'], ['2주', '완성']], quote: '팀에서 저만 없었는데, 2주 뒤엔 제가 가르치고 있었어요.', who: '마케터, 판교', deadline: '할인 마감까지 47:59:12' };
  if (keyword === 'prompt engineering') return { brand: 'Promptcraft', eyebrow: 'Cohort 9 · starts Monday', headline: 'Prompt engineering: the $180K skill nobody taught you', sub: 'Four weeks. No code. The role every company is hiring for and no university offers.', cta: 'Apply now', secondary: 'See outcomes', bullets: ['Live sessions with working prompt engineers', 'Portfolio of 12 production prompts', 'Hiring partners: 60+ AI companies'], price: '$1,490', was: '$2,900', stat: [['$180K', 'median salary*'], ['4', 'weeks'], ['60+', 'hiring partners']], quote: 'I was a copywriter. Now I write for the model, and it pays double.', who: 'Cohort 6 graduate', deadline: '*Self-reported. Offer ends in 47:59:12' };
  if (keyword === 'AI tools') return { brand: 'Agentry', eyebrow: 'The agent platform', headline: 'Your competitors already automated this', sub: 'Drag, connect, deploy. Your first agent in under ten minutes, no code required. 300+ apps.', cta: 'Build your agent', secondary: 'Watch demo (2:14)', bullets: ['Connects to 300+ apps', 'Human approval steps', 'Runs 24/7 on our cloud'], price: '$29', was: '$79', stat: [['300+', 'integrations'], ['10 min', 'to first agent'], ['24/7', 'runtime']], quote: 'It booked the meetings, wrote the notes and nobody noticed.', who: 'Founder, two-person team', deadline: '14-day free trial' };
  return { brand: 'Neuron Academy', eyebrow: 'Cohort 14 starts Monday', headline: 'Learn AI before your job does', sub: 'No background needed. 12,000 graduates. The curriculum your manager keeps forwarding, finished before the next performance review.', cta: 'Start free trial', secondary: 'See the syllabus', bullets: ['Live sessions twice a week', 'Portfolio project reviewed by mentors', 'Certificate recognised by 400+ companies'], price: '$49', was: '$129', stat: [['12,000+', 'graduates'], ['4.9', 'average rating'], ['30', 'days']], quote: 'I went from zero to running the AI rollout at work in five weeks. Two people on my team did not.', who: 'Product manager, Seoul', deadline: 'Offer ends in 47:59:12' };
}
