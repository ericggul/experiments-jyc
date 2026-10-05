import type { Tile } from './heart.ts';
import type { Settings } from './settings.ts';

/** Higher key = nearer the front once every window is open. */
function frontKey(stack: Settings['stack'], tile: Tile, index: number) {
  if (stack === 'oldest') return -index;
  if (stack === 'upper') return -(tile.y + tile.height / 2);
  if (stack === 'lower') return tile.y + tile.height / 2;
  return index;
}

/**
 * Window index (1 = frontmost) each new window takes among those already
 * opened in this run, so the stack is right at every moment of the sequence,
 * not only at the end. Ties keep the newer window in front.
 */
export function stackRanks(tiles: Tile[], stack: Settings['stack']) {
  const keys = tiles.map((tile, index) => frontKey(stack, tile, index));
  return keys.map((key, index) => 1 + keys.slice(0, index).filter(other => other > key).length);
}

/** Back-to-front drawing order of the first `shown` windows, for the preview. */
export function paintOrder(tiles: Tile[], stack: Settings['stack'], shown: number) {
  const order: number[] = [];
  stackRanks(tiles, stack).slice(0, shown).forEach((rank, index) => order.splice(order.length - (rank - 1), 0, index));
  return order;
}
