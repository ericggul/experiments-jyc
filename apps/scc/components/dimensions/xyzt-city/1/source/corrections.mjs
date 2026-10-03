// Verified construction-year corrections for tall current records whose NYC `construction_year`
// is a site/start date or otherwise wrong. Matched by doitt_id via centroid + height; t0 is the
// completion/opening year from the cited page (checked 2026-10-03). Unverifiable suspects are
// left alone (e.g. c:1261612, 280 m near Broadway/Chambers, 2016).
export const CORRECTIONS = [
  { id: "c:1114961", name: "One World Trade Center", t0: 2014, url: "https://en.wikipedia.org/wiki/One_World_Trade_Center" },
  { id: "c:1255672", name: "3 World Trade Center", t0: 2018, url: "https://en.wikipedia.org/wiki/3_World_Trade_Center" },
  { id: "c:1255932", name: "4 World Trade Center", t0: 2013, url: "https://en.wikipedia.org/wiki/4_World_Trade_Center" },
  { id: "c:996239", name: "7 World Trade Center", t0: 2006, url: "https://en.wikipedia.org/wiki/7_World_Trade_Center" },
];
