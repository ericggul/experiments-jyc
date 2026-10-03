import { Icon, Storyboard, type IconName, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash, type Rng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./bank.module.css";

const prefixes = ["Greenleaf", "Bluebird", "Lotus", "Atlas", "Northside", "Harbor", "Union Square", "Prospect", "Riverside", "Flatiron", "Mulberry", "Cobble Hill", "Ironbound", "Hudson"];
const kinds: readonly { kind: string; icon: IconName; hue: string; range: readonly [number, number]; category: string }[] = [
  { kind: "Market", icon: "cart", hue: "#4a9a52", range: [24, 96], category: "Groceries" },
  { kind: "Coffee", icon: "clock", hue: "#3d7a8c", range: [4, 9], category: "Food & Drink" },
  { kind: "Thai Kitchen", icon: "fork", hue: "#9a5aa8", range: [18, 42], category: "Dining" },
  { kind: "Pharmacy", icon: "bag", hue: "#b24747", range: [9, 48], category: "Health" },
  { kind: "Hardware", icon: "tag", hue: "#6a6f78", range: [14, 62], category: "Home" },
  { kind: "Cinema", icon: "video", hue: "#7a4aa0", range: [16, 34], category: "Entertainment" },
  { kind: "Electric", icon: "bolt", hue: "#c68a1e", range: [64, 148], category: "Utilities" },
  { kind: "Fitness", icon: "run", hue: "#d0533a", range: [25, 89], category: "Health" },
  { kind: "Pizza", icon: "fork", hue: "#c0392b", range: [12, 36], category: "Dining" },
  { kind: "Florist", icon: "heart", hue: "#c76a8a", range: [18, 64], category: "Shopping" },
  { kind: "Bookshop", icon: "paper", hue: "#7a5b3a", range: [11, 40], category: "Shopping" },
  { kind: "Car Service", icon: "car", hue: "#33475b", range: [14, 58], category: "Transport" },
];
const places = ["New York, NY", "Brooklyn, NY", "Queens, NY", "Jersey City, NJ", "Online"];
const contacts = ["Dana Whitfield", "Marcus Webb", "Priya Nair", "Theo Park", "Rosa Alvarez", "Sam Okafor", "Lena Fischer", "Jordan Reyes", "Amara Obi", "Chris Delgado", "Nina Kowalski", "Eli Rosen"];
const memos = ["Rent share", "Dinner last night", "Concert tickets", "Utilities split", "Birthday gift", "Groceries", "Cab home", "Brunch", "Movers tip", "Ski trip deposit"];
const categories: readonly { name: string; icon: IconName }[] = [
  { name: "Groceries", icon: "cart" }, { name: "Dining", icon: "fork" }, { name: "Transport", icon: "train" },
  { name: "Shopping", icon: "bag" }, { name: "Health", icon: "heart" }, { name: "Home", icon: "house" }, { name: "Entertainment", icon: "video" },
];

type Tx = { id: string; name: string; icon: IconName; hue: string; amount: number; credit: boolean; at: number; place: string; category: string };

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const when = (minute: number) => (minute >= 0 ? `Today, ${formatTime(minute)}` : minute > -1440 ? "Yesterday" : `${Math.floor(-minute / 1440) + 1} days ago`);

function purchase(rng: Rng, owner: Owner, id: string, at: number): Tx {
  const kind = rng.pick(kinds);
  const place = rng.chance(0.3) ? `${owner.home}, NY` : rng.pick(places);
  return { id, name: `${rng.pick(prefixes)} ${kind.kind}`, icon: kind.icon, hue: kind.hue, amount: rng.range(kind.range[0], kind.range[1]), credit: false, at, place, category: kind.category };
}

function activity(seed: number, owner: Owner, clock: number, count: number): Tx[] {
  const rng = createRng(hash(seed, "bank-activity"));
  let at = clock - rng.int(20, 90);
  return Array.from({ length: count }, (_, index) => {
    let tx: Tx;
    if (index === 3) tx = { id: `t${index}`, name: "Payroll deposit", icon: "bank", hue: "#0b6e4f", amount: rng.range(1400, 3200), credit: true, at, place: owner.work, category: "Income" };
    else if (rng.chance(0.12)) tx = { id: `t${index}`, name: `From ${rng.pick(contacts)}`, icon: "send", hue: "#0b6e4f", amount: rng.range(12, 140), credit: true, at, place: "Transfer", category: "Transfer" };
    else tx = purchase(rng, owner, `t${index}`, at);
    at -= rng.int(50, 380);
    return tx;
  });
}

function TxRows({ rows }: { rows: readonly Tx[] }) {
  return rows.map((row) => (
    <div key={row.id} className={styles.tx}>
      <span className={styles.ico}><Icon name={row.icon} size={17} stroke={1.9} /></span>
      <div>{row.name}<small>{when(row.at)}</small></div>
      <b className={row.credit ? styles.plus : undefined}>{row.credit ? "+" : "−"}{money(row.amount)}</b>
    </div>
  ));
}

function Home({ seed, clock, owner, rows }: { seed: number; clock: number; owner: Owner; rows: readonly Tx[] }) {
  const rng = createRng(hash(seed, "bank-home"));
  const checking = rng.range(1100, 6400);
  const savings = rng.range(2400, 28000);
  const spent = rng.range(1400, 3600);
  const parts = [
    ["Housing", "#0b6e4f", rng.range(0.38, 0.5)],
    ["Food", "#f2a900", rng.range(0.14, 0.22)],
    ["Transit", "#2f6bb0", rng.range(0.05, 0.1)],
    ["Other", "#8e8e93", rng.range(0.1, 0.2)],
  ] as const;
  const sum = parts.reduce((total, part) => total + part[2], 0);
  const [dollars, cents] = checking.toFixed(2).split(".");
  const greeting = clock < 12 * 60 ? "Good morning" : clock < 17 * 60 ? "Good afternoon" : "Good evening";
  return (
    <>
      <div className={styles.hero}>
        <div className={styles.bar}>
          <span className={styles.hi}>{greeting}<b>{owner.firstName}</b></span>
          <span className={styles.avatar}>{owner.firstName[0]}{owner.lastName[0]}</span>
        </div>
        <div className={styles.acct}>
          <small>Checking &bull;&bull;&bull;&bull; 4417</small>
          <div className={styles.big}><sup>$</sup>{Number(dollars).toLocaleString("en-US")}<span className={styles.cents}>.{cents}</span></div>
        </div>
        <div className={styles.savings}><span>Savings &bull;&bull;&bull;&bull; 0832</span><b>{money(savings)}</b></div>
        <div className={styles.actions}><span>Transfer</span><span>Pay bills</span><span>Deposit</span></div>
      </div>
      <div className={styles.body}>
        <div className={styles.card}>
          <div className={styles.cardHead}>Spending this month<small>{money(spent)}</small></div>
          <div className={styles.split}>{parts.map((part) => <i key={part[0]} style={{ flex: part[2] / sum, background: part[1] }} />)}</div>
          <div className={styles.legend}>{parts.map((part) => <span key={part[0]}><i style={{ background: part[1] }} />{part[0]}<b>{money((spent * part[2]) / sum).replace(/\.\d\d$/, "")}</b></span>)}</div>
        </div>
        <div className={styles.card} style={{ paddingTop: 8, paddingBottom: 4 }}>
          <div className={styles.cardHead}>Recent activity<small>See all</small></div>
          <TxRows rows={rows} />
        </div>
      </div>
    </>
  );
}

function Detail({ tx, pending }: { tx: Tx; pending?: boolean }) {
  return (
    <div className={styles.alert}>
      <div className={styles.merchant}>
        <div className={styles.logo} style={{ background: tx.hue }}><Icon name={tx.icon} size={32} stroke={1.8} /></div>
        <div className={styles.name}>{tx.name}</div>
        <div className={styles.amountBig}>{tx.credit ? "+" : ""}{money(tx.amount)}</div>
        {pending && <span className={styles.status}><Icon name="clock" size={13} stroke={2.4} />Pending</span>}
      </div>
      <svg className={styles.minimap} viewBox="0 0 358 112" aria-hidden="true">
        <rect width="358" height="112" fill="#e9e5dc" />
        <rect x="0" y="40" width="358" height="10" fill="#fff" />
        <rect x="0" y="84" width="358" height="8" fill="#fff" />
        <rect x={60 + (tx.amount % 7) * 20} y="0" width="9" height="112" fill="#fff" />
        <rect x="230" y="0" width="9" height="112" fill="#fff" />
        <circle cx={100 + (tx.amount % 9) * 18} cy="45" r="16" fill="#0b6e4f" opacity="0.18" />
        <circle cx={100 + (tx.amount % 9) * 18} cy="45" r="7" fill="#0b6e4f" stroke="#fff" strokeWidth="2.5" />
      </svg>
      <div className={styles.facts}>
        <div className={styles.fact}><span>Card</span><span>Debit &bull;&bull;&bull;&bull; 4417</span></div>
        <div className={styles.fact}><span>Time</span><span>{when(tx.at)}</span></div>
        <div className={styles.fact}><span>Location</span><span>{tx.place}</span></div>
        <div className={styles.fact}><span>Category</span><span>{tx.category}</span></div>
      </div>
      {pending && (
        <>
          <div className={styles.ask}>Was this you?</div>
          <div className={styles.yes}>Yes, it was me</div>
          <div className={styles.no}>No, report it</div>
        </>
      )}
    </div>
  );
}

const subChrome = (title: string, done = false) => (
  <header className={styles.subHead}><span><Icon name="chevronLeft" size={22} stroke={2.6} />{done ? "" : "Back"}</span><b>{title}</b><span>{done ? "Done" : ""}</span></header>
);

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
const keyPos = (key: string) => {
  const index = keys.indexOf(key);
  return { x: 65 + (index % 3) * 130, y: 506 + Math.floor(index / 3) * 64 };
};

function Keypad({ amount, to }: { amount: string; to: string }) {
  return (
    <div className={styles.amountPanel}>
      <div className={styles.toLine}>To <b>{to}</b></div>
      <div className={styles.typed}>${amount || "0"}</div>
      <div className={styles.from}>From Checking &bull;&bull;4417</div>
      <div className={styles.keypad}>{keys.map((key) => <span key={key}>{key}</span>)}</div>
      <div className={styles.cta} data-on={Boolean(amount)}>Review</div>
    </div>
  );
}

/** Steps a person takes inside the balance view, generated into shots below. */
type Step = { panel: string; enter: Shot["enter"]; tap?: Shot["tap"]; scroll?: number; flicks?: number };

/**
 * Banking in simulated time: flick through activity, open a charge, back,
 * then send money (recipient, keypad, review sheet, sent) and return.
 */
function balanceSession({ seed, duration, clock, owner }: ScreenProps): Session {
  const rng = createRng(hash(seed, "bank-session"));
  const total = Math.max(4, duration);
  const rows = activity(seed, owner, clock, 16);
  const to = contacts[hash(seed, "to") % contacts.length];
  const amount = String(rng.pick([15, 20, 25, 32, 45, 60, 75, 120, 250, 38]));
  const memo = rng.pick(memos);
  const pick = (a: number) => Math.min(rows.length - 1, a);
  const txA = pick(rng.int(0, 4));
  const txB = pick(rng.int(5, 12));
  const homeTx = (index: number) => ({ x: 195, y: 560 + index * 54 - 260 });
  const flow: Step[] = [
    { panel: "home", enter: "cut", scroll: 260, flicks: 2 },
    { panel: "tx-a", enter: "push", tap: homeTx(txA) },
    { panel: "home", enter: "pop", scroll: 480, flicks: 2 },
    { panel: "tx-b", enter: "push", tap: { x: 195, y: 420 } },
    { panel: "home", enter: "pop", scroll: 0, flicks: 2 },
    { panel: "recipient", enter: "push", tap: { x: 70, y: 420 }, scroll: 60 },
    { panel: "amount-1", enter: "push", tap: { x: 195, y: 260 + (hash(seed) % 5) * 60 } },
    { panel: "amount-2", enter: "cut", tap: keyPos(amount[0]) },
    { panel: "amount-3", enter: "cut", tap: keyPos(amount[amount.length - 1]) },
    { panel: "review", enter: "sheet", tap: { x: 195, y: 762 } },
    { panel: "sent", enter: "fade", tap: { x: 195, y: 760 } },
    { panel: "home", enter: "dismiss", tap: { x: 195, y: 760 }, scroll: 300, flicks: 2 },
  ];
  // Short scenes start somewhere inside the flow, so neighbouring phones differ.
  const starts = [0, 0, 2, 4, 5];
  let index = total <= 6 ? starts[seed % starts.length] : 0;
  const shots: Shot[] = [];
  let t = 0;
  while (t < total) {
    const step = flow[index % flow.length];
    shots.push({ ...step, at: t, enter: shots.length ? step.enter : "cut", tap: shots.length ? step.tap : undefined });
    t += rng.range(1.35, 1.9);
    index++;
  }
  const used = new Set(shots.map((shot) => shot.panel));
  const typed = [amount.slice(0, 1), amount];
  const all: Record<string, () => Panel> = {
    home: () => ({ body: <Home seed={seed} clock={clock} owner={owner} rows={rows} />, className: styles.grouped }),
    "tx-a": () => ({ body: <Detail tx={rows[txA]} />, chrome: subChrome("Transaction"), top: 98 }),
    "tx-b": () => ({ body: <Detail tx={rows[txB]} />, chrome: subChrome("Transaction"), top: 98 }),
    recipient: () => ({
      top: 98,
      chrome: subChrome("Send money"),
      body: (
        <div className={styles.people}>
          <div className={styles.searchField}><Icon name="search" size={16} stroke={2.2} />Name, email or phone</div>
          <div className={styles.recentLabel}>Recent</div>
          {contacts.slice(0, 8).map((name, i) => (
            <div key={i} className={styles.person}>
              <span className={styles.face}>{name.split(" ").map((part) => part[0]).join("")}</span>
              <div>{name}<small>Last sent {money(20 + ((seed + i * 7) % 90))}</small></div>
            </div>
          ))}
        </div>
      ),
    }),
    "amount-1": () => ({ body: <Keypad amount="" to={to} />, chrome: subChrome("Amount"), top: 98 }),
    "amount-2": () => ({ body: <Keypad amount={typed[0]} to={to} />, chrome: subChrome("Amount"), top: 98 }),
    "amount-3": () => ({ body: <Keypad amount={typed[1]} to={to} />, chrome: subChrome("Amount"), top: 98 }),
    review: () => ({
      className: styles.sheetPanel,
      body: (
        <div className={styles.review}>
          <div className={styles.grabber} />
          <div className={styles.reviewTitle}>Review transfer</div>
          <div className={styles.typed}>{money(Number(amount))}</div>
          <div className={styles.facts}>
            <div className={styles.fact}><span>To</span><span>{to}</span></div>
            <div className={styles.fact}><span>From</span><span>Checking &bull;&bull;4417</span></div>
            <div className={styles.fact}><span>Memo</span><span>{memo}</span></div>
            <div className={styles.fact}><span>Arrives</span><span>In minutes</span></div>
          </div>
          <div className={styles.yes}>Send {money(Number(amount))}</div>
        </div>
      ),
    }),
    sent: () => ({
      body: (
        <div className={styles.sent}>
          <span className={styles.sentCheck}><Icon name="check" size={44} stroke={3} /></span>
          <div className={styles.reviewTitle}>Sent</div>
          <p>{money(Number(amount))} to {to}<br />{memo} · {formatTime(clock)}</p>
          <div className={styles.yes}>Done</div>
        </div>
      ),
    }),
  };
  const panels: Record<string, Panel> = {};
  for (const id of used) panels[id] = all[id]();
  return { duration: total, shots, panels };
}

/**
 * A purchase alert: read it, confirm it was you, file it under a category,
 * then skim the rest of the day's activity and open another charge.
 */
function alertSession({ seed, duration, clock, owner }: ScreenProps): Session {
  const rng = createRng(hash(seed, "bank-alert"));
  const total = Math.max(4, duration);
  const charge = purchase(rng, owner, "alert", clock - 1);
  const rows = [charge, ...activity(seed, owner, clock - 30, 19)];
  const chosen = categories.findIndex((item) => item.name === charge.category);
  const flow: Step[] = [
    { panel: "alert", enter: "cut" },
    { panel: "category", enter: "sheet", tap: { x: 195, y: 700 } },
    { panel: "alert-ok", enter: "dismiss", tap: { x: 195, y: 142 + Math.max(0, chosen) * 44 } },
    { panel: "list", enter: "push", tap: { x: 40, y: 76 }, scroll: 200, flicks: 2 },
    { panel: "tx", enter: "push", tap: { x: 195, y: 470 } },
    { panel: "list", enter: "pop", scroll: 380, flicks: 2 },
  ];
  const shots: Shot[] = [];
  let t = 0;
  let index = 0;
  while (t < total) {
    const step = flow[index < flow.length ? index : 3 + ((index - flow.length) % 3)];
    shots.push({ ...step, at: t });
    t += rng.range(1.3, 1.8);
    index++;
  }
  const used = new Set(shots.map((shot) => shot.panel));
  const all: Record<string, () => Panel> = {
    alert: () => ({ body: <Detail tx={charge} pending />, chrome: subChrome("Purchase alert", true), top: 98 }),
    "alert-ok": () => ({ body: <Detail tx={{ ...charge, category: categories[Math.max(0, chosen)].name }} />, chrome: subChrome("Purchase alert", true), top: 98 }),
    category: () => ({
      className: styles.sheetPanel,
      body: (
        <div className={styles.review}>
          <div className={styles.grabber} />
          <div className={styles.reviewTitle}>Thanks, {owner.firstName}. Pick a category</div>
          <div className={styles.facts}>
            {categories.map((item, i) => (
              <div key={item.name} className={styles.fact}><span><Icon name={item.icon} size={17} stroke={1.9} /> {item.name}</span><span>{i === chosen ? "✓" : ""}</span></div>
            ))}
          </div>
        </div>
      ),
    }),
    list: () => ({ body: <div className={styles.body}><div className={styles.card}><TxRows rows={rows} /></div></div>, chrome: subChrome("Activity"), top: 98, className: styles.grouped }),
    tx: () => ({ body: <Detail tx={rows[rng.int(1, 6)]} />, chrome: subChrome("Transaction"), top: 98 }),
  };
  const panels: Record<string, Panel> = {};
  for (const id of used) panels[id] = all[id]();
  return { duration: total, shots, panels };
}

export function LedgerScreen(props: ScreenProps) {
  const alert = props.view === "transaction-alert";
  return (
    <div className={styles.root}>
      <Storyboard id={`${props.view}:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => (alert ? alertSession(props) : balanceSession(props))} />
    </div>
  );
}

const ledger: CloneDefinition = {
  Screen: LedgerScreen,
  tone: () => "light",
  fixtures: [
    { view: "balance", label: "payday check", seed: 7, clock: 9 * 60 + 5, duration: 3 },
    { view: "balance", label: "evening look", seed: 2, clock: 21 * 60 + 18, duration: 3 },
    { view: "balance", label: "pay a friend", seed: 0, clock: 19 * 60 + 40, duration: 18 },
    { view: "transaction-alert", label: "purchase alert", seed: 3, clock: 14 * 60 + 36, duration: 2 },
    { view: "transaction-alert", label: "alert then review", seed: 6, clock: 11 * 60 + 2, duration: 9 },
  ],
};

export default ledger;
