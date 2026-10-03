import { Icon } from "../../ios";
import { createRng } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./drift.module.css";

const sounds = [
  ["Rain on a Tin Roof", "Nature · Sleep"],
  ["Brown Noise", "Noise · Deep Sleep"],
  ["Night Train to Albany", "Sleep Story · 42 min"],
  ["Ocean at Montauk", "Nature · Sleep"],
  ["Box Fan, Low", "Noise · Focus & Sleep"],
] as const;

const WAVE_BARS = Array.from({ length: 36 }, (_, i) => i);

/** The screen dims as the session runs, as if the phone fades to sleep. */
const dimFor = (elapsed: number, duration: number) => Math.min(0.7, (elapsed / Math.max(1, duration)) * 0.7);

function Sounds({ seed, elapsed, duration }: ScreenProps) {
  const rng = createRng(seed);
  const [title, subtitle] = rng.pick(sounds);
  const timer = rng.pick([30, 45, 60]);
  const left = Math.max(0, timer - elapsed);
  const heights = WAVE_BARS.map(() => 8 + rng.next() * 32);
  return (
    <div className={styles.screen}>
      <div className={styles.top}><Icon name="chevronDown" size={22} stroke={2.2} /><span>Sleep timer</span><Icon name="more" size={22} stroke={3} /></div>
      <div className={styles.art} />
      <div className={styles.title}>{title}</div>
      <div className={styles.subtitle}>{subtitle}</div>
      <div className={styles.wave} aria-hidden="true">
        {WAVE_BARS.map((bar) => <span key={bar} style={{ height: heights[bar] }} />)}
      </div>
      <div className={styles.timer}><span>{elapsed}:00</span><span>Stops in {left} min</span></div>
      <div className={styles.bar}><span style={{ width: `${Math.min(100, (elapsed / timer) * 100)}%` }} /></div>
      <div className={styles.controls}>
        <Icon name="moon" size={26} stroke={1.8} />
        <span className={styles.play}><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg></span>
        <Icon name="clock" size={26} stroke={1.8} />
      </div>
      <div className={styles.dim} style={{ opacity: dimFor(elapsed, duration) }} />
    </div>
  );
}

function WindDown({ seed, elapsed, duration }: ScreenProps) {
  const rng = createRng(seed);
  // One breath every two simulated minutes: in, then out.
  const inhale = Math.floor(elapsed / 2) % 2 === 0;
  const size = inhale ? 250 : 170;
  const streak = rng.int(3, 41);
  return (
    <div className={styles.screen}>
      <div className={styles.top}><Icon name="close" size={20} stroke={2.2} /><span>Wind Down</span><span>{Math.max(0, duration - elapsed)} min</span></div>
      <div className={styles.breath} style={{ width: size, height: size, marginLeft: -size / 2, marginTop: (250 - size) / 2 }} />
      <div className={styles.cue}>{inhale ? "Breathe in" : "Breathe out"}</div>
      <div className={styles.cueSub}>Let the day go</div>
      <div className={styles.days}>Day {streak} of your sleep streak</div>
      <div className={styles.dim} style={{ opacity: dimFor(elapsed, duration) }} />
    </div>
  );
}

export function DriftScreen(props: ScreenProps) {
  return props.view === "wind-down" ? <WindDown {...props} /> : <Sounds {...props} />;
}

const drift: CloneDefinition = {
  Screen: DriftScreen,
  tone: () => "light",
  fixtures: [
    { view: "sounds", label: "sleep sounds at bedtime", clock: 23 * 60 + 25, duration: 40 },
    { view: "wind-down", label: "wind-down breathing", clock: 22 * 60 + 50, duration: 12 },
  ],
};

export default drift;
