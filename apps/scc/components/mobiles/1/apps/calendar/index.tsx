import type { ReactNode } from "react";
import { Icon, Storyboard, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatDate, formatTime, weekdayOf, weekdayShort } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { buildDay, buildInvites, buildNewEvent, dateOf, layout, type CalEvent, type Invite } from "./data";
import styles from "./calendar.module.css";

const HOUR = 56;
const DAY_TOP = 172;
const TOOLBAR = 83;
const VIEW_H = 844 - DAY_TOP - TOOLBAR;
const TOTAL = 24 * HOUR + 16;
const MAX_SCROLL = TOTAL - VIEW_H;
/** Long scenes play as consecutive sessions of this many simulated minutes. */
const CHUNK = 24;
/** Estimated DOM nodes per panel kind, against a per-session budget. */
const COST = { day: 90, week: 80, event: 42, inbox: 40, compose: 62 } as const;
const BUDGET = 620;

const colors = [
  { fg: "#0a4aa6", bg: "#d6e6ff", bar: "#007aff" },
  { fg: "#8a2a1f", bg: "#ffdcd8", bar: "#ff3b30" },
  { fg: "#1d6a31", bg: "#d6f3dd", bar: "#34c759" },
  { fg: "#7a4a00", bg: "#ffe9c2", bar: "#ff9500" },
  { fg: "#5a2a9a", bg: "#e8dcfa", bar: "#af52de" },
];

const hourLabel = (h: number) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "Noon" : `${h - 12} PM`);
const short = (minute: number) => formatTime(minute).replace(":00", "");
const clampScroll = (value: number) => Math.max(0, Math.min(MAX_SCROLL, value));
const eventTop = (minute: number) => (minute / 60) * HOUR + 9;
const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");
const hues = ["#e8912d", "#2eb67d", "#5b6ee1", "#e0746b", "#7c3aed", "#0f766e", "#c2410c", "#2563eb"];
const hueOf = (name: string) => hues[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % hues.length];

function eventBox(e: CalEvent) {
  const width = (390 - 60 - 6) / e.cols;
  return { top: eventTop(e.start), height: Math.max(20, ((e.end - e.start) / 60) * HOUR - 2), left: 58 + e.col * width, width: width - 2 };
}

function DayChrome({ day }: { day: number }) {
  const weekday = weekdayOf(day);
  const [dayName, ...rest] = formatDate(day).split(", ");
  const letters = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <>
      <div className={styles.head}>
        <div className={styles.navRow}>
          <span className={styles.back}><Icon name="chevronLeft" size={22} stroke={2.4} /> {rest[0].split(" ")[0]}</span>
          <span className={styles.right}><Icon name="search" size={22} /><Icon name="plus" size={24} stroke={2.2} /></span>
        </div>
        <div className={styles.strip}>
          {letters.map((letter, i) => (
            <span key={i}>
              {letter}
              <span className={styles.num} data-weekend={i === 0 || i === 6} data-today={i - 1 === weekday}>{dateOf(day, i - 1 - weekday)}</span>
            </span>
          ))}
        </div>
        <div className={styles.dayTitle}>{dayName}<small>{rest.join(", ")}</small></div>
      </div>
      <div className={styles.toolbar}><span>Today</span><span>Calendars</span><span>Inbox</span></div>
    </>
  );
}

function DayBody({ events, now, base, fresh }: { events: readonly CalEvent[]; now: number | null; base: number; fresh?: string }) {
  return (
    <div
      className={styles.sheet}
      style={{ height: TOTAL, marginTop: -base }}
    >
      <div className={styles.lines} style={{ backgroundSize: `100% ${HOUR}px` }} />
      {Array.from({ length: 23 }, (_, i) => (
        <span key={i} className={styles.hourLabel} style={{ top: (i + 1) * HOUR }}>{hourLabel(i + 1)}</span>
      ))}
      {events.map((e) => {
        const c = colors[e.color];
        const box = eventBox(e);
        return (
          <div key={e.id} className={styles.event} data-fresh={e.id === fresh} style={{ ...box, background: c.bg, color: c.fg, borderLeftColor: c.bar }}>
            {e.title}
            {e.end - e.start >= 45 && <small>{e.place}</small>}
            {e.end - e.start >= 60 && <small>{short(e.start)} – {short(e.end)}</small>}
          </div>
        );
      })}
      {now !== null && (
        <div className={styles.now} style={{ top: (now / 60) * HOUR + 8 }}>
          <span>{formatTime(now).replace(" AM", "").replace(" PM", "")}</span><b /><i />
        </div>
      )}
    </div>
  );
}

