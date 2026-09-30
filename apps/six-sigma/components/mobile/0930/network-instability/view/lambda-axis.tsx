import styles from "../style/network-instability.module.css";
import { tokens } from "../style/tokens";
import type { PanelId } from "../model/configurations";

const LEFT = 16;
const RIGHT = 368;
const BASE = 40;
const AXIS_MAX = 1.5;
const x = (value: number) => LEFT + (Math.min(value, AXIS_MAX) / AXIS_MAX) * (RIGHT - LEFT);

type Mark = { id: PanelId; lambda: number };

/** Spread letters that would collide (d and e sit 0.002 apart), with leaders as in Fig. 3f. */
function place(marks: Mark[]) {
  const sorted = [...marks].sort((a, b) => a.lambda - b.lambda).map((mark) => ({ ...mark, tick: x(mark.lambda), label: x(mark.lambda) }));
  for (let pass = 0; pass < 8; pass++) {
    for (let index = 1; index < sorted.length; index++) {
      const gap = sorted[index].label - sorted[index - 1].label;
      if (gap < tokens.axis.labelGap) {
        const push = (tokens.axis.labelGap - gap) / 2;
        sorted[index - 1].label -= push;
        sorted[index].label += push;
      }
    }
  }
  return sorted;
}

/**
 * Fig. 3f: each configuration's λmax on one line, with the instability
 * threshold at 1 dashed. Absolute λmax, so changing ω slides every mark.
 */
export default function LambdaAxis({ marks, current, select }: { marks: Mark[]; current: PanelId; select: (id: PanelId) => void }) {
  const { axis } = tokens;
  const placed = place(marks);
  const active = marks.find((mark) => mark.id === current)!;
  const order = marks.map((mark) => mark.id);

  return (
    <svg className={styles.axis} viewBox="0 0 400 64" role="radiogroup" aria-label="Configuration by λmax">
      <g stroke="currentColor" strokeWidth={axis.stroke} fill="none">
        <line className={styles.secondary} x1={LEFT} y1={BASE} x2={RIGHT} y2={BASE} vectorEffect="non-scaling-stroke" />
        <line className={styles.secondary} x1={x(1)} y1={BASE - 26} x2={x(1)} y2={BASE + 12} strokeDasharray={axis.dash} vectorEffect="non-scaling-stroke" />
      </g>
      <g className={styles.secondary}>
        <text className={styles.label} x={x(1)} y={BASE + 22} textAnchor="middle">1</text>
        <text className={styles.label} x={RIGHT + 4} y={BASE} dominantBaseline="central">λmax</text>
      </g>
      {placed.map((mark) => {
        const selected = mark.id === current;
        return (
          <g
            key={mark.id} className={`${styles.mark} ${selected ? "" : styles.secondary}`}
            role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1}
            aria-label={`Configuration ${mark.id}, λmax ${mark.lambda.toFixed(4)}`}
            onClick={() => select(mark.id)}
            onKeyDown={(event) => {
              const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
              if (!step) return;
              event.preventDefault();
              const next = order[(order.indexOf(current) + step + order.length) % order.length];
              select(next);
              (event.currentTarget.parentNode?.querySelector(`[aria-label^="Configuration ${next},"]`) as SVGGElement | null)?.focus();
            }}
          >
            <rect x={mark.label - 7} y={0} width={14} height={BASE + 4} fill="transparent" />
            <line x1={mark.tick} y1={BASE - axis.tick} x2={mark.tick} y2={BASE + axis.tick} stroke="currentColor" strokeWidth={selected ? 1.4 : axis.stroke} vectorEffect="non-scaling-stroke" />
            {mark.label !== mark.tick && (
              <line x1={mark.tick} y1={BASE - axis.tick} x2={mark.label} y2={BASE - 16} stroke="currentColor" strokeWidth={axis.stroke} vectorEffect="non-scaling-stroke" />
            )}
            <text className={styles.label} x={mark.label} y={BASE - 20} textAnchor="middle">{mark.id}</text>
          </g>
        );
      })}
      <text className={styles.label} x={x(active.lambda)} y={BASE + 22} textAnchor="middle">
        {Math.abs(active.lambda - 1) < 0.04 ? "" : active.lambda.toFixed(2)}
      </text>
    </svg>
  );
}
