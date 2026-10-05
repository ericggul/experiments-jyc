export type LayerId =
  | "strikes"
  | "hotspots"
  | "conflicts"
  | "bases"
  | "nuclear"
  | "gamma"
  | "spaceports"
  | "cables"
  | "pipelines"
  | "datacenters"
  | "earthquakes"
  | "natural";

export type SituationPoint = {
  id: string;
  layer: LayerId;
  name: string;
  country: string;
  lat: number;
  lon: number;
  level: "high" | "elevated" | "monitoring" | "reference";
  detail: string;
  timestamp?: number;
};

export const layerDefinitions: {
  id: LayerId;
  label: string;
  glyph: string;
  defaultEnabled: boolean;
  dynamic?: boolean;
}[] = [
  { id: "strikes", label: "Iran attacks", glyph: "◆", defaultEnabled: true },
  { id: "hotspots", label: "Intel hotspots", glyph: "●", defaultEnabled: true },
  { id: "conflicts", label: "Conflict zones", glyph: "×", defaultEnabled: true },
  { id: "bases", label: "Military bases", glyph: "▣", defaultEnabled: true },
  { id: "nuclear", label: "Nuclear sites", glyph: "☢", defaultEnabled: true },
  { id: "gamma", label: "Gamma irradiators", glyph: "⌁", defaultEnabled: false },
  { id: "spaceports", label: "Spaceports", glyph: "◢", defaultEnabled: false },
  { id: "cables", label: "Undersea cables", glyph: "⌁", defaultEnabled: false },
  { id: "pipelines", label: "Pipelines", glyph: "━", defaultEnabled: true },
  { id: "datacenters", label: "AI data centers", glyph: "▤", defaultEnabled: false },
];

const p = (
  id: string,
  layer: LayerId,
  name: string,
  country: string,
  lat: number,
  lon: number,
  level: SituationPoint["level"],
  detail: string,
): SituationPoint => ({ id, layer, name, country, lat, lon, level, detail });