function EventDetail({ e, day }: { e: CalEvent; day: number }) {
  const c = colors[e.color];
  const [dayName, date] = formatDate(day).split(", ");
  return (
    <div className={styles.detail}>
      <h1 className={styles.evTitle}>{e.title}</h1>
      <div className={styles.evPlace}>{e.place}</div>
      <div className={styles.evWhen}>{dayName}, {date}<br />from {formatTime(e.start)} to {formatTime(e.end)}</div>
      {e.video ? (
        <div className={styles.evLink}><Icon name="video" size={20} /><span>Join video call<small>{e.video}</small></span></div>
      ) : (
        <div className={styles.evMap} style={{ background: `linear-gradient(135deg, #e8e6df 0 40%, #cfe3c4 40% 52%, #e8e6df 52%)` }}><b style={{ background: c.bar }} /></div>
      )}
      <div className={styles.evGroup}>
        <div className={styles.evRow}><span>Calendar</span><span className={styles.evDetailRight}><i style={{ background: c.bar }} />{e.calendar}</span></div>
        <div className={styles.evRow}><span>Alert</span><span className={styles.evDetailRight}>{e.alert}</span></div>
      </div>
      {e.attendees.length > 0 && (
        <div className={styles.evGroup}>
          <div className={styles.evRow}><span>Invitees</span><span className={styles.evDetailRight}>{e.attendees.length + 1}</span></div>
          <div className={styles.person}><span className={styles.avatar} style={{ background: hueOf(e.host) }}>{initials(e.host)}</span>{e.host}<small>Organizer</small></div>
          {e.attendees.map((a, i) => (
            <div key={i} className={styles.person}><span className={styles.avatar} style={{ background: hueOf(a.name) }}>{initials(a.name)}</span>{a.name}<small data-status={a.status}>{a.status === "accepted" ? "Accepted" : a.status === "maybe" ? "Maybe" : "Awaiting"}</small></div>
          ))}
        </div>
      )}
      <div className={styles.evNotes}><b>Notes</b>{e.notes}</div>
      <div className={styles.evDelete}>Delete Event</div>
    </div>
  );
}

const detailChrome = (day: number) => (
  <div className={styles.detailNav}>
    <span className={styles.back}><Icon name="chevronLeft" size={22} stroke={2.4} /> {weekdayShort[weekdayOf(day)]} {dateOf(day)}</span>
    <span>Edit</span>
  </div>
);

const WEEK_HOUR = 50;
const WEEK_FROM = 8;

function Week({ owner, day }: { owner: Owner; day: number }) {
  const monday = day - weekdayOf(day);
  const today = weekdayOf(day);
  return (
    <div className={styles.week}>
      {Array.from({ length: 11 }, (_, i) => (
        <span key={i} className={styles.weekHour} style={{ top: i * WEEK_HOUR }}>{hourLabel(WEEK_FROM + i)}</span>
      ))}
      {Array.from({ length: 5 }, (_, d) =>
        buildDay(owner, monday + d)
          .filter((e) => e.start >= WEEK_FROM * 60 && e.start < (WEEK_FROM + 11) * 60)
          .map((e) => {
            const c = colors[e.color];
            const colW = 330 / 5;
            return (
              <div
                key={`${d}-${e.id}`}
                className={styles.weekEvent}
                data-past={d < today}
                style={{
                  top: ((e.start - WEEK_FROM * 60) / 60) * WEEK_HOUR + 1,
                  height: Math.max(14, ((e.end - e.start) / 60) * WEEK_HOUR - 2),
                  left: 52 + d * colW + (e.col * colW) / e.cols,
                  width: colW / e.cols - 2,
                  background: c.bg,
                  color: c.fg,
                  borderLeftColor: c.bar,
                }}
              >
                {e.title}
              </div>
            );
          }),
      )}
    </div>
  );
}

