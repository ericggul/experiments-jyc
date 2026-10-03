import { Icon, Storyboard, ios, type IconName, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash, type Rng } from "../../model/rng";
import { formatTime, weekdayShort } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./baby.module.css";

/* ------------------------------------------------------------------ content */

const babies = ["Noa", "Theo", "Ada", "Milo", "June", "Eli", "Iris", "Leo", "Nia", "Otis", "Rumi", "Zara", "Abe", "Cleo", "Ezra", "Lucia", "Remy", "Wren", "Kai", "Sage"];
type Kind = "feed" | "sleep" | "diaper" | "pump" | "meds" | "play";
const kinds: Record<Kind, { label: string; icon: IconName; hue: string }> = {
  feed: { label: "Feed", icon: "fork", hue: "#f2994a" },
  sleep: { label: "Sleep", icon: "moon", hue: "#5e5ce6" },
  diaper: { label: "Diaper", icon: "tag", hue: "#34a853" },
  pump: { label: "Pump", icon: "bolt", hue: "#e5578e" },
  meds: { label: "Meds", icon: "plus", hue: "#0a84ff" },
  play: { label: "Tummy time", icon: "sun", hue: "#d4a017" },
};
const quickKinds: readonly Kind[] = ["feed", "diaper", "sleep"];
const hm = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(Math.max(0, Math.round(minutes)) % 60).padStart(2, "0")}m`;

type Entry = { id: string; kind: Kind; at: number; note: string };

function noteFor(rng: Rng, kind: Kind): string {
  switch (kind) {
    case "feed": return rng.chance(0.5) ? `${rng.int(2, 6)}${rng.chance(0.5) ? ".5" : ""} oz ${rng.pick(["formula", "breast milk", "bottle"])}` : `Nursed ${rng.pick(["L", "R", "L + R"])} · ${rng.int(7, 24)} min`;
    case "sleep": return `${rng.pick(["Nap", "Crib nap", "Stroller nap", "Contact nap"])}, ${hm(rng.int(25, 120))}`;
    case "diaper": return rng.pick(["Wet", "Dirty", "Wet + dirty", "Wet, rash cream", "Dry check"]);
    case "pump": return `${rng.int(2, 7)} oz · ${rng.int(10, 25)} min`;
    case "meds": return rng.pick(["Vitamin D drops", "Gas drops", "Infant acetaminophen 1.25 mL", "Probiotic"]);
    case "play": return `${rng.int(4, 15)} min · ${rng.pick(["on the mat", "on Dad", "on Mom", "with the mirror"])}`;
  }
}

/* ------------------------------------------------------------------ tracker */

type TrackerModel = { name: string; age: number; weight: string; states: Entry[][]; actions: Kind[]; feedNotes: string[]; shots: Shot[]; total: number };

/** Quick-action row centre and the sheet's Save button (pt on the glass). */
const QUICK_Y = 322;
const SAVE_Y = 590;

function trackerPlan({ seed, owner, clock, duration }: ScreenProps): TrackerModel {
  const rng = createRng(hash(seed, owner.seed, "baby-tracker"));
  const name = babies[(seed + owner.seed) % babies.length];
  const age = rng.int(1, 11);
  const weight = `${8 + age + rng.int(0, 3)} lb ${rng.int(0, 15)} oz`;
  // History before the scene.
  const history: Entry[] = [];
  let at = clock - rng.int(30, 160);
  for (let i = 0; i < 9; i++) {
    const kind = i === 0 ? "feed" : rng.weighted<Kind>([["feed", 4], ["sleep", 3], ["diaper", 4], ["pump", 1], ["meds", 1], ["play", 1]]);
    history.push({ id: `h${i}`, kind, at, note: noteFor(rng, kind) });
    at -= rng.int(25, 110);
  }
  // What the parent logs in this burst, in order.
  const total = Math.max(4, duration);
  const actions: Kind[] = [];
  const pool: Kind[] = ["feed", "diaper", "sleep", "diaper", "feed", "meds", "play"];
  let start = rng.int(0, pool.length - 1);
  const count = Math.min(3, Math.max(1, Math.floor(total / 3.2)));
  while (actions.length < count) actions.push(pool[start++ % pool.length]);
  const states: Entry[][] = [history];
  actions.forEach((kind, index) => {
    const entry: Entry = { id: `n${index}`, kind, at: clock - duration + 2 + index * 3, note: noteFor(rng, kind) };
    states.push([entry, ...states[states.length - 1]].slice(0, 9));
  });
  let scroll = rng.int(40, 150);
  const shots: Shot[] = [{ panel: "home-0", at: 0, scroll, flicks: 2, enter: "cut" }];
  let t = 0;
  const step = () => (t += rng.range(1.3, 1.8));
  actions.forEach((kind, index) => {
    const slot = quickKinds.indexOf(kind);
    step();
    // Scroll back up and tap the quick action (or "+" for the rest).
    shots.push({ panel: `sheet-${index}`, at: t, enter: "sheet", tap: slot >= 0 ? { x: 70 + slot * 125, y: Math.max(110, QUICK_Y - scroll) } : { x: 360, y: Math.max(60, 76 - scroll) } });
    step();
    shots.push({ panel: `sheet-${index}`, at: t, scroll: 0, tap: { x: 120 + rng.int(0, 150), y: 300 + rng.int(0, 120) } });
    step();
    scroll = rng.int(0, 120);
    shots.push({ panel: `home-${index + 1}`, at: t, enter: "dismiss", scroll, flicks: 1, tap: { x: 195, y: SAVE_Y } });
  });
  while (t < total) {
    step();
    shots.push({ panel: "trends", at: t, enter: "push", scroll: rng.int(140, 320), flicks: 2, tap: { x: 300, y: 790 } });
    step();
    shots.push({ panel: `home-${actions.length}`, at: t, enter: "pop", scroll: rng.int(100, 260), flicks: 2, tap: { x: 28, y: 76 } });
  }
  const feedNotes = actions.map(() => noteFor(rng, "feed"));
  return { name, age, weight, states, actions, feedNotes, shots, total };
}

function TrackerHome({ model, entries, clock }: { model: TrackerModel; entries: readonly Entry[]; clock: number }) {
  const lastFeed = entries.find((entry) => entry.kind === "feed");
  const since = lastFeed ? Math.max(0, clock - lastFeed.at) : 0;
  const counts = (kind: Kind) => entries.filter((entry) => entry.kind === kind).length;
  return (
    <>
      <div className={styles.head}>
        <div className={styles.bar}><span>Family</span><Icon name="plus" size={22} stroke={2.2} /></div>
        <div className={styles.who}>
          <span className={styles.face}>{model.name[0]}</span>
          <div><b>{model.name}</b><small>{model.age} months · {model.weight}</small></div>
        </div>
        <div className={styles.timer}>
          <small>Since last feed</small>
          <div className={styles.clock}>{Math.floor(since / 60)}<span>h </span>{String(since % 60).padStart(2, "0")}<span>m</span></div>
          <p>{lastFeed ? `Last fed ${formatTime(lastFeed.at)} · ${lastFeed.note}` : ""}</p>
        </div>
        <div className={styles.quick}>
          {quickKinds.map((kind) => (
            <div key={kind} className={styles.q}><span style={{ background: kinds[kind].hue }}><Icon name={kinds[kind].icon} size={21} stroke={1.9} /></span>{kinds[kind].label}</div>
          ))}
        </div>
        <div className={styles.sums}><span>Today</span><span>{counts("feed") + 3} feeds · {counts("diaper") + 2} diapers</span></div>
      </div>
      <div className={styles.log}>
        {entries.map((entry) => (
          <div key={entry.id} className={styles.event}>
            <span className={styles.dot} style={{ background: kinds[entry.kind].hue }}><Icon name={kinds[entry.kind].icon} size={16} stroke={2} /></span>
            <div>{kinds[entry.kind].label}<small>{entry.note}</small></div>
            <span className={styles.when}>{formatTime(entry.at)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const sheetOptions: Record<Kind, { title: string; groups: readonly (readonly string[])[] }> = {
  feed: { title: "Log feed", groups: [["Bottle", "Breast", "Solids"], ["2 oz", "3 oz", "4 oz", "5 oz", "6 oz"], ["Formula", "Breast milk"]] },
  diaper: { title: "Log diaper", groups: [["Wet", "Dirty", "Both", "Dry"], ["Yellow", "Green", "Brown"], ["Rash cream", "No rash"]] },
  sleep: { title: "Start sleep", groups: [["Nap", "Night"], ["Crib", "Stroller", "Contact", "Car"], ["Fell asleep easily", "Fussy"]] },
  pump: { title: "Log pump", groups: [["Left", "Right", "Both"], ["2 oz", "3 oz", "4 oz", "5 oz"]] },
  meds: { title: "Log medicine", groups: [["Vitamin D", "Gas drops", "Acetaminophen", "Probiotic"], ["0.5 mL", "1 mL", "1.25 mL"]] },
  play: { title: "Tummy time", groups: [["5 min", "10 min", "15 min"], ["Mat", "On a parent", "Mirror"]] },
};

function LogSheet({ kind, seed, clock }: { kind: Kind; seed: number; clock: number }) {
  const options = sheetOptions[kind];
  return (
    <div className={styles.sheet}>
      <div className={styles.grabber} />
      <div className={styles.sheetBar}><span>Cancel</span><b>{options.title}</b><span>Save</span></div>
      <div className={styles.sheetTime}><span>Time</span><b>{formatTime(clock)}</b></div>
      {options.groups.map((group, g) => (
        <div key={g} className={styles.chips}>
          {group.map((option, i) => <span key={i} data-on={(seed + g) % group.length === i}>{option}</span>)}
        </div>
      ))}
      <div className={styles.sheetNote}>Add a note</div>
      <div className={styles.save}>Save</div>
    </div>
  );
}

const weekLetters = ["M", "T", "W", "T", "F", "S", "S"];

function Trends({ seed, model }: { seed: number; model: TrackerModel }) {
  const rng = createRng(hash(seed, "trends"));
  const rows = [
    { id: "feeds", label: "Feeds per day", unit: "", max: 12, values: Array.from({ length: 7 }, () => rng.int(6, 11)) },
    { id: "sleep", label: "Sleep (hours)", unit: "h", max: 17, values: Array.from({ length: 7 }, () => rng.int(11, 16)) },
    { id: "oz", label: "Ounces", unit: " oz", max: 36, values: Array.from({ length: 7 }, () => rng.int(18, 34)) },
  ];
  return (
    <div className={styles.trends}>
      <div className={styles.bar}><span><Icon name="chevronLeft" size={22} stroke={2.4} /></span><b>{model.name}&apos;s week</b><span /></div>
      {rows.map((row) => (
        <div key={row.id} className={styles.chartCard}>
          <small>{row.label}</small>
          <b>{Math.round(row.values.reduce((a, b) => a + b, 0) / 7)}{row.unit} avg</b>
          <div className={styles.chart}>
            {row.values.map((value, i) => <i key={i} style={{ height: `${(value / row.max) * 100}%` }} data-today={i === 6} />)}
          </div>
          <div className={styles.days}>{weekLetters.map((day, i) => <span key={i}>{day}</span>)}</div>
        </div>
      ))}
    </div>
  );
}

function trackerSession(props: ScreenProps, model: TrackerModel): Session {
  const panels: Record<string, Panel> = {};
  model.states.forEach((entries, index) => {
    panels[`home-${index}`] = { body: <TrackerHome model={model} entries={entries} clock={props.clock + index * 3} />, className: styles.grouped };
  });
  model.actions.forEach((kind, index) => {
    panels[`sheet-${index}`] = { body: <LogSheet kind={kind} seed={props.seed + index} clock={props.clock + index * 3} />, className: styles.sheetPanel };
  });
  panels.trends = { body: <Trends seed={props.seed} model={model} />, className: styles.grouped };
  return { duration: model.total, shots: model.shots, panels };
}

function Tracker(props: ScreenProps) {
  const model = trackerPlan(props);
  return (
    <div className={styles.root}>
      <Storyboard id={`tracker:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => trackerSession(props, model)} />
    </div>
  );
}

