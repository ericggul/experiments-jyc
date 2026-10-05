import { boxShape, rotationalShape, type FractalShape } from "./model/index.ts";

/**
 * Logos stored unmodified in `public/images/fractal-logo/`. `box` is the drawn
 * content's extent in viewBox units, measured from a 4096 px rasterisation.
 * `symmetry`, where present, is the measured rotational order, the first
 * tip's angle (clockwise from the right, screen y down), the tip radius and
 * the rotation centre; without it the tips are the box's edge midpoints.
 */
export type FractalLogo = {
  id: string;
  name: string;
  group: "ai" | "tech";
  src: string;
  viewBox: readonly [number, number, number, number];
  box: readonly [number, number, number, number];
  /** Fill for single-colour marks that leave it unset (`currentColor` or none). */
  fill?: string;
  symmetry?: {
    order: number;
    angleDeg: number;
    radius: number;
    center: readonly [number, number];
  };
};

const lobehub = (
  id: string,
  name: string,
  file: string,
  box: FractalLogo["box"],
  extra: Partial<FractalLogo> = {},
): FractalLogo => ({
  id,
  name,
  group: "ai",
  src: `/images/fractal-logo/lobehub-${file}.svg`,
  viewBox: [0, 0, 24, 24],
  box,
  ...extra,
});

export const fractalLogos: readonly FractalLogo[] = [
  {
    id: "gemini",
    name: "Gemini",
    group: "ai",
    src: "/images/fractal-logo/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg",
    viewBox: [0, 0, 192, 192],
    box: [8, 8, 184, 184],
    symmetry: { order: 4, angleDeg: 0, radius: 88, center: [96, 96] },
  },
  lobehub("gemma", "Gemma", "gemma-color", [0, 0, 24, 24]),
  lobehub("chatgpt", "ChatGPT", "openai", [0, 0, 24, 23.789], {
    fill: "#000000",
    symmetry: { order: 6, angleDeg: 13.25, radius: 12.16, center: [11.988, 11.873] },
  }),
  lobehub("claude", "Claude", "claude-color", [0, 0, 24, 24]),
  lobehub("copilot", "Copilot", "copilot-color", [0, 0.996, 24, 23.004]),
  lobehub("perplexity", "Perplexity", "perplexity-color", [1.5, 0, 22.5, 24]),
  lobehub("meta-ai", "Meta AI", "metaai-color", [0.65, 0.217, 23.291, 23.127]),
  lobehub("mistral", "Mistral", "mistral-color", [0, 3.398, 24, 20.543]),
  lobehub("grok", "Grok", "grok", [0, 0.498, 24, 23.543], { fill: "#000000" }),
  lobehub("deepseek", "DeepSeek", "deepseek-color", [0, 3, 24, 20.66]),
  lobehub("qwen", "Qwen", "qwen-color", [0.996, 0.996, 23.004, 23.004], {
    symmetry: { order: 3, angleDeg: 72.75, radius: 11.38, center: [12.03, 11.985] },
  }),
  {
    id: "microsoft",
    name: "Microsoft",
    group: "tech",
    src: "/images/fractal-logo/wikimedia-microsoft-icon.svg",
    viewBox: [0, 0, 21, 21],
    box: [0, 0, 21, 21],
    symmetry: { order: 4, angleDeg: 45, radius: 10.5 * Math.SQRT2, center: [10.5, 10.5] },
  },
  simpleIcon("square", "Square", "#3E4348", { order: 4, angleDeg: 45, radius: 15.3 }),
  simpleIcon("codesandbox", "CodeSandbox", "#151515", {
    order: 4,
    angleDeg: 45,
    radius: 12 * Math.SQRT2,
  }),
  simpleIcon("materialdesignicons", "Material Design", "#2196F3", {
    order: 4,
    angleDeg: 45,
    radius: 12 * Math.SQRT2,
  }),
  simpleIcon("hashnode", "Hashnode", "#2962FF", { order: 4, angleDeg: 0, radius: 12 }),
  simpleIcon("okta", "Okta", "#007DC1", { order: 4, angleDeg: 0, radius: 12 }),
];

/** simple-icons 16.25.0, filled with its registered brand colour. */
function simpleIcon(
  slug: string,
  name: string,
  fill: string,
  symmetry: Omit<NonNullable<FractalLogo["symmetry"]>, "center">,
): FractalLogo {
  return {
    id: slug,
    name,
    group: "tech",
    src: `/images/fractal-logo/simple-icons-${slug}.svg`,
    viewBox: [0, 0, 24, 24],
    box: [0, 0, 24, 24],
    fill,
    symmetry: { ...symmetry, center: [12, 12] },
  };
}

export type LogoGeometry = {
  /** Point placed on the fractal node, in viewBox units. */
  center: readonly [number, number];
  /** viewBox units per node half-size. */
  half: number;
  shape: FractalShape;
};

/** The logo's own tips, or (`boxed`) its content box fitted to a square node. */
export function logoGeometry(logo: FractalLogo, boxed = false): LogoGeometry {
  const [x0, y0, x1, y1] = logo.box;
  if (logo.symmetry && !boxed) {
    const { order, angleDeg, radius, center } = logo.symmetry;
    const body = [
      Math.max(center[0] - x0, x1 - center[0]) / radius,
      Math.max(center[1] - y0, y1 - center[1]) / radius,
    ] as const;
    return { center, half: radius, shape: rotationalShape(order, angleDeg, body) };
  }
  const halfWidth = (x1 - x0) / 2;
  const halfHeight = (y1 - y0) / 2;
  const half = Math.max(halfWidth, halfHeight);
  return {
    center: [(x0 + x1) / 2, (y0 + y1) / 2],
    half,
    shape: boxed ? boxShape() : boxShape([halfWidth / half, halfHeight / half]),
  };
}
