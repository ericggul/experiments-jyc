export type Stay = { id: string; name: string; region: string; town: string; theme: string; price: number; guests: number; image: string; alt: string; description: string; amenities: string[] };
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;
export const stays: Stay[] = [
  { id:'seorim', name:'서림', region:'강원', town:'강릉 사천', theme:'숲 가까이', price:190000, guests:4, image:photo('photo-1449158743715-0a90ebb6d2d8'), alt:'울창한 나무 사이로 햇빛이 드는 목조 숙소', description:'창 너머로 계절을 만나는 작은 집. 아침에는 사천의 숲길을 걷고, 오후에는 책 한 권과 오래 머물러 보세요.', amenities:['독채','침실 2개','주방','숲 전망','무료 주차','와이파이'] },
  { id:'onsea', name:'온유', region:'제주', town:'제주 한경', theme:'바다 곁에', price:230000, guests:2, image:photo('photo-1613490493576-7fde63acd811'), alt:'야외 수영장과 큰 창이 있는 밝은 휴양 주택', description:'서쪽 바다와 가까운 둘만의 휴식. 볕이 천천히 움직이는 거실과 조용한 마당이 기다립니다.', amenities:['독채','침실 1개','욕조','야외 수영장','무료 주차','와이파이'] },
  { id:'haejae', name:'해재', region:'경기', town:'양평 서종', theme:'둘만의 시간', price:165000, guests:2, image:photo('photo-1449844908441-8829872d2607'), alt:'정원과 나무에 둘러싸인 흰색 외벽의 집', description:'가까운 곳에서 보내는 느긋한 하루. 정원으로 이어지는 거실에서 일상의 속도를 잠시 내려놓습니다.', amenities:['독채','침실 1개','정원','주방','무료 주차','와이파이'] },
  { id:'sodam', name:'소담', region:'강원', town:'춘천 남산', theme:'숲 가까이', price:145000, guests:6, image:photo('photo-1510798831971-661eb04b3739'), alt:'나무와 초록 잔디에 둘러싸인 작은 목조 오두막', description:'함께 먹는 저녁, 산책 끝에 마시는 차. 여럿이 머물러도 저마다의 여백이 있는 숲속 오두막입니다.', amenities:['독채','침실 3개','정원','주방','바비큐','무료 주차'] },
];
export const themes = [{id:'all',label:'모든 여백'},{id:'forest',label:'숲 가까이'},{id:'sea',label:'바다 곁에'},{id:'couple',label:'둘만의 시간'}];
export type Trip = { id: string; stayId: string; arrival: string; departure: string; guests: number; total: number; cancelled: boolean };
export const won = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;
export const nightsBetween = (arrival: string, departure: string) => Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 86400000);
export function dateAfter(days: number) { const d = new Date(); d.setDate(d.getDate()+days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
