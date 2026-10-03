import { Icon, Storyboard, TabBar, type Panel, type Session, type Shot, type TabItem } from "../../ios";
import { createRng, hash, type Rng } from "../../model/rng";
import { formatTime, weekdayNames, weekdayShort } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./school.module.css";

const titles = ["Ms.", "Mr.", "Mx.", "Mrs."];
const surnames = ["Alvarez", "Okonkwo", "Hale", "Bernstein", "Nguyen", "Castillo", "Weiss", "Abernathy", "Kaur", "Delacroix", "Morales", "Fitzgerald", "Sato", "Brennan", "Haddad", "Lindqvist"];
const roles = ["3rd grade · Room 204", "Music", "Principal", "Art", "2nd grade · Room 112", "Science", "PE", "Library", "4th grade · Room 310", "Spanish", "Kindergarten · Room 101", "Counselor"];
const hues = ["#c0563f", "#4d7fb3", "#5e8c61", "#9a63a8", "#c98a00", "#3b8686", "#b0607a", "#6a6f78"];
const kidNames = ["Noah", "Maya", "Leo", "Zoe", "Ezra", "Ivy", "Mateo", "Ruby", "Aria", "Kofi", "Hana", "Sami", "Iris", "Theo", "Luz", "Omar"];
const subjects = ["fractions", "the water cycle", "map skills", "poetry", "plant life cycles", "place value", "Lenape history", "magnets", "persuasive writing", "the solar system"];
const destinations = ["the Museum of Natural History", "the Bronx Zoo", "the Botanic Garden", "the Hall of Science", "the Transit Museum", "Governors Island", "the Children's Museum", "the Aquarium in Coney Island", "Wave Hill", "the Tenement Museum"];
const asks = ["Please send a spare change of clothes for recess.", "Reading logs are due Thursday.", "Wear sneakers for gym tomorrow.", "Library books are due back Friday.", "Spirit day Friday: school colors, blue and gold.", "We still need two chaperones.", "Please label all water bottles.", "Picture retakes are next Tuesday."];
const openers = [
  (kid: string, subject: string) => `We wrapped up our unit on ${subject} today! Ask ${kid} to explain it at dinner.`,
  (kid: string, subject: string) => `Photos from this morning's lab on ${subject} are up. The class named every experiment.`,
  (kid: string, subject: string) => `Big week: ${subject} projects go home Friday. ${kid}'s table worked so well together.`,
  (kid: string, subject: string) => `Our read-aloud led to a great talk about ${subject}. Thank you for the book donations!`,
  (kid: string, subject: string) => `Quiz on ${subject} moved to Wednesday. ${kid} has the study sheet in their folder.`,
];
const events = ["Picture day", "Book fair", "PTA meeting", "Science fair", "Spirit day", "Early dismissal", "Bake sale", "Conferences", "Chorus concert", "Library visit", "Swim lesson", "Family math night", "Field trip"];
const replies = [
  "Thanks so much for the update!", "Got it, we'll send it tomorrow.", "Is there anything we can practice at home?", "Sounds great, thank you!",
  "Happy to chaperone if you still need someone.", "Sorry, we were running late this morning.", "Will do!", "We'll look for it in the folder.",
];
const teacherLines = [
  "had a great day today, very focused during reading", "is doing really well with the new material", "left a sweater in the classroom, it's in lost and found",
  "could use a little extra practice with spelling words", "helped a classmate at recess today, so kind", "the form is due by Friday if you can",
  "we're starting our class garden next week", "no homework tonight, just reading",
];

type Teacher = { name: string; role: string; hue: string; initials: string };

function teacher(rng: Rng): Teacher {
  const last = rng.pick(surnames);
  return { name: `${rng.pick(titles)} ${last}`, role: rng.pick(roles), hue: rng.pick(hues), initials: last.slice(0, 2).toUpperCase() };
}

