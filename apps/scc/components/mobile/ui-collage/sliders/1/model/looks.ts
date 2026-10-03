export type LookId =
  | "dj"
  | "win95"
  | "platinum"
  | "winamp"
  | "aqua"
  | "xp"
  | "win7"
  | "holo"
  | "ios6"
  | "ios7"
  | "control"
  | "material2"
  | "chrome"
  | "win11"
  | "material3";

/**
 * Oldest to newest. `reach` is how far the thumb (with its baked shadow) extends along the track
 * from its centre, as a share of the column width; renderers size their thumbs from it, and the
 * layout's travel inset is derived from the largest, so no thumb crosses the shared track ends.
 */
export const lookSpecs: readonly { id: LookId; label: string; reach: number }[] = [
  { id: "dj", label: "DJ fader", reach: 0.525 },
  { id: "win95", label: "Win 95", reach: 0.275 },
  { id: "platinum", label: "Platinum", reach: 0.3 },
  { id: "winamp", label: "Winamp", reach: 0.25 },
  { id: "aqua", label: "Aqua", reach: 0.5 },
  { id: "xp", label: "XP", reach: 0.25 },
  { id: "win7", label: "Win 7", reach: 0.225 },
  { id: "holo", label: "Holo", reach: 0.44 },
  { id: "ios6", label: "iOS 6", reach: 0.55 },
  { id: "ios7", label: "iOS 7", reach: 0.5 },
  { id: "control", label: "Control Center", reach: 0 },
  { id: "material2", label: "Material 2", reach: 0.32 },
  { id: "chrome", label: "Chrome", reach: 0.4 },
  { id: "win11", label: "Win 11", reach: 0.525 },
  { id: "material3", label: "Material 3", reach: 0.15 },
];

export const reach = Object.fromEntries(lookSpecs.map((spec) => [spec.id, spec.reach])) as Record<LookId, number>;
export const maximumReach = Math.max(...lookSpecs.map((spec) => spec.reach));
