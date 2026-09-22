export type Item = { id:string; title:string; price:number; category:string; area:string; distance:string; time:string; photo:string; alt:string; description:string; seller:string; saved:number; own?:boolean; status:'판매중'|'예약중'|'판매완료' };
const photo=(id:string)=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;
export const categories=[{id:'all',label:'전체'},{id:'furniture',label:'가구·인테리어'},{id:'digital',label:'디지털기기'},{id:'life',label:'생활·주방'},{id:'leisure',label:'취미·여가'}];
export const items:Item[]=[
 {id:'chair',title:'이사 준비 · 패브릭 체어',price:65000,category:'furniture',area:'연남동',distance:'걸어서 5분',time:'12분 전',photo:photo('photo-1598300042247-d088f8ab3a91'),alt:'나무 다리와 회색 패브릭 등받이가 있는 의자',description:'햇빛 잘 드는 거실에서 쓰던 의자예요. 사용감은 조금 있지만 흔들림 없이 튼튼합니다. 이사하면서 정리해요.\n\n직접 가져가실 수 있는 분과 거래하고 싶어요. 평일 저녁 7시 이후 가능합니다.',seller:'오후의집',saved:18,status:'판매중'},
 {id:'camera',title:'주말 산책에 쓰던 카메라',price:85000,category:'digital',area:'연남동',distance:'걸어서 8분',time:'28분 전',photo:photo('photo-1516035069371-29a1b244cc32'),alt:'검은색 카메라와 렌즈',description:'집에 보관하던 카메라 정리합니다. 스트랩 포함이에요. 상태는 만나서 확인해 주세요. 연남동 경의선숲길 근처에서 직거래해요.',seller:'산책하는곰',saved:9,status:'판매중'},
 {id:'coffee',title:'홈카페 머그와 잔 세트',price:25000,category:'life',area:'연남동',distance:'걸어서 3분',time:'41분 전',photo:photo('photo-1495474472287-4d71bcdd2085'),alt:'서로 다른 커피 잔을 손에 들고 모은 모습',description:'집에서 사용하던 머그와 잔 세트예요. 깨끗이 세척해 두었습니다. 사진 속 커피는 포함되지 않아요. 연남초등학교 앞에서 만날 수 있어요.',seller:'모닝커피',saved:6,status:'판매중'},
 {id:'bike',title:'동네 마실용 자전거',price:90000,category:'leisure',area:'성산동',distance:'1.2km',time:'1시간 전',photo:photo('photo-1485965120184-e220f721d03e'),alt:'벽에 기대어 세워 둔 자전거',description:'가까운 동네 다닐 때 쓰던 자전거입니다. 브레이크 잘 들어요. 안장에 생활 흔적 있어요. 직접 타 보고 결정하셔도 좋아요.',seller:'자전거탄구름',saved:12,status:'판매중'},
 {id:'plant',title:'초록이 필요한 곳에, 화분 나눔',price:0,category:'life',area:'연남동',distance:'걸어서 10분',time:'2시간 전',photo:photo('photo-1416879595882-3373a0480b5b'),alt:'작은 화분을 손질하는 원예 도구와 식물',description:'삽목해서 키운 식물 나눔해요. 햇빛 잘 드는 곳에 두면 좋습니다. 화분째 가져가세요. 꼭 키우실 분만 연락 부탁드려요.',seller:'초록생활',saved:22,status:'예약중'},
 {id:'sofa',title:'작은 방에 딱 맞는 패브릭 소파',price:120000,category:'furniture',area:'망원동',distance:'1.8km',time:'3시간 전',photo:photo('photo-1555041469-a586c61ea9bc'),alt:'초록색 패브릭 소파와 쿠션',description:'2인용 패브릭 소파입니다. 반려동물 없는 집에서 사용했어요. 엘리베이터 있고 직접 운반 부탁드립니다.',seller:'일요일',saved:15,status:'판매중'},
];
export type Message={id:string;body:string;mine:boolean;time:string};
export type Thread={id:string;itemId:string;messages:Message[]};
export const money=(n:number)=>n===0?'나눔':`${n.toLocaleString('ko-KR')}원`;
export const neighborhoods=['연남동','성산동','망원동'];
