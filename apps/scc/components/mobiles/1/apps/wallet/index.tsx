import { Icon, ios } from "../../ios";
import { createRng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./wallet.module.css";

const cards = [
  { name: "Ledger Debit", last: "4417", bg: "linear-gradient(135deg, #1f8f6a 0%, #0b4a38 100%)" },
  { name: "Summit Credit", last: "9082", bg: "linear-gradient(135deg, #3a4a7a 0%, #161d3a 100%)" },
  { name: "Copper Rewards", last: "2260", bg: "linear-gradient(135deg, #c27a4a 0%, #5a2f1c 100%)" },
  { name: "Graphite Card", last: "6631", bg: "linear-gradient(135deg, #5d5f66 0%, #1b1c20 100%)" },
];

const merchants: readonly { name: string; hue: string; range: readonly [number, number]; place: string }[] = [
  { name: "Corner Deli", hue: "#c2652f", range: [4, 14], place: "Brooklyn, NY" },
  { name: "Bluebird Coffee", hue: "#3d7a8c", range: [4, 9], place: "New York, NY" },
  { name: "Metro Fare Gate", hue: "#2f6bb0", range: [2, 3], place: "New York, NY" },
  { name: "Greenleaf Market", hue: "#4a9a52", range: [18, 84], place: "Queens, NY" },
  { name: "Pharma Plus", hue: "#b24747", range: [9, 46], place: "New York, NY" },
  { name: "Orchard Bakery", hue: "#a8793f", range: [6, 18], place: "Brooklyn, NY" },
  { name: "Atlas Hardware", hue: "#6a6f78", range: [12, 52], place: "Brooklyn, NY" },
  { name: "Lotus Thai Kitchen", hue: "#9a5aa8", range: [16, 38], place: "New York, NY" },
];

const money = (value: number) => `$${value.toFixed(2)}`;

function pickCard(seed: number) {
  return cards[seed % cards.length];
}

function TapToPay({ seed, elapsed, duration, clock }: ScreenProps) {
  const rng = createRng(seed);
  const card = pickCard(seed);
  const merchant = merchants[seed % merchants.length];
  const amount = rng.range(merchant.range[0], merchant.range[1]);
  const done = elapsed >= Math.max(1, Math.floor(duration / 2));
  const next = cards[(seed + 1) % cards.length];
  return (
    <div className={`${styles.root} ${ios.dark}`}>
      <div className={styles.pay}>
        <div className={styles.ghost} style={{ top: 132, background: next.bg }} />
        <div className={styles.card} style={{ background: card.bg }}>
          <div className={styles.cardTop}><span>{card.name}</span><span className={styles.chip} /></div>
          <div>
            <div className={styles.num}>&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {card.last}</div>
            <div className={styles.holder}><span>Default card</span><span>Contactless</span></div>
          </div>
        </div>
        <div className={styles.prompt}>
          <span className={`${styles.wave} ${done ? styles.done : ""}`}>
            {done ? <Icon name="check" size={40} stroke={3} /> : <Icon name="more" size={34} stroke={3} />}
          </span>
          {done ? (
            <>
              <div>Done</div>
              <div className={styles.amount}>{money(amount)}</div>
              <div className={styles.merchant}>{merchant.name} · {formatTime(clock)}</div>
            </>
          ) : (
            <div>Hold Near Reader</div>
          )}
        </div>
        {!done && <div className={styles.passcode}>Double-click side button to switch cards</div>}
      </div>
    </div>
  );
}

function Transactions({ seed, clock }: ScreenProps) {
  const rng = createRng(seed);
  const card = pickCard(seed);
  const first = clock - rng.int(3, 30);
  const gaps = Array.from({ length: 9 }, () => rng.int(70, 400));
  const rows = Array.from({ length: 9 }, (_, index) => {
    const merchant = merchants[(seed + index * 3 + rng.int(0, 2)) % merchants.length];
    const amount = rng.range(merchant.range[0], merchant.range[1]);
    return { id: `${index}-${merchant.name}`, merchant, amount, at: first - gaps.slice(0, index).reduce((a, b) => a + b, 0), pending: index < 2 };
  });
  const dayName = (minute: number) => (minute >= 0 ? formatTime(minute) : "Yesterday");
  return (
    <div className={`${styles.root} ${ios.dark}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>Wallet</h1>
        <div className={styles.mini} style={{ background: card.bg }}>
          <span>{card.name}<br /><small>&bull;&bull;&bull;&bull; {card.last}</small></span>
          <Icon name="card" size={26} stroke={1.6} />
        </div>
        <div className={styles.label}>Latest Transactions</div>
        <div className={styles.list}>
          {rows.map((row) => (
            <div key={row.id} className={styles.tx}>
              <span className={styles.logo} style={{ background: row.merchant.hue }}>{row.merchant.name[0]}</span>
              <div className={styles.txBody}>
                <span className={styles.txName}>{row.merchant.name}</span>
                <span className={`${styles.txAmount} ${row.pending ? styles.pending : ""}`}>{money(row.amount)}</span>
                <span className={styles.txSub}>{row.pending ? "Pending" : row.merchant.place}</span>
                <span className={styles.txSub}>{dayName(row.at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WalletScreen(props: ScreenProps) {
  return props.view === "transactions" ? <Transactions {...props} /> : <TapToPay {...props} />;
}

const wallet: CloneDefinition = {
  Screen: WalletScreen,
  tone: () => "light",
  fixtures: [
    { view: "tap-to-pay", label: "coffee tap", seed: 1, clock: 8 * 60 + 41, duration: 3 },
    { view: "tap-to-pay", label: "grocery checkout", seed: 3, clock: 18 * 60 + 12, duration: 4 },
    { view: "transactions", label: "after lunch", seed: 4, clock: 13 * 60 + 25, duration: 4 },
  ],
};

export default wallet;
