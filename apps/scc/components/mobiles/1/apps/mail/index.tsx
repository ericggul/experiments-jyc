import { Icon, Storyboard, type Enter, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { firstOf, initials, makeInbox, makeMail, replyFor, type Mail } from "./data";
import styles from "./mail.module.css";

/** Long scenes play as consecutive sessions of this many simulated minutes. */
const CHUNK = 24;
const INBOX_TOP = 192;
const ROW = 104;
const TOOLBAR = 83;
const NAV = 98;
const ROWS = 14;
const VIEWPORT = 844 - INBOX_TOP - TOOLBAR;
const MAX_SCROLL = ROWS * ROW - VIEWPORT;
/** Estimated DOM nodes per panel kind; the whole session renders at once. */
const COST = { inbox: 100, message: 46, swipe: 116, compose: 124, search: 82, boxes: 32, list: 52 } as const;
const BUDGET = 640;

const when = (minute: number) => (minute < 0 ? "Yesterday" : formatTime(minute));

function Row({ mail, swiped = false }: { mail: Mail; swiped?: boolean }) {
  return (
    <div className={styles.item} data-swiped={swiped || undefined}>
      <span className={styles.dot} data-unread={mail.unread} data-flag={mail.flagged} />
      <span className={styles.sender} data-vip={mail.vip}>{mail.from}</span>
      <span className={styles.when}>{when(mail.time)}</span>
      <span className={styles.subject}>{mail.subject}</span>
      <span className={styles.preview}>{mail.preview}</span>
    </div>
  );
}

function InboxChrome({ unread, title = "Inbox", back = "Mailboxes" }: { unread: number; title?: string; back?: string }) {
  return (
    <>
      <div className={styles.nav}>
        <div className={styles.navRow}><span className={styles.back}><Icon name="chevronLeft" size={24} stroke={2.4} /> {back}</span><span>Edit</span></div>
        <h1 className={styles.large}>{title}</h1>
        <div className={styles.search}><Icon name="search" size={16} stroke={2.2} /> Search</div>
      </div>
      <div className={styles.toolbar}>
        <Icon name="filter" size={24} />
        <small><b>Updated Just Now</b>{unread} Unread</small>
        <Icon name="compose" size={24} />
      </div>
    </>
  );
}

function MessageBody({ mail, owner }: { mail: Mail; owner: Owner }) {
  return (
    <>
      <div className={styles.msgHead}>
        <div className={styles.from}>
          <span className={styles.avatar} style={{ background: mail.tint }}>{initials(mail.from)}</span>
          <span className={styles.fromName}>{mail.from}<small>To: {owner.firstName} {owner.lastName}</small></span>
          <span className={styles.stamp}>{when(mail.time)}</span>
        </div>
        <h2 className={styles.subjLine}>{mail.subject}</h2>
      </div>
      <div className={styles.text}>
        {mail.headline && <div className={styles.hero} style={{ background: mail.tint }}><b>{mail.headline}</b>{mail.from}</div>}
        {mail.invite && (
          <div className={styles.invite}>
            <b>{mail.invite.title}</b>
            <span>{mail.invite.when}</span>
            <span>{mail.invite.where}</span>
            <div className={styles.rsvp}><span>Accept</span><span>Maybe</span><span>Decline</span></div>
          </div>
        )}
        {mail.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        {mail.lines && (
          <div className={styles.lines}>
            {mail.lines.map(([item, amount], i) => <div key={i}><span>{item}</span><span>{amount}</span></div>)}
          </div>
        )}
        {mail.attachment && <span className={styles.attach}><Icon name="paper" size={24} /><span>{mail.attachment.name}<small>{mail.attachment.size}</small></span></span>}
      </div>
    </>
  );
}

const messageChrome = (back: string) => (
  <>
    <div className={styles.nav}>
      <div className={styles.navRow}>
        <span className={styles.back}><Icon name="chevronLeft" size={24} stroke={2.4} /> {back}</span>
        <span className={styles.arrows}><Icon name="chevronDown" size={22} style={{ transform: "rotate(180deg)" }} /><Icon name="chevronDown" size={22} /></span>
      </div>
    </div>
    <div className={`${styles.toolbar} ${styles.toolbar5}`}>
      <Icon name="tag" size={24} />
      <Icon name="paper" size={24} />
      <Icon name="close" size={24} />
      <Icon name="share" size={24} />
      <Icon name="compose" size={24} />
    </div>
  </>
);

const keyRows = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

function Keyboard({ go = "return" }: { go?: string }) {
  return (
    <div className={styles.keys}>
      {keyRows.map((row, r) => (
        <div key={r} className={styles.keyRow}>
          {r === 2 && <span className={`${styles.key} ${styles.keyWide}`}>⇧</span>}
          {row.map((k) => <span key={k} className={styles.key}>{k}</span>)}
          {r === 2 && <span className={`${styles.key} ${styles.keyWide}`}>⌫</span>}
        </div>
      ))}
      <div className={styles.keyRow}>
        <span className={`${styles.key} ${styles.keyWide}`}>123</span>
        <span className={`${styles.key} ${styles.keySpace}`}>space</span>
        <span className={`${styles.key} ${styles.keyGo}`}>{go}</span>
      </div>
    </div>
  );
}

function Compose({ mail, text }: { mail: Mail; text: string }) {
  return (
    <div className={styles.sheet}>
      <div className={styles.sheetBar}><span>Cancel</span><b>Re: {mail.subject}</b><Icon name="send" size={26} filled stroke={0} /></div>
      <div className={styles.field}><span>To:</span><span className={styles.chip}>{mail.from}</span></div>
      <div className={styles.field}><span>Cc/Bcc:</span></div>
      <div className={styles.field}><span>Subject:</span><span className={styles.clip}>Re: {mail.subject}</span></div>
      <div className={styles.draft}>{text}<span className={styles.caret} /></div>
      <Keyboard />
    </div>
  );
}

/** Cut a reply at a word boundary. */
const typed = (text: string, share: number) => {
  const end = Math.floor(text.length * share);
  const space = text.lastIndexOf(" ", end);
  return text.slice(0, space > 0 ? space : end);
};

type Ctx = { view: string; seed: number; owner: Owner; clock: number; duration: number };

/**
 * A mail session in simulated time: flick the inbox, open a message, read,
 * go back, archive with a swipe, reply with a growing draft, search, check
 * VIP or Promotions. Panels are budgeted because a session renders at once;
 * once the budget is spent the person revisits what is already built.
 */
function mailSession({ view, seed, owner, clock, duration }: Ctx): Session {
  const rng = createRng(hash(seed, "mail-session"));
  const total = Math.max(1, duration);
  const mails = makeInbox(seed, owner, clock, ROWS);
  const unread = mails.filter((mail) => mail.unread).length + rng.int(4, 60);
  const panels: Record<string, Panel> = {};
  const shots: Shot[] = [];
  let budget = BUDGET - COST.inbox;
  let t = 0;
  let scroll = 0;
  let here = "inbox";
  const afford = (cost: number) => (budget >= cost ? ((budget -= cost), true) : false);
  const go = (panel: string, enter: Enter, dt: number, extra: Partial<Shot> = {}) => {
    shots.push({ panel, at: t, enter: shots.length ? enter : "cut", ...extra });
    here = panel;
    t += dt;
  };

  panels.inbox = {
    top: INBOX_TOP,
    bottom: TOOLBAR,
    chrome: <InboxChrome unread={unread} />,
    body: mails.map((mail) => <Row key={mail.id} mail={mail} />),
  };

  const message = (mail: Mail, back: string) => {
    const id = `msg-${mail.id}-${back}`;
    if (!panels[id] && !afford(COST.message)) return null;
    panels[id] ??= { top: NAV, bottom: TOOLBAR, chrome: messageChrome(back), body: <MessageBody mail={mail} owner={owner} /> };
    return id;
  };
  /** A row on screen at the current inbox scroll. */
  const visibleRow = () => Math.min(ROWS - 1, Math.ceil(scroll / ROW) + rng.int(0, 3));
  const rowY = (index: number) => INBOX_TOP + index * ROW - scroll + 46;
  const flick = (enter: Enter = "pop") => {
    scroll = scroll >= MAX_SCROLL - 20 ? 0 : Math.min(MAX_SCROLL, scroll + rng.int(150, 380));
    go("inbox", enter, rng.range(1.5, 2.3), { scroll, flicks: rng.int(1, 2) });
  };
  const read = (id: string, from: Partial<Shot>, enter: Enter = "push") => {
    go(id, enter, rng.range(1.6, 2.4), { scroll: rng.int(120, 420), flicks: rng.int(1, 2), ...from });
  };
  let composes = 0;
  const reply = (mail: Mail, returnTo: string) => {
    if (!afford(COST.compose)) return false;
    const text = replyFor(mail, owner, seed);
    composes++;
    const a = `compose-${composes}-a`;
    const b = `compose-${composes}-b`;
    panels[a] = { className: styles.sheetPanel, body: null, chrome: <Compose mail={mail} text={typed(text, rng.range(0.3, 0.5))} /> };
    panels[b] = { className: styles.sheetPanel, body: null, chrome: <Compose mail={mail} text={text} /> };
    go(a, "sheet", rng.range(1.5, 2), { tap: { x: 267, y: 800 } });
    go(b, "cut", rng.range(1.4, 1.9));
    go(returnTo, "dismiss", rng.range(1.3, 1.8), { tap: { x: 360, y: 88 } });
    return true;
  };
  const vip = rng.chance(0.5);
  let swipes = 0;
  const swipe = () => {
    if (!afford(COST.swipe)) return false;
    swipes++;
    const start = Math.floor(scroll / ROW);
    const offset = scroll - start * ROW;
    const target = Math.min(ROWS - 2, start + rng.int(0, 2));
    const window = mails.slice(start, start + 7);
    const style = { marginTop: -offset };
    panels[`swipe-${swipes}`] = {
      top: INBOX_TOP, bottom: TOOLBAR, chrome: <InboxChrome unread={unread} />,
      body: <div style={style}>{window.map((mail, i) => <div key={mail.id} className={styles.swipeSlot}>{start + i === target && <span className={styles.archive}>Archive</span>}<Row mail={mail} swiped={start + i === target} /></div>)}</div>,
    };
    panels[`gone-${swipes}`] = {
      top: INBOX_TOP, bottom: TOOLBAR, chrome: <InboxChrome unread={unread - 1} />,
      body: <div style={style}>{mails.slice(start, start + 8).filter((_, i) => start + i !== target).map((mail) => <Row key={mail.id} mail={mail} />)}</div>,
    };
    go(`swipe-${swipes}`, "cut", 1.35, { tap: { x: 330, y: rowY(target) } });
    go(`gone-${swipes}`, "cut", rng.range(1.3, 1.7));
    return true;
  };
  const search = () => {
    if (!panels.search && !afford(COST.search)) return false;
    const who = mails[rng.int(0, ROWS - 1)].from;
    const found = Array.from({ length: 3 }, (_, i) => ({ ...makeMail(hash(seed, "search"), i, owner, clock - (i + 1) * rng.int(200, 900)), id: `s${i}`, from: who }));
    panels.search ??= {
      top: 150,
      bottom: 291,
      chrome: (
        <>
          <div className={styles.nav}>
            <div className={styles.searchRow}><span className={styles.searchActive}><Icon name="search" size={16} stroke={2.2} /> {firstOf(who)}</span><span>Cancel</span></div>
            <div className={styles.scope}><span data-on="true">All Mailboxes</span><span>Inbox</span></div>
          </div>
          <Keyboard go="search" />
        </>
      ),
      body: <><div className={styles.hits}>Top Hits</div>{found.map((mail) => <Row key={mail.id} mail={mail} />)}</>,
    };
    go("search", "fade", rng.range(1.6, 2.2), { tap: { x: 120, y: 172 } });
    const pick = found[rng.int(0, found.length - 1)];
    const id = message(pick, "Search");
    if (id) {
      read(id, { tap: { x: 195, y: 230 } });
      go("search", "pop", 1.4, { tap: { x: 40, y: 76 } });
    }
    go("inbox", "fade", 1.4, { tap: { x: 352, y: 76 } });
    return true;
  };
  const boxes = () => {
    if (!panels.boxes && !afford(COST.boxes + COST.list)) return false;
    const pool = Array.from({ length: 30 }, (_, i) => makeMail(hash(seed, "boxes"), i, owner, clock - 30 - i * 47));
    const list = [...pool.filter((mail) => (vip ? mail.kind === "personal" || mail.kind === "work" : mail.kind === "promo")), ...pool].slice(0, 6).map((mail) => ({ ...mail, vip }));
    const name = vip ? "VIP" : "Promotions";
    panels.boxes ??= {
      top: 150,
      chrome: <div className={styles.nav}><div className={styles.navRow}><span /><span>Edit</span></div><h1 className={styles.large}>Mailboxes</h1></div>,
      body: (
        <div className={styles.boxes}>
          {[["All Inboxes", unread], ["VIP", rng.int(1, 6)], ["Flagged", rng.int(0, 9)], ["Promotions", rng.int(20, 300)], ["Drafts", rng.int(0, 4)], ["Sent", ""], ["Archive", ""]].map(([label, count]) => (
            <div key={label} className={styles.box}><span>{label}</span><span>{count}</span></div>
          ))}
        </div>
      ),
    };
    panels.list ??= { top: INBOX_TOP, bottom: TOOLBAR, chrome: <InboxChrome unread={rng.int(2, 40)} title={name} />, body: list.map((mail) => <Row key={mail.id} mail={mail} />) };
    go("boxes", "pop", rng.range(1.3, 1.7), { tap: { x: 60, y: 76 } });
    go("list", "push", rng.range(1.6, 2.2), { tap: { x: 120, y: vip ? 226 : 314 }, scroll: rng.int(60, 200) });
    const id = message(list[rng.int(0, 2)], name);
    if (id) {
      read(id, { tap: { x: 195, y: 300 } });
      go("list", "pop", 1.4, { tap: { x: 40, y: 76 } });
    }
    go("boxes", "pop", 1.3, { tap: { x: 40, y: 76 } });
    go("inbox", "push", 1.4, { tap: { x: 100, y: 182 } });
    return true;
  };

  // Where the scene opens.
  if (view === "compose" || view === "message") {
    const mail = mails[rng.int(0, 4)];
    const id = message(mail, "Inbox") ?? "inbox";
    if (view === "message" || !reply(mail, id)) read(id, {}, "cut");
  } else {
    scroll = rng.int(0, 2) * ROW;
    go("inbox", "cut", rng.range(1.4, 2), { scroll, flicks: 1 });
  }

  while (t < total) {
    if (here.startsWith("msg-")) {
      const choice = rng.weighted([["back", 5], ["read", 2], ["next", 2], ["reply", 2]] as const);
      const current = mails.find((mail) => here === `msg-${mail.id}-Inbox`);
      if (choice === "read") {
        go(here, "cut", rng.range(1.3, 1.8), { scroll: rng.int(300, 560), flicks: 1 });
      } else if (choice === "next" && current) {
        const next = mails[Math.min(ROWS - 1, mails.indexOf(current) + 1)];
        const id = next ? message(next, "Inbox") : null;
        if (id && id !== here) read(id, { tap: { x: 352, y: 76 } });
        else flick();
      } else if (choice === "reply" && current && reply(current, here)) {
        continue;
      } else {
        // Back to the list, then keep flicking.
        scroll = Math.min(MAX_SCROLL, scroll + rng.int(0, 200));
        go("inbox", "pop", rng.range(1.4, 2), { tap: { x: 40, y: 76 }, scroll, flicks: 1 });
      }
      continue;
    }
    if (here.startsWith("gone-")) {
      flick("cut");
      continue;
    }
    const choice = rng.weighted([["open", 6], ["flick", 4], ["swipe", 2], ["search", 1], ["boxes", 1]] as const);
    if (choice === "open") {
      const index = visibleRow();
      const id = message(mails[index], "Inbox");
      if (id) {
        read(id, { tap: { x: 195, y: rowY(index) } });
        continue;
      }
    }
    if (choice === "swipe" && swipe()) continue;
    if (choice === "search" && search()) continue;
    if (choice === "boxes" && boxes()) continue;
    flick();
  }
  return { duration: total, shots, panels };
}

export function MailScreen(props: ScreenProps) {
  const part = Math.floor(Math.max(0, props.elapsed) / CHUNK);
  const start = part * CHUNK;
  const duration = Math.max(1, Math.min(CHUNK, props.duration - start));
  const ctx: Ctx = { view: props.view, seed: hash(props.seed, part), owner: props.owner, clock: props.clock - props.elapsed + start, duration };
  return (
    <div className={styles.root}>
      <Storyboard id={`${props.view}:${props.seed}:${part}:${duration}`} elapsed={props.elapsed - start} build={() => mailSession(ctx)} />
    </div>
  );
}

const mail: CloneDefinition = {
  Screen: MailScreen,
  tone: () => "dark",
  fixtures: [
    { view: "inbox", label: "morning triage", seed: 14, clock: 8 * 60 + 52, duration: 6 },
    { view: "inbox", label: "long triage", seed: 41, clock: 9 * 60 + 30, duration: 24 },
    { view: "message", label: "reading the q4 note", seed: 31, clock: 11 * 60 + 8, duration: 4 },
    { view: "compose", label: "half-written reply", seed: 22, clock: 13 * 60 + 40, duration: 8 },
  ],
};

export default mail;
