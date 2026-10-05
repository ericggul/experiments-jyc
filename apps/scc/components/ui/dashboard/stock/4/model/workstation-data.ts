export type DirectionalRecord = {
  id: string;
  symbol: string;
  name: string;
  last: string;
  day: number;
  week: number;
  month: number;
  year: number;
  series: number[];
};

function makeSeries(base: number, slope: number, amplitude: number, phase: number, count = 52) {
  let value = base;
  let state = (0x9e3779b9 ^ ((phase + 1) * 0x85ebca6b)) >>> 0;
  return Array.from({ length: count }, (_, index) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const centered = state / 0xffffffff - 0.5;
    const impulse = index % (11 + (phase % 4)) === 0 ? (phase % 2 === 0 ? 0.75 : -0.62) : 0;
    value += slope + centered * amplitude * 1.42 + impulse * amplitude;
    return Number(value.toFixed(3));
  });
}

export const sessionClocks = [
  { id: "clock-ny", city: "New York", time: "13:41:18", session: "OPEN", temperature: "76°", condition: "Clear", offset: "UTC−04", hours: "09:30–16:00" },
  { id: "clock-lon", city: "London", time: "18:41:18", session: "CLOSED", temperature: "61°", condition: "Cloudy", offset: "UTC+01", hours: "08:00–16:30" },
  { id: "clock-hk", city: "Hong Kong", time: "01:41:18", session: "CLOSED", temperature: "88°", condition: "Humid", offset: "UTC+08", hours: "09:30–16:00" },
  { id: "clock-tky", city: "Tokyo", time: "02:41:18", session: "CLOSED", temperature: "79°", condition: "Rain", offset: "UTC+09", hours: "09:00–15:30" },
] as const;

export const localMarkets = [
  { id: "local-spx", symbol: "SPX", name: "S&P 500", last: "6,286.54", net: "+19.44", percent: 0.31 },
  { id: "local-ndx", symbol: "NDX", name: "NASDAQ 100", last: "23,167.70", net: "−41.72", percent: -0.18 },
  { id: "local-dax", symbol: "DAX", name: "DAX INDEX", last: "24,456.81", net: "+168.36", percent: 0.69 },
  { id: "local-nky", symbol: "NKY", name: "NIKKEI 225", last: "41,826.34", net: "+386.54", percent: 0.93 },
  { id: "local-ukx", symbol: "UKX", name: "FTSE 100", last: "8,975.66", net: "+23.71", percent: 0.26 },
  { id: "local-hsi", symbol: "HSI", name: "HANG SENG", last: "24,028.37", net: "−182.21", percent: -0.75 },
  { id: "local-cl", symbol: "CL1", name: "WTI CRUDE", last: "66.57", net: "−0.75", percent: -1.12 },
  { id: "local-xau", symbol: "XAU", name: "GOLD SPOT", last: "3,328.14", net: "+15.94", percent: 0.48 },
  { id: "local-eur", symbol: "EUR", name: "EUR / USD", last: "1.1704", net: "+0.0022", percent: 0.19 },
  { id: "local-btc", symbol: "BTC", name: "BITCOIN", last: "118,340", net: "+1,648", percent: 1.41 },
  { id: "local-cac", symbol: "CAC", name: "CAC 40", last: "7,902.33", net: "+48.71", percent: .62 },
  { id: "local-kospi", symbol: "KOSPI", name: "KOSPI INDEX", last: "3,183.23", net: "+18.08", percent: .57 },
  { id: "local-us10y", symbol: "US10Y", name: "US TREASURY 10Y", last: "4.167", net: "+0.013", percent: .31 },
  { id: "local-dxy", symbol: "DXY", name: "DOLLAR INDEX", last: "97.84", net: "−0.22", percent: -.22 },
  { id: "local-gbp", symbol: "GBP", name: "BRITISH POUND", last: "1.3418", net: "+0.0016", percent: .12 },
  { id: "local-jpy", symbol: "JPY", name: "YEN SPOT", last: "146.52", net: "−0.50", percent: -.34 },
  { id: "local-vix", symbol: "VIX", name: "CBOE VOLATILITY", last: "15.84", net: "−0.33", percent: -2.04 },
  { id: "local-sox", symbol: "SOX", name: "SEMICONDUCTOR", last: "5,731.40", net: "+105.44", percent: 1.88 },
  { id: "local-aapl", symbol: "AAPL", name: "APPLE INC", last: "214.29", net: "+1.18", percent: .55 },
  { id: "local-nvda", symbol: "NVDA", name: "NVIDIA CORP", last: "201.96", net: "−2.17", percent: -1.06 },
] as const;

