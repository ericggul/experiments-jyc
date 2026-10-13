import styles from "./p19-blog.module.css";

type Seg = readonly [text: string, underline?: boolean];
type Line = {
  id: string;
  y: number;
  segs: Seg[];
  indent?: boolean;
  justify?: boolean;
  center?: boolean;
};

const lines: Line[] = [
  { id: "c1", y: 55, center: true, segs: [["(ⓒ "], ["결국 그다음 주 화요일에 다시 신청해서", true]] },
  { id: "c2", y: 108, center: true, segs: [["그 주 목요일에야 책을 받을 수 있었어요.", true], [")"]] },
  { id: "d1", y: 177, indent: true, justify: true, segs: [["여러 도서관의 누리집을 확인했는데 운영 방식의 큰 틀은 같았지만,"]] },
  { id: "d2", y: 233, justify: true, segs: [["도서관마다 대출 권수나 수령 시간 등 약간의 차이가 있었어요. ⓓ "], ["다음", true]] },
  { id: "d3", y: 290, justify: true, segs: [["세 가지 유의 사항을 꼭 확인해 봐야지 저 같은 실수는 하지 않을 거예요.", true]] },
  { id: "e1", y: 595, indent: true, justify: true, segs: [["비록 좀 늦어지긴 했지만, 상호 대차 덕분에 큰 도움을 받았어요!"]] },
  { id: "e2", y: 651, justify: true, segs: [["한 곳의 도서관만으로는 원하는 책을 구하기가 어려운 경우도 있는데,"]] },
  { id: "e3", y: 707, justify: true, segs: [["도서관끼리 연결되어 있으니 마치 하나의 거대한 도서관을 이용한"]] },
  { id: "e4", y: 763, segs: [["것처럼 책을 빌리기 편했어요."]] },
  { id: "e5", y: 820, indent: true, justify: true, segs: [["이렇게 좋은 서비스를 모르는 친구들이 많아서, 상호 대차를"]] },
  { id: "e6", y: 876, justify: true, segs: [["소개하는 카드 뉴스를 만들어 우리 학교 누리 소통망에 게시할"]] },
  { id: "e7", y: 932, segs: [["예정이에요. ⓔ "], ["완성되면 블로그에도 올릴게요.", true]] },
];

const notes = [
  { id: "n1", y: 383, icon: "☝︎", text: "‘업무일’ 계산 시 휴관일은 제외함." },
  { id: "n2", y: 437, icon: "✌︎", text: "‘수신일로부터 ○업무일’의 날짜 계산: 수신일＋○업무일" },
  { id: "n3", y: 493, icon: "✋︎", text: "수령 시간과 자료실 운영 시간이 다를 수 있음." },
];

export default function P19Blog() {
  return (
    <div className={styles.root}>
      <div className={styles.frame} />
      {lines.map((line) => (
        <div
          key={line.id}
          className={`${styles.line} ${line.indent ? styles.indent : ""} ${line.justify ? styles.justify : ""} ${line.center ? styles.center : ""}`}
          style={{ top: line.y / 4 - 7 }}
        >
          {line.segs.map((seg) =>
            seg[1] ? (
              <span key={seg[0]} className={styles.ul}>{seg[0]}</span>
            ) : (
              <span key={seg[0]}>{seg[0]}</span>
            ),
          )}
        </div>
      ))}
      <div className={styles.note}>
        <div className={styles.curl} />
      </div>
      {notes.map((note) => (
        <div key={note.id} className={styles.noteLine} style={{ top: note.y / 4 - 7 }}>
          <span className={styles.icon}>{note.icon}</span>
          <span>{note.text}</span>
        </div>
      ))}
      <div className={styles.rule} />
      <div className={styles.tags}>#상호대차 &nbsp;#도서관 &nbsp;#업무일</div>
      <div className={styles.like}>
        <span className={styles.heart}>♥</span> 공감 56
      </div>
      <div className={styles.comment}>
        <span className={styles.bubble}>
          <span className={styles.dots}>•••</span>
        </span>
        댓글 5
      </div>
    </div>
  );
}
