"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { historicalSeries, type HistoricalRange } from "./historical-data";

export type PricePoint = {
  id: string;
  time: string;
  value: number;
};

export type StockRow = {
  id: string;
  symbol: string;
  name: string;
  price: string;
  change: string;
  changeValue: number;
  timeAsOf: string;
  series: PricePoint[];
};

export type TimeRange = "1D" | HistoricalRange;
type AnimationMode = "REVEAL" | "STREAM";

export const stocks: StockRow[] = [
  {
    id: "aapl",
    symbol: "AAPL",
    name: "Apple Inc.",
    price: "314.97",
    change: "+1.58  +0.50%",
    changeValue: 1.58,
    timeAsOf: "Jul 9, 2026 1:01 PM ET",
    series: [
      ["4:00 AM ET", 313.195],
      ["4:24 AM ET", 312.83],
      ["4:48 AM ET", 312.57],
      ["5:11 AM ET", 312.4912],
      ["5:34 AM ET", 312],
      ["6:00 AM ET", 312.4988],
      ["6:24 AM ET", 312.31],
      ["6:47 AM ET", 312.3027],
      ["7:11 AM ET", 312.5],
      ["7:34 AM ET", 312.1],
      ["7:57 AM ET", 312.4],
      ["8:21 AM ET", 311.97],
      ["8:44 AM ET", 312.465],
      ["9:08 AM ET", 311.55],
      ["9:31 AM ET", 308.72],
      ["9:54 AM ET", 311.72],
      ["10:18 AM ET", 310.96],
      ["10:41 AM ET", 311.91],
      ["11:04 AM ET", 311.76],
      ["11:28 AM ET", 314.72],
      ["11:51 AM ET", 314.77],
      ["12:14 PM ET", 314.5001],
      ["12:38 PM ET", 315.26],
      ["1:01 PM ET", 314.97],
    ].map(([time, value]) => ({ id: `aapl-${time}`, time: String(time), value: Number(value) })),
  },
  {
    id: "nvda",
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: "201.96",
    change: "-2.17  -1.06%",
    changeValue: -2.165,
    timeAsOf: "Jul 9, 2026 1:01 PM ET",
    series: [
      ["4:00 AM ET", 205.38],
      ["4:23 AM ET", 204.8],
      ["4:47 AM ET", 203.9115],
      ["5:10 AM ET", 204.47],
      ["5:34 AM ET", 204.31],
      ["5:57 AM ET", 204.57],
      ["6:21 AM ET", 204.66],
      ["6:44 AM ET", 204.66],
      ["7:08 AM ET", 204.16],
      ["7:31 AM ET", 205.45],
      ["7:55 AM ET", 205.68],
      ["8:18 AM ET", 205.94],
      ["8:42 AM ET", 206.06],
      ["9:05 AM ET", 205.36],
      ["9:29 AM ET", 204.41],
      ["9:52 AM ET", 202.37],
      ["10:16 AM ET", 199.605],
      ["10:39 AM ET", 200.365],
      ["11:03 AM ET", 201.28],
      ["11:26 AM ET", 202.1661],
      ["11:50 AM ET", 201.9105],
      ["12:13 PM ET", 202.0401],
      ["12:37 PM ET", 202.08],
      ["1:00 PM ET", 201.73],
    ].map(([time, value]) => ({ id: `nvda-${time}`, time: String(time), value: Number(value) })),
  },
  {
    id: "msft",
    symbol: "MSFT",
    name: "Microsoft Corp.",
    price: "379.70",
    change: "-3.64  -0.95%",
    changeValue: -3.6374,
    timeAsOf: "Jul 9, 2026 1:01 PM ET",
    series: [
      ["4:00 AM ET", 383.78],
      ["4:24 AM ET", 382.3],
      ["4:47 AM ET", 381.37],
      ["5:11 AM ET", 381.39],
      ["5:34 AM ET", 381.2],
      ["5:58 AM ET", 381.1],
      ["6:21 AM ET", 380.19],
      ["6:45 AM ET", 380],
      ["7:08 AM ET", 379.1149],
      ["7:32 AM ET", 377.86],
      ["7:55 AM ET", 376.7],
      ["8:19 AM ET", 376.38],
      ["8:42 AM ET", 376.0988],
      ["9:06 AM ET", 375.35],
      ["9:29 AM ET", 374.49],
      ["9:53 AM ET", 378.25],
      ["10:16 AM ET", 375.74],
      ["10:40 AM ET", 377.31],
      ["11:03 AM ET", 379.49],
      ["11:27 AM ET", 380.145],
      ["11:50 AM ET", 380.46],
      ["12:14 PM ET", 379.435],
      ["12:37 PM ET", 379.83],
      ["1:01 PM ET", 379.68],
    ].map(([time, value]) => ({ id: `msft-${time}`, time: String(time), value: Number(value) })),
  },
  {
    id: "tsla",
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: "402.45",
    change: "+8.39  +2.13%",
    changeValue: 8.39,
    timeAsOf: "Jul 9, 2026 1:01 PM ET",
    series: [
      ["4:00 AM ET", 397],
      ["4:24 AM ET", 397.39],
      ["4:47 AM ET", 396.3151],
      ["5:11 AM ET", 395.84],
      ["5:34 AM ET", 396.34],
      ["5:58 AM ET", 396.1893],
      ["6:21 AM ET", 396],
      ["6:45 AM ET", 395.44],
      ["7:08 AM ET", 394.7],
      ["7:32 AM ET", 394.28],
      ["7:55 AM ET", 394.96],
      ["8:19 AM ET", 395.35],
      ["8:42 AM ET", 394.5],
      ["9:06 AM ET", 394.7435],
      ["9:29 AM ET", 394],
      ["9:53 AM ET", 394.305],
      ["10:16 AM ET", 393.02],
      ["10:40 AM ET", 394.87],
      ["11:03 AM ET", 396.56],
      ["11:27 AM ET", 395.83],
      ["11:50 AM ET", 399.79],
      ["12:14 PM ET", 401.01],
      ["12:37 PM ET", 399.47],
      ["1:01 PM ET", 402.41],
    ].map(([time, value]) => ({ id: `tsla-${time}`, time: String(time), value: Number(value) })),
  },
  {
    id: "jpm",
    symbol: "JPM",
    name: "JPMorgan Chase",
    price: "335.81",
    change: "+5.19  +1.57%",
    changeValue: 5.19,
    timeAsOf: "Jul 9, 2026 1:01 PM ET",
    series: [
      ["4:00 AM ET", 331.67],
      ["4:52 AM ET", 331.7],
      ["5:40 AM ET", 331.01],
      ["7:01 AM ET", 330.62],
      ["7:27 AM ET", 330.7],
      ["7:46 AM ET", 330.62],
      ["8:06 AM ET", 331.03],
      ["8:26 AM ET", 331.5362],
      ["8:48 AM ET", 330.815],
      ["9:09 AM ET", 331.66],
      ["9:29 AM ET", 331.5362],
      ["9:45 AM ET", 333.21],
      ["10:02 AM ET", 333.6],
      ["10:18 AM ET", 334.66],
      ["10:34 AM ET", 335.54],
      ["10:51 AM ET", 335.77],
      ["11:07 AM ET", 336.465],
      ["11:23 AM ET", 335.8831],
      ["11:39 AM ET", 335.39],
      ["11:56 AM ET", 335.65],
      ["12:12 PM ET", 336.615],
      ["12:28 PM ET", 336.47],
      ["12:45 PM ET", 335.8075],
      ["1:01 PM ET", 335.81],
    ].map(([time, value]) => ({ id: `jpm-${time}`, time: String(time), value: Number(value) })),
  },
  {
    id: "amzn",
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: "242.99",
    change: "-0.64  -0.26%",
    changeValue: -0.635,
    timeAsOf: "Jul 9, 2026 1:06 PM ET",
    series: [
      ["4:00 AM ET", 243.6],
      ["4:23 AM ET", 242.8636],
      ["4:47 AM ET", 242.87],
      ["5:12 AM ET", 242.75],
      ["5:37 AM ET", 242.91],
      ["6:02 AM ET", 243.6],
      ["6:26 AM ET", 243.03],
      ["6:50 AM ET", 241.9],
      ["7:14 AM ET", 241.99],
      ["7:37 AM ET", 241.25],
      ["8:01 AM ET", 240.99],
      ["8:24 AM ET", 239.7696],
      ["8:48 AM ET", 240.17],
      ["9:11 AM ET", 239.27],
      ["9:35 AM ET", 240.5],
      ["9:58 AM ET", 243.01],
      ["10:22 AM ET", 240.6525],
      ["10:45 AM ET", 240.68],
      ["11:09 AM ET", 241.54],
      ["11:32 AM ET", 241.33],
      ["11:56 AM ET", 241.7699],
      ["12:19 PM ET", 242.2],
      ["12:43 PM ET", 242.2605],
      ["1:06 PM ET", 243.03],
    ].map(([time, value]) => ({ id: `amzn-${time}`, time: String(time), value: Number(value) })),
  },
  {
    id: "googl",
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: "355.56",
    change: "-6.36  -1.76%",
    changeValue: -6.36,
    timeAsOf: "Jul 9, 2026 1:06 PM ET",
    series: [
      ["4:00 AM ET", 362.17],
      ["4:24 AM ET", 361.32],
      ["4:47 AM ET", 360.3977],
      ["5:11 AM ET", 360.7128],
      ["5:36 AM ET", 360.23],
      ["5:59 AM ET", 360.31],
      ["6:23 AM ET", 360.1968],
      ["6:47 AM ET", 359.4052],
      ["7:11 AM ET", 360.38],
      ["7:34 AM ET", 358.8],
      ["7:58 AM ET", 358.5],
      ["8:22 AM ET", 357],
      ["8:45 AM ET", 357.18],
      ["9:09 AM ET", 355.6801],
      ["9:33 AM ET", 357.3],
      ["9:56 AM ET", 357.18],
      ["10:20 AM ET", 351.525],
      ["10:44 AM ET", 352.88],
      ["11:08 AM ET", 353.15],
      ["11:31 AM ET", 353.555],
      ["11:55 AM ET", 352.425],
      ["12:19 PM ET", 353.36],
      ["12:42 PM ET", 355.37],
      ["1:06 PM ET", 355.56],
    ].map(([time, value]) => ({ id: `googl-${time}`, time: String(time), value: Number(value) })),
  },
  {
    id: "meta",
    symbol: "META",
    name: "Meta Platforms",
    price: "613.10",
    change: "+9.98  +1.65%",
    changeValue: 9.9779,
    timeAsOf: "Jul 9, 2026 1:06 PM ET",
    series: [
      ["4:00 AM ET", 603.88],
      ["4:23 AM ET", 602.0142],
      ["4:48 AM ET", 599.74],
      ["5:11 AM ET", 600.9988],
      ["5:35 AM ET", 607.54],
      ["5:59 AM ET", 606.07],
      ["6:26 AM ET", 605.17],
      ["6:50 AM ET", 603.8384],
      ["7:14 AM ET", 604.3],
      ["7:38 AM ET", 588.7],
      ["8:01 AM ET", 585.71],
      ["8:25 AM ET", 580.6],
      ["8:48 AM ET", 583.5],
      ["9:12 AM ET", 581.47],
      ["9:35 AM ET", 581.755],
      ["9:59 AM ET", 590.45],
      ["10:22 AM ET", 591.645],
      ["10:45 AM ET", 593.005],
      ["11:09 AM ET", 602.1649],
      ["11:32 AM ET", 604.17],
      ["11:56 AM ET", 606.835],
      ["12:19 PM ET", 614.5],
      ["12:43 PM ET", 613.7],
      ["1:06 PM ET", 613],
    ].map(([time, value]) => ({ id: `meta-${time}`, time: String(time), value: Number(value) })),
  },
  {
    id: "avgo",
    symbol: "AVGO",
    name: "Broadcom Inc.",
    price: "402.69",
    change: "+14.00  +3.60%",
    changeValue: 13.995,
    timeAsOf: "Jul 9, 2026 1:06 PM ET",
    series: [
      ["4:00 AM ET", 393.98],
      ["4:24 AM ET", 395.1127],
      ["4:47 AM ET", 393.41],
      ["5:11 AM ET", 393.41],
      ["5:35 AM ET", 394.2312],
      ["6:00 AM ET", 393.9],
      ["6:23 AM ET", 394.65],
      ["6:48 AM ET", 394.62],
      ["7:12 AM ET", 393.76],
      ["7:36 AM ET", 400.89],
      ["7:59 AM ET", 402],
      ["8:23 AM ET", 405.2],
      ["8:46 AM ET", 403.24],
      ["9:10 AM ET", 402.63],
      ["9:33 AM ET", 401.37],
      ["9:57 AM ET", 395.63],
      ["10:20 AM ET", 388.62],
      ["10:44 AM ET", 393.64],
      ["11:07 AM ET", 395.045],
      ["11:31 AM ET", 399.54],
      ["11:54 AM ET", 400.8],
      ["12:18 PM ET", 401.155],
      ["12:41 PM ET", 402.27],
      ["1:05 PM ET", 402.35],
    ].map(([time, value]) => ({ id: `avgo-${time}`, time: String(time), value: Number(value) })),
  },
  {
    id: "amd",
    symbol: "AMD",
    name: "Advanced Micro Devices",
    price: "551.56",
    change: "+34.15  +6.60%",
    changeValue: 34.15,
    timeAsOf: "Jul 9, 2026 1:06 PM ET",
    series: [
      ["4:00 AM ET", 527.5612],
      ["4:24 AM ET", 530.08],
      ["4:47 AM ET", 528.1],
      ["5:11 AM ET", 527.36],
      ["5:35 AM ET", 527.57],
      ["5:58 AM ET", 527.9825],
      ["6:22 AM ET", 528.24],
      ["6:47 AM ET", 527.48],
      ["7:11 AM ET", 526.18],
      ["7:34 AM ET", 531.71],
      ["7:58 AM ET", 536],
      ["8:22 AM ET", 536.33],
      ["8:45 AM ET", 538.03],
      ["9:09 AM ET", 537.37],
      ["9:33 AM ET", 547.32],
      ["9:56 AM ET", 555.26],
      ["10:20 AM ET", 548.455],
      ["10:44 AM ET", 556.41],
      ["11:08 AM ET", 555.43],
      ["11:31 AM ET", 554.2],
      ["11:55 AM ET", 555.29],
      ["12:19 PM ET", 554.665],
      ["12:42 PM ET", 552],
      ["1:06 PM ET", 551.555],
    ].map(([time, value]) => ({ id: `amd-${time}`, time: String(time), value: Number(value) })),
  },
];