export const referencePoints: SituationPoint[] = [
  p("tehran-strike", "strikes", "Tehran air-defense sector", "Iran", 35.69, 51.39, "high", "Simulated high-volume air-defense and strike activity"),
  p("isfahan-strike", "strikes", "Isfahan strategic corridor", "Iran", 32.65, 51.67, "high", "Simulated strike corridor near strategic facilities"),
  p("bandar-abbas", "strikes", "Bandar Abbas approach", "Iran", 27.18, 56.27, "elevated", "Simulated maritime and air activity near the Strait of Hormuz"),
  p("bushehr-strike", "strikes", "Bushehr coastal sector", "Iran", 28.92, 50.84, "elevated", "Simulated coastal air-defense activity"),
  p("tel-aviv-strike", "strikes", "Tel Aviv alert area", "Israel", 32.09, 34.78, "high", "Simulated missile-warning and interceptor activity"),
  p("gulf-track", "strikes", "Central Gulf track", "Persian Gulf", 26.1, 52.2, "elevated", "Simulated aerial track crossing the Gulf"),
  p("ukraine", "conflicts", "Ukraine theater", "Ukraine", 48.38, 31.17, "high", "Active interstate conflict and contested airspace"),
  p("gaza", "conflicts", "Gaza theater", "Palestinian Territories", 31.42, 34.37, "high", "Active conflict and humanitarian emergency"),
  p("sudan", "conflicts", "Sudan theater", "Sudan", 15.5, 32.56, "high", "Civil conflict and severe displacement"),
  p("sahel", "conflicts", "Central Sahel", "Mali / Burkina Faso / Niger", 15.2, 1.8, "elevated", "Persistent insurgent activity and political instability"),
  p("syria", "conflicts", "Syria theater", "Syria", 35.0, 38.5, "elevated", "Fragmented security environment and cross-border military activity"),
  p("yemen", "conflicts", "Yemen and Red Sea", "Yemen", 15.55, 48.52, "high", "Conflict activity affecting Red Sea shipping and regional security"),
  p("drc", "conflicts", "Eastern DRC", "Democratic Republic of the Congo", -1.67, 29.23, "elevated", "Armed conflict and displacement in the eastern provinces"),
  p("somalia", "conflicts", "Somalia theater", "Somalia", 5.15, 46.2, "elevated", "Persistent insurgent activity and regional security operations"),
  p("myanmar", "conflicts", "Myanmar theater", "Myanmar", 19.75, 96.1, "elevated", "Civil conflict across multiple regions"),
  p("haiti", "conflicts", "Port-au-Prince", "Haiti", 18.54, -72.34, "elevated", "Armed-group violence and state-capacity stress"),
  p("dc", "hotspots", "Washington", "United States", 38.91, -77.04, "monitoring", "High-volume diplomatic and defense reporting"),
  p("new-york", "hotspots", "New York", "United States", 40.71, -74.01, "monitoring", "Diplomatic, financial, and international reporting concentration"),
  p("los-angeles", "hotspots", "Los Angeles", "United States", 34.05, -118.24, "monitoring", "Pacific-facing media and logistics reporting concentration"),
  p("san-francisco", "hotspots", "San Francisco", "United States", 37.77, -122.42, "monitoring", "Technology, maritime, and Pacific reporting concentration"),
  p("miami", "hotspots", "Miami", "United States", 25.76, -80.19, "monitoring", "Caribbean and Latin American reporting concentration"),
  p("mexico-city", "hotspots", "Mexico City", "Mexico", 19.43, -99.13, "monitoring", "Government, migration, and regional reporting concentration"),
  p("bogota", "hotspots", "Bogotá", "Colombia", 4.71, -74.07, "monitoring", "Andean security and diplomatic reporting concentration"),
  p("sao-paulo", "hotspots", "São Paulo", "Brazil", -23.55, -46.63, "monitoring", "South American financial and media reporting concentration"),
  p("london", "hotspots", "London", "United Kingdom", 51.51, -0.13, "monitoring", "Government and financial intelligence convergence"),
  p("paris", "hotspots", "Paris", "France", 48.86, 2.35, "monitoring", "European diplomatic and security reporting concentration"),
  p("berlin", "hotspots", "Berlin", "Germany", 52.52, 13.41, "monitoring", "European government and defense reporting concentration"),
  p("warsaw", "hotspots", "Warsaw", "Poland", 52.23, 21.01, "elevated", "NATO eastern-flank reporting concentration"),
  p("kyiv-hotspot", "hotspots", "Kyiv", "Ukraine", 50.45, 30.52, "elevated", "High-volume conflict and air-alert reporting"),
  p("brussels", "hotspots", "Brussels", "Belgium", 50.85, 4.35, "monitoring", "EU and NATO reporting concentration"),
  p("moscow", "hotspots", "Moscow", "Russia", 55.76, 37.62, "elevated", "Elevated strategic and sanctions reporting"),
  p("istanbul", "hotspots", "Istanbul", "Türkiye", 41.01, 28.98, "monitoring", "Black Sea and Middle East transit reporting concentration"),
  p("cairo", "hotspots", "Cairo", "Egypt", 30.04, 31.24, "monitoring", "Regional diplomacy and Red Sea reporting concentration"),
  p("riyadh", "hotspots", "Riyadh", "Saudi Arabia", 24.71, 46.67, "monitoring", "Gulf diplomatic and energy reporting concentration"),
  p("dubai", "hotspots", "Dubai", "United Arab Emirates", 25.2, 55.27, "monitoring", "Gulf aviation, shipping, and financial reporting concentration"),
  p("delhi", "hotspots", "New Delhi", "India", 28.61, 77.21, "monitoring", "South Asian government and defense reporting concentration"),
  p("mumbai-hotspot", "hotspots", "Mumbai", "India", 19.08, 72.88, "monitoring", "Indian Ocean trade and financial reporting concentration"),
  p("beijing", "hotspots", "Beijing", "China", 39.9, 116.4, "monitoring", "Trade, defense, and diplomatic reporting"),
  p("taipei", "hotspots", "Taipei", "Taiwan", 25.03, 121.57, "elevated", "Cross-strait military and political reporting"),
  p("pyongyang", "hotspots", "Pyongyang", "North Korea", 39.04, 125.76, "elevated", "Missile and nuclear-program monitoring"),
  p("seoul", "hotspots", "Seoul", "South Korea", 37.57, 126.98, "monitoring", "Peninsula security and technology reporting concentration"),
  p("tokyo", "hotspots", "Tokyo", "Japan", 35.68, 139.76, "monitoring", "Indo-Pacific government and financial reporting concentration"),
  p("manila", "hotspots", "Manila", "Philippines", 14.6, 120.98, "elevated", "South China Sea diplomatic and maritime reporting concentration"),
  p("singapore", "hotspots", "Singapore", "Singapore", 1.35, 103.82, "monitoring", "Maritime, trade, and regional reporting concentration"),
  p("jakarta", "hotspots", "Jakarta", "Indonesia", -6.21, 106.85, "monitoring", "Southeast Asian government and maritime reporting concentration"),
  p("sydney", "hotspots", "Sydney", "Australia", -33.87, 151.21, "monitoring", "Oceania media and Indo-Pacific reporting concentration"),
  p("caracas", "hotspots", "Caracas", "Venezuela", 10.48, -66.9, "monitoring", "Political and energy-market reporting"),
  p("pentagon", "bases", "The Pentagon", "United States", 38.87, -77.06, "reference", "US Department of Defense headquarters"),
  p("ramstein", "bases", "Ramstein Air Base", "Germany", 49.44, 7.6, "reference", "Major NATO and USAF logistics hub"),
  p("al-udeid", "bases", "Al Udeid Air Base", "Qatar", 25.12, 51.31, "reference", "Major coalition air operations hub"),
  p("diego-garcia", "bases", "Diego Garcia", "British Indian Ocean Territory", -7.32, 72.42, "reference", "Strategic Indian Ocean support facility"),
  p("yokosuka", "bases", "Yokosuka Naval Base", "Japan", 35.29, 139.67, "reference", "US Seventh Fleet forward base"),
  p("guam", "bases", "Andersen Air Force Base", "Guam", 13.58, 144.93, "reference", "Strategic Indo-Pacific air base"),
  p("natanz", "nuclear", "Natanz enrichment complex", "Iran", 33.72, 51.73, "reference", "IAEA-monitored uranium enrichment facility"),
  p("dimona", "nuclear", "Negev Nuclear Research Center", "Israel", 31.0, 35.15, "reference", "Strategic nuclear research site"),
  p("zapor", "nuclear", "Zaporizhzhia Nuclear Power Plant", "Ukraine", 47.51, 34.59, "elevated", "Nuclear safety monitoring in an active conflict zone"),
  p("fukushima", "nuclear", "Fukushima Daiichi", "Japan", 37.42, 141.03, "reference", "Decommissioning and environmental monitoring site"),
  p("kourou", "spaceports", "Guiana Space Centre", "French Guiana", 5.24, -52.77, "reference", "European orbital launch facility"),
  p("cape", "spaceports", "Cape Canaveral", "United States", 28.49, -80.58, "reference", "US civil and commercial launch complex"),
  p("vandenberg", "spaceports", "Vandenberg Space Force Base", "United States", 34.74, -120.57, "reference", "Polar-orbit launch complex"),
  p("jiuquan", "spaceports", "Jiuquan Satellite Launch Center", "China", 40.96, 100.29, "reference", "Chinese orbital launch center"),
  p("tanegashima", "spaceports", "Tanegashima Space Center", "Japan", 30.4, 130.97, "reference", "Japanese orbital launch complex"),
  p("ashburn", "datacenters", "Northern Virginia data corridor", "United States", 39.04, -77.49, "reference", "Largest global concentration of hyperscale data centers"),
  p("dublin-dc", "datacenters", "Dublin data corridor", "Ireland", 53.35, -6.26, "reference", "Major European hyperscale cluster"),
  p("singapore-dc", "datacenters", "Singapore data corridor", "Singapore", 1.35, 103.82, "reference", "Southeast Asian interconnection and cloud hub"),
  p("tokyo-dc", "datacenters", "Tokyo data corridor", "Japan", 35.68, 139.76, "reference", "Major APAC cloud and interconnection market"),
];

