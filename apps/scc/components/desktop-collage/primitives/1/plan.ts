import { defineControl } from '../../foundations/control/definition.ts';
import { layoutHeart } from './model/heart.ts';
import { colorAt, randomArticle, validateSettings } from './model/settings.ts';
import { stackRanks } from './model/stack.ts';

export const definition = defineControl({
  validate: validateSettings,
  plan: (settings, display) => {
    const tiles = layoutHeart(display.visible, settings);
    const ranks = stackRanks(tiles, settings.stack);
    return {
      surface: settings.surface,
      intervalMs: settings.timing === 'sequence' ? Math.round(settings.interval * 1000) : 0,
      items: tiles.map((tile, index) => ({
        x: tile.x, y: tile.y, width: tile.width, height: tile.height, rank: ranks[index],
        color: colorAt(settings.fill, tile.step),
        url: settings.fill === 'wikipedia' ? randomArticle : undefined,
      })),
    };
  },
});
