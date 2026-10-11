import dance from '../assets/67-dance.webp';
import jump from '../assets/cat-jump.webp';
import bed from '../assets/cat-on-bed.webp';
import facepalm from '../assets/facepalm.webp';
import remix from '../assets/youtube-poop.webp';

// Fictional channels and copy. Every horizontal video and five Shorts are freely licensed
// Wikimedia Commons files (480p VP9 transcodes); `source` keeps the original title, author and licence.

export type Source = { file: string; author: string; license: string; page: string };
export type Channel = { id: string; name: string; handle: string; subscribers: number; avatar: string; tone: string; verified?: boolean; about: string };
export type Video = {
  id: string; title: string; channelId: string; src: string; poster: string; seconds: number;
  viewCount: number; age: string; days: number; topics: string[]; likeCount: number; commentCount: number;
  description: string; tags: string[]; source?: Source; uploaded?: boolean;
};
export type Short = { id: string; title: string; channelId: string; src: string; poster: string; viewCount: number; likeCount: number; commentCount: number; sound: string; source?: Source; uploaded?: boolean };
export type Comment = { id: string; targetId: string; name: string; handle: string; avatar?: string; tone: string; body: string; time: string; likes: number; replies: number; pinned?: boolean; creatorHeart?: boolean; own?: boolean; days: number };
export type Notice = { id: string; channelId: string; targetId: string; title: string; time: string; unread: boolean };
export type Chip = { id: string; label: string; topic?: string };

const commonsSrc = (dir: string, file: string) => `https://upload.wikimedia.org/wikipedia/commons/transcoded/${dir}/${file}/${file}.480p.vp9.webm`;
const commonsPoster = (dir: string, file: string) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${dir}/${file}/960px--${file}.jpg`;
const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
function commons(dir: string, file: string, author: string, license: string) {
  return { src: commonsSrc(dir, file), poster: commonsPoster(dir, file), source: { file: decodeURIComponent(file).replace(/_/g, ' '), author, license, page: commonsPage(file) } };
}
const person = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=96&h=96&q=80`;

const aurora = commons('f/f3', 'Aurora_Borealis_in_the_steppes_of_Kazakhstan._October_10%2C_2024.webm', 'Astrobond', 'CC BY-SA 4.0');
const catBack = commons('f/f1', 'Cat_jumping_backwards.webm', 'Mary Qin', 'CC BY 3.0');
const catTank = commons('1/19', 'Cat_reacting_to_a_fish_tank.webm', 'Danmation', 'CC BY 3.0');
const salmon = commons('3/3c', 'Cooking_Salmon_20200410_141528.webm', 'Edvaldo LL Souza', 'CC BY-SA 4.0');
const auroraCity = commons('8/80', 'Northern_lights_near_Vancouver.webm', 'saif hameed', 'CC BY 3.0');
const ocean = commons('1/11', 'Ocean_waves.webm', 'Matti Schneider', 'CC BY-SA 3.0');
const lithuania = commons('f/f1', 'Off_to_Lithuania_by_drone_%28Back_home%29.webm', 'Danulis Off To Somewhere', 'CC BY-SA 3.0');
const colorado = commons('9/96', 'Soaring_Through_Fall-_FPV_Drone_Captures_Colorado%27s_Vibrant_Colors.webm', 'EagleView', 'CC BY 3.0');
const strand = commons('e/ef', 'Strandwellen_%28Licht%C3%A4ther%29.webm', 'Rhetos', 'CC BY-SA 4.0');
const sumanak = commons('3/33', 'The_process_of_cooking_%22Sumanak%22.webm', 'Dradar', 'CC BY-SA 4.0');
const volcano = commons('5/53', '007_Volcano_eruption_of_Litli-Hr%C3%BAtur_in_Iceland_in_2023_Video_by_Giles_Laurent.webm', 'Giles Laurent', 'CC BY-SA 4.0');
const forest = commons('1/1c', 'Aerial_views_of_a_forest_in_Belarus.webm', 'Vladislav Sanikovich', 'CC BY 3.0');
const malamute = commons('a/a8', 'Ashley._Alaskan_Malamute_playing_in_the_snow_2015-03-01_West_Lafayette_IN-USA.webm', 'Ashleyam', 'CC BY-SA 4.0');
const bird = commons('e/eb', 'Bird_feeding_on_a_tree_-_Brussels_area.webm', 'Treehill', 'CC BY-SA 4.0');
const piano = commons('5/5e', 'Imanuel_-_piano.webm', 'PoseidonSports', 'CC BY-SA 4.0');
const merapi = commons('4/45', 'Mount_Merapi_Landscape.webm', 'Joaquim Baeta', 'CC BY 4.0');
const blossom = commons('e/ec', 'Snow_with_Blossom_20200329.webm', 'Osumi Akari', 'CC BY-SA 4.0');
const rocket = commons('f/f6', 'Streichholzrakete_%28Geschwindigkeit%29.webm', 'Rhetos', 'CC BY-SA 4.0');
const viaduct = commons('d/d7', 'Train_passes_over_Kilnap_Viaduct%2C_Cork_City%2C_Ireland.webm', 'FILMING CORK', 'CC BY 3.0');
const freight = commons('7/7a', 'Transnet_diesel_locomotives-and-goods-train_crossing_road_and_entering_station_South_Africa.webm', 'Wobvpu43y', 'CC BY-SA 4.0');
const chick = commons('d/dd', 'Baby_Chick_Hatching.webm', 'Two Drs Homestead', 'CC BY 3.0');
const brulee = commons('5/56', 'Cr%C3%A8me_br%C3%BBl%C3%A9e.webm', 'Matt morphy', 'CC BY-SA 4.0');
const exoplanet = commons('2/29', 'Exoplanets_Vertical_Video_%28SVS14797_-_TESS_Staring_Contest_Vert%29.webm', "NASA's Scientific Visualization Studio", 'Public domain');
const seagull = commons('4/4d', 'Seagull_and_pigeons_eating_bread.webm', 'Atomicdragon136', 'CC BY 3.0');
const wood = commons('e/eb', 'Wood_cleaving_-_2016.webm', 'Jarek Tuszyński', 'CC BY-SA 4.0');

