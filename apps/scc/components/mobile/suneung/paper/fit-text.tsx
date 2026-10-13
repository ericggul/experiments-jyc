import type { ReactNode } from "react";
import styles from "./paper.module.css";

/** Text that the fit pass spreads to the printed width, for lines inside figures. */
export function FitText({ width, children }: { width: number; children: ReactNode }) {
  return (
    <span className={styles.fitText} data-fit-width={width}>
      {children}
    </span>
  );
}
