"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { bastilleDayImages } from "@/components/standalone/bastille-day/1/images";
import goodFrenchSources from "@/components/standalone/bastille-day/2/good-sources.json";
import darkFrenchSources from "@/components/standalone/bastille-day/2/dark-sources.json";
import catSources from "@/components/ui/dashboard/stock/4/model/cat-sources.json";
import kissSources from "@/components/ui/dashboard/stock/4/model/kiss-sources.json";
import politicianSources from "../2/politician-sources.json";
import styles from "../screen/grid.module.css";

const COLUMN_COUNT = 28;
const ROW_COUNT = 16;
const INITIAL_POOL_SIZE = 8;
const MIN_MUTATION_INTERVAL = 22;
const MUTATION_INTERVAL_RANGE = 32;
const IMAGE_CHANGES_PER_SECOND = 72;

const frenchSources = [
  ...bastilleDayImages,
  ...goodFrenchSources,
  ...darkFrenchSources,
];

const imageSources = [
  ...catSources,
  ...kissSources,
  ...frenchSources,
  ...politicianSources,
];

type TileSpan = {
  columns: number;
  rows: number;
};

type GridTile = TileSpan & {
  id: string;
  column: number;
  row: number;
};

type TileRegion = TileSpan & {
  column: number;
  row: number;
};

type PackedTile = TileSpan & {
  column: number;
  row: number;
};

type SpanOption = TileSpan & {
  weight: number;
};

type CellPlayback = {
  sourceIndex: number;
  nextChangeAt: number;
};

const SPANS: readonly SpanOption[] = [
  { columns: 5, rows: 5, weight: 2 },
  { columns: 5, rows: 4, weight: 1 },
  { columns: 4, rows: 5, weight: 1 },
  { columns: 4, rows: 4, weight: 3 },
  { columns: 4, rows: 3, weight: 2 },
  { columns: 3, rows: 4, weight: 2 },
  { columns: 3, rows: 3, weight: 3 },
  { columns: 3, rows: 2, weight: 2 },
  { columns: 2, rows: 3, weight: 2 },
  { columns: 2, rows: 2, weight: 3 },
  { columns: 2, rows: 1, weight: 2 },
  { columns: 1, rows: 2, weight: 2 },
  { columns: 1, rows: 1, weight: 1 },
] as const;

function randomOtherIndex(current: number, count: number) {
  if (count < 2) return 0;
  const candidate = Math.floor(Math.random() * (count - 1));
  return candidate >= current ? candidate + 1 : candidate;
}

function randomInterval() {
  const diversity = 0.72;
  const factor = 1 + (Math.random() * 2 - 1) * diversity;
  return (
    1000 /
    Math.max(0.1, IMAGE_CHANGES_PER_SECOND * Math.max(0.05, factor))
  );
}

function canPlace(
  occupied: boolean[][],
  column: number,
  row: number,
  span: TileSpan,
  columnCount: number,
  rowCount: number,
) {
  if (column + span.columns > columnCount || row + span.rows > rowCount) {
    return false;
  }

  for (let y = row; y < row + span.rows; y += 1) {
    for (let x = column; x < column + span.columns; x += 1) {
      if (occupied[y][x]) return false;
    }
  }
  return true;
}

function chooseSpan(candidates: readonly SpanOption[], random: () => number) {
  const totalWeight = candidates.reduce((total, span) => total + span.weight, 0);
  let threshold = random() * totalWeight;

  for (const span of candidates) {
    threshold -= span.weight;
    if (threshold <= 0) return span;
  }

  return candidates[candidates.length - 1];
}

function createPackedPlan({
  columns,
  rows,
  random = Math.random,
}: {
  columns: number;
  rows: number;
  random?: () => number;
}) {
  const occupied = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => false),
  );
  const tiles: PackedTile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (occupied[row][column]) continue;

      const candidates = SPANS.filter((span) =>
        canPlace(occupied, column, row, span, columns, rows),
      );
      const span = chooseSpan(candidates, random);

      for (let y = row; y < row + span.rows; y += 1) {
        for (let x = column; x < column + span.columns; x += 1) {
          occupied[y][x] = true;
        }
      }

      tiles.push({
        column,
        row,
        ...span,
      });
    }
  }

  return tiles;
}

function scoreComposition(
  tiles: readonly PackedTile[],
  random: () => number,
) {
  const shapes = new Set(tiles.map((tile) => `${tile.columns}×${tile.rows}`));
  const largeSquares = tiles.filter(
    (tile) => tile.columns === tile.rows && tile.columns >= 4,
  ).length;
  const asymmetricTiles = tiles.filter(
    (tile) => tile.columns !== tile.rows && tile.columns >= 3 && tile.rows >= 3,
  ).length;
  const singleCells = tiles.filter(
    (tile) => tile.columns === 1 && tile.rows === 1,
  ).length;

  return (
    shapes.size * 24 +
    largeSquares * 38 +
    asymmetricTiles * 16 -
    singleCells * 4 +
    random() * 8
  );
}

