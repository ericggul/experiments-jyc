"use client";

import { surfaceInfo, type Display } from "../../../foundations/surfaces";
import type { Tile } from "../model/heart";
import { colorAt, type Settings } from "../model/settings";
import { paintOrder } from "../model/stack";

/** The measured desktop at true proportion, windows stacked as they will be. */
export function Preview({ display, tiles, shown, settings }: { display: Display; tiles: Tile[]; shown: number; settings: Settings }) {
  const { visible } = display;
  // Approximate height of the application's own chrome at the top of each window.
  const bar = surfaceInfo[settings.surface].bar;
  return (
    <svg
      viewBox={`0 0 ${display.width} ${display.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${tiles.length} ${settings.surface} windows arranged as a heart on a ${display.width} by ${display.height} desktop`}
      className="h-full w-full"
    >
      <rect x={0} y={0} width={display.width} height={display.height} className="fill-(--scc-fg)/[0.06]" />
      <rect x={visible.x} y={visible.y} width={visible.width} height={visible.height} className="fill-(--scc-bg)" />
      {paintOrder(tiles, settings.stack, shown).map((index) => {
        const tile = tiles[index];
        const color = settings.fill === "wikipedia" ? "#ffffff" : colorAt(settings.fill, tile.step);
        return (
          <g key={tile.step}>
            <rect x={tile.x} y={tile.y} width={tile.width} height={tile.height} fill={color} className="stroke-(--scc-fg)/40" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {bar ? <rect x={tile.x} y={tile.y} width={tile.width} height={Math.min(bar, tile.height)} fill="#d9d9d9" /> : null}
          </g>
        );
      })}
    </svg>
  );
}
