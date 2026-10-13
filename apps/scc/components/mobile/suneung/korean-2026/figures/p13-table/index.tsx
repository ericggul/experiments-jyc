import styles from "./p13-table.module.css";

const HEADER = ["연번", "북방계 식물명", "희귀 식물"];

const ROWS = [
  { id: "1", no: "1", name: "월귤", rare: "○" },
  { id: "2", no: "2", name: "주저리고사리", rare: "×" },
  { id: "3", no: "3", name: "땃두릅나무", rare: "○" },
  { id: "4", no: "4", name: "흰인가목", rare: "○" },
  { id: "5", no: "5", name: "돌단풍", rare: "×" },
];

export default function P13Table() {
  return (
    <div className={styles.root}>
      <div className={styles.table}>
        <div className={`${styles.row} ${styles.head}`}>
          {HEADER.map((cell) => (
            <span key={cell} className={styles.cell}>
              {cell}
            </span>
          ))}
        </div>
        {ROWS.map((row) => (
          <div key={row.id} className={styles.row}>
            <span className={styles.cell}>{row.no}</span>
            <span className={styles.cell}>{row.name}</span>
            <span className={styles.cell}>{row.rare}</span>
          </div>
        ))}
      </div>
      <span className={styles.note}>-212종 중 일부만 제시함.</span>
    </div>
  );
}
