export const sccAreas = [
  { key: "complex-systems", href: "/complex-systems" },
  { key: "dynamical-systems", href: "/dynamical-systems" },
  { key: "statistical-modelling", href: "/statistical-modelling" },
  { key: "dashboard", href: "/dashboard" },
  { key: "standalone", href: "/standalone" },
  { key: "ui", href: "/ui" },
  { key: "parametric-interface", href: "/parametric-interface" },
  { key: "multi-device", href: "/multi-device" },
  { key: "sns", href: "/sns" },
  { key: "mobile", href: "/mobile" },
] as const;

export type SccArea = (typeof sccAreas)[number]["key"];

/** Independently deployed apps proxied under SCC routes. */
export const sccApps = [
  { key: "goldfishes", href: "/goldfishes" },
  { key: "c-val", href: "/c-val" },
  { key: "ddong-meong", href: "/ddong-meong" },
] as const;

/** Families with their own index route; redirecting families are omitted. */
export const sccFamilyIndexes: ReadonlySet<string> = new Set([
  "adaptive-coevolving-network",
  "barabasi-albert",
  "cellular-automata",
  "diffusion-graph",
  "erdos-renyi",
  "living-topology",
  "tokyo-network",
  "github",
  "palantir",
  "stock",
  "aerodynamics",
  "bastille-day",
  "chess",
  "cv",
  "grid",
  "macos",
  "mobiles",
  "splice",
  "spoon-class",
  "swarm",
  "ui/buttons",
  "ui/smile",
  "parametric-interface",
  "dj",
  "finger-skating",
  "network-system",
  "sns",
  "mobile/finger-network",
  "mobile/finger-skating",
  "mobile/gaze-tracking",
  "mobile/gaze-tracking/2",
  "mobile/transform/pixelate",
  "mobile/transform/substitution",
  "mobile/transform/substitution/1",
  "mobile/transform/substitution/2",
  "mobile/transform/language",
  "mobile/transform/language/1",
  "mobile/transform/decomposition",
]);
