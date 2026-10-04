import type { CSSProperties, ReactNode, Ref } from "react";
import type { Panel } from "./storyboard-types";
import styles from "./storyboard.module.css";

/** One panel as both players draw it: scroll viewport, content, chrome, live layer. */
export function BoardPanel({ panel, style, className, contentStyle, panelRef, contentRef, scrollable = false, live }: {
  panel: Panel;
  className?: string;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
  panelRef?: Ref<HTMLDivElement>;
  contentRef?: Ref<HTMLDivElement>;
  /** Native scrolling (interactive) instead of animated scrolling (auto). */
  scrollable?: boolean;
  live?: ReactNode;
}) {
  return (
    <div ref={panelRef} className={`${styles.panel} ${panel.className ?? ""} ${className ?? ""}`} style={style}>
      <div className={`${styles.scroller} ${scrollable ? styles.native : ""}`} style={{ top: panel.top ?? 0, bottom: panel.bottom ?? 0 }}>
        <div ref={contentRef} className={styles.content} style={contentStyle}>
          {panel.body}
        </div>
      </div>
      {panel.chrome}
      {live}
    </div>
  );
}
