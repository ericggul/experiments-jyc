import band from "../../assets/p4-strip-band.webp";
import { Illustration } from "../illustration";
import styles from "./p4-strip.module.css";

export default function P4Strip() {
  return (
    <div className={styles.root}>
      <Illustration art={band} />
      <span className={styles.p}>P층</span>
      <span className={styles.q}>Q층</span>
    </div>
  );
}
