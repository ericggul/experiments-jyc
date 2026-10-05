"use client";

import { createPortal } from "react-dom";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  activeRows,
  breadthGroups,
  comparisonSeries,
  globalMarketRows,
  localMarkets,
  macroCards,
  matrixExtraRows,
  newsRows,
  sessionBrief,
  sessionClocks,
  type DirectionalRecord,
} from "../model/workstation-data";
import catSources from "../model/cat-sources.json";
import kissSources from "../model/kiss-sources.json";
import styles from "./workstation.module.css";

const CAT_IMAGE_CHANGE_INTERVAL_MS = 20;
type ImageSet = "cat" | "kiss";
type SequenceSource = { id: string; imageUrl: string };

function signed(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function tone(value: number) {
  return value >= 0 ? styles.positive : styles.negative;
}

function heat(value: number) {
  if (value >= 5) return styles.heatStrongPositive;
  if (value >= 1) return styles.heatPositive;
  if (value >= 0) return styles.heatSoftPositive;
  if (value <= -5) return styles.heatStrongNegative;
  if (value <= -1) return styles.heatNegative;
  return styles.heatSoftNegative;
}

function linePoints(series: readonly number[], width: number, height: number, inset = 2) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const spread = max - min || 1;
  return series.map((value, index) => {
    const x = inset + (index / (series.length - 1)) * (width - inset * 2);
    const y = inset + (1 - (value - min) / spread) * (height - inset * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function drawImageCover(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const context = canvas.getContext("2d");
  if (!context || bounds.width === 0 || bounds.height === 0) return;

  canvas.width = Math.round(bounds.width * pixelRatio);
  canvas.height = Math.round(bounds.height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const scale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (bounds.width - width) / 2, (bounds.height - height) / 2, width, height);
}

type HoverCatTarget = {
  element: HTMLElement;
  intervalMs: number | null;
};

function CatCanvas({ images, intervalMs, initialPosition }: { images: HTMLImageElement[]; intervalMs: number | null; initialPosition: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentPositionRef = useRef(initialPosition);

  useEffect(() => {
    const showImage = (position: number) => {
      const image = images[position];
      const canvas = canvasRef.current;
      if (!image || !canvas) return;
      drawImageCover(canvas, image);
      currentPositionRef.current = position;
    };

    showImage(currentPositionRef.current % Math.max(images.length, 1));
    const interval = window.setInterval(() => {
      if (intervalMs === null || images.length === 0) return;
      showImage((currentPositionRef.current + 1) % images.length);
    }, intervalMs ?? CAT_IMAGE_CHANGE_INTERVAL_MS);
    const resizeObserver = new ResizeObserver(() => showImage(currentPositionRef.current));
    if (canvasRef.current) resizeObserver.observe(canvasRef.current);

    return () => {
      window.clearInterval(interval);
      resizeObserver.disconnect();
    };
  }, [images, initialPosition, intervalMs]);

  return <canvas ref={canvasRef} className={styles.catCanvas} aria-hidden="true" />;
}

function HoverCatOverlay({ targets, sources }: { targets: HoverCatTarget[]; sources: SequenceSource[] }) {
  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([]);

  useEffect(() => {
    let cancelled = false;
    let pendingImage: HTMLImageElement | null = null;

    const preloadSequentially = async () => {
      for (const source of sources) {
        if (cancelled) return;
        const image = new window.Image();
        pendingImage = image;
        const didLoad = await new Promise<boolean>((resolve) => {
          image.onload = async () => {
            try {
              await image.decode();
              resolve(true);
            } catch {
              resolve(false);
            }
          };
          image.onerror = () => resolve(false);
          image.src = source.imageUrl;
        });
        if (cancelled) return;
        if (didLoad) setLoadedImages((images) => [...images, image]);
      }
    };

    void preloadSequentially();
    return () => {
      cancelled = true;
      if (pendingImage) {
        pendingImage.onload = null;
        pendingImage.onerror = null;
        pendingImage.src = "";
      }
    };
  }, [sources]);

  if (targets.length === 0 || loadedImages.length === 0) return null;
  return targets.map((target, index) => createPortal(
    <span className={styles.catOverlay} aria-hidden="true">
      <CatCanvas images={loadedImages} intervalMs={target.intervalMs} initialPosition={index % loadedImages.length} />
    </span>,
    target.element,
    target.element.dataset.catItem ?? target.element.dataset.catTarget,
  ));
}

function PanelHeader({ title, utility }: { title: string; utility?: string }) {
  return <header className={styles.panelHeader}><strong>{title}</strong>{utility ? <span>{utility}</span> : null}</header>;
}

function Sparkline({ row }: { row: DirectionalRecord }) {
  return <svg className={styles.spark} viewBox="0 0 100 22" aria-hidden="true"><polyline className={tone(row.day)} points={linePoints(row.series, 100, 22)} /></svg>;
}

function SessionPanel() {
  return (
    <section className={`${styles.panel} ${styles.sessions}`} aria-label="World market sessions" data-cat-group="international-clocks">
      <PanelHeader title="International Clocks" utility="Options" />
      <div className={styles.clockColumns}>{sessionClocks.map((clock) => (
        <div key={clock.id} data-cat-item={`clock-${clock.id}`}>
          <time>{clock.time}</time><small>{clock.city}</small><b>{clock.session} · THU 16 JUL</b>
          <dl><div><dt>ZONE</dt><dd>{clock.offset}</dd></div><div><dt>CASH</dt><dd>{clock.hours}</dd></div></dl>
          <span><em>{clock.temperature}</em><i aria-hidden="true">●</i>{clock.condition}</span>
        </div>
      ))}</div>
    </section>
  );
}

function LocalReturns({ onSelect }: { onSelect: (symbol: string) => void }) {
  return (
    <section className={`${styles.panel} ${styles.localReturns}`} aria-label="Hot market returns" data-cat-group="hot-up-hot-down">
      <PanelHeader title="Hot Up / Hot Down" utility="Global · 1D" />
      <div className={styles.returnGrid}>{localMarkets.map((market) => (
        <button type="button" key={market.id} className={heat(market.percent)} onClick={() => onSelect(market.symbol)} data-cat-item={`hot-${market.id}`}>
          <span>{market.name}</span><strong>{signed(market.percent)}%</strong><small>{market.symbol} &nbsp; {market.last}</small><b>{market.net}</b><em>1W {signed(market.percent * 2.14)}% · YTD {signed(market.percent * 8.72)}%</em>
        </button>
      ))}</div>
    </section>
  );
}

function FeatureStory() {
  return (
    <section className={`${styles.panel} ${styles.featureStory}`} aria-label="Featured bond market story" data-cat-target="first-word">
      <PanelHeader title="First Word" utility="Global Macro News" />
      <article>
        <div className={styles.storyTools}><span>Markets</span><span>Economics</span><span>Credit</span><span>Research</span></div>
        <h1>Catastrophe Bonds Face Their Biggest Test as Climate Risk Reprices</h1>
        <p>The catastrophe-bond market has drawn a new class of buyers as spreads remain attractive and issuance expands across wind, earthquake and aggregate-loss protection.</p>
        <p>Managers point to low correlation with public assets, but the central question has shifted: can historical models adjust quickly enough when the baseline for insured losses is changing?</p>
        <p>Last season&apos;s experience pushed investors to distinguish clean event risk from structures that retain exposure across several seasons. Secondary-market liquidity remains firm, yet pricing now varies sharply by trigger, geography and attachment point.</p>
        <p>For buyers, expected loss is only one part of the calculation. Rebuilding costs, insurance penetration and the time required to settle modeled-loss contracts can materially alter realized returns.</p>
        <p className={styles.storyQuote}>“Every renewal now carries a different distribution of risk, even when the headline peril appears unchanged.”</p>
        <div className={styles.featureChart}>
          <div className={styles.featureLegend}><span>Cat Bond Index</span><span>Global High Yield</span></div>
          <svg viewBox="0 0 420 130" role="img" aria-label="Catastrophe bond and high yield index performance">
            {[18, 48, 78, 108].map((y) => <line key={y} x1="8" x2="412" y1={y} y2={y} />)}
            <polyline className={styles.featurePrimary} points={linePoints(comparisonSeries.selected, 404, 105)} transform="translate(8 9)" />
            <polyline className={styles.featureSecondary} points={linePoints(comparisonSeries.benchmark, 404, 105)} transform="translate(8 9)" />
          </svg>
        </div>
        <footer>Source: Bloomberg Intelligence · Reference-session interface study</footer>
      </article>
    </section>
  );
}

function EconomicBrief() {
  return (
    <section className={`${styles.panel} ${styles.economicBrief}`} aria-label="Economic releases" data-cat-target="economic-releases">
      <PanelHeader title="Economic Releases" utility="US · Today" />
      <div className={styles.briefHead}><span>Time</span><span>CCY</span><span>Event</span><span>Actual</span><span>Survey</span><span>Prior</span></div>
      <div className={styles.briefBody}>{sessionBrief.map((event) => (
        <div key={event.id}><time>{event.time}</time><strong>{event.country}</strong><span>{event.event}</span><b>{event.actual}</b><em>{event.survey}</em><small>{event.prior}</small></div>
      ))}</div>
    </section>
  );
}

function SovereignTable({ onSelect }: { onSelect: (symbol: string) => void }) {
  return (
    <section className={`${styles.panel} ${styles.sovereignTable}`} aria-label="Sovereign and cross market table" data-cat-target="sovereign-markets">
      <PanelHeader title="Sovereign Markets — 31 Year, Volatility & Price" utility="Local Currency" />
      <div className={styles.sovereignHead}><span>Market</span><span>Security</span><span>Price</span><span>Chg</span><span>%</span><span>1W</span><span>1M</span><span>YTD</span></div>
      <div className={styles.sovereignBody}>{globalMarketRows.map((row) => (
        <button type="button" key={row.id} onClick={() => onSelect(row.symbol)}>
          <span>{row.name}</span><strong>{row.symbol}</strong><em>{row.last}</em><b className={tone(row.day)}>{signed(row.day)}</b><i className={heat(row.day)}>{signed(row.day)}%</i><small className={tone(row.week)}>{signed(row.week)}</small><small className={tone(row.month)}>{signed(row.month)}</small><small className={tone(row.year)}>{signed(row.year)}</small>
        </button>
      ))}</div>
    </section>
  );
}

function Sunburst({ group, variant }: { group: (typeof breadthGroups)[number]; variant: "industry" | "region" }) {
  return (
    <div className={styles.breadthBlock}>
      <div className={`${styles.sunburst} ${variant === "industry" ? styles.industryBurst : styles.regionBurst}`}>
        <div><span>{group.title}</span><strong>{group.advancing}%</strong><small>Advancing</small></div>
      </div>
      <div className={styles.breadthDetail}>{group.rows.map(([name, value]) => (
        <div key={String(name)}><span>{name}</span><i><b style={{ width: `${value}%` }} /></i><em>{value}%</em></div>
      ))}</div>
    </div>
  );
}

function BreadthPanel() {
  return (
    <section className={`${styles.panel} ${styles.breadth}`} aria-label="Market intensity by industry and region" data-cat-target="world-market-intensity">
      <PanelHeader title="World Market Intensity" utility="Group by Industry / Region" />
      <Sunburst group={breadthGroups[0]} variant="industry" />
      <Sunburst group={breadthGroups[1]} variant="region" />
    </section>
  );
}

function ActiveTable({ onSelect }: { onSelect: (symbol: string) => void }) {
  const groups = [
    { id: "active-gainers", title: "Gainers", rows: activeRows.slice(0, 6) },
    { id: "active-losers", title: "Losers", rows: activeRows.slice(6, 12) },
    { id: "active-remaining", title: "Remaining Securities", rows: activeRows.slice(12, 18) },
  ];
  return (
    <section className={`${styles.panel} ${styles.activeTable}`} aria-label="Active securities grouped by performance" data-cat-target="sp-performance">
      <PanelHeader title="S&P Performance" utility="Price / Volume" />
      <div className={styles.activeHead}><span>Security</span><span>Last</span><span>Vol</span><span>% Chg</span><span>Range</span></div>
      <div className={styles.activeGroups}>{groups.map((group) => (
        <div className={styles.activeGroup} key={group.id}><h3>{group.title}</h3>{group.rows.map((row) => (
          <button type="button" key={row.id} onClick={() => onSelect(row.symbol)}><strong>{row.symbol}</strong><span>{row.last}</span><em>{row.volume}</em><b className={tone(row.percent)}>{signed(row.percent)}%</b><i><small style={{ left: `${Math.min(88, Math.max(8, 50 + row.percent * 7))}%` }} /></i></button>
        ))}</div>
      ))}</div>
    </section>
  );
}

const matrixSections = [
  { id: "matrix-sp", title: "S&P / Futures", rows: [...globalMarketRows.slice(0, 5), ...matrixExtraRows.slice(0, 2)] },
  { id: "matrix-fixed", title: "Fixed Income / Currencies", rows: [...globalMarketRows.slice(12, 17), ...matrixExtraRows.slice(4, 8)] },
  { id: "matrix-bloomberg", title: "Bloomberg Securities", rows: [...globalMarketRows.slice(5, 12), ...globalMarketRows.slice(17, 20), ...matrixExtraRows.slice(2, 4)] },
] as const;

function SecurityMatrix({ onSelect }: { onSelect: (symbol: string) => void }) {
  return (
    <section className={`${styles.panel} ${styles.securityMatrix}`} aria-label="Security selection heat matrix" data-cat-target="my-security-selection">
      <PanelHeader title="My Security Selection — Two Years, 600 Hours" utility="Relative Performance" />
      <div className={styles.matrixHead}><span>Security</span><span>Trend</span><span>Last</span><span>1D</span><span>5D</span><span>1M</span><span>3M</span><span>6M</span><span>YTD</span><span>1Y</span><span>52W Range</span><span>End</span></div>
      <div className={styles.matrixSections}>{matrixSections.map((section) => (
        <div className={styles.matrixSection} key={section.id} data-cat-target={`selection-${section.id}`}><h3>{section.title}</h3>{section.rows.map((row) => (
          <button type="button" key={row.id} onClick={() => onSelect(row.symbol)}>
            <strong>{row.symbol}</strong><Sparkline row={row} /><span>{row.last}</span>
            {[row.day, row.week, row.month, (row.week + row.month) / 2, row.month * 1.6, row.year, row.year * .92].map((value, periodIndex) => <b key={`${row.id}-period-${periodIndex}`} className={heat(value)}>{signed(value)}</b>)}
            <i><small style={{ left: `${Math.min(94, Math.max(6, 50 + row.day * 11))}%` }} /></i><em>{Math.abs(row.year).toFixed(2)}</em>
          </button>
        ))}</div>
      ))}</div>
    </section>
  );
}

function MacroDashboard({ onSelect }: { onSelect: (symbol: string) => void }) {
  return (
    <section className={`${styles.panel} ${styles.macroDashboard}`} aria-label="Major market dashboard" data-cat-target="major-market-dashboard">
      <PanelHeader title="Major Market Dashboard" utility="Last / Range / Volume" />
      <div className={styles.macroCards}>{macroCards.slice(0, 8).map((card) => (
        <article key={card.id} data-cat-target={`major-${card.id}`}>
          <button type="button" className={styles.macroHit} onClick={() => onSelect(card.symbol)} aria-label={`Select ${card.symbol}`} />
          <header><span>{card.symbol}</span><b className={tone(card.percent)}>{signed(card.percent)}%</b></header>
          <strong>{card.last}</strong><small>H {card.high} · L {card.low}</small>
          <dl className={styles.quoteGrid}>
            <div><dt>OPEN</dt><dd>{card.last}</dd></div><div><dt>NET</dt><dd className={tone(card.percent)}>{signed(card.percent)}</dd></div>
            <div><dt>VOL</dt><dd>{Math.abs(card.percent * 18.4).toFixed(1)}M</dd></div><div><dt>RNG</dt><dd>{Math.abs(card.percent * 1.7).toFixed(2)}</dd></div>
          </dl>
          <div className={styles.microBars}>{card.series.slice(2, 10).map((value, index) => <i key={`${card.id}-bar-${index}`} style={{ height: `${18 + (value % 1) * 68}%` }} />)}</div>
          <svg viewBox="0 0 100 42" aria-hidden="true"><polyline className={tone(card.percent)} points={linePoints(card.series, 100, 42)} /></svg>
          <footer><span>BID</span><b>{card.last}</b><span>ASK</span><b>{card.last}</b></footer>
        </article>
      ))}</div>
    </section>
  );
}

function NewsTape() {
  return (
    <section className={`${styles.panel} ${styles.newsTape}`} aria-label="On screen market news" data-cat-target="on-screen">
      <PanelHeader title="On Screen — News & Research" utility="Global" />
      <div className={styles.newsBody}>{newsRows.map((story) => (
        <article key={story.id}><time>{story.time}</time><b>{story.tag}</b><p>{story.text}</p></article>
      ))}</div>
    </section>
  );
}

function RelativeChart({ symbol }: { symbol: string }) {
  const chartLines = [
    { id: "selected", label: symbol, className: styles.lineWhite, series: comparisonSeries.selected },
    { id: "benchmark", label: "SPX", className: styles.lineOrange, series: comparisonSeries.benchmark },
    { id: "sector", label: "SECTOR", className: styles.linePurple, series: comparisonSeries.sector },
    { id: "breadth", label: "BREADTH", className: styles.lineGray, series: comparisonSeries.breadth },
  ];
  return (
    <section className={`${styles.panel} ${styles.relativeChart}`} aria-label={`${symbol} relative performance chart`} data-cat-target="relative-performance">
      <PanelHeader title="Relative Performance & Seasonality" utility="2016 — 2017" />
      <div className={styles.chartLegend}>{chartLines.map((line) => <span className={line.className} key={line.id}>{line.label}</span>)}</div>
      <svg viewBox="0 0 460 230" role="img" aria-label={`${symbol} compared with benchmark, sector and breadth`}>
        {[25, 66, 107, 148, 189].map((y) => <line className={styles.chartGrid} key={y} x1="18" x2="445" y1={y} y2={y} />)}
        {[18, 125, 232, 339, 445].map((x) => <line className={styles.chartGrid} key={x} x1={x} x2={x} y1="18" y2="205" />)}
        {chartLines.map((line) => <polyline key={line.id} className={line.className} points={linePoints(line.series, 427, 185, 0)} transform="translate(18 19)" />)}
        <text x="18" y="224">2016</text><text x="218" y="224">Q4</text><text x="412" y="224">2017</text>
      </svg>
    </section>
  );
}

export default function StockFourWorkstation() {
  const [symbol, setSymbol] = useState("NVDA");
  const [command, setCommand] = useState("");
  const [imageSet, setImageSet] = useState<ImageSet>("kiss");
  const [hoveredTargets, setHoveredTargets] = useState<HoverCatTarget[]>([]);
  const selectedName = useMemo(() => activeRows.find((row) => row.symbol === symbol)?.symbol ?? symbol, [symbol]);
  const activeSources = imageSet === "cat" ? catSources : kissSources;

  function runCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = command.trim().toUpperCase().split(/\s+/)[0];
    if (token) setSymbol(token);
    setCommand("");
  }

  return (
    <main
      className={styles.terminal}
      onPointerMove={(event) => {
        const origin = event.target as Element;
        const item = origin.closest<HTMLElement>("[data-cat-item]");
        const group = origin.closest<HTMLElement>("[data-cat-group]");
        const panel = origin.closest<HTMLElement>("[data-cat-target]");
        const nextTargets = group
          ? Array.from(group.querySelectorAll<HTMLElement>("[data-cat-item]")).map((element) => ({
              element,
              intervalMs: element === item
                ? CAT_IMAGE_CHANGE_INTERVAL_MS
                : group.dataset.catGroup === "hot-up-hot-down"
                  ? 200
                  : null,
            }))
          : panel
              ? [{ element: panel, intervalMs: CAT_IMAGE_CHANGE_INTERVAL_MS }]
              : [];
        setHoveredTargets((currentTargets) => (
          currentTargets.length === nextTargets.length
          && currentTargets.every((target, index) => (
            target.element === nextTargets[index].element
            && target.intervalMs === nextTargets[index].intervalMs
          ))
            ? currentTargets
            : nextTargets
        ));
      }}
      onPointerLeave={() => setHoveredTargets([])}
    >
      <header className={styles.chrome}>
        <div className={styles.brand}>Bloomberg</div><nav aria-label="Terminal workspaces"><button type="button">Monitor</button><button type="button">Markets</button><button type="button">News</button><button type="button">Chart</button></nav>
        <form onSubmit={runCommand}><label htmlFor="stock-four-workstation-command">{selectedName} US Equity</label><input id="stock-four-workstation-command" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Enter security or function" spellCheck={false} /><button type="submit">GO</button></form>
        <div className={styles.chromeStatus}>
          <div className={styles.imageSetToggle} role="group" aria-label="Morph image set">
            <button type="button" aria-pressed={imageSet === "cat"} onClick={() => setImageSet("cat")}>CAT</button>
            <button type="button" aria-pressed={imageSet === "kiss"} onClick={() => setImageSet("kiss")}>KISS</button>
          </div>
          <span>Page 1</span><time>13:41 ET</time>
        </div>
        <div className={styles.functionStrip}><span><b>1</b> Monitor</span><span><b>2</b> World Markets</span><span><b>3</b> Economic Data</span><span><b>4</b> News</span><span><b>5</b> Relative Value</span><em>REFERENCE SESSION · 15 MIN DELAYED</em></div>
      </header>
      <div className={styles.dashboard}>
        <SessionPanel /><LocalReturns onSelect={setSymbol} /><FeatureStory /><EconomicBrief /><SovereignTable onSelect={setSymbol} />
        <BreadthPanel /><ActiveTable onSelect={setSymbol} /><SecurityMatrix onSelect={setSymbol} />
        <MacroDashboard onSelect={setSymbol} /><NewsTape /><RelativeChart symbol={symbol} />
      </div>
      <HoverCatOverlay key={imageSet} targets={hoveredTargets} sources={activeSources} />
    </main>
  );
}
