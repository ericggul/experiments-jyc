export type StockRole = "mobile" | "screen";

export type StockOrientationSignal = {
  absolute: boolean;
  alpha: number;
  beta: number;
  experimentId: "stock";
  from: string;
  gamma: number;
  id: string;
  revision: number;
  sentAt: number;
  variantId: "1";
};

export type OutgoingStockOrientation = Pick<
  StockOrientationSignal,
  "absolute" | "alpha" | "beta" | "gamma"
>;

export type StockPresence = {
  clients: Array<{
    connectedAt: number;
    id: string;
    role: StockRole | "unknown";
  }>;
  experimentId: "stock";
  mobiles: number;
  screens: number;
  serverTime: number;
  total: number;
  variantId: "1";
};
