"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Controls from "./controls";
import { PlaybackContext } from "./ios/playback";
import { arrange } from "./model/arrange";
import { fitPhoneGrid, mobilesConfig } from "./model/layout";
import { planDay } from "./model/plan-day";
import { createPopulation } from "./model/population";
import { defaultSettings, transitionScale, type FieldSettings } from "./model/settings";
import { phoneMinute } from "./model/time";
import { PhoneView } from "./phone";
import { useSimClock } from "./use-sim-clock";
import styles from "./mobiles.module.css";

export default function MobilesOne() {
  const container = useRef<HTMLElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [settings, setSettings] = useState<FieldSettings>(defaultSettings);
  const [time, seek] = useSimClock(settings.playing, settings.minutesPerSecond);
  const layout = fitPhoneGrid(viewport.width, viewport.height, settings.phoneCount);
  const scale = layout.width / mobilesConfig.phoneWidth;

  const owners = useMemo(() => createPopulation(settings.phoneCount, settings.seed), [settings.phoneCount, settings.seed]);
  const plans = useMemo(
    () => owners.map((owner) => planDay(owner, time.day, {
      sameness: settings.sameness,
      notificationRate: settings.notificationRate,
      synchrony: settings.synchrony,
      seed: settings.seed,
      screenTime: settings.screenTime,
    })),
    [owners, time.day, settings.sameness, settings.notificationRate, settings.synchrony, settings.seed, settings.screenTime],
  );
  const transition = useMemo(
    () => ({ style: settings.transitionStyle, ms: settings.transitionMs, holdMs: settings.holdMs, scale: transitionScale }),
    [settings.transitionStyle, settings.transitionMs, settings.holdMs],
  );
  const playback = useMemo(
    () => ({ minutesPerSecond: settings.minutesPerSecond, playing: settings.playing, frozen: false }),
    [settings.minutesPerSecond, settings.playing],
  );
  // Elapsed-driven motion glides across one phone refresh interval.
  const tick = `${(settings.refreshMinutes / settings.minutesPerSecond) * 1000}ms`;
  const order = useMemo(() => arrange(owners, plans, settings.arrangement, settings.seed), [owners, plans, settings.arrangement, settings.seed]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.field} aria-label="Mobiles: a weekday on many phones" style={{ "--phone-tick": tick } as CSSProperties}>
      <PlaybackContext value={playback}>
      <section ref={container} className={styles.stage}>
        <div className={styles.grid} style={{
          visibility: layout.width > 0 ? "visible" : "hidden",
          gridTemplateColumns: `repeat(${layout.columns}, ${layout.width}px)`,
          gridAutoRows: `${layout.height}px`,
          gap: layout.gap,
        }}>
          {order.map((index, seat) => (
            <div key={owners[index].id} className={styles.slot}>
              <PhoneView owner={owners[index]} plan={plans[index]} minute={phoneMinute(time.minute, seat, settings.refreshMinutes)} scale={scale} transition={transition} />
            </div>
          ))}
        </div>
      </section>
      </PlaybackContext>
      <Controls
        settings={settings}
        day={time.day}
        minute={time.minute}
        onSettings={(patch) => setSettings((current) => ({ ...current, ...patch }))}
        onTime={(day, minute) => seek({ day, minute })}
      />
    </main>
  );
}
