import { Icon, Storyboard, ios, type IconName, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash, type Rng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { Owner, ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./wallet.module.css";

const cards = [
  { name: "Ledger Debit", last: "4417", bg: "linear-gradient(135deg, #1f8f6a 0%, #0b4a38 100%)" },
  { name: "Summit Credit", last: "9082", bg: "linear-gradient(135deg, #3a4a7a 0%, #161d3a 100%)" },
  { name: "Copper Rewards", last: "2260", bg: "linear-gradient(135deg, #c27a4a 0%, #5a2f1c 100%)" },
  { name: "Graphite Card", last: "6631", bg: "linear-gradient(135deg, #5d5f66 0%, #1b1c20 100%)" },
  { name: "Harbor Transit", last: "0518", bg: "linear-gradient(135deg, #2f6bb0 0%, #12305a 100%)" },
] as const;

const prefixes = ["Corner", "Bluebird", "Orchard", "Atlas", "Lotus", "Harbor", "Union", "Elm Street", "Juniper", "Ninth Ave", "Canal", "Bowery", "Kestrel", "Linden", "Sunny Side", "Little Pine"];
const kinds: readonly { kind: string; hue: string; icon: IconName; range: readonly [number, number]; category: string }[] = [
  { kind: "Deli", hue: "#c2652f", icon: "fork", range: [4, 16], category: "Food & Drink" },
  { kind: "Coffee", hue: "#3d7a8c", icon: "clock", range: [4, 9], category: "Food & Drink" },
  { kind: "Market", hue: "#4a9a52", icon: "cart", range: [18, 84], category: "Groceries" },
  { kind: "Pharmacy", hue: "#b24747", icon: "bag", range: [9, 46], category: "Health" },
  { kind: "Bakery", hue: "#a8793f", icon: "fork", range: [6, 18], category: "Food & Drink" },
  { kind: "Hardware", hue: "#6a6f78", icon: "tag", range: [12, 52], category: "Home" },
  { kind: "Thai Kitchen", hue: "#9a5aa8", icon: "fork", range: [16, 38], category: "Food & Drink" },
  { kind: "Books", hue: "#7a5b3a", icon: "paper", range: [11, 34], category: "Shopping" },
  { kind: "Laundromat", hue: "#4d8fb3", icon: "refresh", range: [6, 22], category: "Services" },
  { kind: "Wine & Spirits", hue: "#8c2f4a", icon: "bag", range: [14, 58], category: "Shopping" },
  { kind: "Cinema", hue: "#5b4aa0", icon: "video", range: [14, 32], category: "Entertainment" },
  { kind: "Taqueria", hue: "#d08a1e", icon: "fork", range: [9, 24], category: "Food & Drink" },
];
const places = ["Brooklyn, NY", "New York, NY", "Queens, NY", "Long Island City, NY", "Jersey City, NJ", "Hoboken, NJ"];

type Tx = { id: string; name: string; hue: string; icon: IconName; amount: number; at: number; place: string; category: string; pending: boolean; points: number };

const money = (value: number) => `$${value.toFixed(2)}`;
const when = (minute: number) => (minute >= 0 ? formatTime(minute) : minute > -1440 ? "Yesterday" : ["Sunday", "Saturday", "Friday", "Thursday"][Math.min(3, Math.floor(-minute / 1440) - 1)]);

function merchant(rng: Rng, owner: Owner, id: string, at: number, pending: boolean): Tx {
  if (rng.chance(0.12)) return { id, name: "Metro Fare Gate", hue: "#2f6bb0", icon: "train", amount: 2.9, at, place: "New York, NY", category: "Transit", pending, points: 0 };
  const kind = rng.pick(kinds);
  const name = `${rng.pick(prefixes)} ${kind.kind}`;
  const place = rng.chance(0.3) ? `${owner.home}, NY` : rng.chance(0.3) ? `${owner.work}, NY` : rng.pick(places);
  const amount = rng.range(kind.range[0], kind.range[1]);
  return { id, name, hue: kind.hue, icon: kind.icon, amount, at, place, category: kind.category, pending, points: Math.round(amount * rng.pick([1, 2, 3])) };
}

function transactions(seed: number, card: number, owner: Owner, clock: number, count: number): Tx[] {
  const rng = createRng(hash(seed, "wallet-tx", card));
  let at = clock - rng.int(3, 40);
  return Array.from({ length: count }, (_, index) => {
    const tx = merchant(rng, owner, `c${card}-${index}`, at, index < 2 && card === 0);
    at -= rng.int(40, 420);
    return tx;
  });
}

function CardFace({ card, label }: { card: (typeof cards)[number]; label: string }) {
  return (
    <div className={styles.card} style={{ background: card.bg }}>
      <div className={styles.cardTop}><span>{card.name}</span><span className={styles.chip} /></div>
      <div>
        <div className={styles.num}>&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {card.last}</div>
        <div className={styles.holder}><span>{label}</span><span>Contactless</span></div>
      </div>
    </div>
  );
}

function TxList({ rows }: { rows: readonly Tx[] }) {
  return (
    <div className={styles.list}>
      {rows.map((row) => (
        <div key={row.id} className={styles.tx}>
          <span className={styles.logo} style={{ background: row.hue }}>{row.name[0]}</span>
          <div className={styles.txBody}>
            <span className={styles.txName}>{row.name}</span>
            <span className={`${styles.txAmount} ${row.pending ? styles.pending : ""}`}>{money(row.amount)}</span>
            <span className={styles.txSub}>{row.pending ? "Pending" : row.place}</span>
            <span className={styles.txSub}>{when(row.at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TxDetail({ tx, card }: { tx: Tx; card: (typeof cards)[number] }) {
  return (
    <div className={styles.detail}>
      <span className={styles.bigLogo} style={{ background: tx.hue }}><Icon name={tx.icon} size={34} stroke={1.8} /></span>
      <div className={styles.detailName}>{tx.name}</div>
      <div className={styles.amount}>{money(tx.amount)}</div>
      <div className={styles.merchant}>{when(tx.at)} · {tx.place}</div>
      <div className={styles.facts}>
        <div><span>Status</span><span>{tx.pending ? "Pending" : "Approved"}</span></div>
        <div><span>Card</span><span>{card.name} &bull;&bull;{card.last}</span></div>
        <div><span>Category</span><span>{tx.category}</span></div>
        <div><span>Rewards</span><span>{tx.points} pts</span></div>
      </div>
      <div className={styles.report}>Report an Issue</div>
    </div>
  );
}

const detailChrome = (
  <header className={styles.subHead}><span><Icon name="chevronLeft" size={22} stroke={2.6} />Wallet</span><span>Done</span></header>
);

const ROW = 59;
const LIST_TOP = 225;

/**
 * Wallet transactions in simulated time: flick down a card's activity, tap a
 * purchase, back out, tap the card to switch to the next one, repeat.
 */
function transactionsSession({ seed, duration, clock, owner }: ScreenProps): Session {
  const rng = createRng(hash(seed, "wallet-session"));
  const total = Math.max(4, duration);
  const deck = [seed % cards.length, (seed + 1) % cards.length, (seed + 3) % cards.length];
  const lists = deck.map((_, index) => transactions(seed, index, owner, clock, 11));
  const panels: Record<string, Panel> = {};
  const shots: Shot[] = [];
  const used = new Set<number>();
  let t = 0;
  let deckIndex = 0;
  let details = 0;
  let scroll = 0;
  shots.push({ panel: "card-0", at: 0, scroll: rng.int(120, 220), flicks: 2, enter: "cut" });
  used.add(0);
  scroll = shots[0].scroll ?? 0;
  t = rng.range(1.4, 2);
  while (t < total) {
    const step = rng.range(1.35, 2);
    const action = rng.weighted([["detail", 3], ["switch", 2], ["flick", 1]] as const);
    if (action === "detail" && details < 4) {
      const row = Math.min(10, Math.floor((scroll + rng.int(80, 420) - LIST_TOP) / ROW));
      const index = Math.max(0, row);
      const id = `detail-${details % 2}`;
      const tx = lists[deckIndex][index];
      panels[id] = { body: <TxDetail tx={tx} card={cards[deck[deckIndex]]} />, chrome: detailChrome, top: 98, className: styles.panelDark };
      shots.push({ panel: id, at: t, enter: "push", tap: { x: 195, y: Math.max(140, Math.min(780, LIST_TOP + 30 + index * ROW - scroll)) } });
      t += step;
      scroll = Math.min(420, scroll + rng.int(60, 180));
      shots.push({ panel: `card-${deckIndex}`, at: t, enter: "pop", scroll, flicks: 2 });
      details++;
    } else if (action === "switch") {
      deckIndex = (deckIndex + 1) % deck.length;
      used.add(deckIndex);
      scroll = rng.int(100, 300);
      shots.push({ panel: `card-${deckIndex}`, at: t, enter: "fade", scroll, flicks: 2, tap: { x: 195, y: 130 } });
    } else {
      scroll = Math.min(420, scroll + rng.int(90, 200)) - (rng.chance(0.3) ? 160 : 0);
      shots.push({ panel: `card-${deckIndex}`, at: t, enter: "cut", scroll: Math.max(0, scroll), flicks: 2 });
    }
    t += step;
  }
  for (const index of used) {
    const card = cards[deck[index]];
    panels[`card-${index}`] = {
      className: styles.panelDark,
      body: (
        <div className={styles.head}>
          <h1 className={styles.title}>Wallet</h1>
          <div className={styles.mini} style={{ background: card.bg }}>
            <span>{card.name}<br /><small>&bull;&bull;&bull;&bull; {card.last}</small></span>
            <Icon name="card" size={26} stroke={1.6} />
          </div>
          <div className={styles.label}>Latest Transactions</div>
          <TxList rows={lists[index]} />
        </div>
      ),
    };
  }
  return { duration: total, shots, panels };
}

/**
 * Tap to pay: the card stack, the chosen card held to the reader, the check,
 * then the receipt. A one-minute scene is a flash of the finished payment.
 */
function paySession({ seed, duration, clock, owner }: ScreenProps): Session {
  const rng = createRng(hash(seed, "wallet-pay"));
  const total = Math.max(1, duration);
  const card = cards[seed % cards.length];
  const tx = merchant(rng, owner, "pay", clock, false);
  const stack = (
    <div className={styles.stack}>
      {cards.map((item, index) => (
        <div key={item.last} className={styles.stackCard} style={{ top: 120 + index * 64, background: item.bg }}>
          <div className={styles.cardTop}><span>{item.name}</span><span>&bull;&bull;{item.last}</span></div>
        </div>
      ))}
    </div>
  );
  const pay = (done: boolean) => (
    <div className={styles.pay}>
      <div className={styles.ghost} style={{ top: 132, background: cards[(seed + 1) % cards.length].bg }} />
      <CardFace card={card} label={done ? "Paid" : "Default card"} />
      <div className={styles.prompt}>
        <span className={`${styles.wave} ${done ? styles.done : ""}`}>
          {done ? <Icon name="check" size={40} stroke={3} /> : <Icon name="more" size={34} stroke={3} />}
        </span>
        {done ? (
          <>
            <div>Done</div>
            <div className={styles.amount}>{money(tx.amount)}</div>
            <div className={styles.merchant}>{tx.name} · {formatTime(clock)}</div>
          </>
        ) : (
          <div>Hold Near Reader</div>
        )}
      </div>
      {!done && <div className={styles.passcode}>Double-click side button to switch cards</div>}
    </div>
  );
  const panels: Record<string, Panel> = { done: { body: pay(true), className: styles.panelDark } };
  const shots: Shot[] = [];
  if (total < 3) {
    shots.push({ panel: "done", at: 0, enter: "cut" });
  } else {
    panels.stack = { body: stack, className: styles.panelDark };
    panels.hold = { body: pay(false), className: styles.panelDark };
    shots.push({ panel: "stack", at: 0, enter: "cut" });
    shots.push({ panel: "hold", at: 1.3, enter: "fade", tap: { x: 195, y: 120 + (seed % cards.length) * 64 + 30 } });
    shots.push({ panel: "done", at: 2.6, enter: "fade" });
    if (total >= 4) {
      panels.receipt = { body: <TxDetail tx={{ ...tx, pending: true }} card={card} />, chrome: detailChrome, top: 98, className: styles.panelDark };
      shots.push({ panel: "receipt", at: 3.9, enter: "sheet", scroll: 120, tap: { x: 195, y: 560 } });
    }
  }
  return { duration: total, shots, panels };
}

export function WalletScreen(props: ScreenProps) {
  const pay = props.view !== "transactions";
  return (
    <div className={`${styles.root} ${ios.dark}`}>
      <Storyboard
        id={`${props.view}:${props.seed}:${props.duration}`}
        elapsed={props.elapsed}
        build={() => (pay ? paySession(props) : transactionsSession(props))}
      />
    </div>
  );
}

const wallet: CloneDefinition = {
  Screen: WalletScreen,
  tone: () => "light",
  fixtures: [
    { view: "tap-to-pay", label: "coffee tap", seed: 1, clock: 8 * 60 + 41, duration: 1 },
    { view: "tap-to-pay", label: "grocery checkout", seed: 3, clock: 18 * 60 + 12, duration: 5 },
    { view: "transactions", label: "after lunch", seed: 4, clock: 13 * 60 + 25, duration: 4 },
    { view: "transactions", label: "long review", seed: 9, clock: 21 * 60 + 5, duration: 14 },
  ],
};

export default wallet;