export const me = { id: 'me', name: 'Mina Cho', handle: '@minacho.k7', avatar: person('1534528741775-53994a69daeb'), tone: '#7b61ff' };

export const channels: Channel[] = [
  { id: 'northline', name: 'Northline Skies', handle: '@northlineskies', subscribers: 412000, avatar: auroraCity.poster, tone: '#1d6b5f', verified: true, about: 'Night skies, long exposures and the patience in between.' },
  { id: 'whisker', name: 'Whisker Lab', handle: '@whiskerlab', subscribers: 1340000, avatar: catTank.poster, tone: '#a26b3d', verified: true, about: 'Small experiments with very serious cats.' },
  { id: 'smallpan', name: 'Small Pan Kitchen', handle: '@smallpankitchen', subscribers: 861000, avatar: salmon.poster, tone: '#b8432f', about: 'One pan, no talking, dinner in real time.' },
  { id: 'lowaltitude', name: 'Low Altitude', handle: '@lowaltitude', subscribers: 2110000, avatar: colorado.poster, tone: '#3b6d2f', verified: true, about: 'Drone flights over places worth the battery.' },
  { id: 'tidewatch', name: 'Tide Watch', handle: '@tidewatch', subscribers: 96400, avatar: ocean.poster, tone: '#2a5d8f', about: 'Water, light and nothing else.' },
  { id: 'bench', name: 'Bench Science', handle: '@benchscience', subscribers: 538000, avatar: rocket.poster, tone: '#c48a14', about: 'Tabletop experiments, measured properly.' },
  { id: 'railside', name: 'Railside', handle: '@railsidefilms', subscribers: 274000, avatar: viaduct.poster, tone: '#5b4a8a', about: 'Trains, crossings and the sound of a viaduct.' },
  { id: 'groundfire', name: 'Ground & Fire', handle: '@groundandfire', subscribers: 1820000, avatar: volcano.poster, tone: '#a3301f', verified: true, about: 'Volcanoes up close, safely.' },
  { id: 'quiet', name: 'Quiet Season', handle: '@quietseason', subscribers: 155000, avatar: blossom.poster, tone: '#8f6c8a', about: 'Slow footage for slow mornings.' },
  { id: 'paws', name: 'Paws Outside', handle: '@pawsoutside', subscribers: 640000, avatar: malamute.poster, tone: '#55707f', about: 'Dogs doing their favourite thing: being outside.' },
  { id: 'keys', name: 'Keys Hour', handle: '@keyshour', subscribers: 88100, avatar: piano.poster, tone: '#2f2f2f', about: 'Improvised piano after midnight.' },
  { id: 'count8', name: 'Count of Eight', handle: '@countofeight', subscribers: 73200, avatar: dance.src, tone: '#c2185b', about: 'Dance practice, one eight-count at a time.' },
  { id: 'moments', name: 'Small Moments', handle: '@smallmoments', subscribers: 41800, avatar: facepalm.src, tone: '#607d8b', about: 'Little things the camera caught.' },
  { id: 'cutloop', name: 'Cut & Loop', handle: '@cutandloop', subscribers: 302000, avatar: remix.src, tone: '#6d4c41', about: 'Edits that take a sharp left turn.' },
  { id: 'barn', name: 'Barn Notes', handle: '@barnnotes', subscribers: 128000, avatar: chick.poster, tone: '#c49a2c', about: 'Life on a small homestead.' },
  { id: 'pigeon', name: 'Pigeon Report', handle: '@pigeonreport', subscribers: 19300, avatar: seagull.poster, tone: '#78909c', about: 'Breaking news from the bench by the bakery.' },
  { id: 'grain', name: 'Split Grain', handle: '@splitgrain', subscribers: 57400, avatar: wood.poster, tone: '#8d6e63', about: 'Wood, axes and the satisfaction of a clean split.' },
];

