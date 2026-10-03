import { AppIcon, ios } from "../../ios";
import { createRng } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import { HomeScreen } from "../home";
import type { CloneDefinition } from "../types";
import styles from "./system-sheet.module.css";

/** The alert drops in after the person has been using the home screen for a while. */
const alertAt = (duration: number) => Math.max(2, Math.round(duration * 0.4));

/** The home screen keeps being used underneath; the dim and the alert arrive as a sheet. */
function Backdrop(props: ScreenProps) {
  const raised = props.elapsed >= alertAt(props.duration);
  return (
    <>
      <HomeScreen {...props} view="page" />
      {raised && <div key="dim" className={`${styles.dim} ${ios.appear}`} />}
    </>
  );
}

function LowBattery(props: ScreenProps) {
  const raised = props.elapsed >= alertAt(props.duration);
  return (
    <div className={styles.sheet}>
      <Backdrop {...props} />
      {raised && <div key="alert" className={`${styles.center} ${ios.appear}`}><div className={styles.alert} role="alertdialog">
        <div className={styles.text}>
          <div className={styles.title}>Low Battery</div>
          <div className={styles.message}>10% of battery remaining.</div>
        </div>
        <div className={`${styles.button}`}>Low Power Mode</div>
        <div className={`${styles.button} ${styles.bold}`}>Close</div>
      </div></div>}
    </div>
  );
}

function Update(props: ScreenProps) {
  const rng = createRng(props.seed ^ 0x5eed);
  const size = rng.int(380, 940);
  const minor = rng.int(1, 4);
  const raised = props.elapsed >= alertAt(props.duration);
  return (
    <div className={styles.sheet}>
      <Backdrop {...props} />
      {raised && <div key="alert" className={`${styles.center} ${ios.appear}`}><div className={styles.alert} role="alertdialog">
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
      </div></div>}
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
    { view: "low-battery", label: "ten percent", seed: 4, clock: 16 * 60 + 52, duration: 8 },
    { view: "update", label: "install tonight", seed: 9, clock: 21 * 60 + 14, duration: 8 },
  ],
};

export default systemSheet;
