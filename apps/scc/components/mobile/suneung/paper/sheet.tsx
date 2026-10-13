import type { ComponentType, CSSProperties } from "react";
import styles from "./paper.module.css";
import type { PaperItem, PaperLine, PaperPage } from "./types";

export type PaperFigures = Record<string, ComponentType>;

const fontClass: Record<string, string> = {
  m: styles.m,
  mb: styles.mb,
  g: styles.g,
  d: styles.d,
  gb: styles.gb,
  gh: styles.gh,
  gx: styles.gx,
  gt: styles.gt,
  e: styles.e,
  ei: styles.ei,
};

/** HWP 장평 of each font class; the DOM keeps the original glyph proportions. */
const condense: Record<string, number> = { m: 0.95, mb: 0.95, g: 0.95, d: 0.85, gb: 0.95, gh: 0.95, gx: 0.85, gt: 0.92, e: 1, ei: 1 };

/** Display faces whose substitutes differ most in width are fitted by 장평 instead of letter-spacing. */
const stretched = new Set(["d", "gh", "gx", "gt"]);

function Line({ line }: { line: PaperLine }) {
  const scale = condense[line.runs[0].f] ?? 1;
  return (
    <div className={styles.line} data-line data-scale={scale} style={{ left: line.x, top: line.y, fontSize: line.s }}>
      <span className={styles.glyphs} style={{ transform: `scaleX(${scale})` }}>
        <i className={styles.baseline} />
        {line.runs.map((run) => {
          const style: CSSProperties = {};
          if (run.s) style.fontSize = run.s;
          if (run.c) style.color = run.c;
          if (run.dy) style.top = run.dy;
          const mark = run.m === "b" ? styles.boxed : run.m === "u" ? styles.underlined : "";
          return (
            <span
              key={run.id}
              className={`${styles.run} ${fontClass[run.f]} ${mark}`}
              data-w={run.w}
              data-e={run.e}
              data-m={run.m}
              data-n={Array.from(run.t).length}
              data-fit={stretched.has(run.f) ? "scale" : undefined}
              style={style}
            >
              {run.t}
            </span>
          );
        })}
      </span>
    </div>
  );
}

function Item({ item, figures }: { item: PaperItem; figures: PaperFigures }) {
  switch (item.k) {
    case "line":
      return <Line line={item} />;
    case "h":
      return (
        <div
          className={styles.rule}
          style={{ left: item.x, top: item.y - item.sw / 2, width: item.w, height: item.sw, background: item.color ?? undefined }}
        />
      );
    case "v":
      return (
        <div
          className={styles.rule}
          style={{ left: item.x - item.sw / 2, top: item.y, width: item.sw, height: item.h, background: item.color ?? undefined }}
        />
      );
    case "d": {
      const length = Math.hypot(item.x2 - item.x, item.y2 - item.y);
      const angle = Math.atan2(item.y2 - item.y, item.x2 - item.x);
      return (
        <div
          className={styles.rule}
          style={{
            left: item.x,
            top: item.y - item.sw / 2,
            width: length,
            height: item.sw,
            transform: `rotate(${angle}rad)`,
            transformOrigin: `0 ${item.sw / 2}px`,
            background: item.color ?? undefined,
          }}
        />
      );
    }
    case "box":
      return (
        <div
          className={styles.box}
          style={{
            left: item.x - item.sw / 2,
            top: item.y - item.sw / 2,
            width: item.w + item.sw,
            height: item.h + item.sw,
            borderWidth: item.sw,
            borderRadius: item.r,
            borderColor: item.color ?? undefined,
          }}
        />
      );
    case "fill":
      return <div className={styles.fill} style={{ left: item.x, top: item.y, width: item.w, height: item.h, background: item.color }} />;
    case "fig": {
      const Figure = figures[item.id];
      return (
        <div className={styles.figure} data-figure={item.id} style={{ left: item.x, top: item.y, width: item.w, height: item.h }}>
          {Figure ? <Figure /> : null}
        </div>
      );
    }
  }
}

export function Sheet({ page, figures }: { page: PaperPage; figures: PaperFigures }) {
  return (
    <section className={styles.slot} data-page={page.n}>
      <div className={styles.sheet}>
        {page.items.map((item) => (
          <Item key={item.id} item={item} figures={figures} />
        ))}
      </div>
    </section>
  );
}
