// What the films can show: Goldfishes' media, copied in (apps share no imports).
// Photo lists are those of /screen/media-grid/1 and /screen/pillars/1–4 (cats,
// kisses, politicians — Wikimedia Commons, see the JSON ledgers); the 36 tech
// renders are /screen/tech-eyes/1's generated keyword atlas (one tile per
// keyword, in keyword order); the 80 tech faces are that route's Commons
// portraits (attribution in public/images/0908/tech-power-faces/attribution.json);
// the keywords are its abbreviation list, drawn as text.

import catSources from "./sources/cat-sources.json";
import kissSources from "./sources/kiss-sources.json";
import politicianSources from "./sources/politician-sources.json";
import { techPowerFaces } from "./sources/tech-power-faces.generated";

export type SurfaceId = "none" | "cat" | "kiss" | "politician" | "tech" | "face" | "keyword" | "mix";

/** One layer of the media texture: a whole image, a tile of one, or a word. */
export type MediaItem =
  | { kind: "image"; id: string; url: string }
  | { kind: "tile"; id: string; url: string; column: number; row: number; columns: number; rows: number }
  | { kind: "text"; id: string; text: string };

export const SURFACES: readonly { id: SurfaceId; label: string }[] = [
  { id: "none", label: "없음" },
  { id: "cat", label: "고양이" },
  { id: "kiss", label: "키스" },
  { id: "politician", label: "정치인" },
  { id: "tech", label: "기술" },
  { id: "face", label: "테크 얼굴" },
  { id: "keyword", label: "키워드" },
  { id: "mix", label: "섞음" },
];

/** 키워드 by default (user, 2026-10-11): the words chase the trend, the photographs are a choice. */
export const DEFAULT_SURFACE: SurfaceId = "keyword";

export type KeywordFontId = "gothic" | "thin" | "serif" | "mono" | "impact";

/**
 * Faces for the keyword tiles, from fonts a Mac has. `scale` evens out the
 * widths so a word spans about the same share of the tile in each.
 */
export const KEYWORD_FONTS: readonly { id: KeywordFontId; label: string; family: string; weight: number; scale: number }[] = [
  { id: "gothic", label: "고딕", family: "'Helvetica Neue', Helvetica, Arial, sans-serif", weight: 700, scale: 1 },
  { id: "thin", label: "가늘게", family: "'Helvetica Neue', Helvetica, Arial, sans-serif", weight: 300, scale: 1.05 },
  { id: "serif", label: "세리프", family: "Georgia, 'Times New Roman', serif", weight: 700, scale: 0.98 },
  { id: "mono", label: "모노", family: "Menlo, Monaco, 'Courier New', monospace", weight: 700, scale: 0.9 },
  { id: "impact", label: "임팩트", family: "Impact, 'Arial Narrow', sans-serif", weight: 400, scale: 1.18 },
];
export const DEFAULT_KEYWORD_FONT: KeywordFontId = "gothic";

/** How the keyword tiles are drawn: face, size relative to the tile, and the text's opacity on black. */
export type KeywordStyle = { font: KeywordFontId; size: number; opacity: number };
/** Size 1 spans about half the tile; the default is half that (user, 2026-10-11). */
export const KEYWORD_SIZE_RANGE = [0.2, 2] as const;
export const DEFAULT_KEYWORD_STYLE: KeywordStyle = { font: DEFAULT_KEYWORD_FONT, size: 0.5, opacity: 0.7 };

const TECH_ATLAS_URL = "/images/0908/tech-keyword-atlas/tech-keyword-atlas-v1.png";
const TECH_ATLAS_COLUMNS = 6;
const TECH_ATLAS_ROWS = 6;

/** tech-eyes/1's established industry abbreviations, in the atlas's tile order. */
export const TECH_KEYWORDS: readonly string[] = [
  "AI", "ML", "DL", "AGI", "GPT", "LLM",
  "NLP", "RAG", "CPU", "GPU", "NPU", "RAM",
  "OS", "PC", "IoT", "AR", "VR", "XR",
  "UI", "UX", "HCI", "MVP", "API", "SDK",
  "IDE", "OOP", "QA", "DB", "SQL", "CDN",
  "DNS", "URL", "VPN", "VM", "NFT", "DAO",
];

type PhotoSource = { id: string; imageUrl: string };

function photos(sources: readonly PhotoSource[]): MediaItem[] {
  return sources.map((source) => ({ kind: "image", id: source.id, url: source.imageUrl }));
}

const sets: Record<Exclude<SurfaceId, "none" | "mix">, () => MediaItem[]> = {
  cat: () => photos(catSources),
  kiss: () => photos(kissSources),
  politician: () => photos(politicianSources),
  tech: () =>
    TECH_KEYWORDS.map((keyword, index) => ({
      kind: "tile",
      id: `tech-${keyword}`,
      url: TECH_ATLAS_URL,
      column: index % TECH_ATLAS_COLUMNS,
      row: Math.floor(index / TECH_ATLAS_COLUMNS),
      columns: TECH_ATLAS_COLUMNS,
      rows: TECH_ATLAS_ROWS,
    })),
  face: () => techPowerFaces.map((face) => ({ kind: "image", id: `face-${face.id}`, url: face.image })),
  keyword: () => TECH_KEYWORDS.map((keyword) => ({ kind: "text", id: `keyword-${keyword}`, text: keyword })),
};

/** 섞음 leaves out the kisses (user, 2026-10-11); 키스 stays as its own surface. */
const MIX_ORDER = ["tech", "face", "keyword", "cat", "politician"] as const;

/** The layers a surface puts in the media texture, in layer order. */
export function surfaceItems(surface: SurfaceId): MediaItem[] {
  if (surface === "none") return [];
  if (surface === "mix") return MIX_ORDER.flatMap((id) => sets[id]());
  return sets[surface]();
}
