# TV 광고 화면 레퍼런스: 보험·제약

상태: 레퍼런스 원장(2026-10-09). 첫 클론 두 편은 실패로 기록했다:
[advertisement/tv](../experiments/advertisement/README.md). 링크로 확인한 사실과 기억 기반 서술(“미확인”)을 구분한다.

## 찾아보는 곳

| 사이트 | 용도 |
| --- | --- |
| [iSpot.tv](https://www.ispot.tv/browse) | 미국 전국 방송 TV 광고 DB. 업종별 탐색: [Pharmaceutical & Medical](https://www.ispot.tv/browse/7k/pharmaceutical-and-medical), [Insurance](https://www.ispot.tv/browse/Z/insurance) → [Auto & General](https://www.ispot.tv/browse/Z.Li/insurance/auto-and-general) · [Health](https://www.ispot.tv/browse/Z.ws/insurance/health) · [Life & Supplementary](https://www.ispot.tv/browse/Z.Lh/insurance/life-and-supplementary). 광고마다 영상과 스틸이 있어 클론용 프레임 수집에 가장 좋다. |
| [TVCF](https://www.tvcf.co.kr) | 한국 TV 광고 아카이브. 브랜드·업종(금융/보험, 제약)으로 검색. 자동 수집은 403으로 막혀 있어 직접 탐색해야 한다. |
| [Ads of the World](https://www.adsoftheworld.com) | 세계 크리에이티브 광고(TV·인쇄·옥외). 수상작 위주라 실제 방송 문법보다는 연출이 세다. |
| [Google Ads Transparency Center](https://adstransparency.google.com) | 광고주별 YouTube 영상 광고 원본. 국가 필터로 한국 보험사·제약사 검색. |
| [Meta Ad Library](https://www.facebook.com/ads/library) | 페이스북·인스타 광고. 보험 다이렉트·영양제 세로형 영상 광고 수집용. |
| YouTube | 브랜드 공식 채널, “Medicare commercial”, “pharma commercial compilation”, “보험 광고 모음” 같은 검색. |

## 화면 문법

클론은 아래 레이어 구성을 재현하는 문제다. 영상 자체보다 그 위에 얹히는
텍스트·정보 레이어가 장르를 결정한다.

### 1. 미국 전문의약품(Rx) DTC 광고

예: [Ozempic “Oh!”](https://www.ispot.tv/ad/d6Xz/ozempic-oh)(Pilot “Magic”을
개사한 징글, [배경](https://www.fiercepharma.com/marketing/novo-nordisk-s-launches-first-dtc-for-ozempic-next-gen-diabetes-drug-blockbuster)),
Skyrizi(“nothing is everything” 징글, 2024년 TV 광고비 1위 — [Fierce Pharma](https://www.fiercepharma.com/marketing/abbvie-pulls-hat-trick-3rd-straight-year-top-tv-drug-ad-spender-buoyed-skyrizi-and-rinvoq)),
Rinvoq, Dupixent, Jardiance, Trulicity, Wegovy, [Caplyta(Intra-Cellular)](https://www.ispot.tv/ad/5ooa/intra-cellular-therapies-listening-to-different-kinds-of-music).

- 60초 전후. 전반부: 밝은 생활 장면(하이킹, 손주, 텃밭, 콘서트), 징글이나
  내레이션, 제품명 슈퍼.
- 중반 이후 “major statement”(부작용·금기): 내레이션이 빨라지지 않은 채
  길게 이어지고, 같은 내용이 화면 하단 또는 측면에 텍스트로 동시에 뜬다.
  2023년 FDA 최종규칙으로 TV는 음성과 텍스트 동시 제시가 의무다
  ([Federal Register](https://www.govinfo.gov/content/pkg/FR-2023-11-21/pdf/2023-25428.pdf),
  [요약](https://www.arnoldporter.com/en/perspectives/advisories/2023/12/requirements-for-dtc-tv-and-radio-prescription-drug-advertising)).
  이 구간에는 산만한 연출이 금지되어 화면이 차분해진다.
- 반복 요소(미확인, 관찰 기반): 모서리의 “Patient portrayal” / “Actor portrayal”,
  흰 배경 텍스트 카드의 “Ask your doctor about X”, 브랜드 URL,
  “$0 copay” 저축카드 안내, 끝 카드의 제약사 로고와 “Please see full
  Prescribing Information”.
- 2026년 FDA가 방송 광고에 부작용 전체 요약을 요구하는 규칙을 준비 중
  ([FDA Law Blog](https://www.thefdalawblog.com/2026/07/coming-soon-proposed-rule-to-remove-adequate-provision-and-ban-dtc-tv-ads/)).
  통과되면 형식이 크게 바뀔 수 있다.

### 2. 미국 브랜드 보험 광고(마스코트형)

GEICO 게코, Progressive Flo, Allstate Mayhem, State Farm Jake, Liberty Mutual
LiMu Emu, Aflac 오리(모두 미확인, 기억 기반). 15–30초 코미디 스킷 →
마지막 2–3초 로고 엔드카드와 슬로건, 하단 작은 법적 고지. 텍스트 레이어가
가장 적은 장르.

### 3. 미국 Medicare·생명보험 직접반응(DR) 광고

iSpot의 [Health](https://www.ispot.tv/browse/Z.ws/insurance/health),
[Life & Supplementary](https://www.ispot.tv/browse/Z.Lh/insurance/life-and-supplementary)
카테고리에 몰려 있다. 관찰 기반(미확인): 고령 유명인 대변인, 화면 상주하는
대형 전화번호 박스와 “TTY 711”, “Call now” 깜빡임, 혜택 금액 불릿 리스트,
하단의 “Not connected with or endorsed by the U.S. government or the federal
Medicare program” 고지가 거의 전 구간에 깔린다. 화면 정보 밀도가 가장 높아
클론 재료로 좋다.

### 4. 한국 보험 광고

- 브랜드형: 삼성화재, 현대해상, DB손해보험, 한화생명, 교보생명 등의
  이미지 광고(미확인).
- 텔레마케팅·다이렉트형: 라이나생명, AIA, 다이렉트 자동차보험 등. 큰
  상담번호(1588-…), “월 ○○원”, 보장 항목 리스트, 상담원 인서트(미확인).
- 확인된 규제 요소: TV 광고는 보험협회 광고심의위원회 심의를 받고
  ‘심의필’ 번호를 표시한다([시대](https://www.sidae.com/article/2025091015365482798)).
  2024년부터 종신보험 광고는 저축 목적에 적합하지 않다는 점, 보험금 지급
  제한, 해약환급금 설명을 반드시 넣어야 하고, “묻지도 따지지도 않고” 같은
  표현은 금지다([SBS Biz](https://biz.sbs.co.kr/amp/article/20000168511)).
  화면에서는 하단의 작은 고지 자막 블록으로 나타난다.

### 4-1. 낮 시간대 시니어 다이렉트(TM) 보험 광고 — 다음 클론 후보

프레임으로 화면 구성을 확인한 것(2026-10-09):

- [라이나 무배당 OK실버보험 (2분)](https://www.youtube.com/watch?v=TDbqqtEcChU): 노부부·유치원
  실사 장면, 좌하단 흰 굵은 자막과 노란 강조("가입 가능"), 하단 남색 바에 상품명+☎1670-4604,
  좌상단 작은 번호, 가입자 이름 자막("72세 김정자 님").
- [흥국생명 (무)가족사랑 치매간병보험 (2분)](https://www.youtube.com/watch?v=6gcHvnu38yM): 좌측 실사와
  우측 자주색 패널에 빽빽한 지급 조건 문단, 흰 배경 앞 여성 설계사와 핑크 제목 띠
  "매월 100만원씩!", 하단 핑크 바 080-311-9900.
- [AIA생명 무배당 우리가족 안심 치매보험 (60초)](https://www.youtube.com/watch?v=rF43ec9GcY4): 고지서 든
  중년 여성, "치매, 돈이 듭니다" 빨간 강조 박스, 정장 설계사, 하단 흰 바 080-855-7900,
  네이버 검색창.
- [흥국생명 다사랑 3N5 간편건강보험 (60초)](https://www.youtube.com/watch?v=kNvfC6rNkRk): 연보라 정장 진행자,
  "간병인 비용 보장 최대 540일까지!", 병원 종류 원형 아이콘, 하단 남보라 바 080-754-7000.

검색에서 찾았지만 프레임은 확인하지 않은 것: [라이나 OK실버보험 DR 120초](https://www.youtube.com/watch?v=7q605jZpMi0),
[흥국생명 치매간병보험 인포머셜 4분](https://www.youtube.com/watch?v=aSzIRT_6GLg),
[라이나생명 4분 인포머셜](https://www.youtube.com/watch?v=zHL3NWbmS3Q),
[AIA생명 꼭 필요한 건강보험 버스 편](https://www.youtube.com/watch?v=lGJgdEWa8tA),
[우체국 치매요양간병보험](https://www.youtube.com/watch?v=Rlm8-CkijTA),
[라이나 OK실버보험 이순재 편 (2011)](https://www.youtube.com/watch?v=xiKMOoLIZFo).

### 4-2. 분석 그래픽(육각형·레이더 차트) — 확인한 것 (2026-10-09)

- [고려은단 멀티비타민 올인원 시리즈 (2025, 30초)](https://www.youtube.com/watch?v=8OrRhb8sQnw): 13.5–20 s 구간에
  흰 배경 중앙 육각형 레이더 차트(축마다 비타민·미네랄 이름, 분홍–파랑 그라데이션 면,
  중앙 "23가지"), 이어서 차트 안에 인물(남/여/60+ 남/60+ 여)이 서고 다각형이 사람마다
  다른 모양으로 변형, 우측에 제품 박스와 "올인원 맨/우먼/60+". 같은 광고 6–8 s에
  나이·성별 프로필 카드 4장(분석 리포트 형식).
- 같은 계열 [2020 런칭 60초](https://www.youtube.com/watch?v=l4gd8qQFSak): "23" 원형 인포그래픽과 막대
  그래프(레이더는 아님).
- 확인했지만 다각형 분석 그래픽이 없던 것: 굿리치 보험분석 편, 보맵 보장핏팅, 보험클리닉,
  시그널플래너, 보플, 정관장, 임팩타민, 셀렉스, 뉴케어, 닥터린, 고려은단 코엔자임Q10·밀크씨슬
  (막대·게이지·앱 화면 위주).

### 5. 한국 일반의약품(OTC) 광고

대웅제약 우루사 “간 때문이야”, 동아제약 박카스, 게보린, 판피린, 인사돌,
아로나민(모두 미확인, 기억 기반). 미국 Rx와 반대로 효능 위주 15–30초,
부작용 정보가 적다는 연구가 있다([이화여대 논문](https://dspace.ewha.ac.kr/handle/2015.oak/174920)).
끝부분의 “사용상의 주의사항을 잘 읽고 의사, 약사와 상의하십시오” 류 자막과
광고심의 번호가 관례로 보이나 정확한 의무 문구는 확인하지 못했다
([약사법 제68조](https://www.law.go.kr/법령/약사법)와 식약처
「의약품 등의 광고 심의 기준」에서 확인 필요).

## 클론 시 레이어 분해

1. 배경 영상/정지 장면
2. 제품명·혜택 슈퍼(중앙 또는 하단 1/3)
3. 고지 텍스트 레이어: Rx의 major statement 동시 자막, 보험의 심의필·해지
   불이익 자막, Medicare의 정부 무관 고지
4. 상주 요소: 전화번호 박스, “Actor portrayal”, 모서리 로고
5. 엔드카드: 흰 배경, 로고, URL, “Ask your doctor” 또는 상담번호

장르 차이는 대부분 3·4번 레이어의 양과 지속 시간에서 나온다.
