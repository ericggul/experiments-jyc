// Browser-side views of the same model state. Each view maps every species to
// a target point; the screen eases displayed points toward those targets, so
// switching views and role changes inside a view both read as motion.

import type { Body, Frame } from "./layout";
import type { Ecosystem, Role } from "./model";

export const VIEWS = [
  { id: "network", label: "네트워크" },
  { id: "role", label: "역할" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export type ViewLabel = { text: string; x: number; y: number; align: CanvasTextAlign };

/** How visible links are in each view; links within the core keep a floor. */
export const LINK_VISIBILITY: Record<ViewId, number> = {
  network: 1,
  role: 0.45,
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Inner and outer radius of each role's band, as shares of the field radius. */
export const ROLE_BANDS: Record<Role, readonly [number, number]> = {
  core: [0, 0.3],
  periphery: [0.42, 0.68],
  absent: [0.8, 1],
};

/** Deterministic value in [0, 1) so species in one band do not stack. */
function spread(species: number) {
  const value = Math.sin(species * 12.9898 + 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function roleGeometry(frame: Frame) {
  return {
    x: frame.width / 2,
    y: frame.height / 2,
    radius: Math.min(frame.width, frame.height) * 0.44,
  };
}

/** Writes each species's target point for `view` into `out` as x, y pairs. */
export function viewTargets(
  view: ViewId,
  ecosystem: Ecosystem,
  bodies: readonly Body[],
  frame: Frame,
  out: Float64Array,
) {
  const count = ecosystem.size;
  if (view === "network") {
    for (let species = 0; species < count; species += 1) {
      out[species * 2] = bodies[species]!.x;
      out[species * 2 + 1] = bodies[species]!.y;
    }
    return;
  }

  // Role: core in the middle, periphery around it, species without
  // population on the rim. The angle is fixed by slot, so a change of role
  // moves a species straight in or out.
  const { x, y, radius } = roleGeometry(frame);
  for (let species = 0; species < count; species += 1) {
    const [inner, outer] = ROLE_BANDS[ecosystem.role[species]!];
    const share = inner === 0 ? Math.sqrt(spread(species)) : spread(species);
    const reach = (inner + (outer - inner) * share) * radius;
    const angle = species * GOLDEN_ANGLE;
    out[species * 2] = x + Math.cos(angle) * reach;
    out[species * 2 + 1] = y + Math.sin(angle) * reach;
  }
}

export function viewLabels(view: ViewId, frame: Frame): ViewLabel[] {
  if (view !== "role") return [];
  // Labels sit in the gaps between bands, above the centre.
  const { x, y, radius } = roleGeometry(frame);
  const gap = (first: Role, second: Role) => ((ROLE_BANDS[first][1] + ROLE_BANDS[second][0]) / 2) * radius;
  return [
    { text: "핵심", x, y: y - gap("core", "periphery"), align: "center" },
    { text: "주변", x, y: y - gap("periphery", "absent"), align: "center" },
    { text: "개체 없음", x, y: y - radius - 14, align: "center" },
  ];
}
