import type { Clip, Creator } from './data';

// A bounded, ordered selection of portrait WebM files. Each entry is one source video.
// Commons metadata supplies the actual artist, license, source URL, and media URL.
export const curatedVideos = [
  { title: 'File:Baby Chick Hatching.webm', caption: 'A chick finds its way out of the shell', tags: ['animals', 'chick'] },
  { title: 'File:Crème brûlée.webm', caption: 'That first crack in the crème brûlée', tags: ['food', 'dessert'] },
  { title: 'File:Seagull and pigeons eating bread.webm', caption: 'The seagull joins the pigeons for bread', tags: ['birds', 'street'] },
  { title: 'File:Spectacle of Dancing Lights.webm', caption: 'A small spectacle of moving lights', tags: ['lights', 'night'] },
  { title: 'File:My shopping cart conveyor experience.webm', caption: 'The shopping cart takes the conveyor', tags: ['everyday', 'shopping'] },
  { title: 'File:Flamingos at Disney\'s Animal Kingdom Lodge (36556953892).webm', caption: 'Flamingos moving together by the water', tags: ['flamingos', 'animals'] },
  { title: 'File:Arin Hanson at Anime Expo 2011.webm', caption: 'A quick moment from Anime Expo', tags: ['expo', 'moment'] },
  { title: 'File:Crossness steam engine.webm', caption: 'A steam engine moving up close', tags: ['engine', 'motion'] },
  { title: 'File:Video of Toy Soldiers.webm', caption: 'Toy soldiers in motion', tags: ['toys', 'miniature'] },
  { title: 'File:Vertical-axis wind turbine at Hartnell College Alisal Campus.gk.webm', caption: 'A vertical wind turbine turning', tags: ['wind', 'motion'] },
  { title: 'File:Traditional Costume.webm', caption: 'A closer look at traditional costume', tags: ['costume', 'style'] },
  { title: 'File:Flagpole on the Taunton Green with US and Taunton flags (video).webm', caption: 'Flags moving over Taunton Green', tags: ['outdoors', 'wind'] },
  { title: 'File:Wood cleaving - 2016.webm', caption: 'A clean split of wood', tags: ['craft', 'wood'] },
  { title: 'File:Crossness prince regent pumping.webm', caption: 'Inside the Prince Regent pumping engine', tags: ['engine', 'industrial'] },
  { title: 'File:Wiyaala performing live.webm', caption: 'Wiyaala performing live', tags: ['performance', 'music'] },
  { title: 'File:Alex Ovechkin swing and a miss -NHLAllStar -365.webm', caption: 'A swing and a miss at the NHL All-Star event', tags: ['sports', 'hockey'] },
  { title: 'File:Flamingos at Disney\'s Animal Kingdom Lodge (35884577204).webm', caption: 'Another flock of flamingos in the sun', tags: ['flamingos', 'animals'] },
  { title: 'File:Crossness engine apr 16.webm', caption: 'The engine starts moving', tags: ['engine', 'motion'] },
  { title: 'File:AUT — Land Tirol — Bezirk Innsbruck-Land — Hall in Tirol — Burg Hasegg 6 (Münzmuseum, Walzenprägewerk-Rekonstruktion 2003 Prägewerk letzter Prozess) 2021.webm', caption: 'A coin press at work', tags: ['craft', 'museum'] },
  { title: 'File:Batakari festival Wiyaala.webm', caption: 'A moment from the Batakari festival', tags: ['festival', 'music'] },
  { title: 'File:Um provérbio russo dito por jovem russa na cidade do Porto Portugal.webm', caption: 'A proverb spoken on a street in Porto', tags: ['language', 'street'] },
  { title: 'File:Ikusgela-Dodo.webm', caption: 'A short illustrated story about the dodo', tags: ['dodo', 'illustration'] },
  { title: 'File:Ikusgela-Skateboard.webm', caption: 'Skateboarding, explained in a minute', tags: ['skateboard', 'explainer'] },
  { title: 'File:Ikusgela-Ilargia.webm', caption: 'Looking up at the Moon', tags: ['moon', 'explainer'] },
  { title: 'File:Ikusgela-Patata.webm', caption: 'The potato gets its own short film', tags: ['food', 'explainer'] },
  { title: 'File:Ikusgela-Korrika.webm', caption: 'A story about Korrika', tags: ['running', 'culture'] },
  { title: 'File:Ikusgela-Dinosauroa.webm', caption: 'Dinosaurs in a minute', tags: ['dinosaurs', 'explainer'] },
  { title: 'File:Exoplanets Vertical Video (SVS14797 - TESS Staring Contest Vert).webm', caption: 'TESS watches for distant planets', tags: ['space', 'science'] },
  { title: 'File:EXCITE 2024- Launch and Recovery (SVS14726 - EXCITE Launch Vertical Video).webm', caption: 'A huge science balloon lifts off', tags: ['balloon', 'science'] },
  { title: 'File:Black Holes Vertical Video (SVS14793 - BHbinary v2).webm', caption: 'A visual study of two black holes', tags: ['space', 'science'] },
] as const;

