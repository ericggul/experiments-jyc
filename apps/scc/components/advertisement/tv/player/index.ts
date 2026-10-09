export { BroadcastFrame, FRAME_HEIGHT, FRAME_WIDTH } from "./stage";
export { Plate, type CameraMove } from "./plate";
export { SceneNavigator } from "./scene-navigator";
export { formatTime, loopTime, sceneIndexAt, stepAt, type SceneMark } from "./timeline";
export { useSpotClock, type ClockOptions } from "./use-clock";

/** Capture switches parsed by the route from the query string. */
export type CaptureOptions = {
  start: number;
  paused: boolean;
  /** Show the scene navigator (`nav=0` hides it for frame capture). */
  nav: boolean;
  /** Show plates (`plates=0` renders layers only, for compositing over a reference frame). */
  plates: boolean;
  /** Pin the frame at 1:1 from the top-left (`fixed=1`) so captures map pixel for pixel. */
  fixed: boolean;
};

export function parseCaptureOptions(params: Record<string, string | string[] | undefined>): CaptureOptions {
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const t = Number(one("t"));
  return {
    start: Number.isFinite(t) && t > 0 ? t : 0,
    paused: one("paused") === "1",
    nav: one("nav") !== "0",
    plates: one("plates") !== "0",
    fixed: one("fixed") === "1",
  };
}
export { FittedLine, type FittedLineData } from "./fitted-line";