const credit = (s: Source) => `Footage: "${s.file}" by ${s.author}, ${s.license}, via Wikimedia Commons.`;
type Seed = Omit<Video, 'src' | 'poster' | 'source' | 'description'> & { media: ReturnType<typeof commons>; text: string };
const video = ({ media, text, ...rest }: Seed): Video => ({ ...rest, src: media.src, poster: media.poster, source: media.source, description: `${text}\n\n${credit(media.source)}` });

export const videos: Video[] = [
  video({ id: 'v-aurora', title: 'Aurora over the open steppe — a whole night in 48 seconds', channelId: 'northline', media: aurora, seconds: 48, viewCount: 1240000, age: '3 days ago', days: 3, topics: ['nature', 'sky', 'relax'], likeCount: 48000, commentCount: 1820, tags: ['aurora', 'timelapse'], text: 'The forecast said maybe. The sky said yes. Shot over the steppe on a cold October night, played back as one continuous timelapse.' }),
  video({ id: 'v-catback', title: 'My cat discovered the backwards jump (slow motion)', channelId: 'whisker', media: catBack, seconds: 19, viewCount: 3810000, age: '1 week ago', days: 7, topics: ['cats', 'animals'], likeCount: 152000, commentCount: 6400, tags: ['cats', 'slowmotion'], text: 'Nobody taught him this. We just happened to be filming.' }),
  video({ id: 'v-lithuania', title: 'Flying home over Lithuania | 4K drone, no music', channelId: 'lowaltitude', media: lithuania, seconds: 203, viewCount: 842000, age: '2 weeks ago', days: 14, topics: ['drones', 'travel', 'relax'], likeCount: 21000, commentCount: 930, tags: ['drone', 'lithuania'], text: 'Fields, rivers and red roofs on the way home. Full flight, light grade, natural sound.' }),
  video({ id: 'v-salmon', title: 'Pan-seared salmon in under a minute. No talking.', channelId: 'smallpan', media: salmon, seconds: 58, viewCount: 512000, age: '5 days ago', days: 5, topics: ['cooking'], likeCount: 19000, commentCount: 744, tags: ['cooking', 'salmon'], text: 'Skin side down, hot pan, do not touch it. That is the whole recipe.' }),
  video({ id: 'v-volcano', title: 'Standing next to a brand new volcano', channelId: 'groundfire', media: volcano, seconds: 24, viewCount: 6120000, age: '1 year ago', days: 380, topics: ['nature', 'science'], likeCount: 231000, commentCount: 12800, tags: ['volcano', 'iceland'], text: 'A fissure opened a short walk from the road. We stayed upwind and kept our distance.' }),
  video({ id: 'v-ocean', title: '43 seconds of ocean waves to reset your brain', channelId: 'tidewatch', media: ocean, seconds: 43, viewCount: 278000, age: '3 months ago', days: 90, topics: ['nature', 'relax'], likeCount: 8100, commentCount: 302, tags: ['ocean', 'asmr'], text: 'Put your phone down after this one.' }),
  video({ id: 'v-rocket', title: 'How fast is a matchstick rocket? We measured it', channelId: 'bench', media: rocket, seconds: 120, viewCount: 1490000, age: '8 months ago', days: 240, topics: ['science'], likeCount: 64000, commentCount: 3900, tags: ['science', 'experiment'], text: 'Foil, a match head and a high-speed camera. Speed measured frame by frame against a marked background.' }),
  video({ id: 'v-catank', title: 'Showing my cat a fish tank for the first time', channelId: 'whisker', media: catTank, seconds: 31, viewCount: 2260000, age: '4 months ago', days: 120, topics: ['cats', 'animals'], likeCount: 98000, commentCount: 4100, tags: ['cats'], text: 'Fish were never in danger. The glass was, briefly.' }),
  video({ id: 'v-viaduct', title: 'Train crossing a stone viaduct at golden hour', channelId: 'railside', media: viaduct, seconds: 15, viewCount: 94000, age: '6 days ago', days: 6, topics: ['trains'], likeCount: 3400, commentCount: 121, tags: ['trains', 'viaduct'], text: 'Short and sweet. The light lasted about as long as the train.' }),
  video({ id: 'v-colorado', title: 'FPV through peak fall colours in Colorado', channelId: 'lowaltitude', media: colorado, seconds: 188, viewCount: 3370000, age: '11 months ago', days: 330, topics: ['drones', 'nature', 'travel'], likeCount: 119000, commentCount: 5200, tags: ['fpv', 'autumn'], text: 'One battery, one line through the aspens. Gold everywhere.' }),
  video({ id: 'v-blossom', title: 'Snow falling on cherry blossom', channelId: 'quiet', media: blossom, seconds: 62, viewCount: 61000, age: '2 years ago', days: 730, topics: ['nature', 'relax'], likeCount: 2900, commentCount: 88, tags: ['snow', 'sakura'], text: 'A late snow on the last weekend of March.' }),
  video({ id: 'v-sumanak', title: 'Stirring sumanak all night — a spring tradition', channelId: 'smallpan', media: sumanak, seconds: 33, viewCount: 187000, age: '7 months ago', days: 210, topics: ['cooking', 'travel'], likeCount: 7600, commentCount: 412, tags: ['food', 'tradition'], text: 'Wheat sprouts, a giant pot and many hands taking turns until morning.' }),
  video({ id: 'v-malamute', title: 'Malamute meets fresh snow (pure joy)', channelId: 'paws', media: malamute, seconds: 136, viewCount: 905000, age: '1 month ago', days: 30, topics: ['animals'], likeCount: 37000, commentCount: 1300, tags: ['dogs', 'snow'], text: 'She waited all year for this.' }),
  video({ id: 'v-strand', title: 'Light on breaking waves — a shoreline study', channelId: 'tidewatch', media: strand, seconds: 74, viewCount: 42000, age: '2 weeks ago', days: 14, topics: ['nature', 'relax'], likeCount: 1800, commentCount: 64, tags: ['waves'], text: 'Shot at the low sun angle where every wave turns to glass.' }),
  video({ id: 'v-freight', title: 'Diesel locomotives bring a goods train into the station', channelId: 'railside', media: freight, seconds: 144, viewCount: 158000, age: '9 months ago', days: 270, topics: ['trains'], likeCount: 5100, commentCount: 340, tags: ['trains', 'freight'], text: 'Horns, a level crossing and a very long train.' }),
  video({ id: 'v-bird', title: "A bird's breakfast, filmed from the window", channelId: 'quiet', media: bird, seconds: 40, viewCount: 33000, age: '3 weeks ago', days: 21, topics: ['animals', 'nature', 'relax'], likeCount: 1500, commentCount: 47, tags: ['birds'], text: 'Same tree, same time, every morning.' }),
  video({ id: 'v-piano', title: 'Late-night piano improvisation (one take)', channelId: 'keys', media: piano, seconds: 171, viewCount: 128000, age: '5 months ago', days: 150, topics: ['music', 'relax'], likeCount: 9300, commentCount: 520, tags: ['piano', 'improv'], text: 'No plan, no sheet music. Just the keys and the hour.' }),
  video({ id: 'v-merapi', title: 'The quiet side of an active volcano', channelId: 'groundfire', media: merapi, seconds: 60, viewCount: 704000, age: '6 months ago', days: 180, topics: ['nature', 'travel'], likeCount: 22000, commentCount: 860, tags: ['volcano', 'landscape'], text: 'Morning mist rolling past the slopes, long before the hikers arrive.' }),
  video({ id: 'v-forest', title: 'Above an endless forest — aerial ambient', channelId: 'lowaltitude', media: forest, seconds: 103, viewCount: 1120000, age: '1 year ago', days: 400, topics: ['drones', 'nature', 'relax'], likeCount: 30000, commentCount: 1100, tags: ['forest', 'ambient'], text: 'Treetops all the way to the horizon.' }),
  video({ id: 'v-auroracity', title: 'Northern lights caught just outside the city', channelId: 'northline', media: auroraCity, seconds: 62, viewCount: 389000, age: '12 hours ago', days: 0.5, topics: ['nature', 'sky'], likeCount: 16000, commentCount: 640, tags: ['aurora'], text: 'You do not always need to drive far. Sometimes the sky comes to you.' }),
];

