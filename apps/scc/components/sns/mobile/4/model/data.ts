export type Task = { id:string; title:string; project:string; due:string; person:string; priority:'보통'|'높음'|'낮음'; done:boolean; note:string; checklist:{id:string;title:string;done:boolean}[]; comments:{id:string;person:string;body:string;time:string}[] };
export const people = ['서윤','지민','도현','하린'];
export const projects = [
  {id:'p1',name:'모노 브랜드 리뉴얼',client:'MONO COFFEE',color:'#7660bf',mark:'m',description:'익숙한 일상에 새로운 리듬을. 모노의 다음 계절을 준비합니다.',deadline:'9월 30일',people:['서윤','지민','도현']},
  {id:'p2',name:'오브제 웹사이트',client:'OBJET STUDIO',color:'#3f8078',mark:'o',description:'작은 사물의 이야기를 담는 새로운 온라인 공간.',deadline:'10월 8일',people:['서윤','하린']},
  {id:'p3',name:'스튜디오의 일상',client:'STUDIO MELLOW',color:'#b78350',mark:'↗',description:'우리의 작업을 기록하고, 함께 일하는 방법을 다듬어요.',deadline:'상시',people:['서윤','지민','도현','하린']},
];
export const initialTasks:Task[] = [
  {id:'t1',title:'브랜드 가이드 1차 피드백 반영',project:'p1',due:'2026-09-23',person:'서윤',priority:'높음',done:false,note:'어제 공유한 피드백을 바탕으로 컬러와 로고 최소 여백을 정리해요. 오후 내부 리뷰 전에 업데이트 부탁드려요.',checklist:[{id:'c1',title:'메인 컬러 대비 확인',done:true},{id:'c2',title:'로고 최소 여백 가이드 수정',done:false},{id:'c3',title:'수정본 팀에 공유',done:false}],comments:[{id:'m1',person:'지민',body:'컬러는 B안으로 정리하면 될 것 같아요. 로고 여백도 함께 봐주세요!',time:'오전 9:12'}]},
  {id:'t2',title:'메인 페이지 모바일 시안',project:'p2',due:'2026-09-23',person:'서윤',priority:'보통',done:false,note:'모바일에서 이미지와 텍스트의 리듬을 확인합니다. 375px 기준으로 먼저 작업해요.',checklist:[{id:'c4',title:'히어로 영역 구성',done:true},{id:'c5',title:'프로젝트 목록 구성',done:false}],comments:[]},
  {id:'t3',title:'9월 작업 기록 업로드',project:'p3',due:'2026-09-23',person:'서윤',priority:'낮음',done:false,note:'이번 달의 과정 사진 세 장과 짧은 기록을 정리해주세요.',checklist:[],comments:[]},
  {id:'t4',title:'레퍼런스 보드 정리',project:'p1',due:'2026-09-23',person:'서윤',priority:'보통',done:true,note:'패키지와 사이니지 레퍼런스 모음.',checklist:[{id:'c6',title:'최종 후보 6개 선정',done:true}],comments:[]},
  {id:'t5',title:'클라이언트 미팅 아젠다',project:'p1',due:'2026-09-24',person:'서윤',priority:'높음',done:false,note:'목요일 오전 미팅에서 결정할 항목을 정리해요.',checklist:[],comments:[]},
  {id:'t6',title:'제품 상세 화면 인터랙션',project:'p2',due:'2026-09-25',person:'서윤',priority:'보통',done:false,note:'이미지 전환과 상세 정보의 동작을 정리합니다.',checklist:[],comments:[]},
  {id:'t7',title:'패키지 인쇄 사양 확인',project:'p1',due:'2026-09-22',person:'도현',priority:'높음',done:false,note:'용지와 별색 인쇄 가능 여부 확인.',checklist:[],comments:[]},
  {id:'t8',title:'키 비주얼 방향 확정',project:'p1',due:'2026-09-21',person:'지민',priority:'보통',done:true,note:'B안으로 확정했습니다.',checklist:[],comments:[]},
  {id:'t9',title:'작업 이미지 셀렉',project:'p2',due:'2026-09-24',person:'하린',priority:'보통',done:false,note:'홈페이지 첫 화면에 사용할 이미지 8장 선정.',checklist:[],comments:[]},
];
export const initialInbox = [
  {id:'n1',person:'지민',action:'님이 댓글에서 나를 언급했어요',body:'서윤님, 컬러는 B안으로 정리하면 될 것 같아요.',task:'t1',time:'12분 전',read:false},
  {id:'n2',person:'하린',action:'님이 업무를 배정했어요',body:'메인 페이지 모바일 시안',task:'t2',time:'38분 전',read:false},
  {id:'n3',person:'지민',action:'님이 업무를 완료했어요',body:'키 비주얼 방향 확정',task:'t8',time:'어제',read:true},
];
