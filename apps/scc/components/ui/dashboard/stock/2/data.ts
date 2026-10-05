export type TerminalSecurity = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  percent: number;
  volume: string;
  high: number;
  low: number;
  marketCap: string;
  pe: string;
  series: number[];
};

export const securities: TerminalSecurity[] = [
  { id: "nvda-us", symbol: "NVDA", name: "NVIDIA CORP", price: 201.96, change: -2.17, percent: -1.06, volume: "87.2M", high: 206.06, low: 199.61, marketCap: "4.93T", pe: "46.8", series: [205.4,204.8,203.9,204.5,204.3,204.7,204.2,205.5,206.1,205.4,204.4,202.4,199.6,200.4,201.3,202.2,201.9,202.1,201.7,202.0] },
  { id: "aapl-us", symbol: "AAPL", name: "APPLE INC", price: 314.97, change: 1.58, percent: 0.50, volume: "42.6M", high: 315.26, low: 308.72, marketCap: "4.68T", pe: "37.1", series: [313.2,312.8,312.6,312.0,312.5,312.3,312.5,312.1,312.4,312.0,308.7,311.7,311.0,311.9,311.8,314.7,314.8,314.5,315.3,315.0] },
  { id: "msft-us", symbol: "MSFT", name: "MICROSOFT CORP", price: 379.70, change: -3.64, percent: -0.95, volume: "31.9M", high: 383.78, low: 374.49, marketCap: "2.82T", pe: "28.3", series: [383.8,382.3,381.4,381.2,380.2,379.1,377.9,376.7,376.1,375.4,374.5,378.3,375.7,377.3,379.5,380.1,380.5,379.4,379.8,379.7] },
  { id: "tsla-us", symbol: "TSLA", name: "TESLA INC", price: 402.45, change: 8.39, percent: 2.13, volume: "96.4M", high: 402.45, low: 393.02, marketCap: "1.29T", pe: "181.4", series: [397.0,397.4,396.3,395.8,396.3,396.0,395.4,394.7,394.3,395.0,394.0,393.0,394.9,396.6,395.8,399.8,401.0,399.5,401.4,402.5] },
  { id: "jpm-us", symbol: "JPM", name: "JPMORGAN CHASE", price: 335.81, change: 5.19, percent: 1.57, volume: "15.1M", high: 336.62, low: 330.62, marketCap: "917.6B", pe: "15.2", series: [331.7,331.0,330.6,330.7,331.0,331.5,330.8,331.7,331.5,333.2,333.6,334.7,335.5,335.8,336.5,335.9,335.4,336.6,336.5,335.8] },
  { id: "amd-us", symbol: "AMD", name: "ADV MICRO DEVICES", price: 551.56, change: 34.15, percent: 6.60, volume: "112.8M", high: 556.41, low: 526.18, marketCap: "894.1B", pe: "72.9", series: [527.6,530.1,528.1,527.4,528.0,527.5,526.2,531.7,536.0,538.0,547.3,555.3,548.5,556.4,555.4,554.2,555.3,554.7,552.0,551.6] },
  { id: "meta-us", symbol: "META", name: "META PLATFORMS", price: 613.10, change: 9.98, percent: 1.65, volume: "22.3M", high: 614.50, low: 580.60, marketCap: "1.54T", pe: "27.6", series: [603.9,602.0,599.7,601.0,607.5,606.1,603.8,588.7,580.6,583.5,581.5,590.5,591.6,593.0,602.2,604.2,606.8,614.5,613.7,613.1] },
  { id: "xom-us", symbol: "XOM", name: "EXXON MOBIL CORP", price: 112.31, change: -0.86, percent: -0.76, volume: "19.2M", high: 113.60, low: 111.88, marketCap: "486.0B", pe: "16.4", series: [113.2,113.0,112.7,112.9,112.4,112.1,112.5,112.2,112.0,112.3,112.7,112.4,112.2,112.0,112.1,111.9,112.2,112.5,112.0,112.3] },
];

export const indexTape = [
  { id: "spx", symbol: "SPX", price: "6,286.54", percent: 0.31 },
  { id: "ndx", symbol: "NDX", price: "23,167.70", percent: -0.18 },
  { id: "indu", symbol: "INDU", price: "44,712.08", percent: 0.52 },
  { id: "vix", symbol: "VIX", price: "15.84", percent: -2.04 },
  { id: "us10y", symbol: "US10Y", price: "4.167", percent: 0.03 },
  { id: "dxy", symbol: "DXY", price: "97.84", percent: -0.22 },
] as const;

