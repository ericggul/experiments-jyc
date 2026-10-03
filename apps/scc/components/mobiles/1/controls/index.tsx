import { useState } from "react";
import { arrangements, settingRanges, transitionStyles, type FieldSettings } from "../model/settings";
import { format24, weekdayShort, weekdayOf } from "../model/time";
import styles from "./controls.module.css";

type Props = {
  settings: FieldSettings;
  day: number;
  minute: number;
  onSettings: (patch: Partial<FieldSettings>) => void;
  onTime: (day: number, minute: number) => void;
};

function Range({ label, value, display, range, onChange, className }: {
  label: string;
  value: number;
  display: string;
  range: { min: number; max: number; step: number };
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <label className={`${styles.range} ${className ?? ""}`}>
      <span>{label}</span>
      <input type="range" min={range.min} max={range.max} step={range.step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <output>{display}</output>
    </label>
  );
}

/** Bottom options row: always present, expanded on demand. */
export default function Controls({ settings, day, minute, onSettings, onTime }: Props) {
  const [open, setOpen] = useState(false);
  const weekday = weekdayOf(day);
  const week = day - weekday;
  return (
    <div className={styles.controls}>
      {open && (
        <>
          <button type="button" className={styles.control} onClick={() => onSettings({ playing: !settings.playing })}>
            {settings.playing ? "pause" : "play"}
          </button>
          {weekdayShort.map((name, index) => (
            <button key={name} type="button" className={styles.control} aria-pressed={index === weekday} onClick={() => onTime(week + index, minute)}>
              {name}
            </button>
          ))}
          <Range className={styles.time} label="time" value={minute} display={format24(minute)} range={{ min: 0, max: 1439, step: 1 }} onChange={(value) => onTime(day, value)} />
          <Range label="speed" value={settings.minutesPerSecond} display={`${settings.minutesPerSecond} min/s`} range={settingRanges.minutesPerSecond} onChange={(value) => onSettings({ minutesPerSecond: value })} />
          <Range label="refresh" value={settings.refreshMinutes} display={`${settings.refreshMinutes} min`} range={settingRanges.refreshMinutes} onChange={(value) => onSettings({ refreshMinutes: value })} />
          {transitionStyles.map((style) => (
            <button key={style} type="button" className={styles.control} aria-pressed={settings.transitionStyle === style} onClick={() => onSettings({ transitionStyle: style })}>
              {style}
            </button>
          ))}
          <Range label="transition" value={settings.transitionMinutes} display={`${settings.transitionMinutes.toFixed(1)} min`} range={settingRanges.transitionMinutes} onChange={(value) => onSettings({ transitionMinutes: value })} />
          <Range label="hold" value={settings.holdMinutes} display={`${settings.holdMinutes.toFixed(1)} min`} range={settingRanges.holdMinutes} onChange={(value) => onSettings({ holdMinutes: value })} />
          <span className={styles.gap} />
          <Range label="phones" value={settings.phoneCount} display={String(settings.phoneCount)} range={settingRanges.phoneCount} onChange={(value) => onSettings({ phoneCount: value })} />
          {arrangements.map((arrangement) => (
            <button key={arrangement} type="button" className={styles.control} aria-pressed={settings.arrangement === arrangement} onClick={() => onSettings({ arrangement })}>
              {arrangement}
            </button>
          ))}
          <span className={styles.gap} />
          <Range label="sameness" value={settings.sameness} display={settings.sameness.toFixed(2)} range={settingRanges.sameness} onChange={(value) => onSettings({ sameness: value })} />
          <Range label="screen on" value={settings.screenTime} display={`${Math.round(settings.screenTime * 100)}%`} range={settingRanges.screenTime} onChange={(value) => onSettings({ screenTime: value })} />
          <Range label="notifications" value={settings.notificationRate} display={`${settings.notificationRate.toFixed(1)}×`} range={settingRanges.notificationRate} onChange={(value) => onSettings({ notificationRate: value })} />
          <button type="button" className={styles.control} aria-pressed={settings.synchrony} onClick={() => onSettings({ synchrony: !settings.synchrony })}>
            synchrony
          </button>
          <button type="button" className={styles.control} onClick={() => onSettings({ seed: settings.seed + 1 })}>
            reseed {settings.seed}
          </button>
        </>
      )}
      <button type="button" className={styles.control} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "close" : "options"}
      </button>
    </div>
  );
}
