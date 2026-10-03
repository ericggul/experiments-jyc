import { Icon } from "../../ios";
import { createRng, type Rng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./mail.module.css";

const senders = [
  "Maya Okafor", "Dev Patel", "Sam Rivera", "Lena Fischer", "Marcus Webb", "Priya Nair",
  "Tomás Herrera", "Aiko Tanaka", "Jordan Blake", "Chloe Bennett", "Rosa Delgado", "Halvorsen Freight",
  "Brightwater Billing", "People Ops", "IT Helpdesk", "Andre Washington",
];
const subjects: readonly [string, string][] = [
  ["Q4 deck: final comments by EOD", "Hi all, attaching v3 of the Q4 deck. Please add comments on slides 9 to 14 before end of day."],
  ["Re: Halvorsen renewal terms", "Thanks for the quick turnaround. Legal flagged section 4.2 and wants to discuss on Thursday."],
  ["Invoice 20418 is overdue", "Our records show invoice 20418 for $12,400 is now 14 days past due. Please confirm payment status."],
  ["Standup notes, Mon", "Quick recap: ENG-2041 blocked on API change, design review moved to 3pm, release freeze at 5."],
  ["Action required: complete security training", "Your annual security awareness training is due Friday. It takes about 25 minutes."],
  ["Lunch Thursday?", "A few of us are heading to the place on 8th. Want to join? Booking for 12:30."],
  ["Updated: Sprint planning agenda", "Added a 10 minute slot to discuss the vendor timeline. Agenda is linked in the invite."],
  ["Offer letter: Product Designer", "Attached is the signed offer letter. Please countersign and return by next Wednesday."],
  ["Expense report approved", "Your expense report ER-5530 for $284.17 has been approved and will be paid on Friday."],
  ["Fwd: customer escalation, Oakline", "Looping you in. They are asking for a call today and mentioned the March outage again."],
  ["Reminder: all-hands at 4", "Join us for the quarterly all-hands. Leadership will share results and the 2027 roadmap."],
  ["Revised proposal for Kestrel Foods", "Please see the revised scope and pricing. Happy to walk through it whenever suits you."],
];
const hues = ["#e8912d", "#2eb67d", "#5b6ee1", "#e0746b", "#7c3aed", "#0f766e", "#c2410c", "#2563eb"];
const colorOf = (name: string) => hues[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % hues.length];
const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");

function pickMany<T>(rng: Rng, items: readonly T[], n: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return out;
}


/** Running sum of steps: returns n values starting at `start`, each after adding step(). */
function walk(start: number, n: number, step: () => number, floor = -Infinity): number[] {
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < n; i++) {
    out.push(v);
    v = Math.max(floor, v + step());
  }
  return out;
}

function Inbox({ seed, clock }: ScreenProps) {
  const rng = createRng(seed);
  const subs = pickMany(rng, subjects, 7);
  const names = pickMany(rng, senders, 7);
  const times = walk(clock - rng.int(1, 6), subs.length, () => -rng.int(12, 70));
  const items = subs.map(([subject, preview], i) => ({
    id: `${names[i]}-${i}`, name: names[i], subject, preview, time: times[i], unread: rng.chance(0.55), vip: rng.chance(0.25),
  }));
  const unread = items.filter((i) => i.unread).length + 23;
  return (
    <div className={styles.root}>
      <div className={styles.nav}>
        <div className={styles.navRow}><span className={styles.back}><Icon name="chevronLeft" size={24} stroke={2.4} /> Mailboxes</span><span>Edit</span></div>
        <h1 className={styles.large}>Inbox</h1>
      </div>
      <div className={styles.list}>
        {items.map((m) => (
          <div key={m.id} className={styles.item}>
            <span className={styles.dot} data-unread={m.unread} />
            <span className={styles.sender}>{m.name}{m.vip && <Icon name="check" size={13} filled stroke={0} className={styles.vip} />}</span>
            <span className={styles.when}>{formatTime(m.time).replace(" ", " ")}<Icon name="chevronRight" size={12} stroke={2.4} style={{ color: "var(--ios-tertiary)" }} /></span>
            <span className={styles.subject}>{m.subject}</span>
            <span className={styles.preview}>{m.preview}</span>
          </div>
        ))}
      </div>
      <div className={styles.toolbar}>
        <Icon name="filter" size={24} />
        <small><b>Updated Just Now</b>{unread} Unread</small>
        <Icon name="compose" size={24} />
      </div>
    </div>
  );
}