/* ------------------------------------------------------------------ monitor */

const lullabies = ["Soft Piano", "Ocean Hush", "Heartbeat", "Rainy Window", "Music Box Waltz", "Shushing", "Hair Dryer Hum", "Brahms, Slowly", "Lake at Night", "Pink Noise"];

type MonitorModel = { shots: Shot[]; total: number; crySpans: [number, number][]; temp: number; humidity: number; track: number; quiet: boolean };

function monitorPlan({ seed, duration }: ScreenProps): MonitorModel {
  const rng = createRng(hash(seed, "baby-monitor"));
  const total = Math.max(4, duration);
  const quiet = rng.chance(0.5);
  const crySpans: [number, number][] = [];
  const shots: Shot[] = [{ panel: "cam", at: 0, enter: "cut" }];
  let t = 0;
  let track = rng.int(0, lullabies.length - 1);
  while (t < total) {
    t += rng.range(1.6, 2.6);
    if (!quiet && crySpans.length < 2 && rng.chance(0.5)) crySpans.push([t, t + rng.range(1.5, 3)]);
    const move = rng.weighted([["history", 3], ["lullaby", 2], ["zoom", 2]] as const);
    if (move === "history") {
      shots.push({ panel: "history", at: t, enter: "sheet", scroll: rng.int(80, 260), flicks: 2, tap: { x: 100, y: 590 } });
    } else if (move === "lullaby") {
      track = (track + rng.int(1, 3)) % lullabies.length;
      shots.push({ panel: "lullaby", at: t, enter: "sheet", tap: { x: 350, y: 735 } });
      t += rng.range(1.3, 1.8);
      shots.push({ panel: "lullaby", at: t, scroll: Math.max(0, (track - 5) * 56), tap: { x: 195, y: 260 + Math.min(track, 5) * 56 } });
    } else {
      shots.push({ panel: "zoom", at: t, enter: "fade", tap: { x: 195, y: 300 } });
    }
    t += rng.range(1.3, 2);
    shots.push({ panel: "cam", at: t, enter: move === "zoom" ? "fade" : "dismiss" });
  }
  return { shots, total, crySpans, temp: 68 + rng.int(0, 4) + rng.int(0, 9) / 10, humidity: rng.int(36, 48), track, quiet };
}

