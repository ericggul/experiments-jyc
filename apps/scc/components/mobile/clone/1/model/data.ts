export type Product = {id:string;brand:string;name:string;category:string;price:number;oldPrice?:number;image:string;description:string;options:string[]};
export const photo=(id:string,w=900)=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
export const categories=[{id:'all',name:'전체'},{id:'table',name:'테이블웨어'},{id:'light',name:'조명'},{id:'living',name:'리빙'},{id:'furniture',name:'가구'}];
export const products:Product[]=[
{id:'mug',brand:'STUDIO ONDO',name:'데일리 세라믹 머그',category:'table',price:24000,oldPrice:30000,image:photo('photo-1514228742587-6b1558fcca3d'),description:'손에 편안하게 감기는 둥근 손잡이. 은은한 유약과 부드러운 질감으로 매일의 커피 시간을 채웁니다. 320ml · 식기세척기 사용 가능',options:['크림','차콜','샌드']},
{id:'chair',brand:'FORM & FIELD',name:'패브릭 라운지 체어',category:'furniture',price:189000,oldPrice:210000,image:photo('photo-1598300042247-d088f8ab3a91'),description:'차분한 그레이 패브릭과 부드러운 곡선. 몸을 편안하게 받쳐주는 등받이로 나만의 작은 쉼터를 만들어 보세요. W58 × D62 × H76cm',options:['그레이 패브릭']},
{id:'lamp',brand:'AFTER NINE',name:'소프트 테이블 램프',category:'light',price:78000,image:photo('photo-1507473885765-e6ed057f782c'),description:'하루의 끝을 밝히는 작은 빛. 침실과 작업 공간에 따뜻한 빛을 더하는 테이블 조명입니다. E26 전구 포함 · 높이 38cm',options:['아이보리','웜 그레이']},
{id:'vase',brand:'STUDIO ONDO',name:'오가닉 세라믹 베이스',category:'living',price:38000,image:photo('photo-1578500494198-246f612d3b3d'),description:'꽃 한 송이에도 충분한 존재감. 수작업 마감으로 저마다 다른 표정을 가진 세라믹 화병입니다. 높이 22cm · 국내 제작',options:['오프화이트','테라코타']},
{id:'sofa',brand:'FORM & FIELD',name:'컴팩트 패브릭 소파',category:'furniture',price:429000,image:photo('photo-1555041469-a586c61ea9bc'),description:'작은 공간을 위한 너른 휴식. 담백한 실루엣과 탄탄한 착석감으로 공간에 자연스럽게 스며듭니다. 2인용 · W145cm',options:['올리브','오트밀']},
{id:'linen',brand:'SLOW ROOM',name:'내추럴 리넨 쿠션',category:'living',price:32000,image:photo('photo-1584100936595-c0654b55a2e2'),description:'피부에 닿는 기분 좋은 촉감. 리넨의 자연스러운 주름과 차분한 색이 소파 위에 새로운 계절을 전합니다. 45 × 45cm · 솜 포함',options:['내추럴','브릭']},
];
export const won=(value:number)=>`${value.toLocaleString('ko-KR')}원`;
