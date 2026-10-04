"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { homeDock, homeLayout } from "../apps/home";
import { registry } from "../apps/registry";
import type { Fixture } from "../apps/types";
import { InteractionContext, type Interaction } from "../ios/playback";
import type { AppId } from "../model/catalogue";
import { planDay } from "../model/plan-day";
import { hash } from "../model/rng";
import { sampleOwner } from "../model/sample-owner";
import type { Weekday } from "../model/types";
import { OsHome } from "./home";
import { OsLock } from "./lock";
import styles from "./os.module.css";

/** The clones' glass reserves these bands for a drawn status bar and home indicator. */
const GLASS_TOP_BAND = 54;
const GLASS_BOTTOM_BAND = 34;
/** Takeover views (an alarm ringing) open last, not first. */
const LATE_VIEWS = new Set(["ringing", "snoozed", "low-battery"]);
const OPEN_MS = 360;
const UNLOCK_MS = 400;
const EASE = "cubic-bezier(0.2, 0.9, 0.1, 1)";

type Open = { app: AppId; fixture: number; openedAt: number; origin: { x: number; y: number } };
type Screen = { kind: "lock" } | { kind: "home" } | ({ kind: "app" } & Open);

/** Wall-clock time: this phone's own clock. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);
  const date = new Date(now);
  return { now, date, minute: date.getHours() * 60 + date.getMinutes(), weekday: Math.min(4, (date.getDay() + 6) % 7) as Weekday };
}

/**
 * The screen in points of a 390 pt-wide phone. On a phone the page fills the
 * device; safe-area insets come from the device itself. On a desktop the same
 * screen is shown at phone size, as if installed full-screen.
 */
function useScreen(probe: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0, top: 0, bottom: 0 });
  useEffect(() => {
    const update = () => {
      const style = probe.current ? getComputedStyle(probe.current) : null;
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
        top: style ? Number.parseFloat(style.paddingTop) || 0 : 0,
        bottom: style ? Number.parseFloat(style.paddingBottom) || 0 : 0,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [probe]);
  const device = size.width > 0 && size.width < 600;
  if (device) {
    const scale = size.width / 390;
    return { ready: true, device, scale, height: size.height / scale, top: size.top / scale, bottom: size.bottom / scale, left: 0, offsetTop: 0 };
  }
  const scale = Math.min(1, (size.height * 0.9) / 844);
  return {
    ready: size.width > 0,
    device,
    scale,
    height: 844,
    top: GLASS_TOP_BAND,
    bottom: GLASS_BOTTOM_BAND,
    left: (size.width - 390 * scale) / 2,
    offsetTop: (size.height - 844 * scale) / 2,
  };
}

const orderFixtures = (fixtures: readonly Fixture[]) =>
  [...fixtures].sort((a, b) => Number(LATE_VIEWS.has(a.view)) - Number(LATE_VIEWS.has(b.view)));

/** Swipe up; `tap` also accepts a plain tap (the lock screen on a desktop). */
function useSwipeUp(onUp: () => void, tap = false) {
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
      if (dy < -30 || (tap && Math.hypot(event.clientX - from.x, dy) < 8)) onUp();
    },
  };
}

function animate(element: HTMLElement | null, keyframes: Keyframe[], ms: number, onDone?: () => void) {
  if (!element || typeof element.animate !== "function") {
    onDone?.();
    return;
  }
  const animation = element.animate(keyframes, { duration: ms, easing: EASE, fill: "forwards" });
  animation.onfinish = () => {
    onDone?.();
    animation.cancel();
  };
}

/**
 * The hands-on phone: the mobiles/1 clones used by hand. The page is the
 * screen: lock screen, home screen and apps fill the device, with no drawn
 * status bar, island or home indicator. Inside an app, taps follow the app's
 * own navigation (InteractionContext); the left edge goes back; a swipe up
 * from the bottom goes home.
 */
