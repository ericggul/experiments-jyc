import dance from '../assets/67-dance.webp';
import jump from '../assets/cat-jump.webp';
import bed from '../assets/cat-on-bed.webp';
import facepalm from '../assets/facepalm.webp';
import remix from '../assets/youtube-poop.webp';

// Avatar photos are Unsplash images (images.unsplash.com, CORS-enabled for html2canvas) standing in for fictional creators.
export type Creator = { id: string; handle: string; name: string; bio: string; following: string; followers: string; likes: string; avatar?: string; sourceUrl?: string };
export type Clip = { id: string; creatorId: string; src: string; poster: string; caption: string; sound: string; tags: string[]; likes: number; comments: number; saves: number; shares: number; views: string };
export type Comment = { id: string; clipId: string; author: string; avatar?: string; body: string; likes: number; time: string; own?: boolean };

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=160&h=160&fit=crop&crop=faces&auto=format&q=70`;

export const creators: Creator[] = [
  { id: 'milo', handle: 'milo.and.co', name: 'Milo & Co.', bio: 'the smallest jumps deserve a replay 🐈', following: '213', followers: '28.4K', likes: '612K', avatar: photo('1514888286974-6c03e2ca1dba') },
  { id: 'eli', handle: 'eli.moves', name: 'Eli', bio: 'one take, then another', following: '388', followers: '14.8K', likes: '93.2K', avatar: photo('1534528741775-53994a69daeb') },
  { id: 'noah', handle: 'noah.offline', name: 'Noah', bio: 'little moments on camera', following: '96', followers: '8103', likes: '46.1K', avatar: photo('1500648767791-00dcc994a43e') },
  { id: 'archive', handle: 'archive.loop', name: 'archive loop', bio: 'found clips & strange edits', following: '1024', followers: '42.3K', likes: '1.2M', avatar: photo('1547425260-76bcadfb4f2c') },
];

export const clips: Clip[] = [
  { id: 'bed', creatorId: 'milo', src: '/video/videos/cat-on-bed.mp4', poster: bed.src, caption: 'He said this was his side of the bed', sound: 'original sound - milo.and.co', tags: ['cat', 'cozy', 'foryou'], likes: 84200, comments: 618, saves: 4900, shares: 1310, views: '423K' },
  { id: 'dance', creatorId: 'eli', src: '/video/videos/67-dance.mp4', poster: dance.src, caption: 'We finally got the last count right', sound: 'original sound - eli.moves', tags: ['dance', 'practice'], likes: 31400, comments: 204, saves: 1800, shares: 402, views: '156K' },
  { id: 'jump', creatorId: 'milo', src: '/video/videos/cat-jump.mp4', poster: jump.src, caption: 'A very serious leap of faith', sound: 'original sound - milo.and.co', tags: ['cat', 'pets'], likes: 163000, comments: 1402, saves: 12600, shares: 5480, views: '1.1M' },
  { id: 'facepalm', creatorId: 'noah', src: '/video/videos/facepalm.mp4', poster: facepalm.src, caption: 'When the camera is already recording', sound: 'original sound - noah.offline', tags: ['moment', 'foryou'], likes: 12400, comments: 87, saves: 920, shares: 233, views: '77.4K' },
  { id: 'remix', creatorId: 'archive', src: '/video/videos/youtube-poop.mp4', poster: remix.src, caption: 'The edit takes a sharp left turn', sound: 'original sound - archive.loop', tags: ['edit', 'remix'], likes: 96700, comments: 1108, saves: 7800, shares: 2915, views: '608K' },
];

export const seedComments: Comment[] = [
  { id: 'c1', clipId: 'bed', author: 'tinywindow', avatar: photo('1494790108377-be9c29b29330'), body: 'That little face at the end 😭', likes: 198, time: '2h' },
  { id: 'c2', clipId: 'bed', author: 'sundayagain', avatar: photo('1507003211169-0a1dd7228f2d'), body: 'The bed belongs to him now', likes: 83, time: '1h' },
  { id: 'c7', clipId: 'bed', author: 'paperlantern', avatar: photo('1517841905240-472988babdf9'), body: 'not him checking if you’re still watching', likes: 41, time: '58m' },
  { id: 'c3', clipId: 'jump', author: 'sunny.side', avatar: photo('1438761681033-6461ffad8d80'), body: 'I watched the jump five times', likes: 465, time: '4h' },
  { id: 'c8', clipId: 'jump', author: 'quietcorner', avatar: photo('1524504388940-b1c1722653e1'), body: 'the confidence before takeoff', likes: 129, time: '3h' },
  { id: 'c4', clipId: 'dance', author: 'beatcounter', avatar: photo('1539571696357-5a69c17a67c6'), body: 'That landing was so clean', likes: 72, time: '3h' },
  { id: 'c5', clipId: 'facepalm', author: 'slowmonday', avatar: photo('1544005313-94ddf0286df2'), body: 'This is painfully relatable', likes: 51, time: '6h' },
  { id: 'c6', clipId: 'remix', author: 'cutscene', avatar: photo('1506794778202-cad84cf45f1d'), body: 'The timing makes it', likes: 237, time: '1d' },
];

// TikTok prints counts below 10K as plain digits ("3456"), then K/M with one trimmed decimal.
export function compact(number: number) { const short = (value: number) => value.toFixed(value >= 100 ? 0 : 1).replace(/\.0$/, ''); return number >= 1_000_000 ? `${short(number / 1_000_000)}M` : number >= 10_000 ? `${short(number / 1_000)}K` : String(number); }
