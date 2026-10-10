import { chance, pick, type Random } from './random.ts';

// The deck: what a window can show for a FOMO topic around AI. Real pages
// open as they are on the web; cloned pages are served by this app and only
// look like the service they borrow their grammar from; image and video
// pages show one file, as a saved screenshot or a video opened on its own.

export type Kind = 'real' | 'clone';
export type PageType = 'encyclopedia' | 'video' | 'chat' | 'news' | 'search' | 'jobs' | 'market' | 'forum' | 'company' | 'ad' | 'image';
export const clonePages = ['slack', 'article', 'google', 'youtube', 'ad', 'listicle', 'jobs', 'stock', 'community', 'image', 'video'] as const;
export type ClonePage = typeof clonePages[number];
export type Entry = { id: string; keyword: string; kind: Kind; type: PageType; title: string; url?: string; page?: ClonePage; video?: string; image?: number };

/** From YouTube's own search results for the FOMO queries, 2026-10-10; titles and channels from oEmbed. */
export const videos = [
  { id: 'nzAG99YVd14', keyword: 'AI jobs', title: 'Top 20 Jobs AI Will Replace', channel: 'The Infographics Show', views: '3.1M views', age: '1 year ago', length: '19:02' },
  { id: 'eFOrnvdXL0g', keyword: 'AI jobs', title: '25 Jobs That AI Is SECRETLY Taking Over in 2025', channel: 'AI Career Guru', views: '412K views', age: '8 months ago', length: '14:37' },
  { id: '9DM8fbiIjgk', keyword: 'AI jobs', title: 'TOP 10 JOBS AI CAN NEVER REPLACE! (Are You Safe?)', channel: 'CareerVidz', views: '1.2M views', age: '1 year ago', length: '11:48' },
  { id: 'm9FWcmVeX8Y', keyword: 'AI stocks', title: 'The Best AI Stocks To Buy In 2026', channel: 'Tom Nash', views: '286K views', age: '3 weeks ago', length: '16:20' },
  { id: 'K1gIwnXgd_Y', keyword: 'AI stocks', title: "Why Wedbush's Dan Ives says these five AI stocks will boom in 2026", channel: 'CNBC Television', views: '198K views', age: '2 months ago', length: '6:41' },
  { id: 'xK6FAcjYCiE', keyword: 'AI stocks', title: 'AI Stocks Will “Outrun The Avalanche”: CIO On What To Buy And What To Avoid', channel: 'TheStreet', views: '64K views', age: '1 month ago', length: '8:12' },
  { id: 'KW067woSxws', keyword: 'CS graduates', title: 'How AI Is Killing The Value Of A College Degree', channel: 'CNBC', views: '2.4M views', age: '7 months ago', length: '21:05' },
  { id: 'S5U76LPu_bQ', keyword: 'CS graduates', title: 'Is a Computer Science Degree WORTHLESS 🤯? (in the age of AI)', channel: 'Thu Vu', views: '534K views', age: '10 months ago', length: '13:26' },
  { id: 'CzMECHtiF18', keyword: 'learn AI', title: 'Learn AI or get Left Behind?', channel: 'Wreckoning Bros', views: '89K views', age: '5 months ago', length: '9:54' },
  { id: 'JiAnmE1NM4Q', keyword: 'learn AI', title: "Why YOU WILL get left behind if you don't learn AI", channel: 'Jarrett Wroten', views: '41K views', age: '3 months ago', length: '12:10' },
  { id: '-xkBMxdPaME', keyword: 'AI 대체 직업', title: '"도대체 어떤 직업이 살아 남을까요?" 손석희가 묻자.. [뉴스.zip/MBC뉴스]', channel: 'MBCNEWS', views: '조회수 1.8M회', age: '1년 전', length: '24:51' },
  { id: 'L92PJ-0zX64', keyword: 'AI 대체 직업', title: 'AI 때문에 사라질 직업 TOP10', channel: '아토(Ato) 브리핑', views: '조회수 420K회', age: '9개월 전', length: '10:12' },
  { id: 'pOJtNdg8UVQ', keyword: 'AI 대체 직업', title: 'AI시대의 공습, 2030년 사라질 직업 TOP 10', channel: '제2의소식', views: '조회수 210K회', age: '6개월 전', length: '12:40' },
  { id: 'MYygMVtxy6c', keyword: 'AI 대체 직업', title: 'AI로 대체되기 가장 쉬운 직업은?', channel: 'EBS', views: '조회수 96K회', age: '4개월 전', length: '7:33' },
  { id: '9XA6vyTLmcM', keyword: 'AI 수혜주', title: '하반기 증시 주도주 재편! AI 수혜주 지금이라도 갈아탈까?ㅣ먼데이 종결자', channel: '한국경제TV', views: '조회수 58K회', age: '2개월 전', length: '31:18' },
  { id: 'Fc2LdFnfpxI', keyword: 'AI 수혜주', title: "지금 무조건 사야 할 미국 주식, '이 2개 주식' 무섭게 폭등한다 (반교수 이주택 교수)", channel: '김작가 TV', views: '조회수 312K회', age: '3주 전', length: '28:44' },
  { id: 'CfHuXvgLySg', keyword: 'AI 수혜주', title: '[주식의 발견] 주요 AI 기업 실적 시즌, 지금 선점할 수혜주는?', channel: 'SBS Biz 증권', views: '조회수 44K회', age: '1개월 전', length: '18:07' },
  { id: 'VIbpFMfBiK0', keyword: 'AI 수혜주', title: 'AI 대폭발! 지금 잡아야 할 진짜 수혜주는?ㅣ신현식 이슈리포트', channel: '신현식 이슈 리포트', views: '조회수 27K회', age: '2주 전', length: '15:29' },
] as const;
export type Video = typeof videos[number];
export const videoById = (id: string) => videos.find(video => video.id === id);