export const headlines = [
  { id: "n1", time: "13:04", flag: "BN", section: "Top", headline: "Chip shares diverge as capital-spending optimism meets profit taking", related: "NVDA AMD", summary: "Semiconductor volume runs above its 20-day average while breadth narrows into the afternoon." },
  { id: "n2", time: "12:57", flag: "BN", section: "Top", headline: "Treasury curve steepens as traders reprice the September policy path", related: "USGG10YR", summary: "Front-end yields ease after revisions to labor-market data; the dollar gives back early gains." },
  { id: "n3", time: "12:41", flag: "ECO", section: "Economics", headline: "Jobless-claims revisions point to a slower labor handoff", related: "USD", summary: "Continuing claims rise to the highest level since November as hiring intentions cool." },
  { id: "n4", time: "12:18", flag: "BN", section: "Markets", headline: "Megacap breadth narrows while banks extend session gains", related: "SPX JPM", summary: "Financials lead eight advancing sectors; communication services and energy lag." },
  { id: "n5", time: "11:52", flag: "RCH", section: "Research", headline: "Options desks see demand for upside semiconductor exposure", related: "SOX", summary: "One-month call skew firms as investors add exposure around the next earnings cycle." },
  { id: "n6", time: "11:31", flag: "BN", section: "Companies", headline: "Apple suppliers advance after stronger component order indications", related: "AAPL", summary: "Asian suppliers report improving utilization into the seasonal product ramp." },
  { id: "n7", time: "11:09", flag: "BN", section: "Markets", headline: "Oil slips below session midpoint as product inventories build", related: "CL1 XOM", summary: "Refining margins weaken even as crude stockpiles register a modest draw." },
  { id: "n8", time: "10:48", flag: "BNEF", section: "Industries", headline: "Grid investment is becoming the next constraint for data centers", related: "UTIL", summary: "Interconnection queues and transformer lead times reshape project economics." },
  { id: "n9", time: "10:22", flag: "BN", section: "Politics", headline: "Senate negotiators revive talks on a narrow tax package", related: "US", summary: "The proposal focuses on capital allowances and selected household provisions." },
] as const;

export type WorldIndex = {
  id: string;
  region: "Americas" | "EMEA" | "Asia/Pacific";
  name: string;
  ticker: string;
  last: string;
  net: number;
  percent: number;
  time: string;
  ytd: number;
  pe: string;
};

