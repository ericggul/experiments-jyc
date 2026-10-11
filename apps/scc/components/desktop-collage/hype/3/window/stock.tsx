"use client";

import { stockFor } from "../model/corpus";
import { useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";
import styles from "./stock.module.css";

// A quote page in the grammar of a trading app: a big green number, a chart
// going up and to the right, and a watchlist where everything AI is green.

export default function Stock({ keyword, seed }: WindowParams) {
  const quote = stockFor(keyword, seed);
  useTitle(`${quote.symbol} ${quote.price} (${quote.percent}) · ${quote.name}`);
  useHypeApi({ focus: () => {}, type: () => {}, submit: () => {}, act: () => {} });
  const width = 800;
  const height = 260;
  const min = Math.min(...quote.points);
  const max = Math.max(...quote.points);
  const x = (i: number) => (i / (quote.points.length - 1)) * width;
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * (height - 24) - 12;
  const line = quote.points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <span className={styles.brand}>▲ Ledger</span>
        <span className={styles.search}>Search symbols</span>
        <div className={styles.navEnd}><span>Portfolio</span><span>Watchlist</span><span className={styles.avatar}>J</span></div>
      </header>
      <main className={styles.layout}>
        <section className={styles.quote}>
          <div className={styles.symbol}><strong>{quote.symbol}</strong><span>{quote.name} · {quote.exchange}</span></div>
          <div className={styles.price}><strong>{quote.price}</strong><span className={quote.up ? styles.up : styles.down}>{quote.change} ({quote.percent})</span><em>{quote.currency} · Today</em></div>
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={styles.chart} role="img" aria-label={`${quote.symbol} chart`}>
            <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22c55e" stopOpacity=".35" /><stop offset="1" stopColor="#22c55e" stopOpacity="0" /></linearGradient></defs>
            <path d={area} fill="url(#g)" />
            <path d={line} fill="none" stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className={styles.ranges}>{["1D", "1W", "1M", "3M", "1Y", "5Y", "ALL"].map((r) => <span key={r} className={r === "1M" ? styles.rangeActive : undefined}>{r}</span>)}</div>
          <div className={styles.stats}>{quote.stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
          <div className={styles.buy}><button type="button">Buy</button><button type="button" className={styles.sell}>Sell</button></div>
          <h2>News</h2>
          <ul className={styles.news}>{quote.headlines.map((headline) => <li key={headline}><span>{headline}</span><em>{Math.floor(headline.length % 5) + 1}h ago</em></li>)}</ul>
        </section>
        <aside className={styles.watch}>
          <h2>AI watchlist</h2>
          {quote.watch.map((row) => (
            <div key={row.symbol} className={styles.row}><strong>{row.symbol}</strong><span>{row.name}</span><em className={row.up ? styles.pillUp : styles.pillDown}>{row.percent}</em></div>
          ))}
          <div className={styles.promo}><strong>You hold 0 of these.</strong><span>Retail inflows into AI names are at a record for the third week.</span><button type="button">Start investing</button></div>
        </aside>
      </main>
    </div>
  );
}
