import { forwardRef, useImperativeHandle, useRef } from "react";
import styles from "../style/network-instability.module.css";
import { tokens } from "../style/tokens";
import { allLinks, nodes, type NodeId, type Panel, type Fraction } from "../model/configurations";
import { arrowPath, labelPoint, linkPath } from "./geometry";

export type NetworkHandle = { draw: (transfers: ReadonlyMap<string, number> | null, phase: number, levels: ReadonlyMap<NodeId, number>) => void };

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function weightLabel([numerator, denominator]: Fraction) {
  return `${numerator === 1 ? "" : numerator}ω${denominator === 1 ? "" : `/${denominator}`}`;
}

const shapes = allLinks.map((link) => ({
  ...link,
  d: linkPath(link.id, link.from, link.to),
  arrow: arrowPath(link.id, link.from, link.to),
  label: labelPoint(link.id, link.from, link.to),
}));

type Props = { panel: Panel; onShock: (id: NodeId) => void; titleId: string; descriptionId: string; description: string };

/**
 * Fig. 3's network. Links present in the panel draw in, absent links draw
 * out; new and reweighted links keep the figure's emphasis. Distress travels
 * as pulses, and each bank's ring fills with its distress (DebtRank Fig. 3).
 */
const Network = forwardRef<NetworkHandle, Props>(function Network({ panel, onShock, titleId, descriptionId, description }, ref) {
  const pulseRefs = useRef(new Map<string, SVGGElement>());
  const fillRefs = useRef(new Map<NodeId, SVGCircleElement>());
  const weights = new Map(panel.links.map((link) => [link.id, link.weight]));
  const { node, pulse, link } = tokens;

  useImperativeHandle(ref, () => ({
    draw(transfers, phase, levels) {
      for (const { id } of shapes) {
        const group = pulseRefs.current.get(id);
        if (!group) continue;
        const amount = transfers?.get(id) ?? 0;
        if (amount < 1e-3) {
          group.setAttribute("opacity", "0");
          continue;
        }
        // Width follows the distress carried; 0.25 is a quarter of a default.
        const width = pulse.minWidth + (pulse.maxWidth - pulse.minWidth) * clamp(amount / 0.25);
        const offset = String(pulse.length - phase * (1 + pulse.length));
        const [clearance, trail] = group.children;
        clearance.setAttribute("stroke-width", String(width + 2 * pulse.clearance));
        clearance.setAttribute("stroke-dashoffset", offset);
        trail.setAttribute("stroke-width", String(width));
        trail.setAttribute("stroke-dashoffset", offset);
        group.setAttribute("opacity", String(clamp(amount / 0.02)));
      }
      for (const { id } of nodes) {
        // Area, not radius, is proportional to distress.
        fillRefs.current.get(id)?.setAttribute("r", (node.radius * Math.sqrt(clamp(levels.get(id) ?? 0))).toFixed(2));
      }
    },
  }), [node, pulse]);

  return (
    <svg className={styles.graph} viewBox="0 0 400 400" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      <title id={titleId}>{`Fig. 3${panel.id}`}</title>
      <desc id={descriptionId}>{description}</desc>
      <g fill="none" strokeWidth={link.stroke} strokeLinecap="round" strokeLinejoin="round">
        {shapes.map((shape) => {
          const weight = weights.get(shape.id);
          const role = !weight ? styles.absent : panel.added.has(shape.id) ? styles.added : panel.changed.has(shape.id) ? styles.changed : "";
          return (
            <g key={shape.id} className={`${styles.link} ${role}`}>
              <path d={shape.d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={weight ? 0 : 1} vectorEffect="non-scaling-stroke" />
              <path d={shape.arrow} vectorEffect="non-scaling-stroke" />
              <text x={shape.label.x} y={shape.label.y} textAnchor="middle" dominantBaseline="central">{weight ? weightLabel(weight) : ""}</text>
            </g>
          );
        })}
      </g>
      <g className={styles.pulses} fill="none" strokeLinecap="round" aria-hidden="true" pointerEvents="none">
        {shapes.map((shape) => (
          <g key={shape.id} ref={(element) => { if (element) pulseRefs.current.set(shape.id, element); else pulseRefs.current.delete(shape.id); }} opacity="0">
            <path d={shape.d} pathLength={1} style={{ stroke: "var(--field)" }} strokeDasharray={`${pulse.length} 2`} vectorEffect="non-scaling-stroke" />
            <path d={shape.d} pathLength={1} stroke="currentColor" strokeDasharray={`${pulse.length} 2`} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </g>
      {nodes.map(({ id, x, y }) => (
        <g
          key={id} className={styles.node} role="button" tabIndex={0} aria-label={`Shock bank ${id}`}
          onPointerDown={() => onShock(id)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onShock(id); } }}
        >
          <circle cx={x} cy={y} r={node.radius + 6} fill="transparent" />
          <circle cx={x} cy={y} r={node.radius} stroke="currentColor" strokeWidth={node.stroke} style={{ fill: "var(--field)" }} vectorEffect="non-scaling-stroke" />
          <circle ref={(element) => { if (element) fillRefs.current.set(id, element); else fillRefs.current.delete(id); }} cx={x} cy={y} r={0} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
});

export default Network;
