import { useState, type ReactNode } from "react";
import styles from "./ios.module.css";

/**
 * Replaces content smoothly when `id` changes: the old content stays mounted
 * and animates out while the new animates in. Clones stay pure by using this
 * shared primitive instead of holding state themselves. The outgoing layer
 * keeps the content it had when its id began.
 */
export function Swap({ id, kind, children }: { id: string | number; kind: "up" | "fade"; children: ReactNode }) {
  const [current, setCurrent] = useState({ id, node: children });
  const [leaving, setLeaving] = useState<{ id: string | number; node: ReactNode } | null>(null);
  if (current.id !== id) {
    setLeaving(current);
    setCurrent({ id, node: children });
  }
  const enter = kind === "up" ? styles.swapUpIn : styles.swapFadeIn;
  const exit = kind === "up" ? styles.swapUpOut : "";
  return (
    <>
      {leaving && <div key={`out:${leaving.id}`} className={`${styles.swapLayer} ${exit}`}>{leaving.node}</div>}
      <div
        key={id}
        className={`${styles.swapLayer} ${leaving ? enter : ""}`}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setLeaving(null);
        }}
      >
        {children}
      </div>
    </>
  );
}
