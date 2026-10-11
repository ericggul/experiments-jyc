import type { Channel, Short, Video } from './data';

type Lookup = { channels: Channel[] };

// Home feed by chip. "recent" = last 30 days, newest first; "new" = not in history.
export function filterHome(list: Video[], chip: string, history: string[], hidden: string[]) {
  const visible = list.filter(item => !hidden.includes(item.id));
  if (chip === 'all') return visible;
  if (chip === 'recent') return visible.filter(item => item.days <= 30).sort((a, b) => a.days - b.days);
  if (chip === 'new') return visible.filter(item => !history.includes(item.id));
  return visible.filter(item => item.topics.includes(chip));
}

// Up next: same channel first, then shared topics, then the rest; never the current video.
export function upNext(list: Video[], current: Video) {
  const score = (item: Video) => (item.channelId === current.channelId ? 4 : 0) + item.topics.filter(topic => current.topics.includes(topic)).length;
  return list
    .filter(item => item.id !== current.id)
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(entry => entry.item);
}

const words = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

// Every query word must appear in the title, channel name, tags or topics.
export function matches(item: Video | Short, query: string, { channels }: Lookup) {
  const terms = words(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return false;
  const channel = channels.find(entry => entry.id === item.channelId);
  const haystack = words([item.title, channel?.name ?? '', channel?.handle ?? '', ...('tags' in item ? item.tags : []), ...('topics' in item ? item.topics : [])].join(' '));
  return terms.every(term => haystack.includes(term));
}

export function suggestions(query: string, pool: string[], limit = 8) {
  const q = words(query).trim();
  if (!q) return [];
  const seen = new Set<string>();
  const starts: string[] = [];
  const contains: string[] = [];
  for (const entry of pool) {
    const key = words(entry);
    if (seen.has(key) || key === q) continue;
    seen.add(key);
    if (key.startsWith(q)) starts.push(entry.toLowerCase());
    else if (key.includes(q)) contains.push(entry.toLowerCase());
  }
  return [...starts, ...contains].slice(0, limit);
}

// Most recent first, unique, capped.
export function pushRecent(list: string[], id: string, cap = 50) {
  return [id, ...list.filter(entry => entry !== id)].slice(0, cap);
}

export function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter(entry => entry !== id) : [...list, id];
}