function Message({ seed, clock, owner }: ScreenProps) {
  const rng = createRng(seed);
  const [subject, preview] = rng.pick(subjects);
  const name = rng.pick(senders);
  const other = rng.pick(senders.filter((n) => n !== name));
  return (
    <div className={styles.root}>
      <div className={styles.nav}>
        <div className={styles.navRow}><span className={styles.back}><Icon name="chevronLeft" size={24} stroke={2.4} /> Inbox</span><span style={{ display: "flex", gap: 22 }}><Icon name="chevronDown" size={22} style={{ transform: "rotate(180deg)" }} /><Icon name="chevronDown" size={22} /></span></div>
      </div>
      <div className={styles.msgHead}>
        <div className={styles.from}>
          <span className={styles.avatar} style={{ background: colorOf(name) }}>{initials(name)}</span>
          <span className={styles.fromName}>{name}<small>To: {owner.firstName} {owner.lastName}, {other.split(" ")[0]}</small></span>
          <span style={{ color: "var(--ios-secondary)", fontSize: 15 }}>{formatTime(clock - 22)}</span>
        </div>
        <h2 className={styles.subjLine}>{subject}</h2>
      </div>
      <div className={styles.body}>
        <p>Hi {owner.firstName},</p>
        <p>{preview}</p>
        <p>If anything looks off, reply here and I will loop in the rest of the team before we lock it.</p>
        <span className={styles.attach}><Icon name="paper" size={24} /><span>{subject.slice(0, 18).trim()}.pdf<small>1.4 MB</small></span></span>
        <p>Thanks,<br />{name.split(" ")[0]}</p>
        <div className={styles.quote}>
          <b>On Fri, {other} wrote:</b>
          <p>Sounds good. I will check with finance and get back to you early next week.</p>
          <p>Can we also confirm who owns the follow-up?</p>
        </div>
      </div>
      <div className={styles.toolbar} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Icon name="tag" size={24} />
        <Icon name="paper" size={24} />
        <Icon name="close" size={24} />
        <Icon name="share" size={24} />
      </div>
    </div>
  );
}

const rows = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

function Compose({ seed, elapsed, owner }: ScreenProps) {
  const rng = createRng(seed);
  const [subject] = rng.pick(subjects);
  const to = rng.pick(senders);
  const lines = [
    `Hi ${to.split(" ")[0]},`,
    "Thanks for flagging this. I reviewed the numbers with the team this morning and we are aligned on the revised timeline.",
    "A couple of open items: the vendor contract still needs sign-off, and I want to double-check the Q4 figures before",
  ];
  const shown = Math.min(lines[2].length, 40 + elapsed * 12);
  return (
    <div className={styles.backdrop}>
      <div className={styles.sheet}>
        <div className={styles.sheetBar}><span>Cancel</span><b>Re: {subject.slice(0, 14)}…</b><Icon name="send" size={26} filled stroke={0} /></div>
        <div className={styles.field}><span>To:</span><span className={styles.chip}>{to}</span></div>
        <div className={styles.field}><span>Cc:</span><span /></div>
        <div className={styles.field}><span>Subject:</span><span>Re: {subject}</span></div>
        <div className={styles.draft}>
          <p>{lines[0]}</p>
          <p>{lines[1]}</p>
          <p>{lines[2].slice(0, shown)}<span className={styles.caret} /></p>
          <p className={styles.sig}>Sent from my phone</p>
          <p className={styles.sig}>{owner.firstName}</p>
        </div>
        <div className={styles.keys}>
          {rows.map((row, r) => (
            <div key={r} className={styles.keyRow}>
              {r === 2 && <span className={`${styles.key} ${styles.keyWide}`}>⇧</span>}
              {row.map((k) => <span key={k} className={styles.key}>{k}</span>)}
              {r === 2 && <span className={`${styles.key} ${styles.keyWide}`}>⌫</span>}
            </div>
          ))}
          <div className={styles.keyRow}>
            <span className={`${styles.key} ${styles.keyWide}`}>123</span>
            <span className={`${styles.key} ${styles.keySpace}`}>space</span>
            <span className={`${styles.key} ${styles.keyGo}`}>return</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MailScreen(props: ScreenProps) {
  if (props.view === "message") return <Message {...props} />;
  if (props.view === "compose") return <Compose {...props} />;
  return <Inbox {...props} />;
}

const mail: CloneDefinition = {
  Screen: MailScreen,
  tone: (view) => (view === "compose" ? "light" : "dark"),
  fixtures: [
    { view: "inbox", label: "morning triage", seed: 14, clock: 8 * 60 + 52, duration: 6 },
    { view: "message", label: "reading the q4 note", seed: 31, clock: 11 * 60 + 8, duration: 4 },
    { view: "compose", label: "half-written reply", seed: 22, clock: 13 * 60 + 40, duration: 8 },
  ],
};

export default mail;
