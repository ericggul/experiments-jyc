import { glyphs } from "./glyphs";
import styles from "./arithmetic.module.css";

const operations = [
  { id: "heart", label: "좋아요" },
  { id: "comment", label: "댓글" },
  { id: "repost", label: "리포스트" },
  { id: "share", label: "공유" },
] as const;

type OperationId = (typeof operations)[number]["id"];

function Glyph({ id }: { id: OperationId }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (id === "heart") return <svg {...common}><path fill="currentColor" stroke="none" d={glyphs.heart} /></svg>;
  if (id === "comment") return <svg {...common}><path d={glyphs.comment} /></svg>;
  if (id === "repost") return <svg {...common}><path fill="currentColor" stroke="none" d={glyphs.repost} /></svg>;
  return <svg {...common}><path d={glyphs.share} /><line {...glyphs.shareFold} /></svg>;
}

export default function ArithmeticDefault() {
  return (
    <main className={styles.page}>
      <div className={styles.row}>
        {operations.map((operation) => (
          <span key={operation.id} className={styles.operation} role="img" aria-label={operation.label}>
            <Glyph id={operation.id} />
          </span>
        ))}
      </div>
    </main>
  );
}
