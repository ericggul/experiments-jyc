import c1 from "../../assets/p19-cards-c1.webp";
import c2 from "../../assets/p19-cards-c2.webp";
import c3 from "../../assets/p19-cards-c3.webp";
import styles from "./p19-cards.module.css";

const arts = [
  { id: "c1", src: c1.src, left: 2, top: 2, width: 150.5, height: 139 },
  { id: "c2", src: c2.src, left: 154, top: 2, width: 150.5, height: 139 },
  { id: "c3", src: c3.src, left: 2, top: 143, width: 150.5, height: 138.5 },
];

const labels = [
  { id: "l1", text: "도서관", left: 94.5, top: 23.5 },
  { id: "l2", text: "다른 도서관", left: 270, top: 50 },
  { id: "l3", text: "지정 도서관", left: 194.5, top: 72 },
  { id: "l4", text: "A 도서관", left: 40.5, top: 189 },
  { id: "l5", text: "B 도서관", left: 115, top: 189 },
  { id: "l6", text: "D 도서관", left: 39.5, top: 259 },
  { id: "l7", text: "C 도서관", left: 115.5, top: 259 },
];

const tags = [
  { id: "t1", text: "카드 1", left: 1.5, top: 132, width: 26, height: 9.5, borderWidth: "1px 1px 0 0" },
  { id: "t2", text: "카드 2", left: 279, top: 132, width: 26, height: 9.5, borderWidth: "1px 0 0 1px" },
  { id: "t3", text: "카드 3", left: 1.5, top: 272, width: 26, height: 10, borderWidth: "1px 1px 0 0" },
  { id: "t4", text: "카드 4", left: 279, top: 272, width: 26, height: 10, borderWidth: "1px 0 0 1px" },
];

const days = ["일", "월", "화", "수", "목", "금", "토"];
const searches = [
  { id: "s1", text: "☆☆도서관", top: 238 },
  { id: "s2", text: "□□도서관", top: 249 },
  { id: "s3", text: "◎◎도서관", top: 260.5 },
];
const noteLines = [
  { id: "n1", text: "개별 도서관 누리집에서", top: 242 },
  { id: "n2", text: "상호 대차 운영 방식에 대한", top: 253.3 },
  { id: "n3", text: "정확한 정보를 확인하세요.", top: 264.5 },
];

export default function P19Cards() {
  return (
    <div className={styles.root}>
      {arts.map((a) => (
        <img
          key={a.id}
          className={styles.art}
          src={a.src}
          alt=""
          draggable={false}
          style={{ left: a.left, top: a.top, width: a.width, height: a.height }}
        />
      ))}
      <div className={styles.vline} />
      <div className={styles.hline} />
      <div className={styles.frame} />

      <div className={`${styles.c} ${styles.hand}`} style={{ left: 76, top: 13, fontSize: 8.8 }}>
        꼭 필요한 책인데, 구하기가 어렵다면?
      </div>
      <div className={`${styles.c} ${styles.hand}`} style={{ left: 232, top: 12.5, fontSize: 8.6 }}>
        포기는 금물!
      </div>
      <div className={`${styles.c} ${styles.hand}`} style={{ left: 229.5, top: 25, fontSize: 8 }}>
        <span className={styles.big}>‘상호 대차’</span>로 해결!
      </div>
      <div className={`${styles.c} ${styles.hand}`} style={{ left: 77.5, top: 152.5 }}>
        <span className={styles.big}>하나</span>
        <span className={styles.small}>로 </span>
        <span className={styles.big}>연결</span>
        <span className={styles.small}>되어</span>
      </div>
      <div className={`${styles.c} ${styles.hand}`} style={{ left: 76, top: 169.5 }}>
        <span className={styles.big}>편리</span>
        <span className={styles.small}>해진 </span>
        <span className={styles.big}>도서관</span>
      </div>

      {labels.map((l) => (
        <div key={l.id} className={`${styles.c} ${styles.myeong}`} style={{ left: l.left, top: l.top, fontSize: 6.5 }}>
          {l.text}
        </div>
      ))}

      <div className={`${styles.c} ${styles.hand}`} style={{ left: 229, top: 153, fontSize: 12, fontWeight: 700 }}>
        이것만은 꼭!
      </div>
      <div className={styles.pennant}>
        <div className={styles.pennantIn}>‘수신일로부터 3업무일’이란?</div>
      </div>

      <div className={styles.cal}>
        {days.map((d) => (
          <div key={d} className={styles.th}>
            {d}
          </div>
        ))}
        <div className={styles.td}>
          1
          <span className={styles.note} style={{ left: 7, top: 2.5 }}>{"도착\n문자\n수신"}</span>
        </div>
        <div className={`${styles.td} ${styles.gray}`}>
          2
          <span className={styles.note} style={{ left: 7, top: 5.5 }}>{"정기\n휴관"}</span>
        </div>
        {[3, 4, 5, 6, 7].map((n) => (
          <div key={n} className={styles.td}>
            {n}
          </div>
        ))}
      </div>
      <div className={styles.brace} style={{ left: 158.5, top: 212.5, width: 20, height: 3 }} />
      <div className={styles.brace} style={{ left: 199, top: 213, width: 60.5, height: 4, borderRadius: "0 0 6px 6px" }} />
      <div className={styles.pill} style={{ left: 155.5, top: 218, width: 25.5 }}>수신일</div>
      <div className={styles.pill} style={{ left: 216, top: 218, width: 27 }}>3업무일</div>
      <div className={`${styles.c} ${styles.myeong}`} style={{ left: 199, top: 224, fontSize: 10 }}>+</div>

      {searches.map((s) => (
        <div key={s.id} className={styles.row} style={{ top: s.top }}>
          <div className={styles.field}>{s.text}</div>
          <div className={styles.btn}>
            <span className={styles.lens} />
            <span className={styles.handle} />
          </div>
        </div>
      ))}
      <div className={styles.cursor} />
      {noteLines.map((n) => (
        <div key={n.id} className={`${styles.l} ${styles.hand} ${styles.noteText}`} style={{ left: 212, top: n.top }}>
          {n.text}
        </div>
      ))}
      <div className={`${styles.c} ${styles.myeong}`} style={{ left: 181.7, top: 276, fontSize: 8 }}>⋮</div>

      {tags.map((t) => (
        <div
          key={t.id}
          className={styles.tag}
          style={{ left: t.left, top: t.top, width: t.width, height: t.height, borderWidth: t.borderWidth }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
