import { Icon } from "../../ios";
import { createRng } from "../../model/rng";
import { timeConfig } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./meeting.module.css";

const people = [
  "Maya Okafor", "Dev Patel", "Sam Rivera", "Lena Fischer", "Marcus Webb",
  "Priya Nair", "Tomás Herrera", "Aiko Tanaka", "Jordan Blake", "Chloe Bennett",
  "Andre Washington", "Rosa Delgado",
];
const meetings = ["Weekly sync", "Q4 planning", "Client check-in: Halvorsen", "Design review", "Sprint demo", "1:1 with manager", "Pipeline review"];
const gradients = [
  "linear-gradient(150deg, #5b6ee1, #2a3270)", "linear-gradient(150deg, #e0746b, #7a2d3c)",
  "linear-gradient(150deg, #3fb6a8, #17585a)", "linear-gradient(150deg, #d9a441, #7a4a1c)",
  "linear-gradient(150deg, #a064d8, #442a7a)", "linear-gradient(150deg, #5aa5d8, #1f4c78)",
];

const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");

function roster(seed: number, ownerName: string, count: number) {
  const rng = createRng(seed);
  const pool = [...people];
  const names: string[] = [];
  while (names.length < count - 1) names.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return [`${ownerName}`, ...names];
}

const mmss = (minutes: number, seed: number) => `${minutes}:${String((seed * 7) % 60).padStart(2, "0")}`;

function Tile({ name, index, speaking, muted, self }: { name: string; index: number; speaking: boolean; muted: boolean; self: boolean }) {
  return (
    <div className={styles.tile} style={{ background: gradients[index % gradients.length] }} data-speaking={speaking}>
      <span className={styles.avatar} style={{ background: "rgb(255 255 255 / 20%)" }}>{initials(name)}</span>
      <span className={styles.name}>{self ? "You" : name.split(" ")[0]}</span>
      {muted && <span className={styles.mic}><Icon name="micOff" size={12} stroke={2.2} /></span>}
    </div>
  );
}

function Joining({ seed, owner }: ScreenProps) {
  const rng = createRng(seed);
  const title = rng.pick(meetings);
  const name = `${owner.firstName} ${owner.lastName}`;
  return (
    <div className={styles.root}>
      <div className={styles.top}><Icon name="chevronDown" size={24} stroke={2.4} /><span /><span className={styles.pill}>Preview</span></div>
      <div className={styles.preview}>
        <span className={styles.avatar} style={{ width: 96, height: 96, fontSize: 34, background: "rgb(255 255 255 / 16%)" }}>{initials(name)}</span>
        <span className={styles.previewName}>{name}</span>
      </div>
      <div className={styles.toggles}>
        <span className={styles.toggle} data-off="true"><Icon name="micOff" size={24} /></span>
        <span className={styles.toggle}><Icon name="video" size={24} /></span>
        <span className={styles.toggle}><Icon name="note" size={24} /></span>
      </div>
      <div className={styles.meetTitle}>{title}<small>{rng.int(3, 9)} people in the room</small></div>
      <div className={styles.join}>Join</div>
    </div>
  );
}

function Grid({ seed, elapsed, owner }: ScreenProps) {
  const rng = createRng(seed);
  const count = 6;
  const names = roster(seed, `${owner.firstName} ${owner.lastName}`, count);
  const title = rng.pick(meetings);
  const speaker = 1 + createRng(seed + Math.floor(elapsed / timeConfig.beatMinutes)).int(0, count - 2);
  const minutes = 6 + elapsed;
  return (
    <div className={styles.root}>
      <div className={styles.top}>
        <span className={styles.pill}><Icon name="note" size={16} /></span>
        <span className={styles.title}>{title}<small>{mmss(minutes, seed)}</small></span>
        <span className={styles.pill}>{count + 3}</span>
      </div>
      <div className={styles.grid}>
        {names.map((name, i) => (
          <Tile key={name} name={name} index={i} self={i === 0} speaking={i === speaker} muted={i === 0 || (i + seed) % 3 === 0} />
        ))}
      </div>
      <div className={styles.muted}>You&rsquo;re muted</div>
      <div className={styles.bar}>
        <span className={styles.off}><Icon name="micOff" size={22} /></span>
        <span><Icon name="video" size={22} /></span>
        <span><Icon name="share" size={22} /></span>
        <span><Icon name="bubble" size={22} /></span>
        <span className={styles.end}><Icon name="phone" size={22} /></span>
      </div>
    </div>
  );
}