export const pipelineRoutes = [
  { id: "druzhba", name: "Druzhba", coordinates: [[31, 53], [24, 52], [19, 50], [14, 51]] },
  { id: "btc", name: "Baku–Tbilisi–Ceyhan", coordinates: [[49.9, 40.4], [44.8, 41.7], [36.7, 36.8]] },
  { id: "tap", name: "Trans Adriatic Pipeline", coordinates: [[20.0, 40.7], [16.9, 40.6], [15.5, 40.3]] },
  { id: "power-siberia", name: "Power of Siberia", coordinates: [[120, 62], [126, 53], [130, 48], [124, 46]] },
  { id: "keystone", name: "Keystone", coordinates: [[-114, 52], [-104, 46], [-97, 38], [-95, 30]] },
];

export const cableRoutes = [
  { id: "aea", name: "AEConnect-1", coordinates: [[-74, 40], [-40, 48], [-9, 53]] },
  { id: "sea-me-we", name: "SEA-ME-WE 5", coordinates: [[1, 51], [8, 38], [31, 31], [43, 12], [72, 19], [103, 1]] },
  { id: "unity", name: "Unity", coordinates: [[-122, 37], [-160, 30], [140, 35]] },
  { id: "sacs", name: "SACS", coordinates: [[13, -9], [-10, -15], [-38, -5]] },
];

