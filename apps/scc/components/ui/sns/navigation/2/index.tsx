"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./navigation.module.css";

type ActionId = "like" | "comment" | "repost" | "send" | "save";

type ActionDefinition = {
  id: ActionId;
  label: string;
  count?: string;
};

const actions: readonly ActionDefinition[] = [
  { id: "like", label: "Like", count: "3,473" },
  { id: "comment", label: "Comment", count: "81" },
  { id: "repost", label: "Repost" },
  { id: "send", label: "Send", count: "525" },
  { id: "save", label: "Save" },
];

function isActionId(value: string | undefined): value is ActionId {
  return actions.some((action) => action.id === value);
}

function ActionButton({
  rowIndex,
  action,
  selected,
  skating,
  onActivate,
}: {
  rowIndex: number;
  action: ActionDefinition;
  selected: boolean;
  skating: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      aria-label={action.count ? `${action.label}, ${action.count}` : action.label}
      aria-pressed={selected}
      className={styles.actionButton}
      data-action={action.id}
      data-skate-action={action.id}
      data-skate-row={rowIndex}
      data-selected={selected || undefined}
      data-skating={skating || undefined}
      type="button"
      onClick={(event) => {
        if (event.detail === 0) {
          onActivate();
        }
      }}
    />
  );
}

export default function SnsNavigationTwo() {
  const [rowCount, setRowCount] = useState(8);
  const [selectedActions, setSelectedActions] = useState<(ActionId | null)[]>(
    () => Array.from({ length: 8 }, () => null),
  );
  const [skatingSelections, setSkatingSelections] = useState<string[]>([]);
  const activePointerIdsRef = useRef(new Set<number>());
  const pointerSelectionRef = useRef(new Map<number, string>());

  useEffect(() => {
    function syncRowCount() {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const referenceRowHeight = Math.min(
        127,
        Math.max(34, viewportWidth * 0.1078),
      );
      const nextRowCount = Math.max(
        1,
        Math.min(
          18,
          Math.floor(viewportHeight / referenceRowHeight),
        ),
      );

      setRowCount(nextRowCount);
      setSelectedActions((current) =>
        Array.from({ length: nextRowCount }, (_, index) => current[index] ?? null),
      );
    }

    syncRowCount();
    window.addEventListener("resize", syncRowCount);
    window.visualViewport?.addEventListener("resize", syncRowCount);

    return () => {
      window.removeEventListener("resize", syncRowCount);
      window.visualViewport?.removeEventListener("resize", syncRowCount);
    };
  }, []);

  const stackStyle = {
    gridTemplateRows: `repeat(${rowCount}, var(--reference-row-height))`,
  } as CSSProperties;

  function setRowAction(rowIndex: number, actionId: ActionId) {
    setSelectedActions((current) => {
      if (
        rowIndex < 0 ||
        rowIndex >= current.length ||
        current[rowIndex] === actionId
      ) {
        return current;
      }

      return current.map((action, index) =>
        index === rowIndex ? actionId : action,
      );
    });
  }

  function refreshSkatingSelections() {
    setSkatingSelections([...new Set(pointerSelectionRef.current.values())]);
  }

  function selectAtPoint(pointerId: number, clientX: number, clientY: number) {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-skate-row][data-skate-action]");

    if (!target) return;

    const rowIndex = Number(target.dataset.skateRow);
    const actionId = target.dataset.skateAction;

    if (!Number.isInteger(rowIndex) || !isActionId(actionId)) return;

    const selectionKey = `${rowIndex}:${actionId}`;
    if (pointerSelectionRef.current.get(pointerId) === selectionKey) return;

    pointerSelectionRef.current.set(pointerId, selectionKey);
    setRowAction(rowIndex, actionId);
    refreshSkatingSelections();
  }

  function selectFromPointerEvent(event: PointerEvent<HTMLElement>) {
    const coalescedPoints = event.nativeEvent.getCoalescedEvents?.();
    const points =
      coalescedPoints && coalescedPoints.length > 0
        ? coalescedPoints
        : [event.nativeEvent];

    for (const point of points) {
      selectAtPoint(event.pointerId, point.clientX, point.clientY);
    }
  }

  function clearPointer(pointerId: number) {
    activePointerIdsRef.current.delete(pointerId);

    if (pointerSelectionRef.current.delete(pointerId)) {
      refreshSkatingSelections();
    }
  }

  function finishPointer(event: PointerEvent<HTMLElement>) {
    if (!activePointerIdsRef.current.has(event.pointerId)) return;

    selectFromPointerEvent(event);
    clearPointer(event.pointerId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <main
      className={styles.experiment}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onLostPointerCapture={(event) => clearPointer(event.pointerId)}
      onPointerCancel={(event) => clearPointer(event.pointerId)}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        event.preventDefault();
        activePointerIdsRef.current.add(event.pointerId);
        event.currentTarget.setPointerCapture(event.pointerId);
        selectFromPointerEvent(event);
      }}
      onPointerMove={(event) => {
        if (activePointerIdsRef.current.has(event.pointerId)) {
          selectFromPointerEvent(event);
        }
      }}
      onPointerUp={finishPointer}
    >
      <section
        aria-label="Instagram post action navigation stack"
        className={styles.stack}
        style={stackStyle}
      >
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <nav
            aria-label={`Instagram post actions ${rowIndex + 1}`}
            className={styles.actionRow}
            key={`sns-navigation-2-row-${rowIndex}`}
          >
            <img
              alt=""
              aria-hidden="true"
              className={styles.referenceStrip}
              src="/images/sns/navigation/2/instagram-action-row-reference.jpg"
            />
            {actions.map((action) => {
              const selectionKey = `${rowIndex}:${action.id}`;

              return (
                <ActionButton
                  action={action}
                  key={`${rowIndex}-${action.id}`}
                  onActivate={() => setRowAction(rowIndex, action.id)}
                  rowIndex={rowIndex}
                  selected={selectedActions[rowIndex] === action.id}
                  skating={skatingSelections.includes(selectionKey)}
                />
              );
            })}
          </nav>
        ))}
      </section>
    </main>
  );
}