export default function MobileTesting() {
  const probe = useRef<HTMLDivElement>(null);
  const screenBox = useScreen(probe);
  const { now, date, minute, weekday } = useNow();
  const [screen, setScreen] = useState<Screen>({ kind: "lock" });
  const [closing, setClosing] = useState<Open | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const controls = useRef<{ back: () => boolean } | null>(null);
  const appLayer = useRef<HTMLDivElement>(null);
  const closingLayer = useRef<HTMLDivElement>(null);
  const homeLayer = useRef<HTMLDivElement>(null);
  const lockLayer = useRef<HTMLDivElement>(null);
  const edge = useRef<number | null>(null);

  const owner = sampleOwner;
  const layout = useMemo(() => homeLayout(owner), [owner]);
  const pages = useMemo(() => [...layout.pages.slice(0, -1), [...layout.pages[layout.pages.length - 1], ...layout.folder]], [layout]);
  const plan = useMemo(() => planDay(owner, weekday), [owner, weekday]);
  const delivered = useMemo(() => plan.pushes.filter((push) => push.at <= minute), [plan, minute]);
  const lockPushes = useMemo(() => delivered.slice(-8).reverse(), [delivered]);
  const badges = useCallback((app: AppId) => delivered.filter((push) => push.app === app).length, [delivered]);

  const app = screen.kind === "app" ? screen : null;

  const interaction = useMemo<Interaction>(
    () => ({
      onExhausted: () => setScreen((current) => (current.kind === "app" ? { ...current, fixture: current.fixture + 1 } : current)),
      register: (next) => {
        controls.current = next;
      },
    }),
    [],
  );

  const unlock = useCallback(() => {
    if (screen.kind !== "lock") return;
    setUnlocking(true);
    setScreen({ kind: "home" });
  }, [screen.kind]);

  const launch = (id: AppId, origin: { x: number; y: number }) => setScreen({ kind: "app", app: id, fixture: 0, openedAt: now, origin });

  const goHome = useCallback(() => {
    if (screen.kind !== "app") return;
    setClosing(screen);
    setScreen({ kind: "home" });
  }, [screen]);

  // Unlock: the lock screen lifts away while home settles in.
  useLayoutEffect(() => {
    if (!unlocking) return;
    animate(lockLayer.current, [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], UNLOCK_MS, () => setUnlocking(false));
    animate(homeLayer.current, [{ transform: "scale(1.1)", opacity: 0.3 }, { transform: "none", opacity: 1 }], UNLOCK_MS);
  }, [unlocking]);

  // Open: the app grows out of its icon.
  const openedKey = app ? `${app.app}:${app.openedAt}` : null;
  useLayoutEffect(() => {
    if (!app) return;
    const { x, y } = app.origin;
    const height = screenBox.height;
    animate(appLayer.current, [{ transform: `translate(${x - 195}px, ${y - height / 2}px) scale(0.16)`, opacity: 0, borderRadius: "90px" }, { transform: "none", opacity: 1, borderRadius: "0px" }], OPEN_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening
  }, [openedKey]);

  // Close: the app shrinks back into its icon.
  useLayoutEffect(() => {
    if (!closing) return;
    const { x, y } = closing.origin;
    animate(closingLayer.current, [{ transform: "none", opacity: 1 }, { transform: `translate(${x - 195}px, ${y - screenBox.height / 2}px) scale(0.16)`, opacity: 0, borderRadius: "90px" }], OPEN_MS, () => setClosing(null));
    animate(homeLayer.current, [{ transform: "scale(1.06)", opacity: 0.6 }, { transform: "none", opacity: 1 }], OPEN_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per closing
  }, [closing]);

  // Desktop keys: Escape goes home, Left goes back, Enter unlocks.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") goHome();
      if (event.key === "ArrowLeft") controls.current?.back();
      if (event.key === "Enter") unlock();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goHome, unlock]);

  const homeSwipe = useSwipeUp(goHome);
  const lockSwipe = useSwipeUp(unlock, true);

  // The clones' glass, placed so its drawn-bar bands fall past the real screen edges.
  const glassTop = screenBox.top - GLASS_TOP_BAND;
  const glassHeight = screenBox.height - glassTop + (GLASS_BOTTOM_BAND - screenBox.bottom);

  const renderApp = (target: Open): ReactNode => {
    const clone = registry[target.app];
    const list = orderFixtures(clone?.fixtures ?? []);
    if (!clone || list.length === 0) return null;
    const fixture = list[target.fixture % list.length];
    const { Screen: AppScreen } = clone;
    return (
      <div className={styles.appGlass} style={{ top: glassTop, height: glassHeight }}>
        <InteractionContext value={interaction}>
          <AppScreen
            key={`${target.app}:${target.fixture}`}
            view={fixture.view}
            seed={fixture.seed ?? hash(target.app, fixture.view, target.fixture)}
            elapsed={Math.max(0, Math.floor((now - target.openedAt) / 60000))}
            duration={Math.max(fixture.duration ?? 20, 12)}
            clock={minute}
            day={weekday}
            weekday={weekday}
            owner={owner}
            pushes={fixture.pushes ?? []}
          />
        </InteractionContext>
      </div>
    );
  };

  const stageStyle = {
    left: screenBox.left,
    top: screenBox.offsetTop,
    height: screenBox.height,
    transform: `scale(${screenBox.scale})`,
    "--os-top": `${screenBox.top}px`,
    "--os-bottom": `${screenBox.bottom}px`,
  } as CSSProperties;

  return (
    <main className={styles.root} aria-label="Mobiles: a phone to use by hand">
      <div ref={probe} className={styles.probe} />
      {screenBox.ready && (
        <div className={`${styles.stage} ${screenBox.device ? "" : styles.framed}`} style={stageStyle}>
          {(screen.kind !== "lock" || unlocking) && (
            <div ref={homeLayer} className={styles.layer}>
              <OsHome pages={pages} dock={homeDock} badges={badges} onLaunch={launch} />
            </div>
          )}
          {closing && (
            <div ref={closingLayer} className={styles.layer} style={{ zIndex: 5 }}>
              {renderApp(closing)}
            </div>
          )}
          {app && (
            <div ref={appLayer} className={styles.layer} style={{ zIndex: 6 }}>
              {renderApp(app)}
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
              <div className={styles.homeZone} {...homeSwipe} aria-label="Home" role="button" />
            </div>
          )}
          {(screen.kind === "lock" || unlocking) && (
            <div ref={lockLayer} className={styles.layer} style={{ zIndex: 8 }} {...lockSwipe}>
              <OsLock date={date} minute={minute} pushes={lockPushes} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
