import {
  createLiquid,
  drag,
  moveVertices,
  restPointAt,
  stepLiquid,
  stillLiquid,
  verticesIn,
  type Liquid,
} from "./liquid";
import { createLiquidRenderer } from "./renderer";

export type FingerDecomposition = ReturnType<typeof createFingerDecomposition>;
export type FingerDecompositionSettings = {
  /** Gaussian reach of a finger's drag on the liquid, as a share of the viewport's short side. */
  reach: number;
};

const CANVAS = "data-finger-decomposition-canvas";
const UI = "data-finger-decomposition-ui";
const MAX_RATIO = 2;
const MAX_PIXELS = 2_400_000;
const MIN_CAPTURE_INTERVAL = 400;
const RETURN = 760;
/** Movement before a press becomes a drag; less is a tap, forwarded to the page. */
const SLOP = 6;
const MAX_FINGER_SPEED = 4000;
/** A held element covering more of the viewport than this is ground, not a piece. */
const MAX_HELD_SHARE = 0.3;
/** How much larger an enclosing box may be and still be held with what the finger landed on. */
const MAX_HELD_GROWTH = 6;
const PIECE = "button, a, input, select, textarea, label, img, svg, video, canvas, li, [role]";

type Grab = { last: { x: number; y: number; time: number }; start: { x: number; y: number }; dragging: boolean; held: number[] };

const rgbOf = (color: string): [number, number, number] | null => {
  const parts = color.match(/rgba?\(([^)]+)\)/)?.[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (!parts || (parts.length > 3 && parts[3] < 0.98)) return null;
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
};


const visibleBox = (element: Element) => {
  const style = window.getComputedStyle(element);
  return (rgbOf(style.backgroundColor) !== null && style.backgroundColor !== "rgba(0, 0, 0, 0)") ||
    style.backgroundImage !== "none" || style.boxShadow !== "none" || parseFloat(style.borderTopWidth) > 0;
};

const scrollable = (from: Element | null) => {
  for (let element = from; element && element !== document.body; element = element.parentElement) {
    const { overflowX, overflowY } = window.getComputedStyle(element);
    if ((/(auto|scroll)/.test(overflowY) && element.scrollHeight > element.clientHeight + 1) ||
      (/(auto|scroll)/.test(overflowX) && element.scrollWidth > element.clientWidth + 1)) return element;
  }
  return null;
};

/** Images as data URLs, kept across captures: the SVG the page is drawn through cannot load them itself. */
const inlined = new Map<string, Promise<string | null>>();

function dataUrlOf(source: string) {
  let pending = inlined.get(source);
  if (!pending) {
    pending = fetch(source)
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => blob && new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      }))
      .catch(() => null);
    inlined.set(source, pending);
  }
  return pending;
}

async function inlineImages(clone: Document) {
  await Promise.all(Array.from(clone.images, async (image) => {
    const source = image.currentSrc || image.src;
    if (!source || source.startsWith("data:")) return;
    const url = await dataUrlOf(source);
    if (!url) return;
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    image.src = url;
  }));
}

/**
 * Covers the page with a WebGL picture of itself drawn on a liquid sheet
 * (`liquid.ts`). A finger on an interface element holds it: the part of the
 * sheet under that element travels rigidly with the finger while the finger
 * drags the liquid around it, so everything else flows, stretches, and eddies
 * continuously and keeps flowing a moment after release. A finger on ground
 * skates the liquid without holding anything. A tap is mapped back through the
 * deformation and clicks the live page underneath, which is re-captured when
 * it changes; the deformation stays, so a new screen appears through the same
 * warped sheet.
 */
