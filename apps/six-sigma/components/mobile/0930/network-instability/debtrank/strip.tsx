import { forwardRef, useImperativeHandle, useRef } from "react";
import styles from "../style/network-instability.module.css";
import { tokens } from "../style/tokens";
import { layoutIds, layoutNames, type Layout } from "./layout";

export const TRACE_SAMPLES = 240;
const LEFT = 16;
const RIGHT = 384;
const TOP = 30;
const BASE = 62;

export type TraceHandle = { push: (distress: number, common: boolean) => void };

type Props = { layout: Layout; setLayout: (layout: Layout) => void; shuffling: boolean; setShuffling: (on: boolean) => void };

/**
 * Letters a–l choose a placement; the button on the right shuffles through
 * them on its own. Below, the system's value-weighted distress over the last
 * 24 s (0 at the line, 1 = everything in default); ticks under the line mark
 * common shocks.
 */
const Strip = forwardRef<TraceHandle, Props>(function Strip({ layout, setLayout, shuffling, setShuffling }, ref) {
  const lineRef = useRef<SVGPolylineElement>(null);
  const ticksRef = useRef<SVGPathElement>(null);
  const samples = useRef<{ distress: number; common: boolean }[]>([]);
  const { axis } = tokens;

  useImperativeHandle(ref, () => ({
    push(distress, common) {
      const list = samples.current;
      list.push({ distress, common });
      if (list.length > TRACE_SAMPLES) list.shift();
      const x = (index: number) => RIGHT - (list.length - 1 - index) * ((RIGHT - LEFT) / (TRACE_SAMPLES - 1));
      lineRef.current?.setAttribute("points", list.map(({ distress }, index) => `${x(index).toFixed(1)},${(BASE - distress * (BASE - TOP)).toFixed(1)}`).join(" "));
      ticksRef.current?.setAttribute("d", list.flatMap(({ common }, index) => common ? [`M ${x(index).toFixed(1)} ${BASE + 3} V ${BASE + 8}`] : []).join(" "));
    },
  }), []);

  return (
    <svg className={styles.axis} viewBox="0 0 400 72">
      <g role="radiogroup" aria-label="Placement">
        {layoutIds.map((id, index) => (
          <g
            key={id} className={`${styles.mark} ${layout === id ? "" : styles.secondary}`}
            role="radio" aria-checked={layout === id} tabIndex={layout === id ? 0 : -1}
            aria-label={`Panel ${id}: ${layoutNames[id]}`}
            onClick={() => setLayout(id)}
            onKeyDown={(event) => {
              const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
              if (!step) return;
              event.preventDefault();
              const next = layoutIds[(layoutIds.indexOf(layout) + step + layoutIds.length) % layoutIds.length];
              setLayout(next);
              (event.currentTarget.parentNode?.querySelector(`[aria-label^="Panel ${next}:"]`) as SVGGElement | null)?.focus();
            }}
          >
            <rect x={LEFT - 6 + index * 14} y={0} width={14} height={20} fill="transparent" />
            <text className={styles.label} x={LEFT + 1 + index * 14} y={10} textAnchor="middle" dominantBaseline="central">{id}</text>
          </g>
        ))}
      </g>
      <g
        className={`${styles.mark} ${shuffling ? "" : styles.secondary}`} role="button" tabIndex={0}
        aria-pressed={shuffling} aria-label="Shuffle placements"
        onClick={() => setShuffling(!shuffling)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setShuffling(!shuffling); } }}
      >
        <rect x={RIGHT - 22} y={0} width={28} height={20} fill="transparent" />
        {/* Two crossing arrows. */}
        <path
          d={`M ${RIGHT - 16} 6 C ${RIGHT - 10} 6 ${RIGHT - 8} 14 ${RIGHT - 2} 14 M ${RIGHT - 16} 14 C ${RIGHT - 10} 14 ${RIGHT - 8} 6 ${RIGHT - 2} 6 M ${RIGHT - 4.5} 3.5 L ${RIGHT - 2} 6 L ${RIGHT - 4.5} 8.5 M ${RIGHT - 4.5} 11.5 L ${RIGHT - 2} 14 L ${RIGHT - 4.5} 16.5`}
          fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        />
      </g>
      <g aria-hidden="true">
        <line className={styles.secondary} x1={LEFT} y1={BASE} x2={RIGHT} y2={BASE} stroke="currentColor" strokeWidth={axis.stroke} vectorEffect="non-scaling-stroke" />
        <text className={`${styles.label} ${styles.secondary}`} x={LEFT} y={TOP - 2}>system distress</text>
        <polyline ref={lineRef} fill="none" stroke="currentColor" strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path ref={ticksRef} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
});

export default Strip;