function Crib({ zoom }: { zoom: boolean }) {
  return (
    <div className={styles.feed} data-zoom={zoom}>
      <div className={styles.mobile}><i style={{ left: 8 }} /><i style={{ left: 44 }} /><i style={{ left: 80 }} /></div>
      <div className={styles.rails} />
      <div className={styles.mattress} />
      <div className={styles.blanket} />
      <div className={styles.head2} />
    </div>
  );
}

function History({ seed, clock }: { seed: number; clock: number }) {
  const rng = createRng(hash(seed, "history"));
  const events = Array.from({ length: 9 }, (_, i) => ({
    id: i,
    kind: rng.pick(["Sound detected", "Motion detected", "Crying, 2 min", "Room cooled to 68°F", "Stirring", "Breathing motion normal"]),
    at: clock - (i + 1) * rng.int(14, 40),
  }));
  const levels = Array.from({ length: 30 }, () => rng.next());
  return (
    <div className={styles.historyBody}>
      <div className={styles.grabber} />
      <b className={styles.historyTitle}>Tonight</b>
      <div className={styles.timeline}>{levels.map((level, i) => <i key={i} data-hot={level > 0.82} style={{ height: `${8 + level * 92}%` }} />)}</div>
      {events.map((event) => (
        <div key={event.id} className={styles.historyRow}><span>{event.kind}</span><small>{formatTime(event.at)}</small></div>
      ))}
    </div>
  );
}

