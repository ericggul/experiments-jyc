"use client";

import type { PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type TabId =
  | "bed"
  | "birth"
  | "commute"
  | "education"
  | "work-day"
  | "meal"
  | "hospital"
  | "death"
  | "reels";

type InterfaceMode = "day" | "life";
type VisualMode = "stroke" | "fill" | "halo";
type TabDefinition = {
  id: TabId;
  label: string;
  icon: ReactNode;
  selectedColor: string;
};

const dayTabs: readonly TabDefinition[] = [
  { id: "bed", label: "Bed", icon: <BedIcon />, selectedColor: "#5f7185" },
  {
    id: "commute",
    label: "Commute",
    icon: <CommuteIcon />,
    selectedColor: "#2563a6",
  },
  {
    id: "work-day",
    label: "Work",
    icon: <WorkIcon />,
    selectedColor: "#2b7896",
  },
  {
    id: "meal",
    label: "Meal",
    icon: <MealIcon />,
    selectedColor: "#b85e24",
  },
  {
    id: "reels",
    label: "Phone reels",
    icon: <PhoneReelsIcon />,
    selectedColor: "#8a3fa0",
  },
];

const lifeTabs: readonly TabDefinition[] = [
  {
    id: "birth",
    label: "Birth",
    icon: <BirthIcon />,
    selectedColor: "#3f8496",
  },
  {
    id: "education",
    label: "Education",
    icon: <EducationIcon />,
    selectedColor: "#8f3f4a",
  },
  {
    id: "work-day",
    label: "Work",
    icon: <WorkIcon />,
    selectedColor: "#2b7896",
  },
  {
    id: "hospital",
    label: "Hospital",
    icon: <HospitalIcon />,
    selectedColor: "#c23838",
  },
  {
    id: "death",
    label: "Death",
    icon: <DeathIcon />,
    selectedColor: "#5f6f4e",
  },
];

const tabSets: Record<InterfaceMode, readonly TabDefinition[]> = {
  day: dayTabs,
  life: lifeTabs,
};

function defaultTabForRow(mode: InterfaceMode, index: number) {
  const tabs = tabSets[mode];
  return tabs[index % tabs.length].id;
}

function isTabId(
  value: string | undefined,
  tabs: readonly TabDefinition[],
): value is TabId {
  return tabs.some((tab) => tab.id === value);
}

const iconClassName = "h-7 w-7";
const iconStrokeWidth = 1.9;

function BedIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <path data-icon-fill="" d="M4 17h20v6.5H4V17Z" fill="none" />
      <path
        d="M4 23.5V8M4 17h20v6.5M7 17v-5.5h4.25c1.55 0 2.75 1.2 2.75 2.75V17m0-3.25h5.25A4.75 4.75 0 0 1 24 18.5M4 21.5h20"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function BirthIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <path
        d="M12 6V4.75a2 2 0 0 1 4 0V6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
      <path
        data-icon-fill=""
        d="M10 9h8l2 3v10a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V12l2-3Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
      <rect
        data-icon-fill=""
        x="9.5"
        y="6"
        width="9"
        height="3"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth}
      />
      <path
        data-icon-detail=""
        d="M12 14h4M12 18h3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function EducationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <path
        data-icon-fill=""
        d="M3.5 5.25H10a4 4 0 0 1 4 4v14.5a4 4 0 0 0-4-4H3.5V5.25Zm21 0H18a4 4 0 0 0-4 4v14.5a4 4 0 0 1 4-4h6.5V5.25Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function CommuteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <rect
        data-icon-fill=""
        x="5.25"
        y="3.5"
        width="17.5"
        height="18.25"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth}
      />
      <path
        d="M9.25 17.5h.01M18.75 17.5h.01M9 21.75l-2 2.75m12-2.75 2 2.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
      <path
        data-icon-detail=""
        d="M6 10h16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={iconStrokeWidth}
      />
      <path
        data-icon-detail=""
        d="M10.75 6.75h6.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <rect
        data-icon-fill=""
        x="3.5"
        y="5"
        width="21"
        height="15.5"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth}
      />
      <path
        d="M10.5 24h7M14 20.5V24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function HospitalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <path
        data-icon-fill=""
        d="M11 3.5h6v7.5h7.5v6H17v7.5h-6V17H3.5v-6H11V3.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function DeathIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <path
        data-icon-fill=""
        d="M7 24V12a7 7 0 0 1 14 0v12H7Z"
        fill="none"
      />
      <path
        d="M7 24V12a7 7 0 0 1 14 0v12M4 24h20"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
      <path
        data-icon-detail=""
        d="M14 8.5v8M10.5 12.5h7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function MealIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <path
        data-icon-fill=""
        d="M5 13.5h18c-.65 5.45-3.95 8.25-9 8.25s-8.35-2.8-9-8.25Z"
        fill="none"
      />
      <path
        d="M5 13.5h18c-.65 5.45-3.95 8.25-9 8.25s-8.35-2.8-9-8.25ZM8 24h12M10.5 10.25c-1.5-1.4-1.45-3 .1-4.5m4.25 4.5c-1.5-1.4-1.45-3 .1-4.5m4.25 4.5c-1.5-1.4-1.45-3 .1-4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function PhoneReelsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={iconClassName}>
      <rect
        data-icon-fill=""
        x="7"
        y="2.75"
        width="14"
        height="22.5"
        rx="3.25"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
      <path
        data-icon-detail=""
        d="m12.15 10.25 5.25 3.25-5.25 3.25v-6.5ZM12.25 5.75h3.5M13.25 22.25h1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth}
      />
    </svg>
  );
}

