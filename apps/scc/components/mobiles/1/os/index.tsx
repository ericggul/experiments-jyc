"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { HomeCell, homeDock, homeLayout, homeStyles } from "../apps/home";
import { LockScreen } from "../apps/lock";
import { registry } from "../apps/registry";
import type { Fixture } from "../apps/types";
import { HomeIndicator, Icon, StatusBar, ios, wallpaperFor } from "../ios";
import { InteractionContext, type Interaction } from "../ios/playback";
import type { AppId } from "../model/catalogue";
import { mobilesConfig } from "../model/layout";
import { planDay } from "../model/plan-day";
import { hash } from "../model/rng";
import { sampleOwner } from "../model/sample-owner";
import type { Weekday } from "../model/types";
import styles from "./os.module.css";

/** Takeover views (an alarm ringing) open last, not first. */
const LATE_VIEWS = new Set(["ringing", "snoozed", "low-battery"]);
const OPEN_MS = 340;
const UNLOCK_MS = 380;

type Screen =
  | { kind: "lock" }
  | { kind: "home" }
  | { kind: "app"; app: AppId; fixture: number; openedAt: number; origin: { x: number; y: number } };

/** Real wall-clock time, as the phone's own clock. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);
  const date = new Date(now);
  const minute = date.getHours() * 60 + date.getMinutes();
  const weekday = Math.min(4, (date.getDay() + 6) % 7) as Weekday;
  return { now, minute, weekday };
}

/** Fit the 390 × 844 glass to the window: full-bleed on a phone, framed on a desktop. */
function useFit() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const bare = size.width > 0 && size.width < 600;
  const scale = bare
    ? Math.min(size.width / 390, size.height / 844)
    : Math.min((size.width * 0.9) / mobilesConfig.phoneWidth, (size.height * 0.94) / mobilesConfig.phoneHeight);
  return { bare, scale, ready: size.width > 0 };
}

const orderFixtures = (fixtures: readonly Fixture[]) =>
  [...fixtures].sort((a, b) => Number(LATE_VIEWS.has(a.view)) - Number(LATE_VIEWS.has(b.view)));

/** Vertical swipe detector for the lock screen and the home bar. */
function useSwipeUp(onUp: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (event: PointerEvent) => {
      start.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const dy = event.clientY - from.y;
      // A swipe up, or a plain tap (desktop), both count.
      if (dy < -30 || Math.hypot(event.clientX - from.x, dy) < 8) onUp();
    },
  };
}

function animate(element: HTMLElement | null, keyframes: Keyframe[], ms: number, onDone?: () => void) {
  if (!element || typeof element.animate !== "function") {
    onDone?.();
    return;
  }
  const animation = element.animate(keyframes, { duration: ms, easing: "cubic-bezier(0.2, 0.9, 0.1, 1)", fill: "forwards" });
  animation.onfinish = () => {
    onDone?.();
    animation.cancel();
  };
}

/**
 * The hands-on phone: the same clones the desktop field plays, used by hand.
 * Lock screen → swipe up → home screen → tap an app → use it. Inside an app,
 * taps follow the app's own navigation (InteractionContext), the left edge
 * goes back, the home bar goes home.
 */