function createCompositionPlan({
  columns,
  rows,
  random = Math.random,
}: {
  columns: number;
  rows: number;
  random?: () => number;
}) {
  let strongestPlan: PackedTile[] = [];
  let strongestScore = Number.NEGATIVE_INFINITY;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = createPackedPlan({ columns, rows, random });
    const score = scoreComposition(candidate, random);
    if (score > strongestScore) {
      strongestPlan = candidate;
      strongestScore = score;
    }
  }

  return strongestPlan;
}

function createPackedTiles({
  columns,
  rows,
  offsetColumn = 0,
  offsetRow = 0,
  nextId,
  random = Math.random,
}: {
  columns: number;
  rows: number;
  offsetColumn?: number;
  offsetRow?: number;
  nextId: () => string;
  random?: () => number;
}) {
  return createCompositionPlan({ columns, rows, random }).map((tile) => ({
    id: nextId(),
    column: tile.column + offsetColumn,
    row: tile.row + offsetRow,
    columns: tile.columns,
    rows: tile.rows,
  }));
}

function createInitialTiledLayout() {
  let state = 0x08_06_2026;
  let tileIndex = 0;
  return createPackedTiles({
    columns: COLUMN_COUNT,
    rows: ROW_COUNT,
    nextId: () => {
      tileIndex += 1;
      return `grid-3-tile-${tileIndex}`;
    },
    random: () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    },
  });
}

function overlapsRegion(tile: GridTile, region: TileRegion) {
  return (
    tile.column < region.column + region.columns &&
    tile.column + tile.columns > region.column &&
    tile.row < region.row + region.rows &&
    tile.row + tile.rows > region.row
  );
}

function containsTile(region: TileRegion, tile: GridTile) {
  return (
    tile.column >= region.column &&
    tile.row >= region.row &&
    tile.column + tile.columns <= region.column + region.columns &&
    tile.row + tile.rows <= region.row + region.rows
  );
}

function findMutationRegion(tiles: readonly GridTile[]) {
  for (let proposal = 0; proposal < 8; proposal += 1) {
    const columns = 8 + Math.floor(Math.random() * 4);
    const rows = 7 + Math.floor(Math.random() * 3);
    let region: TileRegion = {
      column: Math.floor(Math.random() * (COLUMN_COUNT - columns + 1)),
      row: Math.floor(Math.random() * (ROW_COUNT - rows + 1)),
      columns,
      rows,
    };

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const intersecting = tiles.filter((tile) => overlapsRegion(tile, region));
      const startColumn = Math.min(...intersecting.map((tile) => tile.column));
      const startRow = Math.min(...intersecting.map((tile) => tile.row));
      const endColumn = Math.max(
        ...intersecting.map((tile) => tile.column + tile.columns),
      );
      const endRow = Math.max(
        ...intersecting.map((tile) => tile.row + tile.rows),
      );
      const expandedRegion: TileRegion = {
        column: startColumn,
        row: startRow,
        columns: endColumn - startColumn,
        rows: endRow - startRow,
      };

      if (
        expandedRegion.column === region.column &&
        expandedRegion.row === region.row &&
        expandedRegion.columns === region.columns &&
        expandedRegion.rows === region.rows
      ) {
        if (expandedRegion.columns * expandedRegion.rows <= 120) {
          return expandedRegion;
        }
        break;
      }
      region = expandedRegion;
    }
  }

  const fallbackTiles = tiles.filter(
    (tile) => tile.columns * tile.rows >= 4,
  );
  const fallback = fallbackTiles[
    Math.floor(Math.random() * fallbackTiles.length)
  ];

  return fallback
    ? {
        column: fallback.column,
        row: fallback.row,
        columns: fallback.columns,
        rows: fallback.rows,
      }
    : null;
}

function recomposeLocalRegion(
  tiles: GridTile[],
  nextId: () => string,
): GridTile[] {
  const region = findMutationRegion(tiles);
  if (!region) return tiles;

  const replacement = createPackedTiles({
    columns: region.columns,
    rows: region.rows,
    offsetColumn: region.column,
    offsetRow: region.row,
    nextId,
  });

  return [...tiles.filter((tile) => !containsTile(region, tile)), ...replacement]
    .sort((left, right) => left.row - right.row || left.column - right.column);
}

function getTileStyle(tile: GridTile) {
  return {
    "--tile-left": `${(tile.column / COLUMN_COUNT) * 100}%`,
    "--tile-top": `${(tile.row / ROW_COUNT) * 100}%`,
    "--tile-width": `${(tile.columns / COLUMN_COUNT) * 100}%`,
    "--tile-height": `${(tile.rows / ROW_COUNT) * 100}%`,
  } as CSSProperties;
}