const tabs = (badge: number): readonly TabItem[] => [
  { id: "updates", label: "Updates", icon: "bell" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "messages", label: "Messages", icon: "bubble", badge },
];

const header = (title: string, back?: string) => (
  <header className={styles.fixed}>
    {back ? <span className={styles.back}><Icon name="chevronLeft" size={22} stroke={2.6} />{back}</span> : <span />}
    <b>{title}</b>
    <span />
  </header>
);

const chrome = (title: string, active: string) => (
  <>
    {header(title)}
    <TabBar items={tabs(1)} active={active} tint="#c98a00" />
  </>
);

const TAB_Y = 785;
const tabX = { updates: 65, calendar: 195, messages: 325 } as const;

type Step = { panel: string; enter: Shot["enter"]; tap?: Shot["tap"]; scroll?: number; flicks?: number };

/**
 * A parent's school app in simulated time: flick the class feed, open the
 * field-trip form, sign and submit it, check the calendar, message a teacher.
 */
function updatesSession({ seed, duration, clock, day, weekday, owner }: ScreenProps): Session {
  const rng = createRng(hash(seed, "school-session"));
  const total = Math.max(4, duration);
  const kids = [kidNames[seed % kidNames.length], kidNames[(seed * 7 + 3) % kidNames.length]];
  if (kids[1] === kids[0]) kids[1] = kidNames[(seed + 1) % kidNames.length];
  const staff = Array.from({ length: 6 }, () => teacher(rng));
  const homeroom = staff[0];
  const destination = rng.pick(destinations);
  const fee = rng.pick([8, 10, 12, 15, 18]);
  const tripDay = weekdayNames[(weekday + rng.int(2, 4)) % 5];
  const due = weekdayNames[Math.min(4, weekday + 1)];
  const parent = `${owner.firstName} ${owner.lastName}`;

  const posts = Array.from({ length: 10 }, (_, i) => {
    const who = staff[i % staff.length];
    const kid = kids[i % 2];
    return { id: `p${i}`, who, text: `${rng.pick(openers)(kid, rng.pick(subjects))} ${rng.pick(asks)}`, at: clock - 25 - i * rng.int(40, 160), hearts: rng.int(4, 41), comments: rng.int(0, 7) };
  });

  const feed = (
    <div className={styles.feed}>
      <div className={styles.kids}>
        {kids.map((kid, index) => <span key={index} className={styles.kid} data-on={index === 0}><i>{kid[0]}</i>{kid}</span>)}
        <span className={styles.kid}><i>+</i>All</span>
      </div>
      <div className={styles.alert} data-tone="due">
        <span className={styles.ico} style={{ background: "#ff9500" }}><Icon name="paper" size={20} stroke={2} /></span>
        <div><b>Field trip form due {due}</b><p>{kids[0]}&apos;s class visits {destination} on {tripDay}. Permission slip and ${fee} fee.</p><span className={styles.btn}>Sign form</span></div>
      </div>
      {posts.map((post) => (
        <div key={post.id} className={styles.card}>
          <div className={styles.who}>
            <span className={styles.face} style={{ background: post.who.hue }}>{post.who.initials}</span>
            <div><b>{post.who.name}</b><small>{post.who.role} · {post.at >= 0 ? formatTime(post.at) : "Yesterday"}</small></div>
          </div>
          <div className={styles.text}>{post.text}</div>
          <div className={styles.reactions}><span><Icon name="heart" size={15} stroke={1.9} />{post.hearts}</span><span><Icon name="bubble" size={15} stroke={1.9} />{post.comments}</span></div>
        </div>
      ))}
    </div>
  );

  const form = (signed: boolean) => (
    <div className={styles.form}>
      <div className={styles.formTitle}>Trip to {destination}</div>
      <div className={styles.formMeta}>{homeroom.name} · {tripDay}, 9:15 AM – 1:30 PM</div>
      <div className={styles.facts}>
        <div><span>Student</span><span>{kids[0]} {owner.lastName}</span></div>
        <div><span>Fee</span><span>${fee}.00</span></div>
        <div><span>Lunch</span><span>{rng.pick(["Packed from home", "School provides", "Bring a snack"])}</span></div>
        <div><span>Transport</span><span>{rng.pick(["School bus", "Subway with staff", "Chartered bus"])}</span></div>
      </div>
      <p className={styles.legal}>I give permission for my child to attend this trip and to be photographed for the class page. In an emergency, staff may seek medical care.</p>
      <div className={styles.check}><Icon name="check" size={16} stroke={3} />My child may take the subway with staff</div>
      <div className={styles.btnWide} data-done={signed}>{signed ? "Signed" : "Sign and pay"}</div>
    </div>
  );

  const pad = (signed: boolean) => (
    <div className={styles.sheet}>
      <div className={styles.grabber} />
      <div className={styles.formTitle}>Sign here</div>
      <div className={styles.pad}>
        {signed && (
          <svg viewBox="0 0 300 120" aria-hidden="true">
            <path d={`M14 ${80 - (seed % 9)} C 40 20, 60 110, 86 60 S 130 ${30 + (seed % 20)}, 150 76 S 200 40, 214 70 S 260 90, 288 ${50 + (seed % 15)}`} fill="none" stroke="#1c1c1e" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        <span className={styles.padLine}>{parent}</span>
      </div>
      <div className={styles.btnWide} data-done={false} data-off={!signed}>Submit</div>
    </div>
  );

  const days = Array.from({ length: 21 }, (_, i) => i);
  const monday = 5 + Math.floor(day / 5) * 7;
  const date = (i: number) => new Date(2026, 9, monday + i).getDate();
  const dated = days.map((i) => (hash(seed, "cal", i) % 3 === 0 ? events[hash(seed, "ev", i) % events.length] : null));
  const calendar = (
    <div className={styles.calendar}>
      <div className={styles.week}>{weekdayShort.map((day) => <span key={day}>{day}</span>)}</div>
      <div className={styles.days}>
        {days.filter((i) => i % 7 < 5).map((i) => (
          <span key={i} data-today={i === weekday} data-dot={dated[i] !== null}>{date(i)}</span>
        ))}
      </div>
      <div className={styles.agenda}>
        {days.filter((i) => dated[i] !== null && i % 7 < 5).slice(0, 7).map((i) => (
          <div key={i} className={styles.event}>
            <span className={styles.eventDay}>{weekdayShort[i % 7]}<b>{date(i)}</b></span>
            <div><b>{dated[i]}</b><small>{formatTime(8 * 60 + (hash(seed, i) % 20) * 30)} · {kids[i % 2]}</small></div>
          </div>
        ))}
        <div className={styles.event}>
          <span className={styles.eventDay}>{tripDay.slice(0, 3)}<b>!</b></span>
          <div><b>Trip to {destination}</b><small>Form due {due}</small></div>
        </div>
      </div>
    </div>
  );

  const inbox = (
    <div className={styles.inbox}>
      {staff.map((who, i) => (
        <div key={i} className={styles.who} data-row="true">
          <span className={styles.face} style={{ background: who.hue }}>{who.initials}</span>
          <div><b>{who.name}</b><small>{i === 0 ? `${kids[0]} ${rng.pick(teacherLines)}` : rng.pick(teacherLines)}</small></div>
        </div>
      ))}
    </div>
  );

  const threadLines = Array.from({ length: 16 }, (_, i) => ({ me: i % 3 === 1, text: i % 3 === 1 ? rng.pick(replies) : `${i === 0 ? `Hi ${owner.firstName}! ${kids[0]} ` : ""}${rng.pick(teacherLines)}` }));
  const thread = (
    <div className={styles.thread}>
      {threadLines.map((line, i) => (
        <div key={i} className={styles.bubble} data-me={line.me}>{line.text}</div>
      ))}
    </div>
  );

  const flow: Step[] = [
    { panel: "feed", enter: "cut", scroll: 360, flicks: 2 },
    { panel: "form", enter: "push", tap: { x: 120, y: 268 }, scroll: 120 },
    { panel: "sign", enter: "sheet", tap: { x: 195, y: 650 } },
    { panel: "signed", enter: "cut", tap: { x: 160, y: 330 } },
    { panel: "submitted", enter: "dismiss", tap: { x: 195, y: 470 } },
    { panel: "feed", enter: "pop", tap: { x: 30, y: 76 }, scroll: 760, flicks: 3 },
    { panel: "calendar", enter: "tab", tap: { x: tabX.calendar, y: TAB_Y } },
    { panel: "inbox", enter: "tab", tap: { x: tabX.messages, y: TAB_Y } },
    { panel: "thread", enter: "push", tap: { x: 195, y: 140 }, scroll: 240, flicks: 2 },
    { panel: "inbox", enter: "pop", tap: { x: 30, y: 76 } },
    { panel: "feed", enter: "tab", tap: { x: tabX.updates, y: TAB_Y }, scroll: 1150, flicks: 3 },
  ];
  const starts = [0, 0, 0, 6, 7];
  let index = total <= 6 ? starts[seed % starts.length] : 0;
  const shots: Shot[] = [];
  let t = 0;
  while (t < total) {
    const step = flow[index % flow.length];
    shots.push({ ...step, at: t, enter: shots.length ? step.enter : "cut", tap: shots.length ? step.tap : undefined });
    t += rng.range(1.35, 2);
    index++;
  }
  const used = new Set(shots.map((shot) => shot.panel));
  const all: Record<string, () => Panel> = {
    feed: () => ({ body: feed, chrome: chrome("Homeroom", "updates"), top: 98, bottom: 83, className: styles.grouped }),
    form: () => ({ body: form(false), chrome: header("Permission slip", "Back"), top: 98 }),
    sign: () => ({ body: pad(false), className: styles.dim }),
    signed: () => ({ body: pad(true), className: styles.dim }),
    submitted: () => ({
      body: (
        <div className={styles.done}>
          <span className={styles.doneCheck}><Icon name="check" size={44} stroke={3} /></span>
          <div className={styles.formTitle}>Form submitted</div>
          <p>{homeroom.name} will get a copy. ${fee}.00 charged to the card ending 4417.</p>
        </div>
      ),
      chrome: header("Permission slip", "Back"),
      top: 98,
    }),
    calendar: () => ({ body: calendar, chrome: chrome("Calendar", "calendar"), top: 98, bottom: 83 }),
    inbox: () => ({ body: inbox, chrome: chrome("Messages", "messages"), top: 98, bottom: 83 }),
    thread: () => ({
      body: thread,
      chrome: (
        <>
          {header(homeroom.name, "Messages")}
          <div className={styles.composer}><span>Message {homeroom.name}</span><Icon name="send" size={20} stroke={1.9} /></div>
        </>
      ),
      top: 98,
      bottom: 90,
    }),
  };
  const panels: Record<string, Panel> = {};
  for (const id of used) panels[id] = all[id]();
  return { duration: total, shots, panels };
}

export function HomeroomScreen(props: ScreenProps) {
  return (
    <div className={styles.root}>
      <Storyboard id={`${props.view}:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => updatesSession(props)} />
    </div>
  );
}

const homeroom: CloneDefinition = {
  Screen: HomeroomScreen,
  fixtures: [
    { view: "updates", label: "morning drop-off", seed: 2, clock: 8 * 60 + 25, duration: 4 },
    { view: "updates", label: "lunch break", seed: 5, clock: 12 * 60 + 40, duration: 3 },
    { view: "updates", label: "pickup run", seed: 8, clock: 14 * 60 + 20, duration: 3 },
    { view: "updates", label: "evening forms", seed: 11, clock: 20 * 60 + 10, duration: 18 },
  ],
};

export default homeroom;
