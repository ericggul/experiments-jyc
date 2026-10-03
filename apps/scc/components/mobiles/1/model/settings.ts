import { defaultPlanOptions } from "./plan-day.ts";
import { timeConfig } from "./time.ts";

export type Arrangement = "random" | "archetype" | "wake";
export type TransitionStyle = "zoom" | "ios";

/** Every authoring parameter exposed in the options row, with its range. */
export type FieldSettings = {
  playing: boolean;
  minutesPerSecond: number;
  /** Simulated minutes between redraws of one phone (staggered by seat). */
  refreshMinutes: number;
  /** zoom: grow/shrink cross-fade after market-economy; ios: launch, swipe and push motions. */
  transitionStyle: TransitionStyle;
  /** Length of a screen transition, in simulated minutes (scales with speed). */
  transitionMinutes: number;
  /** Simulated minutes each screen stays still after its transition before the next may start. */
  holdMinutes: number;
  phoneCount: number;
  arrangement: Arrangement;
  sameness: number;
  /** Share of awake time with the screen on. */
  screenTime: number;
  notificationRate: number;
  synchrony: boolean;
  seed: number;
};

export const defaultSettings: FieldSettings = {
  playing: true,
  minutesPerSecond: timeConfig.minutesPerSecond,
  refreshMinutes: timeConfig.phoneRefreshMinutes,
  transitionStyle: "zoom",
  transitionMinutes: timeConfig.transitionMinutes,
  holdMinutes: timeConfig.holdMinutes,
  phoneCount: 60,
  arrangement: "random",
  sameness: defaultPlanOptions.sameness,
  screenTime: defaultPlanOptions.screenTime,
  notificationRate: defaultPlanOptions.notificationRate,
  synchrony: defaultPlanOptions.synchrony,
  seed: defaultPlanOptions.seed,
};

export const settingRanges = {
  minutesPerSecond: { min: 1, max: 30, step: 1 },
  refreshMinutes: { min: 1, max: 10, step: 1 },
  transitionMinutes: { min: 0.5, max: 15, step: 0.1 },
  holdMinutes: { min: 0, max: 20, step: 0.5 },
  phoneCount: { min: 12, max: 150, step: 6 },
  sameness: { min: 0, max: 1, step: 0.05 },
  screenTime: { min: 0, max: 0.95, step: 0.05 },
  notificationRate: { min: 0, max: 3, step: 0.1 },
} as const;

export const transitionStyles: readonly TransitionStyle[] = ["zoom", "ios"];

/** Scale the zoom transition grows from and shrinks to. */
export const transitionScale = 0.86;

export const arrangements: readonly Arrangement[] = ["random", "archetype", "wake"];