export const shorts: Short[] = [
  { id: 's-bed', title: 'He said this was his side of the bed', channelId: 'whisker', src: '/video/videos/cat-on-bed.mp4', poster: bed.src, viewCount: 4200000, likeCount: 184000, commentCount: 1620, sound: 'Original sound' },
  { id: 's-chick', title: 'Hatching day on the homestead', channelId: 'barn', src: chick.src, poster: chick.poster, source: chick.source, viewCount: 2900000, likeCount: 121000, commentCount: 3100, sound: 'Original sound' },
  { id: 's-dance', title: 'We finally got the last count right', channelId: 'count8', src: '/video/videos/67-dance.mp4', poster: dance.src, viewCount: 1560000, likeCount: 61400, commentCount: 904, sound: 'Original sound' },
  { id: 's-brulee', title: 'That first crack 🔨', channelId: 'smallpan', src: brulee.src, poster: brulee.poster, source: brulee.source, viewCount: 8800000, likeCount: 402000, commentCount: 5300, sound: 'Original sound' },
  { id: 's-jump', title: 'A very serious leap of faith', channelId: 'whisker', src: '/video/videos/cat-jump.mp4', poster: jump.src, viewCount: 11000000, likeCount: 563000, commentCount: 9402, sound: 'Original sound' },
  { id: 's-exo', title: 'How TESS stares at stars to find planets', channelId: 'bench', src: exoplanet.src, poster: exoplanet.poster, source: exoplanet.source, viewCount: 640000, likeCount: 31000, commentCount: 402, sound: 'Original sound' },
  { id: 's-facepalm', title: 'When the camera is already recording', channelId: 'moments', src: '/video/videos/facepalm.mp4', poster: facepalm.src, viewCount: 774000, likeCount: 22400, commentCount: 187, sound: 'Original sound' },
  { id: 's-seagull', title: 'Uninvited guest at the bread party', channelId: 'pigeon', src: seagull.src, poster: seagull.poster, source: seagull.source, viewCount: 210000, likeCount: 9800, commentCount: 233, sound: 'Original sound' },
  { id: 's-remix', title: 'The edit takes a sharp left turn', channelId: 'cutloop', src: '/video/videos/youtube-poop.mp4', poster: remix.src, viewCount: 6080000, likeCount: 296700, commentCount: 4108, sound: 'Original sound' },
  { id: 's-wood', title: 'One swing. Clean split.', channelId: 'grain', src: wood.src, poster: wood.poster, source: wood.source, viewCount: 1300000, likeCount: 70000, commentCount: 960, sound: 'Original sound' },
];