export const strikeRoutes = [
  { id: "levant-tehran", coordinates: [[35.2, 32.1], [42.4, 34.9], [51.4, 35.7]] },
  { id: "gulf-isfahan", coordinates: [[51.3, 25.4], [52.8, 29.1], [51.7, 32.7]] },
  { id: "gulf-bandar", coordinates: [[53.7, 24.8], [55.2, 26.1], [56.3, 27.2]] },
  { id: "iraq-tehran", coordinates: [[44.4, 33.3], [47.5, 35.1], [51.4, 35.7]] },
] as const;

export type NewsChannel = {
  id: string;
  label: string;
  videoId: string;
  hlsUrl?: string;
};

export const newsChannels = [
  {
    id: "bloomberg",
    label: "Bloomberg",
    videoId: "iEpJwprxDdk",
    hlsUrl: "https://bloomberg.com/media-manifest/streams/us.m3u8",
  },
  {
    id: "sky",
    label: "SkyNews",
    videoId: "uvviIF4725I",
    hlsUrl: "https://linear901-oo-hls0-prd-gtm.delivery.skycdp.com/17501/sde-fast-skynews/master.m3u8",
  },
  {
    id: "euronews",
    label: "Euronews",
    videoId: "pykpO5kQJ98",
    hlsUrl: "https://dash4.antik.sk/live/test_euronews/playlist.m3u8",
  },
  {
    id: "dw",
    label: "DW",
    videoId: "LuKwFajn37U",
    hlsUrl: "https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/master.m3u8",
  },
  { id: "cnbc", label: "CNBC", videoId: "9NyxcX3rhQs" },
  {
    id: "france24",
    label: "France 24",
    videoId: "Ap-UM1O9RBU",
    hlsUrl: "https://amg00106-france24-france24-samsunguk-qvpp8.amagi.tv/playlist/amg00106-france24-france24-samsunguk/playlist.m3u8",
  },
  {
    id: "aljazeera",
    label: "Al Jazeera",
    videoId: "gCNeDWCI0vo",
    hlsUrl: "https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8",
  },
  {
    id: "cbs",
    label: "CBS News",
    videoId: "R9L8sDK8iEc",
    hlsUrl: "https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8",
  },
  {
    id: "trt",
    label: "TRT World",
    videoId: "ABfFhWzWs0s",
    hlsUrl: "https://tv-trtworld.medya.trt.com.tr/master.m3u8",
  },
  {
    id: "alarabiya",
    label: "Al Arabiya",
    videoId: "n7eQejkXbnM",
    hlsUrl: "https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8",
  },
] as const satisfies readonly NewsChannel[];