function Lullabies({ selected }: { selected: number }) {
  return (
    <div className={styles.historyBody}>
      <div className={styles.grabber} />
      <b className={styles.historyTitle}>Soothe</b>
      {lullabies.map((name, i) => (
        <div key={name} className={styles.track} data-on={i === selected}>
          <span><Icon name={i === selected ? "play" : "note"} size={16} stroke={1.8} filled={i === selected} /></span>
          {name}
          <small>{15 + (i % 4) * 15} min</small>
        </div>
      ))}
    </div>
  );
}

function monitorSession(props: ScreenProps, model: MonitorModel): Session {
  const panels: Record<string, Panel> = {
    cam: { className: styles.camPanel, body: <Crib zoom={false} /> },
    zoom: { className: styles.camPanel, body: <Crib zoom /> },
    history: { className: `${styles.sheetPanel} ${styles.darkSheet}`, top: 120, body: <History seed={props.seed} clock={props.clock} /> },
    lullaby: { className: `${styles.sheetPanel} ${styles.darkSheet}`, top: 120, body: <Lullabies selected={model.track} /> },
  };
  return { duration: model.total, shots: model.shots, panels };
}

/** Live readings drawn over the camera, re-rendered every tick. */
function Readings({ props, model }: { props: ScreenProps; model: MonitorModel }) {
  const { seed, elapsed, clock, weekday } = props;
  const crying = model.crySpans.some(([from, to]) => elapsed >= from && elapsed < to);
  const levels = Array.from({ length: 18 }, (_, i) => {
    const raw = (hash(seed, elapsed, i) % 100) / 100;
    return Math.round((crying ? 0.45 + raw * 0.55 : model.quiet ? 0.08 + raw * 0.2 : 0.12 + raw * 0.45) * 44);
  });
  const temp = (model.temp + Math.sin((elapsed + seed) / 3) * 0.3).toFixed(1);
  return (
    <>
      <div className={styles.overlay}><span className={styles.live}><i />Nursery</span><span>{crying ? "Crying" : "Night vision"}</span></div>
      <div className={styles.stamp}>{weekdayShort[weekday]} {formatTime(clock)}</div>
      {crying && <div className={styles.alert}><Icon name="bell" size={16} stroke={2} />Crying detected</div>}
      <div className={styles.panel}>
        <div className={styles.cols}>
          <div className={styles.tile}><small>Sound</small><div className={styles.bars}>{levels.map((height, i) => <i key={i} data-hot={height > 30} style={{ height }} />)}</div></div>
          <div className={styles.tile}><small>Temperature</small><b>{temp}°F</b><small style={{ textTransform: "none" }}>Humidity {model.humidity + (elapsed % 3)}%</small></div>
        </div>
        <div className={styles.soothe}><div>{lullabies[model.track]}<small>Playing · off in {Math.max(5, 30 - elapsed)} min</small></div><span><Icon name="play" size={16} filled stroke={0} /></span></div>
      </div>
    </>
  );
}

