export const asset = (name: string) => `/images/sns/linkedin/2/${name}`;
export type Post = { id: string; name: string; headline: string; avatar: string; time: string; body: string; media?: string; mediaType?: string; reactions: number; comments: number; reposts: number; promoted?: boolean };
export const initialPosts: Post[] = [
 { id: 'point4d', name: 'Minsik Jeon', headline: 'MSR Student @ CMU RI', avatar: 'minse.png', time: '10h', body: '🚀 Introducing Point4D: dense 4D reconstruction across hundreds of frames from a monocular video. Unlike existing feed-forward 4D methods that operate over short windows, Point4D keeps tracking in 3D, even across occlusions and long sequences.', media: asset('point4d.png'), reactions: 122, comments: 2, reposts: 7 },
 { id: 'chaumet', name: 'CHAUMET', headline: '122,842 followers', avatar: 'chaumet.jpg', time: 'Promoted', promoted: true, body: '1780년부터 이어져 온 위대한 유산: 조세핀 황후의 대담한 정신과 우아함이 오늘날 쇼메의 눈부신 하이주얼리로 다시 태어나는 순간을 만나보세요.', reactions: 11, comments: 0, reposts: 0 },
 { id: '180studios', name: '180 Studios', headline: '', avatar: 'studios.jpg', time: '1w', body: 'Happy ESEA Heritage Month!\n\nSwipe to discover some of the brilliant artists from East and Southeast Asia who have shown their work at 180 Studios over the past decade, including Ai Weiwei, Ryoji Ikeda, Cao Fei, Nonotak and Lawrence Lek.', media: asset('art.jpg'), reactions: 6, comments: 0, reposts: 1 },
];
export const recommendations = [
 {id:'swiss', name:'Switzerland Innovation', detail:'Company · Research Services', avatar:'swiss.png'},
 {id:'fei', name:'Fei-Fei Li', detail:'Cofounder/CEO, World Labs; AI ...', avatar:'fei.png'},
 {id:'chi', name:'ACM CHI Conference', detail:'Company · Events Services', avatar:'chi.jpg'},
];
export const puzzles = [
 {id:'zip',name:'Zip',number:545,played:1,path:'zip'},
 {id:'wend',name:'Wend',number:97,played:2,path:'wend'},
 {id:'patches',name:'Patches',number:180,played:1,path:'patches'},
 {id:'sudoku',name:'Mini Sudoku',number:398,played:1,path:'mini-sudoku'},
];
