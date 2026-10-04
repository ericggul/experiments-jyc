import type { ReactNode } from "react";
import type { Shot } from "./storyboard-model";

/** One page of an app inside a storyboard. */
export type Panel = {
  /** Content that scrolls. */
  body: ReactNode;
  /** Fixed chrome drawn over the panel (nav bar, tab bar, composer…). */
  chrome?: ReactNode;
  /** Scroll viewport insets in pt, so content scrolls between the bars. */
  top?: number;
  bottom?: number;
  /** Extra class for the panel (e.g. a dark background). */
  className?: string;
};

export type Session = {
  /** Scene length in simulated minutes. */
  duration: number;
  shots: readonly Shot[];
  panels: Readonly<Record<string, Panel>>;
  /** Drawn over every panel; static (built once). For per-tick values use the `live` prop. */
  overlay?: ReactNode;
};

export type BoardProps = {
  session: Session;
  elapsed: number;
  live?: (panel: string) => ReactNode;
};
