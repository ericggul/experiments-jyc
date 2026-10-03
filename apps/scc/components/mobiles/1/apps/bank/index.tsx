import { Icon, type IconName } from "../../ios";
import { createRng } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./bank.module.css";

const merchants: readonly { name: string; icon: IconName; hue: string; range: readonly [number, number]; place: string }[] = [
  { name: "Greenleaf Market", icon: "cart", hue: "#4a9a52", range: [24, 96], place: "Queens, NY" },
  { name: "Bluebird Coffee", icon: "clock", hue: "#3d7a8c", range: [4, 9], place: "New York, NY" },
  { name: "Metro Fare Gate", icon: "train", hue: "#2f6bb0", range: [2, 34], place: "New York, NY" },
  { name: "Lotus Thai Kitchen", icon: "fork", hue: "#9a5aa8", range: [18, 42], place: "New York, NY" },
  { name: "Pharma Plus", icon: "bag", hue: "#b24747", range: [9, 48], place: "New York, NY" },
  { name: "Atlas Hardware", icon: "tag", hue: "#6a6f78", range: [14, 62], place: "Brooklyn, NY" },
  { name: "Northside Cinema", icon: "video", hue: "#7a4aa0", range: [16, 34], place: "Brooklyn, NY" },
  { name: "Harbor Electric", icon: "bolt", hue: "#c68a1e", range: [64, 148], place: "Online" },
];

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

function Balance({ seed, clock, owner }: ScreenProps) {
  const rng = createRng(seed);
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
  const gaps = Array.from({ length: 6 }, () => rng.int(60, 360));
  const first = clock - rng.int(20, 90);
  const rows = Array.from({ length: 6 }, (_, index) => {
    const merchant = merchants[(seed + index * 5) % merchants.length];
    const credit = index === 4;
    return { id: `${index}-${merchant.name}`, merchant, amount: credit ? rng.range(900, 2200) : rng.range(merchant.range[0], merchant.range[1]), credit, at: first - gaps.slice(0, index).reduce((a, b) => a + b, 0) };
  });
  return (
    <div className={styles.root}>
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
      </div>
      <div className={styles.body}>
        <div className={styles.card}>
          <div className={styles.cardHead}>Spending this month<small>{money(spent)}</small></div>
          <div className={styles.split}>{parts.map((part) => <i key={part[0]} style={{ flex: part[2] / sum, background: part[1] }} />)}</div>
          <div className={styles.legend}>{parts.map((part) => <span key={part[0]}><i style={{ background: part[1] }} />{part[0]}<b>{money((spent * part[2]) / sum).replace(/\.\d\d$/, "")}</b></span>)}</div>
        </div>
        <div className={styles.card} style={{ paddingTop: 8, paddingBottom: 4 }}>
          {rows.map((row) => (
            <div key={row.id} className={styles.tx}>
              <span className={styles.ico}><Icon name={row.credit ? "bank" : row.merchant.icon} size={17} stroke={1.9} /></span>
              <div>{row.credit ? "Payroll deposit" : row.merchant.name}<small>{row.at >= 0 ? formatTime(row.at) : "Yesterday"}</small></div>
              <b className={row.credit ? styles.plus : undefined}>{row.credit ? "+" : "−"}{money(row.amount)}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Alert({ seed, clock }: ScreenProps) {
  const rng = createRng(seed);
  const merchant = merchants[seed % merchants.length];
  const amount = rng.range(merchant.range[0], merchant.range[1]);
  return (
    <div className={styles.alert}>
      <div className={styles.close}><span>Done</span><Icon name="more" size={22} stroke={2.6} /></div>
      <div className={styles.merchant}>
        <div className={styles.logo} style={{ background: merchant.hue }}>{merchant.name[0]}</div>
        <div className={styles.name}>{merchant.name}</div>
        <div className={styles.amountBig}>{money(amount)}</div>
        <span className={styles.status}><Icon name="clock" size={13} stroke={2.4} />Pending</span>
      </div>
      <svg className={styles.minimap} viewBox="0 0 358 112" aria-hidden="true">
        <rect width="358" height="112" fill="#e9e5dc" />
        <rect x="0" y="40" width="358" height="10" fill="#fff" />
        <rect x="0" y="84" width="358" height="8" fill="#fff" />
        <rect x="90" y="0" width="9" height="112" fill="#fff" />
        <rect x="230" y="0" width="9" height="112" fill="#fff" />
        <rect x="250" y="56" width="70" height="24" rx="3" fill="#cfe3c2" />
        <circle cx="164" cy="45" r="16" fill="#0b6e4f" opacity="0.18" />
        <circle cx="164" cy="45" r="7" fill="#0b6e4f" stroke="#fff" strokeWidth="2.5" />
      </svg>
      <div className={styles.facts}>
        <div className={styles.fact}><span>Card</span><span>Debit &bull;&bull;&bull;&bull; 4417</span></div>
        <div className={styles.fact}><span>Time</span><span>Today, {formatTime(clock)}</span></div>
        <div className={styles.fact}><span>Location</span><span>{merchant.place}</span></div>
        <div className={styles.fact}><span>Category</span><span>{merchant.name.includes("Market") ? "Groceries" : "Shopping & dining"}</span></div>
      </div>
      <div className={styles.ask}>Was this you?</div>
      <div className={styles.yes}>Yes, it was me</div>
      <div className={styles.no}>No, report it</div>
    </div>
  );
}

export function LedgerScreen(props: ScreenProps) {
  return props.view === "transaction-alert" ? <Alert {...props} /> : <Balance {...props} />;
}

const ledger: CloneDefinition = {
  Screen: LedgerScreen,
  tone: (view) => (view === "balance" ? "light" : "dark"),
  fixtures: [
    { view: "balance", label: "payday check", seed: 7, clock: 9 * 60 + 5, duration: 3 },
    { view: "balance", label: "evening look", seed: 2, clock: 21 * 60 + 18, duration: 3 },
    { view: "transaction-alert", label: "purchase alert", seed: 3, clock: 14 * 60 + 36, duration: 2 },
  ],
};

export default ledger;
