import { forwardRef, useImperativeHandle, useRef } from "react";
import styles from "../style/network-instability.module.css";
import { tokens } from "../style/tokens";
import { chevronPath, cubicPath, curveBetween } from "../geometry/curves";
import { impacts, institutions } from "./network";
import { CENTRE, guideRanks, layoutIds, layouts, nodeRadius, radiusFor, reciprocal, type Layout, type Point } from "./layout";

export type DebtRankHandle = {
  place: (points: readonly Point[], guides: Readonly<Record<Layout, number>>) => void;
  draw: (transfers: ReadonlyMap<string, number> | null, phase: number, levels: readonly number[], defaulted: readonly boolean[]) => void;
};

const GUIDE_OPACITY = 0.3;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

function shapesAt(points: readonly Point[]) {
  return new Map(impacts.map((impact) => {
    const { curve } = curveBetween(points[impact.from], points[impact.to], {
      reciprocal: reciprocal.has(impact.id), centre: CENTRE, fromRadius: nodeRadius[impact.from], toRadius: nodeRadius[impact.to],
    });
    return [impact.id, { d: cubicPath(curve), arrow: chevronPath(curve, tokens.link.arrow * 0.8) }];
  }));
}

/** Server and first client render show panel a; the clock takes over from there. */
const initial = shapesAt(layouts.a);

type Props = { onShock: (id: number) => void; titleId: string; descriptionId: string; description: string };


/**
 * DebtRank network. Node area is economic value; a node's fill is its
 * distress h. `place` moves every node and redraws every curve, so any
 * placement can morph into any other. Each panel's guides fade with its share.
 */
const DebtRankGraph = forwardRef<DebtRankHandle, Props>(function DebtRankGraph({ onShock, titleId, descriptionId, description }, ref) {
  const linkRefs = useRef(new Map<string, SVGGElement>());
  const pulseRefs = useRef(new Map<string, SVGGElement>());
  const nodeRefs = useRef(new Map<number, SVGGElement>());
  const fillRefs = useRef(new Map<number, SVGCircleElement>());
  const guideRefs = useRef(new Map<Layout, SVGGElement>());
  const { pulse } = tokens;

  useImperativeHandle(ref, () => ({
    place(points, guides) {
      const shapes = shapesAt(points);
      for (const impact of impacts) {
        const { d, arrow } = shapes.get(impact.id)!;
        const [linePath, arrowPath] = linkRefs.current.get(impact.id)?.children ?? [];
        linePath?.setAttribute("d", d);
        arrowPath?.setAttribute("d", arrow);
        for (const path of pulseRefs.current.get(impact.id)?.children ?? []) path.setAttribute("d", d);
      }
      points.forEach(({ x, y }, id) => nodeRefs.current.get(id)?.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`));
      for (const id of layoutIds) guideRefs.current.get(id)?.setAttribute("opacity", String(guides[id] * GUIDE_OPACITY));
    },
    draw(transfers, phase, levels, defaulted) {
      for (const { id } of impacts) {
        const group = pulseRefs.current.get(id);
        if (!group) continue;
        const amount = transfers?.get(id) ?? 0;
        if (amount < 1e-3) {
          group.setAttribute("opacity", "0");
          continue;
        }
        const width = pulse.minWidth + (pulse.maxWidth - pulse.minWidth) * clamp(amount / 0.5);
        const offset = String(pulse.length - phase * (1 + pulse.length));
        const [clearance, trail] = group.children;
        clearance.setAttribute("stroke-width", String(width + 2 * pulse.clearance));
        clearance.setAttribute("stroke-dashoffset", offset);
        trail.setAttribute("stroke-width", String(width));
        trail.setAttribute("stroke-dashoffset", offset);
        group.setAttribute("opacity", String(clamp(amount / 0.05)));
      }
      institutions.forEach(({ id }) => {
        fillRefs.current.get(id)?.setAttribute("r", (nodeRadius[id] * Math.sqrt(clamp(levels[id] ?? 0))).toFixed(2));
        nodeRefs.current.get(id)?.setAttribute("data-default", String(defaulted[id]));
      });
    },
  }), [pulse]);

  const guideRef = (id: Layout) => (element: SVGGElement | null) => {
    if (element) guideRefs.current.set(id, element);
    else guideRefs.current.delete(id);
  };

  return (
    <svg className={styles.graph} viewBox="0 0 400 400" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      <title id={titleId}>DebtRank</title>
      <desc id={descriptionId}>{description}</desc>
      <g fill="none" stroke="currentColor" strokeWidth={tokens.axis.stroke} aria-hidden="true">
        <g ref={guideRef("b")} strokeDasharray={tokens.axis.dash} opacity="0">
          {guideRanks.map((rank) => <circle key={rank} cx={CENTRE.x} cy={CENTRE.y} r={radiusFor(rank)} vectorEffect="non-scaling-stroke" />)}
        </g>
      </g>
      <g className={styles.impacts} fill="none" strokeWidth={tokens.link.stroke} strokeLinecap="round" strokeLinejoin="round">
        {impacts.map((impact) => (
          // Stronger impacts read brighter, as edge weight does in the figure.
          <g key={impact.id} ref={(element) => { if (element) linkRefs.current.set(impact.id, element); else linkRefs.current.delete(impact.id); }} opacity={(0.25 + 0.5 * clamp(impact.weight / 0.7)).toFixed(2)}>
            <path d={initial.get(impact.id)!.d} vectorEffect="non-scaling-stroke" />
            <path d={initial.get(impact.id)!.arrow} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </g>
      <g className={styles.pulses} fill="none" strokeLinecap="round" aria-hidden="true" pointerEvents="none">
        {impacts.map((impact) => (
          <g key={impact.id} ref={(element) => { if (element) pulseRefs.current.set(impact.id, element); else pulseRefs.current.delete(impact.id); }} opacity="0">
            <path d={initial.get(impact.id)!.d} pathLength={1} style={{ stroke: "var(--field)" }} strokeDasharray={`${pulse.length} 2`} vectorEffect="non-scaling-stroke" />
            <path d={initial.get(impact.id)!.d} pathLength={1} stroke="currentColor" strokeDasharray={`${pulse.length} 2`} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </g>
      {institutions.map(({ id }) => (
        <g
          key={id} ref={(element) => { if (element) nodeRefs.current.set(id, element); else nodeRefs.current.delete(id); }}
          transform={`translate(${layouts.a[id].x.toFixed(2)} ${layouts.a[id].y.toFixed(2)})`}
          className={styles.node} role="button" tabIndex={0} aria-label={`Shock institution ${id + 1}`}
          onPointerDown={() => onShock(id)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onShock(id); } }}
        >
          <circle r={nodeRadius[id] + 6} fill="transparent" />
          <circle r={nodeRadius[id]} stroke="currentColor" strokeWidth={tokens.node.stroke} style={{ fill: "var(--field)" }} vectorEffect="non-scaling-stroke" />
          <circle ref={(element) => { if (element) fillRefs.current.set(id, element); else fillRefs.current.delete(id); }} r={0} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
});

export default DebtRankGraph;
