import type { StaticImageData } from "next/image";
import styles from "./illustration.module.css";

/** A drawn picture filling its figure box, as printed. */
export function Illustration({ art }: { art: StaticImageData }) {
  return <img className={styles.art} src={art.src} alt="" draggable={false} />;
}
