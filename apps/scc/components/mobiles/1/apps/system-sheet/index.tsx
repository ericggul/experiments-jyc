import { AppIcon } from "../../ios";
import { createRng } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import { HomeScreen } from "../home";
import type { CloneDefinition } from "../types";
import styles from "./system-sheet.module.css";

function LowBattery(props: ScreenProps) {
  return (
    <div className={styles.sheet}>
      <HomeScreen {...props} view="page" />
      <div className={styles.dim} />
      <div className={styles.alert} role="alertdialog">
        <div className={styles.text}>
          <div className={styles.title}>Low Battery</div>
          <div className={styles.message}>10% of battery remaining.</div>
        </div>
        <div className={`${styles.button}`}>Low Power Mode</div>
        <div className={`${styles.button} ${styles.bold}`}>Close</div>
      </div>
    </div>
  );
}

function Update(props: ScreenProps) {
  const rng = createRng(props.seed ^ 0x5eed);
  const size = rng.int(380, 940);
  const minor = rng.int(1, 4);
  return (
    <div className={styles.sheet}>
      <HomeScreen {...props} view="page" />
      <div className={styles.dim} />
      <div className={styles.alert} role="alertdialog">
        <div className={styles.text}>
          <div className={styles.icon}><AppIcon app="system-sheet" size={46} /></div>
          <div className={styles.title}>Software Update Available</div>
          <div className={styles.message}>Version 26.{minor} is ready. It includes security improvements and bug fixes. Install tonight while charging?</div>
          <div className={styles.version}>{size} MB</div>
        </div>
        <div className={styles.row}>
          <div className={styles.button}>Later</div>
          <div className={`${styles.button} ${styles.bold}`}>Install Now</div>
        </div>
      </div>
    </div>
  );
}

export function SystemSheetScreen(props: ScreenProps) {
  return props.view === "update" ? <Update {...props} /> : <LowBattery {...props} />;
}

const systemSheet: CloneDefinition = {
  Screen: SystemSheetScreen,
  tone: () => "light",
  fixtures: [
    { view: "low-battery", label: "ten percent", seed: 4, clock: 16 * 60 + 52, duration: 1 },
    { view: "update", label: "install tonight", seed: 9, clock: 21 * 60 + 14, duration: 1 },
  ],
};

export default systemSheet;