export const chips: Chip[] = [
  { id: 'all', label: 'All' },
  { id: 'nature', label: 'Nature', topic: 'nature' },
  { id: 'relax', label: 'Relaxation', topic: 'relax' },
  { id: 'cats', label: 'Cats', topic: 'cats' },
  { id: 'drones', label: 'Drones', topic: 'drones' },
  { id: 'cooking', label: 'Cooking', topic: 'cooking' },
  { id: 'science', label: 'Science', topic: 'science' },
  { id: 'trains', label: 'Trains', topic: 'trains' },
  { id: 'music', label: 'Music', topic: 'music' },
  { id: 'recent', label: 'Recently uploaded', topic: 'recent' },
  { id: 'new', label: 'New to you', topic: 'new' },
];

export const subscriptionChips: Chip[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'videos', label: 'Videos' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'continue', label: 'Continue watching' },
  { id: 'unwatched', label: 'Unwatched' },
];

export const searchChips: Chip[] = [
  { id: 'all', label: 'All' },
  { id: 'videos', label: 'Videos' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'unwatched', label: 'Unwatched' },
  { id: 'watched', label: 'Watched' },
  { id: 'recent', label: 'Recently uploaded' },
];

export const seedSearchHistory = ['aurora timelapse', 'fpv drone autumn', 'cat slow motion'];
export const trendingSearches = ['volcano eruption up close', 'one pan salmon', 'ocean waves 10 hours', 'matchstick rocket speed', 'snow on cherry blossom', 'train viaduct golden hour', 'malamute in snow', 'late night piano'];

