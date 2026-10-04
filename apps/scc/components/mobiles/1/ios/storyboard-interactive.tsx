import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useInteraction } from "./playback";
import { buildNavigation, hotspots, nextStep, type Edge } from "./storyboard-graph";
import { keepsUnderneath, reverseEnter, storyboardConfig, transitionKeyframes, type Enter } from "./storyboard-model";
import { BoardPanel } from "./storyboard-panel";
import type { BoardProps } from "./storyboard-types";
import styles from "./storyboard.module.css";

/** Hands-on transitions run in real time: the person is the clock. */
const TRANSITION_MS = 320;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Entry = { panel: string; enter: Enter };
type Move = { id: number; from: string; to: string; enter: Enter };

/**
 * The hands-on player: the same session, read as a navigation graph. Tapping
 * where the script tapped opens that page with the script's transition;
 * tapping anywhere else follows the script's next step; back reverses the
 * last transition. Pages scroll natively.
 */
export function InteractiveBoard({ session, live }: BoardProps) {
  const interaction = useInteraction();
  const ids = useMemo(() => Object.keys(session.panels), [session]);
  const navigation = useMemo(() => buildNavigation({ duration: session.duration, shots: session.shots }, ids), [session, ids]);
  const [stack, setStack] = useState<Entry[]>(() => [{ panel: navigation.start, enter: "cut" }]);
  const [cursor, setCursor] = useState(0);
  const [move, setMove] = useState<Move | null>(null);
  const panelRefs = useRef(new Map<string, HTMLDivElement>());
  const tapRef = useRef<HTMLSpanElement>(null);
  const moveId = useRef(0);

  const top = stack[stack.length - 1];
  const beneath = stack.length > 1 && keepsUnderneath(top.enter) ? stack[stack.length - 2].panel : null;

  const go = useCallback((edge: Edge) => {
    const at = stack.findIndex((entry) => entry.panel === edge.to);
    moveId.current += 1;
    if (at >= 0 && at < stack.length - 1) {
      // Going back to a page already open: unwind with the reverse of how the top arrived.
      setMove({ id: moveId.current, from: top.panel, to: edge.to, enter: reverseEnter(top.enter) });
      setStack(stack.slice(0, at + 1));
    } else {
      setMove({ id: moveId.current, from: top.panel, to: edge.to, enter: edge.enter });
      setStack([...stack, { panel: edge.to, enter: edge.enter }]);
    }
    setCursor(edge.index);
  }, [stack, top]);

  const back = useCallback(() => {
    if (stack.length < 2) return false;
    moveId.current += 1;
    setMove({ id: moveId.current, from: top.panel, to: stack[stack.length - 2].panel, enter: reverseEnter(top.enter) });
    setStack(stack.slice(0, -1));
    return true;
  }, [stack, top]);

  useEffect(() => {
    interaction?.register({ back });
    return () => interaction?.register(null);
  }, [interaction, back]);

  // Play the transition once React has committed the new stack.
  useIsoLayoutEffect(() => {
    if (!move) return;
    const options: KeyframeAnimationOptions = { duration: TRANSITION_MS, easing: storyboardConfig.transitionEasing };
    const incoming = panelRefs.current.get(move.to);
    const outgoing = panelRefs.current.get(move.from);
    const enterFrames = transitionKeyframes(move.enter, "in");
    const exitFrames = transitionKeyframes(move.enter, "out");
    const outgoingOnTop = move.enter === "pop" || move.enter === "dismiss";
    const animations: Animation[] = [];
    if (incoming && enterFrames) animations.push(incoming.animate(enterFrames, options));
    if (outgoing && exitFrames) {
      // The leaving page stays drawn while it animates away.
      outgoing.style.visibility = "visible";
      outgoing.style.zIndex = outgoingOnTop ? "3" : "1";
      const exit = outgoing.animate(exitFrames, { ...options, fill: "forwards" });
      exit.onfinish = () => {
        outgoing.style.visibility = "";
        outgoing.style.zIndex = "";
        exit.cancel();
      };
      animations.push(exit);
    }
    return () => {
      for (const animation of animations) animation.finish();
    };
  }, [move]);

  const tap = (x: number, y: number) => {
    const marker = tapRef.current;
    if (!marker || typeof marker.animate !== "function") return;
    marker.animate(
      [
        { transform: `translate(${x - 22}px, ${y - 22}px) scale(0.6)`, opacity: 0.34 },
        { transform: `translate(${x - 22}px, ${y - 22}px) scale(1.3)`, opacity: 0 },
      ],
      { duration: 260, easing: "ease-out" },
    );
  };

  const point = (event: MouseEvent<HTMLElement>) => {
    const box = event.currentTarget.closest(`.${styles.board}`)?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    const scale = box.width / 390;
    return { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale };
  };

  const onBoardClick = (event: MouseEvent<HTMLDivElement>) => {
    const { x, y } = point(event);
    tap(x, y);
    const step = nextStep(navigation, top.panel, cursor);
    if (step) go(step);
    else interaction?.onExhausted();
  };

  const spots = hotspots(navigation, top.panel, cursor);
  return (
    <div className={styles.board} onClick={onBoardClick}>
      {ids.map((key) => {
        const shown = key === top.panel || key === beneath;
        return (
          <BoardPanel
            key={key}
            panel={session.panels[key]}
            scrollable
            panelRef={(element) => {
              if (element) panelRefs.current.set(key, element);
              else panelRefs.current.delete(key);
            }}
            style={shown ? { zIndex: key === top.panel ? 2 : 1 } : undefined}
            className={shown ? undefined : styles.hidden}
            live={shown ? live?.(key) : null}
          />
        );
      })}
      {spots.map((edge) => (
        <button
          key={`${edge.index}`}
          type="button"
          className={styles.hotspot}
          style={{ left: edge.tap?.x, top: edge.tap?.y }}
          aria-label={`Open ${edge.to}`}
          onClick={(event) => {
            event.stopPropagation();
            const { x, y } = point(event);
            tap(x, y);
            go(edge);
          }}
        />
      ))}
      <span ref={tapRef} className={styles.tap} aria-hidden="true" />
      {session.overlay}
    </div>
  );
}
