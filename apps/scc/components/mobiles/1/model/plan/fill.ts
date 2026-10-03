import type { Persona, ViewRef, Weighted } from "../personas.ts";
import { MINUTES_PER_DAY } from "../time.ts";
import { parseRef, type Segment } from "./timeline.ts";
import type { Vary } from "./vary.ts";

/** Mean dark gap between pickups while awake, in simulated minutes. Tune here. */
export const awakeOffMinutes = 3;
/** Shortest piece of a pickup, so each screen lasts long enough to read. */
const PART_MINUTES = 6;

const downtime: Weighted<ViewRef> = [["messages/list", 2], ["messages/conversation", 3], ["mail/inbox", 1], ["home/page", 1]];

/**
 * Awake people barely put the phone down. Every dark gap between waking and
 * bedtime is refilled with pickups until the screen is on for about `share`
 * of the time, leaving short dark breaks. Pickups follow context: work
 * surfaces (with the persona's distraction share) during work, feeds and
 * messages otherwise. Shift workers' phones stay in the locker at work.
 */
export function fillAwake(segments: readonly Segment[], options: {
  from: number;
  to: number;
  share: number;
  work: readonly [number, number] | null;
  persona: Persona;
  v: Vary;
}): Segment[] {
  const { from, to, persona, v } = options;
  const share = Math.min(0.97, Math.max(0, options.share));
  if (share === 0) return [...segments];
  const onMean = (awakeOffMinutes * share) / (1 - share);
  const out: Segment[] = [];
  let cursor = 0;
  const pushOff = (start: number, end: number) => {
    if (end <= start) return;
    let at = start;
    const fillFrom = Math.max(start, from);
    const fillTo = Math.min(end, to);
    if (fillTo - fillFrom < PART_MINUTES) {
      out.push({ start, end, app: "off", view: "off" });
      return;
    }
    if (fillFrom > at) out.push({ start: at, end: fillFrom, app: "off", view: "off" });
    at = fillFrom;
    while (at < fillTo) {
      const off = Math.max(1, Math.round(awakeOffMinutes * (0.4 + 1.2 * v.u())));
      const offEnd = Math.min(fillTo, at + off);
      out.push({ start: at, end: offEnd, app: "off", view: "off" });
      at = offEnd;
      if (fillTo - at < PART_MINUTES) break;
      const on = Math.min(fillTo - at, Math.max(PART_MINUTES, Math.round(onMean * (0.5 + v.u()))));
      const inWork = options.work !== null && at >= options.work[0] && at < options.work[1];
      if (inWork && persona.work.style === "shift") {
        out.push({ start: at, end: at + on, app: "off", view: "off" });
        at += on;
        continue;
      }
      // One pickup flows through a few apps, each at least PART_MINUTES long.
      const parts = Math.max(1, Math.min(3, Math.floor(on / PART_MINUTES)));
      for (let part = 0; part < parts; part++) {
        const start = at + Math.round((on * part) / parts);
        const end = at + Math.round((on * (part + 1)) / parts);
        const pool = inWork && v.u() >= persona.work.distraction ? persona.work.surfaces : v.u() < 0.7 ? persona.feeds : downtime;
        out.push({ start, end, ...parseRef(v.pick(pool)) });
      }
      at += on;
    }
    if (at < end) out.push({ start: at, end, app: "off", view: "off" });
  };
  for (const segment of segments) {
    if (segment.start > cursor) pushOff(cursor, segment.start);
    if (segment.app === "off") pushOff(Math.max(cursor, segment.start), segment.end);
    else out.push(segment);
    cursor = Math.max(cursor, segment.end);
  }
  if (cursor < MINUTES_PER_DAY) pushOff(cursor, MINUTES_PER_DAY);
  return out;
}