/** Public images: Wikipedia lead images (upload.wikimedia.org, 2026-10-10) and stills of the videos above, named as saved files. */
export const images = [
  { src: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Jen-Hsun_Huang_2025.jpg', name: 'jensen-huang-keynote.jpg', width: 645, height: 839, keyword: 'NVIDIA' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Meeting_with_Masayoshi_Son_and_Sam_Altman_%28February_3%2C_2025%29_%283x4_cropped_on_Altman%29.jpg', name: 'sam-altman-feb-2025.jpg', width: 390, height: 520, keyword: 'AGI 2027' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Data_Center_of_CNPC.jpg/1920px-Data_Center_of_CNPC.jpg', name: 'datacenter.jpg', width: 1920, height: 1080, keyword: 'AI stocks' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Elon_Musk_-_54820081119_%28cropped%29.jpg/1200px-Elon_Musk_-_54820081119_%28cropped%29.jpg', name: 'IMG_4471.jpg', width: 1200, height: 1577, keyword: 'AI' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Pyxis_Pharmacy_Robot_by_Nurse_Station.JPG', name: 'pharmacy-robot.JPG', width: 1194, height: 1194, keyword: 'AI jobs' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/2788-2888_San_Tomas_Expwy.jpg/1920px-2788-2888_San_Tomas_Expwy.jpg', name: 'nvidia-hq-santa-clara.jpg', width: 1920, height: 1292, keyword: 'NVIDIA' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/9/93/P20260929DT-1655_%2855561811540%29_%28cropped%29.jpg', name: 'zuck-2026.jpg', width: 443, height: 591, keyword: 'AI' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Dario_Amodei_at_TechCrunch_Disrupt_2023_01_%28cropped%29.jpg/1200px-Dario_Amodei_at_TechCrunch_Disrupt_2023_01_%28cropped%29.jpg', name: 'amodei-disrupt.jpg', width: 1200, height: 1553, keyword: 'AGI 2027' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Wikimedia-servers-Sept04.jpg', name: 'servers.jpg', width: 450, height: 600, keyword: 'AI tools' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Unemployment_rate%2C_World%2C_2025_%28cropped%29.svg/1600px-Unemployment_rate%2C_World%2C_2025_%28cropped%29.svg.png', name: 'unemployment-rate-world-2025.png', width: 1600, height: 984, keyword: 'AI jobs' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Optimus_bot_at_Tesla_showroom_-_20251118_-_01.jpg/1200px-Optimus_bot_at_Tesla_showroom_-_20251118_-_01.jpg', name: 'optimus-showroom.jpg', width: 1200, height: 2133, keyword: 'AI jobs' },
  { src: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/21/Stock_market_crash_%282020%29.svg/1600px-Stock_market_crash_%282020%29.svg.png', name: 'crash-2020.png', width: 1600, height: 989, keyword: 'AI bubble' },
  { src: 'https://i.ytimg.com/vi/nzAG99YVd14/maxresdefault.jpg', name: 'Screenshot 2026-10-09 at 23.41.12.png', width: 1280, height: 720, keyword: 'AI jobs' },
  { src: 'https://i.ytimg.com/vi/m9FWcmVeX8Y/maxresdefault.jpg', name: 'Screenshot 2026-10-10 at 00.03.57.png', width: 1280, height: 720, keyword: 'AI stocks' },
  { src: 'https://i.ytimg.com/vi/KW067woSxws/maxresdefault.jpg', name: 'Screenshot 2026-10-08 at 17.22.40.png', width: 1280, height: 720, keyword: 'CS graduates' },
  { src: 'https://i.ytimg.com/vi/L92PJ-0zX64/maxresdefault.jpg', name: '스크린샷 2026-10-10 오전 1.12.08.png', width: 1280, height: 720, keyword: 'AI 대체 직업' },
  { src: 'https://i.ytimg.com/vi/9XA6vyTLmcM/maxresdefault.jpg', name: '스크린샷 2026-10-07 오후 9.48.31.png', width: 1280, height: 720, keyword: 'AI 수혜주' },
] as const;

// Udemy, Indeed, Product Hunt and There's An AI For That passed a first check
// and answered a second with Cloudflare's "Just a moment…" page (2026-10-11),
// so they are out; Google web search, LinkedIn Jobs and Reddit never loaded.
const real = (id: string, keyword: string, type: PageType, title: string, url: string): Entry => ({ id, keyword, kind: 'real', type, title, url });
const clone = (page: ClonePage, keyword: string, type: PageType, title: string, extra: { video?: string; image?: number } = {}): Entry => ({ id: `clone-${page}-${extra.video ?? (extra.image !== undefined ? `img${extra.image}` : keyword.toLowerCase().replace(/\s+/g, '-'))}`, keyword, kind: 'clone', type, title, page, ...extra });
const wiki = (id: string, keyword: string, article: string, title: string) => real(id, keyword, 'encyclopedia', `${title} — Wikipedia`, `https://en.wikipedia.org/wiki/${article}`);
const gnews = (id: string, keyword: string, query: string) => real(id, keyword, 'news', `Google News: ${query}`, `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`);
const naver = (id: string, keyword: string, query: string) => real(id, keyword, 'news', `네이버 뉴스: ${query}`, `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}`);
const ytSearch = (id: string, keyword: string, query: string) => real(id, keyword, 'video', `YouTube: ${query}`, `https://www.youtube.com/results?search_query=${encodeURIComponent(query).replace(/%20/g, '+')}`);
const watch = (video: Video) => real(`yt-${video.id}`, video.keyword, 'video', `YouTube: ${video.title}`, `https://www.youtube.com/watch?v=${video.id}`);

export const catalogue: readonly Entry[] = [
  gnews('gnews-jobs', 'AI jobs', 'jobs replaced by AI'),
  gnews('gnews-layoffs', 'AI layoffs', 'AI layoffs'),
  gnews('gnews-stocks', 'AI stocks', 'AI stocks to buy'),
  gnews('gnews-grads', 'CS graduates', 'computer science graduates unemployment'),
  gnews('gnews-agi', 'AGI 2027', 'AGI 2027'),
  gnews('gnews-learn', 'learn AI', 'learn AI skills'),
  gnews('gnews-bubble', 'AI bubble', 'AI bubble'),
  gnews('gnews-prompt', 'prompt engineering', 'prompt engineer salary'),
  gnews('gnews-tools', 'AI tools', 'new AI tools'),
  naver('naver-jobs', 'AI 대체 직업', 'AI 대체 직업'),
  naver('naver-stocks', 'AI 수혜주', 'AI 수혜주'),
  naver('naver-devjobs', 'CS graduates', '개발자 채용 감소'),
  naver('naver-youth', 'AI jobs', '청년 취업난'),
  naver('naver-cert', 'AI 자격증', 'AI 자격증'),
  naver('naver-nvda', 'NVIDIA', '엔비디아 주가'),
  naver('naver-layoffs', 'AI layoffs', 'AI 해고'),
  naver('naver-hbm', 'AI 수혜주', 'SK하이닉스 HBM'),
  ytSearch('yts-jobs', 'AI jobs', 'jobs ai will replace'),
  ytSearch('yts-stocks', 'AI stocks', 'ai stocks to buy now'),
  ytSearch('yts-grads', 'CS graduates', 'cs degree worthless'),
  ytSearch('yts-learn', 'learn AI', 'learn ai 2026'),
  ytSearch('yts-jobs-ko', 'AI 대체 직업', 'ai 대체 직업'),
  ytSearch('yts-stocks-ko', 'AI 수혜주', 'ai 수혜주'),
  ytSearch('yts-layoffs', 'AI layoffs', 'ai layoffs 2026'),
  real('layoffs-fyi', 'AI layoffs', 'news', 'Layoffs.fyi', 'https://layoffs.fyi/'),
  real('wrtmj', 'AI jobs', 'news', 'Will Robots Take My Job?', 'https://willrobotstakemyjob.com/'),
  real('ai-2027', 'AGI 2027', 'news', 'AI 2027', 'https://ai-2027.com/'),
  real('situational', 'AGI 2027', 'news', 'Situational Awareness', 'https://situational-awareness.ai/'),
  real('metaculus-agi', 'AGI 2027', 'market', 'Metaculus: date of AGI', 'https://www.metaculus.com/questions/5121/date-of-artificial-general-intelligence/'),
  real('yahoo-nvda', 'AI stocks', 'market', 'NVDA — Yahoo Finance', 'https://finance.yahoo.com/quote/NVDA/'),
  real('tv-nvda', 'NVIDIA', 'market', 'NVDA — TradingView', 'https://www.tradingview.com/symbols/NASDAQ-NVDA/'),
  real('naver-fin-hynix', 'AI 수혜주', 'market', 'SK하이닉스 — 네이버 증권', 'https://m.stock.naver.com/domestic/stock/000660/total'),
  real('naver-fin-nvda', 'NVIDIA', 'market', '엔비디아 — 네이버 증권', 'https://m.stock.naver.com/worldstock/stock/NVDA.O/total'),
  real('wanted', 'AI jobs', 'jobs', '원티드: AI', 'https://www.wanted.co.kr/search?query=AI'),
  real('saramin', 'AI jobs', 'jobs', '사람인: AI', 'https://www.saramin.co.kr/zf_user/search?searchword=AI'),
  real('jobkorea', 'AI jobs', 'jobs', '잡코리아: AI', 'https://www.jobkorea.co.kr/Search/?stext=AI'),
  real('hn-jobs', 'AI jobs', 'jobs', 'Hacker News: jobs', 'https://news.ycombinator.com/jobs'),
  real('coursera', 'learn AI', 'ad', 'Coursera: AI', 'https://www.coursera.org/search?query=ai'),
  real('yc-ai', 'AI tools', 'company', 'Y Combinator: AI companies', 'https://www.ycombinator.com/companies/industry/artificial-intelligence'),
  real('wef-jobs', 'AI jobs', 'news', 'WEF: Future of Jobs Report 2025', 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/'),
  real('epoch', 'AGI 2027', 'news', 'Epoch AI: trends', 'https://epoch.ai/trends'),
  real('owid', 'AI', 'news', 'Our World in Data: AI', 'https://ourworldindata.org/artificial-intelligence'),
  real('trends-jobs', 'AI jobs', 'search', 'Google Trends: AI jobs', 'https://trends.google.com/trends/explore?q=AI%20jobs&hl=en'),
  wiki('wiki-techunemp', 'AI jobs', 'Technological_unemployment', 'Technological unemployment'),
  wiki('wiki-boom', 'AI bubble', 'AI_boom', 'AI boom'),
  ...videos.map(watch),

  ...['AI jobs', 'AI layoffs', 'AI stocks', 'AI 자격증'].map(keyword => clone('slack', keyword, 'chat', 'Slack · #general')),
  ...['AI jobs', 'AI stocks', 'CS graduates', 'AI layoffs', 'learn AI', 'AGI 2027', 'AI bubble', 'NVIDIA'].map(keyword => clone('article', keyword, 'news', 'Signal · article')),
  ...['AI jobs', 'AI 대체 직업', 'AI stocks', 'learn AI', 'CS graduates', 'prompt engineering', 'AI 수혜주'].map(keyword => clone('listicle', keyword, 'news', 'Medium · list')),
  ...['AI jobs', 'CS graduates', 'prompt engineering'].map(keyword => clone('jobs', keyword, 'jobs', 'LinkedIn · jobs')),
  ...['AI stocks', 'NVIDIA', 'AI 수혜주'].map(keyword => clone('stock', keyword, 'market', 'Quote · chart')),
  ...['CS graduates', 'AI layoffs', 'AI 자격증', 'AI 대체 직업', 'AI jobs'].map(keyword => clone('community', keyword, 'forum', 'Blind · post')),
  ...['AI jobs', 'AI stocks', 'learn AI', 'CS graduates', 'AGI 2027', 'AI 수혜주', 'AI 대체 직업'].map(keyword => clone('google', keyword, 'search', 'Google · results')),
  ...videos.map(video => clone('youtube', video.keyword, 'video', 'YouTube · watch', { video: video.id })),
  ...['learn AI', 'prompt engineering', 'AI 자격증', 'AI tools'].map(keyword => clone('ad', keyword, 'ad', 'Landing page')),
  ...images.map((image, index) => clone('image', image.keyword, 'image', image.name, { image: index })),
  ...videos.map(video => clone('video', video.keyword, 'video', 'Video', { video: video.id })),
];

export type Deck = { used: Set<string> };
export const createDeck = (): Deck => ({ used: new Set() });

/**
 * A page for the keyword: cloned with probability `cloneShare` %, otherwise
 * real; the other kind, then any keyword's pages, when the keyword has none
 * left. At 0 % and 100 % only that kind is ever drawn. A page repeats only
 * once every page of the kinds allowed has been used.
 */
export function drawEntry(deck: Deck, keyword: string, cloneShare: number, random: Random): Entry {
  const first: Kind = chance(random, cloneShare / 100) ? 'clone' : 'real';
  const second: Kind = first === 'clone' ? 'real' : 'clone';
  const only = cloneShare <= 0 ? 'real' : cloneShare >= 100 ? 'clone' : undefined;
  const order: [string | undefined, Kind][] = only ? [[keyword, only], [undefined, only]] : [[keyword, first], [keyword, second], [undefined, first], [undefined, second]];
  for (const [k, kind] of order) {
    const candidates = catalogue.filter(entry => (k === undefined || entry.keyword === k) && entry.kind === kind && !deck.used.has(entry.id));
    if (candidates.length) {
      const entry = pick(random, candidates);
      deck.used.add(entry.id);
      return entry;
    }
  }
  deck.used.clear();
  const entry = pick(random, catalogue.filter(entry => !only || entry.kind === only));
  deck.used.add(entry.id);
  return entry;
}