export const seedSubscriptions = ['northline', 'whisker', 'lowaltitude', 'groundfire', 'smallpan'];

export const notices: Notice[] = [
  { id: 'n1', channelId: 'northline', targetId: 'v-auroracity', title: 'Northline Skies uploaded: Northern lights caught just outside the city', time: '12 hours ago', unread: true },
  { id: 'n2', channelId: 'lowaltitude', targetId: 'v-lithuania', title: 'Low Altitude uploaded: Flying home over Lithuania | 4K drone, no music', time: '2 weeks ago', unread: true },
  { id: 'n3', channelId: 'smallpan', targetId: 'v-salmon', title: 'Small Pan Kitchen uploaded: Pan-seared salmon in under a minute. No talking.', time: '5 days ago', unread: true },
  { id: 'n4', channelId: 'whisker', targetId: 's-bed', title: 'Whisker Lab posted a Short: He said this was his side of the bed', time: '1 week ago', unread: true },
  { id: 'n5', channelId: 'groundfire', targetId: 'v-merapi', title: 'Recommended: The quiet side of an active volcano', time: '6 days ago', unread: true },
  { id: 'n6', channelId: 'whisker', targetId: 'v-catback', title: 'Whisker Lab uploaded: My cat discovered the backwards jump (slow motion)', time: '1 week ago', unread: true },
  { id: 'n7', channelId: 'paws', targetId: 'v-malamute', title: 'Recommended: Malamute meets fresh snow (pure joy)', time: '1 month ago', unread: false },
  { id: 'n8', channelId: 'tidewatch', targetId: 'v-ocean', title: 'Tide Watch uploaded: 43 seconds of ocean waves to reset your brain', time: '3 months ago', unread: false },
];

const people = [
  { name: 'Jina Han', handle: '@jinahan', avatar: person('1524504388940-b1c1722653e1'), tone: '#c2185b' },
  { name: 'Caleb', handle: '@caleb.h', avatar: person('1506794778202-cad84cf45f1d'), tone: '#1565c0' },
  { name: 'Minseo', handle: '@minseo_k', avatar: person('1531123897727-8f129e1688ce'), tone: '#6a1b9a' },
  { name: 'Oren', handle: '@orenwalks', tone: '#2e7d32' },
  { name: 'Lucía', handle: '@lucia.mp4', tone: '#ef6c00' },
  { name: 'Theo', handle: '@theo-builds', avatar: person('1500648767791-00dcc994a43e'), tone: '#455a64' },
  { name: 'Priya', handle: '@priyasees', tone: '#ad1457' },
  { name: 'Sam', handle: '@samnotsamuel', avatar: person('1507003211169-0a1dd7228f2d'), tone: '#00838f' },
];

