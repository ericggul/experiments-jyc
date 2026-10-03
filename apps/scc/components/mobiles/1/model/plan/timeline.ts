import type { AppId } from "../catalogue.ts";
import type { ViewRef } from "../personas.ts";

export type Ref = ViewRef | "off";
export type Segment = { start: number; end: number; app: AppId | "off"; view: string };

const parsed = new Map<Ref, { app: AppId | "off"; view: string }>();
export function parseRef(ref: Ref) {
  let entry = parsed.get(ref);
  if (!entry) {
    if (ref === "off") entry = { app: "off", view: "off" };
    else {
      const slash = ref.indexOf("/");
      entry = { app: ref.slice(0, slash) as AppId, view: ref.slice(slash + 1) };
    }
    parsed.set(ref, entry);
  }
  return entry;
}

/**
 * Append-only day builder. `limit` is a hard end (the night routine starts
 * there); `cap` is a soft end the caller sets while filling a gap.
 */
export function createTimeline(start: number, limit: number) {
  const segments: Segment[] = [];
  const timeline = {
    segments,
    cursor: start,
    limit,
    cap: Infinity,
    get end() {
      return Math.min(timeline.limit, timeline.cap);
    },
    /** Appends `minutes` of `ref` (whole minutes, at least 1), clipped at the end. */
    add(ref: Ref, minutes: number) {
      const end = Math.min(timeline.cursor + Math.max(1, Math.round(minutes)), timeline.end);
      if (end <= timeline.cursor) return;
      const { app, view } = parseRef(ref);
      const last = segments[segments.length - 1];
      if (last && last.app === app && last.view === view && last.end === timeline.cursor) last.end = end;
      else segments.push({ start: timeline.cursor, end, app, view });
      timeline.cursor = end;
    },
    /** Fills with `ref` up to `minute`. */
    until(ref: Ref, minute: number) {
      if (minute > timeline.cursor) timeline.add(ref, minute - timeline.cursor);
    },
  };
  return timeline;
}

export type Timeline = ReturnType<typeof createTimeline>;

/** Paints `ref` over [start, end), splitting whatever was there. */
export function overlay(segments: readonly Segment[], start: number, end: number, ref: Ref): Segment[] {
  if (end <= start) return [...segments];
  const { app, view } = parseRef(ref);
  const result: Segment[] = [];
  let placed = false;
  for (const segment of segments) {
    if (segment.end <= start || segment.start >= end) {
      if (!placed && segment.start >= end) {
        result.push({ start, end, app, view });
        placed = true;
      }
      result.push(segment);
      continue;
    }
    if (segment.start < start) result.push({ ...segment, end: start });
    if (!placed) {
      result.push({ start, end, app, view });
      placed = true;
    }
    if (segment.end > end) result.push({ ...segment, start: end });
  }
  if (!placed) result.push({ start, end, app, view });
  return result;
}