const chartAnimationDuration = 1200;
const timeRanges: TimeRange[] = ["1D", "1Y", "5Y"];
const animationModes: AnimationMode[] = ["REVEAL", "STREAM"];

function numberSeed(value: string) {
  let seed = 2166136261;

  for (const character of value) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }

  return seed >>> 0;
}

function seededRandom(seed: number) {
  let state = seed || 1;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(value, maximum));
}

function speculativeStream(stock: StockRow, range: TimeRange, series: PricePoint[]) {
  const endpointOffset = range === "1D" ? Number(stock.price) - series.at(-1)!.value : 0;
  const stream = series.map((point) => ({
    ...point,
    value: point.value + endpointOffset,
  }));
  const logReturns = stream.slice(1).map((point, index) =>
    Math.log(point.value / stream[index].value),
  );
  const averageReturn =
    logReturns.reduce((total, value) => total + value, 0) / Math.max(logReturns.length, 1);
  const volatility = Math.max(
    Math.sqrt(
      logReturns.reduce((total, value) => total + (value - averageReturn) ** 2, 0) /
        Math.max(logReturns.length - 1, 1),
    ),
    0.0015,
  );
  const random = seededRandom(numberSeed(`${stock.id}-${range}`));
  const domainMinimum = Math.min(...stream.map((point) => point.value));
  const domainMaximum = Math.max(...stream.map((point) => point.value));
  let previousReturn = logReturns.at(-1) ?? 0;
  let previousValue = stream.at(-1)!.value;
  const domainSpread = domainMaximum - domainMinimum || previousValue * 0.02;

  for (let index = 0; index < series.length * 16; index += 1) {
    const gaussianLikeShock =
      (random() + random() + random() + random() + random() + random() - 3) * Math.SQRT2;
    const nextReturn = clamp(
      averageReturn * 0.12 + previousReturn * 0.2 + gaussianLikeShock * volatility * 0.72,
      -volatility * 2.8,
      volatility * 2.8,
    );
    const proposedValue = previousValue * Math.exp(nextReturn);
    const reflectedValue =
      proposedValue > domainMaximum
        ? domainMaximum - Math.min(proposedValue - domainMaximum, domainSpread * 0.35)
        : proposedValue < domainMinimum
          ? domainMinimum + Math.min(domainMinimum - proposedValue, domainSpread * 0.35)
          : proposedValue;
    previousReturn = Math.log(reflectedValue / previousValue);
    previousValue = reflectedValue;
    stream.push({
      id: `${stock.id}-${range.toLowerCase()}-speculative-${index}`,
      time: `Speculative ${index + 1}`,
      value: previousValue,
    });
  }

  return stream;
}

