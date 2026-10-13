import { FitText } from "../../../paper/fit-text";
import styles from "./p16-report.module.css";

const HEADINGS = [
  { id: "report", text: "ㄱ. 연구 보고서", y: 5.5 },
  { id: "student", text: "ㄴ. 학생 인터뷰", y: 130.5 },
  { id: "expert", text: "ㄷ. 전문가 인터뷰", y: 211.5 },
];

const CAPTIONS = [
  { id: "c1a", text: "ㄱ-1. 불안 대처 행동 빈도에 따른", x: 10, y: 22.5 },
  { id: "c1b", text: "불안 정도 변화", x: 30.5, y: 33.5 },
  { id: "c2", text: "ㄱ-2. 걷기 효과 검증을 위한 실험 결과", x: 155, y: 22.5 },
];

const LABELS = [
  { id: "y1a", text: "불안", x: 17.5, y: 46.5, w: 14, align: "right" },
  { id: "y1b", text: "정도", x: 17.5, y: 55, w: 14, align: "right" },
  { id: "x1", text: "행동 빈도", x: 52.5, y: 106, w: 50, align: "center" },
  { id: "y2a", text: "불안", x: 162.5, y: 46.5, w: 14, align: "right" },
  { id: "y2b", text: "정도", x: 162.5, y: 55, w: 14, align: "right" },
  { id: "g1a", text: "걷기", x: 174, y: 105.5, w: 50, align: "center" },
  { id: "g1b", text: "참여 집단", x: 174, y: 114.5, w: 50, align: "center" },
  { id: "g2a", text: "걷기", x: 211, y: 105.5, w: 50, align: "center" },
  { id: "g2b", text: "미참여 집단", x: 211, y: 114.5, w: 50, align: "center" },
  { id: "l1a", text: "회피적 행동", x: 105, y: 61, w: 40, align: "left" },
  { id: "l1b", text: "사회적 지지", x: 105, y: 72, w: 40, align: "left" },
  { id: "l1c", text: "추구 행동", x: 105, y: 80.5, w: 40, align: "left" },
  { id: "l2a", text: "실험 전", x: 268, y: 66, w: 25, align: "left" },
  { id: "l2b", text: "실험 후", x: 268, y: 76, w: 25, align: "left" },
];

const BARS = [
  { id: "b1", x: 185, top: 67.5, gray: false },
  { id: "b2", x: 200.5, top: 82.5, gray: true },
  { id: "b3", x: 222.75, top: 67.5, gray: false },
  { id: "b4", x: 238, top: 67.5, gray: true },
];

const STUDENT = [
  { id: "student-1", text: "“단 하나의 실수도 없는 멋진 발표를 해서 다른 사람들에게 완벽하게" },
  { id: "student-2", text: "보이고 싶었어요. 하지만 막상 발표하는 날이 되자 실수할까 봐 너무 걱정이" },
  { id: "student-3", text: "되어서 발표를 못 하겠다고 선생님께 말씀드렸어요. 이후에 발표에 대한" },
  { id: "student-4", text: "불안이 더 커졌어요.”" },
];

const EXPERT = [
  { id: "expert-1", text: "“정서 조절은 마음을 가라앉히면서 자신에게 유익한 방식으로 정서를 활용" },
  { id: "expert-2", text: "하는 것입니다. 정서 조절을 위해서는 먼저 정서를 명확하게 인식하는 것이" },
  { id: "expert-3", text: "필요하고, 정서 조절이 이루어져야 인지적 유연성을 발휘할 수 있습니다." },
  { id: "expert-4", text: "걷기는 정서 조절에 도움이 되는 한 방법입니다. 걸으면 근육이 이완되어" },
  { id: "expert-5", text: "긴장이 완화되는데, 이러한 신체적 변화가 정서 조절에 도움을 줍니다.”" },
];

type ParagraphLine = { id: string; text: string };

function Paragraph({ lines, y, pitch }: { lines: ParagraphLine[]; y: number; pitch: number }) {
  return (
    <>
      {lines.map((line, i) => {
        const last = i === lines.length - 1;
        const width = i === 0 ? 277 : 283.5;
        return (
          <div key={line.id} className={styles.line} style={{ top: y + i * pitch - 6, left: i === 0 ? 15.5 : 9 }}>
            {last ? line.text : <FitText width={width}>{line.text}</FitText>}
          </div>
        );
      })}
    </>
  );
}

export default function P16Report() {
  return (
    <div className={styles.root}>
      {HEADINGS.map((h) => (
        <div key={h.id} className={styles.heading} style={{ top: h.y - 7 }}>
          {h.text}
        </div>
      ))}
      {CAPTIONS.map((c) => (
        <div key={c.id} className={styles.caption} style={{ left: c.x, top: c.y - 5.5 }}>
          {c.text}
        </div>
      ))}

      <div className={styles.axisV} style={{ left: 33.75, top: 46, height: 53.5 }}><i className={styles.arrowUp} /></div>
      <div className={styles.axisH} style={{ left: 33.75, top: 99, width: 57 }}><i className={styles.arrowRight} /></div>
      <div className={styles.axisV} style={{ left: 179, top: 46, height: 53.5 }}><i className={styles.arrowUp} /></div>
      <div className={styles.axisH} style={{ left: 179, top: 99, width: 76.5 }}><i className={styles.arrowRight} /></div>

      <div className={styles.trend} style={{ left: 45, top: 65, width: 40.4, transform: "rotate(-16.2deg)", borderTopStyle: "dashed" }} />
      <div className={styles.trend} style={{ left: 45, top: 71.25, width: 40.2, transform: "rotate(12.7deg)" }} />

      <div className={styles.legend} style={{ left: 91, top: 56, width: 53, height: 31 }} />
      <div className={styles.trend} style={{ left: 94, top: 61, width: 8.5, borderTopStyle: "dashed", borderTopWidth: 1 }} />
      <div className={styles.trend} style={{ left: 94.5, top: 72, width: 8 }} />

      {BARS.map((b) => (
        <div key={b.id} className={b.gray ? styles.barGray : styles.bar} style={{ left: b.x, top: b.top, height: 99 - b.top }} />
      ))}

      <div className={styles.legend} style={{ left: 255, top: 60, width: 38, height: 22.5 }} />
      <div className={styles.bar} style={{ left: 258, top: 63, width: 7.5, height: 6.5 }} />
      <div className={styles.barGray} style={{ left: 258, top: 73, width: 7.5, height: 6.5 }} />

      {LABELS.map((l) => (
        <div key={l.id} className={styles.label} style={{ left: l.x, top: l.y - 5, width: l.w, textAlign: l.align as "left" }}>
          {l.text}
        </div>
      ))}

      <Paragraph lines={STUDENT} y={147.5} pitch={12.5} />
      <Paragraph lines={EXPERT} y={227.5} pitch={12.7} />
    </div>
  );
}