export default function GridThree() {
  const imageRefs = useRef(new Map<string, HTMLImageElement>());
  const playbackRef = useRef(new Map<string, CellPlayback>());
  const availableSourcesRef = useRef<string[]>([]);
  const tilesRef = useRef<GridTile[]>([]);
  const [tiles, setTiles] = useState<GridTile[]>(createInitialTiledLayout);
  const nextTileIdRef = useRef(tiles.length);
  const [loadedSources, setLoadedSources] = useState<string[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    tilesRef.current = tiles;
    const activeTileIds = new Set(tiles.map((tile) => tile.id));
    for (const tileId of playbackRef.current.keys()) {
      if (!activeTileIds.has(tileId)) playbackRef.current.delete(tileId);
    }
  }, [tiles]);

  useEffect(() => {
    let cancelled = false;
    const decodedSources: string[] = [];
    availableSourcesRef.current = [];

    const preloadSequentially = async () => {
      for (const source of imageSources) {
        if (cancelled) return;
        const image = new Image();
        const didLoad = await new Promise<boolean>((resolve) => {
          image.onload = async () => {
            try {
              await image.decode();
              resolve(true);
            } catch {
              resolve(false);
            }
          };
          image.onerror = () => resolve(false);
          image.src = source.imageUrl;
        });

        if (!cancelled && didLoad) {
          decodedSources.push(source.imageUrl);
          availableSourcesRef.current = decodedSources;
          if (decodedSources.length === INITIAL_POOL_SIZE) {
            setLoadedSources([...decodedSources]);
          }
        }
      }

      if (!cancelled && decodedSources.length < INITIAL_POOL_SIZE) {
        setLoadedSources([...decodedSources]);
      }
    };

    void preloadSequentially();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const updatePreference = () => setReduceMotion(motionPreference.matches);
    updatePreference();
    motionPreference.addEventListener("change", updatePreference);
    return () =>
      motionPreference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reduceMotion || loadedSources.length === 0) return;
    let mutationTimer = 0;
    let cancelled = false;

    const scheduleMutation = () => {
      mutationTimer = window.setTimeout(
        () => {
          if (cancelled) return;
          setTiles((currentTiles) =>
            recomposeLocalRegion(currentTiles, () => {
              nextTileIdRef.current += 1;
              return `grid-3-tile-${nextTileIdRef.current}`;
            }),
          );
          scheduleMutation();
        },
        MIN_MUTATION_INTERVAL + Math.random() * MUTATION_INTERVAL_RANGE,
      );
    };

    scheduleMutation();
    return () => {
      cancelled = true;
      window.clearTimeout(mutationTimer);
    };
  }, [loadedSources, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || loadedSources.length === 0) return;
    let animationFrame = 0;
    const now = performance.now();

    for (const [index, tile] of tilesRef.current.entries()) {
      playbackRef.current.set(tile.id, {
        sourceIndex: index % loadedSources.length,
        nextChangeAt: now + Math.random() * randomInterval(),
      });
    }

    const animate = (frameTime: number) => {
      for (const tile of tilesRef.current) {
        let playback = playbackRef.current.get(tile.id);
        if (!playback) {
          playback = {
            sourceIndex: Math.floor(Math.random() * loadedSources.length),
            nextChangeAt: frameTime + randomInterval(),
          };
          playbackRef.current.set(tile.id, playback);
        }
        if (frameTime < playback.nextChangeAt) continue;

        const availableSources = availableSourcesRef.current;
        if (availableSources.length === 0) continue;

        playback.sourceIndex = randomOtherIndex(
          playback.sourceIndex,
          availableSources.length,
        );
        playback.nextChangeAt = frameTime + randomInterval();

        const image = imageRefs.current.get(tile.id);
        if (image) image.src = availableSources[playback.sourceIndex];
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [loadedSources, reduceMotion]);

  return (
    <main
      className={styles.page}
      style={{ "--field-background": "#000000" } as CSSProperties}
    >
      <div
        className={styles.compositionGrid}
      >
        {tiles.map((tile, index) => (
          <div
            className={styles.compositionCell}
            key={tile.id}
            style={getTileStyle(tile)}
          >
            {loadedSources.length > 0 ? (
              // The Grid 2-derived pool is locally reconfigured rather than
              // presented as one repeated portrait-cell rhythm.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={(image) => {
                  if (image) imageRefs.current.set(tile.id, image);
                  else imageRefs.current.delete(tile.id);
                }}
                className={styles.media}
                src={loadedSources[index % loadedSources.length]}
                alt=""
                draggable={false}
              />
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}
