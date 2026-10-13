import styles from "./p13-chart.module.css";

const LEGEND = [
  { id: "spring", label: "○○군 풍혈지", tone: styles.light, top: 3 },
  { id: "all", label: "○○군 전체", tone: styles.dark, top: 12 },
];

const BARS = [
  { id: "may-light", tone: styles.light, left: 21.75, top: 52.5, value: "12.0" },
  { id: "may-dark", tone: styles.dark, left: 33.25, top: 49, value: "14.7" },
  { id: "jul-light", tone: styles.light, left: 64.25, top: 49.75, value: "14.2" },
  { id: "jul-dark", tone: styles.dark, left: 75.75, top: 29.25, value: "26.7" },
];

const MONTHS = [
  { id: "may", label: "5월", center: 33.75 },
  { id: "jul", label: "7월", center: 76.25 },
];

const AXIS_LABEL = ["평", "균", "기", "온"];

export default function P13Chart() {
  return (
    <div className={styles.root}>
      <div className={styles.legend}>
        {LEGEND.map((item) => (
          <div key={item.id} className={styles.legendRow} style={{ top: item.top }}>
            <span className={`${styles.swatch} ${item.tone}`} />
            <span className={styles.legendText}>{item.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.axisY} />
      <div className={styles.axisX} />
      <div className={styles.yLabel}>
        {AXIS_LABEL.map((ch) => (
          <span key={ch}>{ch}</span>
        ))}
        <span className={styles.unit}>(°C)</span>
      </div>
      {BARS.map((bar) => (
        <div key={bar.id}>
          <div
            className={`${styles.bar} ${bar.tone}`}
            style={{ left: bar.left, top: bar.top, height: 72 - bar.top }}
          />
          <span className={styles.value} style={{ left: bar.left, top: bar.top - 7.5 }}>
            {bar.value}
          </span>
        </div>
      ))}
      {MONTHS.map((month) => (
        <span key={month.id} className={styles.month} style={{ left: month.center }}>
          {month.label}
        </span>
      ))}
      <span className={styles.source}>출처: 국립수목원(2022)</span>
    </div>
  );
}
