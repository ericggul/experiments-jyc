import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ios } from "../ios";
import type { TransitionStyle } from "../model/settings";
import type { Push, Scene } from "../model/types";
import styles from "./stage.module.css";

export type TransitionSettings = { style: TransitionStyle; ms: number; holdMs: number; scale: number };
export type TransitionKind = "zoom" | "launch" | "close" | "switch" | "push" | "fade";

/** Screens a person "leaves to" or "opens from": not apps in their own right. */
const SURFACES = new Set(["lock", "home", "alarm", "off"]);

export function transitionKind(from: Scene, to: Scene, style: TransitionStyle): TransitionKind {
  if (style === "zoom") return "zoom";
  const fromSurface = SURFACES.has(from.app);
  const toSurface = SURFACES.has(to.app);
  if (fromSurface && toSurface) return "fade";
  if (fromSurface) return from.app === "alarm" ? "fade" : "launch";
  if (toSurface) return to.app === "alarm" ? "fade" : "close";
  return from.app === to.app ? "push" : "switch";
}

const classes: Record<TransitionKind, { enter: string; exit: string }> = {
  zoom: { enter: styles.zoomIn, exit: styles.zoomOut },
  launch: { enter: styles.launchIn, exit: styles.launchUnder },
  close: { enter: styles.closeUnder, exit: styles.closeOut },
  switch: { enter: styles.switchIn, exit: styles.switchOut },
  push: { enter: styles.pushIn, exit: styles.pushOut },
  fade: { enter: styles.fadeIn, exit: styles.fadeOut },
};

const varsOf = (transition: TransitionSettings) =>
  ({ "--stage-ms": `${transition.ms}ms`, "--stage-scale": transition.scale }) as CSSProperties;

type Leaving = { scene: Scene; kind: TransitionKind };

/**
 * Every scene change animates, one at a time. A screen stays up for its
 * transition plus `holdMs` before the next may begin; scenes that arrive
 * meanwhile are skipped to the latest, so no animation is ever cut short.
 */
export function Stage({ scene, transition, render }: {
  scene: Scene;
  transition: TransitionSettings;
  render: (scene: Scene, frozen: boolean) => ReactNode;
}) {
  const [shown, setShown] = useState(scene);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const enteredAt = useRef(0);
  const target = useRef(scene);

  useEffect(() => {
    target.current = scene;
  });

  useEffect(() => {
    if (scene.id === shown.id || leaving) return;
    const wait = Math.max(0, enteredAt.current + transition.ms + transition.holdMs - performance.now());
    const timer = window.setTimeout(() => {
      const next = target.current;
      if (next.id === shown.id) return;
      enteredAt.current = performance.now();
      setLeaving({ scene: shown, kind: transitionKind(shown, next, transition.style) });
      setShown(next);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [scene.id, shown, leaving, transition]);

  // The shown scene keeps its latest data (minute, pushes) while it waits its turn.
  const current = scene.id === shown.id ? scene : shown;
  const style = varsOf(transition);
  return (
    <>
      {leaving && (
        <div key={`out:${leaving.scene.id}`} className={`${styles.layer} ${classes[leaving.kind].exit}`} style={style}>
          {render(leaving.scene, true)}
        </div>
      )}
      <div
        key={current.id}
        className={`${styles.layer} ${leaving ? classes[leaving.kind].enter : ""}`}
        style={style}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setLeaving(null);
        }}
      >
        {render(current, current !== scene)}
      </div>
    </>
  );
}

/** A notification banner that slides down on arrival and back up when it expires. */
export function BannerPresence({ push, transition, render }: {
  push: Push | null;
  transition: TransitionSettings;
  render: (push: Push) => ReactNode;
}) {
  const [current, setCurrent] = useState(push);
  const [leaving, setLeaving] = useState<Push | null>(null);
  if ((push?.id ?? null) !== (current?.id ?? null)) {
    setLeaving(current);
    setCurrent(push);
  }
  const style = varsOf(transition);
  return (
    <>
      {leaving && (
        <div key={`out:${leaving.id}`} className={`${ios.banner} ${styles.bannerOut}`} style={style} onAnimationEnd={() => setLeaving(null)}>
          {render(leaving)}
        </div>
      )}
      {push && (
        <div key={push.id} className={`${ios.banner} ${styles.bannerIn}`} style={style}>
          {render(push)}
        </div>
      )}
    </>
  );
}
