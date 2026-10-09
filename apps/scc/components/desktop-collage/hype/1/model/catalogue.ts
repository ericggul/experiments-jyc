import { chance, pick, type Random } from './random.ts';

// The deck: what a window can show for a keyword. Real pages open as they
// are on the web; cloned pages are served by this app and only look like
// the service they borrow their grammar from.

export type Kind = 'real' | 'clone';
export type PageType = 'encyclopedia' | 'video' | 'chat' | 'news' | 'search' | 'paper' | 'company' | 'ad';
export const clonePages = ['slack', 'article', 'google', 'youtube', 'ad'] as const;
export type ClonePage = typeof clonePages[number];
export type Entry = { id: string; keyword: string; kind: Kind; type: PageType; title: string; url?: string; page?: ClonePage; video?: string };

/** Verified through YouTube's oEmbed endpoint on 2026-10-09. */
export const videos = [
  { id: 'jvqFAi7vkBc', keyword: 'Sam Altman', title: 'Sam Altman: OpenAI, GPT-5, Sora, Board Saga, Elon Musk, Ilya, Power & AGI | Lex Fridman Podcast #419', channel: 'Lex Fridman', views: '6.1M views', age: '2 years ago', length: '2:32:51' },
  { id: 'zjkBMFhNj_g', keyword: 'LLM', title: '[1hr Talk] Intro to Large Language Models', channel: 'Andrej Karpathy', views: '4.8M views', age: '2 years ago', length: '59:48' },
  { id: 'ugvHCXCOmm4', keyword: 'Anthropic', title: 'Dario Amodei: Anthropic CEO on Claude, AGI & the Future of AI & Humanity | Lex Fridman Podcast #452', channel: 'Lex Fridman', views: '2.3M views', age: '11 months ago', length: '5:15:32' },
  { id: '1yvBqasHLZs', keyword: 'AGI', title: 'Ilya Sutskever: "Sequence to sequence learning with neural networks: what a decade"', channel: 'seremot', views: '1.1M views', age: '10 months ago', length: '24:36' },
  { id: 'Y2F8yisiS6E', keyword: 'Jensen Huang', title: 'GTC March 2024 Keynote with NVIDIA CEO Jensen Huang', channel: 'NVIDIA', views: '3.4M views', age: '2 years ago', length: '2:03:46' },
] as const;
export type Video = typeof videos[number];
export const videoById = (id: string) => videos.find(video => video.id === id);

const real = (id: string, keyword: string, type: PageType, title: string, url: string): Entry => ({ id, keyword, kind: 'real', type, title, url });
const clone = (page: ClonePage, keyword: string, type: PageType, title: string, video?: string): Entry => ({ id: `clone-${page}-${video ?? keyword.toLowerCase().replace(/\s+/g, '-')}`, keyword, kind: 'clone', type, title, page, video });
const wiki = (id: string, keyword: string, article: string, title: string) => real(id, keyword, 'encyclopedia', `${title} — Wikipedia`, `https://en.wikipedia.org/wiki/${article}`);
const google = (id: string, keyword: string, query: string, news = false) => real(id, keyword, 'search', `Google${news ? ' News' : ''}: ${query}`, `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en${news ? '&tbm=nws' : ''}`);
const watch = (video: Video) => real(`yt-${video.id}`, video.keyword, 'video', `YouTube: ${video.title}`, `https://www.youtube.com/watch?v=${video.id}`);

