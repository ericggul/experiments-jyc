import type { ComponentType } from "react";

export type GoldfishExperiment = {
  key: string;
  legacyKeys?: readonly string[];
  area: "screen" | "pc" | "desktop" | "maximalist-collage";
  section: "default" | "2d" | "dated";
  date: string | null;
  phrase: string;
  load: () => Promise<{ default: ComponentType }>;
};

export const goldfishExperiments: readonly GoldfishExperiment[] = [
  { key: "maximalist-collage/0915/1", legacyKeys: ["pc/0915/maximalist-collage"], area: "maximalist-collage", section: "dated", date: "2026-09-15", phrase: "Interface cut-ups · click to overprint an accumulating flat collage", load: () => import("./maximalist-collage/0915/1") },
  { key: "desktop/0915/1", area: "desktop", section: "dated", date: "2026-09-15", phrase: "Native desktop · preserved configurable baseline", load: () => import("./desktop/0915/1/controller") },
  { key: "desktop/0915/2", area: "desktop", section: "dated", date: "2026-09-15", phrase: "Native windows · accumulation, drift and interrupted attention", load: () => import("./desktop/0915/2/controller") },
  { key: "desktop/0915/3", area: "desktop", section: "dated", date: "2026-09-15", phrase: "Return and interrupt · new pages mixed with random tab revisits", load: () => import("./desktop/0915/3/controller") },
  {
    key: "screen/default",
    legacyKeys: ["default", "3d/1"],
    area: "screen",
    section: "default",
    date: null,
    phrase: "Orthographic 3D goldfish attraction field",
    load: () => import("./screen/default"),
  },
  {
    key: "screen/2d/1",
    legacyKeys: ["2d/1"],
    area: "screen",
    section: "2d",
    date: null,
    phrase: "Glyph swarm and media attention cells",
    load: () => import("./screen/2d/1"),
  },
  {
    key: "screen/0804/tube",
    legacyKeys: ["0804/tube", "3d/2", "0804/1"],
    area: "screen",
    section: "dated",
    date: "2026-08-04",
    phrase: "Tube stations as persistent attraction targets",
    load: () => import("./screen/0804/tube"),
  },
  {
    key: "screen/0804/html",
    legacyKeys: ["0804/html"],
    area: "screen",
    section: "dated",
    date: "2026-08-04",
    phrase: "Live HTML forms as bidirectional attraction targets",
    load: () => import("./screen/0804/html"),
  },
  {
    key: "screen/0804/node-edge",
    legacyKeys: ["0804/node-edge"],
    area: "screen",
    section: "dated",
    date: "2026-08-04",
    phrase: "Entropy-generated 3D topology as a persistent attraction field",
    load: () => import("./screen/0804/node-edge"),
  },
  {
    key: "screen/0804/pillars",
    legacyKeys: ["0804/pillars", "3d/3", "0804/2"],
    area: "screen",
    section: "dated",
    date: "2026-08-04",
    phrase: "Randomized vertical attention pillars",
    load: () => import("./screen/0804/pillars"),
  },
  {
    key: "screen/0806/side-view",
    legacyKeys: ["0806/side-view"],
    area: "screen",
    section: "dated",
    date: "2026-08-06",
    phrase: "Pillars fork with a side-on initial view",
    load: () => import("./screen/0806/side-view"),
  },
  {
    key: "screen/0806/compositional-grid",
    legacyKeys: ["0806/compositional-grid"],
    area: "screen",
    section: "dated",
    date: "2026-08-06",
    phrase: "Locally reconfiguring composite media grid",
    load: () => import("./screen/0806/compositional-grid"),
  },
  {
    key: "screen/0806/duration",
    legacyKeys: ["0806/duration"],
    area: "screen",
    section: "dated",
    date: "2026-08-06",
    phrase: "Temporal pillars accumulating beneath a fixed present",
    load: () => import("./screen/0806/duration"),
  },
  {
    key: "screen/0806/temporal-decay",
    legacyKeys: ["0806/temporal-decay"],
    area: "screen",
    section: "dated",
    date: "2026-08-06",
    phrase: "Short-lived active strata leaving frozen pillars",
    load: () => import("./screen/0806/temporal-decay"),
  },
  {
    key: "screen/0908/aggregated",
    legacyKeys: ["0908/aggregated"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "A goldfish school attending a spreading keyword field",
    load: () => import("./screen/0908/aggregated"),
  },
  {
    key: "screen/0908/dots",
    legacyKeys: ["0908/dots"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Instagram/4 keyword field preserved unchanged",
    load: () => import("./screen/0908/dots"),
  },
  {
    key: "screen/0908/overlay",
    legacyKeys: ["0908/overlay"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Original Instagram/4 field with a transparent goldfish school",
    load: () => import("./screen/0908/overlay"),
  },
  {
    key: "screen/0908/overlay-2",
    legacyKeys: ["0908/overlay-2"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Original 3D goldfish school with configurable keyword surfaces",
    load: () => import("./screen/0908/overlay-2"),
  },
  {
    key: "screen/0908/overlay-3",
    legacyKeys: ["0908/overlay-3"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Original 3D goldfish school with switchable technology typefaces",
    load: () => import("./screen/0908/overlay-3"),
  },
  {
    key: "screen/0908/overlay-4",
    legacyKeys: ["0908/overlay-4"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Recorded underwater textures from goldfish approach events",
    load: () => import("./screen/0908/overlay-4"),
  },
  {
    key: "screen/0908/overlay-5",
    legacyKeys: ["0908/overlay-5"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Slower, roomier attention field with approach rings initially hidden",
    load: () => import("./screen/0908/overlay-5"),
  },
  {
    key: "screen/0908/overlay-2d",
    legacyKeys: ["0908/overlay-2d"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Original Instagram/4 field with Canvas2D goldfish glyphs",
    load: () => import("./screen/0908/overlay-2d"),
  },
  {
    key: "screen/0908/overlay-2d-2",
    legacyKeys: ["0908/overlay-2d-2"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Persistent individual goldfish trails replacing influence edges",
    load: () => import("./screen/0908/overlay-2d-2"),
  },
  {
    key: "screen/0908/overlay-2d-3",
    legacyKeys: ["0908/overlay-2d-3"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Local attention and trail memory co-evolving with the keyword field",
    load: () => import("./screen/0908/overlay-2d-3"),
  },
  {
    key: "screen/0908/overlay-2d-4",
    legacyKeys: ["0908/overlay-2d-4"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Explicit fish targets, attention contact and keyword propagation",
    load: () => import("./screen/0908/overlay-2d-4"),
  },
  {
    key: "screen/0908/attention-print",
    legacyKeys: ["0908/attention-print"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Serial technology signs interrupted by living attention and accumulated ink",
    load: () => import("./screen/0908/attention-print"),
  },
  {
    key: "screen/0922/default",
    legacyKeys: ["0922/default"],
    area: "screen",
    section: "dated",
    date: "2026-09-22",
    phrase: "Preserved overlay-5 attention field as the 0922 baseline",
    load: () => import("./screen/0922/default"),
  },
  {
    key: "screen/0922/blink-auto",
    legacyKeys: ["0922/blink-auto"],
    area: "screen",
    section: "dated",
    date: "2026-09-23",
    phrase: "Accepted independent full-tech-eye auto-blink baseline before manual blink-all",
    load: () => import("./screen/0922/blink-auto"),
  },
  {
    key: "pc/0908/default",
    legacyKeys: [],
    area: "pc",
    section: "dated",
    date: "2026-09-08",
    phrase: "Independent keyword-driven news phones, one per goldfish",
    load: () => import("./pc/0908/default"),
  },
  {
    key: "pc/0908/variations",
    legacyKeys: [],
    area: "pc",
    section: "dated",
    date: "2026-09-08",
    phrase: "Mobile colour and keyword surface variations",
    load: () => import("./pc/0908/variations"),
  },
  {
    key: "pc/0910/image-search",
    legacyKeys: [],
    area: "pc",
    section: "dated",
    date: "2026-09-10",
    phrase: "Desktop image-search grammar under subsecond technology-query replacement",
    load: () => import("./pc/0910/image-search"),
  },
];

export const goldfishExperimentDateKeys = Array.from(
  new Set(
    goldfishExperiments
      .filter((experiment) => experiment.section === "dated")
      .map((experiment) => experiment.key.split("/")[1]),
  ),
);

export function findGoldfishExperiment(path: readonly string[]) {
  const key = path.join("/");
  return goldfishExperiments.find(
    (experiment) =>
      experiment.key === key || experiment.legacyKeys?.includes(key),
  );
}

export function getGoldfishExperimentsForDate(
  dateKey: string,
  area: GoldfishExperiment["area"] = "screen",
) {
  return goldfishExperiments.filter(
    (experiment) =>
      experiment.area === area &&
      experiment.section === "dated" &&
      experiment.key.startsWith(`${area}/${dateKey}/`),
  );
}