export const worldIndices: WorldIndex[] = [
  { id: "dow", region: "Americas", name: "Dow Jones Industrials", ticker: "INDU", last: "44,712.08", net: 232.18, percent: 0.52, time: "13:06", ytd: 5.18, pe: "22.4" },
  { id: "spx", region: "Americas", name: "S&P 500 Index", ticker: "SPX", last: "6,286.54", net: 19.44, percent: 0.31, time: "13:06", ytd: 8.29, pe: "24.1" },
  { id: "ccmp", region: "Americas", name: "NASDAQ Composite", ticker: "CCMP", last: "20,604.91", net: -34.83, percent: -0.17, time: "13:06", ytd: 7.12, pe: "33.8" },
  { id: "tsx", region: "Americas", name: "S&P/TSX Composite", ticker: "SPTSX", last: "27,036.16", net: 104.75, percent: 0.39, time: "13:06", ytd: 9.76, pe: "19.2" },
  { id: "ibov", region: "Americas", name: "Brazil Bovespa", ticker: "IBOV", last: "136,742.33", net: -481.22, percent: -0.35, time: "14:06", ytd: 13.74, pe: "10.1" },
  { id: "stoxx", region: "EMEA", name: "Euro Stoxx 50", ticker: "SX5E", last: "5,384.18", net: 41.62, percent: 0.78, time: "18:06", ytd: 10.04, pe: "16.8" },
  { id: "ukx", region: "EMEA", name: "FTSE 100", ticker: "UKX", last: "8,975.66", net: 23.71, percent: 0.26, time: "17:06", ytd: 9.84, pe: "13.4" },
  { id: "dax", region: "EMEA", name: "DAX Index", ticker: "DAX", last: "24,456.81", net: 168.36, percent: 0.69, time: "18:06", ytd: 22.76, pe: "18.5" },
  { id: "cac", region: "EMEA", name: "CAC 40", ticker: "CAC", last: "7,902.33", net: 49.08, percent: 0.62, time: "18:06", ytd: 6.89, pe: "15.1" },
  { id: "smi", region: "EMEA", name: "Swiss Market Index", ticker: "SMI", last: "12,014.44", net: -18.27, percent: -0.15, time: "18:06", ytd: 3.91, pe: "18.8" },
  { id: "nky", region: "Asia/Pacific", name: "Nikkei 225", ticker: "NKY", last: "41,826.34", net: 386.54, percent: 0.93, time: "15:30", ytd: 4.82, pe: "20.3" },
  { id: "hsi", region: "Asia/Pacific", name: "Hang Seng Index", ticker: "HSI", last: "24,028.37", net: -182.21, percent: -0.75, time: "16:08", ytd: 19.74, pe: "11.7" },
  { id: "shcomp", region: "Asia/Pacific", name: "Shanghai Composite", ticker: "SHCOMP", last: "3,509.68", net: 12.20, percent: 0.35, time: "15:00", ytd: 4.63, pe: "15.9" },
  { id: "as51", region: "Asia/Pacific", name: "S&P/ASX 200", ticker: "AS51", last: "8,589.24", net: -31.08, percent: -0.36, time: "16:10", ytd: 5.30, pe: "19.0" },
  { id: "kospi", region: "Asia/Pacific", name: "KOSPI Index", ticker: "KOSPI", last: "3,183.23", net: 18.17, percent: 0.57, time: "15:30", ytd: 32.69, pe: "12.2" },
];

export type EconomicEvent = {
  id: string;
  date: string;
  time: string;
  country: string;
  event: string;
  period: string;
  survey: string;
  actual: string;
  prior: string;
  importance: 1 | 2 | 3;
};

export const economicEvents: EconomicEvent[] = [
  { id: "e1", date: "THU 10 JUL", time: "08:30", country: "US", event: "Initial Jobless Claims", period: "Jul 5", survey: "235k", actual: "227k", prior: "232k", importance: 3 },
  { id: "e2", date: "THU 10 JUL", time: "08:30", country: "US", event: "Continuing Claims", period: "Jun 28", survey: "1,965k", actual: "1,974k", prior: "1,955k", importance: 2 },
  { id: "e3", date: "THU 10 JUL", time: "10:00", country: "US", event: "Wholesale Inventories MoM", period: "May F", survey: "-0.2%", actual: "-0.3%", prior: "-0.2%", importance: 2 },
  { id: "e4", date: "THU 10 JUL", time: "11:00", country: "US", event: "NY Fed 1-Yr Inflation Expectations", period: "Jun", survey: "—", actual: "3.0%", prior: "3.2%", importance: 2 },
  { id: "e5", date: "THU 10 JUL", time: "13:00", country: "US", event: "30-Year Bond Auction", period: "Jul", survey: "—", actual: "4.889%", prior: "4.844%", importance: 2 },
  { id: "e6", date: "FRI 11 JUL", time: "02:00", country: "GB", event: "Industrial Production MoM", period: "May", survey: "0.1%", actual: "—", prior: "-0.6%", importance: 2 },
  { id: "e7", date: "FRI 11 JUL", time: "02:00", country: "GB", event: "Manufacturing Production MoM", period: "May", survey: "0.2%", actual: "—", prior: "-0.9%", importance: 2 },
  { id: "e8", date: "FRI 11 JUL", time: "08:30", country: "CA", event: "Net Change in Employment", period: "Jun", survey: "0.0k", actual: "—", prior: "8.8k", importance: 3 },
  { id: "e9", date: "FRI 11 JUL", time: "08:30", country: "CA", event: "Unemployment Rate", period: "Jun", survey: "7.1%", actual: "—", prior: "7.0%", importance: 3 },
  { id: "e10", date: "FRI 11 JUL", time: "10:00", country: "US", event: "Fed Musalem Speaks on Economy", period: "—", survey: "—", actual: "—", prior: "—", importance: 2 },
];

export const functions = ["HOME", "WEI", "GP", "TOP", "ECO"] as const;
export type TerminalFunction = (typeof functions)[number];
