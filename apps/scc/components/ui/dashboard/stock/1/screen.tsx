"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceAxisMarket,
  axisStockDefinitions,
  createAxisMarket,
  orientationSlopes,
  type AxisStockState,
} from "./axis-model";
import type { StockOrientationSignal } from "./types";
import { useStockSocket } from "./use-stock-socket";
import {
  StockChart,
  type PricePoint,
  type StockRow,
} from "@/components/ui/dashboard/stock/default/dashboard";

const stockNames = {
  alpha: "Alpha Signal Corp.",
  beta: "Beta Signal Corp.",
  gamma: "Gamma Signal Corp.",
} as const;

function formatSigned(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

function formatChange(changeValue: number, axisPercentage: number) {
  return `${formatSigned(changeValue)}  ${formatSigned(axisPercentage)}%`;
}

function axisSeries(stock: AxisStockState): PricePoint[] {
  return stock.points.map((point) => ({
    id: point.id,
    time: String(point.time),
    value: point.value,
  }));
}

function AxisStockCard({ stock }: { stock: AxisStockState }) {
  const series = axisSeries(stock);
  const changeValue = stock.price - 100;
  const positive = Math.abs(stock.slope) > 0.005
    ? stock.slope >= 0
    : changeValue >= 0;
  const chartStock: StockRow = {
    change: formatChange(changeValue, stock.slope),
    changeValue,
    id: stock.id,
    name: stockNames[stock.id],
    price: stock.price.toFixed(2),
    series,
    symbol: stock.label,
    timeAsOf: String(stock.points.at(-1)!.time),
  };

  return (
    <article className="grid h-[clamp(76px,17.5vh,122px)] grid-cols-[minmax(94px,132px)_minmax(0,1fr)] items-center gap-2 rounded-[8px] bg-[#1c1c1e] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_44px_rgba(0,0,0,0.18)] sm:grid-cols-[164px_minmax(0,1fr)] sm:gap-4 sm:px-5 lg:h-[clamp(92px,17.2vh,128px)]">
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline justify-between gap-3 sm:block">
          <h2 className="truncate text-[18px] font-semibold leading-5 text-white sm:text-[20px]">
            {chartStock.symbol}
          </h2>
          <p
            className={`shrink-0 text-[13px] font-semibold leading-none tabular-nums sm:hidden ${
              positive ? "text-[#32d74b]" : "text-[#ff453a]"
            }`}
          >
            {chartStock.change}
          </p>
        </div>
        <p className="mt-1 truncate text-[12px] leading-4 text-[#8e8e93] sm:text-[13px]">
          {chartStock.name}
        </p>
        <p className="mt-[clamp(8px,1.8vh,18px)] text-[22px] font-semibold leading-none tracking-normal text-white tabular-nums sm:text-[26px]">
          {chartStock.price}
        </p>
        <p
          className={`mt-1 hidden text-[13px] font-semibold leading-none tabular-nums sm:block ${
            positive ? "text-[#32d74b]" : "text-[#ff453a]"
          }`}
        >
          {chartStock.change}
        </p>
      </div>
      <div className="h-[clamp(54px,11.5vh,88px)] min-w-0 overflow-hidden rounded-[6px] bg-black/[0.08]">
        <StockChart
          positive={positive}
          progress={1}
          range="1D"
          series={series}
          stock={chartStock}
          visibleLength={series.length}
        />
      </div>
    </article>
  );
}

export default function StockOneScreen() {
  const orientationRef = useRef<StockOrientationSignal | null>(null);
  const lastSignalAtRef = useRef(0);
  const [market, setMarket] = useState(() => createAxisMarket(Date.now()));
  const handleOrientation = useCallback((signal: StockOrientationSignal) => {
    orientationRef.current = signal;
    lastSignalAtRef.current = signal.sentAt;
  }, []);

  useStockSocket({ onOrientation: handleOrientation, role: "screen" });

  useEffect(() => {
    let frame = 0;
    let previousTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = Math.min(Math.max(now - previousTime, 0), 48);
      previousTime = now;
      const slopes = orientationSlopes(
        orientationRef.current,
        now - lastSignalAtRef.current,
      );
      setMarket((current) => advanceAxisMarket(current, slopes, elapsed, now));
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-black px-3 py-4 text-[#f5f5f7] sm:px-6">
      <section className="w-full max-w-[752px]" aria-label="Three orientation stocks">
        <div className="grid gap-[clamp(8px,1.35vh,12px)]">
          {axisStockDefinitions.map(({ id }) => (
            <AxisStockCard key={id} stock={market.stocks[id]} />
          ))}
        </div>
      </section>
    </main>
  );
}