export const sessionBrief = [
  { id: "brief-1", time: "08:30", country: "US", event: "Initial Jobless Claims", actual: "227k", survey: "235k", prior: "232k" },
  { id: "brief-2", time: "10:00", country: "US", event: "Wholesale Inventories MoM", actual: "−0.3%", survey: "−0.2%", prior: "−0.2%" },
  { id: "brief-3", time: "11:00", country: "US", event: "NY Fed Inflation Expectations", actual: "3.0%", survey: "—", prior: "3.2%" },
  { id: "brief-4", time: "13:00", country: "US", event: "30-Year Bond Auction", actual: "4.889%", survey: "—", prior: "4.844%" },
  { id: "brief-5", time: "14:00", country: "US", event: "Monthly Budget Statement", actual: "—", survey: "−$11.0B", prior: "+$27.0B" },
] as const;

export const globalMarketRows: DirectionalRecord[] = [
  { id: "global-spx", symbol: "SPX", name: "S&P 500 Index", last: "6,286.54", day: 0.31, week: 1.42, month: 2.84, year: 8.29, series: makeSeries(98, .18, 1.2, 0) },
  { id: "global-ndx", symbol: "NDX", name: "NASDAQ 100", last: "23,167.70", day: -0.18, week: .76, month: 3.22, year: 9.41, series: makeSeries(104, .12, 1.7, 1) },
  { id: "global-indu", symbol: "INDU", name: "Dow Jones Industrials", last: "44,712.08", day: .52, week: 1.13, month: 1.68, year: 5.18, series: makeSeries(94, .14, 1.1, 2) },
  { id: "global-rty", symbol: "RTY", name: "Russell 2000", last: "2,248.60", day: 1.12, week: 2.43, month: 1.19, year: .88, series: makeSeries(92, .08, 1.9, 3) },
  { id: "global-sx5e", symbol: "SX5E", name: "Euro Stoxx 50", last: "5,384.18", day: .78, week: 1.91, month: .82, year: 10.04, series: makeSeries(96, .2, 1.25, 4) },
  { id: "global-dax", symbol: "DAX", name: "DAX Index", last: "24,456.81", day: .69, week: 1.58, month: 1.2, year: 22.76, series: makeSeries(91, .31, 1.45, 5) },
  { id: "global-ukx", symbol: "UKX", name: "FTSE 100", last: "8,975.66", day: .26, week: .44, month: 1.06, year: 9.84, series: makeSeries(97, .17, .9, 6) },
  { id: "global-cac", symbol: "CAC", name: "CAC 40", last: "7,902.33", day: .62, week: 1.23, month: .68, year: 6.89, series: makeSeries(98, .11, 1.3, 7) },
  { id: "global-nky", symbol: "NKY", name: "Nikkei 225", last: "41,826.34", day: .93, week: 2.28, month: 4.04, year: 4.82, series: makeSeries(95, .22, 1.6, 8) },
  { id: "global-hsi", symbol: "HSI", name: "Hang Seng Index", last: "24,028.37", day: -.75, week: -1.48, month: .38, year: 19.74, series: makeSeries(112, -.08, 1.8, 9) },
  { id: "global-shcomp", symbol: "SHCOMP", name: "Shanghai Composite", last: "3,509.68", day: .35, week: .61, month: 1.53, year: 4.63, series: makeSeries(96, .09, 1.4, 10) },
  { id: "global-kospi", symbol: "KOSPI", name: "KOSPI Index", last: "3,183.23", day: .57, week: 1.74, month: 5.16, year: 32.69, series: makeSeries(88, .38, 1.8, 11) },
  { id: "global-dxy", symbol: "DXY", name: "Dollar Index", last: "97.84", day: -.22, week: -.81, month: -1.74, year: -9.96, series: makeSeries(108, -.2, 1, 12) },
  { id: "global-eur", symbol: "EURUSD", name: "Euro / US Dollar", last: "1.1704", day: .19, week: .72, month: 1.41, year: 13.29, series: makeSeries(92, .23, .7, 13) },
  { id: "global-jpy", symbol: "USDJPY", name: "US Dollar / Yen", last: "146.52", day: -.34, week: -1.08, month: -2.11, year: -6.24, series: makeSeries(108, -.15, 1.2, 14) },
  { id: "global-us2y", symbol: "US2Y", name: "US Treasury 2Y", last: "3.862", day: -.02, week: -.06, month: -.18, year: -1.02, series: makeSeries(101, -.02, .5, 15) },
  { id: "global-us10y", symbol: "US10Y", name: "US Treasury 10Y", last: "4.167", day: .03, week: .11, month: -.24, year: -.21, series: makeSeries(99, .01, .65, 16) },
  { id: "global-cl", symbol: "CL1", name: "WTI Crude Future", last: "66.57", day: -1.12, week: -2.26, month: -4.71, year: -7.83, series: makeSeries(110, -.18, 1.6, 17) },
  { id: "global-xau", symbol: "XAU", name: "Gold Spot", last: "3,328.14", day: .48, week: 1.62, month: 2.08, year: 26.14, series: makeSeries(86, .42, 1.4, 18) },
  { id: "global-btc", symbol: "BTC", name: "Bitcoin", last: "118,340", day: 1.41, week: 5.73, month: 11.42, year: 27.91, series: makeSeries(82, .48, 3.1, 19) },
];