function streamWindow(stream: PricePoint[], length: number, offset: number) {
  return Array.from({ length }, (_, index) => {
    const position = offset + index;
    const startIndex = Math.floor(position);
    const endIndex = Math.min(startIndex + 1, stream.length - 1);
    const pointProgress = position - startIndex;
    const start = stream[startIndex];
    const end = stream[endIndex];

    return {
      id: `${start.id}-window-${index}`,
      time: start.time,
      value: start.value + (end.value - start.value) * pointProgress,
    };
  });
}

function snapshotFromWindow(series: PricePoint[]) {
  const baseline = series[0].value;
  const value = series.at(-1)!.value;
  const changeValue = value - baseline;
  const changePercent = (changeValue / baseline) * 100;
  const sign = changeValue >= 0 ? "+" : "-";

  return {
    change: `${sign}${Math.abs(changeValue).toFixed(2)}  ${sign}${Math.abs(changePercent).toFixed(2)}%`,
    positive: changeValue >= 0,
    price: value.toFixed(2),
  };
}

export function seriesForRange(stock: StockRow, range: TimeRange) {
  if (range === "1D") {
    return stock.series;
  }

  return historicalSeries[stock.id]?.[range] ?? stock.series;
}

function stockSnapshot(
  stock: StockRow,
  series: PricePoint[],
  range: TimeRange,
  progress: number,
) {
  const boundedProgress = Math.max(0, Math.min(progress, 1));

  if (range === "1D" && boundedProgress >= 1) {
    return {
      change: stock.change,
      positive: stock.changeValue >= 0,
      price: stock.price,
    };
  }

  const seriesPosition = boundedProgress * (series.length - 1);
  const startIndex = Math.floor(seriesPosition);
  const endIndex = Math.min(startIndex + 1, series.length - 1);
  const pointProgress = seriesPosition - startIndex;
  const startValue = series[startIndex].value;
  const endValue = series[endIndex].value;
  const sampledValue = startValue + (endValue - startValue) * pointProgress;
  const endpointOffset = range === "1D" ? Number(stock.price) - series.at(-1)!.value : 0;
  const value = sampledValue + endpointOffset * boundedProgress;
  const baseline = range === "1D" ? Number(stock.price) - stock.changeValue : series[0].value;
  const changeValue = value - baseline;
  const changePercent = (changeValue / baseline) * 100;
  const sign = changeValue >= 0 ? "+" : "-";

  return {
    change: `${sign}${Math.abs(changeValue).toFixed(2)}  ${sign}${Math.abs(changePercent).toFixed(2)}%`,
    positive: changeValue >= 0,
    price: value.toFixed(2),
  };
}

