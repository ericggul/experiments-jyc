export type GoldfishArea =
  | "screen"
  | "pc"
  | "desktop"
  | "maximalist-collage"
  | "mobile";

export const goldfishAreas: readonly { key: GoldfishArea; href: string }[] = [
  { key: "screen", href: "/screen" },
  { key: "pc", href: "/pc" },
  { key: "desktop", href: "/desktop" },
  { key: "maximalist-collage", href: "/maximalist-collage" },
  { key: "mobile", href: "/mobile" },
];

export type GoldfishFamily = {
  key: string;
  area: GoldfishArea;
  label: string;
  /** Experiment keys in lineage order; each key belongs to one family. */
  members: readonly string[];
};

// Lineages for the group view, in the order each line of work began. A
// registered experiment missing here appears under its area's "unsorted"
// family until it is assigned.
export const goldfishFamilies: readonly GoldfishFamily[] = [
  {
    key: "screen:baseline",
    area: "screen",
    label: "baseline",
    members: ["screen/default", "screen/2d/1"],
  },
  {
    key: "screen:attraction-targets",
    area: "screen",
    label: "attraction targets",
    members: ["screen/0804/tube", "screen/0804/html", "screen/0804/node-edge"],
  },
  {
    key: "screen:pillars",
    area: "screen",
    label: "pillars",
    members: [
      "screen/0804/pillars",
      "screen/0806/side-view",
      "screen/0806/duration",
      "screen/0806/temporal-decay",
    ],
  },
  {
    key: "screen:media-grid",
    area: "screen",
    label: "media grid",
    members: ["screen/0806/compositional-grid"],
  },
  {
    key: "screen:keyword-field",
    area: "screen",
    label: "keyword field",
    members: ["screen/0908/dots", "screen/0908/aggregated"],
  },
  {
    key: "screen:overlay-3d",
    area: "screen",
    label: "3D overlay",
    members: [
      "screen/0908/overlay",
      "screen/0908/overlay-2",
      "screen/0908/overlay-3",
      "screen/0908/overlay-4",
      "screen/0908/overlay-5",
    ],
  },
  {
    key: "screen:overlay-2d",
    area: "screen",
    label: "2D overlay",
    members: [
      "screen/0908/overlay-2d",
      "screen/0908/overlay-2d-2",
      "screen/0908/overlay-2d-3",
      "screen/0908/overlay-2d-4",
    ],
  },
  {
    key: "screen:attention-print",
    area: "screen",
    label: "attention print",
    members: ["screen/0908/attention-print"],
  },
  {
    key: "screen:tech-eyes",
    area: "screen",
    label: "tech eyes",
    members: [
      "screen/0922/default",
      "screen/0922/blink-auto",
      "screen/0922/interactive",
    ],
  },
  {
    key: "pc:news-phones",
    area: "pc",
    label: "news phones",
    members: ["pc/0908/default", "pc/0908/variations"],
  },
  {
    key: "pc:image-search",
    area: "pc",
    label: "image search",
    members: ["pc/0910/image-search"],
  },
  {
    key: "desktop:native-windows",
    area: "desktop",
    label: "native windows",
    members: ["desktop/0915/1", "desktop/0915/2", "desktop/0915/3"],
  },
  {
    key: "maximalist-collage:cut-ups",
    area: "maximalist-collage",
    label: "interface cut-ups",
    members: ["maximalist-collage/0915/1"],
  },
  {
    key: "mobile:keyword-grid",
    area: "mobile",
    label: "keyword grid",
    members: ["mobile/0930/1", "mobile/0930/2"],
  },
];
