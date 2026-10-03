import { Icon, Storyboard, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash, type Rng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./drift.module.css";

/* ------------------------------------------------------------------ content */

const sources = ["Rain", "Thunder", "Waves", "Wind", "Box Fan", "Crickets", "Fireplace", "Night Train", "Brown Noise", "Pink Noise", "Creek", "Snowfall", "Radiator", "Ferry Horn"];
const settings = ["on a Tin Roof", "at Montauk", "in the Catskills", "over the Hudson", "in a Cabin", "on Low", "at 3 AM", "Through a Window", "in Prospect Park", "on the Fire Escape"];
const stories = ["The Lighthouse Keeper", "Night Train to Albany", "A Slow Walk Upstate", "The Quiet Bakery", "Snow on Canal Street", "The Last Ferry", "Grandpa's Garden", "Stars over Fire Island"];
const categories = ["For you", "Rain", "Noise", "Nature", "Stories", "Music", "City"];
const kindsOf = ["Nature · Sleep", "Noise · Deep Sleep", "Sleep Story", "Ambient · Focus & Sleep", "Soundscape"];
const timers = ["15 min", "30 min", "45 min", "1 hour", "90 min", "Until morning"];
const timerMinutes = [15, 30, 45, 60, 90, 480];
const layers = ["Rain", "Distant thunder", "Box fan", "Crickets", "Ocean", "Fireplace", "Wind chimes"];
const hues = [
  ["#5b5bd6", "#2e2a7a"], ["#3a7bd5", "#1c2f5a"], ["#6a4c93", "#241a3d"], ["#2d8f85", "#123b38"], ["#b0576f", "#3c1a28"],
  ["#4b6cb7", "#182848"], ["#8e6bbf", "#2a1f4a"], ["#2f7a9a", "#0f2a36"],
] as const;

type Sound = { id: string; title: string; kind: string; length: string; hue: readonly [string, string] };

function makeSounds(rng: Rng, count: number): Sound[] {
  const out: Sound[] = [];
  const seen = new Set<string>();
  while (out.length < count) {
    const story = rng.chance(0.2);
    const title = story ? rng.pick(stories) : `${rng.pick(sources)} ${rng.pick(settings)}`;
    if (seen.has(title)) continue;
    seen.add(title);
    out.push({
      id: `s${out.length}`,
      title,
      kind: story ? "Sleep Story" : rng.pick(kindsOf.filter((kind) => kind !== "Sleep Story")),
      length: story ? `${rng.int(18, 48)} min` : "Loop",
      hue: rng.pick(hues),
    });
  }
  return out;
}

const art = (sound: Sound) => `radial-gradient(circle at 30% 25%, ${sound.hue[0]} 0%, ${sound.hue[1]} 55%, #0d0b26 100%)`;

/** The screen dims once the person settles, as if the phone fades to sleep. */
const dimFor = (elapsed: number, settle: number, total: number) => (elapsed < settle ? 0 : Math.min(0.7, ((elapsed - settle) / Math.max(1, total - settle)) * 0.7));

/* ------------------------------------------------------------------- sounds */

type SoundsModel = { sounds: Sound[]; picks: number[]; timer: number; mix: number[]; shots: Shot[]; total: number; settle: number; starts: number[] };

const TILE_H = 196;
const GRID_TOP = 54 + 44 + 46 + 52;

function soundsPlan({ seed, owner, duration }: ScreenProps): SoundsModel {
  const rng = createRng(hash(seed, owner.seed, "drift-sounds"));
  const sounds = makeSounds(rng, 12);
  const total = Math.max(4, duration);
  const shots: Shot[] = [];
  const picks: number[] = [];
  const starts: number[] = [];
  let t = 0;
  const step = () => (t += rng.range(1.3, 1.9));
  let scroll = rng.int(120, 300);
  shots.push({ panel: "library", at: 0, scroll, flicks: 2, enter: "cut" });
  step();
  scroll = rng.int(160, 420);
  shots.push({ panel: "library", at: t, scroll, flicks: 2, tap: { x: 80 + rng.int(0, 3) * 70, y: 168 } });
  const timer = rng.int(1, 5);
  for (let round = 0; round < 2 && t < total; round++) {
    // Tap a tile in view, then play it.
    const row = Math.floor((scroll + 120) / TILE_H);
    const col = rng.int(0, 1);
    const pick = Math.min(sounds.length - 1, row * 2 + col);
    picks.push(pick);
    step();
    starts.push(t);
    shots.push({ panel: `player-${round}`, at: t, enter: "push", tap: { x: col ? 290 : 100, y: GRID_TOP + row * TILE_H + 80 - scroll } });
    step();
    const sheet = round === 0 ? "timer" : "mix";
    shots.push({ panel: sheet, at: t, enter: "sheet", tap: round === 0 ? { x: 300, y: 690 } : { x: 90, y: 690 } });
    step();
    shots.push({ panel: `player-${round}`, at: t, enter: "dismiss", tap: round === 0 ? { x: 195, y: 330 + timer * 54 } : { x: 330, y: 160 } });
    if (round === 0 && total > 9) {
      step();
      shots.push({ panel: "library", at: t, enter: "pop", tap: { x: 32, y: 76 } });
      step();
      scroll = Math.min(520, scroll + rng.int(120, 300));
      shots.push({ panel: "library", at: t, scroll, flicks: 2 });
    } else break;
  }
  const settle = t + 1;
  return { sounds, picks, timer, mix: layers.map(() => rng.next()), shots, total, settle, starts };
}

function Library({ model }: { model: SoundsModel }) {
  return (
    <div className={styles.library}>
      <div className={styles.libraryHead}><b>Sleep</b><Icon name="search" size={22} stroke={2} /></div>
      <div className={styles.chips}>{categories.map((name, i) => <span key={name} data-on={i === 0}>{name}</span>)}</div>
      <div className={styles.tiles}>
        {model.sounds.map((sound) => (
          <div key={sound.id} className={styles.tile}>
            <span style={{ background: art(sound) }} />
            <b>{sound.title}</b>
            <small>{sound.kind}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

const WAVE_BARS = Array.from({ length: 28 }, (_, i) => i);

function Player({ sound, seed }: { sound: Sound; seed: number }) {
  const rng = createRng(hash(seed, sound.id));
  return (
    <>
      <div className={styles.top}><Icon name="chevronDown" size={22} stroke={2.2} /><span>Now playing</span><Icon name="more" size={22} stroke={3} /></div>
      <div className={styles.art} style={{ background: art(sound) }} />
      <div className={styles.title}>{sound.title}</div>
      <div className={styles.subtitle}>{sound.kind} · {sound.length}</div>
      <div className={styles.wave} aria-hidden="true">{WAVE_BARS.map((bar) => <span key={bar} style={{ height: 8 + rng.next() * 32 }} />)}</div>
      <div className={styles.controls}>
        <Icon name="moon" size={26} stroke={1.8} />
        <span className={styles.play}><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg></span>
        <Icon name="clock" size={26} stroke={1.8} />
      </div>
    </>
  );
}

function TimerSheet({ selected }: { selected: number }) {
  return (
    <div className={styles.sheet}>
      <div className={styles.grabber} />
      <b className={styles.sheetTitle}>Sleep timer</b>
      {timers.map((label, i) => <div key={label} className={styles.option}>{label}{i === selected && <Icon name="check" size={20} stroke={2.4} />}</div>)}
    </div>
  );
}

function MixSheet({ mix }: { mix: readonly number[] }) {
  return (
    <div className={styles.sheet}>
      <div className={styles.grabber} />
      <b className={styles.sheetTitle}>Mix</b>
      {layers.map((label, i) => (
        <div key={label} className={styles.layer}><span>{label}</span><i><b style={{ width: `${Math.round(mix[i] * 100)}%` }} /></i></div>
      ))}
    </div>
  );
}

function soundsSession(props: ScreenProps, model: SoundsModel): Session {
  const panels: Record<string, Panel> = {
    library: { className: styles.night, body: <Library model={model} /> },
    timer: { className: styles.sheetPanel, top: 120, body: <TimerSheet selected={model.timer} /> },
    mix: { className: styles.sheetPanel, top: 120, body: <MixSheet mix={model.mix} /> },
  };
  model.picks.forEach((pick, round) => {
    panels[`player-${round}`] = { className: styles.night, body: <Player sound={model.sounds[pick]} seed={props.seed} /> };
  });
  return { duration: model.total, shots: model.shots, panels };
}

/** Elapsed time, countdown and dimming for the player, re-rendered every tick. */
function PlayerLive({ model, elapsed, panel }: { model: SoundsModel; elapsed: number; panel: string }) {
  const dim = <div className={styles.dim} style={{ opacity: dimFor(elapsed, model.settle, model.total) }} />;
  if (!panel.startsWith("player-")) return dim;
  const round = Number(panel.slice(7));
  const played = Math.max(0, elapsed - (model.starts[round] ?? 0));
  const limit = timerMinutes[model.timer];
  const left = Math.max(0, limit - played);
  const label = limit >= 480 ? "Until morning" : `Stops in ${Math.ceil(left)} min`;
  return (
    <>
      <div className={styles.timer}><span>{Math.floor(played)}:{String(Math.floor((played % 1) * 60)).padStart(2, "0")}</span><span>{label}</span></div>
      <div className={styles.bar}><span style={{ width: `${Math.min(100, (played / Math.min(limit, 120)) * 100)}%` }} /></div>
      {dim}
    </>
  );
}

function Sounds(props: ScreenProps) {
  const model = soundsPlan(props);
  return (
    <div className={styles.screen}>
      <Storyboard
        id={`sounds:${props.seed}:${props.duration}`}
        elapsed={props.elapsed}
        build={() => soundsSession(props, model)}
        live={(panel) => <PlayerLive model={model} elapsed={props.elapsed} panel={panel} />}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- wind-down */

const poses = [
  ["Child's pose", "Knees wide, forehead down"], ["Legs up the wall", "Let your feet get heavy"], ["Seated forward fold", "Soft knees, long spine"],
  ["Supine twist", "Knees to the left, gaze right"], ["Neck rolls", "Slow circles, both ways"], ["Butterfly", "Soles together, breathe into the hips"],
  ["Cat and cow", "Move with each breath"], ["Figure four", "Ankle over knee, ease back"], ["Shoulder release", "Arms cross, hug and hold"],
  ["Happy baby", "Rock gently side to side"],
] as const;
const gratitude = [
  "Coffee with {friend} before work", "The light on the walk home through {home}", "A seat on the train the whole way", "Finished the thing I kept putting off",
  "Dinner that actually turned out", "{friend} called just to say hi", "Left {work} on time", "A long hot shower", "Found a new bakery near {home}",
  "Laughed hard at lunch", "The park was quiet this morning", "Got the window seat",
];
const friends = ["Maya", "Dev", "Rosa", "Sam", "Nina", "Theo", "Priya", "Marcus", "Lena", "Omar"];
const steps = ["Breathe", "Three good things", "Stretch", "Lights out"];

type WindModel = { poses: number[]; lines: string[]; shots: Shot[]; total: number; settle: number; breath: [number, number]; streak: number };

function fillLine(template: string, rng: Rng, owner: Owner) {
  return template.replace("{friend}", rng.pick(friends)).replace("{home}", owner.home).replace("{work}", owner.work === "Home" ? "the desk" : owner.work);
}

function windPlan({ seed, owner, duration }: ScreenProps): WindModel {
  const rng = createRng(hash(seed, owner.seed, "drift-wind"));
  const total = Math.max(4, duration);
  const pool = Array.from({ length: poses.length }, (_, i) => i);
  const picked: number[] = [];
  while (picked.length < 3) picked.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  const lines: string[] = [];
  while (lines.length < 5) {
    const line = fillLine(rng.pick(gratitude), rng, owner);
    if (!lines.includes(line)) lines.push(line);
  }
  const shots: Shot[] = [{ panel: "routine", at: 0, scroll: rng.int(0, 60), enter: "cut" }];
  let t = 0;
  const step = (min = 1.3, max = 1.9) => (t += rng.range(min, max));
  step();
  shots.push({ panel: "breathe", at: t, enter: "push", tap: { x: 195, y: 700 } });
  const breathStart = t;
  step(2, 2.4);
  shots.push({ panel: "breathe", at: t, tap: { x: 195, y: 360 } });
  step(1.8, 2.4);
  const breath: [number, number] = [breathStart, t];
  shots.push({ panel: "journal", at: t, enter: "push", tap: { x: 330, y: 780 } });
  step();
  shots.push({ panel: "journal", at: t, tap: { x: 160, y: 300 + rng.int(0, 4) * 58 } });
  picked.forEach((_, i) => {
    step();
    shots.push({ panel: `pose-${i}`, at: t, enter: "push", tap: { x: 330, y: 780 } });
  });
  step();
  shots.push({ panel: "done", at: t, enter: "fade", tap: { x: 195, y: 780 } });
  return { poses: picked, lines, shots, total, settle: t + 1, breath, streak: rng.int(3, 41) };
}

function Routine({ owner, clock }: { owner: Owner; clock: number }) {
  return (
    <div className={styles.routine}>
      <div className={styles.libraryHead}><b>Wind down</b><Icon name="more" size={22} stroke={3} /></div>
      <p className={styles.lede}>Tonight, {owner.firstName}. Lights out by {formatTime(clock + 30)}.</p>
      {steps.map((label, i) => (
        <div key={label} className={styles.stepRow}><span>{i + 1}</span><b>{label}</b><small>{[4, 3, 5, 1][i]} min</small></div>
      ))}
      <div className={styles.cta}>Start</div>
    </div>
  );
}

function Journal({ lines }: { lines: readonly string[] }) {
  return (
    <div className={styles.routine}>
      <div className={styles.top} style={{ position: "relative", top: 0, left: 0, right: 0 }}><Icon name="chevronLeft" size={22} stroke={2.2} /><span>2 of 4</span><span /></div>
      <h2 className={styles.prompt}>Three good things about today</h2>
      {lines.map((line, i) => <p key={i} className={styles.entry}>{line}</p>)}
      <div className={styles.cta}>Next</div>
    </div>
  );
}

function Pose({ index, step }: { index: number; step: number }) {
  const [name, cue] = poses[index];
  return (
    <div className={styles.routine}>
      <div className={styles.top} style={{ position: "relative", top: 0, left: 0, right: 0 }}><Icon name="chevronLeft" size={22} stroke={2.2} /><span>Stretch {step + 1} of 3</span><span /></div>
      <div className={styles.poseArt} data-pose={index % 4} />
      <h2 className={styles.prompt}>{name}</h2>
      <p className={styles.lede}>{cue}</p>
      <div className={styles.cta}>Next</div>
    </div>
  );
}

function windSession(props: ScreenProps, model: WindModel): Session {
  const { owner, clock } = props;
  const panels: Record<string, Panel> = {
    routine: { className: styles.night, body: <Routine owner={owner} clock={clock} /> },
    breathe: { className: styles.night, body: <div className={styles.top}><Icon name="close" size={20} stroke={2.2} /><span>Breathe</span><span /></div> },
    journal: { className: styles.night, body: <Journal lines={model.lines} /> },
    done: {
      className: styles.night,
      body: (
        <div className={styles.routine} style={{ paddingTop: 260, textAlign: "center" }}>
          <Icon name="moon" size={44} stroke={1.6} />
          <h2 className={styles.prompt}>Goodnight, {owner.firstName}</h2>
          <p className={styles.lede}>{owner.alarm !== null ? `Alarm at ${formatTime(owner.alarm)}` : "No alarm tomorrow"} · Day {model.streak} of your streak</p>
        </div>
      ),
    },
  };
  model.poses.forEach((pose, i) => {
    panels[`pose-${i}`] = { className: styles.night, body: <Pose index={pose} step={i} /> };
  });
  return { duration: model.total, shots: model.shots, panels };
}

/** Breathing circle and dimming, re-rendered every tick. */
function WindLive({ model, elapsed, panel }: { model: WindModel; elapsed: number; panel: string }) {
  const dim = <div className={styles.dim} style={{ opacity: dimFor(elapsed, model.settle, model.total) }} />;
  if (panel !== "breathe") return dim;
  // One breath every two simulated minutes: a minute in, a minute out.
  const inhale = Math.floor(elapsed - model.breath[0]) % 2 === 0;
  const size = inhale ? 250 : 170;
  const count = Math.min(6, Math.floor((elapsed - model.breath[0]) / 2) + 1);
  return (
    <>
      <div className={styles.breath} style={{ width: size, height: size, marginLeft: -size / 2, marginTop: (250 - size) / 2 }} />
      <div className={styles.cue}>{inhale ? "Breathe in" : "Breathe out"}</div>
      <div className={styles.cueSub}>Breath {count} of 6</div>
      {dim}
    </>
  );
}

function WindDown(props: ScreenProps) {
  const model = windPlan(props);
  return (
    <div className={styles.screen}>
      <Storyboard
        id={`wind:${props.seed}:${props.duration}`}
        elapsed={props.elapsed}
        build={() => windSession(props, model)}
        live={(panel) => <WindLive model={model} elapsed={props.elapsed} panel={panel} />}
      />
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
    { view: "sounds", label: "quick pick", seed: 4, clock: 22 * 60 + 58, duration: 6 },
    { view: "wind-down", label: "wind-down breathing", clock: 22 * 60 + 50, duration: 12 },
  ],
};

export default drift;