export const matrixExtraRows: DirectionalRecord[] = [
  { id: "matrix-es1", symbol: "ES1", name: "S&P 500 Future", last: "6,292.25", day: .28, week: 1.36, month: 2.71, year: 8.12, series: makeSeries(97, .16, 1.35, 21) },
  { id: "matrix-nq1", symbol: "NQ1", name: "Nasdaq 100 Future", last: "23,224.75", day: -.14, week: .68, month: 3.04, year: 9.02, series: makeSeries(105, .1, 1.8, 22) },
  { id: "matrix-vix", symbol: "VIX", name: "CBOE Volatility Index", last: "15.84", day: -2.04, week: -3.48, month: -6.21, year: -12.88, series: makeSeries(112, -.22, 2.15, 23) },
  { id: "matrix-move", symbol: "MOVE", name: "ICE BofA MOVE Index", last: "88.14", day: -.64, week: -1.82, month: -4.36, year: -18.62, series: makeSeries(108, -.18, 1.7, 24) },
  { id: "matrix-gb10", symbol: "GDBR10", name: "Germany Government 10Y", last: "2.714", day: .04, week: .18, month: -.31, year: .42, series: makeSeries(99, .015, .42, 25) },
  { id: "matrix-jp10", symbol: "GJGB10", name: "Japan Government 10Y", last: "1.578", day: .02, week: .09, month: .21, year: .64, series: makeSeries(96, .025, .46, 26) },
  { id: "matrix-gbp", symbol: "GBPUSD", name: "British Pound / US Dollar", last: "1.3418", day: .12, week: .56, month: 1.22, year: 6.78, series: makeSeries(93, .16, .82, 27) },
  { id: "matrix-aud", symbol: "AUDUSD", name: "Australian Dollar / US Dollar", last: ".6594", day: -.08, week: .31, month: .74, year: 2.61, series: makeSeries(96, .07, .9, 28) },
] as const;

export const matrixGroups = [
  { id: "matrix-us", name: "US EQUITY", rows: globalMarketRows.slice(0, 4) },
  { id: "matrix-eu", name: "EUROPE", rows: globalMarketRows.slice(4, 8) },
  { id: "matrix-asia", name: "ASIA / PACIFIC", rows: globalMarketRows.slice(8, 12) },
  { id: "matrix-fx", name: "CURRENCIES", rows: globalMarketRows.slice(12, 16) },
  { id: "matrix-cross", name: "RATES / COMMODITIES", rows: globalMarketRows.slice(16, 20) },
] as const;

export const activeRows = [
  { id: "active-amd", symbol: "AMD", last: "166.45", volume: "112.8M", percent: 6.6 },
  { id: "active-nvda", symbol: "NVDA", last: "201.96", volume: "87.2M", percent: -1.06 },
  { id: "active-tsla", symbol: "TSLA", last: "316.42", volume: "103.6M", percent: -1.79 },
  { id: "active-aapl", symbol: "AAPL", last: "214.29", volume: "41.8M", percent: .55 },
  { id: "active-msft", symbol: "MSFT", last: "503.32", volume: "22.4M", percent: .73 },
  { id: "active-avgo", symbol: "AVGO", last: "281.62", volume: "29.1M", percent: 3.42 },
  { id: "active-jpm", symbol: "JPM", last: "286.91", volume: "10.9M", percent: 1 },
  { id: "active-meta", symbol: "META", last: "715.44", volume: "15.8M", percent: .41 },
  { id: "active-amzn", symbol: "AMZN", last: "223.18", volume: "33.6M", percent: -.32 },
  { id: "active-xom", symbol: "XOM", last: "112.31", volume: "19.2M", percent: -.76 },
  { id: "active-googl", symbol: "GOOGL", last: "183.77", volume: "25.2M", percent: .64 },
  { id: "active-bac", symbol: "BAC", last: "47.18", volume: "44.7M", percent: 1.23 },
  { id: "active-intc", symbol: "INTC", last: "23.41", volume: "51.8M", percent: -.47 },
  { id: "active-mu", symbol: "MU", last: "126.72", volume: "31.4M", percent: 2.08 },
  { id: "active-coin", symbol: "COIN", last: "390.12", volume: "22.9M", percent: 2.67 },
  { id: "active-pltr", symbol: "PLTR", last: "147.01", volume: "48.3M", percent: 1.82 },
  { id: "active-ba", symbol: "BA", last: "226.34", volume: "12.1M", percent: -.88 },
  { id: "active-nflx", symbol: "NFLX", last: "1,250.18", volume: "8.2M", percent: -2.14 },
] as const;