function Deck({ seed }: { seed: number }) {
  const rng = createRng(seed);
  const quarters = ["Q1", "Q2", "Q3", "Q4 fcst"];
  const values = quarters.map((_, i) => 38 + i * 9 + rng.int(-3, 6));
  return (
    <div className={styles.slide}>
      <h3>Q4 revenue outlook</h3>
      <p>Net new ARR by quarter, $M</p>
      <div className={styles.bars}>
        {values.map((v, i) => <span key={quarters[i]} style={{ height: `${v * 2.2}px` }}><i>{v}.{rng.int(0, 9)}</i></span>)}
      </div>
      <div className={styles.labels}>{quarters.map((q) => <span key={q}>{q}</span>)}</div>
    </div>
  );
}

function Sheet({ seed }: { seed: number }) {
  const rng = createRng(seed);
  const accounts = ["Halvorsen Freight", "Brightwater LLC", "Kestrel Foods", "Oakline Health", "Pemberton & Reed", "Vantage Labs", "Marlowe Retail", "Northgate Co", "Sable Energy", "Tidewell Group"];
  return (
    <table className={styles.sheet}>
      <thead><tr><th>Account</th><th>Stage</th><th>ARR ($K)</th><th>Close</th></tr></thead>
      <tbody>
        {accounts.map((account, i) => (
          <tr key={account}>
            <td>{account}</td>
            <td>{rng.pick(["Proposal", "Legal", "Verbal", "Discovery"])}</td>
            <td className={i === 3 ? `${styles.sel} ${styles.r}` : styles.r}>{rng.int(40, 480)}</td>
            <td className={styles.r}>Dec {rng.int(1, 28)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Speaker({ seed, elapsed, owner }: ScreenProps) {
  const names = roster(seed, `${owner.firstName} ${owner.lastName}`, 5);
  const presenter = names[1].split(" ")[0];
  const talking = 1 + createRng(seed + Math.floor(elapsed / timeConfig.beatMinutes)).int(0, 3);
  return (
    <div className={styles.root}>
      <div className={styles.top}>
        <span className={styles.pill}><Icon name="note" size={16} /></span>
        <span className={styles.title}>Sprint demo<small>{mmss(14 + elapsed, seed)}</small></span>
        <span className={styles.pill}>8</span>
      </div>
      <div className={styles.stage}>{seed % 2 === 0 ? <Deck seed={seed} /> : <Sheet seed={seed} />}</div>
      <div className={styles.sharing}>{presenter} is presenting</div>
      <div className={styles.film}>
        {names.slice(1).map((name, i) => (
          <Tile key={name} name={name} index={i + 1} self={false} speaking={i + 1 === talking} muted={i !== talking - 1} />
        ))}
      </div>
      <div className={styles.bar}>
        <span className={styles.off}><Icon name="micOff" size={22} /></span>
        <span><Icon name="video" size={22} /></span>
        <span><Icon name="share" size={22} /></span>
        <span><Icon name="bubble" size={22} /></span>
        <span className={styles.end}><Icon name="phone" size={22} /></span>
      </div>
    </div>
  );
}

export function MeetingScreen(props: ScreenProps) {
  if (props.view === "grid") return <Grid {...props} />;
  if (props.view === "speaker") return <Speaker {...props} />;
  return <Joining {...props} />;
}

const meeting: CloneDefinition = {
  Screen: MeetingScreen,
  tone: () => "light",
  fixtures: [
    { view: "joining", label: "one minute late", seed: 4, clock: 10 * 60 + 1, duration: 2 },
    { view: "grid", label: "weekly sync, muted", seed: 9, clock: 10 * 60 + 18, duration: 20 },
    { view: "speaker", label: "demo with deck", seed: 6, clock: 15 * 60 + 12, duration: 25 },
    { view: "speaker", label: "demo with sheet", seed: 7, clock: 16 * 60 + 5, duration: 20 },
  ],
};

export default meeting;