function Monitor(props: ScreenProps) {
  const model = monitorPlan(props);
  return (
    <div className={`${styles.night} ${ios.dark}`}>
      <Storyboard
        id={`monitor:${props.seed}:${props.duration}`}
        elapsed={props.elapsed}
        build={() => monitorSession(props, model)}
        live={(panel) => (panel === "cam" || panel === "zoom" ? <Readings props={props} model={model} /> : null)}
      />
    </div>
  );
}

export function LittleScreen(props: ScreenProps) {
  return props.view === "monitor" ? <Monitor {...props} /> : <Tracker {...props} />;
}

const little: CloneDefinition = {
  Screen: LittleScreen,
  tone: (view) => (view === "monitor" ? "light" : "dark"),
  fixtures: [
    { view: "tracker", label: "mid-morning feed", seed: 2, clock: 10 * 60 + 12, duration: 5 },
    { view: "tracker", label: "afternoon check", seed: 5, clock: 15 * 60 + 40, duration: 4 },
    { view: "tracker", label: "quick log", seed: 9, clock: 6 * 60 + 5, duration: 2 },
    { view: "monitor", label: "quiet night", seed: 1, clock: 2 * 60 + 14, duration: 6 },
    { view: "monitor", label: "stirring", seed: 3, clock: 4 * 60 + 52, duration: 12 },
  ],
};

export default little;