export const breadthGroups = [
  { id: "breadth-us", title: "US Equity", advancing: 67, declining: 33, rows: [["Technology", 74], ["Financials", 63], ["Industrials", 58], ["Health Care", 46], ["Energy", 38]] },
  { id: "breadth-world", title: "World by Region", advancing: 58, declining: 42, rows: [["Americas", 61], ["Europe", 68], ["Asia Pacific", 54], ["Emerging", 43], ["Frontier", 35]] },
] as const;

export const macroCards = [
  { id: "macro-spx", symbol: "SPX", last: "6,286.54", percent: .31, high: "6,301.12", low: "6,248.38", series: makeSeries(97, .18, 1.2, 0, 20) },
  { id: "macro-eur", symbol: "EURUSD", last: "1.1704", percent: .19, high: "1.1732", low: "1.1658", series: makeSeries(100, .08, .8, 1, 20) },
  { id: "macro-us10", symbol: "US10Y", last: "4.167", percent: .03, high: "4.181", low: "4.124", series: makeSeries(100, .02, .5, 2, 20) },
  { id: "macro-cl", symbol: "CL1", last: "66.57", percent: -1.12, high: "67.88", low: "66.31", series: makeSeries(106, -.15, 1.1, 3, 20) },
  { id: "macro-xau", symbol: "XAU", last: "3,328.14", percent: .48, high: "3,341", low: "3,302", series: makeSeries(96, .18, 1.5, 4, 20) },
  { id: "macro-vix", symbol: "VIX", last: "15.84", percent: -2.04, high: "16.52", low: "15.61", series: makeSeries(108, -.22, 1.8, 5, 20) },
  { id: "macro-dxy", symbol: "DXY", last: "97.84", percent: -.22, high: "98.21", low: "97.61", series: makeSeries(103, -.08, .7, 6, 20) },
  { id: "macro-btc", symbol: "BTC", last: "118,340", percent: 1.41, high: "119,112", low: "115,804", series: makeSeries(94, .35, 2.1, 7, 20) },
  { id: "macro-nvda", symbol: "NVDA", last: "201.96", percent: -1.06, high: "206.06", low: "199.61", series: makeSeries(104, -.08, 2.4, 8, 20) },
  { id: "macro-sox", symbol: "SOX", last: "5,731.40", percent: 1.88, high: "5,766", low: "5,608", series: makeSeries(90, .38, 1.9, 9, 20) },
] as const;

export const newsRows = [
  { id: "news-1", time: "13:04", tag: "TOP", text: "Chip shares diverge as spending optimism meets afternoon profit taking" },
  { id: "news-2", time: "12:57", tag: "FI", text: "Treasury curve steepens as front-end yields ease after labor revisions" },
  { id: "news-3", time: "12:41", tag: "ECO", text: "Continuing claims rise while hiring intentions cool across services" },
  { id: "news-4", time: "12:18", tag: "MKT", text: "Banks extend gains as megacap breadth narrows" },
  { id: "news-5", time: "11:52", tag: "OPT", text: "Options desks report firmer demand for semiconductor upside" },
  { id: "news-6", time: "11:31", tag: "EQTY", text: "Apple suppliers advance on stronger component orders" },
  { id: "news-7", time: "11:09", tag: "CMD", text: "Oil slips as product inventories build" },
  { id: "news-8", time: "10:48", tag: "BN", text: "Grid investment becomes the next data-center constraint" },
  { id: "news-9", time: "10:22", tag: "POL", text: "Senate negotiators revive narrow tax-package talks" },
  { id: "news-10", time: "09:57", tag: "FX", text: "Dollar pares early advance as rate differentials compress" },
  { id: "news-11", time: "09:41", tag: "FI", text: "Credit spreads hold near twelve-month tights" },
  { id: "news-12", time: "09:18", tag: "EQTY", text: "European cyclicals lead as revisions stabilize" },
  { id: "news-13", time: "08:52", tag: "ECO", text: "Survey expectations soften before regional factory data" },
  { id: "news-14", time: "08:31", tag: "MKT", text: "US futures edge higher after claims release" },
] as const;

export const comparisonSeries = {
  selected: makeSeries(82, .92, 3.8, 0),
  benchmark: makeSeries(91, .58, 2.1, 2),
  sector: makeSeries(86, .76, 3, 4),
  breadth: makeSeries(94, .42, 2.6, 6),
} as const;