function weekChrome(day: number) {
  const today = weekdayOf(day);
  const [, rest] = formatDate(day).split(", ");
  return (
    <>
      <div className={styles.head}>
        <div className={styles.navRow}><span className={styles.back}><Icon name="chevronLeft" size={22} stroke={2.4} /> 2026</span><span className={styles.right}><Icon name="search" size={22} /><Icon name="plus" size={24} stroke={2.2} /></span></div>
        <div className={styles.weekTitle}>{rest.split(" ")[0]}</div>
        <div className={styles.weekDays}>
          {weekdayShort.map((name, i) => (
            <span key={i} data-today={i === today}>{name}<b>{dateOf(day, i - today)}</b></span>
          ))}
        </div>
      </div>
      <div className={styles.toolbar}><span>Today</span><span>Calendars</span><span>Inbox</span></div>
    </>
  );
}

function Inbox({ invites, accepted }: { invites: readonly Invite[]; accepted: number }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardBar}><span /><b>Inbox</b><span>Done</span></div>
      <div className={styles.inviteHead}>New</div>
      {invites.map((inv, i) => (
        <div key={inv.id} className={styles.invite}>
          <b>{inv.title}</b>
          <small>{weekdayShort[weekdayOf(inv.day)]}, Oct {dateOf(inv.day)} · {short(inv.start)} – {short(inv.end)}<br />From {inv.host}</small>
          {i < accepted ? (
            <span className={styles.inviteDone}>Accepted</span>
          ) : (
            <span className={styles.inviteActions}><span>Accept</span><span>Maybe</span><span>Decline</span></span>
          )}
        </div>
      ))}
    </div>
  );
}

const keyRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function Compose({ title, place, start, end, typed, field }: { title: string; place: string; start: number; end: number; typed: number; field: "title" | "place" }) {
  const shownTitle = field === "title" ? title.slice(0, typed) : title;
  const shownPlace = field === "place" ? place.slice(0, typed) : "";
  return (
    <div className={styles.card}>
      <div className={styles.cardBar}><span>Cancel</span><b>New Event</b><span data-on={field === "place"}>Add</span></div>
      <div className={styles.form}>
        <div className={styles.field}>{shownTitle || <i>Title</i>}{field === "title" && <span className={styles.caret} />}</div>
        <div className={styles.field}>{shownPlace || <i>Location or Video Call</i>}{field === "place" && <span className={styles.caret} />}</div>
      </div>
      <div className={styles.form}>
        <div className={styles.field}>All-day<span className={styles.toggle} /></div>
        <div className={styles.field}>Starts<span className={styles.pill}>Today · {formatTime(start)}</span></div>
        <div className={styles.field}>Ends<span className={styles.pill}>{formatTime(end)}</span></div>
      </div>
      <div className={styles.keys}>
        {keyRows.map((row, r) => (
          <div key={r} className={styles.keyRow}>
            {[...row].map((k, i) => <span key={i} className={styles.key}>{k}</span>)}
          </div>
        ))}
        <div className={styles.keyRow}><span className={styles.keySpace}>space</span><span className={styles.keyGo}>return</span></div>
      </div>
    </div>
  );
}

type Ctx = { seed: number; part: number; duration: number; clock: number; day: number; owner: Owner };

/**
 * A calendar session in simulated time: flick the day, open events, glance at
 * the week and the next day, answer invitations, add an event.
 */