const lines: Record<string, string[]> = {
  'v-aurora': ['The moment around 0:31 when the whole sky turns pink 😮', 'I have never seen colours this strong that far south.', 'Timelapse done right: no shaky cuts, just the sky.', 'Saved this to show my kids tomorrow.'],
  'v-catback': ['The little pause before the jump 😂', 'He is calculating something we will never understand.', 'Slow motion was the correct choice.', 'My cat watched this with me and now he is judging me.'],
  'v-volcano': ['How close were you?? This looks unreal.', 'The sound of it cooling is the best part.', 'Earth is literally being made in front of you.', 'Respect for staying upwind.'],
  'v-salmon': ['"Do not touch it" is the most important cooking advice ever.', 'That crispy skin sound 🤌', 'Made this tonight. 10/10.', 'No talking channels are the best channels.'],
};
const generic = ['This is exactly what I needed today.', 'Watched it three times already.', 'The quality on this is incredible.', 'Who else is here from the home feed?', 'Underrated channel. Subscribed.', 'Calm, short and beautiful.'];

function seedFor(targetId: string, count: number): Comment[] {
  const pool = lines[targetId] ?? generic;
  return Array.from({ length: count }, (_, index) => {
    const who = people[(index * 3 + targetId.length) % people.length];
    const days = [0.1, 0.4, 1, 2, 5, 9, 30][index % 7];
    return { id: `${targetId}-c${index}`, targetId, ...who, body: pool[index % pool.length], time: ['2 hours ago', '9 hours ago', '1 day ago', '2 days ago', '5 days ago', '1 week ago', '1 month ago'][index % 7], likes: Math.round(2400 / (index + 1)), replies: index % 3 === 0 ? 12 - index : 0, pinned: index === 0 && targetId.startsWith('v-') && targetId.length % 2 === 0, creatorHeart: index === 1, days };
  });
}

export const seedComments: Comment[] = [...videos.map(item => item.id), ...shorts.map(item => item.id)].flatMap(id => seedFor(id, 6));

export const replyLines = ['Agreed, completely.', 'Came here to say this.', 'Same here!', 'This deserves more likes.'];

export type Post = { id: string; channelId: string; body: string; time: string; likes: number; imageId?: string };
export const seedPosts: Post[] = [
  { id: 'p-northline', channelId: 'northline', body: 'Activity is forecast to be strong again this weekend. Which would you rather see next: a full-night timelapse or a real-time clip with sound?', time: '1 day ago', likes: 2400, imageId: 'v-aurora' },
  { id: 'p-whisker', channelId: 'whisker', body: 'He has now attempted the backwards jump eleven times today. Slow-motion compilation coming soon.', time: '3 days ago', likes: 9100, imageId: 'v-catback' },
];

export type Playlist = { id: string; title: string; ids: string[] };
export const seedPlaylists: Playlist[] = [{ id: 'pl-ambient', title: 'Morning ambience', ids: ['v-ocean', 'v-blossom', 'v-forest'] }];

export const exploreDestinations: Chip[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'music', label: 'Music', topic: 'music' },
  { id: 'learning', label: 'Learning', topic: 'science' },
  { id: 'nature', label: 'Nature', topic: 'nature' },
  { id: 'travel', label: 'Travel', topic: 'travel' },
  { id: 'animals', label: 'Pets & animals', topic: 'animals' },
  { id: 'food', label: 'Food', topic: 'cooking' },
];

export const qualities = [
  { id: 'auto', label: 'Auto (480p)', file: '480p' },
  { id: '720p', label: '720p', file: '720p' },
  { id: '480p', label: '480p', file: '480p' },
  { id: '360p', label: '360p', file: '360p' },
  { id: '240p', label: '240p', file: '240p' },
];
export const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