function TabButton({
  rowIndex,
  tabId,
  label,
  selectedColor,
  visualMode,
  children,
  active = false,
  onActivate,
}: {
  rowIndex: number;
  tabId: TabId;
  label: string;
  selectedColor: string;
  visualMode: VisualMode;
  children: ReactNode;
  active?: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      data-skate-row={rowIndex}
      data-skate-tab={tabId}
      onClick={(event) => {
        if (event.detail === 0) {
          onActivate();
        }
      }}
      className="relative grid h-[50px] min-w-0 select-none place-items-center text-current outline-none transition-transform active:scale-[0.92] focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <span
        className={`relative grid place-items-center transition-[color,opacity,transform,filter] duration-[460ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          active
            ? `scale-[1.08] opacity-100 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] saturate-100 ${
                visualMode === "fill"
                  ? "[&_[data-icon-detail]]:stroke-white [&_[data-icon-fill]]:fill-current"
                  : ""
              }`
            : "scale-100 opacity-[0.38] saturate-50"
        }`}
        style={{
          color:
            active && visualMode !== "halo" ? selectedColor : undefined,
        }}
      >
        {children}
      </span>
    </button>
  );
}

export default function SnsNavigationOne() {
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>("day");
  const [visualMode, setVisualMode] = useState<VisualMode>("fill");
  const [activeTabsByMode, setActiveTabsByMode] = useState<
    Record<InterfaceMode, TabId[]>
  >(() => ({
    day: Array.from({ length: 8 }, (_, index) =>
      defaultTabForRow("day", index),
    ),
    life: Array.from({ length: 8 }, (_, index) =>
      defaultTabForRow("life", index),
    ),
  }));
  const [barCount, setBarCount] = useState(8);
  const activePointerIdsRef = useRef(new Set<number>());
  const tabs = tabSets[interfaceMode];
  const activeTabs = activeTabsByMode[interfaceMode];
  const fallbackTab = tabs[0].id;
  const interfaceLabel =
    interfaceMode === "day" ? "Human 24-hour cycle" : "Human life cycle";

  useEffect(() => {
    function syncBarCount() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      const verticalMargin = Math.max(20, Math.min(42, height * 0.038));
      const rowHeight = Math.max(58, Math.min(72, height * 0.082));
      const nextCount = Math.max(5, Math.floor((height - verticalMargin * 2) / rowHeight));
      setBarCount(nextCount);
      setActiveTabsByMode((current) => ({
        day: Array.from(
          { length: nextCount },
          (_, index) =>
            current.day[index] ?? defaultTabForRow("day", index),
        ),
        life: Array.from(
          { length: nextCount },
          (_, index) =>
            current.life[index] ?? defaultTabForRow("life", index),
        ),
      }));
    }

    syncBarCount();
    window.addEventListener("resize", syncBarCount);
    window.visualViewport?.addEventListener("resize", syncBarCount);

    return () => {
      window.removeEventListener("resize", syncBarCount);
      window.visualViewport?.removeEventListener("resize", syncBarCount);
    };
  }, []);

  function setRowTab(rowIndex: number, tabId: TabId) {
    setActiveTabsByMode((current) => {
      const currentRows = current[interfaceMode];

      if (
        rowIndex < 0 ||
        rowIndex >= currentRows.length ||
        currentRows[rowIndex] === tabId
      ) {
        return current;
      }

      return {
        ...current,
        [interfaceMode]: currentRows.map((value, index) =>
          index === rowIndex ? tabId : value,
        ),
      };
    });
  }

  function selectAtPoint(clientX: number, clientY: number) {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-skate-row][data-skate-tab]");

    if (!target) return;

    const rowIndex = Number(target.dataset.skateRow);
    const tabId = target.dataset.skateTab;

    if (Number.isInteger(rowIndex) && isTabId(tabId, tabs)) {
      setRowTab(rowIndex, tabId);
    }
  }

  function selectFromPointerEvent(event: PointerEvent<HTMLElement>) {
    const coalescedPoints = event.nativeEvent.getCoalescedEvents?.();
    const points =
      coalescedPoints && coalescedPoints.length > 0
        ? coalescedPoints
        : [event.nativeEvent];

    for (const point of points) {
      selectAtPoint(point.clientX, point.clientY);
    }
  }

  function finishPointer(event: PointerEvent<HTMLElement>) {
    if (!activePointerIdsRef.current.has(event.pointerId)) return;

    selectFromPointerEvent(event);
    activePointerIdsRef.current.delete(event.pointerId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <main
      className="fixed inset-0 h-dvh touch-none select-none overflow-hidden overscroll-none bg-[linear-gradient(180deg,#f7f7f7_0%,#ffffff_42%,#f1f1f1_100%)] text-black caret-transparent [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onLostPointerCapture={(event) => {
        activePointerIdsRef.current.delete(event.pointerId);
      }}
      onPointerCancel={(event) => {
        activePointerIdsRef.current.delete(event.pointerId);
      }}
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
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <section
        aria-label={`${interfaceLabel} navigation stack`}
        className="mx-auto grid h-full w-full max-w-[470px] gap-[clamp(6px,1.1dvh,12px)] overflow-hidden px-[clamp(12px,4vw,18px)] py-[max(clamp(12px,3.8dvh,34px),env(safe-area-inset-top))] pb-[max(clamp(12px,3.8dvh,34px),env(safe-area-inset-bottom))]"
        style={{
          gridTemplateRows: `repeat(${barCount}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: barCount }, (_, rowIndex) => (
          <nav
            key={`sns-navigation-1-nav-${rowIndex}`}
            aria-label={`${interfaceLabel} navigation ${rowIndex + 1}`}
            className="min-h-0 rounded-[999px] border border-white/60 bg-white/58 px-1.5 shadow-[0_14px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl"
          >
            <div className="relative h-full min-h-[48px]">
              {(() => {
                const activeTab = activeTabs[rowIndex] ?? fallbackTab;
                const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
                const activeColor = tabs[activeIndex].selectedColor;

                return (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 px-px py-1 transition-[left] duration-[560ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        left: `calc(${activeIndex} * (100% / ${tabs.length}))`,
                        width: `calc(100% / ${tabs.length})`,
                      }}
                    >
                      <span
                        className="block h-full min-h-10 rounded-full border border-white/75 bg-white/64 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(255,255,255,0.3),0_10px_24px_rgba(0,0,0,0.13)] transition-[background-color,border-color,box-shadow] duration-[460ms]"
                        style={
                          visualMode === "halo"
                            ? {
                                backgroundColor: `${activeColor}18`,
                                borderColor: `${activeColor}66`,
                                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 ${activeColor}24, 0 10px 26px ${activeColor}40`,
                              }
                            : undefined
                        }
                      />
                    </span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 px-px py-2 transition-[left] duration-[640ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        left: `calc(${activeIndex} * (100% / ${tabs.length}))`,
                        width: `calc(100% / ${tabs.length})`,
                      }}
                    >
                      <span
                        className="block h-full min-h-8 rounded-full bg-white/38 blur-md transition-colors duration-[460ms]"
                        style={
                          visualMode === "halo"
                            ? { backgroundColor: `${activeColor}2e` }
                            : undefined
                        }
                      />
                    </span>
                  </>
                );
              })()}
              <div
                className="relative grid h-full items-center"
                style={{
                  gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
                }}
              >
                {tabs.map((tab) => (
                  <TabButton
                    key={`${rowIndex}-${tab.id}`}
                    rowIndex={rowIndex}
                    tabId={tab.id}
                    label={tab.label}
                    selectedColor={tab.selectedColor}
                    visualMode={visualMode}
                    active={(activeTabs[rowIndex] ?? fallbackTab) === tab.id}
                    onActivate={() => setRowTab(rowIndex, tab.id)}
                  >
                    {tab.icon}
                  </TabButton>
                ))}
              </div>
            </div>
          </nav>
        ))}
      </section>
      <div
        className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-3 z-50 flex flex-col items-start gap-1.5"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <nav
          aria-label="Human cycle timescale"
          className="flex gap-0.5 rounded-full border border-black/12 bg-white/72 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl"
        >
          {(
            [
              { mode: "day", label: "24h" },
              { mode: "life", label: "Life" },
            ] as const
          ).map(({ mode, label }) => {
            const active = interfaceMode === mode;

            return (
              <button
                key={mode}
                type="button"
                aria-label={`Show ${label} interface`}
                aria-pressed={active}
                className={`grid h-8 min-w-10 place-items-center rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  active
                    ? "bg-black text-white"
                    : "text-black/45 hover:text-black"
                }`}
                onClick={() => setInterfaceMode(mode)}
              >
                {label}
              </button>
            );
          })}
        </nav>
        <nav
          aria-label="Selected icon color treatment"
          className="flex gap-0.5 rounded-full border border-black/12 bg-white/72 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl"
        >
          {(
            [
              { mode: "stroke", label: "Stroke" },
              { mode: "fill", label: "Fill" },
              { mode: "halo", label: "Halo" },
            ] as const
          ).map(({ mode, label }) => {
            const active = visualMode === mode;

            return (
              <button
                key={mode}
                type="button"
                aria-label={`Use ${label} color treatment`}
                aria-pressed={active}
                className={`grid h-8 min-w-10 place-items-center rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  active
                    ? "bg-black text-white"
                    : "text-black/45 hover:text-black"
                }`}
                onClick={() => setVisualMode(mode)}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