function chartPath(
  series: PricePoint[],
  width: number,
  height: number,
  visibleLength = series.length,
  domainSeries = series,
) {
  const values = domainSeries.map((point) => point.value);
  const rawMinimum = Math.min(...values);
  const rawMaximum = Math.max(...values);
  const min = rawMinimum === rawMaximum ? rawMinimum - 0.5 : rawMinimum;
  const max = rawMinimum === rawMaximum ? rawMaximum + 0.5 : rawMaximum;
  const spread = max - min || 1;
  const padX = 5;
  const padY = 12;
  const points = series.map((point, index) => ({
    x: padX + (index / (visibleLength - 1)) * (width - padX * 2),
    y: padY + (1 - (point.value - min) / spread) * (height - padY * 2),
  }));

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }

    const previous = points[index - 1];
    const beforePrevious = points[index - 2] ?? previous;
    const next = points[index + 1] ?? point;
    const tension = 0.18;
    const cp1x = previous.x + (point.x - beforePrevious.x) * tension;
    const cp1y = previous.y + (point.y - beforePrevious.y) * tension;
    const cp2x = point.x - (next.x - previous.x) * tension;
    const cp2y = point.y - (next.y - previous.y) * tension;

    return `${path} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(
      2,
    )} ${cp2y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, "");
}

function chartAreaPath(
  series: PricePoint[],
  width: number,
  height: number,
  visibleLength = series.length,
  domainSeries = series,
) {
  const line = chartPath(series, width, height, visibleLength, domainSeries);
  const lastX = 5 + ((series.length - 1) / (visibleLength - 1)) * (width - 10);
  return `${line} L ${lastX} ${height - 5} L 5 ${height - 5} Z`;
}

export function StockChart({
  positive,
  progress,
  range,
  series,
  stock,
  streamOffset = 0,
  visibleLength = series.length,
}: {
  positive: boolean;
  progress: number;
  range: TimeRange;
  series: PricePoint[];
  stock: StockRow;
  streamOffset?: number;
  visibleLength?: number;
}) {
  const width = 420;
  const height = 104;
  const color = positive ? "#32d74b" : "#ff453a";
  const fillId = `${stock.id}-area-fill`;
  const revealId = `${stock.id}-chart-reveal`;
  const revealWidth = Math.max(0, progress) * width;
  const domainSeries = useMemo(
    () => series.slice(0, visibleLength),
    [series, visibleLength],
  );
  const pointSpacing = (width - 10) / (visibleLength - 1);
  const translateX = -streamOffset * pointSpacing;
  const linePath = useMemo(
    () => chartPath(series, width, height, visibleLength, domainSeries),
    [domainSeries, series, visibleLength],
  );
  const areaPath = useMemo(
    () => chartAreaPath(series, width, height, visibleLength, domainSeries),
    [domainSeries, series, visibleLength],
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      role="img"
      aria-label={`${stock.symbol} ${range} price graph`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="58%" stopColor={color} stopOpacity="0.055" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <clipPath id={revealId}>
          <rect width={revealWidth} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${revealId})`}>
        <g transform={`translate(${translateX} 0)`}>
          <path d={areaPath} fill={`url(#${fillId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.18"
            strokeWidth="5.8"
          />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.35"
          />
        </g>
      </g>
    </svg>
  );
}

function StockCard({
  animationMode,
  range,
  stock,
}: {
  animationMode: AnimationMode;
  range: TimeRange;
  stock: StockRow;
}) {
  const [animationValue, setAnimationValue] = useState(animationMode === "REVEAL" ? 1 : 0);
  const [animating, setAnimating] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const series = seriesForRange(stock, range);
  const speculativeSeries = useMemo(
    () => speculativeStream(stock, range, series),
    [range, series, stock],
  );
  const displayedSeries =
    animationMode === "STREAM" && animating
      ? streamWindow(speculativeSeries, series.length, animationValue)
      : series;
  const snapshot =
    animationMode === "STREAM" && animating
      ? snapshotFromWindow(displayedSeries)
      : stockSnapshot(stock, series, range, animationValue);
  const chartProgress = animationMode === "STREAM" ? 1 : animationValue;

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  function stopAnimation() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  function handleMouseEnter() {
    stopAnimation();
    setAnimationValue(0);
    setAnimating(true);

    const startTime = performance.now();
    const animate = (time: number) => {
      const elapsed = Math.max(0, time - startTime);

      if (animationMode === "STREAM") {
        const pointsPerMillisecond = (series.length * 4) / 6500;
        const nextOffset = Math.min(
          elapsed * pointsPerMillisecond,
          speculativeSeries.length - series.length - 1,
        );
        setAnimationValue(nextOffset);

        if (nextOffset < speculativeSeries.length - series.length - 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = null;
        }

        return;
      }

      const nextProgress = Math.min(elapsed / chartAnimationDuration, 1);
      setAnimationValue(nextProgress);
      animationFrameRef.current =
        nextProgress < 1 ? requestAnimationFrame(animate) : null;
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }

  function handleMouseLeave() {
    if (animationMode === "REVEAL") {
      return;
    }

    stopAnimation();
    setAnimating(false);
    setAnimationValue(0);
  }

  return (
    <article
      className="grid h-[clamp(76px,17.5vh,122px)] grid-cols-[minmax(94px,132px)_minmax(0,1fr)] items-center gap-2 rounded-[8px] bg-[#1c1c1e] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_44px_rgba(0,0,0,0.18)] sm:grid-cols-[164px_minmax(0,1fr)] sm:gap-4 sm:px-5 lg:h-[clamp(92px,17.2vh,128px)]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline justify-between gap-3 sm:block">
          <h2 className="truncate text-[18px] font-semibold leading-5 text-white sm:text-[20px]">
            {stock.symbol}
          </h2>
          <p
            className={`shrink-0 text-[13px] font-semibold leading-none tabular-nums sm:hidden ${
              snapshot.positive ? "text-[#32d74b]" : "text-[#ff453a]"
            }`}
          >
            {snapshot.change}
          </p>
        </div>
        <p className="mt-1 truncate text-[12px] leading-4 text-[#8e8e93] sm:text-[13px]">
          {stock.name}
        </p>
        <p className="mt-[clamp(8px,1.8vh,18px)] text-[22px] font-semibold leading-none tracking-normal text-white tabular-nums sm:text-[26px]">
          {snapshot.price}
        </p>
        <p
          className={`mt-1 hidden text-[13px] font-semibold leading-none tabular-nums sm:block ${
            snapshot.positive ? "text-[#32d74b]" : "text-[#ff453a]"
          }`}
        >
          {snapshot.change}
        </p>
      </div>
      <div className="h-[clamp(54px,11.5vh,88px)] min-w-0 overflow-hidden rounded-[6px] bg-black/[0.08]">
        <StockChart
          positive={snapshot.positive}
          progress={chartProgress}
          range={range}
          series={animationMode === "STREAM" ? speculativeSeries : series}
          stock={stock}
          streamOffset={animationMode === "STREAM" && animating ? animationValue : 0}
          visibleLength={series.length}
        />
      </div>
    </article>
  );
}

export default function StockOne() {
  const [range, setRange] = useState<TimeRange>("1D");
  const [animationMode, setAnimationMode] = useState<AnimationMode>("REVEAL");

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-black px-3 py-4 text-[#f5f5f7] sm:px-6">
      <section className="w-full max-w-[1520px]" aria-label="Ten stock graphs">
        <div className="grid gap-[clamp(8px,1.35vh,12px)] lg:grid-cols-2 lg:gap-x-4">
          {stocks.map((stock) => (
            <StockCard
              key={`${stock.id}-${range}-${animationMode}`}
              animationMode={animationMode}
              range={range}
              stock={stock}
            />
          ))}
        </div>
      </section>
      <div
        className="fixed bottom-3 left-3 z-10 flex flex-col items-start gap-1.5 sm:bottom-4 sm:left-6"
      >
        <div
          className="flex rounded-[6px] border border-white/[0.08] bg-[#1c1c1e]/95 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm"
          role="group"
          aria-label="Chart animation mode"
        >
          {animationModes.map((mode) => {
            const selected = mode === animationMode;

            return (
              <button
                key={mode}
                type="button"
                aria-pressed={selected}
                className={`h-7 min-w-14 rounded-[4px] px-2 text-[11px] font-semibold transition-colors ${
                  selected
                    ? "bg-white text-black"
                    : "text-[#8e8e93] hover:bg-white/[0.07] hover:text-white"
                }`}
                onClick={() => setAnimationMode(mode)}
              >
                {mode}
              </button>
            );
          })}
        </div>
        <div
          className="flex rounded-[6px] border border-white/[0.08] bg-[#1c1c1e]/95 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm"
          role="group"
          aria-label="Stock chart time range"
        >
          {timeRanges.map((option) => {
            const selected = option === range;

            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                className={`h-7 min-w-10 rounded-[4px] px-2 text-[12px] font-semibold tabular-nums transition-colors ${
                  selected
                    ? "bg-white text-black"
                    : "text-[#8e8e93] hover:bg-white/[0.07] hover:text-white"
                }`}
                onClick={() => setRange(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
