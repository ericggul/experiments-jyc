import styles from "./p19-comments.module.css";

type Comment = {
  id: string;
  nick: string;
  label: { x: number; y: number; w: number; h: number };
  box: { x: number; y: number; w: number; h: number };
  lines: { text: string; x: number; w: number; y: number }[];
};

type Link = { id: string; x: number; y1: number; y2: number; x2: number };

const comments: Comment[] = [
  {
    id: "c1",
    nick: "살구",
    label: { x: 5.5, y: 5, w: 25.7, h: 18 },
    box: { x: 33.7, y: 2.5, w: 269.5, h: 28 },
    lines: [
      { text: "알려 주신 상호 대차 덕분에 꼭 필요했던 책들 중 대부분을 구했어요.", x: 37.5, w: 260, y: 10.7 },
      { text: "이 과정에서 명호 님의 실수담이 큰 도움이 되었어요.", x: 38, w: 201.5, y: 21.2 },
    ],
  },
  {
    id: "c2",
    nick: "태양",
    label: { x: 22, y: 31.2, w: 25.5, h: 14.5 },
    box: { x: 50, y: 30.5, w: 253.3, h: 25 },
    lines: [
      { text: "살구 님, 그렇다면 책을 다는 못 구하신 건가요? 그럼 전국 단위 상호", x: 53.7, w: 244, y: 38 },
      { text: "대차인 국립중앙도서관의 ‘책바다’를 이용해 보세요.", x: 53.7, w: 196, y: 47.5 },
    ],
  },
  {
    id: "c3",
    nick: "꽃잎",
    label: { x: 6.2, y: 58, w: 25, h: 15.8 },
    box: { x: 33.7, y: 57.5, w: 269.5, h: 24 },
    lines: [
      { text: "도착 문자가 언제 올지도 모르는데, 명호 님처럼 ‘수신일+3업무일’ 동안", x: 37.5, w: 260, y: 65.5 },
      { text: "예상 못 한 일이 생길 수도 있잖아요. 도서 수령 기간을 늘리면 좋겠어요.", x: 38, w: 261, y: 75 },
    ],
  },
  {
    id: "c4",
    nick: "동동",
    label: { x: 22, y: 85.5, w: 26.7, h: 14 },
    box: { x: 50, y: 85.5, w: 252.5, h: 24.5 },
    lines: [
      { text: "저도 수령 마감일을 넘겨서 재신청 불가 기간 동안 책을 못 빌렸어요.", x: 53.7, w: 245, y: 93 },
      { text: "10업무일 정도로 기간을 늘려 달라고 도서관에 건의해 보려고요.", x: 53.7, w: 245, y: 102.5 },
    ],
  },
  {
    id: "c5",
    nick: "바다",
    label: { x: 35, y: 112.5, w: 27.5, h: 14 },
    box: { x: 64.5, y: 112.5, w: 238, h: 24.5 },
    lines: [
      { text: "기간을 늘리면 좋긴 할 텐데, 10업무일은 너무 긴 것 같아요.", x: 68, w: 231, y: 120 },
      { text: "그 책을 급히 찾는 또 다른 사람이 있을 수 있잖아요.", x: 68, w: 203, y: 129.3 },
    ],
  },
];

const links: Link[] = [
  { id: "l1", x: 13.7, y1: 23, y2: 38, x2: 21.5 },
  { id: "l2", x: 13.7, y1: 73.8, y2: 92.5, x2: 21.5 },
  { id: "l3", x: 27, y1: 99.3, y2: 119.5, x2: 34 },
];

export default function P19Comments() {
  return (
    <div className={styles.root}>
      {links.map((l) => (
        <div key={l.id}>
          <span className={styles.v} style={{ left: l.x, top: l.y1, height: l.y2 - l.y1 }} />
          <span className={styles.h} style={{ left: l.x, top: l.y2, width: l.x2 - l.x }} />
          <span className={styles.arrow} style={{ left: l.x2 - 2.2, top: l.y2 - 1.6 }} />
        </div>
      ))}
      {comments.map((c) => (
        <div key={c.id}>
          <div
            className={styles.nick}
            style={{ left: c.label.x, top: c.label.y, width: c.label.w, height: c.label.h }}
          >
            {c.nick}
          </div>
          <div
            className={styles.box}
            style={{ left: c.box.x, top: c.box.y, width: c.box.w, height: c.box.h }}
          />
          {c.lines.map((ln) => (
            <div
              key={ln.text}
              className={styles.line}
              style={{ left: ln.x, top: ln.y - 5.5, width: ln.w }}
            >
              {ln.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
