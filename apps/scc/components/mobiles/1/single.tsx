"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import controlStyles from "./controls/controls.module.css";
import { registry } from "./apps/registry";
import type { Fixture } from "./apps/types";
import type { AppId } from "./model/catalogue";
import { hash } from "./model/rng";
import { timeConfig, weekdayOf } from "./model/time";
import type { DayPlan, Scene } from "./model/types";
import { mobilesConfig } from "./model/layout";
import { PhoneView } from "./phone";
import { sampleOwner } from "./model/sample-owner";
import { PlaybackContext } from "./ios/playback";
import styles from "./mobiles.module.css";


const HOLD_MS = 1500;
const singlePlayback = { minutesPerSecond: timeConfig.minutesPerSecond, playing: true, frozen: false };

function fixturePlan(app: AppId, fixture: Fixture, index: number): DayPlan {
  const start = fixture.clock ?? 9 * 60;
  const end = Math.min(1440, start + (fixture.duration ?? 6));
  const seed = fixture.seed ?? hash(app, index);
  return {
    ownerId: sampleOwner.id,
    day: 2,
    weekday: weekdayOf(2),
    scenes: ([
      { id: "before", start: 0, end: start, app: "off", view: "off", seed: 0 },
      { id: `${app}:${index}`, start, end, app, view: fixture.view, seed },
      { id: "after", start: end, end: 1440, app: "off", view: "off", seed: 0 },
    ] satisfies Scene[]).filter((scene) => scene.end > scene.start),
    pushes: [...(fixture.pushes ?? [])].sort((a, b) => a.at - b.at),
    wake: 6 * 60,
    sleep: 23 * 60,
  };
}

/** One clone at native size, playing each fixture through its time course. */
export default function SingleApp({ app }: { app: AppId }) {
  const fixtures = useMemo(() => registry[app]?.fixtures ?? [{ view: "", label: "not built" }], [app]);
  const stage = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [active, setActive] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const fixture = fixtures[active];
  const plan = useMemo(() => fixturePlan(app, fixture, active), [app, fixture, active]);
  const start = fixture.clock ?? 9 * 60;
  const duration = Math.max(1, (fixture.duration ?? 6) - 1);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const began = performance.now();
    const playMs = (duration / timeConfig.minutesPerSecond) * 1000;
    const step = (now: number) => {
      const t = now - began;
      setElapsed(Math.min(duration, Math.floor((t / 1000) * timeConfig.minutesPerSecond)));
      if (t > playMs + HOLD_MS) {
        setActive((value) => (value + 1) % fixtures.length);
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, fixtures.length]);

  const scale = Math.min(1, (size.height * 0.94) / mobilesConfig.phoneHeight, (size.width * 0.94) / mobilesConfig.phoneWidth);

  return (
    <main className={styles.single} aria-label={`${app} clone`} style={{ "--phone-tick": `${1000 / timeConfig.minutesPerSecond}ms` } as CSSProperties}>
      <section ref={stage} className={styles.singleStage}>
        {size.width > 0 && (
          <div className={styles.singleSlot} style={{ marginLeft: (-mobilesConfig.phoneWidth * scale) / 2, marginTop: (-mobilesConfig.phoneHeight * scale) / 2 }}>
            <PlaybackContext value={singlePlayback}><PhoneView owner={sampleOwner} plan={plan} minute={start + elapsed} scale={scale} /></PlaybackContext>
          </div>
        )}
      </section>
      <div className={controlStyles.controls}>
        {fixtures.map((item, index) => (
          <button key={`${item.view}:${item.label}`} type="button" className={controlStyles.control} aria-pressed={index === active} onClick={() => setActive(index)}>
            {item.label}
          </button>
        ))}
      </div>
    </main>
  );
}
