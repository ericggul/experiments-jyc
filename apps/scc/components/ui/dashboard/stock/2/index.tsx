"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  economicEvents,
  functions,
  headlines,
  indexTape,
  securities,
  worldIndices,
  type TerminalFunction,
  type TerminalSecurity,
} from "./data";
import styles from "./terminal.module.css";

function signed(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function tone(value: number) {
  return value >= 0 ? styles.positive : styles.negative;
}

function heatCell(value: number, strongAt: number) {
  const intensity = Math.abs(value) / strongAt;
  const direction = value >= 0 ? "Positive" : "Negative";
  const strength = intensity >= 0.67 ? "Strong" : intensity >= 0.25 ? "Medium" : "Soft";
  return styles[`heat${direction}${strength}`];
}

const functionNames: Record<TerminalFunction, string> = {
  HOME: "Market Monitor",
  WEI: "World Equity Indices",
  GP: "Graph Price",
  TOP: "Top News",
  ECO: "Economic Calendar",
};

const functionActions: Record<TerminalFunction, string[]> = {
  HOME: ["Markets", "Watchlist", "Chart", "News", "Alerts", "Layout", "Export", "Help"],
  WEI: ["Movers", "Regions", "Ratios", "Futures", "Currencies", "Settings", "Export", "Help"],
  GP: ["Period", "Studies", "Compare", "News", "Annotate", "Events", "Export", "Help"],
  TOP: ["All Stories", "Markets", "Companies", "Politics", "Economics", "Research", "Saved", "Help"],
  ECO: ["Calendars", "Countries", "Releases", "Speakers", "Alerts", "Settings", "Export", "Help"],
};

function FunctionHeading({ code, detail }: { code: TerminalFunction; detail?: string }) {
  return (
    <div className={styles.functionHeading}>
      <strong>{code}</strong>
      <span>{functionNames[code]}</span>
      {detail ? <span className={styles.headingDetail}>{detail}</span> : null}
    </div>
  );
}

function WEIView() {
  return (
    <section className={styles.functionScreen} aria-label="World equity indices">
      <FunctionHeading code="WEI" detail="Cash indices · Local currency" />
      <div className={styles.filterBar}>
        <span><b>1</b> Overview</span><span><b>2</b> Americas</span><span><b>3</b> EMEA</span><span><b>4</b> Asia/Pacific</span>
        <span className={styles.filterStatus}>Last update 13:06:24 ET</span>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.dataTable}>
          <thead><tr><th>Index</th><th>Ticker</th><th>Last</th><th>Net Chg</th><th>% Chg</th><th>Time</th><th>YTD %</th><th>P/E</th></tr></thead>
          <tbody>
            {(["Americas", "EMEA", "Asia/Pacific"] as const).map((region) => (
              <FragmentRows key={region} region={region} />
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.screenNote}>Markets shown in local trading currency. Delayed venues are marked by their last update time.</div>
    </section>
  );
}

function FragmentRows({ region }: { region: "Americas" | "EMEA" | "Asia/Pacific" }) {
  return (
    <>
      <tr className={styles.regionRow}><td colSpan={8}>{region}</td></tr>
      {worldIndices.filter((item) => item.region === region).map((item) => (
        <tr key={item.id}>
          <td>{item.name}</td><td className={styles.linkText}>{item.ticker}</td><td>{item.last}</td>
          <td className={heatCell(item.percent, 1.5)}>{signed(item.net)}</td><td className={heatCell(item.percent, 1.5)}>{signed(item.percent)}%</td>
          <td className={styles.muted}>{item.time}</td><td className={heatCell(item.ytd, 15)}>{signed(item.ytd)}%</td><td>{item.pe}</td>
        </tr>
      ))}
    </>
  );
}

type Candle = { open: number; high: number; low: number; close: number; volume: number };

function candlesFor(security: TerminalSecurity): Candle[] {
  return security.series.map((close, index) => {
    const open = index === 0 ? close - security.change / 18 : security.series[index - 1];
    const range = Math.max(Math.abs(close - open), security.price * 0.0017);
    return {
      open,
      close,
      high: Math.max(open, close) + range * (0.45 + (index % 3) * 0.13),
      low: Math.min(open, close) - range * (0.38 + (index % 4) * 0.09),
      volume: 34 + ((index * 29 + security.symbol.charCodeAt(0)) % 67),
    };
  });
}

function PriceChart({ security }: { security: TerminalSecurity }) {
  const candles = candlesFor(security);
  const width = 1060;
  const height = 500;
  const left = 20;
  const right = 78;
  const top = 24;
  const priceBottom = 372;
  const volumeTop = 405;
  const volumeBottom = 470;
  const min = Math.min(...candles.map((item) => item.low));
  const max = Math.max(...candles.map((item) => item.high));
  const spread = max - min || 1;
  const x = (index: number) => left + (index / (candles.length - 1)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - min) / spread) * (priceBottom - top);
  const maxVolume = Math.max(...candles.map((item) => item.volume));
  const movingAverage = candles.map((_, index) => {
    const start = Math.max(0, index - 4);
    const sample = candles.slice(start, index + 1);
    return sample.reduce((sum, item) => sum + item.close, 0) / sample.length;
  });
  const averagePoints = movingAverage.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const tickValues = Array.from({ length: 6 }, (_, index) => max - (spread / 5) * index);
  const candleWidth = Math.max(5, (width - left - right) / candles.length * 0.42);

  return (
    <svg className={styles.priceChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${security.symbol} intraday candlestick and volume chart`}>
      {tickValues.map((value) => <g key={value}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className={styles.chartGrid} /><text x={width - right + 10} y={y(value) + 4} className={styles.axisText}>{value.toFixed(2)}</text></g>)}
      {[0, 5, 10, 15, 19].map((index) => <line key={index} x1={x(index)} x2={x(index)} y1={top} y2={volumeBottom} className={styles.chartGrid} />)}
      {candles.map((item, index) => {
        const rising = item.close >= item.open;
        const candleClass = rising ? styles.candleUp : styles.candleDown;
        const bodyTop = y(Math.max(item.open, item.close));
        const bodyHeight = Math.max(1.8, Math.abs(y(item.open) - y(item.close)));
        const volumeHeight = (item.volume / maxVolume) * (volumeBottom - volumeTop);
        return <g key={`${security.id}-${index}`} className={candleClass}><line x1={x(index)} x2={x(index)} y1={y(item.high)} y2={y(item.low)} /><rect x={x(index) - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} /><rect className={styles.volumeBar} x={x(index) - candleWidth / 2} y={volumeBottom - volumeHeight} width={candleWidth} height={volumeHeight} /></g>;
      })}
      <polyline points={averagePoints} className={styles.movingAverage} />
      <line x1={left} x2={width - right} y1={volumeTop - 12} y2={volumeTop - 12} className={styles.chartDivider} />
      <text x={left} y={394} className={styles.chartLabel}>VOLUME</text><text x={left + 72} y={394} className={styles.averageLabel}>MA(5)</text>
      <text x={left} y={491} className={styles.axisText}>09:30</text><text x={x(5) - 18} y={491} className={styles.axisText}>10:30</text><text x={x(10) - 18} y={491} className={styles.axisText}>11:30</text><text x={x(15) - 18} y={491} className={styles.axisText}>12:30</text><text x={width - right - 38} y={491} className={styles.axisText}>13:06 ET</text>
      <g transform={`translate(${width - right + 2} ${y(security.price) - 10})`}><rect width="70" height="20" className={styles.lastPriceFlag} /><text x="35" y="14" textAnchor="middle" className={styles.lastPriceText}>{security.price.toFixed(2)}</text></g>
    </svg>
  );
}

function DashboardView({ security, onSelect }: { security: TerminalSecurity; onSelect: (id: string) => void }) {
  return (
    <section className={`${styles.functionScreen} ${styles.dashboardScreen}`} aria-label="Market monitor dashboard">
      <FunctionHeading code="HOME" detail="US session · Integrated monitor" />
      <div className={styles.dashboardStatus}>
        <span><b>NYSE</b> 3,142 adv / 2,088 dec</span><span><b>NASDAQ</b> 2,704 adv / 2,216 dec</span><span><b>VOLUME</b> 8.84B shares</span><span className={styles.sessionState}>● Live consolidated tape</span>
      </div>
      <div className={styles.dashboardGrid}>
        <aside className={styles.dashboardPane}>
          <div className={styles.dashboardPaneTitle}><span>US Equity Monitor</span><b>WEI</b></div>
          <div className={styles.dashboardWatchlist}>
            <div className={styles.watchHeader}><span>Security</span><span>Last</span><span>% Chg</span></div>
            {securities.map((item) => (
              <button type="button" key={item.id} onClick={() => onSelect(item.id)} className={item.id === security.id ? styles.watchActive : ""}>
                <span><strong>{item.symbol}</strong><small>{item.name}</small></span><span>{item.price.toFixed(2)}</span><span className={tone(item.percent)}>{signed(item.percent)}%</span>
              </button>
            ))}
          </div>
          <div className={styles.breadthBlock}><span>Sector breadth</span>{[["Technology",68],["Financials",61],["Industrials",57],["Energy",42],["Utilities",36]].map(([name, value]) => <div key={String(name)}><label>{name}</label><i><b style={{ width: `${value}%` }} /></i><em>{value}%</em></div>)}</div>
        </aside>

        <section className={`${styles.dashboardPane} ${styles.dashboardChartPane}`}>
          <div className={styles.dashboardPaneTitle}><span>{security.symbol} US Equity · Intraday</span><b>GP</b></div>
          <div className={styles.dashboardQuote}><div><strong>{security.price.toFixed(2)}</strong><span className={tone(security.percent)}>{signed(security.change)} &nbsp; {signed(security.percent)}%</span></div><dl><div><dt>High</dt><dd>{security.high.toFixed(2)}</dd></div><div><dt>Low</dt><dd>{security.low.toFixed(2)}</dd></div><div><dt>Volume</dt><dd>{security.volume}</dd></div><div><dt>Mkt Cap</dt><dd>{security.marketCap}</dd></div></dl></div>
          <div className={styles.dashboardChart}><PriceChart security={security} /></div>
          <div className={styles.dashboardMetrics}><span><b>OPEN</b>{security.series[0].toFixed(2)}</span><span><b>VWAP</b>{(security.price - security.change * .18).toFixed(2)}</span><span><b>P/E</b>{security.pe}×</span><span><b>RANGE</b>{security.low.toFixed(2)} — {security.high.toFixed(2)}</span></div>
        </section>

        <aside className={styles.dashboardPane}>
          <div className={styles.dashboardPaneTitle}><span>Market-Moving News</span><b>TOP</b></div>
          <div className={styles.dashboardNews}>
            {headlines.slice(0, 6).map((item, index) => <article key={item.id}><span>{index + 1}</span><div><h2>{item.headline}</h2><p>{item.time} ET &nbsp; {item.flag} &nbsp; <b>{item.related}</b></p></div></article>)}
          </div>
          <div className={styles.dashboardCalendar}><div><span>Next release</span><b>ECO</b></div><strong>13:00</strong><p>30-Year Bond Auction</p><small>Survey — · Prior 4.844%</small></div>
        </aside>
      </div>
    </section>
  );
}

function GPView({ security, onSelect }: { security: TerminalSecurity; onSelect: (id: string) => void }) {
  return (
    <section className={styles.functionScreen} aria-label="Graph price">
      <FunctionHeading code="GP" detail={`${security.symbol} US Equity · Intraday`} />
      <div className={styles.chartToolbar}><span><b>Range</b> 1D</span><span><b>Interval</b> 15m</span><span><b>Type</b> Candle</span><span><b>Study</b> MA(5)</span><span><b>Currency</b> USD</span><span className={styles.sessionState}>● Market open</span></div>
      <div className={styles.gpLayout}>
        <div className={styles.chartPanel}>
          <div className={styles.quoteHeader}><div><span className={styles.quoteTicker}>{security.symbol}</span><span className={styles.quoteName}>{security.name}</span></div><div className={styles.quoteNumbers}><strong>{security.price.toFixed(2)}</strong><span className={tone(security.percent)}>{signed(security.change)} &nbsp; {signed(security.percent)}%</span></div></div>
          <div className={styles.chartFrame}><PriceChart security={security} /></div>
        </div>
        <aside className={styles.gpSidebar}>
          <h2>Market data</h2>
          <dl className={styles.statList}><div><dt>Open</dt><dd>{security.series[0].toFixed(2)}</dd></div><div><dt>High</dt><dd>{security.high.toFixed(2)}</dd></div><div><dt>Low</dt><dd>{security.low.toFixed(2)}</dd></div><div><dt>Volume</dt><dd>{security.volume}</dd></div><div><dt>Market cap</dt><dd>{security.marketCap}</dd></div><div><dt>P/E</dt><dd>{security.pe}×</dd></div></dl>
          <h2>Related securities</h2>
          <div className={styles.relatedList}>{securities.slice(0, 7).map((item) => <button type="button" key={item.id} onClick={() => onSelect(item.id)} className={item.id === security.id ? styles.relatedActive : ""}><span>{item.symbol}</span><span>{item.price.toFixed(2)}</span><span className={tone(item.percent)}>{signed(item.percent)}%</span></button>)}</div>
        </aside>
      </div>
    </section>
  );
}

function TOPView() {
  return (
    <section className={styles.functionScreen} aria-label="Top news">
      <FunctionHeading code="TOP" detail="Global · English" />
      <div className={styles.filterBar}><span><b>1</b> All Stories</span><span><b>2</b> Markets</span><span><b>3</b> Companies</span><span><b>4</b> Economics</span><span><b>5</b> Politics</span><span className={styles.filterStatus}>Automatic refresh on</span></div>
      <div className={styles.topLayout}>
        <div className={styles.storyList}>
          <div className={styles.storySection}>Top Stories</div>
          {headlines.slice(0, 6).map((item, index) => <article className={styles.story} key={item.id}><span className={styles.storyIndex}>{index + 1}</span><div><h2>{item.headline}</h2><p>{item.summary}</p><span className={styles.storyMeta}>{item.time} ET &nbsp; {item.flag} &nbsp; <b>{item.related}</b></span></div></article>)}
        </div>
        <aside className={styles.newsSidebar}>
          <div className={styles.spotlight}><span>Chart of the hour</span><h2>Semiconductor breadth loses contact with the index</h2><div className={styles.miniChart}><svg viewBox="0 0 320 110" aria-label="Semiconductor breadth chart"><polyline points="0,83 25,78 50,80 75,62 100,69 125,48 150,44 175,36 200,42 225,23 250,28 275,15 320,19" /><polyline className={styles.miniComparison} points="0,89 25,84 50,74 75,70 100,58 125,56 150,51 175,48 200,40 225,37 250,30 275,27 320,22" /></svg></div><p><b className={styles.orangeText}>SOX Index</b> versus members above 20-day average</p></div>
          <div className={styles.moreNews}><h3>More from the Terminal</h3>{headlines.slice(6).map((item) => <div key={item.id}><span>{item.time}</span><p>{item.headline}</p></div>)}</div>
        </aside>
      </div>
    </section>
  );
}

function ECOView() {
  return (
    <section className={styles.functionScreen} aria-label="Economic calendar">
      <FunctionHeading code="ECO" detail="Economic releases · All countries" />
      <div className={styles.ecoControls}><span><b>Date</b> Jul 10 — Jul 11</span><span><b>Region</b> Americas / Europe</span><span><b>Importance</b> All</span><span><b>View</b> Agenda</span><span className={styles.filterStatus}>Times shown in ET</span></div>
      <div className={styles.tableScroll}>
        <table className={`${styles.dataTable} ${styles.ecoTable}`}>
          <thead><tr><th>Time</th><th>Country</th><th>Event</th><th>Period</th><th>Survey</th><th>Actual</th><th>Prior</th></tr></thead>
          <tbody>
            {[...new Set(economicEvents.map((item) => item.date))].map((date) => <EconomicRows date={date} key={date} />)}
          </tbody>
        </table>
      </div>
      <div className={styles.economyStrip}><div><span>US GDP YoY</span><strong>2.0%</strong></div><div><span>US CPI YoY</span><strong>2.4%</strong></div><div><span>Fed Funds</span><strong>4.50%</strong></div><div><span>Unemployment</span><strong>4.1%</strong></div><div><span>10Y Yield</span><strong>4.167%</strong></div></div>
    </section>
  );
}

function EconomicRows({ date }: { date: string }) {
  return <><tr className={styles.regionRow}><td colSpan={7}>{date}</td></tr>{economicEvents.filter((item) => item.date === date).map((item) => <tr key={item.id}><td>{item.time}</td><td><span className={styles.countryCode}>{item.country}</span>{"●".repeat(item.importance)}</td><td>{item.event}</td><td className={styles.muted}>{item.period}</td><td>{item.survey}</td><td className={item.actual !== "—" ? styles.actualValue : styles.muted}>{item.actual}</td><td>{item.prior}</td></tr>)}</>;
}

export default function StockTwo() {
  const [securityId, setSecurityId] = useState(securities[0].id);
  const [activeFunction, setActiveFunction] = useState<TerminalFunction>("HOME");
  const [command, setCommand] = useState("");
  const security = useMemo(() => securities.find((item) => item.id === securityId) ?? securities[0], [securityId]);

  function runCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tokens = command.trim().toUpperCase().split(/\s+/);
    const nextSecurity = securities.find((item) => tokens.includes(item.symbol));
    const nextFunction = functions.find((item) => tokens.includes(item));
    if (nextSecurity) setSecurityId(nextSecurity.id);
    if (nextFunction) setActiveFunction(nextFunction);
    setCommand("");
  }

  return (
    <main className={styles.terminal}>
      <header className={styles.chrome}>
        <button type="button" className={styles.menuButton}>Menu</button>
        <div className={styles.loadedSecurity}>{security.symbol} US Equity</div>
        <form className={styles.commandForm} onSubmit={runCommand}><label htmlFor="terminal-command">Command / Security</label><input id="terminal-command" value={command} onChange={(event) => setCommand(event.target.value)} placeholder={`${security.symbol} US Equity ${activeFunction}`} autoCapitalize="characters" spellCheck={false} /><button type="submit">GO</button></form>
        <div className={styles.panelState}><span>P1</span><span>P2</span><span>P3</span><b>P4</b><time>13:06:24 ET</time></div>
      </header>

      <div className={styles.indexRibbon}>{indexTape.map((item) => <span key={item.id}><b>{item.symbol}</b> {item.price} <i className={tone(item.percent)}>{signed(item.percent)}%</i></span>)}</div>

      <nav className={styles.functionNav} aria-label="Terminal functions">{functions.map((item, index) => <button type="button" key={item} onClick={() => setActiveFunction(item)} className={activeFunction === item ? styles.functionActive : ""}><span>{index + 1}</span><strong>{item}</strong>{functionNames[item]}</button>)}</nav>

      <div className={styles.screenViewport}>
        {activeFunction === "HOME" ? <DashboardView security={security} onSelect={setSecurityId} /> : null}
        {activeFunction === "WEI" ? <WEIView /> : null}
        {activeFunction === "GP" ? <GPView security={security} onSelect={setSecurityId} /> : null}
        {activeFunction === "TOP" ? <TOPView /> : null}
        {activeFunction === "ECO" ? <ECOView /> : null}
      </div>

      <footer className={styles.actionBar}>{functionActions[activeFunction].map((item, index) => <button type="button" key={item}><span>{index + 1}</span>{item}</button>)}</footer>
    </main>
  );
}
