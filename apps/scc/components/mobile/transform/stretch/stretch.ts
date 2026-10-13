export const CONTROL_ATTRIBUTE = "data-stretch-control";
/** Content pictures are at least this large; anything smaller is an icon, a badge or a thumbnail in the chrome. */
const MIN_WIDTH = 64;
const MIN_HEIGHT = 48;
/** An ancestor whose height exceeds the photo's by at most this much (a ring, a padded header) is the photo's frame and grows with it. */
const FRAME_SLACK = 24;

type Saved = Map<string, { value: string; priority: string }>;
/** A box to resize: its height at ×1, and the height of the photo whose change it takes (itself, for a photo). */
type Plan = { el: HTMLElement; kind: "media" | "background" | "wrapper"; width: number; height: number; photo: number };

function isPhoto(el: Element): "media" | "background" | null {
  if (el.closest(`[${CONTROL_ATTRIBUTE}]`)) return null;
  if (el instanceof HTMLImageElement) {
    const src = el.currentSrc || el.src || "";
    return /\.svg(\?|#|$)|^data:image\/svg/i.test(src) ? null : "media";
  }
  if (el instanceof HTMLVideoElement) return "media";
  if (el instanceof SVGElement || el === document.body || el === document.documentElement) return null;
  if (!(el instanceof HTMLElement) || /^(SCRIPT|STYLE|PICTURE|SOURCE)$/.test(el.tagName)) return null;
  const image = getComputedStyle(el).backgroundImage;
  return image.includes("url(") && !/url\(["']?[^)]*(\.svg|image\/svg)/i.test(image) ? "background" : null;
}

const radius = (el: Element, width: number) => {
  const value = getComputedStyle(el).borderTopLeftRadius.split(" ")[0];
  return value.endsWith("%") ? (parseFloat(value) / 100) * width : parseFloat(value) || 0;
};

/**
 * A profile picture is part of the interface, not its content: a picture cut into a circle (by its own radius or by a
 * frame clipping it) is someone's face, wherever it sits (story rings, post headers, comment rows, profile pages, tab bars).
 */
function isFace(el: Element, box: DOMRect) {
  for (let node: Element | null = el, depth = 0; node && depth < 3; node = node.parentElement, depth++) {
    const rect = node.getBoundingClientRect();
    if (Math.abs(rect.width - box.width) > 2 && depth > 0) break;
    if (radius(node, rect.width) >= Math.min(rect.width, rect.height) * 0.4) return true;
  }
  return false;
}

/**
 * Stretches the height of every content photograph (not profile pictures or icons) on the live DOM and restores it exactly.
 * Measuring (`plan`) happens at ×1 and only when the page changes; changing the factor (`apply`) only writes heights, so the
 * factor can move every frame.
 */
export function createStretcher() {
  const saved = new Map<HTMLElement, Saved>();
  let plans: Plan[] = [];
  let factor = 1;
  let observer: MutationObserver | null = null;
  let frame = 0;

  const set = (el: HTMLElement, prop: string, value: string) => {
    let props = saved.get(el);
    if (!props) saved.set(el, (props = new Map()));
    if (!props.has(prop)) props.set(prop, { value: el.style.getPropertyValue(prop), priority: el.style.getPropertyPriority(prop) });
    el.style.setProperty(prop, value, "important");
  };

  const restore = () => {
    saved.forEach((props, el) => {
      props.forEach(({ value, priority }, prop) => {
        if (value) el.style.setProperty(prop, value, priority);
        else el.style.removeProperty(prop);
      });
      if (!el.getAttribute("style")) el.removeAttribute("style");
    });
    saved.clear();
  };

  const scrollOffsets = () => {
    const list: [Element, number][] = [];
    document.querySelectorAll("*").forEach((el) => {
      if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) list.push([el, el.scrollTop]);
    });
    return { list, x: window.scrollX, y: window.scrollY };
  };

  /** Writes every planned height for the current factor. Writes only, so it costs one layout. */
  const apply = () => {
    if (factor === 1) {
      restore();
      return;
    }
    for (const { el, kind, width, height, photo } of plans) {
      if (!el.isConnected) continue;
      const next = `${Math.max(0.5, height + photo * (factor - 1))}px`;
      set(el, "height", next);
      set(el, "min-height", next);
      set(el, "max-height", next);
      set(el, "aspect-ratio", "auto");
      if (kind === "wrapper") continue;
      set(el, "width", `${width}px`);
      set(el, "min-width", `${width}px`);
      set(el, "max-width", `${width}px`);
      if (kind === "media") set(el, "object-fit", "fill");
      else set(el, "background-size", "100% 100%");
    }
  };

  /** Measures the page at ×1: each content photo, and the frames that take its change in height. */
  const plan = () => {
    frame = 0;
    observer?.disconnect();
    const offsets = scrollOffsets();
    restore();
    plans = [];
    const claimed = new Set<HTMLElement>();
    document.body.querySelectorAll("*").forEach((node) => {
      const kind = isPhoto(node);
      if (!kind) return;
      const el = node as HTMLElement;
      const box = el.getBoundingClientRect();
      if (box.width < MIN_WIDTH || box.height < MIN_HEIGHT || isFace(el, box)) return;
      if (claimed.has(el)) return;
      claimed.add(el);
      plans.push({ el, kind, width: box.width, height: box.height, photo: box.height });
      // Frames around the photo (aspect-ratio boxes, padded rows) take the same change in height, up to the first box that
      // holds more than the photo, scrolls, is fixed to the screen or fills it.
      for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (parent.closest(`[${CONTROL_ATTRIBUTE}]`) || claimed.has(parent)) break;
        const parentBox = parent.getBoundingClientRect();
        if (parentBox.height - box.height > FRAME_SLACK || parentBox.height < box.height - 1) break;
        const style = getComputedStyle(parent);
        // A box as tall as the screen (TikTok's full-screen video page) is the screen itself: the photo stretches inside it
        // and the controls laid over it stay where they are.
        if (/(auto|scroll)/.test(style.overflowY) || style.position === "fixed" || parentBox.height >= window.innerHeight * 0.9) break;
        claimed.add(parent);
        plans.push({ el: parent, kind: "wrapper", width: parentBox.width, height: parentBox.height, photo: box.height });
      }
    });
    apply();
    window.scrollTo(offsets.x, offsets.y);
    offsets.list.forEach(([el, top]) => { el.scrollTop = top; });
    watch();
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(plan);
  };

  const onLoad = (event: Event) => {
    if (event.target instanceof HTMLImageElement || event.target instanceof HTMLVideoElement) schedule();
  };

  const watch = () => {
    observer ??= new MutationObserver(schedule);
    observer.takeRecords();
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "src", "srcset", "hidden", "open"] });
  };

  return {
    start() {
      document.addEventListener("load", onLoad, true);
      document.addEventListener("loadeddata", onLoad, true);
      window.addEventListener("resize", schedule);
      schedule();
    },
    /** Takes effect at once unless the page is about to be measured again, which applies it anyway. */
    setFactor(next: number) {
      factor = Math.abs(next - 1) < 0.005 ? 1 : next;
      if (!frame) apply();
    },
    stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      observer?.disconnect();
      observer = null;
      document.removeEventListener("load", onLoad, true);
      document.removeEventListener("loadeddata", onLoad, true);
      window.removeEventListener("resize", schedule);
      restore();
    },
  };
}
