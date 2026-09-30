/**
 * Bardoscia, Battiston, Caccioli & Caldarelli, "Pathways towards instability
 * in financial networks", Nat. Commun. 8, 14416 (2017), Fig. 3a–e, transcribed
 * link by link. A link `from → to` carries distress in the arrow's direction;
 * its weight is a fraction of ω. Node places follow the figure (5, 6 above;
 * 1–4 a square; 7, 8 below), made exactly mirror-symmetric.
 */
export type NodeId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Fraction = readonly [numerator: number, denominator: number];
export type Link = { id: string; from: NodeId; to: NodeId; weight: Fraction };
export type PanelId = "a" | "b" | "c" | "d" | "e";
export type Panel = {
  id: PanelId;
  links: Link[];
  /** Links new in this panel (blue in the figure). */
  added: Set<string>;
  /** Links whose weight changed from the previous panel (red in the figure). */
  changed: Set<string>;
  /** λmax / ω as printed under the panel. */
  printed: number;
};

export const nodes: { id: NodeId; x: number; y: number }[] = [
  { id: 5, x: 56, y: 56 },
  { id: 6, x: 344, y: 56 },
  { id: 1, x: 136, y: 136 },
  { id: 2, x: 264, y: 136 },
  { id: 3, x: 136, y: 264 },
  { id: 4, x: 264, y: 264 },
  { id: 7, x: 56, y: 344 },
  { id: 8, x: 344, y: 344 },
];

const W: Fraction = [1, 1];
const TWO_THIRDS: Fraction = [2, 3];
const HALF: Fraction = [1, 2];

type Row = [NodeId, NodeId, Fraction];
const rows: Record<PanelId, { printed: number; links: Row[] }> = {
  a: {
    printed: 0,
    links: [[5, 1, W], [6, 2, W], [1, 2, W], [1, 3, W], [2, 4, W], [3, 4, W], [3, 7, W], [4, 8, W]],
  },
  b: {
    printed: 0.8165,
    links: [[5, 1, W], [6, 2, W], [1, 2, W], [1, 3, W], [2, 4, W], [3, 1, TWO_THIRDS], [3, 4, TWO_THIRDS], [3, 7, TWO_THIRDS], [4, 8, W]],
  },
  c: {
    printed: 1.1242,
    links: [[5, 1, W], [6, 2, W], [1, 2, W], [1, 3, W], [2, 4, W], [3, 1, TWO_THIRDS], [3, 4, TWO_THIRDS], [3, 7, TWO_THIRDS], [4, 3, HALF], [4, 8, HALF]],
  },
  d: {
    printed: 0.8907,
    links: [
      [5, 1, W], [6, 2, W], [1, 2, TWO_THIRDS], [1, 3, TWO_THIRDS], [1, 7, TWO_THIRDS], [2, 4, W],
      [3, 1, HALF], [3, 4, HALF], [3, 7, HALF], [3, 8, HALF], [4, 3, HALF], [4, 8, HALF],
    ],
  },
  e: {
    printed: 0.8927,
    links: [
      [5, 1, W], [6, 2, W], [1, 2, HALF], [1, 3, HALF], [1, 4, HALF], [1, 7, HALF], [2, 4, W],
      [3, 1, HALF], [3, 4, HALF], [3, 7, HALF], [3, 8, HALF], [4, 3, HALF], [4, 8, HALF],
    ],
  },
};

export const linkId = (from: NodeId, to: NodeId) => `${from}>${to}`;
export const fractionValue = ([numerator, denominator]: Fraction) => numerator / denominator;

export const panelIds: PanelId[] = ["a", "b", "c", "d", "e"];

export const panels: Panel[] = panelIds.map((id, index) => {
  const links = rows[id].links.map(([from, to, weight]) => ({ id: linkId(from, to), from, to, weight }));
  const previous = index > 0 ? new Map(rows[panelIds[index - 1]].links.map(([from, to, weight]) => [linkId(from, to), weight])) : null;
  const added = new Set<string>();
  const changed = new Set<string>();
  if (previous) {
    for (const link of links) {
      const before = previous.get(link.id);
      if (!before) added.add(link.id);
      else if (fractionValue(before) !== fractionValue(link.weight)) changed.add(link.id);
    }
  }
  return { id, links, added, changed, printed: rows[id].printed };
});

/** Every link that appears in any panel, so transitions can draw links in and out. */
export const allLinks: { id: string; from: NodeId; to: NodeId }[] = [
  ...new Map(panels.flatMap((panel) => panel.links).map(({ id, from, to }) => [id, { id, from, to }])).values(),
];
