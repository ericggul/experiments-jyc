// Decodes media items into square tiles, a few at a time, and hands each tile
// to the renderer as it is ready (the pattern of Goldfishes'
// photo-media-atlas.ts: fetch → createImageBitmap → cover crop on a canvas,
// at most a few decodes in flight). Decoded source images are cached, so the
// tech atlas is decoded once for its 36 tiles and a surface change never
// re-fetches a photo it already has.

import { KEYWORD_FONTS, type KeywordFontId, type MediaItem } from "./catalogue";

export const TILE_SIZE = 256;
const MAX_CONCURRENT_DECODES = 4;

const decoded = new Map<string, Promise<ImageBitmap>>();

function decode(url: string) {
  let pending = decoded.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`bubble/3 media: ${url} ${response.status}`);
        return response.blob();
      })
      .then((blob) => createImageBitmap(blob));
    pending.catch(() => decoded.delete(url));
    decoded.set(url, pending);
  }
  return pending;
}

/** Draws the source rectangle to cover the whole tile, centred, without stretching. */
function drawCover(context: CanvasRenderingContext2D, image: ImageBitmap, sx: number, sy: number, sw: number, sh: number) {
  const scale = Math.max(TILE_SIZE / sw, TILE_SIZE / sh);
  const width = TILE_SIZE / scale;
  const height = TILE_SIZE / scale;
  context.drawImage(image, sx + (sw - width) / 2, sy + (sh - height) / 2, width, height, 0, 0, TILE_SIZE, TILE_SIZE);
}

function drawText(context: CanvasRenderingContext2D, text: string, fontId: KeywordFontId) {
  const font = KEYWORD_FONTS.find((candidate) => candidate.id === fontId) ?? KEYWORD_FONTS[0]!;
  context.fillStyle = "#000000";
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // Pale grey, not white: a word should sit among the photographs, not shout over them.
  context.fillStyle = "#b4b4b4";
  context.textAlign = "center";
  context.textBaseline = "middle";
  // The word spans about half the tile (the sphere mapping magnifies the middle); short words stay within a sensible size.
  const size = Math.min(TILE_SIZE * 0.34, (TILE_SIZE * 0.5) / Math.max(1, text.length * 0.62)) * font.scale;
  context.font = `${font.weight} ${size}px ${font.family}`;
  context.fillText(text, TILE_SIZE / 2, TILE_SIZE / 2 + size * 0.04);
}

export type MediaLoad = { cancel(): void; done: Promise<void> };

/**
 * Decodes every item and calls `onTile(index, canvas)` as each is drawn; the
 * canvas is reused, so the callback must upload it before returning. `onBatch`
 * is called after every few tiles and once at the end (for mipmaps).
 */
export function loadMediaTiles(
  items: readonly MediaItem[],
  onTile: (index: number, tile: HTMLCanvasElement) => void,
  onBatch: () => void,
  fontId: KeywordFontId,
): MediaLoad {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const context = canvas.getContext("2d");
  let cancelled = false;
  let next = 0;
  let sinceBatch = 0;
  const batch = () => {
    if (sinceBatch === 0) return;
    sinceBatch = 0;
    onBatch();
  };
  const one = async (index: number) => {
    const item = items[index]!;
    if (!context) return;
    if (item.kind === "text") {
      drawText(context, item.text, fontId);
    } else {
      const image = await decode(item.url);
      if (cancelled) return;
      context.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
      if (item.kind === "image") drawCover(context, image, 0, 0, image.width, image.height);
      else {
        const width = image.width / item.columns;
        const height = image.height / item.rows;
        drawCover(context, image, item.column * width, item.row * height, width, height);
      }
    }
    if (cancelled) return;
    onTile(index, canvas);
    sinceBatch += 1;
    if (sinceBatch >= 12) batch();
  };
  const worker = async () => {
    while (!cancelled && next < items.length) {
      const index = next;
      next += 1;
      try {
        await one(index);
      } catch (error) {
        console.warn("bubble/3 media tile failed.", items[index]?.id, error);
      }
    }
  };
  const done = Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_DECODES, items.length) }, worker)).then(() => {
    if (!cancelled) batch();
  });
  return {
    cancel: () => {
      cancelled = true;
    },
    done,
  };
}