export const catalogue: readonly Entry[] = [
  wiki('wiki-ai', 'AI', 'Artificial_intelligence', 'Artificial intelligence'),
  real('wiki-ai-ko', 'AI', 'encyclopedia', '인공지능 — 위키백과', 'https://ko.wikipedia.org/wiki/%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5'),
  google('google-ai', 'AI', 'artificial intelligence'),
  real('gnews-ai', 'AI', 'news', 'Google News: AI', 'https://news.google.com/search?q=AI&hl=en-US&gl=US&ceid=US:en'),
  real('naver-ai', 'AI', 'news', '네이버 뉴스: AI', 'https://search.naver.com/search.naver?where=news&query=AI'),
  real('hn', 'AI', 'news', 'Hacker News', 'https://news.ycombinator.com/'),
  real('verge-ai', 'AI', 'news', 'The Verge: AI', 'https://www.theverge.com/ai-artificial-intelligence'),
  real('techcrunch-ai', 'AI', 'news', 'TechCrunch: AI', 'https://techcrunch.com/category/artificial-intelligence/'),
  real('trends-ai', 'AI', 'search', 'Google Trends: AI', 'https://trends.google.com/trends/explore?q=AI&hl=en'),
  real('hf', 'AI', 'company', 'Hugging Face', 'https://huggingface.co/'),
  real('arxiv-cs-ai', 'AI', 'paper', 'arXiv cs.AI, recent', 'https://arxiv.org/list/cs.AI/recent'),
  real('yt-search-ai', 'AI', 'video', 'YouTube: artificial intelligence', 'https://www.youtube.com/results?search_query=artificial+intelligence'),
  wiki('wiki-agi', 'AGI', 'Artificial_general_intelligence', 'Artificial general intelligence'),
  google('google-agi', 'AGI', 'AGI'),
  real('yt-search-agi', 'AGI', 'video', 'YouTube: AGI', 'https://www.youtube.com/results?search_query=agi'),
  wiki('wiki-genai', 'generative AI', 'Generative_artificial_intelligence', 'Generative artificial intelligence'),
  google('google-genai', 'generative AI', 'generative ai'),
  wiki('wiki-llm', 'LLM', 'Large_language_model', 'Large language model'),
  real('arxiv-attention', 'LLM', 'paper', 'Attention Is All You Need — arXiv', 'https://arxiv.org/abs/1706.03762'),
  wiki('wiki-openai', 'OpenAI', 'OpenAI', 'OpenAI'),
  real('openai', 'OpenAI', 'company', 'OpenAI', 'https://openai.com/'),
  wiki('wiki-chatgpt', 'ChatGPT', 'ChatGPT', 'ChatGPT'),
  real('chatgpt', 'ChatGPT', 'company', 'ChatGPT', 'https://chatgpt.com/'),
  wiki('wiki-nvidia', 'NVIDIA', 'Nvidia', 'Nvidia'),
  real('nvidia-ai', 'NVIDIA', 'company', 'NVIDIA AI', 'https://www.nvidia.com/en-us/ai/'),
  real('naver-nvidia', 'NVIDIA', 'news', '네이버 뉴스: 엔비디아', 'https://search.naver.com/search.naver?where=news&query=%EC%97%94%EB%B9%84%EB%94%94%EC%95%84'),
  wiki('wiki-agent', 'AI agents', 'Intelligent_agent', 'Intelligent agent'),
  google('google-agents', 'AI agents', 'ai agents'),
  wiki('wiki-altman', 'Sam Altman', 'Sam_Altman', 'Sam Altman'),
  wiki('wiki-gpu', 'GPU', 'Graphics_processing_unit', 'Graphics processing unit'),
  real('nvidia-dc', 'GPU', 'company', 'NVIDIA Data Center', 'https://www.nvidia.com/en-us/data-center/'),
  wiki('wiki-xai', 'xAI', 'XAI_(company)', 'xAI'),
  real('xai', 'xAI', 'company', 'xAI', 'https://x.ai/'),
  real('nvidia-physical', 'physical AI', 'company', 'NVIDIA: What is Physical AI?', 'https://www.nvidia.com/en-us/glossary/physical-ai/'),
  google('google-physical', 'physical AI', 'physical ai'),
  wiki('wiki-boom', 'AI bubble', 'AI_boom', 'AI boom'),
  google('gnews-bubble', 'AI bubble', 'ai bubble', true),
  wiki('wiki-anthropic', 'Anthropic', 'Anthropic', 'Anthropic'),
  real('anthropic', 'Anthropic', 'company', 'Anthropic', 'https://www.anthropic.com/'),
  wiki('wiki-huang', 'Jensen Huang', 'Jensen_Huang', 'Jensen Huang'),
  wiki('wiki-asi', 'superintelligence', 'Superintelligence', 'Superintelligence'),
  wiki('wiki-ml', 'machine learning', 'Machine_learning', 'Machine learning'),
  wiki('wiki-schmidt', 'Eric Schmidt', 'Eric_Schmidt', 'Eric Schmidt'),
  real('yt-search-schmidt', 'Eric Schmidt', 'video', 'YouTube: eric schmidt ai', 'https://www.youtube.com/results?search_query=eric+schmidt+ai'),
  wiki('wiki-semi', 'semiconductors', 'Semiconductor_industry', 'Semiconductor industry'),
  real('naver-semi', 'semiconductors', 'news', '네이버 뉴스: 반도체', 'https://search.naver.com/search.naver?where=news&query=%EB%B0%98%EB%8F%84%EC%B2%B4'),
  wiki('wiki-dl', 'deep learning', 'Deep_learning', 'Deep learning'),
  wiki('wiki-nn', 'neural network', 'Neural_network_(machine_learning)', 'Neural network'),
  ...videos.map(watch),

  ...['AI', 'AGI', 'NVIDIA', 'AI agents', 'OpenAI', 'AI bubble', 'GPU'].map(keyword => clone('slack', keyword, 'chat', 'Slack · #ai-general')),
  ...['AI', 'AGI', 'AI bubble', 'NVIDIA', 'OpenAI', 'generative AI', 'physical AI', 'AI agents', 'xAI', 'Sam Altman', 'superintelligence', 'semiconductors'].map(keyword => clone('article', keyword, 'news', 'Signal · article')),
  ...['AI', 'AGI', 'LLM', 'generative AI', 'AI agents', 'AI bubble', 'xAI', 'physical AI', 'superintelligence', 'Anthropic', 'machine learning'].map(keyword => clone('google', keyword, 'search', 'Google · results')),
  ...videos.map(video => clone('youtube', video.keyword, 'video', 'YouTube · watch', video.id)),
  ...['AI', 'LLM', 'AI agents', 'GPU', 'machine learning'].map(keyword => clone('ad', keyword, 'ad', 'Landing page')),
];