export const webcamFeeds = [
  { id: "jerusalem", city: "Jerusalem", region: "mideast", videoId: "7mnbtXqdmr0" },
  { id: "middle-east", city: "Middle East", region: "mideast", videoId: "oxT5R6I0N6E" },
  { id: "kyiv", city: "Kyiv", region: "europe", videoId: "-Q7FuPINDjA" },
  { id: "washington", city: "Washington DC", region: "americas", videoId: "1wV9lLe14aU" },
  { id: "tel-aviv", city: "Tel Aviv", region: "mideast", videoId: "gmtlJ_m2r5A" },
  { id: "beirut", city: "Beirut", region: "mideast", videoId: "djF-Lkgfp6k" },
  { id: "mecca", city: "Mecca", region: "mideast", videoId: "kJwEsQTegxk" },
  { id: "london", city: "London", region: "europe", videoId: "Lxqcg1qt0XU" },
  { id: "odessa", city: "Odessa", region: "europe", videoId: "e2gC37ILQmk" },
  { id: "paris", city: "Paris", region: "europe", videoId: "OzYp4NRZlwQ" },
  { id: "st-petersburg", city: "St. Petersburg", region: "europe", videoId: "CjtIYbmVfck" },
  { id: "new-york", city: "New York", region: "americas", videoId: "4qyZLflp-sI" },
  { id: "los-angeles", city: "Los Angeles", region: "americas", videoId: "EO_1LWqsCNE" },
  { id: "miami", city: "Miami", region: "americas", videoId: "5YCajRjvWCg" },
  { id: "taipei", city: "Taipei", region: "asia", videoId: "z_fY1pj1VBw" },
  { id: "tokyo", city: "Tokyo", region: "asia", videoId: "_k-5U7IeK8g" },
  { id: "shanghai", city: "Shanghai", region: "asia", videoId: "76EwqI5XZIc" },
  { id: "sydney", city: "Sydney", region: "asia", videoId: "7pcL-0Wo77U" },
  { id: "iss", city: "ISS Earth View", region: "space", videoId: "vytmBNhc9ig" },
  { id: "nasa", city: "NASA ISS HD", region: "space", videoId: "zPH5KtjJFaQ" },
] as const;

export const theaterPostures = [
  { id: "iran", name: "Iran Theater", level: "CRIT", aircraft: 12, vessels: 7, trend: "Escalating" },
  { id: "ukraine", name: "Ukraine Theater", level: "HIGH", aircraft: 18, vessels: 4, trend: "Sustained" },
  { id: "taiwan", name: "Taiwan Strait", level: "WATCH", aircraft: 9, vessels: 11, trend: "Elevated" },
];

export const worldBriefSignals = [
  { id: "brief-iran", source: "AP", region: "US / IRAN", text: "Escalation coverage and diplomatic reaction" },
  { id: "brief-energy", source: "REUTERS", region: "ENERGY", text: "Oil markets track Hormuz and Red Sea risk" },
  { id: "brief-region", source: "AL JAZEERA", region: "MIDEAST", text: "Live updates across Iran, the Gulf, and the Levant" },
  { id: "brief-seismic", source: "USGS", region: "GLOBAL", text: "M2.5+ seismic events from the all-day public feed" },
] as const;
