import raccoon from "../../assets/p18-blog-raccoon.webp";
import styles from "./p18-blog.module.css";

type Seg = readonly [text: string, underline?: boolean];
type Line = {
  id: string;
  y: number;
  segs: Seg[];
  indent?: boolean;
  justify?: boolean;
};

const lines: Line[] = [
  { id: "l1", y: 355, indent: true, segs: [["안녕하세요. 명호입니다!"]] },
  { id: "l2", y: 412, indent: true, justify: true, segs: [["수행평가에 쓸 책을 구하지 못해 막막했는데, ◇◇ 시립 도서관에서"]] },
  { id: "l3", y: 468, segs: [["보낸 ‘상호 대차’ 온라인 알림 메시지가 떠올랐어요!!!"]] },
  { id: "l4", y: 804, indent: true, justify: true, segs: [["바로 검색했더니 이웃 도시의 △△ 도서관에 찾던 책이 있었어요."]] },
  { id: "l5", y: 860, justify: true, segs: [["ⓐ "], ["상호 대차를 신청하고 며칠 뒤인 일요일에 도착 문자를 받았답니다!", true]] },
  { id: "l6", y: 916, justify: true, segs: [["수령 기간이 ‘도착 문자 수신일로부터 3업무일 이내’라고 되어"]] },
  { id: "l7", y: 972, justify: true, segs: [["있었지만, ‘업무일’이 뭔지 잘 몰랐고, ‘로부터’는 당연히 문자 메시지"]] },
  { id: "l8", y: 1028, justify: true, segs: [["수신일을 포함한다고 생각해서, 화요일이 수령 마감일이라고 생각"]] },
  { id: "l9", y: 1084, justify: true, segs: [["했어요. 그런데 화요일에 갑자기 일이 생겨 못 갔고, 3일간 재신청할"]] },
  { id: "l10", y: 1140, segs: [["수 없다고 생각해 좌절했답니다."]] },
  { id: "l11", y: 1196, indent: true, justify: true, segs: [["그런데! 목요일 아침! ⓑ "], ["도서관으로부터 문자 메시지가 와서 오늘", true]] },
  { id: "l12", y: 1252, justify: true, segs: [["내로 신청 도서를 수령하라는 것이 아니겠어요?", true], [" 전화를 했더니"]] },
  { id: "l13", y: 1308, justify: true, segs: [["‘업무일’은 휴관일 제외, ‘수신일로부터 3업무일’은 ‘수신일＋3업무일’"]] },
  { id: "l14", y: 1364, segs: [["이라고 알려 주셨어요. 정말 기뻤답니다. :)"]] },
  { id: "l15", y: 1476, indent: true, justify: true, segs: [["자료실 운영 시간을 오후 10시까지로 알고 있어 여유 있게 도서관"]] },
  { id: "l16", y: 1532, justify: true, segs: [["으로 갔지만…, 수령 마감 시간은 오후 6시더라고요. 도착한 건 오후"]] },
  { id: "l17", y: 1588, segs: [["6시 25분…. 안타깝게도 책을 놓쳤습니다."]] },
];

export default function P18Blog() {
  return (
    <div className={styles.root}>
      <div className={styles.frame} />
      <div className={styles.badge}>블로그</div>
      <div className={styles.badgeTail} />
      <div className={styles.search}>이 블로그에서 검색</div>
      <div className={styles.lens} />
      <div className={styles.handle} />
      <div className={`${styles.menuBar} ${styles.menu1}`} />
      <div className={`${styles.menuBar} ${styles.menu2}`} />
      <div className={`${styles.menuBar} ${styles.menu3}`} />
      <div className={styles.rule} />
      <div className={styles.title}>도서관 상호 대차, 저처럼 실수하진 마세요!</div>
      <div className={styles.meta}>
        <span>공개 유형: 전체 공개</span>
        <span>게시 일시: 2025. 10. 17. 20:32</span>
      </div>
      {lines.map((line) => (
        <div
          key={line.id}
          className={`${styles.line} ${line.indent ? styles.indent : ""} ${line.justify ? styles.justify : ""}`}
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
      <div className={`${styles.card} ${styles.cardText}`}>
        <span className={styles.cardLine1}>상호 대차에 대한 자세한 내용은</span>
        <span className={styles.cardLine2}>우측을 클릭해 주세요.</span>
      </div>
      <div className={`${styles.card} ${styles.cardVideo}`}>
        <div className={styles.thumb}>
          <span className={styles.thumbTitle}>상호 대차!</span>
          <span className={styles.play} />
          <span className={styles.playTri} />
          <div className={styles.controls}>
            <span className={styles.progress} />
          </div>
        </div>
        <span className={styles.url}>https://video.lib.⌂⌂</span>
      </div>
      <img className={styles.raccoon} src={raccoon.src} alt="" draggable={false} />
    </div>
  );
}