export type Deck = { used: Set<string> };
export const createDeck = (): Deck => ({ used: new Set() });

/**
 * A page for the keyword: cloned with probability `cloneShare` %, otherwise
 * real; the other kind, then the root's pages, when the keyword has none
 * left. At 0 % and 100 % only that kind is ever drawn. A page repeats only
 * once every page of the kinds allowed has been used.
 */
export function drawEntry(deck: Deck, keyword: string, cloneShare: number, random: Random, root = 'AI'): Entry {
  const first: Kind = chance(random, cloneShare / 100) ? 'clone' : 'real';
  const second: Kind = first === 'clone' ? 'real' : 'clone';
  const only = cloneShare <= 0 ? 'real' : cloneShare >= 100 ? 'clone' : undefined;
  const order: [string, Kind][] = only ? [[keyword, only], [root, only]] : [[keyword, first], [keyword, second], [root, first], [root, second]];
  for (const [k, kind] of order) {
    const candidates = catalogue.filter(entry => entry.keyword === k && entry.kind === kind && !deck.used.has(entry.id));
    if (candidates.length) {
      const entry = pick(random, candidates);
      deck.used.add(entry.id);
      return entry;
    }
  }
  deck.used.clear();
  const entry = pick(random, catalogue.filter(entry => (entry.keyword === keyword || entry.keyword === root) && (!only || entry.kind === only)));
  deck.used.add(entry.id);
  return entry;
}