type CommonsInfo = {
  url?: string;
  thumburl?: string;
  width?: number;
  height?: number;
  size?: number;
  user?: string;
  extmetadata?: { Artist?: { value?: string }; LicenseShortName?: { value?: string } };
};
type CommonsPage = { pageid: number; title: string; imageinfo?: CommonsInfo[] };
type CommonsResponse = { query?: { pages?: Record<string, CommonsPage> }; error?: { info?: string } };

export type CommonsBatch = { clips: Clip[]; creators: Creator[]; cursor: number | null };

function plainText(markup: string) {
  if (typeof document === 'undefined') return markup.replace(/<[^>]*>/g, '').trim();
  const node = document.createElement('textarea');
  node.innerHTML = markup.replace(/<[^>]*>/g, '');
  return node.value.replace(/\s+/g, ' ').trim();
}

export async function loadCommonsBatch(cursor: number, signal: AbortSignal): Promise<CommonsBatch> {
  const selected = curatedVideos.slice(cursor, cursor + 5);
  if (!selected.length) return { clips: [], creators: [], cursor: null };
  const params = new URLSearchParams({ action: 'query', format: 'json', origin: '*', titles: selected.map(item => item.title).join('|'), prop: 'imageinfo', iiprop: 'url|size|user|extmetadata', iiurlwidth: '540' });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal });
  if (!response.ok) throw new Error(`Commons request failed (${response.status})`);
  const data = await response.json() as CommonsResponse;
  if (data.error) throw new Error(data.error.info ?? 'Commons request failed');

  const pages = new Map(Object.values(data.query?.pages ?? {}).map(page => [page.title, page]));
  const creators: Creator[] = [];
  const clips: Clip[] = [];
  for (const item of selected) {
    const page = pages.get(item.title);
    const info = page?.imageinfo?.[0];
    if (!page || !info?.url || !/\.webm(?:\?|$)/i.test(info.url) || !info.width || !info.height || info.height <= info.width || (info.size ?? 0) > 35_000_000) continue;
    const artist = plainText(info.extmetadata?.Artist?.value ?? info.user ?? 'Wikimedia Commons').slice(0, 70) || 'Wikimedia Commons';
    const creatorId = `commons-${page.pageid}`;
    const handle = `commons.${page.pageid}`;
    creators.push({ id: creatorId, handle, name: artist, bio: `${info.extmetadata?.LicenseShortName?.value ?? 'Free license'} · Wikimedia Commons`, followers: '—', likes: '—', tone: '#737b83', initials: artist[0]?.toUpperCase() ?? 'C', sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}` });
    clips.push({ id: creatorId, creatorId, src: info.url, poster: info.thumburl ?? '', caption: item.caption, sound: `Video by ${artist} · Wikimedia Commons`, tags: [...item.tags], likes: 0, comments: 0, saves: 0, views: '—' });
  }
  return { clips, creators, cursor: cursor + selected.length < curatedVideos.length ? cursor + selected.length : null };
}