export function createFingerDecomposition(initial: FingerDecompositionSettings) {
  const settings = { ...initial };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = document.createElement("canvas");
  canvas.setAttribute(CANVAS, "");
  canvas.className = "finger-decomposition-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: true, premultipliedAlpha: false, powerPreference: "high-performance" });
  if (!gl) return { set() {}, reassemble() {}, destroy() {} };
  const renderer = createLiquidRenderer(gl);
  document.body.append(canvas);

  const grabs = new Map<number, Grab>();
  let liquid: Liquid = createLiquid(1, 1);
  let pinned = new Uint8Array(0);
  let ready = false;
  let destroyed = false;
  let frame = 0;
  let lastFrame = 0;
  let returning: { from: Float32Array; start: number } | null = null;
  let capturing = false;
  let pendingCapture = false;
  let captureTimer = 0;
  let lastCapture = -MIN_CAPTURE_INTERVAL;
  let ratio = 1;

  let lifted = 0;
  const sigma = () => settings.reach * Math.min(liquid.width, liquid.height);

  function render(now: number) {
    frame = 0;
    if (destroyed) return;
    const dt = lastFrame ? Math.min(1 / 30, (now - lastFrame) / 1000) : 1 / 60;
    lastFrame = now;
    let moving = grabs.size > 0;
    if (returning) {
      const t = reducedMotion.matches ? 1 : Math.min(1, (now - returning.start) / RETURN);
      const eased = 1 - (1 - t) ** 4;
      const { from } = returning;
      for (let index = 0; index < from.length; index++) liquid.position[index] = from[index] + (liquid.rest[index] - from[index]) * eased;
      if (t >= 1) returning = null;
      else moving = true;
    } else if (!reducedMotion.matches || grabs.size) {
      moving = stepLiquid(liquid, dt, pinned) > 2 || moving;
    } else {
      stillLiquid(liquid);
    }
    if (ready) renderer.draw(lifted);
    if (moving) frame = window.requestAnimationFrame(render);
    else lastFrame = 0;
  }

  const wake = () => {
    if (!frame && !destroyed) frame = window.requestAnimationFrame(render);
  };

  function updatePins() {
    pinned.fill(0);
    for (const grab of grabs.values()) for (const vertex of grab.held) pinned[vertex] = 1;
  }

  function resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO, Math.sqrt(MAX_PIXELS / (width * height)));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    grabs.clear();
    returning = null;
    liquid = createLiquid(width, height);
    pinned = new Uint8Array(liquid.position.length / 2);
    renderer.setMesh(liquid);
    requestCapture();
    wake();
  }

  /** The live elements under a point of the page, below this layer. */
  const pageAt = (x: number, y: number) =>
    document.elementsFromPoint(x, y).filter((element) => element !== canvas && !element.closest(`[${UI}]`));

  /** The page's own ground: the first opaque fill behind the middle of the screen (not the body's theme colour). */
  function groundOf(): [number, number, number] {
    for (const element of pageAt(liquid.width / 2, liquid.height / 2)) {
      const color = rgbOf(window.getComputedStyle(element).backgroundColor);
      if (color) return color;
    }
    return [1, 1, 1];
  }

  /** The interface element a finger takes hold of at a page point: a control, graphic, or drawn box, not the ground. */
  function heldAt(x: number, y: number) {
    const viewport = liquid.width * liquid.height;
    for (let element: Element | null = pageAt(x, y)[0] ?? null; element && element !== document.body; element = element.parentElement) {
      const rect = element.getBoundingClientRect();
      if (rect.width * rect.height > viewport * MAX_HELD_SHARE) return null;
      if (!element.matches(PIECE) && !visibleBox(element)) continue;
      // A control drawn inside its own box (an input in a search field, a label in a chip) is held with that box.
      let piece = rect;
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const outer = parent.getBoundingClientRect();
        const area = outer.width * outer.height;
        if (area > viewport * MAX_HELD_SHARE || area > piece.width * piece.height * MAX_HELD_GROWTH) break;
        if (visibleBox(parent)) piece = outer;
      }
      return piece;
    }
    return null;
  }

  function onDown(event: PointerEvent) {
    if (!ready || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks; moves still reach the canvas.
    }
    if (returning) returning = null;
    const point = { x: event.clientX, y: event.clientY };
    const rest = restPointAt(liquid, point.x, point.y);
    const rect = rest ? heldAt(rest.x, rest.y) : null;
    const held = rect ? verticesIn(liquid, rect.left, rect.top, rect.right, rect.bottom) : [];
    if (held.length) {
      lifted++;
      for (const vertex of held) liquid.lift[vertex] = lifted;
    }
    grabs.set(event.pointerId, { last: { ...point, time: event.timeStamp }, start: point, dragging: false, held });
    updatePins();
    wake();
  }

  function onMove(event: PointerEvent) {
    const grab = grabs.get(event.pointerId);
    if (!grab) return;
    if (!grab.dragging) {
      if (Math.hypot(event.clientX - grab.start.x, event.clientY - grab.start.y) < SLOP) return;
      grab.dragging = true;
    }
    const samples = event.getCoalescedEvents?.() ?? [];
    for (const sample of samples.length ? samples : [event]) {
      const dx = sample.clientX - grab.last.x;
      const dy = sample.clientY - grab.last.y;
      const dt = Math.max(0.004, (sample.timeStamp - grab.last.time) / 1000);
      const speed = Math.hypot(dx, dy) / dt;
      const limit = speed > MAX_FINGER_SPEED ? MAX_FINGER_SPEED / speed : 1;
      drag(liquid, { x: sample.clientX, y: sample.clientY }, { x: (dx / dt) * limit, y: (dy / dt) * limit }, sigma());
      moveVertices(liquid, grab.held, dx, dy);
      grab.last = { x: sample.clientX, y: sample.clientY, time: sample.timeStamp };
    }
    wake();
  }

  function onUp(event: PointerEvent) {
    const grab = grabs.get(event.pointerId);
    if (!grab) return;
    grabs.delete(event.pointerId);
    updatePins();
    if (!grab.dragging) tap(grab.start.x, grab.start.y);
    wake();
  }

  function onCancel(event: PointerEvent) {
    grabs.delete(event.pointerId);
    updatePins();
  }

  /** A tap reaches the page at the point the deformed sheet shows there. */
  function tap(x: number, y: number) {
    const rest = restPointAt(liquid, x, y);
    if (!rest) return;
    let element: Element | null = pageAt(rest.x, rest.y)[0] ?? null;
    while (element && !(element instanceof HTMLElement)) element = element.parentElement;
    if (!(element instanceof HTMLElement)) return;
    if (element.matches("input, textarea, select")) element.focus();
    element.click();
  }

  /** The wheel scrolls the live page under the sheet; the deformation stays where it is on screen. */
  function onWheel(event: WheelEvent) {
    event.preventDefault();
    const rest = restPointAt(liquid, event.clientX, event.clientY);
    const container = rest ? scrollable(pageAt(rest.x, rest.y)[0] ?? null) : null;
    if (container) container.scrollBy(event.deltaX, event.deltaY);
    else window.scrollBy(event.deltaX, event.deltaY);
  }

  async function capture() {
    if (destroyed) return;
    if (capturing || document.hidden) {
      pendingCapture = true;
      return;
    }
    capturing = true;
    lastCapture = performance.now();
    try {
      const html2canvas = (await import("html2canvas")).default;
      const ground = groundOf();
      const page = await html2canvas(document.body, {
        backgroundColor: `rgb(${ground.map((channel) => Math.round(channel * 255)).join(",")})`,
        width: liquid.width,
        height: liquid.height,
        x: window.scrollX,
        y: window.scrollY,
        windowWidth: liquid.width,
        windowHeight: liquid.height,
        scale: ratio,
        logging: false,
        useCORS: true,
        // The browser's own text layout; html2canvas's canvas renderer shifts baselines.
        foreignObjectRendering: true,
        ignoreElements: (element) => element.hasAttribute(CANVAS) || element.hasAttribute(UI),
        onclone: inlineImages,
      });
      if (destroyed) return;
      renderer.setPage(page, ground);
      if (!ready) {
        ready = true;
        canvas.style.visibility = "visible";
      }
      renderer.draw(lifted);
    } catch (error) {
      console.error("finger-decomposition: the page could not be captured", error);
    } finally {
      capturing = false;
      if (pendingCapture && !destroyed) {
        pendingCapture = false;
        requestCapture();
      }
    }
  }

  function requestCapture() {
    if (destroyed) return;
    if (capturing) {
      pendingCapture = true;
      return;
    }
    if (captureTimer) return;
    const wait = Math.max(120, MIN_CAPTURE_INTERVAL - (performance.now() - lastCapture));
    captureTimer = window.setTimeout(() => {
      captureTimer = 0;
      void capture();
    }, wait);
  }

  const observer = new MutationObserver((records) => {
    if (records.some((record) => {
      const element = record.target instanceof Element ? record.target : record.target.parentElement;
      return element && element !== canvas && !element.closest(`[${UI}]`);
    })) requestCapture();
  });
  const onScroll = (event: Event) => {
    if (event.target !== canvas) requestCapture();
  };
  const onVisibility = () => {
    if (!document.hidden) requestCapture();
  };
  const onBlur = () => {
    grabs.clear();
    updatePins();
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("lostpointercapture", onCancel);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", resize);
  window.addEventListener("blur", onBlur);
  document.addEventListener("scroll", onScroll, true);
  document.addEventListener("load", requestCapture, true);
  document.addEventListener("visibilitychange", onVisibility);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  void document.fonts?.ready.then(() => {
    if (!destroyed) resize();
  });

  return {
    set(next: Partial<FingerDecompositionSettings>) {
      Object.assign(settings, next);
    },
    /** The sheet glides back to the page as it is. */
    reassemble() {
      stillLiquid(liquid);
      returning = { from: liquid.position.slice(), start: performance.now() };
      wake();
    },
    destroy() {
      destroyed = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(captureTimer);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("load", requestCapture, true);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.destroy();
      canvas.remove();
    },
  };
}
