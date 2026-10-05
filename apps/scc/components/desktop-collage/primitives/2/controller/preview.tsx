"use client";

import type { Display } from "../../../foundations/surfaces";
import { CORE_SCALE, center, linkStrength, sphereRadius, TITLE_BAR, type Rect } from "../model/field";

/**
 * The opening arrangement on the measured desktop. Clouds: shell in the
 * window's colour, core in its partner's, hourglass bridges. Cubes: the
 * source demo's wireframe cube per window.
 */
export function Preview({ display, rects, colors, form, range }: { display: Display; rects: Rect[]; colors: string[]; form: "clouds" | "cubes"; range: number }) {
  const content = rects.map((rect) => ({ ...rect, y: rect.y + TITLE_BAR, height: rect.height - TITLE_BAR }));
  const centres = content.map(center);
  const radii = content.map(sphereRadius);
  const links = form === "clouds"
    ? centres.flatMap((a, i) => centres.slice(i + 1).map((b, k) => ({ i, j: i + 1 + k, a, b, s: linkStrength(Math.hypot(a.x - b.x, a.y - b.y), range) }))).filter((link) => link.s > 0.001)
    : [];
  const hourglass = (link: (typeof links)[number]) => {
    const dx = link.b.x - link.a.x;
    const dy = link.b.y - link.a.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const wa = radii[link.i] * 0.62;
    const wb = radii[link.j] * 0.62;
    const waist = Math.min(radii[link.i], radii[link.j]) * 0.17;
    const mx = (link.a.x + link.b.x) / 2;
    const my = (link.a.y + link.b.y) / 2;
    return `M${link.a.x + nx * wa},${link.a.y + ny * wa} Q${mx + nx * waist},${my + ny * waist} ${link.b.x + nx * wb},${link.b.y + ny * wb} L${link.b.x - nx * wb},${link.b.y - ny * wb} Q${mx - nx * waist},${my - ny * waist} ${link.a.x - nx * wa},${link.a.y - ny * wa} Z`;
  };
  return (
    <svg viewBox={`0 0 ${display.width} ${display.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${rects.length} windows${form === "clouds" ? `, ${links.length} connected` : ""}`} className="h-full w-full">
      <rect width={display.width} height={display.height} className="fill-(--scc-fg)/[0.06]" />
      <rect x={display.visible.x} y={display.visible.y} width={display.visible.width} height={display.visible.height} fill={form === "cubes" ? "#000000" : "#05040c"} />
      {rects.map((rect, i) => (
        <g key={i}>
          <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="none" stroke="#ffffff" strokeOpacity={0.25} vectorEffect="non-scaling-stroke" />
          <rect x={rect.x} y={rect.y} width={rect.width} height={TITLE_BAR} fill="#2b2b2b" />
        </g>
      ))}
      {links.map((link) => <path key={`${link.i}-${link.j}`} d={hourglass(link)} fill={colors[link.i]} fillOpacity={0.18 * link.s} stroke={colors[link.j]} strokeOpacity={0.35 * link.s} vectorEffect="non-scaling-stroke" />)}
      {form === "clouds"
        ? centres.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={radii[i]} fill="none" stroke={colors[i]} strokeWidth={1.5} strokeOpacity={0.85} vectorEffect="non-scaling-stroke" />
            <circle cx={c.x} cy={c.y} r={radii[i] * CORE_SCALE} fill={colors[(i + 1) % colors.length]} fillOpacity={0.25} stroke={colors[(i + 1) % colors.length]} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </g>
        ))
        : centres.map((c, i) => {
          const size = 100 + i * 50;
          return <rect key={i} x={c.x - size / 2} y={c.y - size / 2} width={size} height={size} fill="none" stroke={`hsl(${i * 36} 100% 50%)`} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />;
        })}
    </svg>
  );
}
