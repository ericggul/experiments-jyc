export const asset = (name: string) => `/images/sns/linkedin/4/${name}`;
export type Post = { id: string; name: string; headline: string; avatar: string; time: string; body: string; media?: string; mediaType?: string; reactions: number; comments: number; reposts: number; promoted?: boolean };
export const initialPosts: Post[] = [
 { id: 'team-retrospective', name: 'Minsik Jeon', headline: 'Researcher & product builder', avatar: 'minse.png', time: '2h', body: 'A small reminder from this week: the fastest way to improve a workflow is usually to sit with the people using it.\n\nAfter three short interviews, we simplified a handoff template, removed two unnecessary steps, and made the next review much easier. Nothing dramatic—just a clearer process and a few fewer things to remember.\n\nWhat is one small change that has made your team’s work smoother lately?', reactions: 48, comments: 6, reposts: 2 },
 { id: 'chaumet', name: 'CHAUMET', headline: '122,842 followers', avatar: 'chaumet.jpg', time: 'Promoted', promoted: true, body: '1780년부터 이어져 온 위대한 유산: 조세핀 황후의 대담한 정신과 우아함이 오늘날 쇼메의 눈부신 하이주얼리로 다시 태어나는 순간을 만나보세요.', reactions: 11, comments: 0, reposts: 0 },
 { id: '180studios', name: '180 Studios', headline: '', avatar: 'studios.jpg', time: '1w', body: 'Happy ESEA Heritage Month!\n\nSwipe to discover some of the brilliant artists from East and Southeast Asia who have shown their work at 180 Studios over the past decade, including Ai Weiwei, Ryoji Ikeda, Cao Fei, Nonotak and Lawrence Lek.', media: asset('egyptian-register.png'), reactions: 6, comments: 0, reposts: 1 },
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