function daySession({ seed, part, duration, clock, day, owner }: Ctx): Session {
  const rng = createRng(hash(seed, part, "calendar-session"));
  const events = buildDay(owner, day);
  const panels: Record<string, Panel> = {};
  const shots: Shot[] = [];
  let budget = BUDGET - COST.day;
  let t = 0;
  const go = (shot: Omit<Shot, "at">, dt: number) => {
    shots.push({ ...shot, at: t });
    t += dt;
  };
  const dayPanel = (body: ReactNode, d: number): Panel => ({ body, chrome: <DayChrome day={d} />, top: DAY_TOP, bottom: TOOLBAR });

  // Scroll is tracked in absolute timeline pt; each day panel starts at its own base.
  const base = new Map<string, number>();
  const nowBase = clampScroll((clock / 60 - 2.5) * HOUR);
  base.set("day", nowBase);
  panels.day = dayPanel(<DayBody events={events} now={clock} base={nowBase} />, day);
  let todayId = "day";
  let abs = nowBase;
  const scrollTo = (value: number) => {
    abs = clampScroll(value);
    return abs - (base.get(todayId) ?? 0);
  };

  const opened = new Map<string, string>();
  const detailScrolled = new Set<string>();
  const once = new Set<string>();
  go({ panel: "day", enter: "cut", scroll: scrollTo(abs + rng.range(-120, 160)), flicks: 2 }, rng.range(1.5, 2.2));

  const visible = () => events.filter((e) => eventTop(e.start) > abs + 10 && eventTop(e.start) < abs + VIEW_H - 70);

  const open = () => {
    let choices = visible().filter((e) => opened.has(e.id) || budget >= COST.event);
    if (!choices.length) {
      const pool = events.filter((e) => opened.has(e.id) || budget >= COST.event);
      if (!pool.length) return flick();
      const target = rng.pick(pool);
      go({ panel: todayId, scroll: scrollTo(eventTop(target.start) - rng.range(120, 300)), flicks: 1 }, rng.range(1.3, 1.7));
      choices = [target];
    }
    const e = rng.pick(choices);
    let id = opened.get(e.id);
    if (!id) {
      id = `ev-${opened.size}`;
      opened.set(e.id, id);
      budget -= COST.event;
      panels[id] = { body: <EventDetail e={e} day={day} />, chrome: detailChrome(day), top: 98 };
    }
    const box = eventBox(e);
    const tap = { x: Math.round(box.left + box.width / 2), y: Math.round(DAY_TOP + box.top - abs + Math.min(14, box.height / 2)) };
    const deep = !detailScrolled.has(id);
    go({ panel: id, enter: "push", tap, scroll: deep ? rng.range(140, 300) : 0, flicks: 1 }, rng.range(1.7, 2.3));
    if (deep) detailScrolled.add(id);
    else detailScrolled.delete(id);
    go({ panel: todayId, enter: "pop", tap: { x: 34, y: 76 } }, rng.range(1.3, 1.7));
  };

  const flick = () => {
    let target = abs + (rng.chance(0.55) ? 1 : -1) * rng.range(110, 280);
    if (clampScroll(target) === abs) target = abs - (target - abs);
    go({ panel: todayId, scroll: scrollTo(target), flicks: rng.int(1, 2) }, rng.range(1.3, 2));
  };

  const next = () => {
    if (!panels.next) {
      budget -= COST.day;
      const tomorrow = buildDay(owner, day + 1);
      const b = clampScroll(8 * HOUR);
      base.set("next", b);
      panels.next = dayPanel(<DayBody events={tomorrow} now={null} base={b} />, day + 1);
    }
    go({ panel: "next", enter: "push", scroll: rng.range(80, 320), flicks: 2 }, rng.range(1.8, 2.3));
    go({ panel: todayId, enter: "pop", tap: { x: 36, y: 800 } }, rng.range(1.3, 1.7));
  };

  const week = () => {
    if (!panels.week) {
      budget -= COST.week;
      panels.week = { body: <Week owner={owner} day={day} />, chrome: weekChrome(day), top: 186, bottom: TOOLBAR };
    }
    go({ panel: "week", enter: "pop", tap: { x: 40, y: 76 } }, rng.range(1.7, 2.3));
    const col = weekdayOf(day);
    go({ panel: todayId, enter: "push", tap: { x: Math.round(52 + col * 66 + 33), y: 140 } }, rng.range(1.4, 1.8));
  };

  const inbox = () => {
    once.add("inbox");
    budget -= COST.inbox * 2;
    const invites = buildInvites(hash(seed, part), owner, day);
    const sheet = (accepted: number): Panel => ({ body: null, chrome: <Inbox invites={invites} accepted={accepted} />, className: styles.sheetPanel });
    panels.inbox = sheet(0);
    panels.inboxDone = sheet(2);
    go({ panel: "inbox", enter: "sheet", tap: { x: 354, y: 800 } }, rng.range(1.6, 2));
    go({ panel: "inboxDone", enter: "cut", tap: { x: 62, y: 222 } }, rng.range(1.5, 1.9));
    go({ panel: todayId, enter: "dismiss", tap: { x: 352, y: 92 } }, rng.range(1.3, 1.6));
  };

  const add = () => {
    once.add("new");
    budget -= COST.compose * 3 + COST.day;
    const fresh = buildNewEvent(hash(seed, part), owner, clock);
    // Bring the next few hours into view before tapping +.
    go({ panel: todayId, scroll: scrollTo(eventTop(fresh.start) - 260), flicks: 1 }, 1.4);
    const compose = (typed: number, field: "title" | "place"): Panel => ({
      body: null,
      chrome: <Compose title={fresh.title} place={fresh.place} start={fresh.start} end={fresh.end} typed={typed} field={field} />,
      className: styles.sheetPanel,
    });
    panels["new-1"] = compose(Math.ceil(fresh.title.length * 0.45), "title");
    panels["new-2"] = compose(fresh.title.length, "title");
    panels["new-3"] = compose(fresh.place.length, "place");
    go({ panel: "new-1", enter: "sheet", tap: { x: 366, y: 76 } }, rng.range(1.4, 1.7));
    go({ panel: "new-2", enter: "cut", tap: { x: rng.int(30, 360), y: 640 } }, rng.range(1.3, 1.6));
    go({ panel: "new-3", enter: "cut", tap: { x: 195, y: 205 } }, rng.range(1.3, 1.6));
    const added: CalEvent = { ...events[0], id: "fresh", title: fresh.title, place: fresh.place, start: fresh.start, end: fresh.end, color: 2, col: 0, cols: 1 };
    const withNew = layout([...events.filter((e) => e.end <= fresh.start || e.start >= fresh.end), added]);
    base.set("day-new", abs);
    panels["day-new"] = dayPanel(<DayBody events={withNew} now={clock} base={abs} fresh="fresh" />, day);
    todayId = "day-new";
    go({ panel: "day-new", enter: "dismiss", tap: { x: 360, y: 92 } }, rng.range(1.6, 2));
  };

  while (t < duration - 0.6) {
    const options: (readonly [() => void, number])[] = [[open, 4], [flick, 2]];
    if (panels.next || budget >= COST.day) options.push([next, 1.2]);
    if (panels.week || budget >= COST.week) options.push([week, 1.2]);
    if (!once.has("inbox") && budget >= COST.inbox * 2) options.push([inbox, 1]);
    if (!once.has("new") && budget >= COST.compose * 3 + COST.day) options.push([add, 1]);
    rng.weighted(options)();
  }
  return { duration, shots, panels };
}

export function CalendarScreen(props: ScreenProps) {
  const part = Math.floor(Math.max(0, props.elapsed) / CHUNK);
  const start = part * CHUNK;
  const duration = Math.max(1, Math.min(CHUNK, props.duration - start));
  const clock = props.clock - props.elapsed + start;
  return (
    <div className={styles.root}>
      <Storyboard
        id={`${props.view}:${props.seed}:${part}:${duration}`}
        elapsed={props.elapsed - start}
        build={() => daySession({ seed: props.seed, part, duration, clock, day: props.day, owner: props.owner })}
      />
    </div>
  );
}

const calendar: CloneDefinition = {
  Screen: CalendarScreen,
  tone: () => "dark",
  fixtures: [
    { view: "day", label: "before standup", seed: 3, clock: 9 * 60 + 12, duration: 6 },
    { view: "day", label: "midday stack", seed: 17, clock: 13 * 60 + 35, duration: 6 },
    { view: "day", label: "late scramble", seed: 28, clock: 16 * 60 + 50, duration: 8 },
    { view: "day", label: "planning the week", seed: 41, clock: 8 * 60 + 40, duration: 24 },
  ],
};

export default calendar;