export default function MobileTesting() {
  const { now, minute, weekday } = useNow();
  const fit = useFit();
  const [screen, setScreen] = useState<Screen>({ kind: "lock" });
  const [closing, setClosing] = useState<Extract<Screen, { kind: "app" }> | null>(null);
  const controls = useRef<{ back: () => boolean } | null>(null);
  const appLayer = useRef<HTMLDivElement>(null);
  const closingLayer = useRef<HTMLDivElement>(null);
  const homeLayer = useRef<HTMLDivElement>(null);
  const lockLayer = useRef<HTMLDivElement>(null);
  const [unlocking, setUnlocking] = useState(false);
  const owner = sampleOwner;
  const layout = useMemo(() => homeLayout(owner), [owner]);
  const pages = useMemo(() => [...layout.pages.slice(0, -1), [...layout.pages[layout.pages.length - 1], ...layout.folder]], [layout]);
  const plan = useMemo(() => planDay(owner, weekday), [owner, weekday]);
  const lockPushes = useMemo(() => plan.pushes.filter((push) => push.at <= minute).slice(-6).reverse(), [plan, minute]);

  const app = screen.kind === "app" ? screen : null;
  const fixtures = useMemo(() => (app ? orderFixtures(registry[app.app]?.fixtures ?? []) : []), [app]);

  const interaction = useMemo<Interaction>(
    () => ({
      onExhausted: () =>
        setScreen((current) => (current.kind === "app" ? { ...current, fixture: current.fixture + 1, openedAt: Date.now() } : current)),
      register: (next) => {
        controls.current = next;
      },
    }),
    [],
  );

  const unlock = useCallback(() => {
    if (screen.kind !== "lock" || unlocking) return;
    setUnlocking(true);
    setScreen({ kind: "home" });
  }, [screen.kind, unlocking]);

  const open = (id: AppId, origin: { x: number; y: number }) => {
    setScreen({ kind: "app", app: id, fixture: 0, openedAt: now, origin });
  };

  const goHome = useCallback(() => {
    if (screen.kind !== "app") return;
    setClosing(screen);
    setScreen({ kind: "home" });
  }, [screen]);

  // Unlock: the lock screen lifts away while home settles in.
  useLayoutEffect(() => {
    if (!unlocking) return;
    animate(lockLayer.current, [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], UNLOCK_MS, () => setUnlocking(false));
    animate(homeLayer.current, [{ transform: "scale(1.08)", opacity: 0.4 }, { transform: "none", opacity: 1 }], UNLOCK_MS);
  }, [unlocking]);

  // Open: the app grows out of its icon.
  const openKey = app ? `${app.app}:${app.openedAt}` : null;
  const opening = app && app.fixture === 0 ? app : null;
  useLayoutEffect(() => {
    if (!opening) return;
    const { x, y } = opening.origin;
    animate(appLayer.current, [{ transform: `translate(${x - 195}px, ${y - 422}px) scale(0.16)`, opacity: 0, borderRadius: "120px" }, { transform: "none", opacity: 1, borderRadius: "0px" }], OPEN_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per opening
  }, [openKey]);

  // Close: the app shrinks back into its icon.
  useLayoutEffect(() => {
    if (!closing) return;
    const { x, y } = closing.origin;
    animate(closingLayer.current, [{ transform: "none", opacity: 1 }, { transform: `translate(${x - 195}px, ${y - 422}px) scale(0.16)`, opacity: 0 }], OPEN_MS, () => setClosing(null));
    animate(homeLayer.current, [{ transform: "scale(1.06)", opacity: 0.5 }, { transform: "none", opacity: 1 }], OPEN_MS);
  }, [closing]);

  // Desktop keys: Escape goes home, Left goes back.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") goHome();
      if (event.key === "ArrowLeft") controls.current?.back();
      if (event.key === "Enter" || event.key === " ") unlock();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goHome, unlock]);

  const edge = useRef<number | null>(null);
  const homeBar = useSwipeUp(goHome);
  const lockSwipe = useSwipeUp(unlock);

  const renderApp = (target: Extract<Screen, { kind: "app" }>, list: readonly Fixture[]): ReactNode => {
    const clone = registry[target.app];
    if (!clone || list.length === 0) return null;
    const fixture = list[target.fixture % list.length];
    const { Screen: AppScreen } = clone;
    const elapsed = Math.max(0, Math.floor((now - target.openedAt) / 60000));
    return (
      <AppScreen
        key={`${target.app}:${target.fixture}`}
        view={fixture.view}
        seed={fixture.seed ?? hash(target.app, fixture.view, target.fixture)}
        elapsed={elapsed}
        duration={Math.max(fixture.duration ?? 20, 12)}
        clock={minute}
        day={weekday}
        weekday={weekday}
        owner={owner}
        pushes={fixture.pushes ?? []}
      />
    );
  };

  const tone = app ? registry[app.app]?.tone?.(fixtures[app.fixture % Math.max(1, fixtures.length)]?.view ?? "") ?? "dark" : "light";
  const glass = (
    <>
      {(screen.kind !== "lock" || unlocking) && (
        <div ref={homeLayer} className={styles.layer}>
          <div className={styles.home}>
            <div className={homeStyles.wallpaper} style={{ background: wallpaperFor(owner.seed) }} />
            <div className={styles.pages}>
              {pages.map((apps, index) => (
                <div key={`page-${index}`} className={styles.page}>
                  <div className={homeStyles.grid}>
                    {apps.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={styles.icon}
                        aria-label={`Open ${id}`}
                        onClick={(event) => {
                          const box = event.currentTarget.getBoundingClientRect();
                          const glassBox = event.currentTarget.closest(`.${ios.glass}`)?.getBoundingClientRect();
                          const k = glassBox ? glassBox.width / 390 : 1;
                          open(id, glassBox ? { x: (box.left + box.width / 2 - glassBox.left) / k, y: (box.top + 30 * k - glassBox.top) / k } : { x: 195, y: 422 });
                        }}
                      >
                        <HomeCell app={id} seed={owner.seed} clock={minute} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={homeStyles.pill}><Icon name="search" size={13} stroke={2.4} /> Search</div>
            <div className={homeStyles.dock}>
              {homeDock.map((id, index) => (
                <button
                  key={id}
                  type="button"
                  className={styles.icon}
                  aria-label={`Open ${id}`}
                  onClick={() => open(id, { x: 54 + index * 94, y: 772 })}
                >
                  <HomeCell app={id} seed={owner.seed} clock={minute} label={false} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {closing && (
        <div ref={closingLayer} className={styles.layer} style={{ zIndex: 5 }}>
          <InteractionContext value={interaction}>{renderApp(closing, orderFixtures(registry[closing.app]?.fixtures ?? []))}</InteractionContext>
        </div>
      )}
      {app && (
        <div ref={appLayer} className={styles.layer} style={{ zIndex: 6, background: "var(--ios-background)" }}>
          <InteractionContext value={interaction}>{renderApp(app, fixtures)}</InteractionContext>
          <div
            className={styles.edge}
            onPointerDown={(event) => {
              edge.current = event.clientX;
            }}
            onPointerUp={(event) => {
              const start = edge.current;
              edge.current = null;
              if (start !== null && event.clientX - start > 40) controls.current?.back();
            }}
          />
          <div className={styles.homeBar} {...homeBar} aria-label="Home" role="button" />
        </div>
      )}
      {(screen.kind === "lock" || unlocking) && (
        <div ref={lockLayer} className={styles.layer} style={{ zIndex: 8 }} {...lockSwipe}>
          <LockScreen view="lock" seed={owner.seed} elapsed={0} duration={1} clock={minute} day={weekday} weekday={weekday} owner={owner} pushes={lockPushes} />
          <div className={styles.lockHint}>Swipe up to open</div>
        </div>
      )}
      <StatusBar clock={minute} battery={0.82} tone={tone} />
      <HomeIndicator tone={tone} />
    </>
  );

  return (
    <main className={styles.root} aria-label="Mobiles: a phone to use by hand">
      {fit.ready && (
        <div className={styles.slot} style={{ width: (fit.bare ? 390 : mobilesConfig.phoneWidth) * fit.scale, height: (fit.bare ? 844 : mobilesConfig.phoneHeight) * fit.scale }}>
          <div className={`${ios.phone} ${fit.bare ? styles.bare : ""}`} style={{ transform: `scale(${fit.scale})` }}>
            <div className={`${ios.glass} ${fit.bare ? styles.glassBare : ""}`}>{glass}</div>
          </div>
        </div>
      )}
    </main>
  );
}
