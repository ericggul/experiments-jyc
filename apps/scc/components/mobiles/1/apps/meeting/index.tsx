import type { ReactNode } from "react";
import { Icon, Storyboard, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { chatLines, firstOf, gradients, initials, meetingOf, slideCost, slideOf, type Meeting, type Slide } from "./data";
import styles from "./meeting.module.css";

/** Long scenes play as consecutive sessions of this many simulated minutes. */
const CHUNK = 24;
/** Estimated DOM nodes a session may spend on panels (bench limit is 700). */
const BUDGET = 610;
/** Tiles drawn in the grid. */
const TILES = 6;

/** Tap targets on the 390 × 844 glass. */
const tapAt = {
  mic: { x: 49, y: 768 },
  hand: { x: 195, y: 768 },
  chat: { x: 268, y: 768 },
  people: { x: 350, y: 74 },
  previewMic: { x: 115, y: 537 },
  previewCam: { x: 195, y: 537 },
  join: { x: 195, y: 761 },
} as const;

type Spec =
  | { id: string; kind: "preview"; micOn: boolean }
  | { id: string; kind: "connecting" }
  | { id: string; kind: "grid"; speaker: number; hand: boolean }
  | { id: string; kind: "chat" }
  | { id: string; kind: "people" }
  | { id: string; kind: "slide"; index: number; talking: number };

type Plan = { duration: number; shots: Shot[]; specs: Map<string, Spec> };

type Ctx = { view: string; seed: number; part: number; duration: number; meeting: Meeting };

/** The whole session as data (no elements), so the live layer can follow it cheaply. */
function plan({ view, seed, part, duration, meeting }: Ctx): Plan {
  const rng = createRng(hash(seed, part, view, "plan"));
  const specs = new Map<string, Spec>();
  const shots: Shot[] = [];
  let budget = BUDGET;
  const add = (spec: Spec, cost: number) => {
    if (specs.has(spec.id)) return true;
    if (budget < cost) return false;
    budget -= cost;
    specs.set(spec.id, spec);
    return true;
  };
  const shot = (panel: string, at: number, extra: Omit<Shot, "panel" | "at"> = {}) => shots.push({ panel, at, ...extra });
  let t = 0;

  if (view === "speaker") {
    const deckStart = part * 6 + rng.int(0, 2);
    let slide = 0;
    let current = "";
    const showSlide = (index: number, at: number, extra: Omit<Shot, "panel" | "at"> = {}) => {
      const id = `slide-${index}`;
      const kind = slideOf(seed, deckStart + index, meeting).kind;
      const talking = rng.chance(0.6) ? 0 : rng.int(1, 3);
      if (!add({ id, kind: "slide", index: deckStart + index, talking }, slideCost[kind] + 40)) return false;
      shot(id, at, { enter: "cut", ...extra });
      current = id;
      return true;
    };
    showSlide(0, 0);
    let chats = 0;
    while (t < duration) {
      t += rng.range(1.4, 2.3);
      if (t >= duration) break;
      const spec = specs.get(current);
      const shownKind = spec?.kind === "slide" ? slideOf(seed, spec.index, meeting).kind : undefined;
      const scrollable = shownKind === "sheet" || shownKind === "doc";
      const action = rng.weighted([["next", 6], ["back", slide > 0 ? 1 : 0], ["chat", chats < 2 ? 1.2 : 0], ["scroll", scrollable ? 3 : 0]] as const);
      if (action === "scroll") {
        shot(current, t, { scroll: shownKind === "sheet" ? rng.int(40, 130) : rng.int(60, 250), flicks: rng.int(1, 2) });
      } else if (action === "chat" && add({ id: "chat", kind: "chat" }, 104)) {
        chats++;
        shot("chat", t, { enter: "sheet", tap: tapAt.chat, scroll: rng.int(120, 220) });
        t += rng.range(1.3, 1.8);
        shot("chat", t, { scroll: rng.int(300, 420) });
        t += rng.range(1.3, 1.8);
        shot(current, t, { enter: "dismiss", tap: { x: 360, y: 128 } });
      } else if (action === "back") {
        slide -= 1;
        const id = `slide-${slide}`;
        if (specs.has(id)) {
          shot(id, t, { enter: "cut" });
          current = id;
        }
      } else if (showSlide(slide + 1, t)) {
        slide += 1;
      } else {
        // Out of budget: the presenter flips back and forth through slides already shown.
        const shown = [...specs.values()].filter((s) => s.kind === "slide" && s.id !== current);
        if (shown.length) {
          current = rng.pick(shown).id;
          shot(current, t, { enter: "cut" });
        }
      }
    }
    return { duration, shots, specs };
  }

  if (view === "joining" && part === 0) {
    add({ id: "preview", kind: "preview", micOn: false }, 26);
    add({ id: "preview-on", kind: "preview", micOn: true }, 26);
    add({ id: "connecting", kind: "connecting" }, 18);
    shot("preview", 0, { enter: "cut" });
    if (duration >= 3) {
      shot("preview-on", 0.3, { enter: "cut", tap: tapAt.previewMic });
      t = 1.25;
    }
    shot("connecting", t + 0.3, { enter: "fade", tap: tapAt.join });
    t += 1.6;
  }

  // The room: the active speaker hops every one or two minutes.
  const others = Math.min(TILES, meeting.roster.length) - 1;
  let speaker = rng.int(1, others);
  const gridId = (who: number, hand = false) => `grid-${who}${hand ? "-hand" : ""}`;
  const showGrid = (who: number, at: number, extra: Omit<Shot, "panel" | "at"> = {}) => {
    let target = who;
    if (!add({ id: gridId(target, false), kind: "grid", speaker: target, hand: false }, 60)) {
      const shown = [...specs.values()].filter((s) => s.kind === "grid" && !s.hand);
      target = shown.length ? (rng.pick(shown) as { speaker: number }).speaker : target;
    }
    speaker = target;
    shot(gridId(target), at, { enter: "cut", ...extra });
  };
  showGrid(speaker, t, { enter: t === 0 ? "cut" : "fade" });
  let chats = 0;
  let peopleDone = false;
  let handDone = false;
  while (t < duration) {
    t += rng.range(1.3, 2.2);
    if (t >= duration) break;
    const action = rng.weighted([
      ["hop", 6],
      ["chat", chats < 2 ? 1.3 : 0],
      ["people", peopleDone ? 0 : 1],
      ["hand", handDone || duration - t < 6 ? 0 : 1],
    ] as const);
    const nextSpeaker = () => {
      const pick = rng.int(1, Math.max(1, others - 1));
      return pick >= speaker ? Math.min(others, pick + 1) : pick;
    };
    if (action === "chat" && add({ id: "chat", kind: "chat" }, 104)) {
      chats++;
      shot("chat", t, { enter: "sheet", tap: tapAt.chat, scroll: rng.int(120, 220) });
      t += rng.range(1.3, 1.8);
      shot("chat", t, { scroll: rng.int(300, 420) });
      t += rng.range(1.3, 1.8);
      showGrid(nextSpeaker(), t, { enter: "dismiss", tap: { x: 360, y: 128 } });
    } else if (action === "people" && add({ id: "people", kind: "people" }, 78)) {
      peopleDone = true;
      shot("people", t, { enter: "sheet", tap: tapAt.people });
      t += rng.range(1.5, 2.1);
      showGrid(speaker, t, { enter: "dismiss", tap: { x: 360, y: 128 } });
    } else if (action === "hand" && budget >= 124) {
      handDone = true;
      add({ id: gridId(speaker, true), kind: "grid", speaker, hand: true }, 62);
      shot(gridId(speaker, true), t, { enter: "cut", tap: tapAt.hand });
      // Called on: unmute and talk for a couple of minutes, then mute again.
      t += rng.range(1.5, 2.1);
      add({ id: "grid-0", kind: "grid", speaker: 0, hand: false }, 60);
      shot("grid-0", t, { enter: "cut", tap: tapAt.mic });
      t += rng.range(1.6, 2.2);
      showGrid(nextSpeaker(), t, { tap: tapAt.mic });
    } else {
      showGrid(nextSpeaker(), t);
    }
  }
  return { duration, shots, specs };
}

function Tile({ name, index, speaking, muted, self, hand = false }: { name: string; index: number; speaking: boolean; muted: boolean; self: boolean; hand?: boolean }) {
  return (
    <div className={styles.tile} style={{ background: gradients[index % gradients.length] }} data-speaking={speaking}>
      <span className={styles.avatar} style={{ background: "rgb(255 255 255 / 20%)" }}>{initials(name)}</span>
      <span className={styles.name}>{self ? "You" : firstOf(name)}</span>
      {hand && <span className={styles.handBadge}>✋</span>}
      {muted && <span className={styles.mic}><Icon name="micOff" size={12} stroke={2.2} /></span>}
    </div>
  );
}

function Top({ m }: { m: Meeting }) {
  return (
    <div className={styles.top}>
      <span className={styles.pill}><Icon name="note" size={16} /></span>
      <span className={styles.title}>{m.title.length > 26 ? `${m.title.slice(0, 25)}…` : m.title}<small /></span>
      <span className={styles.pill}><Icon name="person" size={14} />{m.roster.length}</span>
    </div>
  );
}

function Bar({ micOn, hand = false }: { micOn: boolean; hand?: boolean }) {
  return (
    <div className={styles.bar}>
      <span className={micOn ? undefined : styles.off}><Icon name={micOn ? "mic" : "micOff"} size={22} /></span>
      <span><Icon name="video" size={22} /></span>
      <span className={hand ? styles.handOn : styles.handBtn}>✋</span>
      <span><Icon name="bubble" size={22} /></span>
      <span className={styles.end}><Icon name="phone" size={22} /></span>
    </div>
  );
}

function Grid({ m, speaker, hand, seed }: { m: Meeting; speaker: number; hand: boolean; seed: number }) {
  const names = m.roster.slice(0, TILES);
  const selfTalking = speaker === 0;
  return (
    <>
      <Top m={m} />
      <div className={styles.grid}>
        {names.map((name, i) => (
          <Tile key={i} name={name} index={i + seed} self={i === 0} speaking={i === speaker} hand={i === 0 && hand} muted={i === 0 ? !selfTalking : i !== speaker && (i + seed) % 3 === 0} />
        ))}
      </div>
      {hand ? <div className={styles.muted}>You raised your hand</div> : selfTalking ? null : <div className={styles.muted}>You&rsquo;re muted</div>}
      <Bar micOn={selfTalking} hand={hand} />
    </>
  );
}

function SlideView({ slide }: { slide: Slide }) {
  if (slide.kind === "bars") {
    const max = Math.max(...slide.values);
    return (
      <div className={styles.slide}>
        <h3>{slide.title}</h3>
        <p>{slide.sub}</p>
        <div className={styles.bars}>
          {slide.values.map((v, i) => <span key={i} style={{ height: `${(v / max) * 140}px` }}><i>{v}</i></span>)}
        </div>
        <div className={styles.labels}>{slide.labels.map((label, i) => <span key={i}>{label}</span>)}</div>
      </div>
    );
  }
  if (slide.kind === "bullets") {
    return (
      <div className={styles.slide}>
        <h3>{slide.title}</h3>
        <ul className={styles.bullets}>{slide.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
      </div>
    );
  }
  if (slide.kind === "kpi") {
    return (
      <div className={styles.slide}>
        <h3>{slide.title}</h3>
        <div className={styles.kpis}>
          {slide.tiles.map((tile, i) => (
            <div key={i} className={styles.kpi}><small>{tile.label}</small><b>{tile.value}</b><span data-up={tile.delta >= 0}>{tile.delta >= 0 ? "▲" : "▼"} {Math.abs(tile.delta)}%</span></div>
          ))}
        </div>
      </div>
    );
  }
  if (slide.kind === "sheet") {
    return (
      <table className={styles.sheet}>
        <thead><tr><th>{slide.title}</th><th>Stage</th><th>ARR ($K)</th><th>Close</th></tr></thead>
        <tbody>
          {slide.rows.map((row, i) => (
            <tr key={i}>
              <td>{row.account}</td>
              <td>{row.stage}</td>
              <td className={i === 3 ? `${styles.sel} ${styles.r}` : styles.r}>{row.arr}</td>
              <td className={styles.r}>Dec {row.close}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (slide.kind === "doc") {
    return (
      <div className={styles.doc}>
        <h3>{slide.title}</h3>
        {slide.paras.map((para, i) => <p key={i}>{para}</p>)}
      </div>
    );
  }
  return (
    <div className={styles.slide}>
      <h3>{slide.title}</h3>
      {slide.rows.map((row, i) => (
        <div key={i} className={styles.road}><b>{row.month}</b><span>{row.label}</span><i data-status={row.status}>{row.status}</i></div>
      ))}
    </div>
  );
}

function Share({ m, slide, talking, number }: { m: Meeting; slide: Slide; talking: number; number: number }) {
  const film = m.roster.slice(1, 5);
  return (
    <>
      <Top m={m} />
      <div className={styles.sharing}>{firstOf(m.roster[m.presenter])} is presenting · {slide.kind === "sheet" || slide.kind === "doc" ? slide.title : `Slide ${number}`}</div>
      <div className={styles.film}>
        {film.map((name, i) => (
          <Tile key={i} name={name} index={i + 1} self={false} speaking={i === talking} muted={i !== talking} />
        ))}
      </div>
      <Bar micOn={false} />
    </>
  );
}

function Chat({ m, seed, clock }: { m: Meeting; seed: number; clock: number }) {
  const lines = chatLines(seed, m, 24, clock - 20);
  return (
    <div className={styles.chat}>
      {lines.map((line) => (
        <div key={line.id} className={styles.chatRow}>
          <b>{firstOf(line.who)}<small>{formatTime(line.minute)}</small></b>
          {line.text}
        </div>
      ))}
    </div>
  );
}

function People({ m, seed }: { m: Meeting; seed: number }) {
  const rng = createRng(hash(seed, "people"));
  return (
    <div className={styles.people}>
      {m.roster.map((name, i) => {
        const hand = i > 0 && rng.chance(0.2);
        return (
          <div key={i} className={styles.person}>
            <span className={styles.avatar} style={{ background: gradients[i % gradients.length] }}>{initials(name)}</span>
            <span className={styles.personName}>{i === 0 ? `${name} (You)` : name}{i === 1 && <small>Host</small>}</span>
            {hand && <span>✋</span>}
            <Icon name={i === 0 || rng.chance(0.6) ? "micOff" : "mic"} size={18} />
          </div>
        );
      })}
    </div>
  );
}

const sheetHead = (title: string) => (
  <div className={styles.sheetHead}><span />{title}<span className={styles.sheetDone}>Done</span></div>
);

function buildSession(ctx: Ctx, clock: number, owner: Owner): Session {
  const { meeting: m, seed } = ctx;
  const { duration, shots, specs } = plan(ctx);
  const panels: Record<string, Panel> = {};
  const dark = styles.panelDark;
  for (const spec of specs.values()) {
    let panel: Panel;
    if (spec.kind === "preview") {
      panel = {
        className: dark,
        body: null,
        chrome: (
          <>
            <div className={styles.top}><Icon name="chevronDown" size={24} stroke={2.4} /><span /><span className={styles.pill}>Preview</span></div>
            <div className={styles.preview}>
              <span className={styles.avatar} style={{ width: 96, height: 96, fontSize: 34, background: "rgb(255 255 255 / 16%)" }}>{initials(`${owner.firstName} ${owner.lastName}`)}</span>
              <span className={styles.previewName}>{owner.firstName} {owner.lastName}</span>
            </div>
            <div className={styles.toggles}>
              <span className={styles.toggle} data-off={!spec.micOn}><Icon name={spec.micOn ? "mic" : "micOff"} size={24} /></span>
              <span className={styles.toggle}><Icon name="video" size={24} /></span>
              <span className={styles.toggle}><Icon name="note" size={24} /></span>
            </div>
            <div className={styles.meetTitle}>{m.title}<small>{m.roster.length - 1} people in the room</small></div>
            <div className={styles.join}>Join</div>
          </>
        ),
      };
    } else if (spec.kind === "connecting") {
      panel = {
        className: dark,
        body: null,
        chrome: (
          <>
            <div className={styles.preview} data-dim="true">
              <span className={styles.avatar} style={{ width: 96, height: 96, fontSize: 34, background: "rgb(255 255 255 / 16%)" }}>{initials(`${owner.firstName} ${owner.lastName}`)}</span>
            </div>
            <div className={styles.meetTitle}>Connecting…<small>{m.title}</small></div>
          </>
        ),
      };
    } else if (spec.kind === "grid") {
      panel = { className: dark, body: null, chrome: <Grid m={m} speaker={spec.speaker} hand={spec.hand} seed={seed} /> };
    } else if (spec.kind === "chat") {
      panel = { className: styles.sheetPanel, top: 120, bottom: 96, body: <Chat m={m} seed={seed} clock={clock} />, chrome: <>{sheetHead("Chat")}<div className={styles.composer}>Message everyone</div></> };
    } else if (spec.kind === "people") {
      panel = { className: styles.sheetPanel, top: 120, bottom: 40, body: <People m={m} seed={seed} />, chrome: sheetHead(`Participants (${m.roster.length})`) };
    } else {
      const slide = slideOf(seed, spec.index, m);
      const number = (spec.index % 18) + 3;
      panel = {
        className: dark,
        top: 108,
        bottom: 436,
        body: <div className={styles.stage}><SlideView slide={slide} /></div>,
        chrome: <Share m={m} slide={slide} talking={spec.talking} number={number} />,
      };
    }
    panels[spec.id] = panel;
  }
  return { duration, shots, panels };
}

/** Part of a long scene this render belongs to. */
function partOf({ elapsed, duration, clock }: ScreenProps) {
  const part = Math.floor(Math.max(0, elapsed) / CHUNK);
  const start = part * CHUNK;
  return { part, start, duration: Math.max(1, Math.min(CHUNK, duration - start)), elapsed: elapsed - start, clock: clock - elapsed + start };
}

/** Minute values that tick with the simulation: the meeting timer under the title. */
/** The meeting timer, drawn inside each in-call panel so it moves with transitions. */
function Live({ ctx, panel, total, view }: { ctx: Ctx; panel: string; total: number; view: string }): ReactNode {
  if (panel.startsWith("preview") || panel === "connecting" || panel === "chat" || panel === "people") return null;
  const joinedAt = view === "joining" ? 2 : 0;
  const minutes = Math.max(0, ctx.meeting.startedAgo * (view === "joining" ? 0 : 1) + total - joinedAt);
  const seconds = (ctx.seed % 60 + total * 17) % 60;
  return <span className={styles.timer}>{minutes}:{String(seconds).padStart(2, "0")}</span>;
}

export function MeetingScreen(props: ScreenProps) {
  const part = partOf(props);
  const meeting = meetingOf(props.seed, props.owner);
  const ctx: Ctx = { view: props.view, seed: hash(props.seed, part.part), part: part.part, duration: part.duration, meeting };
  return (
    <div className={styles.root}>
      <Storyboard
        id={`${props.view}:${props.seed}:${part.part}:${part.duration}`}
        elapsed={part.elapsed}
        build={() => buildSession(ctx, part.clock, props.owner)}
        live={(panel) => <Live ctx={ctx} panel={panel} total={props.elapsed} view={props.view} />}
      />
    </div>
  );
}

const meeting: CloneDefinition = {
  Screen: MeetingScreen,
  tone: () => "light",
  fixtures: [
    { view: "joining", label: "one minute late", seed: 4, clock: 10 * 60 + 1, duration: 2 },
    { view: "joining", label: "join and settle", seed: 13, clock: 9 * 60 + 59, duration: 8 },
    { view: "grid", label: "weekly sync, muted", seed: 9, clock: 10 * 60 + 18, duration: 20 },
    { view: "grid", label: "long all-hands", seed: 15, clock: 16 * 60, duration: 60 },
    { view: "speaker", label: "demo with deck", seed: 6, clock: 15 * 60 + 12, duration: 25 },
    { view: "speaker", label: "demo with sheet", seed: 7, clock: 16 * 60 + 5, duration: 20 },
  ],
};

export default meeting;
