import dance from '../assets/67-dance.webp';
import jump from '../assets/cat-jump.webp';
import bed from '../assets/cat-on-bed.webp';
import facepalm from '../assets/facepalm.webp';
import remix from '../assets/youtube-poop.webp';

export type Creator = { id: string; handle: string; name: string; bio: string; followers: string; likes: string; tone: string; initials: string; sourceUrl?: string };
export type Clip = { id: string; creatorId: string; src: string; poster: string; caption: string; sound: string; tags: string[]; likes: number; comments: number; saves: number; views: string };
export type Comment = { id: string; clipId: string; author: string; body: string; likes: number; time: string; own?: boolean };

export const creators: Creator[] = [
  { id: 'milo', handle: 'milo.and.co', name: 'Milo & Co.', bio: 'the smallest jumps deserve a replay 🐈', followers: '28.4K', likes: '612K', tone: '#dcb49b', initials: 'M' },
  { id: 'eli', handle: 'eli.moves', name: 'Eli', bio: 'one take, then another', followers: '14.8K', likes: '93.2K', tone: '#b5bdb8', initials: 'E' },
  { id: 'noah', handle: 'noah.offline', name: 'Noah', bio: 'little moments on camera', followers: '8,103', likes: '46.1K', tone: '#88959a', initials: 'N' },
  { id: 'archive', handle: 'archive.loop', name: 'archive loop', bio: 'found clips & strange edits', followers: '42.3K', likes: '1.2M', tone: '#91776f', initials: 'A' },
];

export const clips: Clip[] = [
  { id: 'bed', creatorId: 'milo', src: '/video/videos/cat-on-bed.mp4', poster: bed.src, caption: 'He said this was his side of the bed', sound: 'original sound - milo.and.co', tags: ['cat', 'cozy', 'foryou'], likes: 84200, comments: 618, saves: 4900, views: '423K' },
  { id: 'dance', creatorId: 'eli', src: '/video/videos/67-dance.mp4', poster: dance.src, caption: 'We finally got the last count right', sound: 'original sound - eli.moves', tags: ['dance', 'practice'], likes: 31400, comments: 204, saves: 1800, views: '156K' },
  { id: 'jump', creatorId: 'milo', src: '/video/videos/cat-jump.mp4', poster: jump.src, caption: 'A very serious leap of faith', sound: 'original sound - milo.and.co', tags: ['cat', 'pets'], likes: 163000, comments: 1402, saves: 12600, views: '1.1M' },
  { id: 'facepalm', creatorId: 'noah', src: '/video/videos/facepalm.mp4', poster: facepalm.src, caption: 'When the camera is already recording', sound: 'original sound - noah.offline', tags: ['moment', 'foryou'], likes: 12400, comments: 87, saves: 920, views: '77.4K' },
  { id: 'remix', creatorId: 'archive', src: '/video/videos/youtube-poop.mp4', poster: remix.src, caption: 'The edit takes a sharp left turn', sound: 'original sound - archive.loop', tags: ['edit', 'remix'], likes: 96700, comments: 1108, saves: 7800, views: '608K' },
];

export const seedComments: Comment[] = [
  { id: 'c1', clipId: 'bed', author: 'tinywindow', body: 'That little face at the end 😭', likes: 198, time: '2h' },
  { id: 'c2', clipId: 'bed', author: 'sundayagain', body: 'The bed belongs to him now', likes: 83, time: '1h' },
  { id: 'c3', clipId: 'jump', author: 'sunny.side', body: 'I watched the jump five times', likes: 465, time: '4h' },
  { id: 'c4', clipId: 'dance', author: 'beatcounter', body: 'That landing was so clean', likes: 72, time: '3h' },
  { id: 'c5', clipId: 'facepalm', author: 'slowmonday', body: 'This is painfully relatable', likes: 51, time: '6h' },
  { id: 'c6', clipId: 'remix', author: 'cutscene', body: 'The timing makes it', likes: 237, time: '1d' },
];

export function compact(number: number) { return number >= 1_000_000 ? `${(number / 1_000_000).toFixed(1)}M` : number >= 10_000 ? `${(number / 1_000).toFixed(number >= 100_000 ? 0 : 1)}K` : number.toLocaleString('en-US'); }
