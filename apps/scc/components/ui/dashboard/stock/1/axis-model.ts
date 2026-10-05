import type { StockOrientationSignal } from "./types";

export type AxisStockId = "alpha" | "beta" | "gamma";

export type AxisPricePoint = {
  id: string;
  time: number;
  value: number;
};

export type AxisStockState = {
  domainMaximum: number;
  domainMinimum: number;
  id: AxisStockId;
  label: string;
  points: AxisPricePoint[];
  price: number;
  slope: number;
};

export type AxisMarketState = {
  revision: number;
  stocks: Record<AxisStockId, AxisStockState>;
};

export const axisMarketSettings = {
  initialPrice: 100,
  sampleIntervalMs: 25,
  signalHoldMs: 100,
  signalReleaseMs: 180,
  timeScale: 2,
  windowDurationMs: 2_500,
} as const;

export const axisStockDefinitions = [
  { id: "alpha", label: "ALPHA" },
  { id: "beta", label: "BETA" },
  { id: "gamma", label: "GAMMA" },
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(value, maximum));
}

export function createAxisMarket(now: number): AxisMarketState {
  return {
    revision: 0,
    stocks: Object.fromEntries(
      axisStockDefinitions.map(({ id, label }) => [
        id,
        {
          domainMaximum: axisMarketSettings.initialPrice + 5,
          domainMinimum: axisMarketSettings.initialPrice - 5,
          id,
          label,
          points: [
            {
              id: `${id}-initial-start`,
              time: now - axisMarketSettings.windowDurationMs,
              value: axisMarketSettings.initialPrice,
            },
            {
              id: `${id}-initial-end`,
              time: now,
              value: axisMarketSettings.initialPrice,
            },
          ],
          price: axisMarketSettings.initialPrice,
          slope: 0,
        },
      ]),
    ) as Record<AxisStockId, AxisStockState>,
  };
}

export function orientationSlopes(
  orientation: StockOrientationSignal | null,
  millisecondsSinceSignal: number,
) {
  const releaseProgress = clamp(
    (millisecondsSinceSignal - axisMarketSettings.signalHoldMs) /
      axisMarketSettings.signalReleaseMs,
    0,
    1,
  );
  const signalStrength = 1 - releaseProgress;

  return {
    alpha: (orientation?.alpha ?? 0) * signalStrength,
    beta: (orientation?.beta ?? 0) * signalStrength,
    gamma: (orientation?.gamma ?? 0) * signalStrength,
  } satisfies Record<AxisStockId, number>;
}

export function advanceAxisMarket(
  current: AxisMarketState,
  slopes: Record<AxisStockId, number>,
  elapsedMilliseconds: number,
  now: number,
): AxisMarketState {
  const elapsedSeconds = Math.max(elapsedMilliseconds, 0) / 1000;
  const nextRevision = current.revision + 1;
  const oldestVisibleTime = now - axisMarketSettings.windowDurationMs;

  return {
    revision: nextRevision,
    stocks: Object.fromEntries(
      axisStockDefinitions.map(({ id }) => {
        const stock = current.stocks[id];
        const slope = slopes[id];
        const price =
          stock.price +
          axisMarketSettings.initialPrice *
            (slope / 100) *
            elapsedSeconds *
            axisMarketSettings.timeScale;
        const lastPoint = stock.points.at(-1)!;
        const shouldSample = now - lastPoint.time >= axisMarketSettings.sampleIntervalMs;
        const firstVisibleIndex = stock.points.findIndex(
          (point) => point.time >= oldestVisibleTime,
        );
        const retainFrom =
          firstVisibleIndex <= 0 ? 0 : firstVisibleIndex - 1;
        const retainedPoints = stock.points.slice(retainFrom);
        const points = shouldSample
          ? [
              ...retainedPoints,
              {
                id: `${id}-${nextRevision}`,
                time: now,
                value: price,
              },
            ]
          : retainedPoints;
        const visibleValues = [...points.map((point) => point.value), price];
        const visibleMinimum = Math.min(...visibleValues);
        const visibleMaximum = Math.max(...visibleValues);
        const visibleSpread = visibleMaximum - visibleMinimum;
        const padding = Math.max(visibleSpread * 0.16, 2);
        const targetMinimum = visibleMinimum - padding;
        const targetMaximum = visibleMaximum + padding;
        const frameScale = Math.max(elapsedMilliseconds / (1000 / 60), 0.1);
        const minimumBaseResponse =
          targetMinimum < stock.domainMinimum ? 0.42 : 0.055;
        const maximumBaseResponse =
          targetMaximum > stock.domainMaximum ? 0.42 : 0.055;
        const minimumResponse = 1 - (1 - minimumBaseResponse) ** frameScale;
        const maximumResponse = 1 - (1 - maximumBaseResponse) ** frameScale;
        const domainMinimum = Math.min(
          stock.domainMinimum +
            (targetMinimum - stock.domainMinimum) * minimumResponse,
          visibleMinimum - 0.25,
        );
        const domainMaximum = Math.max(
          stock.domainMaximum +
            (targetMaximum - stock.domainMaximum) * maximumResponse,
          visibleMaximum + 0.25,
        );

        return [
          id,
          {
            ...stock,
            domainMaximum,
            domainMinimum,
            points,
            price,
            slope,
          },
        ];
      }),
    ) as Record<AxisStockId, AxisStockState>,
  };
}
